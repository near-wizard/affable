"""
Phase 3 Tests: Webhook Handling & Stripe Integration
Tests for Stripe payment processing and webhook handling.
"""

import pytest
import json
import uuid
from decimal import Decimal
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session

from app.models.billing import (
    SubscriptionPlan,
    SubscriptionPlanEnum,
    VendorSubscription,
    VendorInvoice,
    PaymentTransaction,
    InvoiceStatus,
)
from app.models import Vendor
from app.services.billing_service import (
    SubscriptionService,
    InvoiceService,
)
from app.services.stripe_integration_service import (
    StripeIntegrationService,
    StripeWebhookService,
)
from app.core.security import get_password_hash


# =====================================================
# FIXTURES
# =====================================================

@pytest.fixture
def vendor_with_subscription(db_session):
    """Create vendor with active subscription."""
    unique_email = f"vendor-{uuid.uuid4().hex[:8]}@test.com"
    vendor = Vendor(
        name="Test Vendor",
        email=unique_email,
        password_hash=get_password_hash("testpass123"),
        status="active",
    )
    db_session.add(vendor)
    db_session.commit()

    plan = SubscriptionPlan(
        plan_name=SubscriptionPlanEnum.FOUNDER,
        display_name="Founder",
        base_price=Decimal("200.00"),
        gmv_percentage=Decimal("7.500"),
    )
    db_session.add(plan)
    db_session.commit()

    subscription = SubscriptionService.create_subscription(
        db_session,
        vendor.vendor_id,
        plan.subscription_plan_id,
        currency="USD",
    )

    return {"vendor": vendor, "subscription": subscription}


@pytest.fixture
def invoice(db_session, vendor_with_subscription):
    """Create unpaid invoice."""
    subscription = vendor_with_subscription["subscription"]
    now = datetime.utcnow()

    return InvoiceService.create_invoice(
        db_session,
        subscription.vendor_subscription_id,
        now,
        now + timedelta(days=30),
        subscription_fee=Decimal("200.00"),
        gmv_fee=Decimal("750.00"),
    )


@pytest.fixture
def stripe_service():
    """Create Stripe integration service with mocked processor."""
    config = {
        "api_key": "sk_test_123456",
        "webhook_secret": "whsec_test_123456",
    }
    with patch("app.services.stripe_integration_service.PaymentProcessorFactory.create_processor") as mock_factory:
        mock_processor = Mock()
        mock_factory.return_value = mock_processor

        service = StripeIntegrationService(config)
        service.processor = mock_processor
        yield service


# =====================================================
# STRIPE INTEGRATION SERVICE TESTS
# =====================================================

