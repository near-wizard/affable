"""
Phase 1 Tests: Billing System Foundation
Tests for database models, payment processor abstraction, and core structures.
"""

import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from app.models.billing import (
    SubscriptionPlan,
    SubscriptionPlanEnum,
    BillingCycleEnum,
    SubscriptionStatus,
    InvoiceStatus,
    VendorSubscription,
    VendorInvoice,
    VendorInvoiceItem,
    GMVFee,
    GMVConversion,
    InvoiceAdjustment,
    PaymentTransaction,
)
from app.models import Vendor
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
from app.services.stripe_processor import StripeProcessor
from app.core.security import get_password_hash


# =====================================================
# FIXTURES
# =====================================================

@pytest.fixture
def vendor(db_session):
    """Create test vendor."""
    vendor = Vendor(
        name="Test Vendor",
        email="vendor@test.com",
        password_hash=get_password_hash("testpass123"),
        company_name="Test Company",
        website_url="https://test.com",
        status="active",
    )
    db_session.add(vendor)
    db_session.commit()
    return vendor


@pytest.fixture
def subscription_plans(db_session):
    """Create test subscription plans."""
    plans = [
        SubscriptionPlan(
            plan_name=SubscriptionPlanEnum.BETA,
            display_name="Beta",
            description="Limited beta offer",
            base_price=Decimal("20.00"),
            gmv_percentage=Decimal("10.000"),
            billing_cycle=BillingCycleEnum.ONE_TIME,
            is_active=True,
        ),
        SubscriptionPlan(
            plan_name=SubscriptionPlanEnum.FOUNDER,
            display_name="Founder",
            description="Bootstrap accelerator",
            base_price=Decimal("200.00"),
            gmv_percentage=Decimal("7.500"),
            billing_cycle=BillingCycleEnum.MONTHLY,
            is_active=True,
        ),
        SubscriptionPlan(
            plan_name=SubscriptionPlanEnum.ACCELERATOR,
            display_name="Accelerator",
            description="Full acceleration program",
            base_price=Decimal("1200.00"),
            gmv_percentage=Decimal("5.000"),
            billing_cycle=BillingCycleEnum.MONTHLY,
            is_active=True,
        ),
    ]
    db_session.add_all(plans)
    db_session.commit()
    return plans


# =====================================================
# DATABASE MODEL TESTS
# =====================================================

class TestSubscriptionPlan:
    """Tests for SubscriptionPlan model."""

    def test_create_subscription_plan(self, db_session):
        """Test creating a subscription plan."""
        plan = SubscriptionPlan(
            plan_name=SubscriptionPlanEnum.FOUNDER,
            display_name="Founder",
            base_price=Decimal("200.00"),
            gmv_percentage=Decimal("7.500"),
            billing_cycle=BillingCycleEnum.MONTHLY,
        )
        db_session.add(plan)
        db_session.commit()

        retrieved = db_session.query(SubscriptionPlan).filter_by(plan_name=SubscriptionPlanEnum.FOUNDER).first()
        assert retrieved is not None
        assert retrieved.base_price == Decimal("200.00")
        assert retrieved.gmv_percentage == Decimal("7.500")
        assert retrieved.is_active is True

    def test_subscription_plan_one_time_billing(self, db_session):
        """Test one-time billing cycle."""
        plan = SubscriptionPlan(
            plan_name=SubscriptionPlanEnum.BETA,
            display_name="Beta",
            base_price=Decimal("20.00"),
            gmv_percentage=Decimal("10.000"),
            billing_cycle=BillingCycleEnum.ONE_TIME,
        )
        db_session.add(plan)
        db_session.commit()

        retrieved = db_session.query(SubscriptionPlan).filter_by(plan_name=SubscriptionPlanEnum.BETA).first()
        assert retrieved.billing_cycle == BillingCycleEnum.ONE_TIME

    def test_subscription_plan_unique_constraint(self, db_session):
        """Test plan_name uniqueness constraint."""
        plan1 = SubscriptionPlan(
            plan_name=SubscriptionPlanEnum.FOUNDER,
            display_name="Founder",
            base_price=Decimal("200.00"),
            gmv_percentage=Decimal("7.500"),
        )
        db_session.add(plan1)
        db_session.commit()

        # Try to create duplicate
        plan2 = SubscriptionPlan(
            plan_name=SubscriptionPlanEnum.FOUNDER,
            display_name="Founder 2",
            base_price=Decimal("300.00"),
            gmv_percentage=Decimal("5.000"),
        )
        db_session.add(plan2)

        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()


