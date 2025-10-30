"""Stripe payment processor implementation."""

import stripe
import logging
from typing import Dict, Optional, Any
from datetime import datetime

from app.services.payment_processor import (
    PaymentProcessor,
    PaymentIntent,
    PaymentResult,
    PaymentStatus,
    RefundRequest,
    RefundResult,
    RefundStatus,
    Customer,
    CustomerResult,
    PaymentProcessorFactory,
)

logger = logging.getLogger(__name__)


class StripeProcessor(PaymentProcessor):
    """Stripe payment processor implementation."""

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Stripe processor.

        Args:
            config: Dictionary with 'api_key' and optional 'webhook_secret'
        """
        self.api_key = config.get("api_key")
        self.webhook_secret = config.get("webhook_secret")

        if not self.api_key:
            raise ValueError("Stripe API key is required in config")

        stripe.api_key = self.api_key

    @property
    def processor_name(self) -> str:
        """Return the name of the payment processor."""
        return "stripe"

    def create_customer(
        self,
        email: str,
        name: str,
        currency: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> CustomerResult:
        """
        Create a Stripe customer.

        Args:
            email: Customer email address
            name: Customer name
            currency: Currency code (e.g., 'USD')
            metadata: Optional custom metadata

        Returns:
            CustomerResult with Stripe customer ID
        """
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={
                    "currency": currency,
                    "created_at": datetime.utcnow().isoformat(),
                    **(metadata or {}),
                },
            )

            logger.info(f"Created Stripe customer {customer.id} for {email}")

            return CustomerResult(
                success=True,
                customer_id=customer.id,
                raw_response=customer,
            )
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create Stripe customer: {str(e)}")
            return CustomerResult(
                success=False,
                customer_id="",
                error_message=str(e),
                raw_response={"error": str(e)},
            )

    def create_payment_intent(self, payment_intent: PaymentIntent) -> PaymentResult:
        """
        Create a Stripe payment intent.

        Args:
            payment_intent: PaymentIntent with payment details

        Returns:
            PaymentResult with payment intent status
        """
        try:
            intent = stripe.PaymentIntent.create(
                amount=payment_intent.amount,
                currency=payment_intent.currency.lower(),
                customer=payment_intent.customer_id,
                description=payment_intent.description,
                metadata=payment_intent.metadata or {},
                # Automatic confirmation disabled - requires explicit confirmation
                confirm=False,
            )

            status = self._map_stripe_status(intent.status)

            logger.info(f"Created Stripe payment intent {intent.id} for ${payment_intent.amount / 100}")

            return PaymentResult(
                success=True,
                payment_id=intent.id,
                status=status,
                amount=payment_intent.amount,
                currency=payment_intent.currency,
                raw_response=intent,
            )
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create Stripe payment intent: {str(e)}")
            return PaymentResult(
                success=False,
                payment_id="",
                status=PaymentStatus.FAILED,
                amount=payment_intent.amount,
                currency=payment_intent.currency,
                error_message=str(e),
                raw_response={"error": str(e)},
            )

    def confirm_payment(self, payment_id: str) -> PaymentResult:
        """
        Confirm a Stripe payment intent.

        Args:
            payment_id: Stripe PaymentIntent ID

        Returns:
            PaymentResult with confirmation status
        """
        try:
            intent = stripe.PaymentIntent.confirm(payment_id)

            status = self._map_stripe_status(intent.status)

            logger.info(f"Confirmed Stripe payment intent {payment_id}, status: {status}")

            return PaymentResult(
                success=status == PaymentStatus.SUCCEEDED,
                payment_id=intent.id,
                status=status,
                amount=intent.amount,
                currency=intent.currency.upper(),
                error_message=intent.last_payment_error.message if intent.last_payment_error else None,
                raw_response=intent,
            )
        except stripe.error.StripeError as e:
            logger.error(f"Failed to confirm Stripe payment intent {payment_id}: {str(e)}")
            return PaymentResult(
                success=False,
                payment_id=payment_id,
                status=PaymentStatus.FAILED,
                amount=0,
                currency="",
                error_message=str(e),
                raw_response={"error": str(e)},
            )

    def retrieve_payment(self, payment_id: str) -> PaymentResult:
        """
        Retrieve a Stripe payment intent status.

        Args:
            payment_id: Stripe PaymentIntent ID

        Returns:
            PaymentResult with current payment status
        """
        try:
            intent = stripe.PaymentIntent.retrieve(payment_id)

            status = self._map_stripe_status(intent.status)

            return PaymentResult(
                success=status == PaymentStatus.SUCCEEDED,
                payment_id=intent.id,
                status=status,
                amount=intent.amount,
                currency=intent.currency.upper(),
                error_message=intent.last_payment_error.message if intent.last_payment_error else None,
                raw_response=intent,
            )
        except stripe.error.StripeError as e:
            logger.error(f"Failed to retrieve Stripe payment intent {payment_id}: {str(e)}")
            return PaymentResult(
                success=False,
                payment_id=payment_id,
                status=PaymentStatus.FAILED,
                amount=0,
                currency="",
                error_message=str(e),
                raw_response={"error": str(e)},
            )

    def refund_payment(self, refund_request: RefundRequest) -> RefundResult:
        """
        Refund a Stripe payment.

        Args:
            refund_request: RefundRequest with payment ID and optional amount

        Returns:
            RefundResult with refund status
        """
        try:
            # First retrieve the payment to get charge ID
            intent = stripe.PaymentIntent.retrieve(refund_request.payment_id)

            if not intent.charges.data:
                return RefundResult(
                    success=False,
                    refund_id="",
                    status=RefundStatus.FAILED,
                    amount=0,
                    currency="",
                    error_message="No charges found for this payment intent",
                    raw_response={},
                )

            charge_id = intent.charges.data[0].id

            # Create refund
            refund = stripe.Refund.create(
                charge=charge_id,
                amount=refund_request.amount,  # None means full refund
                reason=refund_request.reason,
                metadata=refund_request.metadata or {},
            )

            status = self._map_stripe_refund_status(refund.status)

            logger.info(f"Created Stripe refund {refund.id} for charge {charge_id}")

            return RefundResult(
                success=status == RefundStatus.SUCCEEDED,
                refund_id=refund.id,
                status=status,
                amount=refund.amount,
                currency=refund.currency.upper(),
                raw_response=refund,
            )
        except stripe.error.StripeError as e:
            logger.error(f"Failed to refund Stripe payment {refund_request.payment_id}: {str(e)}")
            return RefundResult(
                success=False,
                refund_id="",
                status=RefundStatus.FAILED,
                amount=0,
                currency="",
                error_message=str(e),
                raw_response={"error": str(e)},
            )

    def retrieve_refund(self, refund_id: str) -> RefundResult:
        """
        Retrieve a Stripe refund status.

        Args:
            refund_id: Stripe Refund ID

        Returns:
            RefundResult with current refund status
        """
        try:
            refund = stripe.Refund.retrieve(refund_id)

            status = self._map_stripe_refund_status(refund.status)

            return RefundResult(
                success=status == RefundStatus.SUCCEEDED,
                refund_id=refund.id,
                status=status,
                amount=refund.amount,
                currency=refund.currency.upper(),
                raw_response=refund,
            )
        except stripe.error.StripeError as e:
            logger.error(f"Failed to retrieve Stripe refund {refund_id}: {str(e)}")
            return RefundResult(
                success=False,
                refund_id=refund_id,
                status=RefundStatus.FAILED,
                amount=0,
                currency="",
                error_message=str(e),
                raw_response={"error": str(e)},
            )

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify Stripe webhook signature.

        Args:
            payload: Raw webhook payload bytes
            signature: Stripe-Signature header value

        Returns:
            True if signature is valid, False otherwise
        """
        if not self.webhook_secret:
            logger.error("Webhook secret not configured for Stripe processor")
            return False

        try:
            stripe.Webhook.construct_event(payload, signature, self.webhook_secret)
            return True
        except ValueError:
            logger.warning("Invalid webhook payload")
            return False
        except stripe.error.SignatureVerificationError:
            logger.warning("Invalid webhook signature")
            return False

    @staticmethod
    def _map_stripe_status(stripe_status: str) -> PaymentStatus:
        """
        Map Stripe payment intent status to our PaymentStatus enum.

        Stripe statuses: requires_payment_method, requires_confirmation, requires_action,
                        processing, succeeded, canceled
        """
        status_map = {
            "requires_payment_method": PaymentStatus.PENDING,
            "requires_confirmation": PaymentStatus.PENDING,
            "requires_action": PaymentStatus.PENDING,
            "processing": PaymentStatus.PENDING,
            "succeeded": PaymentStatus.SUCCEEDED,
            "canceled": PaymentStatus.FAILED,
        }
        return status_map.get(stripe_status, PaymentStatus.FAILED)

    @staticmethod
    def _map_stripe_refund_status(stripe_status: str) -> RefundStatus:
        """
        Map Stripe refund status to our RefundStatus enum.

        Stripe refund statuses: succeeded, failed
        """
        status_map = {
            "succeeded": RefundStatus.SUCCEEDED,
            "failed": RefundStatus.FAILED,
        }
        return status_map.get(stripe_status, RefundStatus.FAILED)


# Register Stripe processor
PaymentProcessorFactory.register_processor("stripe", StripeProcessor)
