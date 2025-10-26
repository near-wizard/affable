"""
Vendor API Endpoints

Handles vendor/company management, campaigns, and partner relationships.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from decimal import Decimal

from app.core.database import get_db
from app.core.deps import get_current_vendor_user
from app.models import VendorUser, Vendor, Campaign, CampaignPartner, Payout

router = APIRouter()


@router.get("/me", response_model=dict)
def get_vendor_profile(
    vendor_user: VendorUser = Depends(get_current_vendor_user),
    db: Session = Depends(get_db)
):
    """Get current vendor's profile."""
    return {
        "vendor_user_id": vendor_user.vendor_user_id,
        "vendor_id": vendor_user.vendor_id,
        "name": vendor_user.name,
        "email": vendor_user.email,
        "created_at": vendor_user.created_at
    }


@router.get("/profile")
def get_vendor_profile_legacy(
    vendor_user: VendorUser = Depends(get_current_vendor_user),
    db: Session = Depends(get_db)
):
    """Get current vendor's profile (legacy endpoint)."""
    return {
        "vendor_user_id": vendor_user.vendor_user_id,
        "vendor_id": vendor_user.vendor_id,
        "name": vendor_user.name,
        "email": vendor_user.email,
        "created_at": vendor_user.created_at
    }


@router.get("/me/dashboard", response_model=dict)
def get_vendor_dashboard(
    vendor_user: VendorUser = Depends(get_current_vendor_user),
    db: Session = Depends(get_db)
):
    """
    Get vendor dashboard with overview and key metrics.
    """
    # Get vendor info
    vendor = db.query(Vendor).filter(
        Vendor.vendor_id == vendor_user.vendor_id
    ).first()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Get campaign stats
    campaigns = db.query(Campaign).filter(
        Campaign.vendor_id == vendor_user.vendor_id,
        Campaign.is_deleted == False
    ).all()

    active_campaigns = sum(1 for c in campaigns if c.status == 'active')
    total_campaigns = len(campaigns)

    # Get partner stats across all campaigns
    total_partners = db.query(func.count(CampaignPartner.partner_id.distinct())).filter(
        CampaignPartner.campaign_id.in_([c.campaign_id for c in campaigns]),
        CampaignPartner.is_deleted == False,
        CampaignPartner.status == 'approved'
    ).scalar() or 0

    # Get conversion and revenue stats
    campaign_stats = db.query(
        func.sum(CampaignPartner.total_clicks).label('total_clicks'),
        func.sum(CampaignPartner.total_conversions).label('total_conversions'),
        func.sum(CampaignPartner.total_revenue).label('total_revenue')
    ).filter(
        CampaignPartner.campaign_id.in_([c.campaign_id for c in campaigns]),
        CampaignPartner.is_deleted == False
    ).first()

    total_clicks = campaign_stats.total_clicks or 0
    total_conversions = campaign_stats.total_conversions or 0
    total_revenue = campaign_stats.total_revenue or Decimal('0')

    # Get payout stats
    payouts = db.query(Payout).filter(
        Payout.vendor_id == vendor_user.vendor_id,
        Payout.is_deleted == False
    ).all()

    total_payout = sum(float(p.amount) for p in payouts if p.status in ['completed', 'processed'])
    pending_payouts = sum(1 for p in payouts if p.status == 'pending')

    # Get pending partner applications
    pending_partners = db.query(func.count(CampaignPartner.partner_id)).filter(
        CampaignPartner.campaign_id.in_([c.campaign_id for c in campaigns]),
        CampaignPartner.is_deleted == False,
        CampaignPartner.status == 'pending'
    ).scalar() or 0

    return {
        "vendor_id": vendor_user.vendor_id,
        "vendor_name": vendor.name if vendor else "Unknown",
        "active_campaigns": active_campaigns,
        "total_campaigns": total_campaigns,
        "total_partners": total_partners,
        "pending_partners": pending_partners,
        "total_clicks": total_clicks,
        "total_conversions": total_conversions,
        "total_revenue": float(total_revenue),
        "total_payout": total_payout,
        "pending_payouts": pending_payouts,
    }


