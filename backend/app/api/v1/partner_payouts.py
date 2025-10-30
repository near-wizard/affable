"""Partner-facing payout endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.deps import get_current_partner
from app.models import Partner, Payout, PaymentProvider
from sqlalchemy import desc

router = APIRouter()


@router.get("/me/payouts", response_model=Dict[str, Any])
def get_partner_payouts(
    partner: Partner = Depends(get_current_partner),
    status_filter: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get partner's payout history.

    Shows all payouts sent to this partner with status and tracking information.

    Query parameters:
    - status_filter: Filter by status (pending, processing, completed, failed)
    - page: Page number (default 1)
    - limit: Results per page (default 20, max 100)
    """
    query = db.query(Payout).filter(
        Payout.partner_id == partner.partner_id,
        Payout.is_deleted == False,
    )

    if status_filter:
        query = query.filter(Payout.status == status_filter)

    total = query.count()

    payouts = query.order_by(
        desc(Payout.created_at)
    ).offset((page - 1) * limit).limit(limit).all()

    payout_data = [
        {
            "payout_id": p.payout_id,
            "amount": float(p.amount),
            "currency": p.currency,
            "status": p.status,
            "period_start": p.start_date.isoformat(),
            "period_end": p.end_date.isoformat(),
            "payment_method": p.payment_method.payment_provider.display_name if p.payment_method else "Unknown",
            "provider_transaction_id": p.provider_transaction_id,
            "created_at": p.created_at.isoformat(),
            "processed_at": p.processed_at.isoformat() if p.processed_at else None,
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
            "failed_at": p.failed_at.isoformat() if p.failed_at else None,
            "failure_reason": p.failure_reason,
        }
        for p in payouts
    ]

    return {
        "data": payout_data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


@router.get("/me/payouts/{payout_id}", response_model=Dict[str, Any])
def get_payout_details(
    payout_id: int,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific payout.

    Includes payment method, provider transaction ID, and status timeline.
    """
    payout = db.query(Payout).filter(
        Payout.payout_id == payout_id,
        Payout.partner_id == partner.partner_id,
        Payout.is_deleted == False,
    ).first()

    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")

    return {
        "payout_id": payout.payout_id,
        "amount": float(payout.amount),
        "currency": payout.currency,
        "status": payout.status,
        "period": {
            "start": payout.start_date.isoformat(),
            "end": payout.end_date.isoformat(),
        },
        "payment": {
            "provider": payout.payment_provider.display_name if payout.payment_provider else "Unknown",
            "method": payout.payment_method.account_details if payout.payment_method else None,
            "provider_transaction_id": payout.provider_transaction_id,
        },
        "timeline": {
            "created": payout.created_at.isoformat(),
            "processing_started": payout.processed_at.isoformat() if payout.processed_at else None,
            "completed": payout.completed_at.isoformat() if payout.completed_at else None,
            "failed": payout.failed_at.isoformat() if payout.failed_at else None,
        },
        "error": payout.failure_reason if payout.status == "failed" else None,
    }


@router.get("/me/payout-summary", response_model=Dict[str, Any])
def get_payout_summary(
    partner: Partner = Depends(get_current_partner),
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """
    Get payout summary for the partner.

    Shows summary statistics for payouts in the specified period.

    Query parameters:
    - days: Number of days to look back (default 90, max 365)
    """
    from sqlalchemy import func
    from decimal import Decimal

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    payouts = db.query(Payout).filter(
        Payout.partner_id == partner.partner_id,
        Payout.is_deleted == False,
        Payout.created_at >= cutoff_date,
    ).all()

    # Calculate statistics
    total_amount = sum(p.amount for p in payouts)
    completed = [p for p in payouts if p.status == "completed"]
    pending = [p for p in payouts if p.status == "pending"]
    processing = [p for p in payouts if p.status == "processing"]
    failed = [p for p in payouts if p.status == "failed"]

    completed_amount = sum(p.amount for p in completed)
    pending_amount = sum(p.amount for p in pending)
    processing_amount = sum(p.amount for p in processing)

    return {
        "summary_period": {
            "days": days,
            "start_date": cutoff_date.isoformat(),
            "end_date": datetime.utcnow().isoformat(),
        },
        "totals": {
            "all_payouts": len(payouts),
            "total_amount": float(total_amount),
        },
        "by_status": {
            "completed": {
                "count": len(completed),
                "amount": float(completed_amount),
                "percentage": (len(completed) / len(payouts) * 100) if payouts else 0,
            },
            "processing": {
                "count": len(processing),
                "amount": float(processing_amount),
                "percentage": (len(processing) / len(payouts) * 100) if payouts else 0,
            },
            "pending": {
                "count": len(pending),
                "amount": float(pending_amount),
                "percentage": (len(pending) / len(payouts) * 100) if payouts else 0,
            },
            "failed": {
                "count": len(failed),
                "amount": float(sum(p.amount for p in failed)),
                "percentage": (len(failed) / len(payouts) * 100) if payouts else 0,
            },
        },
        "insights": {
            "average_payout": float(total_amount / len(payouts)) if payouts else 0,
            "largest_payout": float(max([p.amount for p in payouts])) if payouts else 0,
            "days_since_last_payout": (
                (datetime.utcnow() - max([p.completed_at for p in completed])).days
                if completed
                else None
            ),
        },
    }


@router.get("/me/payment-methods", response_model=Dict[str, Any])
def get_payment_methods(
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Get partner's payment methods configured in the system.

    Shows which payment methods are available for receiving payouts.
    """
    from app.models import PartnerPaymentMethod

    methods = db.query(PartnerPaymentMethod).filter(
        PartnerPaymentMethod.partner_id == partner.partner_id,
        PartnerPaymentMethod.is_deleted == False,
    ).all()

    methods_data = [
        {
            "method_id": m.partner_payment_method_id,
            "provider": m.payment_provider.display_name if m.payment_provider else "Unknown",
            "account_identifier": m.provider_account_id,
            "is_default": m.is_default,
            "is_verified": m.is_verified,
            "verified_at": m.verified_at.isoformat() if m.verified_at else None,
            "added_at": m.created_at.isoformat(),
        }
        for m in methods
    ]

    return {
        "methods": methods_data,
        "total": len(methods),
        "default_method_id": next(
            (m.partner_payment_method_id for m in methods if m.is_default), None
        ),
    }


@router.get("/me/upcoming-payouts", response_model=Dict[str, Any])
def get_upcoming_payouts(
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Get information about upcoming payouts.

    Shows pending and processing payouts that haven't been completed yet.
    Useful for partners to track when they can expect money.
    """
    pending = db.query(Payout).filter(
        Payout.partner_id == partner.partner_id,
        Payout.status == "pending",
        Payout.is_deleted == False,
    ).order_by(Payout.created_at.asc()).all()

    processing = db.query(Payout).filter(
        Payout.partner_id == partner.partner_id,
        Payout.status == "processing",
        Payout.is_deleted == False,
    ).order_by(Payout.processed_at.asc()).all()

    return {
        "pending": {
            "count": len(pending),
            "total_amount": float(sum(p.amount for p in pending)),
            "payouts": [
                {
                    "payout_id": p.payout_id,
                    "amount": float(p.amount),
                    "period_end": p.end_date.isoformat(),
                    "created_at": p.created_at.isoformat(),
                }
                for p in pending[:10]  # Show latest 10
            ],
        },
        "processing": {
            "count": len(processing),
            "total_amount": float(sum(p.amount for p in processing)),
            "payouts": [
                {
                    "payout_id": p.payout_id,
                    "amount": float(p.amount),
                    "period_end": p.end_date.isoformat(),
                    "processing_started": p.processed_at.isoformat(),
                }
                for p in processing[:10]  # Show latest 10
            ],
        },
        "message": (
            f"You have {len(pending)} pending and {len(processing)} processing payouts "
            f"totaling {float(sum(p.amount for p in pending) + sum(p.amount for p in processing))} "
            f"in outstanding payouts."
        ) if (pending or processing) else "No pending or processing payouts.",
    }