class TestVendorSubscription:
    """Tests for VendorSubscription model."""

    def test_create_vendor_subscription(self, db_session, vendor, subscription_plans):
        """Test creating a vendor subscription."""
        plan = subscription_plans[0]  # Beta plan
        sub = VendorSubscription(
            vendor_id=vendor.vendor_id,
            subscription_plan_id=plan.subscription_plan_id,
            status=SubscriptionStatus.ACTIVE,
            next_billing_date=datetime.utcnow() + timedelta(days=30),
            currency="USD",
        )
        db_session.add(sub)
        db_session.commit()

        retrieved = db_session.query(VendorSubscription).filter_by(vendor_id=vendor.vendor_id).first()
        assert retrieved is not None
        assert retrieved.status == SubscriptionStatus.ACTIVE
        assert retrieved.currency == "USD"
        assert retrieved.stripe_customer_id is None

    def test_vendor_subscription_stripe_customer_uniqueness(self, db_session, vendor, subscription_plans):
        """Test Stripe customer ID uniqueness."""
        plan = subscription_plans[0]
        sub1 = VendorSubscription(
            vendor_id=vendor.vendor_id,
            subscription_plan_id=plan.subscription_plan_id,
            stripe_customer_id="cus_123456",
            next_billing_date=datetime.utcnow() + timedelta(days=30),
        )
        db_session.add(sub1)
        db_session.commit()

        # Create another vendor
        vendor2 = Vendor(
            name="Test Vendor 2",
            email="vendor2@test.com",
            password_hash=get_password_hash("testpass123"),
            status="active",
        )
        db_session.add(vendor2)
        db_session.commit()

        # Try to assign same Stripe customer ID
        sub2 = VendorSubscription(
            vendor_id=vendor2.vendor_id,
            subscription_plan_id=plan.subscription_plan_id,
            stripe_customer_id="cus_123456",
            next_billing_date=datetime.utcnow() + timedelta(days=30),
        )
        db_session.add(sub2)

        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()

    def test_vendor_subscription_status_tracking(self, db_session, vendor, subscription_plans):
        """Test subscription status transitions."""
        plan = subscription_plans[0]
        sub = VendorSubscription(
            vendor_id=vendor.vendor_id,
            subscription_plan_id=plan.subscription_plan_id,
            status=SubscriptionStatus.ACTIVE,
            next_billing_date=datetime.utcnow() + timedelta(days=30),
        )
        db_session.add(sub)
        db_session.commit()

        # Transition to paused
        sub.status = SubscriptionStatus.PAUSED
        db_session.commit()

        retrieved = db_session.query(VendorSubscription).filter_by(vendor_id=vendor.vendor_id).first()
        assert retrieved.status == SubscriptionStatus.PAUSED