class TestStripeIntegrationService:
    """Tests for Stripe integration service."""

    def test_create_stripe_customer_success(self, db_session, vendor_with_subscription, stripe_service):
        """Test successful Stripe customer creation."""
        stripe_service.processor.create_customer.return_value = Mock(
            success=True,
            customer_id="cus_123456",
            error_message=None,
        )

        vendor = vendor_with_subscription["vendor"]
        subscription = vendor_with_subscription["subscription"]

        customer_id = stripe_service.create_stripe_customer(
            db_session,
            vendor.vendor_id,
            vendor.email,
            vendor.name,
        )

        assert customer_id == "cus_123456"

        # Verify subscription was updated
        db_session.refresh(subscription)
        assert subscription.stripe_customer_id == "cus_123456"

    def test_create_stripe_customer_failure(self, db_session, vendor_with_subscription, stripe_service):
        """Test failed Stripe customer creation."""
        stripe_service.processor.create_customer.return_value = Mock(
            success=False,
            customer_id="",
            error_message="Invalid email",
        )

        vendor = vendor_with_subscription["vendor"]

        with pytest.raises(ValueError, match="Failed to create Stripe customer"):
            stripe_service.create_stripe_customer(
                db_session,
                vendor.vendor_id,
                "invalid",
                vendor.name,
            )

    def test_create_payment_for_invoice(self, db_session, vendor_with_subscription, invoice, stripe_service):
        """Test creating a Stripe payment for an invoice."""
        subscription = vendor_with_subscription["subscription"]
        subscription.stripe_customer_id = "cus_123456"
        db_session.commit()

        stripe_service.processor.create_payment_intent.return_value = Mock(
            success=True,
            payment_id="pi_123456",
            status="pending",
            error_message=None,
            raw_response={"id": "pi_123456"},
        )

        transaction = stripe_service.create_payment_for_invoice(db_session, invoice.vendor_invoice_id)

        assert transaction.stripe_payment_intent_id == "pi_123456"
        assert transaction.status == "pending"
        assert transaction.amount == invoice.total_amount

    def test_confirm_payment_success(self, db_session, vendor_with_subscription, invoice, stripe_service):
        """Test confirming a Stripe payment."""
        from app.services.payment_processor import PaymentStatus

        subscription = vendor_with_subscription["subscription"]
        subscription.stripe_customer_id = "cus_123456"
        db_session.commit()

        # Create transaction
        transaction = PaymentTransaction(
            vendor_invoice_id=invoice.vendor_invoice_id,
            stripe_payment_intent_id="pi_123456",
            amount=invoice.total_amount,
            currency="USD",
            status="pending",
        )
        db_session.add(transaction)
        db_session.commit()

        stripe_service.processor.confirm_payment.return_value = Mock(
            success=True,
            payment_id="pi_123456",
            status=PaymentStatus.SUCCEEDED,
            error_message=None,
            raw_response={"id": "pi_123456", "status": "succeeded"},
        )

        confirmed = stripe_service.confirm_payment(db_session, transaction.payment_transaction_id)

        assert confirmed.status == "succeeded"

        # Verify invoice was marked as paid
        db_session.refresh(invoice)
        assert invoice.status == InvoiceStatus.PAID


# =====================================================
# WEBHOOK HANDLER TESTS
# =====================================================

class TestWebhookHandlers:
    """Tests for Stripe webhook handlers."""

    def test_handle_charge_succeeded(self, db_session, vendor_with_subscription, invoice, stripe_service):
        """Test handling charge.succeeded webhook."""
        # Create transaction
        transaction = PaymentTransaction(
            vendor_invoice_id=invoice.vendor_invoice_id,
            stripe_payment_intent_id="pi_123456",
            stripe_charge_id=None,
            amount=invoice.total_amount,
            currency="USD",
            status="pending",
        )
        db_session.add(transaction)
        db_session.commit()

        # Webhook event
        event = {
            "type": "charge.succeeded",
            "data": {
                "object": {
                    "id": "ch_123456",
                    "payment_intent": "pi_123456",
                }
            }
        }

        stripe_service.handle_charge_succeeded(db_session, event)

        db_session.refresh(transaction)
        assert transaction.stripe_charge_id == "ch_123456"
        assert transaction.status == "succeeded"

    def test_handle_charge_failed(self, db_session, vendor_with_subscription, invoice, stripe_service):
        """Test handling charge.failed webhook."""
        transaction = PaymentTransaction(
            vendor_invoice_id=invoice.vendor_invoice_id,
            stripe_payment_intent_id="pi_123456",
            amount=invoice.total_amount,
            currency="USD",
            status="pending",
        )
        db_session.add(transaction)
        db_session.commit()

        event = {
            "type": "charge.failed",
            "data": {
                "object": {
                    "payment_intent": "pi_123456",
                    "failure_message": "Card declined",
                }
            }
        }

        stripe_service.handle_charge_failed(db_session, event)

        db_session.refresh(transaction)
        assert transaction.status == "failed"
        assert "Card declined" in transaction.error_message

    def test_handle_payment_intent_succeeded(self, db_session, vendor_with_subscription, invoice, stripe_service):
        """Test handling payment_intent.succeeded webhook."""
        transaction = PaymentTransaction(
            vendor_invoice_id=invoice.vendor_invoice_id,
            stripe_payment_intent_id="pi_123456",
            amount=invoice.total_amount,
            currency="USD",
            status="pending",
        )
        db_session.add(transaction)
        db_session.commit()

        event = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_123456",
                    "status": "succeeded",
                }
            }
        }

        stripe_service.handle_payment_intent_succeeded(db_session, event)

        db_session.refresh(transaction)
        assert transaction.status == "succeeded"

    def test_handle_payment_intent_payment_failed(self, db_session, vendor_with_subscription, invoice, stripe_service):
        """Test handling payment_intent.payment_failed webhook."""
        transaction = PaymentTransaction(
            vendor_invoice_id=invoice.vendor_invoice_id,
            stripe_payment_intent_id="pi_123456",
            amount=invoice.total_amount,
            currency="USD",
            status="pending",
        )
        db_session.add(transaction)
        db_session.commit()

        event = {
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": "pi_123456",
                    "last_payment_error": {
                        "message": "Your card was declined",
                    }
                }
            }
        }

        stripe_service.handle_payment_intent_payment_failed(db_session, event)

        db_session.refresh(transaction)
        assert transaction.status == "failed"


