"""
Phase 5 Tests: Admin Panel & Refund Management
Tests for manual invoice adjustments and refund handling.
"""

import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.billing import (
    SubscriptionPlan,
    SubscriptionPlanEnum,
    VendorSubscription,
    VendorInvoice,
    InvoiceAdjustment,
    PaymentTransaction,
    InvoiceStatus,
    GMVFee,
    GMVConversion,
)
from app.models import Vendor, ConversionEvent
from app.services.billing_service import (
    SubscriptionService,
    InvoiceService,
)
from app.services.adjustment_service import AdjustmentService
from app.services.refund_service import RefundService
from app.core.security import get_password_hash


# =====================================================
# FIXTURES
# =====================================================

@pytest.fixture
def vendor_with_invoice(db_session):
    """Create vendor with invoice."""
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

    now = datetime.utcnow()
    invoice = InvoiceService.create_invoice(
        db_session,
        subscription.vendor_subscription_id,
        now,
        now + timedelta(days=30),
        subscription_fee=Decimal("200.00"),
        gmv_fee=Decimal("75.00"),
    )

    return {
        "vendor": vendor,
        "subscription": subscription,
        "invoice": invoice,
    }


@pytest.fixture
def invoice_with_payment(vendor_with_invoice, db_session):
    """Create invoice with payment transaction."""
    invoice = vendor_with_invoice["invoice"]

    transaction = PaymentTransaction(
        vendor_invoice_id=invoice.vendor_invoice_id,
        stripe_payment_intent_id="pi_test_123",
        stripe_charge_id="ch_test_123",
        amount=invoice.total_amount,
        currency="USD",
        status="succeeded",
        stripe_response={"id": "pi_test_123"},
    )
    db_session.add(transaction)
    db_session.commit()
    db_session.refresh(transaction)

    return transaction


# =====================================================
# ADJUSTMENT SERVICE TESTS
# =====================================================