class TestVendorInvoice:
    """Tests for VendorInvoice model."""

    def test_create_vendor_invoice(self, db_session, vendor, subscription_plans):
        """Test creating a vendor invoice."""
        plan = subscription_plans[0]
        sub = VendorSubscription(
            vendor_id=vendor.vendor_id,
            subscription_plan_id=plan.subscription_plan_id,
            next_billing_date=datetime.utcnow() + timedelta(days=30),
        )
        db_session.add(sub)
        db_session.commit()

        now = datetime.utcnow()
        invoice = VendorInvoice(
            vendor_subscription_id=sub.vendor_subscription_id,
            invoice_number="INV-2025-001",
            status=InvoiceStatus.DRAFT,
            billing_start_date=now,
            billing_end_date=now + timedelta(days=30),
            subtotal=Decimal("200.00"),
            tax_amount=Decimal("20.00"),
            total_amount=Decimal("220.00"),
        )
        db_session.add(invoice)
        db_session.commit()

        retrieved = db_session.query(VendorInvoice).filter_by(invoice_number="INV-2025-001").first()
        assert retrieved is not None
        assert retrieved.total_amount == Decimal("220.00")
        assert retrieved.status == InvoiceStatus.DRAFT

    def test_invoice_number_uniqueness(self, db_session, vendor, subscription_plans):
        """Test invoice number uniqueness."""
        plan = subscription_plans[0]
        sub = VendorSubscription(
            vendor_id=vendor.vendor_id,
            subscription_plan_id=plan.subscription_plan_id,
            next_billing_date=datetime.utcnow() + timedelta(days=30),
        )
        db_session.add(sub)
        db_session.commit()

        now = datetime.utcnow()
        invoice1 = VendorInvoice(
            vendor_subscription_id=sub.vendor_subscription_id,
            invoice_number="INV-2025-001",
            status=InvoiceStatus.DRAFT,
            billing_start_date=now,
            billing_end_date=now + timedelta(days=30),
            subtotal=Decimal("200.00"),
            total_amount=Decimal("200.00"),
        )
        db_session.add(invoice1)
        db_session.commit()

        # Try to create duplicate
        invoice2 = VendorInvoice(
            vendor_subscription_id=sub.vendor_subscription_id,
            invoice_number="INV-2025-001",
            status=InvoiceStatus.DRAFT,
            billing_start_date=now,
            billing_end_date=now + timedelta(days=30),
            subtotal=Decimal("200.00"),
            total_amount=Decimal("200.00"),
        )
        db_session.add(invoice2)

        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()


class TestVendorInvoiceItem:
    """Tests for VendorInvoiceItem model."""

    def test_create_invoice_item(self, db_session, vendor, subscription_plans):
        """Test creating invoice line items."""
        plan = subscription_plans[0]
        sub = VendorSubscription(
            vendor_id=vendor.vendor_id,
            subscription_plan_id=plan.subscription_plan_id,
            next_billing_date=datetime.utcnow() + timedelta(days=30),
        )
        db_session.add(sub)
        db_session.commit()

        now = datetime.utcnow()
        invoice = VendorInvoice(
            vendor_subscription_id=sub.vendor_subscription_id,
            invoice_number="INV-2025-001",
            status=InvoiceStatus.DRAFT,
            billing_start_date=now,
            billing_end_date=now + timedelta(days=30),
            subtotal=Decimal("200.00"),
            total_amount=Decimal("200.00"),
        )
        db_session.add(invoice)
        db_session.commit()

        item = VendorInvoiceItem(
            vendor_invoice_id=invoice.vendor_invoice_id,
            description="Monthly subscription fee",
            item_type="subscription_fee",
            amount=Decimal("200.00"),
        )
        db_session.add(item)
        db_session.commit()

        retrieved = db_session.query(VendorInvoiceItem).filter_by(vendor_invoice_id=invoice.vendor_invoice_id).first()
        assert retrieved is not None
        assert retrieved.amount == Decimal("200.00")
        assert retrieved.item_type == "subscription_fee"


class TestGMVFee:
    """Tests for GMVFee model."""

    def test_create_gmv_fee(self, db_session, vendor, subscription_plans):
        """Test creating a GMV fee record."""
        plan = subscription_plans[1]  # Founder plan: 7.5% GMV fee
        sub = VendorSubscription(
            vendor_id=vendor.vendor_id,
            subscription_plan_id=plan.subscription_plan_id,
            next_billing_date=datetime.utcnow() + timedelta(days=30),
        )
        db_session.add(sub)
        db_session.commit()

        now = datetime.utcnow()
        gmv_fee = GMVFee(
            vendor_subscription_id=sub.vendor_subscription_id,
            billing_start_date=now,
            billing_end_date=now + timedelta(days=30),
            total_gmv=Decimal("10000.00"),
            gmv_percentage=Decimal("7.500"),
            fee_amount=Decimal("750.00"),  # 10000 * 7.5 / 100
        )
        db_session.add(gmv_fee)
        db_session.commit()

        retrieved = db_session.query(GMVFee).filter_by(vendor_subscription_id=sub.vendor_subscription_id).first()
        assert retrieved is not None
        assert retrieved.total_gmv == Decimal("10000.00")
        assert retrieved.fee_amount == Decimal("750.00")
        assert retrieved.is_finalized is False

    def test_gmv_fee_refund_tracking(self, db_session, vendor, subscription_plans):
        """Test GMV fee refund tracking."""
        plan = subscription_plans[1]
        sub = VendorSubscription(
            vendor_id=vendor.vendor_id,
            subscription_plan_id=plan.subscription_plan_id,
            next_billing_date=datetime.utcnow() + timedelta(days=30),
        )
        db_session.add(sub)
        db_session.commit()

        now = datetime.utcnow()
        gmv_fee = GMVFee(
            vendor_subscription_id=sub.vendor_subscription_id,
            billing_start_date=now,
            billing_end_date=now + timedelta(days=30),
            total_gmv=Decimal("10000.00"),
            gmv_percentage=Decimal("7.500"),
            fee_amount=Decimal("750.00"),
            refunded_gmv=Decimal("1000.00"),
            refunded_fee_amount=Decimal("75.00"),
        )
        db_session.add(gmv_fee)
        db_session.commit()

        retrieved = db_session.query(GMVFee).filter_by(vendor_subscription_id=sub.vendor_subscription_id).first()
        assert retrieved.refunded_gmv == Decimal("1000.00")
        assert retrieved.refunded_fee_amount == Decimal("75.00")


