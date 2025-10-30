"""
Phase 2 Tests: Core Billing Logic
Tests for subscription management, GMV tracking, and invoice generation.
"""

import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.billing import (
    SubscriptionPlan,
    SubscriptionPlanEnum,
    SubscriptionStatus,
    VendorSubscription,
    VendorInvoice,
    InvoiceStatus,
    GMVFee,
)
from app.models import Vendor
from app.services.billing_service import (
    SubscriptionService,
    GMVTrackingService,
    InvoiceService,
)
from app.core.security import get_password_hash


# =====================================================
# SUBSCRIPTION SERVICE TESTS
# =====================================================

class TestSubscriptionService:
    """Tests for subscription management."""

    @pytest.fixture
    def vendor_and_plan(self, db_session):
        """Create vendor and subscription plan."""
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

        return vendor, plan

    def test_create_subscription(self, db_session, vendor_and_plan):
        """Test creating a new subscription."""
        vendor, plan = vendor_and_plan

        subscription = SubscriptionService.create_subscription(
            db_session,
            vendor.vendor_id,
            plan.subscription_plan_id,
            currency="USD",
        )

        assert subscription.vendor_id == vendor.vendor_id
        assert subscription.subscription_plan_id == plan.subscription_plan_id
        assert subscription.status == SubscriptionStatus.ACTIVE
        assert subscription.currency == "USD"
        assert subscription.next_billing_date > datetime.utcnow()

    def test_create_subscription_with_stripe_customer(self, db_session, vendor_and_plan):
        """Test creating subscription with Stripe customer ID."""
        vendor, plan = vendor_and_plan

        subscription = SubscriptionService.create_subscription(
            db_session,
            vendor.vendor_id,
            plan.subscription_plan_id,
            stripe_customer_id="cus_123456",
        )

        assert subscription.stripe_customer_id == "cus_123456"

    def test_create_subscription_duplicate_fails(self, db_session, vendor_and_plan):
        """Test that creating duplicate subscription fails."""
        vendor, plan = vendor_and_plan

        # Create first subscription
        SubscriptionService.create_subscription(
            db_session,
            vendor.vendor_id,
            plan.subscription_plan_id,
        )

        # Try to create another for same vendor
        with pytest.raises(ValueError, match="already has an active subscription"):
            SubscriptionService.create_subscription(
                db_session,
                vendor.vendor_id,
                plan.subscription_plan_id,
            )

    def test_get_active_subscription(self, db_session, vendor_and_plan):
        """Test retrieving active subscription."""
        vendor, plan = vendor_and_plan

        created = SubscriptionService.create_subscription(
            db_session,
            vendor.vendor_id,
            plan.subscription_plan_id,
        )

        retrieved = SubscriptionService.get_active_subscription(
            db_session,
            vendor.vendor_id,
        )

        assert retrieved is not None
        assert retrieved.vendor_subscription_id == created.vendor_subscription_id

    def test_pause_subscription(self, db_session, vendor_and_plan):
        """Test pausing a subscription."""
        vendor, plan = vendor_and_plan

        subscription = SubscriptionService.create_subscription(
            db_session,
            vendor.vendor_id,
            plan.subscription_plan_id,
        )

        paused = SubscriptionService.pause_subscription(
            db_session,
            subscription.vendor_subscription_id,
            reason="Customer request",
        )

        assert paused.status == SubscriptionStatus.PAUSED

    def test_cancel_subscription(self, db_session, vendor_and_plan):
        """Test cancelling a subscription."""
        vendor, plan = vendor_and_plan

        subscription = SubscriptionService.create_subscription(
            db_session,
            vendor.vendor_id,
            plan.subscription_plan_id,
        )

        cancelled = SubscriptionService.cancel_subscription(
            db_session,
            subscription.vendor_subscription_id,
            reason="Customer churn",
        )

        assert cancelled.status == SubscriptionStatus.CANCELLED
        assert cancelled.end_date is not None

    def test_update_next_billing_date(self, db_session, vendor_and_plan):
        """Test updating next billing date."""
        vendor, plan = vendor_and_plan

        subscription = SubscriptionService.create_subscription(
            db_session,
            vendor.vendor_id,
            plan.subscription_plan_id,
        )

        new_date = datetime.utcnow() + timedelta(days=60)
        updated = SubscriptionService.update_next_billing_date(
            db_session,
            subscription.vendor_subscription_id,
            new_date,
        )

        assert updated.next_billing_date.date() == new_date.date()


# =====================================================
# GMV TRACKING SERVICE TESTS
# =====================================================

