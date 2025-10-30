"""Billing and subscription models for vendor payment processing."""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Numeric, Table, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum

from app.models.base import BaseModel


class SubscriptionPlanEnum(str, Enum):
    """Available subscription plans."""
    BETA = "beta"
    FOUNDER = "founder"
    ACCELERATOR = "accelerator"


class BillingCycleEnum(str, Enum):
    """Billing cycle frequency."""
    MONTHLY = "monthly"
    ANNUAL = "annual"
    ONE_TIME = "one_time"


class SubscriptionStatus(str, Enum):
    """Subscription status."""
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    PAST_DUE = "past_due"


class InvoiceStatus(str, Enum):
    """Invoice status."""
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    PAST_DUE = "past_due"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class SubscriptionPlan(BaseModel):
    """Available subscription plans with pricing and features."""

    __tablename__ = "subscription_plans"

    subscription_plan_id = Column(Integer, primary_key=True, index=True)
    plan_name = Column(SQLEnum(SubscriptionPlanEnum), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    description = Column(Text)

    # Pricing
    base_price = Column(Numeric(10, 2), nullable=False)  # One-time or monthly price
    gmv_percentage = Column(Numeric(5, 3), nullable=False)  # GMV fee percentage (e.g., 7.5 = 7.5%)
    billing_cycle = Column(SQLEnum(BillingCycleEnum), default=BillingCycleEnum.MONTHLY, nullable=False)

    # Features
    is_active = Column(Boolean, default=True)
    has_usage_limits = Column(Boolean, default=False)
    max_monthly_volume = Column(Numeric(12, 2), nullable=True)  # If has_usage_limits is True

    # Relationships
    subscriptions = relationship("VendorSubscription", back_populates="plan")

    def __repr__(self):
        return f"<SubscriptionPlan {self.plan_name} - ${self.base_price} + {self.gmv_percentage}%>"


class VendorSubscription(BaseModel):
    """Current subscription for a vendor."""

    __tablename__ = "vendor_subscriptions"

    vendor_subscription_id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.vendor_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    subscription_plan_id = Column(Integer, ForeignKey("subscription_plans.subscription_plan_id"), nullable=False)

    # Subscription lifecycle
    status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False, index=True)
    start_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    next_billing_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)  # Set when cancelled

    # Payment method and currency
    stripe_customer_id = Column(String(255), unique=True, index=True)
    stripe_subscription_id = Column(String(255), unique=True, index=True)
    currency = Column(String(3), default='USD', nullable=False)

    # Tax settings
    tax_exempt = Column(Boolean, default=False)

    # Relationships
    vendor = relationship("Vendor", foreign_keys=[vendor_id])
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
    invoices = relationship("VendorInvoice", back_populates="subscription")

    def __repr__(self):
        return f"<VendorSubscription vendor={self.vendor_id} plan={self.subscription_plan_id} status={self.status}>"


class VendorInvoice(BaseModel):
    """Monthly invoice for a vendor (subscription + GMV fees)."""

    __tablename__ = "vendor_invoices"

    vendor_invoice_id = Column(Integer, primary_key=True, index=True)
    vendor_subscription_id = Column(Integer, ForeignKey("vendor_subscriptions.vendor_subscription_id", ondelete="CASCADE"), nullable=False, index=True)

    # Invoice metadata
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(SQLEnum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False, index=True)

    # Billing period
    billing_start_date = Column(DateTime, nullable=False)
    billing_end_date = Column(DateTime, nullable=False)

    # Amounts (in vendor's currency)
    subtotal = Column(Numeric(12, 2), nullable=False)  # Before tax and adjustments
    tax_amount = Column(Numeric(12, 2), default=0)
    adjustment_amount = Column(Numeric(12, 2), default=0)  # For manual adjustments
    total_amount = Column(Numeric(12, 2), nullable=False)

    # Payment tracking
    stripe_invoice_id = Column(String(255), unique=True, index=True)
    paid_at = Column(DateTime, nullable=True)

    # Notes
    notes = Column(Text)

    # Relationships
    subscription = relationship("VendorSubscription", back_populates="invoices")
    items = relationship("VendorInvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    adjustments = relationship("InvoiceAdjustment", back_populates="invoice", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<VendorInvoice {self.invoice_number} - ${self.total_amount} - {self.status}>"


class VendorInvoiceItem(BaseModel):
    """Line item on a vendor invoice."""

    __tablename__ = "vendor_invoice_items"

    vendor_invoice_item_id = Column(Integer, primary_key=True, index=True)
    vendor_invoice_id = Column(Integer, ForeignKey("vendor_invoices.vendor_invoice_id", ondelete="CASCADE"), nullable=False, index=True)

    # Item details
    description = Column(String(255), nullable=False)
    item_type = Column(String(50), nullable=False)  # "subscription_fee", "gmv_fee", "tax"

    # Amount
    amount = Column(Numeric(12, 2), nullable=False)

    # Optional references
    gmv_fee_id = Column(Integer, ForeignKey("gmv_fees.gmv_fee_id"), nullable=True)

    # Relationships
    invoice = relationship("VendorInvoice", back_populates="items")
    gmv_fee = relationship("GMVFee", back_populates="invoice_items")

    def __repr__(self):
        return f"<VendorInvoiceItem {self.item_type} - ${self.amount}>"


class GMVFee(BaseModel):
    """GMV-based fees calculated from conversion events."""

    __tablename__ = "gmv_fees"

    gmv_fee_id = Column(Integer, primary_key=True, index=True)
    vendor_subscription_id = Column(Integer, ForeignKey("vendor_subscriptions.vendor_subscription_id", ondelete="CASCADE"), nullable=False, index=True)

    # Billing period
    billing_start_date = Column(DateTime, nullable=False)
    billing_end_date = Column(DateTime, nullable=False)

    # GMV calculations
    total_gmv = Column(Numeric(12, 2), nullable=False)  # Total Gross Merchandise Value
    gmv_percentage = Column(Numeric(5, 3), nullable=False)  # Fee percentage (e.g., 7.5)
    fee_amount = Column(Numeric(12, 2), nullable=False)  # total_gmv * gmv_percentage / 100

    # Refund tracking
    refunded_gmv = Column(Numeric(12, 2), default=0)  # For refunded conversions
    refunded_fee_amount = Column(Numeric(12, 2), default=0)  # Corresponding fee reduction

    # Status
    is_finalized = Column(Boolean, default=False)  # Locked when invoiced

    # Relationships
    vendor_subscription = relationship("VendorSubscription", foreign_keys=[vendor_subscription_id])
    gmv_conversions = relationship("GMVConversion", back_populates="gmv_fee", cascade="all, delete-orphan")
    invoice_items = relationship("VendorInvoiceItem", back_populates="gmv_fee")

    def __repr__(self):
        return f"<GMVFee ${self.total_gmv} * {self.gmv_percentage}% = ${self.fee_amount}>"


class GMVConversion(BaseModel):
    """Links conversion events to GMV fee calculations."""

    __tablename__ = "gmv_conversions"

    gmv_conversion_id = Column(Integer, primary_key=True, index=True)
    gmv_fee_id = Column(Integer, ForeignKey("gmv_fees.gmv_fee_id", ondelete="CASCADE"), nullable=False, index=True)
    conversion_event_id = Column(Integer, ForeignKey("conversion_events.conversion_event_id", ondelete="CASCADE"), nullable=False, index=True)

    # Captured values at time of billing
    event_value = Column(Numeric(12, 2), nullable=False)
    applied_gmv_percentage = Column(Numeric(5, 3), nullable=False)
    applied_fee_amount = Column(Numeric(12, 2), nullable=False)

    # Refund tracking
    refund_status = Column(String(50), default='none')  # none, partial, full
    refunded_amount = Column(Numeric(12, 2), default=0)
    refunded_fee_amount = Column(Numeric(12, 2), default=0)

    # Relationships
    gmv_fee = relationship("GMVFee", back_populates="gmv_conversions")
    conversion_event = relationship("ConversionEvent")

    def __repr__(self):
        return f"<GMVConversion conversion={self.conversion_event_id} gmv=${self.event_value}>"


class InvoiceAdjustment(BaseModel):
    """Manual adjustments to invoices (admin panel)."""

    __tablename__ = "invoice_adjustments"

    invoice_adjustment_id = Column(Integer, primary_key=True, index=True)
    vendor_invoice_id = Column(Integer, ForeignKey("vendor_invoices.vendor_invoice_id", ondelete="CASCADE"), nullable=False, index=True)

    # Adjustment details
    description = Column(String(255), nullable=False)
    adjustment_type = Column(String(50), nullable=False)  # "credit", "debit", "discount", "fee_waiver"
    amount = Column(Numeric(12, 2), nullable=False)

    # Audit trail
    adjusted_by_id = Column(Integer, ForeignKey("vendor_users.vendor_user_id"))
    adjustment_reason = Column(Text)

    # Relationships
    invoice = relationship("VendorInvoice", back_populates="adjustments")
    adjusted_by = relationship("VendorUser")

    def __repr__(self):
        return f"<InvoiceAdjustment {self.adjustment_type} ${self.amount}>"


class PaymentTransaction(BaseModel):
    """Stripe payment transaction records."""

    __tablename__ = "payment_transactions"

    payment_transaction_id = Column(Integer, primary_key=True, index=True)
    vendor_invoice_id = Column(Integer, ForeignKey("vendor_invoices.vendor_invoice_id"), nullable=True, index=True)

    # Stripe references
    stripe_payment_intent_id = Column(String(255), unique=True, index=True)
    stripe_charge_id = Column(String(255), unique=True, index=True)

    # Transaction details
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default='USD', nullable=False)

    # Status
    status = Column(String(50), default='pending', index=True)  # pending, succeeded, failed, refunded

    # Stripe response
    stripe_response = Column(JSON)
    error_message = Column(Text, nullable=True)

    # Relationships
    invoice = relationship("VendorInvoice")

    def __repr__(self):
        return f"<PaymentTransaction ${self.amount} - {self.status}>"


