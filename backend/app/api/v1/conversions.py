"""
Conversions API Endpoints

Handles conversion management and approval.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_partner, get_current_vendor_user, require_vendor_role
from app.schemas.commission import (
    ConversionEventResponse,
    ConversionApproveRequest,
    ConversionSummary
)
from app.models import ConversionEvent, Partner, VendorUser, Campaign

router = APIRouter()


@router.get("", response_model=List[ConversionEventResponse])
def list_conversions(
    status_filter: Optional[str] = Query(None, alias="status"),
    campaign_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List conversions.
    
    Partners see their own conversions.
    Vendors see conversions for their campaigns.
    """
    query = db.query(ConversionEvent).filter(ConversionEvent.is_deleted == False)
    
    if isinstance(current_user, Partner):
        query = query.filter(ConversionEvent.partner_id == current_user.partner_id)
    elif isinstance(current_user, VendorUser):
        query = query.join(Campaign).filter(Campaign.vendor_id == current_user.vendor_id)
    
    if status_filter:
        query = query.filter(ConversionEvent.status == status_filter)
    
    if campaign_id:
        query = query.join(Campaign).filter(Campaign.campaign_id == campaign_id)
    
    conversions = query.order_by(ConversionEvent.occurred_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    return [
        ConversionEventResponse(
            conversion_event_id=ce.conversion_event_id,
            conversion_event_type_id=ce.conversion_event_type_id,
            conversion_event_type_name=ce.conversion_event_type.name if ce.conversion_event_type else "unknown",
            click_id=ce.click_id,
            cookie_id=ce.cookie_id,
            partner_id=ce.partner_id,
            partner_name=ce.partner.name,
            campaign_version_id=ce.campaign_version_id,
            campaign_name=ce.campaign_version.name if ce.campaign_version else "unknown",
            attribution_type=ce.attribution_type,
            attribution_confidence=ce.attribution_confidence,
            transaction_id=ce.transaction_id,
            customer_email=ce.customer_email,
            customer_id=ce.customer_id,
            event_value=ce.event_value,
            commission_amount=ce.commission_amount,
            commission_type=ce.commission_type,
            commission_value=ce.commission_value,
            status=ce.status,
            occurred_at=ce.occurred_at,
            recorded_at=ce.recorded_at,
            approved_at=ce.approved_at,
            rejected_at=ce.rejected_at,
            rejection_reason=ce.rejection_reason,
            metadata=ce.metadata
        )
        for ce in conversions
    ]


@router.get("/{conversion_id}", response_model=ConversionEventResponse)
def get_conversion(
    conversion_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get conversion details.
    """
    conversion = db.query(ConversionEvent).filter(
        ConversionEvent.conversion_event_id == conversion_id,
        ConversionEvent.is_deleted == False
    ).first()
    
    if not conversion:
        raise HTTPException(status_code=404, detail="Conversion not found")
    
    # Check access
    if isinstance(current_user, Partner):
        if conversion.partner_id != current_user.partner_id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif isinstance(current_user, VendorUser):
        if conversion.campaign_version.campaign.vendor_id != current_user.vendor_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return ConversionEventResponse(
        conversion_event_id=conversion.conversion_event_id,
        conversion_event_type_id=conversion.conversion_event_type_id,
        conversion_event_type_name=conversion.conversion_event_type.name if conversion.conversion_event_type else "unknown",
        click_id=conversion.click_id,
        cookie_id=conversion.cookie_id,
        partner_id=conversion.partner_id,
        partner_name=conversion.partner.name,
        campaign_version_id=conversion.campaign_version_id,
        campaign_name=conversion.campaign_version.name if conversion.campaign_version else "unknown",
        attribution_type=conversion.attribution_type,
        attribution_confidence=conversion.attribution_confidence,
        transaction_id=conversion.transaction_id,
        customer_email=conversion.customer_email,
        customer_id=conversion.customer_id,
        event_value=conversion.event_value,
        commission_amount=conversion.commission_amount,
        commission_type=conversion.commission_type,
        commission_value=conversion.commission_value,
        status=conversion.status,
        occurred_at=conversion.occurred_at,
        recorded_at=conversion.recorded_at,
        approved_at=conversion.approved_at,
        rejected_at=conversion.rejected_at,
        rejection_reason=conversion.rejection_reason,
        metadata=conversion.metadata
    )


@router.post("/{conversion_id}/approve", response_model=ConversionEventResponse)
def approve_conversion(
    conversion_id: int,
    data: ConversionApproveRequest,
    vendor_user: VendorUser = Depends(require_vendor_role(['owner', 'admin', 'manager'])),
    db: Session = Depends(get_db)
):
    """
    Approve or reject a conversion.
    
    Requires owner, admin, or manager role.
    """
    conversion = db.query(ConversionEvent).filter(
        ConversionEvent.conversion_event_id == conversion_id,
        ConversionEvent.is_deleted == False
    ).first()
    
    if not conversion:
        raise HTTPException(status_code=404, detail="Conversion not found")
    
    # Check access
    if conversion.campaign_version.campaign.vendor_id != vendor_user.vendor_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if conversion.status not in ['pending']:
        raise HTTPException(status_code=400, detail=f"Cannot approve conversion with status: {conversion.status}")
    
    if data.approved:
        conversion.approve()
    else:
        conversion.reject(data.rejection_reason or "Conversion rejected")
    
    db.commit()
    db.refresh(conversion)
    
    return ConversionEventResponse(
        conversion_event_id=conversion.conversion_event_id,
        conversion_event_type_id=conversion.conversion_event_type_id,
        conversion_event_type_name=conversion.conversion_event_type.name,
        click_id=conversion.click_id,
        cookie_id=conversion.cookie_id,
        partner_id=conversion.partner_id,
        partner_name=conversion.partner.name,
        campaign_version_id=conversion.campaign_version_id,
        campaign_name=conversion.campaign_version.name,
        attribution_type=conversion.attribution_type,
        attribution_confidence=conversion.attribution_confidence,
        transaction_id=conversion.transaction_id,
        customer_email=conversion.customer_email,
        customer_id=conversion.customer_id,
        event_value=conversion.event_value,
        commission_amount=conversion.commission_amount,
        commission_type=conversion.commission_type,
        commission_value=conversion.commission_value,
        status=conversion.status,
        occurred_at=conversion.occurred_at,
        recorded_at=conversion.recorded_at,
        approved_at=conversion.approved_at,
        rejected_at=conversion.rejected_at,
        rejection_reason=conversion.rejection_reason,
        metadata=conversion.metadata
    )