class TestGMVTrackingService:
    """Tests for GMV tracking and fee calculation."""

    @pytest.fixture
    def setup_gmv_tracking(self, db_session, vendor_and_plan, partner, campaign_version, conversion_event_type):
        """Setup for GMV tracking tests."""
        vendor, plan = vendor_and_plan

        subscription = SubscriptionService.create_subscription(
            db_session,
            vendor.vendor_id,
            plan.subscription_plan_id,
        )

        return {
            "vendor": vendor,
            "plan": plan,
            "subscription": subscription,
            "partner": partner,
            "campaign_version": campaign_version,
            "conversion_event_type": conversion_event_type,
        }

    @pytest.fixture
    def vendor_and_plan(self, db_session):
        """Create vendor and plan for GMV tests."""
        unique_email = f"vendor-gmv-{uuid.uuid4().hex[:8]}@test.com"
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

        return vendor, plan

    def test_create_gmv_fee(self, db_session, setup_gmv_tracking):
        """Test creating a GMV fee record."""
        setup = setup_gmv_tracking
        subscription = setup["subscription"]
        plan = setup["plan"]

        now = datetime.utcnow()
        start = now.replace(day=1)
        end = (start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        gmv_fee = GMVTrackingService.create_gmv_fee(
            db_session,
            subscription.vendor_subscription_id,
            start,
            end,
            total_gmv=Decimal("10000.00"),
            gmv_percentage=plan.gmv_percentage,
        )

        assert gmv_fee.total_gmv == Decimal("10000.00")
        assert gmv_fee.gmv_percentage == Decimal("7.500")
        assert gmv_fee.fee_amount == Decimal("750.00")  # 10000 * 7.5 / 100
        assert gmv_fee.is_finalized is False

    def test_create_gmv_fee_precise_calculation(self, db_session, vendor_and_plan):
        """Test GMV fee calculation precision."""
        vendor, plan = vendor_and_plan
        subscription = SubscriptionService.create_subscription(
            db_session,
            vendor.vendor_id,
            plan.subscription_plan_id,
        )

        now = datetime.utcnow()

        # Test case: $1000 * 7.5% = $75.00 exactly
        gmv_fee = GMVTrackingService.create_gmv_fee(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            total_gmv=Decimal("1000.00"),
            gmv_percentage=Decimal("7.500"),
        )

        assert gmv_fee.fee_amount == Decimal("75.00")

        # Test case: $333.33 * 7.5% = $24.9997... rounds to $25.00
        gmv_fee2 = GMVTrackingService.create_gmv_fee(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            total_gmv=Decimal("333.33"),
            gmv_percentage=Decimal("7.500"),
        )

        assert gmv_fee2.fee_amount == Decimal("25.00")

    def test_link_conversions_to_gmv_fee(self, db_session, setup_gmv_tracking, conversion_event):
        """Test linking conversions to GMV fee."""
        setup = setup_gmv_tracking
        subscription = setup["subscription"]
        plan = setup["plan"]

        now = datetime.utcnow()

        gmv_fee = GMVTrackingService.create_gmv_fee(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            total_gmv=Decimal("500.00"),
            gmv_percentage=plan.gmv_percentage,
        )

        conversions = GMVTrackingService.link_conversions_to_gmv_fee(
            db_session,
            gmv_fee.gmv_fee_id,
            [conversion_event.conversion_event_id],
            plan.gmv_percentage,
        )

        assert len(conversions) == 1
        assert conversions[0].event_value == conversion_event.event_value
        assert conversions[0].applied_fee_amount == (
            conversion_event.event_value * Decimal("7.5") / Decimal("100")
        ).quantize(Decimal("0.01"))

    def test_calculate_refunded_gmv(self, db_session, setup_gmv_tracking, conversion_event):
        """Test calculating refunded GMV."""
        setup = setup_gmv_tracking
        subscription = setup["subscription"]
        plan = setup["plan"]

        now = datetime.utcnow()

        gmv_fee = GMVTrackingService.create_gmv_fee(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            total_gmv=Decimal("1000.00"),
            gmv_percentage=plan.gmv_percentage,
        )

        conversions = GMVTrackingService.link_conversions_to_gmv_fee(
            db_session,
            gmv_fee.gmv_fee_id,
            [conversion_event.conversion_event_id],
            plan.gmv_percentage,
        )

        # Mark conversion as partially refunded
        conv = conversions[0]
        conv.refund_status = "partial"
        conv.refunded_amount = Decimal("50.00")
        conv.refunded_fee_amount = Decimal("3.75")
        db_session.commit()

        refund_info = GMVTrackingService.calculate_refunded_gmv(
            db_session,
            gmv_fee.gmv_fee_id,
        )

        assert refund_info["refunded_gmv"] == Decimal("50.00")
        assert refund_info["refunded_fee_amount"] == Decimal("3.75")


# =====================================================
# INVOICE SERVICE TESTS
# =====================================================

class TestInvoiceService:
    """Tests for invoice generation and management."""

    @pytest.fixture
    def subscription(self, db_session):
        """Create subscription for invoice tests."""
        unique_email = f"vendor-inv-{uuid.uuid4().hex[:8]}@test.com"
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
        )

        return subscription

    def test_generate_invoice_number(self, db_session, subscription):
        """Test generating invoice numbers with correct format."""
        # Create an invoice to increment the counter
        now = datetime.utcnow()
        InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("200.00"),
        )

        # Generate next invoice number
        num = InvoiceService.generate_invoice_number(db_session, subscription.vendor_id)

        # Format check: INV-{VENDOR_ID}-{YEAR}{MONTH}{SEQUENCE}
        assert num.startswith(f"INV-{subscription.vendor_id}-")
        parts = num.split("-")
        assert len(parts) == 3
        assert parts[0] == "INV"
        assert parts[1] == str(subscription.vendor_id)
        # Date+sequence part should be 9 digits (YYYYMM + 3 digit sequence)
        assert len(parts[2]) == 9

    def test_create_invoice_subscription_fee_only(self, db_session, subscription):
        """Test creating invoice with subscription fee only."""
        now = datetime.utcnow()
        start = now.replace(day=1)
        end = (start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        invoice = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            start,
            end,
            subscription_fee=Decimal("200.00"),
        )

        assert invoice.status == InvoiceStatus.DRAFT
        assert invoice.subtotal == Decimal("200.00")
        assert invoice.total_amount == Decimal("200.00")
        assert len(invoice.items) == 1
        assert invoice.items[0].item_type == "subscription_fee"

    def test_create_invoice_with_gmv_fee(self, db_session, subscription):
        """Test creating invoice with subscription and GMV fees."""
        now = datetime.utcnow()
        start = now.replace(day=1)
        end = (start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        invoice = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            start,
            end,
            subscription_fee=Decimal("200.00"),
            gmv_fee=Decimal("750.00"),
        )

        assert invoice.subtotal == Decimal("950.00")  # 200 + 750
        assert invoice.total_amount == Decimal("950.00")
        assert len(invoice.items) == 2
        assert invoice.items[0].item_type == "subscription_fee"
        assert invoice.items[1].item_type == "gmv_fee"

    def test_create_invoice_with_tax(self, db_session, subscription):
        """Test creating invoice with tax."""
        now = datetime.utcnow()
        start = now.replace(day=1)
        end = (start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        invoice = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            start,
            end,
            subscription_fee=Decimal("200.00"),
            gmv_fee=Decimal("750.00"),
            tax_amount=Decimal("95.00"),  # 10% tax
        )

        assert invoice.subtotal == Decimal("950.00")
        assert invoice.tax_amount == Decimal("95.00")
        assert invoice.total_amount == Decimal("1045.00")
        assert len(invoice.items) == 3  # subscription, gmv, tax

    def test_get_invoice(self, db_session, subscription):
        """Test retrieving invoice by ID."""
        now = datetime.utcnow()

        created = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("200.00"),
        )

        retrieved = InvoiceService.get_invoice(db_session, created.vendor_invoice_id)

        assert retrieved is not None
        assert retrieved.vendor_invoice_id == created.vendor_invoice_id

    def test_mark_invoice_sent(self, db_session, subscription):
        """Test marking invoice as sent."""
        now = datetime.utcnow()

        invoice = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("200.00"),
        )

        sent = InvoiceService.mark_invoice_sent(db_session, invoice.vendor_invoice_id)

        assert sent.status == InvoiceStatus.SENT

    def test_mark_invoice_paid(self, db_session, subscription):
        """Test marking invoice as paid."""
        now = datetime.utcnow()

        invoice = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("200.00"),
        )

        paid = InvoiceService.mark_invoice_paid(
            db_session,
            invoice.vendor_invoice_id,
            stripe_invoice_id="in_123456",
        )

        assert paid.status == InvoiceStatus.PAID
        assert paid.paid_at is not None
        assert paid.stripe_invoice_id == "in_123456"

    def test_get_unpaid_invoices(self, db_session, subscription):
        """Test retrieving unpaid invoices."""
        now = datetime.utcnow()

        # Create multiple invoices
        inv1 = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("200.00"),
        )

        inv2 = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now + timedelta(days=31),
            now + timedelta(days=61),
            subscription_fee=Decimal("200.00"),
        )

        # Mark one as sent
        InvoiceService.mark_invoice_sent(db_session, inv1.vendor_invoice_id)
        # Mark one as paid
        InvoiceService.mark_invoice_paid(db_session, inv2.vendor_invoice_id)

        unpaid = InvoiceService.get_unpaid_invoices(db_session, subscription.vendor_id)

        assert len(unpaid) == 1
        assert unpaid[0].vendor_invoice_id == inv1.vendor_invoice_id

    def test_get_invoices_for_period(self, db_session, subscription):
        """Test retrieving invoices for a date range."""
        now = datetime.utcnow()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Create invoices
        InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            start_of_month,
            start_of_month + timedelta(days=30),
            subscription_fee=Decimal("200.00"),
        )

        # Query for invoices in this month
        invoices = InvoiceService.get_invoices_for_period(
            db_session,
            subscription.vendor_id,
            start_of_month,
            start_of_month + timedelta(days=31),
        )

        assert len(invoices) == 1

    def test_invoice_uniqueness_by_number(self, db_session, subscription):
        """Test that invoice numbers are unique."""
        now = datetime.utcnow()

        inv1 = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now,
            now + timedelta(days=30),
            subscription_fee=Decimal("200.00"),
        )

        inv2 = InvoiceService.create_invoice(
            db_session,
            subscription.vendor_subscription_id,
            now + timedelta(days=31),
            now + timedelta(days=61),
            subscription_fee=Decimal("200.00"),
        )

        assert inv1.invoice_number != inv2.invoice_number
