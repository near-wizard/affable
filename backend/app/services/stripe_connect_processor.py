"""Stripe Connect payout processor implementation."""

import stripe
import logging
from typing import Dict, Optional, Any
from datetime import datetime

from app.services.payout_processor import (
    PayoutProcessor,
    PayoutRequest,
    PayoutResult,
    PayoutStatus,
    PayoutProcessorFactory,
)

logger = logging.getLogger(__name__)


class StripeConnectProcessor(PayoutProcessor):
    """Stripe Connect payout processor implementation."""

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Stripe Connect processor.

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
        """Return the name of the payout processor."""
        return "stripe_connect"

    def process_payout(self, payout_request: PayoutRequest) -> PayoutResult:
        """
        Process a payout via Stripe Connect.

        For Stripe Connect, the partner account is typically connected via OAuth,
        and we send payouts to their Stripe account using the connected account ID.

        Args:
            payout_request: PayoutRequest with payout details

        Returns:
            PayoutResult with payout status and transaction ID
        """
        try:
            # Convert amount to cents (Stripe uses smallest currency unit)
            amount_cents = int(payout_request.amount * 100)

            # Create a payout to the connected Stripe account
            # The provider_account_id should be the Stripe account ID of the partner
            payout = stripe.Payout.create(
                amount=amount_cents,
                currency=payout_request.currency.lower(),
                destination=payout_request.provider_account_id,
                description=payout_request.description or f"Payout {payout_request.payout_id}",
                metadata={
                    "payout_id": str(payout_request.payout_id),
                    "partner_id": str(payout_request.partner_id),
                    **(payout_request.metadata or {}),
                },
            )

            # Map Stripe payout status to our internal status
            status_map = {
                "pending": PayoutStatus.PROCESSING,
                "in_transit": PayoutStatus.PROCESSING,
                "paid": PayoutStatus.COMPLETED,
                "failed": PayoutStatus.FAILED,
                "canceled": PayoutStatus.FAILED,
            }

            internal_status = status_map.get(payout.status, PayoutStatus.PROCESSING)

            logger.info(
                f"Created Stripe payout {payout.id} for partner {payout_request.partner_id} "
                f"amount: {payout_request.amount} {payout_request.currency}"
            )

            return PayoutResult(
                success=True,
                payout_id=payout_request.payout_id,
                status=internal_status,
                provider_transaction_id=payout.id,
                raw_response=payout,
            )

        except stripe.error.StripeError as e:
            logger.error(
                f"Failed to create Stripe payout for partner {payout_request.partner_id}: {str(e)}"
            )
            return PayoutResult(
                success=False,
                payout_id=payout_request.payout_id,
                status=PayoutStatus.FAILED,
                error_message=str(e),
                raw_response={"error": str(e)},
            )
        except Exception as e:
            logger.error(f"Unexpected error processing Stripe payout: {str(e)}")
            return PayoutResult(
                success=False,
                payout_id=payout_request.payout_id,
                status=PayoutStatus.FAILED,
                error_message=str(e),
            )

    def retrieve_payout_status(self, provider_transaction_id: str) -> Dict[str, Any]:
        """
        Retrieve payout status from Stripe.

        Args:
            provider_transaction_id: Stripe payout ID

        Returns:
            Dictionary with payout status information
        """
        try:
            payout = stripe.Payout.retrieve(provider_transaction_id)

            return {
                "status": payout.status,
                "amount": payout.amount / 100,  # Convert from cents
                "currency": payout.currency.upper(),
                "created": datetime.fromtimestamp(payout.created),
                "arrival_date": (
                    datetime.fromtimestamp(payout.arrival_date)
                    if payout.arrival_date
                    else None
                ),
                "failure_reason": payout.failure_reason,
                "raw_response": payout,
            }
        except stripe.error.InvalidRequestError as e:
            logger.error(f"Payout {provider_transaction_id} not found in Stripe: {str(e)}")
            return {"error": f"Payout not found: {str(e)}"}
        except stripe.error.StripeError as e:
            logger.error(f"Failed to retrieve Stripe payout status: {str(e)}")
            return {"error": str(e)}

    def cancel_payout(self, provider_transaction_id: str) -> bool:
        """
        Cancel a pending Stripe payout.

        Note: Stripe only allows canceling payouts in 'pending' status.

        Args:
            provider_transaction_id: Stripe payout ID to cancel

        Returns:
            True if cancellation was successful, False otherwise
        """
        try:
            payout = stripe.Payout.retrieve(provider_transaction_id)

            if payout.status != "pending":
                logger.warning(
                    f"Cannot cancel payout {provider_transaction_id} "
                    f"with status {payout.status} (only pending payouts can be cancelled)"
                )
                return False

            # Cancel the payout
            cancelled = payout.cancel()

            logger.info(f"Successfully cancelled Stripe payout {provider_transaction_id}")
            return cancelled.status in ["canceled", "failed"]

        except stripe.error.InvalidRequestError as e:
            logger.error(f"Payout {provider_transaction_id} not found for cancellation: {str(e)}")
            return False
        except stripe.error.StripeError as e:
            logger.error(f"Failed to cancel Stripe payout: {str(e)}")
            return False

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify Stripe webhook signature.

        Args:
            payload: Raw webhook payload bytes
            signature: Signature header from webhook (Stripe-Signature)

        Returns:
            True if signature is valid, False otherwise
        """
        if not self.webhook_secret:
            logger.warning("No webhook secret configured for Stripe Connect processor")
            return False

        try:
            stripe.Webhook.construct_event(payload, signature, self.webhook_secret)
            return True
        except ValueError as e:
            logger.error(f"Invalid webhook payload: {str(e)}")
            return False
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Failed to verify Stripe webhook signature: {str(e)}")
            return False


# Register the processor
PayoutProcessorFactory.register_processor("stripe_connect", StripeConnectProcessor)