class TestGMVConversion:
    """Tests for GMVConversion model."""

    def test_create_gmv_conversion(self, db_session, vendor, subscription_plans, conversion_event):
        """Test creating a GMV conversion record."""
        plan = subscription_plans[1]
        sub = VendorSubscription(
            vendor_id=vendor.vendor_id,
            subscription_plan_id=plan.subscription_plan_id,
            next_billing_date=datetime.utcnow() + timedelta(days=30),
        )
        db_session.add(sub)
        db_session.commit()

        now = datetime.utcnow()
        gmv_fee = GMVFee(
            vendor_subscription_id=sub.vendor_subscription_id,
            billing_start_date=now,
            billing_end_date=now + timedelta(days=30),
            total_gmv=Decimal("1000.00"),
            gmv_percentage=Decimal("7.500"),
            fee_amount=Decimal("75.00"),
        )
        db_session.add(gmv_fee)
        db_session.commit()

        gmv_conversion = GMVConversion(
            gmv_fee_id=gmv_fee.gmv_fee_id,
            conversion_event_id=conversion_event.conversion_event_id,
            event_value=Decimal("500.00"),
            applied_gmv_percentage=Decimal("7.500"),
            applied_fee_amount=Decimal("37.50"),
        )
        db_session.add(gmv_conversion)
        db_session.commit()

        retrieved = db_session.query(GMVConversion).filter_by(gmv_fee_id=gmv_fee.gmv_fee_id).first()
        assert retrieved is not None
        assert retrieved.event_value == Decimal("500.00")
        assert retrieved.applied_fee_amount == Decimal("37.50")


class TestInvoiceAdjustment:
    """Tests for InvoiceAdjustment model."""

    def test_create_invoice_adjustment(self, db_session, vendor, subscription_plans, vendor_user):
        """Test creating an invoice adjustment."""
        plan = subscription_plans[0]
        sub = VendorSubscription(
            vendor_id=vendor.vendor_id,
            subscription_plan_id=plan.subscription_plan_id,
            next_billing_date=datetime.utcnow() + timedelta(days=30),
        )
        db_session.add(sub)
        db_session.commit()

        now = datetime.utcnow()
        invoice = VendorInvoice(
            vendor_subscription_id=sub.vendor_subscription_id,
            invoice_number="INV-2025-001",
            status=InvoiceStatus.DRAFT,
            billing_start_date=now,
            billing_end_date=now + timedelta(days=30),
            subtotal=Decimal("200.00"),
            total_amount=Decimal("200.00"),
        )
        db_session.add(invoice)
        db_session.commit()

        adjustment = InvoiceAdjustment(
            vendor_invoice_id=invoice.vendor_invoice_id,
            description="Promotional discount",
            adjustment_type="discount",
            amount=Decimal("20.00"),
            adjusted_by_id=vendor_user.vendor_user_id,
            adjustment_reason="First-time customer promotion",
        )
        db_session.add(adjustment)
        db_session.commit()

        retrieved = db_session.query(InvoiceAdjustment).filter_by(vendor_invoice_id=invoice.vendor_invoice_id).first()
        assert retrieved is not None
        assert retrieved.adjustment_type == "discount"
        assert retrieved.amount == Decimal("20.00")


