"""
Vendor API Endpoints

Handles vendor/company management, campaigns, and partner relationships.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.deps import get_current_vendor_user
from app.models import VendorUser, Vendor, Campaign, CampaignPartner, Payout, Partner, ConversionEvent, PayoutEvent, CampaignVersion, Click, PartnerLink

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
    db: Session = Depends(get_db),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    campaign_id: Optional[int] = Query(None),
    partner_id: Optional[int] = Query(None),
    utm_source: Optional[str] = Query(None),
    utm_medium: Optional[str] = Query(None),
    utm_campaign: Optional[str] = Query(None),
):
    """
    Get vendor dashboard with overview and key metrics.

    Query parameters:
    - start_date: YYYY-MM-DD format (defaults to 30 days ago)
    - end_date: YYYY-MM-DD format (defaults to today)
    - campaign_id: Filter by specific campaign
    - partner_id: Filter by specific partner
    - utm_source, utm_medium, utm_campaign: Filter by UTM parameters
    """
    # Get vendor info
    vendor = db.query(Vendor).filter(
        Vendor.vendor_id == vendor_user.vendor_id
    ).first()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Parse dates
    try:
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date() if end_date else datetime.utcnow().date()
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date() if start_date else end_date_obj - timedelta(days=30)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Get vendor's campaigns
    campaigns_query = db.query(Campaign).filter(
        Campaign.vendor_id == vendor_user.vendor_id,
        Campaign.is_deleted == False
    )

    # If campaign_id filter is provided, validate and use it
    if campaign_id:
        campaign_exists = db.query(Campaign).filter(
            Campaign.campaign_id == campaign_id,
            Campaign.vendor_id == vendor_user.vendor_id
        ).first()
        if not campaign_exists:
            raise HTTPException(status_code=404, detail="Campaign not found or access denied")
        campaigns_query = campaigns_query.filter(Campaign.campaign_id == campaign_id)

    campaigns = campaigns_query.all()

    active_campaigns = sum(1 for c in campaigns if c.status == 'active')
    total_campaigns = len(campaigns)

    # Get all campaign version IDs for filtered campaigns
    campaign_version_ids = [c.current_campaign_version_id for c in campaigns if c.current_campaign_version_id]

    # Get all campaign IDs for payout query
    campaign_ids = [c.campaign_id for c in campaigns]

    # Get partner stats across filtered campaigns (only if campaigns exist)
    if campaign_version_ids:
        # Build base query for CampaignPartners
        cp_query = db.query(CampaignPartner).filter(
            CampaignPartner.campaign_version_id.in_(campaign_version_ids),
            CampaignPartner.is_deleted == False,
            CampaignPartner.status == 'approved'
        )

        # Apply partner filter if provided
        if partner_id:
            cp_query = cp_query.filter(CampaignPartner.partner_id == partner_id)

        # Apply date filters
        cp_query = cp_query.filter(
            CampaignPartner.applied_at >= start_date_obj,
            CampaignPartner.applied_at <= end_date_obj
        )

        # Count total partners
        total_partners = db.query(func.count(CampaignPartner.partner_id.distinct())).filter(
            CampaignPartner.campaign_version_id.in_(campaign_version_ids),
            CampaignPartner.is_deleted == False,
            CampaignPartner.status == 'approved',
            CampaignPartner.applied_at >= start_date_obj,
            CampaignPartner.applied_at <= end_date_obj
        )
        if partner_id:
            total_partners = total_partners.filter(CampaignPartner.partner_id == partner_id)
        total_partners = total_partners.scalar() or 0

        # Get conversion and revenue stats
        campaign_stats_query = db.query(
            func.sum(CampaignPartner.total_clicks).label('total_clicks'),
            func.sum(CampaignPartner.total_conversions).label('total_conversions'),
            func.sum(CampaignPartner.total_revenue).label('total_revenue')
        ).filter(
            CampaignPartner.campaign_version_id.in_(campaign_version_ids),
            CampaignPartner.is_deleted == False
        )
        if partner_id:
            campaign_stats_query = campaign_stats_query.filter(CampaignPartner.partner_id == partner_id)

        campaign_stats = campaign_stats_query.first()

        # Get pending partner applications
        pending_query = db.query(func.count(CampaignPartner.partner_id)).filter(
            CampaignPartner.campaign_version_id.in_(campaign_version_ids),
            CampaignPartner.is_deleted == False,
            CampaignPartner.status == 'pending'
        )
        if partner_id:
            pending_query = pending_query.filter(CampaignPartner.partner_id == partner_id)
        pending_partners = pending_query.scalar() or 0

        # Get top partners (partner_id, name, stats)
        top_partners_data = []
        if not partner_id:  # Only show top partners if not filtering by specific partner
            top_partners_query = db.query(
                Partner.partner_id,
                Partner.name,
                func.sum(CampaignPartner.total_clicks).label('total_clicks'),
                func.sum(CampaignPartner.total_conversions).label('total_conversions'),
                func.sum(CampaignPartner.total_revenue).label('total_revenue'),
                func.sum(CampaignPartner.total_commission_earned).label('total_commission')
            ).join(
                CampaignPartner, Partner.partner_id == CampaignPartner.partner_id
            ).filter(
                CampaignPartner.campaign_version_id.in_(campaign_version_ids),
                CampaignPartner.is_deleted == False
            ).group_by(Partner.partner_id, Partner.name).order_by(
                func.sum(CampaignPartner.total_revenue).desc()
            ).limit(10).all()

            top_partners_data = [
                {
                    "partner_id": p.partner_id,
                    "name": p.name,
                    "total_clicks": p.total_clicks or 0,
                    "total_conversions": p.total_conversions or 0,
                    "total_revenue": float(p.total_revenue or 0),
                    "total_commission": float(p.total_commission or 0)
                }
                for p in top_partners_query
            ]

        # Get performance data (daily aggregates)
        performance_data = []
        if campaign_ids:
            click_query = db.query(
                func.date(Click.clicked_at).label('date'),
                func.count(Click.click_id).label('clicks'),
                func.count(ConversionEvent.conversion_event_id).label('conversions'),
                func.sum(ConversionEvent.event_value).label('revenue')
            ).outerjoin(
                ConversionEvent, and_(
                    Click.click_id == ConversionEvent.click_id,
                    ConversionEvent.status == 'approved'
                )
            ).join(
                PartnerLink, Click.partner_link_id == PartnerLink.partner_link_id
            ).join(
                CampaignPartner, PartnerLink.campaign_partner_id == CampaignPartner.campaign_partner_id
            ).filter(
                CampaignPartner.campaign_version_id.in_(campaign_version_ids),
                func.date(Click.clicked_at) >= start_date_obj,
                func.date(Click.clicked_at) <= end_date_obj,
                Click.is_deleted == False
            )

            # Apply filters to performance data
            if partner_id:
                click_query = click_query.filter(CampaignPartner.partner_id == partner_id)
            if utm_source:
                click_query = click_query.filter(Click.utm_source == utm_source)
            if utm_medium:
                click_query = click_query.filter(Click.utm_medium == utm_medium)
            if utm_campaign:
                click_query = click_query.filter(Click.utm_campaign == utm_campaign)

            click_query = click_query.group_by(func.date(Click.clicked_at)).order_by(func.date(Click.clicked_at))

            performance_data = [
                {
                    "date": str(p.date),
                    "clicks": p.clicks or 0,
                    "conversions": p.conversions or 0,
                    "revenue": float(p.revenue or 0)
                }
                for p in click_query.all()
            ]
    else:
        total_partners = 0
        campaign_stats = None
        pending_partners = 0
        top_partners_data = []
        performance_data = []

    total_clicks = campaign_stats.total_clicks if campaign_stats else 0
    total_conversions = campaign_stats.total_conversions if campaign_stats else 0
    total_revenue = campaign_stats.total_revenue if campaign_stats and campaign_stats.total_revenue else Decimal('0')

    # Get payout stats through campaign relationships
    payouts = []
    if campaign_ids:
        # Query only specific payout columns to avoid JSON comparison issues with .distinct()
        payout_query = db.query(
            Payout.payout_id,
            Payout.amount,
            Payout.status
        ).join(
            PayoutEvent, Payout.payout_id == PayoutEvent.payout_id
        ).join(
            ConversionEvent, PayoutEvent.conversion_event_id == ConversionEvent.conversion_event_id
        ).join(
            CampaignVersion, ConversionEvent.campaign_version_id == CampaignVersion.campaign_version_id
        ).join(
            Campaign, CampaignVersion.campaign_id == Campaign.campaign_id
        ).filter(
            Campaign.vendor_id == vendor_user.vendor_id,
            Payout.is_deleted == False
        )

        # Apply filters
        if partner_id:
            payout_query = payout_query.filter(ConversionEvent.partner_id == partner_id)

        payout_query = payout_query.distinct()
        payouts = payout_query.all()

    total_payout = sum(float(p.amount) for p in payouts if p.status in ['completed', 'processed'])
    pending_payouts = sum(1 for p in payouts if p.status == 'pending')

    # Get available campaigns for filtered data
    available_campaigns = []
    if campaign_version_ids:
        # Get campaigns that have data in the current filter period
        campaigns_with_data = db.query(Campaign).filter(
            Campaign.campaign_id.in_(campaign_ids)
        ).all()

        # Get campaign names from their current versions
        version_map = {}
        for c in campaigns_with_data:
            if c.current_campaign_version_id:
                version = db.query(CampaignVersion).filter(
                    CampaignVersion.campaign_version_id == c.current_campaign_version_id
                ).first()
                if version:
                    version_map[c.campaign_id] = version.name

        available_campaigns = [
            {
                "campaign_id": c.campaign_id,
                "name": version_map.get(c.campaign_id, f"Campaign {c.campaign_id}")
            }
            for c in campaigns_with_data
        ]

    # Get available UTM parameters from click data
    available_utm_sources = []
    available_utm_mediums = []
    available_utm_campaigns = []

    if campaign_version_ids and campaign_ids:
        utm_query = db.query(
            Click.utm_source,
            Click.utm_medium,
            Click.utm_campaign
        ).join(
            PartnerLink, Click.partner_link_id == PartnerLink.partner_link_id
        ).join(
            CampaignPartner, PartnerLink.campaign_partner_id == CampaignPartner.campaign_partner_id
        ).filter(
            CampaignPartner.campaign_version_id.in_(campaign_version_ids),
            Click.is_deleted == False
        )

        if start_date_obj and end_date_obj:
            utm_query = utm_query.filter(
                func.date(Click.clicked_at) >= start_date_obj,
                func.date(Click.clicked_at) <= end_date_obj
            )

        utm_data = utm_query.distinct().all()

        available_utm_sources = sorted(list(set([u.utm_source for u in utm_data if u.utm_source])))
        available_utm_mediums = sorted(list(set([u.utm_medium for u in utm_data if u.utm_medium])))
        available_utm_campaigns = sorted(list(set([u.utm_campaign for u in utm_data if u.utm_campaign])))

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
        "top_partners": top_partners_data,
        "performance_data": performance_data,
        "available_campaigns": available_campaigns,
        "available_utm_sources": available_utm_sources,
        "available_utm_mediums": available_utm_mediums,
        "available_utm_campaigns": available_utm_campaigns,
    }


@router.get("/me/available-partners", response_model=dict)
def get_available_partners(
    vendor_user: VendorUser = Depends(get_current_vendor_user),
    db: Session = Depends(get_db),
    campaign_id: Optional[int] = Query(None),
):
    """
    Get list of available partners for filtering dashboard.
    Returns unique partners (by partner_id) that have applied to vendor's campaigns.

    Query parameters:
    - campaign_id: Filter partners from specific campaign (optional)
    """
    # Get vendor's campaigns
    campaigns_query = db.query(Campaign).filter(
        Campaign.vendor_id == vendor_user.vendor_id,
        Campaign.is_deleted == False
    )

    # If campaign_id filter is provided, validate and use it
    if campaign_id:
        campaign_exists = db.query(Campaign).filter(
            Campaign.campaign_id == campaign_id,
            Campaign.vendor_id == vendor_user.vendor_id
        ).first()
        if not campaign_exists:
            raise HTTPException(status_code=404, detail="Campaign not found or access denied")
        campaigns_query = campaigns_query.filter(Campaign.campaign_id == campaign_id)

    campaigns = campaigns_query.all()

    # Get all campaign version IDs
    campaign_version_ids = [c.current_campaign_version_id for c in campaigns if c.current_campaign_version_id]

    partners_data = []
    if campaign_version_ids:
        # Get unique partners in these campaigns (approved status)
        partners = db.query(
            Partner.partner_id,
            Partner.name
        ).join(
            CampaignPartner, Partner.partner_id == CampaignPartner.partner_id
        ).filter(
            CampaignPartner.campaign_version_id.in_(campaign_version_ids),
            CampaignPartner.is_deleted == False,
            CampaignPartner.status == 'approved'
        ).distinct().order_by(Partner.name).all()

        partners_data = [
            {
                "partner_id": p.partner_id,
                "name": p.name
            }
            for p in partners
        ]

    return {
        "partners": partners_data,
        "total": len(partners_data)
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

    # Build response with stats - batch query all stats at once
    campaigns_data = []

    # Get all stats in a single query - grouped by campaign_version_id
    stats_query = db.query(
        CampaignPartner.campaign_version_id,
        func.count(CampaignPartner.partner_id.distinct()).label('partner_count'),
        func.sum(CampaignPartner.total_clicks).label('total_clicks'),
        func.sum(CampaignPartner.total_conversions).label('total_conversions'),
        func.sum(CampaignPartner.total_revenue).label('total_revenue'),
        func.sum(CampaignPartner.total_commission_earned).label('total_commission')
    ).filter(
        CampaignPartner.campaign_version_id.in_(version_ids),
        CampaignPartner.is_deleted == False
    ).group_by(CampaignPartner.campaign_version_id).all()

    # Create a map of stats by campaign_version_id for quick lookup
    stats_map = {
        stat.campaign_version_id: {
            'partner_count': stat.partner_count or 0,
            'total_clicks': stat.total_clicks or 0,
            'total_conversions': stat.total_conversions or 0,
            'total_revenue': stat.total_revenue or Decimal('0'),
            'total_commission': stat.total_commission or Decimal('0')
        }
        for stat in stats_query
    }

    for campaign in campaigns:
        # Get stats from the pre-computed map
        campaign_stats = stats_map.get(campaign.current_campaign_version_id, {
            'partner_count': 0,
            'total_clicks': 0,
            'total_conversions': 0,
            'total_revenue': Decimal('0'),
            'total_commission': Decimal('0')
        })

        partner_count = campaign_stats['partner_count']
        total_clicks = campaign_stats['total_clicks']
        total_conversions = campaign_stats['total_conversions']
        total_revenue = campaign_stats['total_revenue']
        total_commission = campaign_stats['total_commission']

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

    # Build response with stats - batch query all stats at once
    campaigns_data = []

    # Get all stats in a single query - grouped by campaign_version_id
    stats_query = db.query(
        CampaignPartner.campaign_version_id,
        func.count(CampaignPartner.partner_id.distinct()).label('partner_count'),
        func.sum(CampaignPartner.total_clicks).label('total_clicks'),
        func.sum(CampaignPartner.total_conversions).label('total_conversions'),
        func.sum(CampaignPartner.total_revenue).label('total_revenue'),
        func.sum(CampaignPartner.total_commission_earned).label('total_commission')
    ).filter(
        CampaignPartner.campaign_version_id.in_(version_ids),
        CampaignPartner.is_deleted == False
    ).group_by(CampaignPartner.campaign_version_id).all()

    # Create a map of stats by campaign_version_id for quick lookup
    stats_map = {
        stat.campaign_version_id: {
            'partner_count': stat.partner_count or 0,
            'total_clicks': stat.total_clicks or 0,
            'total_conversions': stat.total_conversions or 0,
            'total_revenue': stat.total_revenue or Decimal('0'),
            'total_commission': stat.total_commission or Decimal('0')
        }
        for stat in stats_query
    }

    for campaign in campaigns:
        # Get stats from the pre-computed map
        campaign_stats = stats_map.get(campaign.current_campaign_version_id, {
            'partner_count': 0,
            'total_clicks': 0,
            'total_conversions': 0,
            'total_revenue': Decimal('0'),
            'total_commission': Decimal('0')
        })

        partner_count = campaign_stats['partner_count']
        total_clicks = campaign_stats['total_clicks']
        total_conversions = campaign_stats['total_conversions']
        total_revenue = campaign_stats['total_revenue']
        total_commission = campaign_stats['total_commission']

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

    # Query payouts for this vendor through campaign relationships
    # Path: Payout → PayoutEvent → ConversionEvent → CampaignVersion → Campaign → Vendor
    query = db.query(Payout).join(
        PayoutEvent, Payout.payout_id == PayoutEvent.payout_id
    ).join(
        ConversionEvent, PayoutEvent.conversion_event_id == ConversionEvent.conversion_event_id
    ).join(
        CampaignVersion, ConversionEvent.campaign_version_id == CampaignVersion.campaign_version_id
    ).join(
        Campaign, CampaignVersion.campaign_id == Campaign.campaign_id
    ).filter(
        Campaign.vendor_id == vendor_id,
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
            "start_date": payout.start_date,
            "end_date": payout.end_date,
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
    # Query payouts for this vendor through campaign relationships
    # Path: Payout → PayoutEvent → ConversionEvent → CampaignVersion → Campaign → Vendor
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
            "start_date": payout.start_date,
            "end_date": payout.end_date,
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

# Webhook Management Endpoints

@router.get("/me/webhook-secret")
def get_webhook_secret(
    vendor_user: VendorUser = Depends(get_current_vendor_user),
    db: Session = Depends(get_db)
):
    """Get current webhook secret for vendor."""
    vendor = vendor_user.vendor

    # Generate secret if it doesn't exist
    if not vendor.webhook_secret:
        import secrets
        vendor.webhook_secret = secrets.token_urlsafe(32)
        db.commit()

    return {
        "webhook_secret": vendor.webhook_secret,
        "webhook_url": "https://yourdomain.com/webhooks/conversion"
    }


@router.post("/me/webhook-secret/regenerate")
def regenerate_webhook_secret(
    vendor_user: VendorUser = Depends(get_current_vendor_user),
    db: Session = Depends(get_db)
):
    """Regenerate webhook secret (old secret will no longer work)."""
    vendor = vendor_user.vendor

    import secrets
    vendor.webhook_secret = secrets.token_urlsafe(32)
    db.commit()

    return {
        "webhook_secret": vendor.webhook_secret,
        "message": "New webhook secret generated. Update your integration immediately."
    }
