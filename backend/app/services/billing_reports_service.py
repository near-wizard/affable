"""Billing reports and analytics service."""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.billing import (
    BillingReport,
    VendorSubscription,
    VendorInvoice,
    InvoiceStatus,
    GMVFee,
    PaymentTransaction,
    SubscriptionStatus,
)
from app.models import Vendor

logger = logging.getLogger(__name__)


class BillingReportsService:
    """Generate and retrieve billing reports and metrics."""

    @staticmethod
    def generate_monthly_report(
        db: Session,
        vendor_id: int,
        month: str,  # YYYY-MM format
    ) -> BillingReport:
        """
        Generate a monthly billing report for a vendor.

        Args:
            db: Database session
            vendor_id: Vendor ID
            month: Month in YYYY-MM format

        Returns:
            BillingReport instance

        Raises:
            ValueError: If vendor not found
        """
        vendor = db.query(Vendor).filter_by(vendor_id=vendor_id).first()
        if not vendor:
            raise ValueError(f"Vendor {vendor_id} not found")

        # Parse month
        year, month_num = month.split("-")
        period_start = datetime(int(year), int(month_num), 1)
        if int(month_num) == 12:
            period_end = datetime(int(year) + 1, 1, 1) - timedelta(seconds=1)
        else:
            period_end = datetime(int(year), int(month_num) + 1, 1) - timedelta(seconds=1)

        # Check if report already exists
        existing = db.query(BillingReport).filter_by(
            vendor_id=vendor_id,
            report_month=month,
        ).first()

        if existing:
            logger.warning(f"Report already exists for {month}, regenerating")

        # Get vendor subscriptions
        subscriptions = db.query(VendorSubscription).filter_by(
            vendor_id=vendor_id
        ).all()

        if not subscriptions:
            raise ValueError(f"Vendor {vendor_id} has no subscriptions")

        subscription_ids = [s.vendor_subscription_id for s in subscriptions]

        # Get invoices for period
        invoices = db.query(VendorInvoice).filter(
            VendorInvoice.vendor_subscription_id.in_(subscription_ids),
            VendorInvoice.created_at >= period_start,
            VendorInvoice.created_at <= period_end,
        ).all()

        # Calculate metrics
        total_mrr = Decimal("0.00")
        total_gmv = Decimal("0.00")
        total_gmv_fees = Decimal("0.00")
        total_subscription_fees = Decimal("0.00")

        invoice_count = len(invoices)
        paid_count = 0
        unpaid_count = 0
        overdue_count = 0
        refund_count = 0
        total_refunded = Decimal("0.00")
        total_outstanding = Decimal("0.00")

        now = datetime.utcnow()

        for invoice in invoices:
            # Track fee amounts
            total_mrr += invoice.subscription.plan.base_price or Decimal("0.00")

            # Get GMV for this invoice
            gmv_fees = db.query(GMVFee).filter_by(
                vendor_subscription_id=invoice.vendor_subscription_id
            ).all()

            for gmv_fee in gmv_fees:
                total_gmv += gmv_fee.total_gmv or Decimal("0.00")
                total_gmv_fees += gmv_fee.fee_amount or Decimal("0.00")

            total_subscription_fees += invoice.subtotal - sum(
                [g.fee_amount or Decimal("0.00") for g in gmv_fees]
            )

            # Track status
            if invoice.status == InvoiceStatus.PAID:
                paid_count += 1
            else:
                unpaid_count += 1
                total_outstanding += invoice.total_amount

            if invoice.status == InvoiceStatus.PAST_DUE:
                overdue_count += 1

            # Check for refunds
            if invoice.status == InvoiceStatus.REFUNDED:
                refund_count += 1
                # Assume refund amount (could be invoice total)
                total_refunded += invoice.total_amount

        # Calculate payment success rate
        if invoice_count > 0:
            payment_success_rate = Decimal(str(paid_count / invoice_count * 100)).quantize(
                Decimal("0.01")
            )
        else:
            payment_success_rate = Decimal("0.00")

        # Calculate DSO (Days Sales Outstanding)
        if total_outstanding > 0 and unpaid_count > 0:
            days_outstanding = (now - invoices[-1].created_at).days
            dso = max(0, days_outstanding // unpaid_count)
        else:
            dso = 0

        # Determine churn status
        is_churned = False
        churn_reason = None
        for subscription in subscriptions:
            if subscription.status == SubscriptionStatus.CANCELLED:
                is_churned = True
                churn_reason = "subscription_cancelled"
            elif subscription.status == SubscriptionStatus.PAST_DUE:
                is_churned = True
                churn_reason = "payment_failed"

        # Create or update report
        if existing:
            report = existing
        else:
            report = BillingReport(
                vendor_id=vendor_id,
                report_month=month,
                period_start=period_start,
                period_end=period_end,
            )
            db.add(report)

        # Update metrics
        report.total_mrr = total_mrr
        report.total_gmv = total_gmv
        report.total_gmv_fees = total_gmv_fees
        report.total_subscription_fees = total_subscription_fees
        report.invoice_count = invoice_count
        report.paid_count = paid_count
        report.unpaid_count = unpaid_count
        report.overdue_count = overdue_count
        report.refund_count = refund_count
        report.total_refunded = total_refunded
        report.is_churned = is_churned
        report.churn_reason = churn_reason
        report.payment_success_rate = payment_success_rate
        report.total_outstanding = total_outstanding
        report.days_sales_outstanding = dso
        report.report_status = "generated"
        report.generated_at = datetime.utcnow()

        db.commit()
        db.refresh(report)

        logger.info(f"Generated billing report for vendor {vendor_id} - {month}")
        return report

    @staticmethod
    def get_report(
        db: Session,
        vendor_id: int,
        month: str,
    ) -> Optional[BillingReport]:
        """
        Get a specific billing report.

        Args:
            db: Database session
            vendor_id: Vendor ID
            month: Month in YYYY-MM format

        Returns:
            BillingReport or None
        """
        return db.query(BillingReport).filter_by(
            vendor_id=vendor_id,
            report_month=month,
        ).first()

    @staticmethod
    def get_reports_for_period(
        db: Session,
        vendor_id: int,
        start_month: str,  # YYYY-MM
        end_month: str,    # YYYY-MM
    ) -> List[BillingReport]:
        """
        Get billing reports for a date range.

        Args:
            db: Database session
            vendor_id: Vendor ID
            start_month: Start month in YYYY-MM format
            end_month: End month in YYYY-MM format

        Returns:
            List of BillingReport instances
        """
        return db.query(BillingReport).filter(
            BillingReport.vendor_id == vendor_id,
            BillingReport.report_month >= start_month,
            BillingReport.report_month <= end_month,
        ).order_by(BillingReport.report_month).all()

    @staticmethod
    def get_mrr_trend(
        db: Session,
        vendor_id: int,
        months: int = 12,
    ) -> List[Dict[str, Any]]:
        """
        Get MRR trend for last N months.

        Args:
            db: Database session
            vendor_id: Vendor ID
            months: Number of months to retrieve (default 12)

        Returns:
            List of dicts with month and mrr
        """
        # Calculate start month
        now = datetime.utcnow()
        start_month = now - timedelta(days=30 * months)

        reports = db.query(BillingReport).filter(
            BillingReport.vendor_id == vendor_id,
            BillingReport.period_start >= start_month,
        ).order_by(BillingReport.report_month).all()

        return [
            {
                "month": r.report_month,
                "mrr": float(r.total_mrr),
                "gmv": float(r.total_gmv),
                "invoice_count": r.invoice_count,
                "payment_success_rate": float(r.payment_success_rate),
            }
            for r in reports
        ]

    @staticmethod
    def get_churn_analysis(
        db: Session,
        vendor_id: int,
    ) -> Dict[str, Any]:
        """
        Get churn analysis for a vendor.

        Args:
            db: Database session
            vendor_id: Vendor ID

        Returns:
            Dict with churn metrics
        """
        # Get all reports for vendor
        reports = db.query(BillingReport).filter_by(
            vendor_id=vendor_id
        ).order_by(BillingReport.report_month.desc()).all()

        if not reports:
            return {
                "is_churned": False,
                "total_reports": 0,
                "churn_month": None,
                "churn_reason": None,
            }

        # Check if currently churned
        latest_report = reports[0]
        is_churned = latest_report.is_churned

        # Find churn month
        churn_month = None
        if is_churned:
            for i, report in enumerate(reports):
                if report.is_churned and (i == len(reports) - 1 or not reports[i + 1].is_churned):
                    churn_month = report.report_month
                    break

        # Calculate churn indicators
        total_reports = len(reports)
        recent_success_rate = (
            float(latest_report.payment_success_rate) if latest_report else 0
        )

        return {
            "is_churned": is_churned,
            "total_reports": total_reports,
            "churn_month": churn_month,
            "churn_reason": latest_report.churn_reason if latest_report else None,
            "recent_payment_success_rate": recent_success_rate,
            "latest_mrr": float(latest_report.total_mrr) if latest_report else 0,
        }

    @staticmethod
    def get_platform_metrics(
        db: Session,
    ) -> Dict[str, Any]:
        """
        Get platform-wide billing metrics.

        Args:
            db: Database session

        Returns:
            Dict with platform metrics
        """
        # Get latest reports for each vendor
        latest_reports = db.query(
            BillingReport.vendor_id,
            func.max(BillingReport.report_month).label("latest_month"),
        ).group_by(BillingReport.vendor_id).subquery()

        current_reports = db.query(BillingReport).join(
            latest_reports,
            (BillingReport.vendor_id == latest_reports.c.vendor_id)
            & (BillingReport.report_month == latest_reports.c.latest_month),
        ).all()

        total_mrr = sum(r.total_mrr for r in current_reports) if current_reports else Decimal("0.00")
        total_gmv = sum(r.total_gmv for r in current_reports) if current_reports else Decimal("0.00")
        total_vendors = len(current_reports)
        churned_vendors = len([r for r in current_reports if r.is_churned])
        avg_payment_success = (
            sum(r.payment_success_rate for r in current_reports) / len(current_reports)
            if current_reports
            else Decimal("0.00")
        )

        return {
            "total_mrr": float(total_mrr),
            "total_gmv": float(total_gmv),
            "total_vendors": total_vendors,
            "active_vendors": total_vendors - churned_vendors,
            "churned_vendors": churned_vendors,
            "churn_rate": float((churned_vendors / total_vendors * 100) if total_vendors > 0 else 0),
            "average_payment_success_rate": float(avg_payment_success),
        }

    @staticmethod
    def get_invoice_aging_report(
        db: Session,
        vendor_id: int,
    ) -> Dict[str, Any]:
        """
        Get invoice aging analysis for a vendor.

        Args:
            db: Database session
            vendor_id: Vendor ID

        Returns:
            Dict with aging buckets
        """
        vendor = db.query(Vendor).filter_by(vendor_id=vendor_id).first()
        if not vendor:
            raise ValueError(f"Vendor {vendor_id} not found")

        # Get subscriptions
        subscriptions = db.query(VendorSubscription).filter_by(
            vendor_id=vendor_id
        ).all()

        subscription_ids = [s.vendor_subscription_id for s in subscriptions]

        # Get unpaid invoices
        invoices = db.query(VendorInvoice).filter(
            VendorInvoice.vendor_subscription_id.in_(subscription_ids),
            VendorInvoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.PAST_DUE]),
        ).all()

        now = datetime.utcnow()

        # Bucket by days overdue
        aging_buckets = {
            "current": Decimal("0.00"),       # 0-30 days
            "30_60_days": Decimal("0.00"),    # 30-60 days
            "60_90_days": Decimal("0.00"),    # 60-90 days
            "90_plus_days": Decimal("0.00"),  # 90+ days
        }

        aging_counts = {
            "current": 0,
            "30_60_days": 0,
            "60_90_days": 0,
            "90_plus_days": 0,
        }

        for invoice in invoices:
            days_outstanding = (now - invoice.created_at).days

            if days_outstanding <= 30:
                aging_buckets["current"] += invoice.total_amount
                aging_counts["current"] += 1
            elif days_outstanding <= 60:
                aging_buckets["30_60_days"] += invoice.total_amount
                aging_counts["30_60_days"] += 1
            elif days_outstanding <= 90:
                aging_buckets["60_90_days"] += invoice.total_amount
                aging_counts["60_90_days"] += 1
            else:
                aging_buckets["90_plus_days"] += invoice.total_amount
                aging_counts["90_plus_days"] += 1

        total_outstanding = sum(aging_buckets.values())

        return {
            "total_outstanding": float(total_outstanding),
            "buckets": {
                k: {"amount": float(v), "count": aging_counts[k]}
                for k, v in aging_buckets.items()
            },
        }
