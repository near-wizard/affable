"""
Phase 4 Tests: Dunning Management, Billing Reports, and Invoice Automation
Tests for failed payment retry workflows and dunning escalation.
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
    DunningAttempt,
    DunningPolicy,
    InvoiceStatus,
)
from app.models import Vendor
from app.services.billing_service import (
    SubscriptionService,
    InvoiceService,
)
from app.services.dunning_service import DunningService
from app.services.billing_reports_service import BillingReportsService
from app.services.stripe_integration_service import StripeIntegrationService
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
        gmv_fee=Decimal("75.00"),
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
# DUNNING POLICY TESTS
# =====================================================

class TestDunningPolicy:
    """Tests for dunning policies."""

    def test_create_global_dunning_policy(self, db_session):
        """Test creating a global default dunning policy."""
        policy = DunningPolicy(
            vendor_id=None,
            max_retry_attempts=3,
            retry_schedule={"1": 1, "2": 3, "3": 7},
            initial_grace_period_days=0,
            action_on_max_failed="suspend",
            suspend_after_days=30,
            is_active=True,
        )
        db_session.add(policy)
        db_session.commit()

        retrieved = db_session.query(DunningPolicy).filter_by(vendor_id=None).first()
        assert retrieved.max_retry_attempts == 3
        assert retrieved.action_on_max_failed == "suspend"

    def test_create_vendor_specific_policy(self, db_session, vendor_with_subscription):
        """Test creating vendor-specific dunning policy."""
        vendor = vendor_with_subscription["vendor"]

        policy = DunningPolicy(
            vendor_id=vendor.vendor_id,
            max_retry_attempts=2,
            retry_schedule={"1": 2, "2": 5},
            initial_grace_period_days=3,
            action_on_max_failed="cancel",
            suspend_after_days=14,
            is_active=True,
        )
        db_session.add(policy)
        db_session.commit()

        retrieved = db_session.query(DunningPolicy).filter_by(
            vendor_id=vendor.vendor_id
        ).first()
        assert retrieved.max_retry_attempts == 2
        assert retrieved.action_on_max_failed == "cancel"

    def test_get_or_create_vendor_policy(self, db_session, vendor_with_subscription):
        """Test retrieving vendor-specific policy or creating default."""
        vendor = vendor_with_subscription["vendor"]

        policy = DunningService.get_or_create_dunning_policy(db_session, vendor.vendor_id)
        assert policy is not None
        assert policy.max_retry_attempts == 3  # Default

    def test_get_or_create_global_policy(self, db_session):
        """Test retrieving global default policy."""
        policy = DunningService.get_or_create_dunning_policy(db_session)
        assert policy is not None
        assert policy.vendor_id is None


# =====================================================
# DUNNING ATTEMPT TESTS
# =====================================================

class TestDunningAttempt:
    """Tests for dunning attempt workflow."""

    def test_initiate_dunning(self, db_session, invoice):
        """Test initiating dunning for failed payment."""
        attempt = DunningService.initiate_dunning(
            db_session,
            invoice.vendor_invoice_id,
            reason="Initial payment failed",
        )

        assert attempt.attempt_number == 1
        assert attempt.status == "pending"
        assert attempt.vendor_invoice_id == invoice.vendor_invoice_id

    def test_initiate_dunning_already_paid(self, db_session, invoice):
        """Test that dunning cannot be initiated for paid invoice."""
        invoice.status = InvoiceStatus.PAID
        db_session.commit()

        with pytest.raises(ValueError, match="already paid"):
            DunningService.initiate_dunning(db_session, invoice.vendor_invoice_id)

    def test_initiate_dunning_nonexistent_invoice(self, db_session):
        """Test initiating dunning for non-existent invoice."""
        with pytest.raises(ValueError, match="not found"):
            DunningService.initiate_dunning(db_session, 99999)

    def test_duplicate_dunning_prevention(self, db_session, invoice):
        """Test that duplicate dunning attempts are prevented."""
        attempt1 = DunningService.initiate_dunning(
            db_session,
            invoice.vendor_invoice_id,
        )

        # Try to initiate again
        attempt2 = DunningService.initiate_dunning(
            db_session,
            invoice.vendor_invoice_id,
        )

        # Should return same attempt
        assert attempt1.dunning_attempt_id == attempt2.dunning_attempt_id

    def test_schedule_retry(self, db_session, invoice):
        """Test scheduling retry after failed attempt."""
        attempt = DunningService.initiate_dunning(db_session, invoice.vendor_invoice_id)
        scheduled = DunningService.schedule_retry(db_session, attempt.dunning_attempt_id)

        assert scheduled.next_retry_date is not None
        # First retry scheduled for 1 day later (from default policy)
        assert scheduled.next_retry_date > datetime.utcnow()

    def test_schedule_retry_respects_policy(self, db_session, vendor_with_subscription, invoice):
        """Test that retry scheduling respects dunning policy."""
        vendor = vendor_with_subscription["vendor"]

        # Create custom policy
        policy = DunningPolicy(
            vendor_id=vendor.vendor_id,
            max_retry_attempts=2,
            retry_schedule={"1": 5},  # 5 days for first retry
            is_active=True,
        )
        db_session.add(policy)
        db_session.commit()

        attempt = DunningService.initiate_dunning(db_session, invoice.vendor_invoice_id)
        scheduled = DunningService.schedule_retry(db_session, attempt.dunning_attempt_id)

        # Verify retry scheduled 5 days out
        expected_date = datetime.utcnow() + timedelta(days=5)
        assert (scheduled.next_retry_date - expected_date).total_seconds() < 60  # Within 1 minute

    def test_max_attempts_reached(self, db_session, invoice):
        """Test handling when max retry attempts reached."""
        attempt = DunningService.initiate_dunning(db_session, invoice.vendor_invoice_id)

        # Set to max attempts
        attempt.attempt_number = 3
        db_session.commit()

        result = DunningService.schedule_retry(db_session, attempt.dunning_attempt_id)
        assert result.status == "max_attempts_reached"


# =====================================================
# DUNNING RETRY TESTS
# =====================================================

class TestDunningRetry:
    """Tests for payment retry logic."""

    def test_get_invoices_due_for_retry(self, db_session, invoice):
        """Test finding invoices due for retry."""
        attempt = DunningService.initiate_dunning(db_session, invoice.vendor_invoice_id)
        DunningService.schedule_retry(db_session, attempt.dunning_attempt_id)

        # Move next_retry_date to past
        attempt.next_retry_date = datetime.utcnow() - timedelta(hours=1)
        db_session.commit()

        due_attempts = DunningService.get_invoices_due_for_retry(db_session)
        assert len(due_attempts) > 0
        assert due_attempts[0].vendor_invoice_id == invoice.vendor_invoice_id

    def test_no_invoices_due_for_retry(self, db_session, invoice):
        """Test no invoices due when retry dates in future."""
        attempt = DunningService.initiate_dunning(db_session, invoice.vendor_invoice_id)
        DunningService.schedule_retry(db_session, attempt.dunning_attempt_id)

        # next_retry_date is set to future
        due_attempts = DunningService.get_invoices_due_for_retry(db_session)
        assert len(due_attempts) == 0

    def test_retry_payment_success(self, db_session, vendor_with_subscription, invoice, stripe_service):
        """Test successful payment retry."""
        subscription = vendor_with_subscription["subscription"]
        subscription.stripe_customer_id = "cus_123456"
        db_session.commit()

        attempt = DunningService.initiate_dunning(db_session, invoice.vendor_invoice_id)

        # Mock successful payment
        stripe_service.processor.create_payment_intent.return_value = Mock(
            success=True,
            payment_id="pi_retry_123",
            status="pending",
            error_message=None,
            raw_response={"id": "pi_retry_123"},
        )

        from app.services.payment_processor import PaymentStatus

        stripe_service.processor.confirm_payment.return_value = Mock(
            success=True,
            payment_id="pi_retry_123",
            status=PaymentStatus.SUCCEEDED,
            error_message=None,
            raw_response={"id": "pi_retry_123", "status": "succeeded"},
        )

        result = DunningService.retry_payment(
            db_session,
            attempt.dunning_attempt_id,
            stripe_service,
        )

        assert result.status == "succeeded"
        assert result.action_taken == "payment_successful"

    def test_retry_payment_failure_schedules_next(self, db_session, vendor_with_subscription, invoice, stripe_service):
        """Test failed retry schedules next attempt."""
        subscription = vendor_with_subscription["subscription"]
        subscription.stripe_customer_id = "cus_123456"
        db_session.commit()

        attempt = DunningService.initiate_dunning(db_session, invoice.vendor_invoice_id)

        # Mock failed payment
        stripe_service.processor.create_payment_intent.return_value = Mock(
            success=True,
            payment_id="pi_retry_123",
            status="pending",
            error_message=None,
            raw_response={"id": "pi_retry_123"},
        )

        from app.services.payment_processor import PaymentStatus

        stripe_service.processor.confirm_payment.return_value = Mock(
            success=False,
            payment_id="pi_retry_123",
            status=PaymentStatus.FAILED,
            error_message="Card declined",
            raw_response={"id": "pi_retry_123", "status": "requires_payment_method"},
        )

        result = DunningService.retry_payment(
            db_session,
            attempt.dunning_attempt_id,
            stripe_service,
        )

        assert result.attempt_number == 2
        assert result.status == "pending"
        assert result.action_taken == "payment_failed_retry_scheduled"


# =====================================================
# DUNNING RESOLUTION TESTS
# =====================================================

class TestDunningResolution:
    """Tests for dunning resolution and escalation."""

    def test_mark_dunning_resolved(self, db_session, invoice):
        """Test marking dunning as resolved."""
        attempt = DunningService.initiate_dunning(db_session, invoice.vendor_invoice_id)

        resolved = DunningService.mark_dunning_resolved(db_session, invoice.vendor_invoice_id)

        assert resolved.status == "resolved"

    def test_handle_max_dunning_failed_suspend(self, db_session, vendor_with_subscription, invoice):
        """Test subscription suspension after max dunning attempts fail."""
        vendor = vendor_with_subscription["vendor"]
        subscription = vendor_with_subscription["subscription"]

        # Create policy that suspends after max failed
        policy = DunningPolicy(
            vendor_id=vendor.vendor_id,
            max_retry_attempts=2,
            action_on_max_failed="suspend",
            is_active=True,
        )
        db_session.add(policy)
        db_session.commit()

        result = DunningService.handle_max_dunning_failed(db_session, invoice.vendor_invoice_id)

        db_session.refresh(subscription)
        from app.models.billing import SubscriptionStatus

        assert subscription.status == SubscriptionStatus.PAUSED

    def test_handle_max_dunning_failed_cancel(self, db_session, vendor_with_subscription, invoice):
        """Test subscription cancellation after max dunning attempts fail."""
        vendor = vendor_with_subscription["vendor"]
        subscription = vendor_with_subscription["subscription"]

        # Create policy that cancels after max failed
        policy = DunningPolicy(
            vendor_id=vendor.vendor_id,
            max_retry_attempts=2,
            action_on_max_failed="cancel",
            is_active=True,
        )
        db_session.add(policy)
        db_session.commit()

        result = DunningService.handle_max_dunning_failed(db_session, invoice.vendor_invoice_id)

        db_session.refresh(subscription)
        from app.models.billing import SubscriptionStatus

        assert subscription.status == SubscriptionStatus.CANCELLED
        assert subscription.end_date is not None

    def test_get_dunning_status(self, db_session, vendor_with_subscription):
        """Test retrieving dunning status summary."""
        vendor = vendor_with_subscription["vendor"]

        status = DunningService.get_dunning_status(db_session, vendor.vendor_id)

        assert "total_attempts" in status
        assert "active_dunning" in status
        assert "resolved" in status
        assert "failed" in status


# =====================================================
# BILLING REPORTS TESTS
# =====================================================

class TestBillingReports:
    """Tests for billing reports and analytics."""

    def test_generate_monthly_report(self, db_session, vendor_with_subscription, invoice):
        """Test generating a monthly billing report."""
        vendor = vendor_with_subscription["vendor"]
        now = datetime.utcnow()
        month = now.strftime("%Y-%m")

        report = BillingReportsService.generate_monthly_report(
            db_session,
            vendor.vendor_id,
            month,
        )

        assert report.vendor_id == vendor.vendor_id
        assert report.report_month == month
        assert report.invoice_count > 0
        assert report.total_mrr > Decimal("0.00")
        assert report.report_status == "generated"

    def test_generate_report_nonexistent_vendor(self, db_session):
        """Test generating report for non-existent vendor."""
        with pytest.raises(ValueError, match="not found"):
            BillingReportsService.generate_monthly_report(
                db_session,
                99999,
                "2025-10",
            )

    def test_get_report(self, db_session, vendor_with_subscription, invoice):
        """Test retrieving a specific report."""
        vendor = vendor_with_subscription["vendor"]
        now = datetime.utcnow()
        month = now.strftime("%Y-%m")

        # Generate report
        generated = BillingReportsService.generate_monthly_report(
            db_session,
            vendor.vendor_id,
            month,
        )

        # Retrieve it
        retrieved = BillingReportsService.get_report(
            db_session,
            vendor.vendor_id,
            month,
        )

        assert retrieved.billing_report_id == generated.billing_report_id
        assert retrieved.report_month == month

    def test_get_reports_for_period(self, db_session, vendor_with_subscription, invoice):
        """Test retrieving reports for a date range."""
        vendor = vendor_with_subscription["vendor"]

        # Generate reports for multiple months
        for month in ["2025-01", "2025-02", "2025-03"]:
            BillingReportsService.generate_monthly_report(
                db_session,
                vendor.vendor_id,
                month,
            )

        # Retrieve range
        reports = BillingReportsService.get_reports_for_period(
            db_session,
            vendor.vendor_id,
            "2025-01",
            "2025-02",
        )

        assert len(reports) == 2

    def test_mrr_trend(self, db_session, vendor_with_subscription, invoice):
        """Test getting MRR trend data."""
        vendor = vendor_with_subscription["vendor"]
        now = datetime.utcnow()
        month = now.strftime("%Y-%m")

        BillingReportsService.generate_monthly_report(
            db_session,
            vendor.vendor_id,
            month,
        )

        trend = BillingReportsService.get_mrr_trend(
            db_session,
            vendor.vendor_id,
            months=12,
        )

        assert len(trend) > 0
        assert "month" in trend[0]
        assert "mrr" in trend[0]
        assert "invoice_count" in trend[0]

    def test_churn_analysis(self, db_session, vendor_with_subscription, invoice):
        """Test churn analysis."""
        vendor = vendor_with_subscription["vendor"]
        now = datetime.utcnow()
        month = now.strftime("%Y-%m")

        BillingReportsService.generate_monthly_report(
            db_session,
            vendor.vendor_id,
            month,
        )

        analysis = BillingReportsService.get_churn_analysis(
            db_session,
            vendor.vendor_id,
        )

        assert "is_churned" in analysis
        assert "total_reports" in analysis
        assert analysis["total_reports"] > 0

    def test_invoice_aging_report(self, db_session, vendor_with_subscription, invoice):
        """Test invoice aging analysis."""
        vendor = vendor_with_subscription["vendor"]

        aging = BillingReportsService.get_invoice_aging_report(
            db_session,
            vendor.vendor_id,
        )

        assert "total_outstanding" in aging
        assert "buckets" in aging
        assert "current" in aging["buckets"]
        assert "30_60_days" in aging["buckets"]

    def test_platform_metrics(self, db_session, vendor_with_subscription, invoice):
        """Test retrieving platform-wide metrics."""
        vendor = vendor_with_subscription["vendor"]
        now = datetime.utcnow()
        month = now.strftime("%Y-%m")

        BillingReportsService.generate_monthly_report(
            db_session,
            vendor.vendor_id,
            month,
        )

        metrics = BillingReportsService.get_platform_metrics(db_session)

        assert "total_mrr" in metrics
        assert "total_gmv" in metrics
        assert "total_vendors" in metrics
        assert "churn_rate" in metrics
