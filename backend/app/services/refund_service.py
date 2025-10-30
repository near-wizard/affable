"""Service for managing refunds and credit operations."""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.billing import (
    PaymentTransaction,
    VendorInvoice,
    InvoiceStatus,
    GMVConversion,
    GMVFee,
)
from app.services.stripe_integration_service import StripeIntegrationService

logger = logging.getLogger(__name__)


class RefundRequest:
    """Internal refund request data class."""

    def __init__(
        self,
        payment_transaction_id: int,
        amount: Decimal,
        reason: str,
        partial: bool = False,
    ):
        self.payment_transaction_id = payment_transaction_id
        self.amount = amount
        self.reason = reason
        self.partial = partial


class RefundService:
    """Manage refunds, credits, and refund-related operations."""

    @staticmethod
    def create_refund_request(
        db: Session,
        payment_transaction_id: int,
        amount: Optional[Decimal] = None,
        reason: str = "Customer request",
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a refund request for a payment.

        Args:
            db: Database session
            payment_transaction_id: Payment transaction to refund
            amount: Refund amount (None = full refund)
            reason: Reason for refund
            description: Detailed description

        Returns:
            Refund request record

        Raises:
            ValueError: If transaction not found or already refunded
        """
        transaction = db.query(PaymentTransaction).filter_by(
            payment_transaction_id=payment_transaction_id
        ).first()

        if not transaction:
            raise ValueError(f"Payment transaction {payment_transaction_id} not found")

        if transaction.status == "refunded":
            raise ValueError(f"Payment {payment_transaction_id} already refunded")

        if transaction.status != "succeeded":
            raise ValueError(
                f"Can only refund succeeded payments. Current status: {transaction.status}"
            )

        # Use full amount if not specified
        refund_amount = amount or transaction.amount

        if refund_amount > transaction.amount:
            raise ValueError(
                f"Refund amount ${refund_amount} exceeds transaction amount ${transaction.amount}"
            )

        if refund_amount <= Decimal("0.00"):
            raise ValueError("Refund amount must be greater than zero")

        return {
            "payment_transaction_id": payment_transaction_id,
            "invoice_id": transaction.vendor_invoice_id,
            "amount": refund_amount,
            "reason": reason,
            "description": description,
            "is_partial": refund_amount < transaction.amount,
        }

    @staticmethod
    def process_refund(
        db: Session,
        payment_transaction_id: int,
        amount: Optional[Decimal] = None,
        reason: str = "Customer request",
        stripe_service: Optional[StripeIntegrationService] = None,
    ) -> Dict[str, Any]:
        """
        Process a refund through Stripe and update records.

        Args:
            db: Database session
            payment_transaction_id: Payment transaction to refund
            amount: Refund amount (None = full refund)
            reason: Reason for refund
            stripe_service: Stripe integration service

        Returns:
            Refund result with status and amount

        Raises:
            ValueError: If refund fails
        """
        transaction = db.query(PaymentTransaction).filter_by(
            payment_transaction_id=payment_transaction_id
        ).first()

        if not transaction:
            raise ValueError(f"Payment transaction {payment_transaction_id} not found")

        # Determine refund amount
        refund_amount = amount or transaction.amount
        is_partial = refund_amount < transaction.amount

        # Call Stripe to process refund
        if stripe_service:
            try:
                refund_result = stripe_service.processor.create_refund(
                    payment_intent_id=transaction.stripe_payment_intent_id,
                    amount=int(refund_amount * Decimal("100")),  # Convert to cents
                    reason=reason,
                )

                if not refund_result.success:
                    raise ValueError(f"Stripe refund failed: {refund_result.error_message}")

                stripe_refund_id = refund_result.refund_id
            except Exception as e:
                logger.error(f"Stripe refund error: {str(e)}")
                raise ValueError(f"Failed to process refund: {str(e)}")
        else:
            # Simulate refund if no Stripe service
            stripe_refund_id = f"ref_sim_{transaction.payment_transaction_id}"
            logger.warning("Processing refund without Stripe service (simulated)")

        # Update transaction
        transaction.status = "refunded" if not is_partial else "partially_refunded"
        db.commit()
        db.refresh(transaction)

        # Update invoice
        invoice = transaction.invoice
        if invoice:
            RefundService._update_invoice_for_refund(db, invoice.vendor_invoice_id, refund_amount)

        # Update GMV conversions if applicable
        if invoice and refund_amount > Decimal("0.00"):
            RefundService._update_gmv_for_refund(db, invoice.vendor_invoice_id, refund_amount)

        logger.info(
            f"Processed {'partial ' if is_partial else ''}refund of ${refund_amount} "
            f"for transaction {payment_transaction_id} - {reason}"
        )

        return {
            "success": True,
            "refund_id": stripe_refund_id,
            "transaction_id": payment_transaction_id,
            "amount": float(refund_amount),
            "is_partial": is_partial,
            "status": transaction.status,
        }

    @staticmethod
    def _update_invoice_for_refund(
        db: Session,
        invoice_id: int,
        refund_amount: Decimal,
    ) -> None:
        """
        Update invoice status after refund.

        Args:
            db: Database session
            invoice_id: Invoice ID
            refund_amount: Amount refunded
        """
        invoice = db.query(VendorInvoice).filter_by(
            vendor_invoice_id=invoice_id
        ).first()

        if not invoice:
            return

        # Mark as refunded if full refund
        if refund_amount >= invoice.total_amount:
            invoice.status = InvoiceStatus.REFUNDED
            invoice.refunded_at = datetime.utcnow()
            logger.info(f"Invoice {invoice_id} fully refunded")
        else:
            # Partial refund - create credit memo effect
            logger.info(f"Invoice {invoice_id} partially refunded (${refund_amount})")

        db.commit()

    @staticmethod
    def _update_gmv_for_refund(
        db: Session,
        invoice_id: int,
        refund_amount: Decimal,
    ) -> None:
        """
        Update GMV conversions for refund.

        Args:
            db: Database session
            invoice_id: Invoice ID
            refund_amount: Amount refunded
        """
        invoice = db.query(VendorInvoice).filter_by(
            vendor_invoice_id=invoice_id
        ).first()

        if not invoice:
            return

        # Get GMV fees for this invoice's subscription
        gmv_fees = db.query(GMVFee).filter_by(
            vendor_subscription_id=invoice.vendor_subscription_id
        ).all()

        # Distribute refund across conversions
        remaining_refund = refund_amount
        gmv_fee_percentage = invoice.subscription.plan.gmv_percentage or Decimal("0.00")

        for gmv_fee in gmv_fees:
            if remaining_refund <= Decimal("0.00"):
                break

            # Get conversions for this GMV fee
            conversions = db.query(GMVConversion).filter_by(
                gmv_fee_id=gmv_fee.gmv_fee_id
            ).all()

            for conversion in conversions:
                if remaining_refund <= Decimal("0.00"):
                    break

                # Calculate refund for this conversion
                conversion_fee = conversion.applied_fee_amount or Decimal("0.00")

                if conversion_fee > Decimal("0.00"):
                    # Refund amount proportional to fee
                    refund_for_conversion = min(conversion_fee, remaining_refund)

                    # Update conversion
                    conversion.refund_status = (
                        "full" if refund_for_conversion >= conversion_fee else "partial"
                    )
                    conversion.refunded_amount = conversion.event_value * (
                        refund_for_conversion / conversion_fee
                    )
                    conversion.refunded_fee_amount = refund_for_conversion

                    remaining_refund -= refund_for_conversion

                    logger.info(
                        f"Refunded conversion {conversion.conversion_event_id}: "
                        f"${conversion.refunded_amount}"
                    )

        # Update GMV fee totals
        for gmv_fee in gmv_fees:
            conversions = db.query(GMVConversion).filter_by(
                gmv_fee_id=gmv_fee.gmv_fee_id
            ).all()

            total_refunded_gmv = sum(
                c.refunded_amount or Decimal("0.00") for c in conversions
            )
            total_refunded_fees = sum(
                c.refunded_fee_amount or Decimal("0.00") for c in conversions
            )

            gmv_fee.refunded_gmv = total_refunded_gmv
            gmv_fee.refunded_fee_amount = total_refunded_fees

        db.commit()
        logger.info(f"Updated GMV fees for refund on invoice {invoice_id}")

    @staticmethod
    def get_refund_history(
        db: Session,
        invoice_id: int,
    ) -> List[Dict[str, Any]]:
        """
        Get refund history for an invoice.

        Args:
            db: Database session
            invoice_id: Invoice ID

        Returns:
            List of refund records
        """
        transactions = db.query(PaymentTransaction).filter_by(
            vendor_invoice_id=invoice_id
        ).all()

        refunds = []
        for txn in transactions:
            if txn.status in ["refunded", "partially_refunded"]:
                refunds.append(
                    {
                        "transaction_id": txn.payment_transaction_id,
                        "status": txn.status,
                        "amount": float(txn.amount),
                        "stripe_refund_id": txn.stripe_charge_id,
                    }
                )

        return refunds

    @staticmethod
    def calculate_refund_impact(
        db: Session,
        invoice_id: int,
        refund_amount: Decimal,
    ) -> Dict[str, Any]:
        """
        Calculate the impact of a proposed refund.

        Args:
            db: Database session
            invoice_id: Invoice ID
            refund_amount: Proposed refund amount

        Returns:
            Impact analysis
        """
        invoice = db.query(VendorInvoice).filter_by(
            vendor_invoice_id=invoice_id
        ).first()

        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        # Get GMV information
        gmv_fees = db.query(GMVFee).filter_by(
            vendor_subscription_id=invoice.vendor_subscription_id
        ).all()

        total_gmv_fee = sum(f.fee_amount or Decimal("0.00") for f in gmv_fees)
        total_subscription_fee = invoice.total_amount - total_gmv_fee - invoice.tax_amount

        return {
            "invoice_id": invoice_id,
            "current_total": float(invoice.total_amount),
            "proposed_refund": float(refund_amount),
            "new_total": float(invoice.total_amount - refund_amount),
            "is_full_refund": refund_amount >= invoice.total_amount,
            "is_valid": refund_amount <= invoice.total_amount,
            "breakdown": {
                "subscription_fee": float(total_subscription_fee),
                "gmv_fees": float(total_gmv_fee),
                "tax": float(invoice.tax_amount),
            },
            "refund_breakdown": {
                "from_gmv_fees": float(min(refund_amount, total_gmv_fee)),
                "from_subscription_fee": float(
                    max(Decimal("0.00"), refund_amount - total_gmv_fee)
                ),
            },
        }

    @staticmethod
    def create_credit_memo(
        db: Session,
        vendor_id: int,
        amount: Decimal,
        reason: str,
        apply_to_invoice_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Create a credit memo for a vendor.

        Args:
            db: Database session
            vendor_id: Vendor ID
            amount: Credit amount
            reason: Reason for credit
            apply_to_invoice_id: Optional invoice to apply credit to

        Returns:
            Credit memo record
        """
        if amount <= Decimal("0.00"):
            raise ValueError("Credit amount must be greater than zero")

        # For now, return credit memo structure
        # Full implementation would store in CreditMemo table
        credit_memo = {
            "vendor_id": vendor_id,
            "amount": float(amount),
            "remaining_balance": float(amount),
            "reason": reason,
            "applied_to_invoice_id": apply_to_invoice_id,
            "created_at": datetime.utcnow().isoformat(),
            "status": "active",
        }

        logger.info(f"Created credit memo for vendor {vendor_id}: ${amount} - {reason}")
        return credit_memo
