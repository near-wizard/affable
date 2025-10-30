"""Billing and payment API endpoints."""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from decimal import Decimal

from app.core.database import get_db
from app.models.billing import (
    SubscriptionPlan,
    VendorSubscription,
    VendorInvoice,
)
from app.services.billing_service import (
    SubscriptionService,
    InvoiceService,
)
from app.services.stripe_integration_service import (
    StripeIntegrationService,
    StripeWebhookService,
)
from app.services.adjustment_service import AdjustmentService
from app.services.refund_service import RefundService
from app.services.invoice_pdf_service import InvoicePDFService


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])


# =====================================================
# DEPENDENCY INJECTION
# =====================================================

def get_stripe_service() -> StripeIntegrationService:
    """Get Stripe integration service."""
    from app.core.config import settings

    stripe_config = {
        "api_key": settings.stripe_api_key,
        "webhook_secret": settings.stripe_webhook_secret,
    }
    return StripeIntegrationService(stripe_config)


def get_stripe_webhook_service(
    stripe_integration: StripeIntegrationService = Depends(get_stripe_service),
) -> StripeWebhookService:
    """Get Stripe webhook service."""
    return StripeWebhookService(stripe_integration)


# =====================================================
# SUBSCRIPTION ENDPOINTS
# =====================================================

@router.get("/plans")
def list_subscription_plans(db: Session = Depends(get_db)):
    """List all available subscription plans."""
    plans = db.query(SubscriptionPlan).filter_by(is_active=True).all()

    return {
        "plans": [
            {
                "id": plan.subscription_plan_id,
                "name": plan.plan_name.value,
                "display_name": plan.display_name,
                "description": plan.description,
                "base_price": str(plan.base_price),
                "gmv_percentage": str(plan.gmv_percentage),
                "billing_cycle": plan.billing_cycle.value,
            }
            for plan in plans
        ]
    }