class TestAdjustmentService:
    """Tests for manual invoice adjustments."""

    def test_apply_credit_adjustment(self, db_session, vendor_with_invoice):
        """Test applying a credit adjustment."""
        invoice = vendor_with_invoice["invoice"]
        original_total = invoice.total_amount

        adjustment = AdjustmentService.apply_adjustment(
            db_session,
            invoice.vendor_invoice_id,
            "credit",
            Decimal("50.00"),
            "Loyalty credit",
        )

        assert adjustment.amount == Decimal("50.00")
        assert adjustment.adjustment_type == "credit"

        db_session.refresh(invoice)
        assert invoice.total_amount == original_total - Decimal("50.00")

    def test_apply_discount_adjustment(self, db_session, vendor_with_invoice):
        """Test applying a discount adjustment."""
        invoice = vendor_with_invoice["invoice"]
        original_total = invoice.total_amount

        adjustment = AdjustmentService.apply_adjustment(
            db_session,
            invoice.vendor_invoice_id,
            "discount",
            Decimal("25.00"),
            "Early payment discount",
        )

        assert adjustment.adjustment_type == "discount"

        db_session.refresh(invoice)
        assert invoice.total_amount == original_total - Decimal("25.00")

    def test_apply_fee_waiver(self, db_session, vendor_with_invoice):
        """Test applying a fee waiver."""
        invoice = vendor_with_invoice["invoice"]
        original_total = invoice.total_amount

        # Waive the GMV fee ($75)
        adjustment = AdjustmentService.apply_adjustment(
            db_session,
            invoice.vendor_invoice_id,
            "fee_waiver",
            Decimal("75.00"),
            "GMV fee waiver for Q1",
        )

        assert adjustment.adjustment_type == "fee_waiver"

        db_session.refresh(invoice)
        assert invoice.total_amount == original_total - Decimal("75.00")

    def test_apply_debit_adjustment(self, db_session, vendor_with_invoice):
        """Test applying a debit adjustment (increases total)."""
        invoice = vendor_with_invoice["invoice"]
        original_total = invoice.total_amount

        adjustment = AdjustmentService.apply_adjustment(
            db_session,
            invoice.vendor_invoice_id,
            "debit",
            Decimal("10.00"),
            "Late payment fee",
        )

        assert adjustment.adjustment_type == "debit"

        db_session.refresh(invoice)
        assert invoice.total_amount == original_total + Decimal("10.00")

    def test_invalid_adjustment_type(self, db_session, vendor_with_invoice):
        """Test rejection of invalid adjustment type."""
        invoice = vendor_with_invoice["invoice"]

        with pytest.raises(ValueError, match="Invalid adjustment type"):
            AdjustmentService.apply_adjustment(
                db_session,
                invoice.vendor_invoice_id,
                "invalid_type",
                Decimal("50.00"),
                "Bad type",
            )

    def test_negative_adjustment_amount(self, db_session, vendor_with_invoice):
        """Test rejection of negative adjustment amount."""
        invoice = vendor_with_invoice["invoice"]

        with pytest.raises(ValueError, match="must be greater than zero"):
            AdjustmentService.apply_adjustment(
                db_session,
                invoice.vendor_invoice_id,
                "credit",
                Decimal("-50.00"),
                "Bad amount",
            )

    def test_multiple_adjustments(self, db_session, vendor_with_invoice):
        """Test applying multiple adjustments to same invoice."""
        invoice = vendor_with_invoice["invoice"]
        original_total = invoice.total_amount

        # Apply multiple adjustments
        AdjustmentService.apply_adjustment(
            db_session, invoice.vendor_invoice_id, "credit", Decimal("25.00"), "Credit"
        )
        AdjustmentService.apply_adjustment(
            db_session, invoice.vendor_invoice_id, "debit", Decimal("10.00"), "Fee"
        )
        AdjustmentService.apply_adjustment(
            db_session, invoice.vendor_invoice_id, "discount", Decimal("5.00"), "Discount"
        )

        db_session.refresh(invoice)
        # -25 + 10 - 5 = -20
        expected_total = original_total - Decimal("20.00")
        assert invoice.total_amount == expected_total

    def test_reverse_adjustment(self, db_session, vendor_with_invoice):
        """Test reversing an adjustment."""
        invoice = vendor_with_invoice["invoice"]

        # Apply initial adjustment
        original_adjustment = AdjustmentService.apply_adjustment(
            db_session,
            invoice.vendor_invoice_id,
            "credit",
            Decimal("50.00"),
            "Initial credit",
        )

        db_session.refresh(invoice)
        total_after_credit = invoice.total_amount

        # Reverse it
        reversal = AdjustmentService.reverse_adjustment(
            db_session,
            original_adjustment.invoice_adjustment_id,
            "User requested reversal",
        )

        db_session.refresh(invoice)
        # Credit of 50 reversed by debit of 50 = back to original
        assert invoice.total_amount == total_after_credit + Decimal("50.00")

    def test_get_adjustment_summary(self, db_session, vendor_with_invoice):
        """Test getting adjustment summary."""
        invoice = vendor_with_invoice["invoice"]

        # Apply various adjustments
        AdjustmentService.apply_adjustment(
            db_session, invoice.vendor_invoice_id, "credit", Decimal("25.00"), "C1"
        )
        AdjustmentService.apply_adjustment(
            db_session, invoice.vendor_invoice_id, "credit", Decimal("15.00"), "C2"
        )
        AdjustmentService.apply_adjustment(
            db_session, invoice.vendor_invoice_id, "debit", Decimal("10.00"), "D1"
        )

        summary = AdjustmentService.get_adjustment_summary(db_session, invoice.vendor_invoice_id)

        assert summary["total_adjustments"] == 3
        assert summary["total_credits"] == Decimal("40.00")
        assert summary["total_debits"] == Decimal("10.00")

    def test_validate_adjustment_history(self, db_session, vendor_with_invoice):
        """Test validating adjustment history."""
        invoice = vendor_with_invoice["invoice"]

        AdjustmentService.apply_adjustment(
            db_session, invoice.vendor_invoice_id, "credit", Decimal("30.00"), "Credit"
        )

        audit_trail = AdjustmentService.validate_adjustment_history(
            db_session, invoice.vendor_invoice_id
        )

        assert audit_trail["matches"] is True
        assert audit_trail["adjustment_count"] == 1
        assert audit_trail["calculated_total"] == audit_trail["stored_total"]


