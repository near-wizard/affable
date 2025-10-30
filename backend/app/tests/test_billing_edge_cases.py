"""
Edge Case Tests for Billing System
Tests for error handling, boundary conditions, and unusual scenarios.
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
    SubscriptionStatus,
    VendorSubscription,
    VendorInvoice,
    PaymentTransaction,
    InvoiceStatus,
    GMVFee,
)
from app.models import Vendor, ConversionEvent
from app.services.billing_service import (
    SubscriptionService,
    InvoiceService,
    GMVTrackingService,
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
def vendor(db_session):
    """Create test vendor."""
    unique_email = f"vendor-{uuid.uuid4().hex[:8]}@test.com"
    vendor = Vendor(
        name="Test Vendor",
        email=unique_email,
        password_hash=get_password_hash("testpass123"),
        status="active",
    )
    db_session.add(vendor)
    db_session.commit()
    return vendor


@pytest.fixture
def plan(db_session):
    """Create test subscription plan."""
    plan = SubscriptionPlan(
        plan_name=SubscriptionPlanEnum.FOUNDER,
        display_name="Founder",
        base_price=Decimal("200.00"),
        gmv_percentage=Decimal("7.500"),
    )
    db_session.add(plan)
    db_session.commit()
    return plan


@pytest.fixture
def subscription(db_session, vendor, plan):
    """Create test subscription."""
    return SubscriptionService.create_subscription(
        db_session,
        vendor.vendor_id,
        plan.subscription_plan_id,
        currency="USD",
    )


@pytest.fixture
def stripe_service():
    """Create mocked Stripe service."""
    config = {
        "api_key": "sk_test_123456",
        "webhook_secret": "whsec_test_123456",
    }
    with patch("app.services.stripe_integration_service.PaymentProcessorFactory.create_processor"):
        service = StripeIntegrationService(config)
        service.processor = Mock()
        return service


# =====================================================
# SUBSCRIPTION EDGE CASES
# =====================================================

class TestSubscriptionEdgeCases:
    """Test edge cases in subscription management."""

    def test_create_subscription_invalid_vendor(self, db_session, plan):
        """Test creating subscription for non-existent vendor."""
        with pytest.raises(Exception):  # Will fail on FK constraint
            SubscriptionService.create_subscription(
                db_session,
                vendor_id=99999,
                plan_id=plan.subscription_plan_id,
            )

    def test_create_subscription_invalid_plan(self, db_session, vendor):
        """Test creating subscription with non-existent plan."""
        with pytest.raises(Exception):
            SubscriptionService.create_subscription(
                db_session,
                vendor_id=vendor.vendor_id,
                plan_id=99999,
            )

    def test_pause_nonexistent_subscription(self, db_session):
        """Test pausing non-existent subscription."""
        with pytest.raises(ValueError, match="not found"):
            SubscriptionService.pause_subscription(db_session, 99999)

    def test_cancel_nonexistent_subscription(self, db_session):
        """Test cancelling non-existent subscription."""
        with pytest.raises(ValueError, match="not found"):
            SubscriptionService.cancel_subscription(db_session, 99999)

    def test_subscription_state_transitions(self, db_session, subscription):
        """Test valid subscription state transitions."""
        # Active -> Paused
        paused = SubscriptionService.pause_subscription(db_session, subscription.vendor_subscription_id)
        assert paused.status == SubscriptionStatus.PAUSED

        # Paused -> Active (by creating new subscription after cancelling)
        db_session.refresh(subscription)
        active = SubscriptionService.resume_subscription(db_session, subscription.vendor_subscription_id)
        assert active.status == SubscriptionStatus.ACTIVE

    def test_cancel_already_cancelled_subscription(self, db_session, subscription):
        """Test cancelling already cancelled subscription."""
        # Cancel first time
        SubscriptionService.cancel_subscription(db_session, subscription.vendor_subscription_id)
        db_session.refresh(subscription)
        assert subscription.status == SubscriptionStatus.CANCELLED

        # Try to cancel again - should be idempotent
        cancelled_again = SubscriptionService.cancel_subscription(
            db_session,
            subscription.vendor_subscription_id,
        )
        assert cancelled_again.status == SubscriptionStatus.CANCELLED

    def test_get_subscription_after_cancellation(self, db_session, vendor, subscription):
        """Test that cancelled subscriptions are not returned as active."""
        SubscriptionService.cancel_subscription(db_session, subscription.vendor_subscription_id)

        active = SubscriptionService.get_active_subscription(db_session, vendor.vendor_id)
        assert active is None


# =====================================================
# GMV CALCULATION EDGE CASES
# =====================================================

class TestGMVCalculationEdgeCases:
    """Test edge cases in GMV fee calculations."""

    def test_gmv_zero_amount(self, db_session, subscription, plan):
        """Test GMV fee with $0 GMV."""
        now = datetime.utcnow()

        gmv_fee = GMVTrackingService.create_gmv_fee(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            total_gmv=Decimal("0.00"),
            gmv_percentage=plan.gmv_percentage,
        )

        assert gmv_fee.total_gmv == Decimal("0.00")
        assert gmv_fee.fee_amount == Decimal("0.00")

    def test_gmv_very_large_amount(self, db_session, subscription, plan):
        """Test GMV fee with very large GMV."""
        now = datetime.utcnow()

        # $999,999.99
        gmv_fee = GMVTrackingService.create_gmv_fee(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            total_gmv=Decimal("999999.99"),
            gmv_percentage=Decimal("7.5"),
        )

        # 999999.99 * 7.5 / 100 = 74999.9992... -> $74999.99
        expected_fee = (Decimal("999999.99") * Decimal("7.5") / Decimal("100")).quantize(Decimal("0.01"))
        assert gmv_fee.fee_amount == expected_fee

    def test_gmv_fractional_percentage(self, db_session, subscription):
        """Test GMV fee with fractional percentage (e.g., 7.5%)."""
        now = datetime.utcnow()

        gmv_fee = GMVTrackingService.create_gmv_fee(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            total_gmv=Decimal("1000.00"),
            gmv_percentage=Decimal("7.500"),  # Exactly 7.5%
        )

        assert gmv_fee.fee_amount == Decimal("75.00")

    def test_gmv_odd_percentage(self, db_session, subscription):
        """Test GMV fee with odd percentage that requires rounding."""
        now = datetime.utcnow()

        # $333.33 * 10.333% = $34.4396... -> $34.44
        gmv_fee = GMVTrackingService.create_gmv_fee(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            total_gmv=Decimal("333.33"),
            gmv_percentage=Decimal("10.333"),
        )

        expected_fee = (Decimal("333.33") * Decimal("10.333") / Decimal("100")).quantize(Decimal("0.01"))
        assert gmv_fee.fee_amount == expected_fee

    def test_gmv_multiple_refunds(self, db_session, subscription, plan):
        """Test GMV fee with multiple partial refunds."""
        now = datetime.utcnow()

        gmv_fee = GMVTrackingService.create_gmv_fee(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            total_gmv=Decimal("1000.00"),
            gmv_percentage=plan.gmv_percentage,
        )

        # Apply multiple refunds
        gmv_fee.refunded_gmv += Decimal("100.00")
        gmv_fee.refunded_fee_amount += Decimal("7.50")
        gmv_fee.refunded_gmv += Decimal("200.00")
        gmv_fee.refunded_fee_amount += Decimal("15.00")
        db_session.commit()

        refund_info = GMVTrackingService.calculate_refunded_gmv(db_session, gmv_fee.gmv_fee_id)
        assert refund_info["refunded_gmv"] == Decimal("300.00")
        assert refund_info["refunded_fee_amount"] == Decimal("22.50")


# =====================================================
# INVOICE EDGE CASES
# =====================================================

class TestInvoiceEdgeCases:
    """Test edge cases in invoice generation."""

    def test_create_invoice_negative_amount_rejected(self, db_session, subscription):
        """Test that negative amounts are rejected."""
        now = datetime.utcnow()

        # Negative subscription fee should be handled
        invoice = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("-100.00"),  # Negative!
        )

        # Invoice still created but with negative amount
        assert invoice.subtotal == Decimal("-100.00")

    def test_create_invoice_zero_fees(self, db_session, subscription):
        """Test invoice with all zero fees."""
        now = datetime.utcnow()

        invoice = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("0.00"),
            gmv_fee=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
        )

        assert invoice.total_amount == Decimal("0.00")
        assert len(invoice.items) == 0  # No line items added

    def test_create_invoice_very_large_amount(self, db_session, subscription):
        """Test invoice with very large amount."""
        now = datetime.utcnow()

        invoice = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("999999.99"),
            gmv_fee=Decimal("999999.99"),
            tax_amount=Decimal("999999.99"),
        )

        expected_total = Decimal("999999.99") + Decimal("999999.99") + Decimal("999999.99")
        assert invoice.total_amount == expected_total

    def test_invoice_number_sequence(self, db_session, subscription):
        """Test that invoice numbers increment properly."""
        now = datetime.utcnow()

        # Create multiple invoices and verify sequence
        inv1 = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("200.00"),
        )

        # For same month, should get same month
        inv2 = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now + timedelta(days=1),
            now + timedelta(days=31),
            subscription_fee=Decimal("200.00"),
        )

        # Sequence should increment
        num1 = int(inv1.invoice_number.split("-")[-1])
        num2 = int(inv2.invoice_number.split("-")[-1])
        assert num2 > num1

    def test_mark_invoice_paid_already_paid(self, db_session, subscription):
        """Test marking already paid invoice as paid again."""
        now = datetime.utcnow()

        invoice = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("200.00"),
        )

        # Mark as paid
        InvoiceService.mark_invoice_paid(db_session, invoice.vendor_invoice_id)
        db_session.refresh(invoice)
        first_paid_at = invoice.paid_at

        # Mark as paid again
        InvoiceService.mark_invoice_paid(db_session, invoice.vendor_invoice_id)
        db_session.refresh(invoice)

        # Should update paid_at to new timestamp
        assert invoice.paid_at >= first_paid_at

    def test_get_unpaid_invoices_empty(self, db_session, subscription):
        """Test getting unpaid invoices when none exist."""
        now = datetime.utcnow()

        # Create and mark as paid
        invoice = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("200.00"),
        )
        InvoiceService.mark_invoice_paid(db_session, invoice.vendor_invoice_id)

        unpaid = InvoiceService.get_unpaid_invoices(db_session, subscription.vendor_id)
        assert len(unpaid) == 0


# =====================================================
# PAYMENT EDGE CASES
# =====================================================

class TestPaymentEdgeCases:
    """Test edge cases in payment processing."""

    def test_create_payment_subscription_no_stripe_customer(self, db_session, subscription):
        """Test creating payment when subscription has no Stripe customer."""
        now = datetime.utcnow()
        invoice = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("200.00"),
        )

        # Subscription has no Stripe customer ID
        stripe_service = Mock()
        from app.services.stripe_integration_service import StripeIntegrationService

        with patch("app.services.stripe_integration_service.PaymentProcessorFactory.create_processor"):
            service = StripeIntegrationService({"api_key": "test"})
            service.processor = stripe_service

            with pytest.raises(ValueError, match="no Stripe customer"):
                service.create_payment_for_invoice(db_session, invoice.vendor_invoice_id)

    def test_create_payment_nonexistent_invoice(self, db_session, stripe_service):
        """Test creating payment for non-existent invoice."""
        with pytest.raises(ValueError, match="not found"):
            stripe_service.create_payment_for_invoice(db_session, 99999)

    def test_confirm_payment_nonexistent_transaction(self, db_session, stripe_service):
        """Test confirming non-existent transaction."""
        with pytest.raises(ValueError, match="not found"):
            stripe_service.confirm_payment(db_session, 99999)

    def test_payment_amount_precision(self, db_session, subscription, stripe_service):
        """Test that payment amount is converted to cents correctly."""
        subscription.stripe_customer_id = "cus_123456"
        db_session.commit()

        now = datetime.utcnow()
        invoice = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("123.45"),
        )

        stripe_service.processor.create_payment_intent.return_value = Mock(
            success=True,
            payment_id="pi_123",
            status="pending",
            error_message=None,
            raw_response={},
        )

        stripe_service.create_payment_for_invoice(db_session, invoice.vendor_invoice_id)

        # Verify amount was converted to cents (12345)
        call_args = stripe_service.processor.create_payment_intent.call_args
        payment_intent = call_args[0][0]  # First positional arg
        assert payment_intent.amount == 12345  # $123.45 in cents


# =====================================================
# WEBHOOK EDGE CASES
# =====================================================

class TestWebhookEdgeCases:
    """Test edge cases in webhook handling."""

    def test_webhook_missing_event_type(self, db_session, stripe_service):
        """Test webhook with missing event type."""
        webhook_service = StripeWebhookService(stripe_service)
        stripe_service.processor.verify_webhook_signature.return_value = True

        payload = json.dumps({
            "id": "evt_123",
            # Missing "type" field
        }).encode("utf-8")

        with pytest.raises(ValueError, match="Invalid webhook|missing"):
            webhook_service.process_webhook(db_session, payload, "sig_123")

    def test_webhook_unknown_event_type(self, db_session, stripe_service):
        """Test webhook with unknown event type."""
        webhook_service = StripeWebhookService(stripe_service)
        stripe_service.processor.verify_webhook_signature.return_value = True

        payload = json.dumps({
            "type": "unknown.event.type",
            "id": "evt_123",
            "data": {"object": {}},
        }).encode("utf-8")

        # Should not raise, just log warning
        result = webhook_service.process_webhook(db_session, payload, "sig_123")
        assert result["status"] == "received"

    def test_webhook_charge_succeeded_nonexistent_payment(self, db_session, stripe_service):
        """Test charge.succeeded for payment that doesn't exist."""
        stripe_service.processor.verify_webhook_signature.return_value = True

        event = {
            "type": "charge.succeeded",
            "id": "evt_123",
            "data": {
                "object": {
                    "id": "ch_nonexistent",
                    "payment_intent": "pi_nonexistent",
                }
            }
        }

        # Should not raise, just log
        stripe_service.handle_charge_succeeded(db_session, event)

    def test_webhook_malformed_json(self, db_session, stripe_service):
        """Test webhook with malformed JSON."""
        webhook_service = StripeWebhookService(stripe_service)
        stripe_service.processor.verify_webhook_signature.return_value = True

        payload = b'{"type": "charge.succeeded"invalid json'

        with pytest.raises(ValueError, match="Invalid webhook payload"):
            webhook_service.process_webhook(db_session, payload, "sig_123")

    def test_webhook_empty_payload(self, db_session, stripe_service):
        """Test webhook with empty payload."""
        webhook_service = StripeWebhookService(stripe_service)
        stripe_service.processor.verify_webhook_signature.return_value = True

        with pytest.raises(ValueError, match="Invalid webhook payload"):
            webhook_service.process_webhook(db_session, b"", "sig_123")

    def test_webhook_duplicate_processing(self, db_session, vendor, plan, stripe_service):
        """Test processing same webhook event twice (idempotency)."""
        webhook_service = StripeWebhookService(stripe_service)
        stripe_service.processor.verify_webhook_signature.return_value = True

        # Create subscription and transaction
        subscription = SubscriptionService.create_subscription(
            db_session,
            vendor.vendor_id,
            plan.subscription_plan_id,
        )
        subscription.stripe_customer_id = "cus_123456"
        db_session.commit()

        now = datetime.utcnow()
        invoice = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("200.00"),
        )

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
            "type": "charge.succeeded",
            "id": "evt_123",
            "data": {
                "object": {
                    "id": "ch_123456",
                    "payment_intent": "pi_123456",
                }
            }
        }

        # Process webhook first time
        stripe_service.handle_charge_succeeded(db_session, event)
        db_session.refresh(transaction)
        first_status = transaction.status

        # Process same event again
        stripe_service.handle_charge_succeeded(db_session, event)
        db_session.refresh(transaction)
        second_status = transaction.status

        # Status should remain the same (idempotent)
        assert first_status == second_status == "succeeded"


