"""Stripe integration service for billing operations."""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.billing import (
    VendorSubscription,
    VendorInvoice,
    PaymentTransaction,
)
from app.models import Vendor
from app.services.payment_processor import PaymentProcessorFactory
from app.services.billing_service import InvoiceService

logger = logging.getLogger(__name__)


class StripeIntegrationService:
    """Handle all Stripe-related billing operations."""

    def __init__(self, stripe_config: Dict[str, Any]):
        """
        Initialize Stripe integration.

        Args:
            stripe_config: Dict with 'api_key' and optional 'webhook_secret'
        """
        self.processor = PaymentProcessorFactory.create_processor("stripe", stripe_config)
        self.config = stripe_config

    def create_stripe_customer(
        self,
        db: Session,
        vendor_id: int,
        email: str,
        name: str,
        currency: str = "USD",
    ) -> str:
        """
        Create a Stripe customer and link to vendor subscription.

        Args:
            db: Database session
            vendor_id: Vendor ID
            email: Vendor email
            name: Vendor company name
            currency: Billing currency

        Returns:
            Stripe customer ID

        Raises:
            ValueError: If vendor has no active subscription
        """
        # Get active subscription
        subscription = db.query(VendorSubscription).filter(
            VendorSubscription.vendor_id == vendor_id,
        ).first()

        if not subscription:
            raise ValueError(f"Vendor {vendor_id} has no subscription")

        # Create Stripe customer
        result = self.processor.create_customer(
            email=email,
            name=name,
            currency=currency,
            metadata={"vendor_id": str(vendor_id)},
        )

        if not result.success:
            raise ValueError(f"Failed to create Stripe customer: {result.error_message}")

        # Update subscription with Stripe customer ID
        subscription.stripe_customer_id = result.customer_id
        db.commit()

        logger.info(f"Created Stripe customer {result.customer_id} for vendor {vendor_id}")
        return result.customer_id

    def create_payment_for_invoice(
        self,
        db: Session,
        invoice_id: int,
    ) -> PaymentTransaction:
        """
        Create a Stripe payment for an invoice.

        Args:
            db: Database session
            invoice_id: Invoice ID

        Returns:
            PaymentTransaction record

        Raises:
            ValueError: If invoice or subscription not found
        """
        # Get invoice
        invoice = db.query(VendorInvoice).filter_by(vendor_invoice_id=invoice_id).first()
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        # Get subscription
        subscription = invoice.subscription
        if not subscription or not subscription.stripe_customer_id:
            raise ValueError(f"Subscription for invoice {invoice_id} has no Stripe customer")

        # Create payment intent
        from app.services.payment_processor import PaymentIntent

        intent = PaymentIntent(
            customer_id=subscription.stripe_customer_id,
            amount=int(invoice.total_amount * Decimal("100")),  # Convert to cents
            currency=subscription.currency.lower(),
            description=f"Invoice {invoice.invoice_number}",
            metadata={
                "invoice_id": str(invoice_id),
                "vendor_id": str(subscription.vendor_id),
            },
        )

        result = self.processor.create_payment_intent(intent)

        if not result.success:
            raise ValueError(f"Failed to create payment intent: {result.error_message}")

        # Create payment transaction record
        transaction = PaymentTransaction(
            vendor_invoice_id=invoice_id,
            stripe_payment_intent_id=result.payment_id,
            amount=invoice.total_amount,
            currency=subscription.currency,
            status="pending",
            stripe_response=result.raw_response,
        )

        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        logger.info(f"Created payment intent {result.payment_id} for invoice {invoice.invoice_number}")
        return transaction

    def confirm_payment(
        self,
        db: Session,
        transaction_id: int,
    ) -> PaymentTransaction:
        """
        Confirm a Stripe payment intent.

        Args:
            db: Database session
            transaction_id: PaymentTransaction ID

        Returns:
            Updated PaymentTransaction

        Raises:
            ValueError: If transaction not found
        """
        transaction = db.query(PaymentTransaction).filter_by(
            payment_transaction_id=transaction_id
        ).first()

        if not transaction:
            raise ValueError(f"Transaction {transaction_id} not found")

        # Confirm payment with Stripe
        result = self.processor.confirm_payment(transaction.stripe_payment_intent_id)

        transaction.stripe_response = result.raw_response
        transaction.status = result.status.value
        transaction.error_message = result.error_message

        # If successful, mark invoice as paid
        if result.success:
            invoice = transaction.invoice
            InvoiceService.mark_invoice_paid(
                db,
                invoice.vendor_invoice_id,
                stripe_invoice_id=transaction.stripe_payment_intent_id,
            )
            logger.info(f"Payment confirmed for invoice {invoice.invoice_number}")

        db.commit()
        db.refresh(transaction)

        return transaction

    def handle_charge_succeeded(
        self,
        db: Session,
        stripe_event: Dict[str, Any],
    ) -> None:
        """
        Handle Stripe charge.succeeded webhook event.

        Args:
            db: Database session
            stripe_event: Stripe webhook event data
        """
        charge = stripe_event.get("data", {}).get("object", {})
        payment_intent_id = charge.get("payment_intent")

        if not payment_intent_id:
            logger.warning("charge.succeeded event missing payment_intent")
            return

        # Find transaction by payment intent ID
        transaction = db.query(PaymentTransaction).filter_by(
            stripe_payment_intent_id=payment_intent_id
        ).first()

        if transaction:
            transaction.stripe_charge_id = charge.get("id")
            transaction.status = "succeeded"
            transaction.stripe_response = charge

            # Mark invoice as paid if not already
            if transaction.invoice.status.value != "paid":
                InvoiceService.mark_invoice_paid(
                    db,
                    transaction.vendor_invoice_id,
                    stripe_invoice_id=payment_intent_id,
                )

            db.commit()
            logger.info(f"Processed charge.succeeded for transaction {transaction.payment_transaction_id}")

    def handle_charge_failed(
        self,
        db: Session,
        stripe_event: Dict[str, Any],
    ) -> None:
        """
        Handle Stripe charge.failed webhook event.

        Args:
            db: Database session
            stripe_event: Stripe webhook event data
        """
        charge = stripe_event.get("data", {}).get("object", {})
        payment_intent_id = charge.get("payment_intent")

        if not payment_intent_id:
            logger.warning("charge.failed event missing payment_intent")
            return

        # Find transaction
        transaction = db.query(PaymentTransaction).filter_by(
            stripe_payment_intent_id=payment_intent_id
        ).first()

        if transaction:
            transaction.status = "failed"
            transaction.error_message = charge.get("failure_message", "Unknown error")
            transaction.stripe_response = charge
            db.commit()

            logger.warning(
                f"Payment failed for transaction {transaction.payment_transaction_id}: "
                f"{transaction.error_message}"
            )

    def handle_payment_intent_succeeded(
        self,
        db: Session,
        stripe_event: Dict[str, Any],
    ) -> None:
        """
        Handle Stripe payment_intent.succeeded webhook event.

        Args:
            db: Database session
            stripe_event: Stripe webhook event data
        """
        intent = stripe_event.get("data", {}).get("object", {})
        intent_id = intent.get("id")

        if not intent_id:
            logger.warning("payment_intent.succeeded event missing ID")
            return

        # Find transaction
        transaction = db.query(PaymentTransaction).filter_by(
            stripe_payment_intent_id=intent_id
        ).first()

        if transaction:
            transaction.status = "succeeded"
            transaction.stripe_response = intent
            db.commit()
            logger.info(f"Payment intent succeeded for transaction {transaction.payment_transaction_id}")

    def handle_payment_intent_payment_failed(
        self,
        db: Session,
        stripe_event: Dict[str, Any],
    ) -> None:
        """
        Handle Stripe payment_intent.payment_failed webhook event.

        Args:
            db: Database session
            stripe_event: Stripe webhook event data
        """
        intent = stripe_event.get("data", {}).get("object", {})
        intent_id = intent.get("id")
        last_error = intent.get("last_payment_error", {})

        if not intent_id:
            logger.warning("payment_intent.payment_failed event missing ID")
            return

        # Find transaction
        transaction = db.query(PaymentTransaction).filter_by(
            stripe_payment_intent_id=intent_id
        ).first()

        if transaction:
            transaction.status = "failed"
            transaction.error_message = last_error.get("message", "Payment failed")
            transaction.stripe_response = intent
            db.commit()

            logger.warning(
                f"Payment intent failed for transaction {transaction.payment_transaction_id}: "
                f"{transaction.error_message}"
            )

    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """
        Verify Stripe webhook signature.

        Args:
            payload: Raw webhook payload
            signature: Stripe-Signature header

        Returns:
            True if signature is valid
        """
        return self.processor.verify_webhook_signature(payload, signature)

    def handle_webhook_event(
        self,
        db: Session,
        stripe_event: Dict[str, Any],
    ) -> None:
        """
        Route webhook events to appropriate handlers.

        Args:
            db: Database session
            stripe_event: Parsed Stripe webhook event

        Raises:
            ValueError: If event type is missing or not supported
        """
        event_type = stripe_event.get("type")

        if not event_type:
            raise ValueError("Invalid webhook event: missing 'type' field")

        handlers = {
            "charge.succeeded": self.handle_charge_succeeded,
            "charge.failed": self.handle_charge_failed,
            "payment_intent.succeeded": self.handle_payment_intent_succeeded,
            "payment_intent.payment_failed": self.handle_payment_intent_payment_failed,
        }

        handler = handlers.get(event_type)
        if not handler:
            logger.warning(f"Unhandled webhook event type: {event_type}")
            return

        try:
            handler(db, stripe_event)
        except Exception as e:
            logger.error(f"Error handling webhook event {event_type}: {str(e)}", exc_info=True)
            raise


class StripeWebhookService:
    """Handle Stripe webhook endpoints."""

    def __init__(self, stripe_integration: StripeIntegrationService):
        """Initialize with Stripe integration service."""
        self.integration = stripe_integration

    def process_webhook(
        self,
        db: Session,
        payload: bytes,
        signature: str,
    ) -> Dict[str, Any]:
        """
        Process incoming Stripe webhook.

        Args:
            db: Database session
            payload: Raw request body
            signature: Stripe-Signature header

        Returns:
            Response dict with status

        Raises:
            ValueError: If signature is invalid
        """
        # Verify signature
        if not self.integration.verify_webhook(payload, signature):
            raise ValueError("Invalid webhook signature")

        # Parse event
        import json

        try:
            event = json.loads(payload.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            raise ValueError(f"Invalid webhook payload: {str(e)}")

        # Handle event
        self.integration.handle_webhook_event(db, event)

        return {
            "status": "received",
            "event_type": event.get("type"),
            "event_id": event.get("id"),
        }
