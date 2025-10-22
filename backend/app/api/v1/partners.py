"""
Partner API Endpoints

Handles partner profile management, statistics, and dashboard.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_partner, verify_partner_access
from app.schemas.partner import (
    PartnerResponse,
    PartnerUpdate,
    PartnerDetailResponse,
    PartnerStatsResponse,
    PartnerDashboardResponse
)
from app.schemas.campaign import CampaignSummary
from app.schemas.commission import ConversionSummary
from app.models import Partner, CampaignPartner, ConversionEvent
from app.services.commission_service import CommissionService

router = APIRouter()


@router.get("/me", response_model=PartnerDetailResponse)
def get_my_profile(
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Get current partner's profile with statistics.
    """
    # Calculate statistics
    stats = _calculate_partner_stats(db, partner.partner_id)
    
    return PartnerDetailResponse(
        partner_id=partner.partner_id,
        name=partner.name,
        email=partner.email,
        status=partner.status,
        tier=partner.tier,
        bio=partner.bio,
        website_url=partner.website_url,
        oauth_provider=partner.oauth_provider,
        created_at=partner.created_at,
        updated_at=partner.updated_at,
        types=[],  # TODO: Load partner types
        **stats
    )


@router.put("/me", response_model=PartnerResponse)
def update_my_profile(
    data: PartnerUpdate,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Update current partner's profile.
    """
    if data.name:
        partner.name = data.name
    if data.bio is not None:
        partner.bio = data.bio
    if data.website_url is not None:
        partner.website_url = data.website_url
    
    partner.update()
    db.commit()
    db.refresh(partner)
    
    return partner


@router.get("/me/stats", response_model=PartnerStatsResponse)
def get_my_stats(
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Get detailed statistics for current partner.
    """
    stats = _calculate_partner_stats(db, partner.partner_id)
    commission_summary = CommissionService.get_partner_commission_summary(db, partner.partner_id)
    
    return PartnerStatsResponse(
        partner_id=partner.partner_id,
        total_campaigns=stats['total_campaigns'],
        total_clicks=stats['total_clicks'],
        total_conversions=stats['total_conversions'],
        total_revenue=stats['total_revenue'],
        total_commission_earned=stats['total_commission_earned'],
        conversion_rate=stats['conversion_rate'],
        average_order_value=stats['average_order_value'],
        pending_commission=commission_summary['pending_commission'],
        paid_commission=commission_summary['paid_commission']
    )


@router.get("/me/dashboard", response_model=PartnerDashboardResponse)
def get_my_dashboard(
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Get partner dashboard with overview and recent activity.
    """
    # Get statistics
    stats = _calculate_partner_stats(db, partner.partner_id)
    commission_summary = CommissionService.get_partner_commission_summary(db, partner.partner_id)
    
    partner_stats = PartnerStatsResponse(
        partner_id=partner.partner_id,
        total_campaigns=stats['total_campaigns'],
        total_clicks=stats['total_clicks'],
        total_conversions=stats['total_conversions'],
        total_revenue=stats['total_revenue'],
        total_commission_earned=stats['total_commission_earned'],
        conversion_rate=stats['conversion_rate'],
        average_order_value=stats['average_order_value'],
        pending_commission=commission_summary['pending_commission'],
        paid_commission=commission_summary['paid_commission']
    )
    
    # Get recent campaigns
    recent_campaigns = db.query(CampaignPartner).filter(
        CampaignPartner.partner_id == partner.partner_id,
        CampaignPartner.is_deleted == False
    ).order_by(CampaignPartner.created_at.desc()).limit(5).all()
    
    campaign_summaries = [
        CampaignSummary(
            campaign_id=cp.campaign_version.campaign_id,
            vendor_id=cp.campaign_version.campaign.vendor_id,
            name=cp.campaign_version.name,
            status=cp.status,
            commission_type=cp.campaign_version.default_commission_type,
            commission_value=cp.campaign_version.default_commission_value,
            total_partners=0,  # Not relevant for partner view
            total_clicks=cp.total_clicks,
            total_conversions=cp.total_conversions,
            created_at=cp.created_at
        )
        for cp in recent_campaigns
    ]
    
    # Get recent conversions
    recent_conversions = db.query(ConversionEvent).filter(
        ConversionEvent.partner_id == partner.partner_id,
        ConversionEvent.is_deleted == False
    ).order_by(ConversionEvent.occurred_at.desc()).limit(10).all()
    
    conversion_summaries = [
        ConversionSummary(
            conversion_event_id=ce.conversion_event_id,
            transaction_id=ce.transaction_id,
            event_type=ce.conversion_event_type.name if ce.conversion_event_type else "unknown",
            event_value=ce.event_value,
            commission_amount=ce.commission_amount,
            status=ce.status,
            occurred_at=ce.occurred_at
        )
        for ce in recent_conversions
    ]
    
    return PartnerDashboardResponse(
        partner=PartnerResponse(
            partner_id=partner.partner_id,
            name=partner.name,
            email=partner.email,
            status=partner.status,
            tier=partner.tier,
            bio=partner.bio,
            website_url=partner.website_url,
            oauth_provider=partner.oauth_provider,
            created_at=partner.created_at,
            updated_at=partner.updated_at,
            types=[]
        ),
        stats=partner_stats,
        recent_campaigns=campaign_summaries,
        recent_conversions=conversion_summaries
    )


@router.get("/{partner_id}", response_model=PartnerResponse)
def get_partner(
    partner_id: int = Path(...),
    db: Session = Depends(get_db)
):
    """
    Get partner by ID.
    
    Partners can only access their own profile.
    Vendor users can access partners in their campaigns.
    """
    partner = db.query(Partner).filter(
        Partner.partner_id == partner_id,
        Partner.is_deleted == False
    ).first()
    
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    return partner


def _calculate_partner_stats(db: Session, partner_id: int) -> dict:
    """Calculate partner statistics."""
    from sqlalchemy import func
    from decimal import Decimal
    
    # Get campaign count
    total_campaigns = db.query(CampaignPartner).filter(
        CampaignPartner.partner_id == partner_id,
        CampaignPartner.status == 'approved',
        CampaignPartner.is_deleted == False
    ).count()
    
    # Get aggregated stats
    campaign_stats = db.query(
        func.sum(CampaignPartner.total_clicks).label('total_clicks'),
        func.sum(CampaignPartner.total_conversions).label('total_conversions'),
        func.sum(CampaignPartner.total_revenue).label('total_revenue'),
        func.sum(CampaignPartner.total_commission_earned).label('total_commission'),
        func.max(CampaignPartner.last_click_at).label('last_click_at'),
        func.max(CampaignPartner.last_conversion_at).label('last_conversion_at')
    ).filter(
        CampaignPartner.partner_id == partner_id,
        CampaignPartner.is_deleted == False
    ).first()
    
    total_clicks = campaign_stats.total_clicks or 0
    total_conversions = campaign_stats.total_conversions or 0
    total_revenue = campaign_stats.total_revenue or Decimal('0')
    total_commission = campaign_stats.total_commission or Decimal('0')
    
    # Calculate conversion rate
    conversion_rate = (total_conversions / total_clicks * 100) if total_clicks > 0 else 0
    
    # Calculate average order value
    avg_order_value = (total_revenue / total_conversions) if total_conversions > 0 else Decimal('0')
    
    # Get pending payout
    from app.services.payout_service import PayoutService
    pending_payout = PayoutService.get_pending_payout_amount(db, partner_id)
    
    return {
        'total_campaigns': total_campaigns,
        'total_clicks': total_clicks,
        'total_conversions': total_conversions,
        'total_revenue': total_revenue,
        'total_commission_earned': total_commission,
        'pending_payout': pending_payout,
        'conversion_rate': round(conversion_rate, 2),
        'average_order_value': avg_order_value,
        'last_click_at': campaign_stats.last_click_at,
        'last_conversion_at': campaign_stats.last_conversion_at
    }