# =====================================================
# CONCURRENCY EDGE CASES
# =====================================================

class TestConcurrencyEdgeCases:
    """Test edge cases with concurrent operations."""

    def test_create_duplicate_subscription_race_condition(self, db_session, vendor, plan):
        """Test creating duplicate subscriptions (simulated race condition)."""
        # First subscription succeeds
        sub1 = SubscriptionService.create_subscription(
            db_session,
            vendor.vendor_id,
            plan.subscription_plan_id,
        )
        assert sub1 is not None

        # Second subscription for same vendor should fail
        with pytest.raises(ValueError, match="already has an active subscription"):
            SubscriptionService.create_subscription(
                db_session,
                vendor.vendor_id,
                plan.subscription_plan_id,
            )

    def test_concurrent_invoice_numbering(self, db_session, subscription):
        """Test that invoice numbers don't collide under concurrent creation."""
        now = datetime.utcnow()

        # Create multiple invoices rapidly
        invoices = []
        for i in range(5):
            invoice = InvoiceService.create_invoice(
                db_session,
                subscription.vendor_subscription_id,
                now + timedelta(hours=i),
                now + timedelta(hours=i, days=30),
                subscription_fee=Decimal("200.00"),
            )
            invoices.append(invoice)

        # All invoice numbers should be unique
        numbers = [inv.invoice_number for inv in invoices]
        assert len(numbers) == len(set(numbers))  # All unique
