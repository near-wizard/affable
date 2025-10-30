"""Payout processor abstraction layer for flexible payout provider integration."""

from abc import ABC, abstractmethod
from typing import Dict, Optional, Any, List
from dataclasses import dataclass
from enum import Enum
from decimal import Decimal


class PayoutStatus(str, Enum):
    """Payout status constants."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class PayoutRequest:
    """Standardized payout request across processors."""
    payout_id: int
    partner_id: int
    amount: Decimal
    currency: str
    provider_account_id: str  # Partner's account with payment provider
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class PayoutResult:
    """Standardized payout result across processors."""
    success: bool
    payout_id: int
    status: PayoutStatus
    provider_transaction_id: Optional[str] = None
    error_message: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


class PayoutProcessor(ABC):
    """
    Abstract base class for payout processors.

    All payout processors (Stripe Connect, PayPal Payouts, Wire Transfer, etc.)
    must implement this interface to ensure consistent behavior.
    """

    @property
    @abstractmethod
    def processor_name(self) -> str:
        """Return the name of the payout processor."""
        pass

    @abstractmethod
    def process_payout(self, payout_request: PayoutRequest) -> PayoutResult:
        """
        Process a payout to a partner.

        Args:
            payout_request: PayoutRequest with payout details

        Returns:
            PayoutResult with payout status and transaction ID
        """
        pass

    @abstractmethod
    def retrieve_payout_status(self, provider_transaction_id: str) -> Dict[str, Any]:
        """
        Retrieve the current status of a payout from the provider.

        Args:
            provider_transaction_id: The transaction ID from the payment provider

        Returns:
            Dictionary with payout status information
        """
        pass

    @abstractmethod
    def cancel_payout(self, provider_transaction_id: str) -> bool:
        """
        Cancel a pending or processing payout.

        Args:
            provider_transaction_id: The transaction ID to cancel

        Returns:
            True if cancellation was successful, False otherwise
        """
        pass

    @abstractmethod
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify that a webhook came from the payment provider.

        Args:
            payload: Raw webhook payload bytes
            signature: Signature header from webhook

        Returns:
            True if signature is valid, False otherwise
        """
        pass


class PayoutProcessorFactory:
    """Factory for creating payout processor instances."""

    _processors: Dict[str, type] = {}

    @classmethod
    def register_processor(cls, name: str, processor_class: type):
        """Register a payout processor implementation."""
        cls._processors[name.lower()] = processor_class

    @classmethod
    def create_processor(cls, processor_name: str, config: Dict[str, Any]) -> PayoutProcessor:
        """
        Create a payout processor instance.

        Args:
            processor_name: Name of the processor (e.g., 'stripe_connect', 'paypal')
            config: Configuration dictionary for the processor

        Returns:
            PayoutProcessor instance

        Raises:
            ValueError: If processor type is not registered
        """
        processor_class = cls._processors.get(processor_name.lower())
        if not processor_class:
            raise ValueError(f"Unknown payout processor: {processor_name}")

        return processor_class(config)

    @classmethod
    def get_available_processors(cls) -> List[str]:
        """Return list of registered processor names."""
        return list(cls._processors.keys())