# =====================================================
# PAYMENT PROCESSOR ABSTRACTION TESTS
# =====================================================

class TestPaymentProcessorAbstraction:
    """Tests for payment processor abstraction layer."""

    def test_payment_intent_creation(self):
        """Test PaymentIntent dataclass."""
        intent = PaymentIntent(
            customer_id="cus_123",
            amount=10000,  # $100.00
            currency="USD",
            description="Test payment",
            metadata={"order_id": "123"},
        )
        assert intent.customer_id == "cus_123"
        assert intent.amount == 10000
        assert intent.currency == "USD"

    def test_payment_result_creation(self):
        """Test PaymentResult dataclass."""
        result = PaymentResult(
            success=True,
            payment_id="pi_123",
            status=PaymentStatus.SUCCEEDED,
            amount=10000,
            currency="USD",
        )
        assert result.success is True
        assert result.status == PaymentStatus.SUCCEEDED

    def test_refund_request_creation(self):
        """Test RefundRequest dataclass."""
        refund = RefundRequest(
            payment_id="pi_123",
            amount=5000,
            reason="customer_request",
        )
        assert refund.payment_id == "pi_123"
        assert refund.amount == 5000

    def test_refund_result_creation(self):
        """Test RefundResult dataclass."""
        result = RefundResult(
            success=True,
            refund_id="re_123",
            status=RefundStatus.SUCCEEDED,
            amount=5000,
            currency="USD",
        )
        assert result.success is True
        assert result.status == RefundStatus.SUCCEEDED


class TestPaymentProcessorFactory:
    """Tests for payment processor factory."""

    def test_stripe_processor_registration(self):
        """Test that Stripe processor is registered."""
        processors = PaymentProcessorFactory.get_available_processors()
        assert "stripe" in processors

    def test_create_stripe_processor(self):
        """Test creating a Stripe processor instance."""
        config = {"api_key": "sk_test_123456"}
        processor = PaymentProcessorFactory.create_processor("stripe", config)
        assert isinstance(processor, StripeProcessor)
        assert processor.processor_name == "stripe"

    def test_unknown_processor_raises_error(self):
        """Test that unknown processor raises ValueError."""
        with pytest.raises(ValueError, match="Unknown payment processor"):
            PaymentProcessorFactory.create_processor("unknown", {})

    def test_missing_api_key_raises_error(self):
        """Test that missing API key raises ValueError."""
        with pytest.raises(ValueError, match="API key is required"):
            PaymentProcessorFactory.create_processor("stripe", {})


