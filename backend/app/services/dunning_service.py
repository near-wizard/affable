"""Dunning service for managing failed payment retries."""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.billing import (
    DunningAttempt,
    DunningPolicy,
    VendorInvoice,
    VendorSubscription,
    InvoiceStatus,
    PaymentTransaction,
)
from app.models import Vendor
from app.services.stripe_integration_service import StripeIntegrationService

logger = logging.getLogger(__name__)


class DunningService:
    """Manage dunning workflows for failed payments."""

    @staticmethod
    def get_or_create_dunning_policy(
        db: Session,
        vendor_id: Optional[int] = None,
    ) -> DunningPolicy:
        """
        Get vendor-specific or global default dunning policy.

        Args:
            db: Database session
            vendor_id: Vendor ID (None for global default)

        Returns:
            DunningPolicy instance
        """
        if vendor_id:
            policy = db.query(DunningPolicy).filter_by(
                vendor_id=vendor_id,
                is_active=True,
            ).first()
            if policy:
                return policy

        # Get global default policy
        global_policy = db.query(DunningPolicy).filter_by(
            vendor_id=None,
            is_active=True,
        ).first()

        if global_policy:
            return global_policy

        # Create default policy if none exists
        default_policy = DunningPolicy(
            vendor_id=None,
            max_retry_attempts=3,
            retry_schedule={"1": 1, "2": 3, "3": 7},  # Days between retries
            initial_grace_period_days=0,
            action_on_max_failed="suspend",
            suspend_after_days=30,
            is_active=True,
        )
        db.add(default_policy)
        db.commit()
        db.refresh(default_policy)

        logger.info("Created default dunning policy")
        return default_policy

    @staticmethod
    def initiate_dunning(
        db: Session,
        invoice_id: int,
        payment_transaction_id: Optional[int] = None,
        reason: str = "Payment failed",
    ) -> DunningAttempt:
        """
        Initiate dunning process for a failed invoice payment.

        Args:
            db: Database session
            invoice_id: Invoice ID
            payment_transaction_id: Optional payment transaction that failed
            reason: Reason for initiating dunning

        Returns:
            DunningAttempt instance

        Raises:
            ValueError: If invoice not found or already paid
        """
        invoice = db.query(VendorInvoice).filter_by(
            vendor_invoice_id=invoice_id
        ).first()

        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        if invoice.status == InvoiceStatus.PAID:
            raise ValueError(f"Invoice {invoice_id} is already paid")

        # Check if dunning already in progress
        existing = db.query(DunningAttempt).filter_by(
            vendor_invoice_id=invoice_id
        ).order_by(DunningAttempt.attempted_at.desc()).first()

        if existing and existing.status in ["pending", "active"]:
            logger.warning(f"Dunning already in progress for invoice {invoice_id}")
            return existing

        # Create first dunning attempt
        attempt = DunningAttempt(
            vendor_invoice_id=invoice_id,
            payment_transaction_id=payment_transaction_id,
            attempt_number=1,
            status="pending",
        )

        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        logger.info(f"Initiated dunning for invoice {invoice_id}: {reason}")
        return attempt

    @staticmethod
    def schedule_retry(
        db: Session,
        dunning_attempt_id: int,
    ) -> DunningAttempt:
        """
        Schedule next retry based on dunning policy.

        Args:
            db: Database session
            dunning_attempt_id: Dunning attempt ID

        Returns:
            Updated DunningAttempt

        Raises:
            ValueError: If attempt not found
        """
        attempt = db.query(DunningAttempt).filter_by(
            dunning_attempt_id=dunning_attempt_id
        ).first()

        if not attempt:
            raise ValueError(f"Dunning attempt {dunning_attempt_id} not found")

        invoice = attempt.invoice
        policy = DunningService.get_or_create_dunning_policy(
            db, invoice.subscription.vendor_id
        )

        # Check if max retries exceeded
        if attempt.attempt_number >= policy.max_retry_attempts:
            attempt.status = "max_attempts_reached"
            db.commit()
            logger.warning(
                f"Max retry attempts reached for invoice {invoice.vendor_invoice_id}"
            )
            return attempt

        # Get retry schedule
        retry_days = policy.retry_schedule.get(
            str(attempt.attempt_number), 7
        )  # Default 7 days

        # Schedule next retry
        next_retry_date = datetime.utcnow() + timedelta(days=retry_days)
        attempt.next_retry_date = next_retry_date

        db.commit()
        db.refresh(attempt)

        logger.info(
            f"Scheduled next retry for invoice {invoice.vendor_invoice_id} "
            f"in {retry_days} days"
        )
        return attempt

    @staticmethod
    def get_invoices_due_for_retry(
        db: Session,
    ) -> List[DunningAttempt]:
        """
        Get all dunning attempts that are due for retry.

        Returns:
            List of DunningAttempt instances ready for retry
        """
        now = datetime.utcnow()

        due_attempts = db.query(DunningAttempt).filter(
            DunningAttempt.status == "pending",
            DunningAttempt.next_retry_date <= now,
        ).all()

        return due_attempts

    @staticmethod
    def retry_payment(
        db: Session,
        dunning_attempt_id: int,
        stripe_service: StripeIntegrationService,
    ) -> DunningAttempt:
        """
        Attempt to retry payment for a dunning attempt.

        Args:
            db: Database session
            dunning_attempt_id: Dunning attempt ID
            stripe_service: Stripe integration service

        Returns:
            Updated DunningAttempt

        Raises:
            ValueError: If attempt or invoice not found
        """
        attempt = db.query(DunningAttempt).filter_by(
            dunning_attempt_id=dunning_attempt_id
        ).first()

        if not attempt:
            raise ValueError(f"Dunning attempt {dunning_attempt_id} not found")

        invoice = attempt.invoice
        if not invoice:
            raise ValueError(f"Invoice not found for attempt {dunning_attempt_id}")

        try:
            # Create new payment transaction
            transaction = stripe_service.create_payment_for_invoice(
                db, invoice.vendor_invoice_id
            )

            # Try to confirm payment immediately
            confirmed = stripe_service.confirm_payment(
                db, transaction.payment_transaction_id
            )

            if confirmed.status == "succeeded":
                # Payment successful!
                attempt.status = "succeeded"
                attempt.payment_transaction_id = transaction.payment_transaction_id
                attempt.action_taken = "payment_successful"

                logger.info(
                    f"Dunning retry succeeded for invoice {invoice.vendor_invoice_id}"
                )
            else:
                # Payment still failed, schedule next retry
                attempt.attempt_number += 1
                DunningService.schedule_retry(db, dunning_attempt_id)
                attempt.status = "pending"
                attempt.action_taken = "payment_failed_retry_scheduled"

                logger.warning(
                    f"Dunning retry failed for invoice {invoice.vendor_invoice_id}, "
                    f"scheduling attempt #{attempt.attempt_number}"
                )

            db.commit()
            db.refresh(attempt)

        except Exception as e:
            attempt.error_message = str(e)
            attempt.status = "failed"
            attempt.action_taken = "payment_error"

            logger.error(
                f"Error during dunning retry for invoice {invoice.vendor_invoice_id}: {str(e)}",
                exc_info=True,
            )

            db.commit()
            db.refresh(attempt)

        return attempt

    @staticmethod
    def mark_dunning_resolved(
        db: Session,
        invoice_id: int,
    ) -> DunningAttempt:
        """
        Mark dunning as resolved when payment is received.

        Args:
            db: Database session
            invoice_id: Invoice ID

        Returns:
            Updated DunningAttempt

        Raises:
            ValueError: If invoice not found
        """
        invoice = db.query(VendorInvoice).filter_by(
            vendor_invoice_id=invoice_id
        ).first()

        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        # Find active dunning attempt
        attempt = db.query(DunningAttempt).filter_by(
            vendor_invoice_id=invoice_id
        ).order_by(DunningAttempt.attempted_at.desc()).first()

        if not attempt:
            logger.warning(f"No dunning attempt found for invoice {invoice_id}")
            return None

        attempt.status = "resolved"
        db.commit()
        db.refresh(attempt)

        logger.info(f"Marked dunning as resolved for invoice {invoice_id}")
        return attempt

    @staticmethod
    def handle_max_dunning_failed(
        db: Session,
        invoice_id: int,
    ) -> VendorInvoice:
        """
        Handle subscription suspension/cancellation after max dunning attempts.

        Args:
            db: Database session
            invoice_id: Invoice ID

        Returns:
            Updated VendorInvoice

        Raises:
            ValueError: If invoice not found
        """
        invoice = db.query(VendorInvoice).filter_by(
            vendor_invoice_id=invoice_id
        ).first()

        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        subscription = invoice.subscription
        policy = DunningService.get_or_create_dunning_policy(
            db, subscription.vendor_id
        )

        # Suspend or cancel subscription based on policy
        if policy.action_on_max_failed == "suspend":
            from app.models.billing import SubscriptionStatus

            subscription.status = SubscriptionStatus.PAUSED
            logger.warning(
                f"Suspended subscription {subscription.vendor_subscription_id} "
                f"due to failed dunning for invoice {invoice_id}"
            )
        elif policy.action_on_max_failed == "cancel":
            from app.models.billing import SubscriptionStatus

            subscription.status = SubscriptionStatus.CANCELLED
            subscription.end_date = datetime.utcnow()
            logger.critical(
                f"Cancelled subscription {subscription.vendor_subscription_id} "
                f"due to failed dunning for invoice {invoice_id}"
            )

        db.commit()
        db.refresh(invoice)

        return invoice

    @staticmethod
    def get_dunning_status(
        db: Session,
        vendor_id: int,
    ) -> Dict[str, Any]:
        """
        Get dunning status summary for a vendor.

        Args:
            db: Database session
            vendor_id: Vendor ID

        Returns:
            Dict with dunning metrics
        """
        # Get all subscription IDs for vendor
        subscription_ids = db.query(VendorSubscription.vendor_subscription_id).filter_by(
            vendor_id=vendor_id
        ).all()

        subscription_ids = [s[0] for s in subscription_ids]

        # Get all invoices for vendor subscriptions
        invoice_ids = db.query(VendorInvoice.vendor_invoice_id).filter(
            VendorInvoice.vendor_subscription_id.in_(subscription_ids)
        ).all()

        invoice_ids = [i[0] for i in invoice_ids]

        # Count dunning attempts by status
        attempts = db.query(DunningAttempt).filter(
            DunningAttempt.vendor_invoice_id.in_(invoice_ids)
        ).all()

        return {
            "total_attempts": len(attempts),
            "active_dunning": len([a for a in attempts if a.status == "pending"]),
            "resolved": len([a for a in attempts if a.status == "resolved"]),
            "failed": len([a for a in attempts if a.status == "failed"]),
            "invoices_in_dunning": len([a for a in attempts if a.status in ["pending", "active"]]),
        }
