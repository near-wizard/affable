"""Service for managing manual invoice adjustments."""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.billing import (
    VendorInvoice,
    InvoiceAdjustment,
    InvoiceStatus,
)
from app.models import Vendor

logger = logging.getLogger(__name__)


class AdjustmentService:
    """Manage manual invoice adjustments for admin operations."""

    @staticmethod
    def apply_adjustment(
        db: Session,
        invoice_id: int,
        adjustment_type: str,
        amount: Decimal,
        reason: str,
        admin_user_id: Optional[int] = None,
        description: Optional[str] = None,
    ) -> InvoiceAdjustment:
        """
        Apply a manual adjustment to an invoice.

        Args:
            db: Database session
            invoice_id: Invoice ID
            adjustment_type: "credit", "debit", "discount", "fee_waiver"
            amount: Adjustment amount (positive)
            reason: Reason for adjustment
            admin_user_id: Admin user who created adjustment
            description: Detailed description

        Returns:
            InvoiceAdjustment record

        Raises:
            ValueError: If invoice not found or invalid adjustment
        """
        invoice = db.query(VendorInvoice).filter_by(
            vendor_invoice_id=invoice_id
        ).first()

        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        # Validate adjustment type
        valid_types = ["credit", "debit", "discount", "fee_waiver", "overpayment"]
        if adjustment_type not in valid_types:
            raise ValueError(
                f"Invalid adjustment type. Must be one of: {', '.join(valid_types)}"
            )

        # Validate amount
        if amount <= Decimal("0.00"):
            raise ValueError("Adjustment amount must be greater than zero")

        # Don't allow adjustments to fully paid invoices
        if invoice.status == InvoiceStatus.PAID:
            logger.warning(f"Adjustment applied to paid invoice {invoice_id}")

        # Create adjustment record
        adjustment = InvoiceAdjustment(
            vendor_invoice_id=invoice_id,
            adjustment_type=adjustment_type,
            amount=amount,
            adjustment_reason=reason,
            description=description or reason,
            adjusted_by_id=admin_user_id,
        )

        db.add(adjustment)
        db.flush()

        # Update invoice total
        AdjustmentService._recalculate_invoice_total(db, invoice)
        db.commit()
        db.refresh(adjustment)

        logger.info(
            f"Applied {adjustment_type} adjustment of ${amount} to invoice {invoice_id} - {reason}"
        )
        return adjustment

    @staticmethod
    def _recalculate_invoice_total(db: Session, invoice: VendorInvoice) -> None:
        """
        Recalculate invoice total based on adjustments.

        Args:
            db: Database session
            invoice: VendorInvoice to recalculate
        """
        # Get all adjustments
        adjustments = db.query(InvoiceAdjustment).filter_by(
            vendor_invoice_id=invoice.vendor_invoice_id
        ).all()

        # Calculate adjustment total
        adjustment_total = Decimal("0.00")
        for adj in adjustments:
            if adj.adjustment_type in ["credit", "discount", "fee_waiver"]:
                adjustment_total -= adj.amount  # Subtract
            elif adj.adjustment_type in ["debit", "overpayment"]:
                adjustment_total += adj.amount  # Add

        # Update invoice
        # Original total = subtotal + tax
        original_total = invoice.subtotal + invoice.tax_amount
        invoice.adjustment_amount = adjustment_total
        invoice.total_amount = original_total + adjustment_total

        # Ensure total doesn't go below zero
        if invoice.total_amount < Decimal("0.00"):
            logger.warning(
                f"Adjustments reduced invoice {invoice.vendor_invoice_id} total below zero. "
                f"Setting to $0.00"
            )
            invoice.total_amount = Decimal("0.00")

    @staticmethod
    def reverse_adjustment(
        db: Session,
        adjustment_id: int,
        reason: str = "Reversal",
    ) -> InvoiceAdjustment:
        """
        Reverse an adjustment by creating an opposite adjustment.

        Args:
            db: Database session
            adjustment_id: Adjustment to reverse
            reason: Reason for reversal

        Returns:
            Reversal adjustment record

        Raises:
            ValueError: If adjustment not found
        """
        original = db.query(InvoiceAdjustment).filter_by(
            invoice_adjustment_id=adjustment_id
        ).first()

        if not original:
            raise ValueError(f"Adjustment {adjustment_id} not found")

        # Determine reversal type
        if original.adjustment_type in ["credit", "discount", "fee_waiver"]:
            reversal_type = "debit"  # Credit becomes debit
        else:
            reversal_type = "credit"  # Debit becomes credit

        # Create reversal adjustment
        reversal = AdjustmentService.apply_adjustment(
            db,
            original.vendor_invoice_id,
            reversal_type,
            original.amount,
            f"Reversal of: {reason}",
            description=f"Reversed adjustment #{adjustment_id}",
        )

        logger.info(f"Reversed adjustment {adjustment_id} with adjustment {reversal.invoice_adjustment_id}")
        return reversal

    @staticmethod
    def get_adjustments(
        db: Session,
        invoice_id: int,
    ) -> List[InvoiceAdjustment]:
        """
        Get all adjustments for an invoice.

        Args:
            db: Database session
            invoice_id: Invoice ID

        Returns:
            List of InvoiceAdjustment records
        """
        return db.query(InvoiceAdjustment).filter_by(
            vendor_invoice_id=invoice_id
        ).order_by(InvoiceAdjustment.created_at.desc()).all()

    @staticmethod
    def get_adjustment_summary(
        db: Session,
        invoice_id: int,
    ) -> Dict[str, Any]:
        """
        Get summary of adjustments for an invoice.

        Args:
            db: Database session
            invoice_id: Invoice ID

        Returns:
            Dict with adjustment summary
        """
        adjustments = AdjustmentService.get_adjustments(db, invoice_id)

        summary = {
            "total_adjustments": len(adjustments),
            "total_credits": Decimal("0.00"),
            "total_debits": Decimal("0.00"),
            "total_discounts": Decimal("0.00"),
            "total_fee_waivers": Decimal("0.00"),
            "total_overpayment": Decimal("0.00"),
            "net_adjustment": Decimal("0.00"),
            "by_type": {},
        }

        for adj in adjustments:
            summary["by_type"].setdefault(adj.adjustment_type, []).append(
                {
                    "adjustment_id": adj.invoice_adjustment_id,
                    "amount": float(adj.amount),
                    "reason": adj.adjustment_reason,
                    "created_at": adj.created_at.isoformat(),
                }
            )

            if adj.adjustment_type == "credit":
                summary["total_credits"] += adj.amount
            elif adj.adjustment_type == "debit":
                summary["total_debits"] += adj.amount
            elif adj.adjustment_type == "discount":
                summary["total_discounts"] += adj.amount
            elif adj.adjustment_type == "fee_waiver":
                summary["total_fee_waivers"] += adj.amount
            elif adj.adjustment_type == "overpayment":
                summary["total_overpayment"] += adj.amount

        # Calculate net (credits reduce total)
        summary["net_adjustment"] = (
            summary["total_debits"] + summary["total_overpayment"] -
            summary["total_credits"] - summary["total_discounts"] -
            summary["total_fee_waivers"]
        )

        return summary

    @staticmethod
    def get_vendor_adjustments(
        db: Session,
        vendor_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get all adjustments for a vendor's invoices.

        Args:
            db: Database session
            vendor_id: Vendor ID
            start_date: Optional filter start date
            end_date: Optional filter end date

        Returns:
            List of adjustment records with invoice info
        """
        from app.models.billing import VendorSubscription

        # Get vendor's subscriptions
        subscriptions = db.query(VendorSubscription).filter_by(
            vendor_id=vendor_id
        ).all()

        subscription_ids = [s.vendor_subscription_id for s in subscriptions]

        # Get invoices for subscriptions
        invoices = db.query(VendorInvoice).filter(
            VendorInvoice.vendor_subscription_id.in_(subscription_ids)
        ).all()

        invoice_ids = [i.vendor_invoice_id for i in invoices]

        # Get adjustments
        query = db.query(InvoiceAdjustment).filter(
            InvoiceAdjustment.vendor_invoice_id.in_(invoice_ids)
        )

        if start_date:
            query = query.filter(InvoiceAdjustment.created_at >= start_date)
        if end_date:
            query = query.filter(InvoiceAdjustment.created_at <= end_date)

        adjustments = query.order_by(InvoiceAdjustment.created_at.desc()).all()

        return [
            {
                "adjustment_id": adj.adjustment_id,
                "invoice_id": adj.vendor_invoice_id,
                "type": adj.adjustment_type,
                "amount": float(adj.amount),
                "reason": adj.reason,
                "created_by": adj.created_by,
                "created_at": adj.created_at.isoformat(),
            }
            for adj in adjustments
        ]

    @staticmethod
    def validate_adjustment_history(
        db: Session,
        invoice_id: int,
    ) -> Dict[str, Any]:
        """
        Validate and provide audit trail for adjustments.

        Args:
            db: Database session
            invoice_id: Invoice ID

        Returns:
            Audit trail with validation info
        """
        invoice = db.query(VendorInvoice).filter_by(
            vendor_invoice_id=invoice_id
        ).first()

        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        adjustments = AdjustmentService.get_adjustments(db, invoice_id)

        # Recalculate total from scratch
        original_total = invoice.subtotal + invoice.tax_amount
        calculated_adjustment = Decimal("0.00")

        for adj in adjustments:
            if adj.adjustment_type in ["credit", "discount", "fee_waiver"]:
                calculated_adjustment -= adj.amount
            else:
                calculated_adjustment += adj.amount

        calculated_total = original_total + calculated_adjustment

        return {
            "invoice_id": invoice_id,
            "original_subtotal": float(invoice.subtotal),
            "tax_amount": float(invoice.tax_amount),
            "original_total": float(original_total),
            "stored_adjustment_amount": float(invoice.adjustment_amount),
            "calculated_adjustment_amount": float(calculated_adjustment),
            "stored_total": float(invoice.total_amount),
            "calculated_total": float(calculated_total),
            "matches": calculated_total == invoice.total_amount,
            "adjustment_count": len(adjustments),
            "adjustments": [
                {
                    "id": adj.invoice_adjustment_id,
                    "type": adj.adjustment_type,
                    "amount": float(adj.amount),
                    "reason": adj.adjustment_reason,
                    "created_at": adj.created_at.isoformat(),
                }
                for adj in adjustments
            ],
        }
