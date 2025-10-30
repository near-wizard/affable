"""Billing and payment API endpoints."""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
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