@router.get("/{vendor_id}/campaigns", response_model=dict)
def get_vendor_campaigns_by_id(
    vendor_id: int,
    vendor_user: VendorUser = Depends(get_current_vendor_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get campaigns for a specific vendor by ID.

    Query parameters:
    - page: Page number (default 1)
    - limit: Results per page (default 20, max 100)
    - status: Filter by status (active, paused, draft, archived)
    """
    # Verify user has access to this vendor
    if vendor_user.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Query campaigns for this vendor
    query = db.query(Campaign).filter(
        Campaign.vendor_id == vendor_id,
        Campaign.is_deleted == False
    )

    # Filter by status
    if status:
        query = query.filter(Campaign.status == status)

    # Get total count
    total = query.count()

    # Get paginated results
    campaigns = query.order_by(desc(Campaign.created_at)).offset((page - 1) * limit).limit(limit).all()

    # Load current versions separately
    from app.models import CampaignVersion
    version_ids = [c.current_campaign_version_id for c in campaigns if c.current_campaign_version_id]
    versions_map = {}
    if version_ids:
        versions = db.query(CampaignVersion).filter(CampaignVersion.campaign_version_id.in_(version_ids)).all()
        versions_map = {v.campaign_version_id: v for v in versions}

    # Build response with stats
    campaigns_data = []
    for campaign in campaigns:
        # Get stats for this campaign (partners are linked through campaign_version)
        campaign_stats = db.query(
            func.count(CampaignPartner.partner_id.distinct()).label('partner_count'),
            func.sum(CampaignPartner.total_clicks).label('total_clicks'),
            func.sum(CampaignPartner.total_conversions).label('total_conversions'),
            func.sum(CampaignPartner.total_revenue).label('total_revenue'),
            func.sum(CampaignPartner.total_commission_earned).label('total_commission')
        ).filter(
            CampaignPartner.campaign_version_id == campaign.current_campaign_version_id,
            CampaignPartner.is_deleted == False
        ).first()

        partner_count = campaign_stats.partner_count or 0
        total_clicks = campaign_stats.total_clicks or 0
        total_conversions = campaign_stats.total_conversions or 0
        total_revenue = campaign_stats.total_revenue or Decimal('0')
        total_commission = campaign_stats.total_commission or Decimal('0')

        # Get campaign version name from map
        current_version = versions_map.get(campaign.current_campaign_version_id) if campaign.current_campaign_version_id else None
        campaign_name = current_version.name if current_version else f"Campaign {campaign.campaign_id}"

        campaign_dict = {
            "campaign_id": campaign.campaign_id,
            "name": campaign_name,
            "status": campaign.status,
            "partner_count": partner_count,
            "total_clicks": total_clicks,
            "conversion_count": total_conversions,
            "conversion_rate": round((total_conversions / total_clicks * 100) if total_clicks > 0 else 0, 2),
            "total_revenue": float(total_revenue),
            "total_commission": float(total_commission),
            "created_at": campaign.created_at,
        }
        campaigns_data.append(campaign_dict)

    return {
        "data": campaigns_data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


@router.get("/me/campaigns", response_model=dict)
def get_vendor_campaigns(
    vendor_user: VendorUser = Depends(get_current_vendor_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get campaigns for the current vendor.

    Query parameters:
    - page: Page number (default 1)
    - limit: Results per page (default 20, max 100)
    - status: Filter by status (active, paused, draft, archived)
    """
    # Query campaigns for this vendor
    query = db.query(Campaign).filter(
        Campaign.vendor_id == vendor_user.vendor_id,
        Campaign.is_deleted == False
    )

    # Filter by status
    if status:
        query = query.filter(Campaign.status == status)

    # Get total count
    total = query.count()

    # Get paginated results
    campaigns = query.order_by(desc(Campaign.created_at)).offset((page - 1) * limit).limit(limit).all()

    # Load current versions separately
    from app.models import CampaignVersion
    version_ids = [c.current_campaign_version_id for c in campaigns if c.current_campaign_version_id]
    versions_map = {}
    if version_ids:
        versions = db.query(CampaignVersion).filter(CampaignVersion.campaign_version_id.in_(version_ids)).all()
        versions_map = {v.campaign_version_id: v for v in versions}

    # Build response with stats
    campaigns_data = []
    for campaign in campaigns:
        # Get stats for this campaign (partners are linked through campaign_version)
        campaign_stats = db.query(
            func.count(CampaignPartner.partner_id.distinct()).label('partner_count'),
            func.sum(CampaignPartner.total_clicks).label('total_clicks'),
            func.sum(CampaignPartner.total_conversions).label('total_conversions'),
            func.sum(CampaignPartner.total_revenue).label('total_revenue'),
            func.sum(CampaignPartner.total_commission_earned).label('total_commission')
        ).filter(
            CampaignPartner.campaign_version_id == campaign.current_campaign_version_id,
            CampaignPartner.is_deleted == False
        ).first()

        partner_count = campaign_stats.partner_count or 0
        total_clicks = campaign_stats.total_clicks or 0
        total_conversions = campaign_stats.total_conversions or 0
        total_revenue = campaign_stats.total_revenue or Decimal('0')
        total_commission = campaign_stats.total_commission or Decimal('0')

        # Get campaign version name from map
        current_version = versions_map.get(campaign.current_campaign_version_id) if campaign.current_campaign_version_id else None
        campaign_name = current_version.name if current_version else f"Campaign {campaign.campaign_id}"

        campaign_dict = {
            "campaign_id": campaign.campaign_id,
            "name": campaign_name,
            "status": campaign.status,
            "partner_count": partner_count,
            "total_clicks": total_clicks,
            "conversion_count": total_conversions,
            "conversion_rate": round((total_conversions / total_clicks * 100) if total_clicks > 0 else 0, 2),
            "total_revenue": float(total_revenue),
            "total_commission": float(total_commission),
            "created_at": campaign.created_at,
        }
        campaigns_data.append(campaign_dict)

    return {
        "data": campaigns_data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


@router.get("/{vendor_id}/payouts", response_model=dict)
def get_vendor_payouts_by_id(
    vendor_id: int,
    vendor_user: VendorUser = Depends(get_current_vendor_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get payouts (vendor payments to partners) for a specific vendor by ID.

    Query parameters:
    - page: Page number (default 1)
    - limit: Results per page (default 20, max 100)
    - status: Filter by status (pending, processed, completed, failed)
    """
    # Verify user has access to this vendor
    if vendor_user.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Query payouts for this vendor
    query = db.query(Payout).filter(
        Payout.vendor_id == vendor_id,
        Payout.is_deleted == False
    )

    # Filter by status
    if status:
        query = query.filter(Payout.status == status)

    # Get total count
    total = query.count()

    # Get paginated results
    payouts = query.order_by(desc(Payout.created_at)).offset((page - 1) * limit).limit(limit).all()

    # Build response
    payouts_data = []
    for payout in payouts:
        payout_dict = {
            "payout_id": payout.payout_id,
            "partner_id": payout.partner_id,
            "amount": float(payout.amount),
            "currency": payout.currency,
            "status": payout.status,
            "start_date": payout.period_start_date,
            "end_date": payout.period_end_date,
            "created_at": payout.created_at,
        }
        payouts_data.append(payout_dict)

    return {
        "data": payouts_data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


@router.get("/me/payouts", response_model=dict)
def get_vendor_payouts(
    vendor_user: VendorUser = Depends(get_current_vendor_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get payouts (vendor payments to partners) for the current vendor.

    Query parameters:
    - page: Page number (default 1)
    - limit: Results per page (default 20, max 100)
    - status: Filter by status (pending, processed, completed, failed)
    """
    # Query payouts for this vendor
    query = db.query(Payout).filter(
        Payout.vendor_id == vendor_user.vendor_id,
        Payout.is_deleted == False
    )

    # Filter by status
    if status:
        query = query.filter(Payout.status == status)

    # Get total count
    total = query.count()

    # Get paginated results
    payouts = query.order_by(desc(Payout.created_at)).offset((page - 1) * limit).limit(limit).all()

    # Build response
    payouts_data = []
    for payout in payouts:
        payout_dict = {
            "payout_id": payout.payout_id,
            "partner_id": payout.partner_id,
            "amount": float(payout.amount),
            "currency": payout.currency,
            "status": payout.status,
            "start_date": payout.period_start_date,
            "end_date": payout.period_end_date,
            "created_at": payout.created_at,
        }
        payouts_data.append(payout_dict)

    return {
        "data": payouts_data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }
