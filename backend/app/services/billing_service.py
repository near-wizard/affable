"""Core billing service for subscription and invoice management."""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.billing import (
    SubscriptionPlan,
    SubscriptionPlanEnum,
    SubscriptionStatus,
    VendorSubscription,
    VendorInvoice,
    VendorInvoiceItem,
    GMVFee,
    GMVConversion,
    InvoiceStatus,
)
from app.models import Vendor, ConversionEvent
from app.services.payment_processor import PaymentProcessorFactory

logger = logging.getLogger(__name__)


class SubscriptionService:
    """Manage vendor subscriptions."""

    @staticmethod
    def create_subscription(
        db: Session,
        vendor_id: int,
        plan_id: int,
        currency: str = "USD",
        stripe_customer_id: Optional[str] = None,
    ) -> VendorSubscription:
        """
        Create a new vendor subscription.

        Args:
            db: Database session
            vendor_id: Vendor to subscribe
            plan_id: Subscription plan
            currency: Billing currency
            stripe_customer_id: Stripe customer ID if already created

        Returns:
            VendorSubscription instance

        Raises:
            ValueError: If vendor already has active subscription
        """
        # Validate vendor exists
        vendor = db.query(Vendor).filter_by(vendor_id=vendor_id).first()
        if not vendor:
            raise ValueError(f"Vendor {vendor_id} not found")

        # Validate plan exists
        plan = db.query(SubscriptionPlan).filter_by(subscription_plan_id=plan_id).first()
        if not plan:
            raise ValueError(f"Subscription plan {plan_id} not found")

        # Check for existing active subscription
        existing = db.query(VendorSubscription).filter(
            VendorSubscription.vendor_id == vendor_id,
            VendorSubscription.status == SubscriptionStatus.ACTIVE,
        ).first()

        if existing:
            raise ValueError(f"Vendor {vendor_id} already has an active subscription")

        # Calculate next billing date (30 days from now)
        next_billing_date = datetime.utcnow() + timedelta(days=30)

        subscription = VendorSubscription(
            vendor_id=vendor_id,
            subscription_plan_id=plan_id,
            status=SubscriptionStatus.ACTIVE,
            start_date=datetime.utcnow(),
            next_billing_date=next_billing_date,
            currency=currency,
            stripe_customer_id=stripe_customer_id,
        )

        db.add(subscription)
        db.commit()
        db.refresh(subscription)

        logger.info(f"Created subscription for vendor {vendor_id} on plan {plan_id}")
        return subscription

    @staticmethod
    def get_active_subscription(db: Session, vendor_id: int) -> Optional[VendorSubscription]:
        """Get vendor's active subscription."""
        return db.query(VendorSubscription).filter(
            VendorSubscription.vendor_id == vendor_id,
            VendorSubscription.status == SubscriptionStatus.ACTIVE,
        ).first()

    @staticmethod
    def pause_subscription(db: Session, subscription_id: int, reason: str = None) -> VendorSubscription:
        """Pause a vendor's subscription."""
        subscription = db.query(VendorSubscription).filter_by(
            vendor_subscription_id=subscription_id
        ).first()

        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        subscription.status = SubscriptionStatus.PAUSED
        db.commit()
        db.refresh(subscription)

        logger.info(f"Paused subscription {subscription_id}: {reason}")
        return subscription

    @staticmethod
    def resume_subscription(db: Session, subscription_id: int, reason: str = None) -> VendorSubscription:
        """Resume a paused vendor's subscription."""
        subscription = db.query(VendorSubscription).filter_by(
            vendor_subscription_id=subscription_id
        ).first()

        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        subscription.status = SubscriptionStatus.ACTIVE
        db.commit()
        db.refresh(subscription)

        logger.info(f"Resumed subscription {subscription_id}: {reason}")
        return subscription

    @staticmethod
    def cancel_subscription(db: Session, subscription_id: int, reason: str = None) -> VendorSubscription:
        """Cancel a vendor's subscription."""
        subscription = db.query(VendorSubscription).filter_by(
            vendor_subscription_id=subscription_id
        ).first()

        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        subscription.status = SubscriptionStatus.CANCELLED
        subscription.end_date = datetime.utcnow()
        db.commit()
        db.refresh(subscription)

        logger.info(f"Cancelled subscription {subscription_id}: {reason}")
        return subscription

    @staticmethod
    def update_next_billing_date(
        db: Session,
        subscription_id: int,
        next_billing_date: datetime,
    ) -> VendorSubscription:
        """Update when the next invoice should be generated."""
        subscription = db.query(VendorSubscription).filter_by(
            vendor_subscription_id=subscription_id
        ).first()

        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        subscription.next_billing_date = next_billing_date
        db.commit()
        db.refresh(subscription)

        return subscription


class GMVTrackingService:
    """Track and calculate GMV-based fees."""

    @staticmethod
    def calculate_gmv_for_period(
        db: Session,
        vendor_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> Decimal:
        """
        Calculate total GMV (Gross Merchandise Value) for a vendor in a period.

        Args:
            db: Database session
            vendor_id: Vendor ID
            start_date: Period start
            end_date: Period end

        Returns:
            Total GMV from all conversion events in period
        """
        # Get vendor's campaigns
        vendor = db.query(Vendor).filter_by(vendor_id=vendor_id).first()
        if not vendor:
            raise ValueError(f"Vendor {vendor_id} not found")

        # Sum all conversion event values for this vendor's campaigns in the period
        total_gmv = db.query(ConversionEvent).join(
            ConversionEvent.partner_id,  # Through partner
        ).filter(
            ConversionEvent.occurred_at >= start_date,
            ConversionEvent.occurred_at <= end_date,
            ConversionEvent.status.in_(["completed", "pending"]),  # Don't count rejected
        ).with_entities(
            db.func.sum(ConversionEvent.event_value)
        ).scalar() or Decimal("0.00")

        return Decimal(str(total_gmv)) if total_gmv else Decimal("0.00")

    @staticmethod
    def create_gmv_fee(
        db: Session,
        vendor_subscription_id: int,
        start_date: datetime,
        end_date: datetime,
        total_gmv: Decimal,
        gmv_percentage: Decimal,
    ) -> GMVFee:
        """
        Create a GMV fee record for a billing period.

        Args:
            db: Database session
            vendor_subscription_id: Subscription ID
            start_date: Period start
            end_date: Period end
            total_gmv: Total GMV amount
            gmv_percentage: Fee percentage (e.g., 7.5 for 7.5%)

        Returns:
            GMVFee instance
        """
        # Calculate fee amount
        fee_amount = (total_gmv * gmv_percentage / Decimal("100")).quantize(Decimal("0.01"))

        gmv_fee = GMVFee(
            vendor_subscription_id=vendor_subscription_id,
            billing_start_date=start_date,
            billing_end_date=end_date,
            total_gmv=total_gmv,
            gmv_percentage=gmv_percentage,
            fee_amount=fee_amount,
        )

        db.add(gmv_fee)
        db.commit()
        db.refresh(gmv_fee)

        logger.info(
            f"Created GMV fee for subscription {vendor_subscription_id}: "
            f"${total_gmv} * {gmv_percentage}% = ${fee_amount}"
        )
        return gmv_fee

    @staticmethod
    def link_conversions_to_gmv_fee(
        db: Session,
        gmv_fee_id: int,
        conversion_ids: List[int],
        gmv_percentage: Decimal,
    ) -> List[GMVConversion]:
        """
        Link conversion events to a GMV fee calculation.

        Args:
            db: Database session
            gmv_fee_id: GMV fee record
            conversion_ids: List of conversion event IDs
            gmv_percentage: Fee percentage

        Returns:
            List of GMVConversion instances
        """
        gmv_conversions = []

        for conv_id in conversion_ids:
            conversion = db.query(ConversionEvent).filter_by(
                conversion_event_id=conv_id
            ).first()

            if not conversion:
                logger.warning(f"Conversion {conv_id} not found")
                continue

            # Calculate fee for this conversion
            fee_amount = (conversion.event_value * gmv_percentage / Decimal("100")).quantize(
                Decimal("0.01")
            )

            gmv_conversion = GMVConversion(
                gmv_fee_id=gmv_fee_id,
                conversion_event_id=conv_id,
                event_value=conversion.event_value,
                applied_gmv_percentage=gmv_percentage,
                applied_fee_amount=fee_amount,
            )

            db.add(gmv_conversion)
            gmv_conversions.append(gmv_conversion)

        db.commit()
        logger.info(f"Linked {len(gmv_conversions)} conversions to GMV fee {gmv_fee_id}")
        return gmv_conversions

    @staticmethod
    def calculate_refunded_gmv(
        db: Session,
        gmv_fee_id: int,
    ) -> Dict[str, Decimal]:
        """
        Calculate total refunded GMV and fees for a GMV fee period.

        Args:
            db: Database session
            gmv_fee_id: GMV fee ID

        Returns:
            Dict with 'refunded_gmv' and 'refunded_fee_amount'
        """
        # First check if GMV conversions have refund data
        gmv_conversions = db.query(GMVConversion).filter_by(gmv_fee_id=gmv_fee_id).all()

        total_refunded_gmv = Decimal("0.00")
        total_refunded_fees = Decimal("0.00")

        # Sum refunds from individual conversions if they exist
        for conv in gmv_conversions:
            if conv.refund_status in ["partial", "full"]:
                total_refunded_gmv += conv.refunded_amount or Decimal("0.00")
                total_refunded_fees += conv.refunded_fee_amount or Decimal("0.00")

        # If no conversions have refunds, check the GMVFee model directly
        if total_refunded_gmv == Decimal("0.00"):
            gmv_fee = db.query(GMVFee).filter_by(gmv_fee_id=gmv_fee_id).first()
            if gmv_fee:
                total_refunded_gmv = gmv_fee.refunded_gmv or Decimal("0.00")
                total_refunded_fees = gmv_fee.refunded_fee_amount or Decimal("0.00")

        return {
            "refunded_gmv": total_refunded_gmv,
            "refunded_fee_amount": total_refunded_fees,
        }


class InvoiceService:
    """Generate and manage vendor invoices."""

    @staticmethod
    def generate_invoice_number(db: Session, vendor_id: int) -> str:
        """
        Generate unique invoice number for a vendor.

        Format: INV-{VENDOR_ID}-{YEAR}{MONTH}{SEQUENCE}
        Example: INV-123-202501001
        """
        now = datetime.utcnow()
        year_month = now.strftime("%Y%m")
        max_attempts = 100
        attempt = 0

        # Try to generate a unique invoice number with retries for concurrency
        while attempt < max_attempts:
            attempt += 1

            # Count existing invoices for this vendor in this month
            count = db.query(VendorInvoice).filter(
                VendorInvoice.vendor_subscription_id.in_(
                    db.query(VendorSubscription.vendor_subscription_id).filter_by(vendor_id=vendor_id)
                ),
                VendorInvoice.invoice_number.like(f"INV-{vendor_id}-{year_month}%"),
            ).count()

            sequence = str(count + 1).zfill(3)
            invoice_number = f"INV-{vendor_id}-{year_month}{sequence}"

            # Check if this number already exists to handle concurrent creation
            existing = db.query(VendorInvoice).filter_by(
                invoice_number=invoice_number
            ).first()

            if not existing:
                return invoice_number

            # If it exists, retry with next sequence
            db.rollback()

        # Fallback: use timestamp-based sequence if we can't find a unique number
        timestamp_seq = str(int(now.timestamp() * 1000))[-3:]
        return f"INV-{vendor_id}-{year_month}{timestamp_seq}"

    @staticmethod
    def create_invoice(
        db: Session,
        subscription_id: int,
        billing_start_date: datetime,
        billing_end_date: datetime,
        subscription_fee: Decimal,
        gmv_fee: Optional[Decimal] = None,
        tax_amount: Decimal = Decimal("0.00"),
    ) -> VendorInvoice:
        """
        Create a vendor invoice with subscription and optional GMV fees.

        Args:
            db: Database session
            subscription_id: Vendor subscription
            billing_start_date: Start of billing period
            billing_end_date: End of billing period
            subscription_fee: Base subscription fee
            gmv_fee: GMV-based fee (optional)
            tax_amount: Tax to apply

        Returns:
            VendorInvoice instance
        """
        subscription = db.query(VendorSubscription).filter_by(
            vendor_subscription_id=subscription_id
        ).first()

        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        # Calculate subtotal and total
        gmv_fee = gmv_fee or Decimal("0.00")
        subtotal = subscription_fee + gmv_fee
        total = subtotal + tax_amount

        # Generate invoice number
        invoice_number = InvoiceService.generate_invoice_number(db, subscription.vendor_id)

        invoice = VendorInvoice(
            vendor_subscription_id=subscription_id,
            invoice_number=invoice_number,
            status=InvoiceStatus.DRAFT,
            billing_start_date=billing_start_date,
            billing_end_date=billing_end_date,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total,
        )

        db.add(invoice)
        db.flush()  # Get invoice ID before adding items

        # Add subscription fee line item (only if non-zero)
        if subscription_fee > Decimal("0.00"):
            sub_item = VendorInvoiceItem(
                vendor_invoice_id=invoice.vendor_invoice_id,
                description=f"Subscription fee ({billing_start_date.strftime('%B')})",
                item_type="subscription_fee",
                amount=subscription_fee,
            )
            db.add(sub_item)

        # Add GMV fee line item if present
        if gmv_fee > Decimal("0.00"):
            gmv_item = VendorInvoiceItem(
                vendor_invoice_id=invoice.vendor_invoice_id,
                description=f"GMV-based fee ({billing_start_date.strftime('%B')})",
                item_type="gmv_fee",
                amount=gmv_fee,
            )
            db.add(gmv_item)

        # Add tax line item if present
        if tax_amount > Decimal("0.00"):
            tax_item = VendorInvoiceItem(
                vendor_invoice_id=invoice.vendor_invoice_id,
                description="Sales tax",
                item_type="tax",
                amount=tax_amount,
            )
            db.add(tax_item)

        db.commit()
        db.refresh(invoice)

        logger.info(f"Created invoice {invoice_number} for subscription {subscription_id}")
        return invoice

    @staticmethod
    def get_invoice(db: Session, invoice_id: int) -> Optional[VendorInvoice]:
        """Get invoice by ID."""
        return db.query(VendorInvoice).filter_by(vendor_invoice_id=invoice_id).first()

    @staticmethod
    def mark_invoice_sent(db: Session, invoice_id: int) -> VendorInvoice:
        """Mark invoice as sent to customer."""
        invoice = InvoiceService.get_invoice(db, invoice_id)
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        invoice.status = InvoiceStatus.SENT
        db.commit()
        db.refresh(invoice)

        return invoice

    @staticmethod
    def mark_invoice_paid(
        db: Session,
        invoice_id: int,
        stripe_invoice_id: Optional[str] = None,
    ) -> VendorInvoice:
        """Mark invoice as paid."""
        invoice = InvoiceService.get_invoice(db, invoice_id)
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        invoice.status = InvoiceStatus.PAID
        invoice.paid_at = datetime.utcnow()
        if stripe_invoice_id:
            invoice.stripe_invoice_id = stripe_invoice_id

        db.commit()
        db.refresh(invoice)

        logger.info(f"Marked invoice {invoice.invoice_number} as paid")
        return invoice

    @staticmethod
    def get_unpaid_invoices(
        db: Session,
        vendor_id: int,
        include_past_due: bool = True,
    ) -> List[VendorInvoice]:
        """
        Get unpaid invoices for a vendor.

        Args:
            db: Database session
            vendor_id: Vendor ID
            include_past_due: Include past due invoices

        Returns:
            List of unpaid VendorInvoice instances
        """
        # Determine which statuses to include
        statuses = [InvoiceStatus.SENT, InvoiceStatus.PAST_DUE] if include_past_due else [InvoiceStatus.SENT]

        query = db.query(VendorInvoice).join(
            VendorSubscription
        ).filter(
            VendorSubscription.vendor_id == vendor_id,
            VendorInvoice.status.in_(statuses),
        )

        return query.all()

    @staticmethod
    def get_invoices_for_period(
        db: Session,
        vendor_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> List[VendorInvoice]:
        """Get invoices created in a date range."""
        return db.query(VendorInvoice).join(
            VendorSubscription
        ).filter(
            VendorSubscription.vendor_id == vendor_id,
            VendorInvoice.created_at >= start_date,
            VendorInvoice.created_at <= end_date,
        ).all()
