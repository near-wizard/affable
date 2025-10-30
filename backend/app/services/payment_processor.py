"""Payment processor abstraction layer for flexible payment provider integration."""

from abc import ABC, abstractmethod
from typing import Dict, Optional, Any
from dataclasses import dataclass
from enum import Enum


class PaymentStatus(str, Enum):
    """Payment status constants."""
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"


class RefundStatus(str, Enum):
    """Refund status constants."""
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


@dataclass
class PaymentIntent:
    """Standardized payment intent across processors."""
    customer_id: str
    amount: int  # Amount in cents
    currency: str
    description: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class PaymentResult:
    """Standardized payment result across processors."""
    success: bool
    payment_id: str  # Processor-specific ID
    status: PaymentStatus
    amount: int  # Amount in cents
    currency: str
    error_message: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


@dataclass
class RefundRequest:
    """Standardized refund request across processors."""
    payment_id: str
    amount: Optional[int] = None  # If None, full refund
    reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class RefundResult:
    """Standardized refund result across processors."""
    success: bool
    refund_id: str  # Processor-specific ID
    status: RefundStatus
    amount: int  # Amount in cents
    currency: str
    error_message: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


@dataclass
class Customer:
    """Standardized customer across processors."""
    customer_id: str
    email: str
    name: str
    currency: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class CustomerResult:
    """Standardized customer creation result."""
    success: bool
    customer_id: str
    error_message: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


class PaymentProcessor(ABC):
    """
    Abstract base class for payment processors.

    All payment processors (Stripe, Paddle, PayPal, etc.) must implement this interface
    to ensure consistent behavior across the application.
    """

    @property
    @abstractmethod
    def processor_name(self) -> str:
        """Return the name of the payment processor."""
        pass

    @abstractmethod
    def create_customer(self, email: str, name: str, currency: str, metadata: Optional[Dict[str, Any]] = None) -> CustomerResult:
        """
        Create a customer record in the payment processor.

        Args:
            email: Customer email address
            name: Customer name
            currency: Currency code (e.g., 'USD', 'EUR')
            metadata: Optional custom metadata

        Returns:
            CustomerResult with customer_id or error_message
        """
        pass

    @abstractmethod
    def create_payment_intent(self, payment_intent: PaymentIntent) -> PaymentResult:
        """
        Create a payment intent/charge.

        Args:
            payment_intent: PaymentIntent dataclass with payment details

        Returns:
            PaymentResult with payment status and ID
        """
        pass

    @abstractmethod
    def confirm_payment(self, payment_id: str) -> PaymentResult:
        """
        Confirm a payment intent (only needed for some processors).

        Some processors (like Stripe with SCA) require explicit confirmation.
        Others may not need this.

        Args:
            payment_id: The payment/intent ID from the processor

        Returns:
            PaymentResult with updated payment status
        """
        pass

    @abstractmethod
    def retrieve_payment(self, payment_id: str) -> PaymentResult:
        """
        Retrieve the current status of a payment.

        Args:
            payment_id: The payment/charge ID from the processor

        Returns:
            PaymentResult with current payment status
        """
        pass

    @abstractmethod
    def refund_payment(self, refund_request: RefundRequest) -> RefundResult:
        """
        Refund a payment (full or partial).

        Args:
            refund_request: RefundRequest with payment ID and optional amount

        Returns:
            RefundResult with refund status
        """
        pass

    @abstractmethod
    def retrieve_refund(self, refund_id: str) -> RefundResult:
        """
        Retrieve the current status of a refund.

        Args:
            refund_id: The refund ID from the processor

        Returns:
            RefundResult with refund status
        """
        pass

    @abstractmethod
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify that a webhook came from the payment processor.

        Args:
            payload: Raw webhook payload bytes
            signature: Signature header from webhook

        Returns:
            True if signature is valid, False otherwise
        """
        pass


class PaymentProcessorFactory:
    """Factory for creating payment processor instances."""

    _processors: Dict[str, type] = {}

    @classmethod
    def register_processor(cls, name: str, processor_class: type):
        """Register a payment processor implementation."""
        cls._processors[name.lower()] = processor_class

    @classmethod
    def create_processor(cls, processor_name: str, config: Dict[str, Any]) -> PaymentProcessor:
        """
        Create a payment processor instance.

        Args:
            processor_name: Name of the processor (e.g., 'stripe', 'paddle')
            config: Configuration dictionary for the processor

        Returns:
            PaymentProcessor instance

        Raises:
            ValueError: If processor type is not registered
        """
        processor_class = cls._processors.get(processor_name.lower())
        if not processor_class:
            raise ValueError(f"Unknown payment processor: {processor_name}")

        return processor_class(config)

    @classmethod
    def get_available_processors(cls) -> list:
        """Return list of registered processor names."""
        return list(cls._processors.keys())