# =====================================================
# WEBHOOK SERVICE TESTS
# =====================================================

class TestStripeWebhookService:
    """Tests for webhook service."""

    def test_process_webhook_valid_signature(self, db_session, vendor_with_subscription, stripe_service):
        """Test processing webhook with valid signature."""
        webhook_service = StripeWebhookService(stripe_service)

        stripe_service.processor.verify_webhook_signature.return_value = True

        payload = json.dumps({
            "type": "charge.succeeded",
            "id": "evt_123456",
            "data": {
                "object": {
                    "id": "ch_123456",
                    "payment_intent": "pi_nonexistent",
                }
            }
        }).encode("utf-8")

        result = webhook_service.process_webhook(
            db_session,
            payload,
            "t=123,v1=abc",
        )

        assert result["status"] == "received"
        assert result["event_type"] == "charge.succeeded"
        assert result["event_id"] == "evt_123456"

    def test_process_webhook_invalid_signature(self, db_session, vendor_with_subscription, stripe_service):
        """Test that invalid signature is rejected."""
        webhook_service = StripeWebhookService(stripe_service)

        stripe_service.processor.verify_webhook_signature.return_value = False

        payload = b'{"type": "charge.succeeded"}'

        with pytest.raises(ValueError, match="Invalid webhook signature"):
            webhook_service.process_webhook(db_session, payload, "invalid")

    def test_process_webhook_invalid_json(self, db_session, vendor_with_subscription, stripe_service):
        """Test that invalid JSON is rejected."""
        webhook_service = StripeWebhookService(stripe_service)

        stripe_service.processor.verify_webhook_signature.return_value = True

        with pytest.raises(ValueError, match="Invalid webhook payload"):
            webhook_service.process_webhook(db_session, b"invalid json", "t=123,v1=abc")


# =====================================================
# PAYMENT TRANSACTION TESTS
# =====================================================

class TestPaymentTransaction:
    """Tests for payment transaction model."""

    def test_create_payment_transaction(self, db_session, invoice):
        """Test creating a payment transaction."""
        transaction = PaymentTransaction(
            vendor_invoice_id=invoice.vendor_invoice_id,
            stripe_payment_intent_id="pi_123456",
            amount=invoice.total_amount,
            currency="USD",
            status="pending",
        )
        db_session.add(transaction)
        db_session.commit()
        db_session.refresh(transaction)

        assert transaction.stripe_payment_intent_id == "pi_123456"
        assert transaction.status == "pending"
        assert transaction.amount == invoice.total_amount

    def test_payment_transaction_status_update(self, db_session, invoice):
        """Test updating payment transaction status."""
        transaction = PaymentTransaction(
            vendor_invoice_id=invoice.vendor_invoice_id,
            stripe_payment_intent_id="pi_123456",
            amount=invoice.total_amount,
            currency="USD",
            status="pending",
        )
        db_session.add(transaction)
        db_session.commit()

        transaction.status = "succeeded"
        transaction.stripe_charge_id = "ch_123456"
        db_session.commit()
        db_session.refresh(transaction)

        assert transaction.status == "succeeded"
        assert transaction.stripe_charge_id == "ch_123456"