class TestStripeProcessor:
    """Tests for Stripe processor implementation."""

    @pytest.fixture
    def stripe_processor(self):
        """Create a Stripe processor with mock config."""
        config = {
            "api_key": "sk_test_123456",
            "webhook_secret": "whsec_test_123456",
        }
        return StripeProcessor(config)

    def test_processor_name(self, stripe_processor):
        """Test processor name."""
        assert stripe_processor.processor_name == "stripe"

    @patch("app.services.stripe_processor.stripe.Customer.create")
    def test_create_customer_success(self, mock_create, stripe_processor):
        """Test successful customer creation."""
        mock_customer = Mock()
        mock_customer.id = "cus_123456"
        mock_create.return_value = mock_customer

        result = stripe_processor.create_customer(
            email="test@example.com",
            name="Test User",
            currency="USD",
        )

        assert result.success is True
        assert result.customer_id == "cus_123456"
        mock_create.assert_called_once()

    @patch("app.services.stripe_processor.stripe.Customer.create")
    def test_create_customer_failure(self, mock_create, stripe_processor):
        """Test customer creation failure."""
        import stripe
        mock_create.side_effect = stripe.error.StripeError("API Error")

        result = stripe_processor.create_customer(
            email="test@example.com",
            name="Test User",
            currency="USD",
        )

        assert result.success is False
        assert result.error_message is not None

    @patch("app.services.stripe_processor.stripe.PaymentIntent.create")
    def test_create_payment_intent_success(self, mock_create, stripe_processor):
        """Test successful payment intent creation."""
        mock_intent = Mock()
        mock_intent.id = "pi_123456"
        mock_intent.status = "requires_confirmation"
        mock_create.return_value = mock_intent

        intent = PaymentIntent(
            customer_id="cus_123",
            amount=10000,
            currency="USD",
            description="Test",
        )

        result = stripe_processor.create_payment_intent(intent)

        # Intent created successfully but not yet confirmed/succeeded
        assert result.success is True  # Creation was successful
        assert result.payment_id == "pi_123456"
        assert result.status == PaymentStatus.PENDING  # Status is pending confirmation

    @patch("app.services.stripe_processor.stripe.PaymentIntent.confirm")
    def test_confirm_payment_success(self, mock_confirm, stripe_processor):
        """Test successful payment confirmation."""
        mock_intent = Mock()
        mock_intent.id = "pi_123456"
        mock_intent.status = "succeeded"
        mock_intent.amount = 10000
        mock_intent.currency = "usd"
        mock_intent.last_payment_error = None
        mock_confirm.return_value = mock_intent

        result = stripe_processor.confirm_payment("pi_123456")

        assert result.success is True
        assert result.status == PaymentStatus.SUCCEEDED

    @patch("app.services.stripe_processor.stripe.PaymentIntent.retrieve")
    def test_retrieve_payment_success(self, mock_retrieve, stripe_processor):
        """Test successful payment retrieval."""
        mock_intent = Mock()
        mock_intent.id = "pi_123456"
        mock_intent.status = "succeeded"
        mock_intent.amount = 10000
        mock_intent.currency = "usd"
        mock_intent.last_payment_error = None
        mock_retrieve.return_value = mock_intent

        result = stripe_processor.retrieve_payment("pi_123456")

        assert result.success is True
        assert result.payment_id == "pi_123456"

    @patch("app.services.stripe_processor.stripe.PaymentIntent.retrieve")
    @patch("app.services.stripe_processor.stripe.Refund.create")
    def test_refund_payment_success(self, mock_refund_create, mock_retrieve, stripe_processor):
        """Test successful refund."""
        mock_intent = Mock()
        mock_charge = Mock()
        mock_charge.id = "ch_123456"
        mock_intent.charges.data = [mock_charge]
        mock_retrieve.return_value = mock_intent

        mock_refund = Mock()
        mock_refund.id = "re_123456"
        mock_refund.status = "succeeded"
        mock_refund.amount = 5000
        mock_refund.currency = "usd"
        mock_refund_create.return_value = mock_refund

        refund_request = RefundRequest(
            payment_id="pi_123456",
            amount=5000,
        )

        result = stripe_processor.refund_payment(refund_request)

        assert result.success is True
        assert result.refund_id == "re_123456"

    @patch("app.services.stripe_processor.stripe.Webhook.construct_event")
    def test_verify_webhook_signature_success(self, mock_construct, stripe_processor):
        """Test successful webhook signature verification."""
        mock_construct.return_value = {"id": "evt_123"}

        result = stripe_processor.verify_webhook_signature(
            payload=b"test_payload",
            signature="t=123,v1=abc",
        )

        assert result is True

    @patch("app.services.stripe_processor.stripe.Webhook.construct_event")
    def test_verify_webhook_signature_failure(self, mock_construct, stripe_processor):
        """Test failed webhook signature verification."""
        import stripe
        mock_construct.side_effect = stripe.error.SignatureVerificationError("Invalid signature", "sig")

        result = stripe_processor.verify_webhook_signature(
            payload=b"test_payload",
            signature="invalid",
        )

        assert result is False

    def test_stripe_status_mapping(self, stripe_processor):
        """Test Stripe status mapping."""
        assert stripe_processor._map_stripe_status("requires_payment_method") == PaymentStatus.PENDING
        assert stripe_processor._map_stripe_status("requires_confirmation") == PaymentStatus.PENDING
        assert stripe_processor._map_stripe_status("succeeded") == PaymentStatus.SUCCEEDED
        assert stripe_processor._map_stripe_status("canceled") == PaymentStatus.FAILED

    def test_stripe_refund_status_mapping(self, stripe_processor):
        """Test Stripe refund status mapping."""
        assert stripe_processor._map_stripe_refund_status("succeeded") == RefundStatus.SUCCEEDED
        assert stripe_processor._map_stripe_refund_status("failed") == RefundStatus.FAILED
