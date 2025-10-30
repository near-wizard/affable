"""Admin payout management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.core.database import get_db
from app.core.deps import require_vendor_role
from app.models import VendorUser, Payout
from app.services.payout_service import PayoutService
from app.services.payout_scheduling_service import PayoutSchedulingService
from app.models.payout_schedule import PayoutFrequency
from app.core.exceptions import NotFoundException, BadRequestException
from sqlalchemy import and_, desc

router = APIRouter()


# Bulk Payout Processing Endpoints


@router.get("/pending-payouts", response_model=Dict[str, Any])
def get_pending_payouts(
    vendor_user: VendorUser = Depends(require_vendor_role(['owner', 'admin'])),
    status_filter: Optional[str] = Query(None),
    partner_id: Optional[int] = Query(None),
    min_amount: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get all pending payouts for bulk processing.

    Allows filtering by status, partner, and minimum amount.
    Useful for bulk payout operations.

    Requires owner or admin role.
    """
    from app.models import Campaign, ConversionEvent, PayoutEvent, CampaignVersion

    query = db.query(Payout).join(
        PayoutEvent, Payout.payout_id == PayoutEvent.payout_id
    ).join(
        ConversionEvent, PayoutEvent.conversion_event_id == ConversionEvent.conversion_event_id
    ).join(
        CampaignVersion, ConversionEvent.campaign_version_id == CampaignVersion.campaign_version_id
    ).join(
        Campaign, CampaignVersion.campaign_id == Campaign.campaign_id
    ).filter(
        Campaign.vendor_id == vendor_user.vendor_id,
        Payout.is_deleted == False,
    )

    # Default to pending status if not specified
    if status_filter:
        query = query.filter(Payout.status == status_filter)
    else:
        query = query.filter(Payout.status == 'pending')

    if partner_id:
        query = query.filter(Payout.partner_id == partner_id)

    if min_amount is not None:
        query = query.filter(Payout.amount >= min_amount)

    # Get total count
    total = query.distinct(Payout.payout_id).count()

    # Get paginated results
    payouts = query.order_by(
        desc(Payout.created_at)
    ).offset((page - 1) * limit).limit(limit).distinct(Payout.payout_id).all()

    payout_data = [
        {
            "payout_id": p.payout_id,
            "partner_id": p.partner_id,
            "partner_name": p.partner.name if p.partner else f"Partner {p.partner_id}",
            "amount": float(p.amount),
            "currency": p.currency,
            "status": p.status,
            "start_date": p.start_date.isoformat(),
            "end_date": p.end_date.isoformat(),
            "created_at": p.created_at.isoformat(),
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


@router.post("/process-all", response_model=Dict[str, Any])
def process_all_pending_payouts(
    vendor_user: VendorUser = Depends(require_vendor_role(['owner'])),
    status_filter: Optional[str] = Query("pending"),
    min_amount: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Process ALL pending payouts for a vendor in one operation.

    This is a powerful endpoint that processes all pending (or filtered) payouts.
    Uses intelligent routing to appropriate payment providers.

    Requires owner role (safety measure).

    Query parameters:
    - status_filter: Filter by status (default: pending)
    - min_amount: Only process payouts >= this amount
    """
    from app.models import Campaign, ConversionEvent, PayoutEvent, CampaignVersion

    query = db.query(Payout).join(
        PayoutEvent, Payout.payout_id == PayoutEvent.payout_id
    ).join(
        ConversionEvent, PayoutEvent.conversion_event_id == ConversionEvent.conversion_event_id
    ).join(
        CampaignVersion, ConversionEvent.campaign_version_id == CampaignVersion.campaign_version_id
    ).join(
        Campaign, CampaignVersion.campaign_id == Campaign.campaign_id
    ).filter(
        Campaign.vendor_id == vendor_user.vendor_id,
        Payout.is_deleted == False,
        Payout.status == (status_filter or 'pending')
    )

    if min_amount is not None:
        query = query.filter(Payout.amount >= min_amount)

    payout_ids = [p.payout_id for p in query.distinct(Payout.payout_id).all()]

    if not payout_ids:
        return {
            "success": False,
            "message": "No pending payouts to process",
            "total": 0,
            "successful": 0,
            "failed": 0,
        }

    if len(payout_ids) > 1000:
        raise HTTPException(
            status_code=400,
            detail="Too many payouts to process at once (max 1000). Use batch processing."
        )

    result = PayoutService.process_multiple_payouts(db, payout_ids)

    return {
        "success": result["successful"] > 0,
        "message": f"Processed {result['successful']} payouts, {result['failed']} failed",
        **result
    }


@router.post("/process-selected", response_model=Dict[str, Any])
def process_selected_payouts(
    payout_ids: List[int],
    vendor_user: VendorUser = Depends(require_vendor_role(['owner', 'admin'])),
    db: Session = Depends(get_db)
):
    """
    Process selected payouts by ID.

    Allows processing a specific subset of payouts.

    Requires owner or admin role.
    """
    if not payout_ids:
        raise HTTPException(status_code=400, detail="No payouts selected")

    if len(payout_ids) > 500:
        raise HTTPException(status_code=400, detail="Maximum 500 payouts per request")

    # Verify all payouts belong to this vendor
    from app.models import Campaign, ConversionEvent, PayoutEvent, CampaignVersion

    invalid_payouts = db.query(Payout).filter(
        Payout.payout_id.in_(payout_ids),
        ~Payout.payout_id.in_(
            db.query(Payout.payout_id).join(
                PayoutEvent, Payout.payout_id == PayoutEvent.payout_id
            ).join(
                ConversionEvent, PayoutEvent.conversion_event_id == ConversionEvent.conversion_event_id
            ).join(
                CampaignVersion, ConversionEvent.campaign_version_id == CampaignVersion.campaign_version_id
            ).join(
                Campaign, CampaignVersion.campaign_id == Campaign.campaign_id
            ).filter(
                Campaign.vendor_id == vendor_user.vendor_id
            )
        )
    ).all()

    if invalid_payouts:
        raise HTTPException(status_code=403, detail="Some payouts do not belong to your vendor")

    result = PayoutService.process_multiple_payouts(db, payout_ids)

    return {
        "success": result["successful"] > 0,
        "message": f"Processed {result['successful']} payouts, {result['failed']} failed",
        **result
    }


# Payout Scheduling Endpoints


@router.get("/schedules", response_model=Dict[str, Any])
def list_payout_schedules(
    vendor_user: VendorUser = Depends(require_vendor_role(['owner', 'admin'])),
    db: Session = Depends(get_db)
):
    """
    Get all payout schedules for a vendor.

    Includes execution history and next scheduled date.

    Requires owner or admin role.
    """
    from app.models.payout_schedule import PayoutSchedule

    schedules = PayoutSchedulingService.get_vendor_schedules(db, vendor_user.vendor_id)

    schedule_data = [
        {
            "schedule_id": s.payout_schedule_id,
            "frequency": s.frequency.value,
            "day_of_period": s.day_of_period,
            "is_active": s.is_active,
            "min_amount": s.min_amount,
            "partner_id": s.partner_id,
            "partner_name": s.partner.name if s.partner else "All partners",
            "last_processed_at": s.last_processed_at.isoformat() if s.last_processed_at else None,
            "next_scheduled_at": s.next_scheduled_at.isoformat() if s.next_scheduled_at else None,
            "notes": s.notes,
        }
        for s in schedules
    ]

    return {
        "schedules": schedule_data,
        "total": len(schedules),
    }


@router.post("/schedules", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_payout_schedule(
    frequency: PayoutFrequency,
    day_of_period: int = 15,
    partner_id: Optional[int] = None,
    min_amount: int = 0,
    notes: Optional[str] = None,
    vendor_user: VendorUser = Depends(require_vendor_role(['owner'])),
    db: Session = Depends(get_db)
):
    """
    Create a new payout schedule.

    Schedules automatic payout generation for recurring payouts.

    Frequency options:
    - weekly: Every week on day_of_period (0=Monday, 6=Sunday)
    - biweekly: Every 2 weeks
    - monthly: Same day each month (default: 15th)
    - quarterly: Every 3 months
    - manually: Manual processing required

    Requires owner role.
    """
    try:
        schedule = PayoutSchedulingService.create_schedule(
            db,
            vendor_id=vendor_user.vendor_id,
            frequency=frequency,
            day_of_period=day_of_period,
            partner_id=partner_id,
            min_amount=min_amount,
            notes=notes,
        )

        return {
            "success": True,
            "schedule_id": schedule.payout_schedule_id,
            "frequency": schedule.frequency.value,
            "next_scheduled_at": schedule.next_scheduled_at.isoformat(),
            "message": f"Schedule created: {frequency.value} payouts starting {schedule.next_scheduled_at.date()}",
        }

    except (NotFoundException, BadRequestException) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/schedules/{schedule_id}", response_model=Dict[str, Any])
def update_payout_schedule(
    schedule_id: int,
    frequency: Optional[PayoutFrequency] = None,
    day_of_period: Optional[int] = None,
    min_amount: Optional[int] = None,
    is_active: Optional[bool] = None,
    notes: Optional[str] = None,
    vendor_user: VendorUser = Depends(require_vendor_role(['owner'])),
    db: Session = Depends(get_db)
):
    """
    Update a payout schedule.

    Requires owner role.
    """
    try:
        schedule = PayoutSchedulingService.update_schedule(
            db,
            schedule_id,
            frequency=frequency,
            day_of_period=day_of_period,
            min_amount=min_amount,
            is_active=is_active,
            notes=notes,
        )

        return {
            "success": True,
            "schedule_id": schedule.payout_schedule_id,
            "frequency": schedule.frequency.value,
            "next_scheduled_at": schedule.next_scheduled_at.isoformat(),
        }

    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/schedules/{schedule_id}", response_model=Dict[str, Any])
def delete_payout_schedule(
    schedule_id: int,
    vendor_user: VendorUser = Depends(require_vendor_role(['owner'])),
    db: Session = Depends(get_db)
):
    """
    Delete a payout schedule.

    Requires owner role.
    """
    try:
        PayoutSchedulingService.delete_schedule(db, schedule_id)

        return {
            "success": True,
            "message": "Schedule deleted",
        }

    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/schedules/{schedule_id}/executions", response_model=Dict[str, Any])
def get_schedule_executions(
    schedule_id: int,
    vendor_user: VendorUser = Depends(require_vendor_role(['owner', 'admin'])),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get execution history for a payout schedule.

    Shows past executions and their results.

    Requires owner or admin role.
    """
    executions = PayoutSchedulingService.get_schedule_executions(db, schedule_id, limit)

    execution_data = [
        {
            "execution_id": e.execution_id,
            "status": e.status,
            "scheduled_at": e.scheduled_at.isoformat(),
            "executed_at": e.executed_at.isoformat() if e.executed_at else None,
            "completed_at": e.completed_at.isoformat() if e.completed_at else None,
            "payouts_created": e.total_payouts,
            "total_amount": e.total_amount,
            "payout_ids": e.payout_ids.split(",") if e.payout_ids else [],
            "error": e.error_message,
            "skip_reason": e.skip_reason,
        }
        for e in executions
    ]

    return {
        "executions": execution_data,
        "total": len(execution_data),
    }