# =====================================================
# REFUND SERVICE TESTS
# =====================================================

class TestRefundService:
    """Tests for refund handling."""

    def test_create_refund_request_full(self, db_session, invoice_with_payment):
        """Test creating full refund request."""
        transaction = invoice_with_payment

        request = RefundService.create_refund_request(
            db_session,
            transaction.payment_transaction_id,
            reason="Customer changed mind",
        )

        assert request["amount"] == transaction.amount
        assert request["is_partial"] is False

    def test_create_refund_request_partial(self, db_session, invoice_with_payment):
        """Test creating partial refund request."""
        transaction = invoice_with_payment
        partial_amount = transaction.amount / 2

        request = RefundService.create_refund_request(
            db_session,
            transaction.payment_transaction_id,
            amount=partial_amount,
            reason="Partial refund",
        )

        assert request["amount"] == partial_amount
        assert request["is_partial"] is True

    def test_refund_nonexistent_transaction(self, db_session):
        """Test refunding non-existent transaction."""
        with pytest.raises(ValueError, match="not found"):
            RefundService.create_refund_request(
                db_session,
                99999,
                reason="Bad trans",
            )

    def test_refund_exceeds_amount(self, db_session, invoice_with_payment):
        """Test refund exceeding transaction amount."""
        transaction = invoice_with_payment

        with pytest.raises(ValueError, match="exceeds transaction amount"):
            RefundService.create_refund_request(
                db_session,
                transaction.payment_transaction_id,
                amount=transaction.amount + Decimal("100.00"),
            )

    def test_refund_impact_analysis(self, db_session, vendor_with_invoice):
        """Test analyzing refund impact."""
        invoice = vendor_with_invoice["invoice"]

        impact = RefundService.calculate_refund_impact(
            db_session,
            invoice.vendor_invoice_id,
            Decimal("50.00"),
        )

        assert impact["is_valid"] is True
        assert impact["is_full_refund"] is False
        assert float(impact["new_total"]) == float(invoice.total_amount) - 50.00

    def test_refund_full_invoice(self, db_session, vendor_with_invoice):
        """Test full invoice refund impact."""
        invoice = vendor_with_invoice["invoice"]

        impact = RefundService.calculate_refund_impact(
            db_session,
            invoice.vendor_invoice_id,
            invoice.total_amount,
        )

        assert impact["is_full_refund"] is True
        assert float(impact["new_total"]) == 0.00

    def test_refund_exceeds_invoice(self, db_session, vendor_with_invoice):
        """Test refund exceeding invoice total."""
        invoice = vendor_with_invoice["invoice"]

        impact = RefundService.calculate_refund_impact(
            db_session,
            invoice.vendor_invoice_id,
            invoice.total_amount + Decimal("50.00"),
        )

        assert impact["is_valid"] is False

    def test_create_credit_memo(self, db_session, vendor_with_invoice):
        """Test creating a credit memo."""
        vendor = vendor_with_invoice["vendor"]

        credit = RefundService.create_credit_memo(
            db_session,
            vendor.vendor_id,
            Decimal("100.00"),
            "Goodwill credit",
        )

        assert credit["amount"] == 100.00
        assert credit["status"] == "active"
        assert credit["remaining_balance"] == 100.00

    def test_credit_memo_with_invoice(self, db_session, vendor_with_invoice):
        """Test creating credit memo applied to invoice."""
        vendor = vendor_with_invoice["vendor"]
        invoice = vendor_with_invoice["invoice"]

        credit = RefundService.create_credit_memo(
            db_session,
            vendor.vendor_id,
            Decimal("50.00"),
            "Service credit",
            apply_to_invoice_id=invoice.vendor_invoice_id,
        )

        assert credit["applied_to_invoice_id"] == invoice.vendor_invoice_id