@router.post("/subscriptions")
def create_subscription(
    vendor_id: int,
    plan_id: int,
    currency: str = "USD",
    db: Session = Depends(get_db),
):
    """Create a new vendor subscription."""
    try:
        subscription = SubscriptionService.create_subscription(
            db,
            vendor_id,
            plan_id,
            currency=currency,
        )

        return {
            "subscription_id": subscription.vendor_subscription_id,
            "vendor_id": subscription.vendor_id,
            "plan_id": subscription.subscription_plan_id,
            "status": subscription.status.value,
            "currency": subscription.currency,
            "start_date": subscription.start_date.isoformat(),
            "next_billing_date": subscription.next_billing_date.isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/subscriptions/{vendor_id}")
def get_vendor_subscription(
    vendor_id: int,
    db: Session = Depends(get_db),
):
    """Get vendor's active subscription."""
    subscription = SubscriptionService.get_active_subscription(db, vendor_id)

    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")

    return {
        "subscription_id": subscription.vendor_subscription_id,
        "vendor_id": subscription.vendor_id,
        "plan_id": subscription.subscription_plan_id,
        "status": subscription.status.value,
        "currency": subscription.currency,
        "start_date": subscription.start_date.isoformat(),
        "next_billing_date": subscription.next_billing_date.isoformat(),
        "stripe_customer_id": subscription.stripe_customer_id,
    }


# =====================================================
# INVOICE ENDPOINTS
# =====================================================

@router.get("/invoices/{vendor_id}")
def list_vendor_invoices(
    vendor_id: int,
    db: Session = Depends(get_db),
):
    """List all invoices for a vendor."""
    invoices = db.query(VendorInvoice).join(
        VendorSubscription
    ).filter(
        VendorSubscription.vendor_id == vendor_id,
    ).order_by(
        VendorInvoice.created_at.desc()
    ).all()

    return {
        "invoices": [
            {
                "invoice_id": inv.vendor_invoice_id,
                "invoice_number": inv.invoice_number,
                "status": inv.status.value,
                "subtotal": str(inv.subtotal),
                "tax": str(inv.tax_amount),
                "total": str(inv.total_amount),
                "billing_start": inv.billing_start_date.isoformat(),
                "billing_end": inv.billing_end_date.isoformat(),
                "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
                "created_at": inv.created_at.isoformat(),
            }
            for inv in invoices
        ]
    }


@router.get("/invoices/detail/{invoice_id}")
def get_invoice_detail(
    invoice_id: int,
    db: Session = Depends(get_db),
):
    """Get detailed invoice information."""
    invoice = InvoiceService.get_invoice(db, invoice_id)

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return {
        "invoice_id": invoice.vendor_invoice_id,
        "invoice_number": invoice.invoice_number,
        "status": invoice.status.value,
        "subtotal": str(invoice.subtotal),
        "tax": str(invoice.tax_amount),
        "adjustments": str(invoice.adjustment_amount),
        "total": str(invoice.total_amount),
        "billing_period": {
            "start": invoice.billing_start_date.isoformat(),
            "end": invoice.billing_end_date.isoformat(),
        },
        "line_items": [
            {
                "description": item.description,
                "type": item.item_type,
                "amount": str(item.amount),
            }
            for item in invoice.items
        ],
        "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
        "created_at": invoice.created_at.isoformat(),
    }


# =====================================================
# PAYMENT ENDPOINTS
# =====================================================

@router.post("/payments/stripe/customer")
def create_stripe_customer(
    vendor_id: int,
    email: str,
    name: str,
    currency: str = "USD",
    db: Session = Depends(get_db),
    stripe_service: StripeIntegrationService = Depends(get_stripe_service),
):
    """Create a Stripe customer for a vendor."""
    try:
        customer_id = stripe_service.create_stripe_customer(
            db,
            vendor_id,
            email,
            name,
            currency,
        )

        return {
            "status": "created",
            "stripe_customer_id": customer_id,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/payments/invoices/{invoice_id}")
def create_payment_for_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    stripe_service: StripeIntegrationService = Depends(get_stripe_service),
):
    """Create a Stripe payment for an invoice."""
    try:
        transaction = stripe_service.create_payment_for_invoice(db, invoice_id)

        return {
            "status": "pending",
            "transaction_id": transaction.payment_transaction_id,
            "payment_intent_id": transaction.stripe_payment_intent_id,
            "amount": str(transaction.amount),
            "currency": transaction.currency,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/payments/{transaction_id}/confirm")
def confirm_payment(
    transaction_id: int,
    db: Session = Depends(get_db),
    stripe_service: StripeIntegrationService = Depends(get_stripe_service),
):
    """Confirm a Stripe payment."""
    try:
        transaction = stripe_service.confirm_payment(db, transaction_id)

        return {
            "status": transaction.status,
            "transaction_id": transaction.payment_transaction_id,
            "payment_intent_id": transaction.stripe_payment_intent_id,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =====================================================
# WEBHOOK ENDPOINTS
# =====================================================

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
    webhook_service: StripeWebhookService = Depends(get_stripe_webhook_service),
):
    """Handle Stripe webhook events."""
    try:
        # Get raw body and signature
        payload = await request.body()
        signature = request.headers.get("stripe-signature", "")

        # Process webhook
        result = webhook_service.process_webhook(db, payload, signature)

        logger.info(f"Processed Stripe webhook: {result['event_type']}")

        return result

    except ValueError as e:
        logger.warning(f"Invalid webhook: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

# =====================================================
# ADMIN PANEL: INVOICE ADJUSTMENTS
# =====================================================

@router.post("/admin/invoices/{invoice_id}/adjustments")
def create_invoice_adjustment(
    invoice_id: int,
    adjustment_type: str,
    amount: str,
    reason: str,
    description: str = None,
    admin_user_id: int = None,
    db: Session = Depends(get_db),
):
    """Create a manual invoice adjustment (admin only)."""
    try:
        adjustment = AdjustmentService.apply_adjustment(
            db,
            invoice_id,
            adjustment_type,
            Decimal(amount),
            reason,
            admin_user_id=admin_user_id,
            description=description,
        )

        return {
            "status": "created",
            "adjustment_id": adjustment.invoice_adjustment_id,
            "invoice_id": invoice_id,
            "type": adjustment.adjustment_type,
            "amount": str(adjustment.amount),
            "reason": adjustment.adjustment_reason,
            "created_at": adjustment.created_at.isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/invoices/{invoice_id}/adjustments")
def list_invoice_adjustments(
    invoice_id: int,
    db: Session = Depends(get_db),
):
    """Get all adjustments for an invoice."""
    try:
        adjustments = AdjustmentService.get_adjustments(db, invoice_id)

        return {
            "invoice_id": invoice_id,
            "adjustments": [
                {
                    "adjustment_id": adj.invoice_adjustment_id,
                    "type": adj.adjustment_type,
                    "amount": str(adj.amount),
                    "reason": adj.adjustment_reason,
                    "created_at": adj.created_at.isoformat(),
                }
                for adj in adjustments
            ],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/admin/invoices/{invoice_id}/adjustments/{adjustment_id}")
def reverse_invoice_adjustment(
    invoice_id: int,
    adjustment_id: int,
    reason: str = "User reversal",
    db: Session = Depends(get_db),
):
    """Reverse an invoice adjustment by creating an opposite entry."""
    try:
        reversal = AdjustmentService.reverse_adjustment(
            db,
            adjustment_id,
            reason=reason,
        )

        return {
            "status": "reversed",
            "original_adjustment_id": adjustment_id,
            "reversal_adjustment_id": reversal.invoice_adjustment_id,
            "reversal_amount": str(reversal.amount),
            "created_at": reversal.created_at.isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/invoices/{invoice_id}/adjustments/summary")
def get_adjustment_summary(
    invoice_id: int,
    db: Session = Depends(get_db),
):
    """Get adjustment summary for an invoice."""
    try:
        summary = AdjustmentService.get_adjustment_summary(db, invoice_id)

        return {
            "invoice_id": invoice_id,
            "total_adjustments": summary["total_adjustments"],
            "totals": {
                "credits": str(summary["total_credits"]),
                "debits": str(summary["total_debits"]),
                "discounts": str(summary["total_discounts"]),
                "fee_waivers": str(summary["total_fee_waivers"]),
                "overpayments": str(summary["total_overpayment"]),
                "net_adjustment": str(summary["net_adjustment"]),
            },
            "by_type": summary["by_type"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/invoices/{invoice_id}/adjustments/audit")
def get_adjustment_audit_trail(
    invoice_id: int,
    db: Session = Depends(get_db),
):
    """Get full audit trail for invoice adjustments with validation."""
    try:
        audit_trail = AdjustmentService.validate_adjustment_history(db, invoice_id)
        return audit_trail
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =====================================================
# ADMIN PANEL: REFUNDS
# =====================================================

@router.post("/admin/refunds/requests")
def create_refund_request(
    payment_transaction_id: int,
    amount: str = None,
    reason: str = "Customer request",
    description: str = None,
    db: Session = Depends(get_db),
):
    """Create a refund request for a payment."""
    try:
        refund_amount = Decimal(amount) if amount else None
        request = RefundService.create_refund_request(
            db,
            payment_transaction_id,
            amount=refund_amount,
            reason=reason,
            description=description,
        )

        return {
            "status": "requested",
            "payment_transaction_id": request["payment_transaction_id"],
            "invoice_id": request["invoice_id"],
            "amount": str(request["amount"]),
            "is_partial": request["is_partial"],
            "reason": request["reason"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/refunds/{payment_transaction_id}/process")
def process_refund(
    payment_transaction_id: int,
    amount: str = None,
    reason: str = "Customer request",
    db: Session = Depends(get_db),
    stripe_service: StripeIntegrationService = Depends(get_stripe_service),
):
    """Process a refund through Stripe and update records."""
    try:
        refund_amount = Decimal(amount) if amount else None
        result = RefundService.process_refund(
            db,
            payment_transaction_id,
            amount=refund_amount,
            reason=reason,
            stripe_service=stripe_service,
        )

        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/refunds/{invoice_id}/history")
def get_refund_history(
    invoice_id: int,
    db: Session = Depends(get_db),
):
    """Get refund history for an invoice."""
    refunds = RefundService.get_refund_history(db, invoice_id)

    return {
        "invoice_id": invoice_id,
        "refunds": refunds,
    }


@router.post("/admin/refunds/{invoice_id}/impact")
def calculate_refund_impact(
    invoice_id: int,
    refund_amount: str,
    db: Session = Depends(get_db),
):
    """Calculate impact of a proposed refund."""
    try:
        impact = RefundService.calculate_refund_impact(
            db,
            invoice_id,
            Decimal(refund_amount),
        )

        return {
            "invoice_id": invoice_id,
            "current_total": impact["current_total"],
            "proposed_refund": impact["proposed_refund"],
            "new_total": impact["new_total"],
            "is_full_refund": impact["is_full_refund"],
            "is_valid": impact["is_valid"],
            "breakdown": impact["breakdown"],
            "refund_breakdown": impact["refund_breakdown"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/credits/memo")
def create_credit_memo(
    vendor_id: int,
    amount: str,
    reason: str,
    apply_to_invoice_id: int = None,
    db: Session = Depends(get_db),
):
    """Create a credit memo for a vendor."""
    try:
        credit = RefundService.create_credit_memo(
            db,
            vendor_id,
            Decimal(amount),
            reason,
            apply_to_invoice_id=apply_to_invoice_id,
        )
        return {
            "credit_id": credit.credit_memo_id,
            "amount": float(credit.amount),
            "reason": credit.reason,
            "created_at": credit.created_at.isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =====================================================
# INVOICE PDF DOWNLOAD
# =====================================================

@router.get("/invoices/{invoice_id}/download")
def download_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
):
    """Download invoice as PDF."""
    try:
        pdf_bytes = InvoicePDFService.generate_invoice_pdf(db, invoice_id)

        return StreamingResponse(
            iter([pdf_bytes]),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=invoice-{invoice_id}.pdf"}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating invoice PDF: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate invoice")