class DunningStatus(str, Enum):
    """Dunning process status."""
    ACTIVE = "active"  # In dunning workflow
    RESOLVED = "resolved"  # Payment recovered
    FAILED = "failed"  # Dunning failed, subscription suspended/cancelled
    CANCELLED = "cancelled"  # Manually cancelled


class DunningAttempt(BaseModel):
    """Dunning attempt records for failed invoice payments."""

    __tablename__ = "dunning_attempts"

    dunning_attempt_id = Column(Integer, primary_key=True, index=True)
    vendor_invoice_id = Column(Integer, ForeignKey("vendor_invoices.vendor_invoice_id"), nullable=False, index=True)
    payment_transaction_id = Column(Integer, ForeignKey("payment_transactions.payment_transaction_id"), nullable=True)

    # Attempt details
    attempt_number = Column(Integer, nullable=False)  # 1st, 2nd, 3rd attempt
    attempted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(50), default='pending', nullable=False)  # pending, succeeded, failed

    # Retry scheduling
    next_retry_date = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    # Dunning action
    action_taken = Column(String(100), nullable=True)  # email_sent, payment_retried, subscription_suspended

    # Relationships
    invoice = relationship("VendorInvoice")
    transaction = relationship("PaymentTransaction")

    def __repr__(self):
        return f"<DunningAttempt #{self.attempt_number} for Invoice {self.vendor_invoice_id}>"


class DunningPolicy(BaseModel):
    """Dunning retry policies and escalation rules."""

    __tablename__ = "dunning_policies"

    dunning_policy_id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.vendor_id"), nullable=True, index=True)  # NULL = global default

    # Retry configuration
    max_retry_attempts = Column(Integer, default=3, nullable=False)
    retry_schedule = Column(JSON, default=lambda: {"1": 1, "2": 3, "3": 7}, nullable=False)  # days between retries
    initial_grace_period_days = Column(Integer, default=0, nullable=False)  # Days before first retry

    # Escalation actions
    action_on_max_failed = Column(String(50), default='suspend', nullable=False)  # suspend, cancel
    suspend_after_days = Column(Integer, default=30, nullable=False)  # Days after first failure to suspend

    # Configuration
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    vendor = relationship("Vendor", foreign_keys=[vendor_id])

    def __repr__(self):
        return f"<DunningPolicy max_attempts={self.max_retry_attempts}>"


class BillingReport(BaseModel):
    """Billing metrics and analytics reports."""

    __tablename__ = "billing_reports"

    billing_report_id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.vendor_id"), nullable=False, index=True)

    # Period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    report_month = Column(String(7), nullable=False)  # YYYY-MM format

    # Revenue metrics
    total_mrr = Column(Numeric(12, 2), default=0, nullable=False)  # Monthly Recurring Revenue
    total_gmv = Column(Numeric(14, 2), default=0, nullable=False)  # Total Gross Merchandise Value
    total_gmv_fees = Column(Numeric(12, 2), default=0, nullable=False)  # GMV-based fees
    total_subscription_fees = Column(Numeric(12, 2), default=0, nullable=False)  # Subscription fees

    # Invoice metrics
    invoice_count = Column(Integer, default=0, nullable=False)
    paid_count = Column(Integer, default=0, nullable=False)
    unpaid_count = Column(Integer, default=0, nullable=False)
    overdue_count = Column(Integer, default=0, nullable=False)

    # Refund metrics
    refund_count = Column(Integer, default=0, nullable=False)
    total_refunded = Column(Numeric(12, 2), default=0, nullable=False)

    # Churn metrics
    is_churned = Column(Boolean, default=False, nullable=False)
    churn_reason = Column(String(255), nullable=True)

    # Calculated metrics
    payment_success_rate = Column(Numeric(5, 2), default=0, nullable=False)  # Percentage (0-100)
    total_outstanding = Column(Numeric(12, 2), default=0, nullable=False)  # Total unpaid invoices
    days_sales_outstanding = Column(Integer, default=0, nullable=False)  # DSO metric

    # Report status
    report_status = Column(String(50), default='draft', nullable=False)  # draft, generated, finalized
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    vendor = relationship("Vendor", foreign_keys=[vendor_id])

    def __repr__(self):
        return f"<BillingReport {self.report_month} MRR=${self.total_mrr}>"
