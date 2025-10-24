"""
Partner API Endpoints

Handles partner profile management, statistics, and dashboard.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.deps import get_current_partner, verify_partner_access, get_current_user
from app.schemas.partner import (
    PartnerResponse,
    PartnerUpdate,
    PartnerDetailResponse,
    PartnerStatsResponse,
    PartnerDashboardResponse,
    ClickAnalyticsResponse,
    DailyClickData
)
from app.schemas.campaign import CampaignSummary
from app.schemas.commission import ConversionSummary
from app.models import Partner, CampaignPartner, ConversionEvent, Click, PartnerLink, Campaign, VendorUser
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


@router.get("/me/analytics", response_model=ClickAnalyticsResponse)
def get_partner_analytics(
    partner: Partner = Depends(get_current_partner),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    utm_source: Optional[str] = Query(None, description="Filter by UTM source"),
    utm_medium: Optional[str] = Query(None, description="Filter by UTM medium"),
    utm_campaign: Optional[str] = Query(None, description="Filter by UTM campaign"),
    db: Session = Depends(get_db)
):
    """
    Get click analytics for partner with daily aggregates and filtering options.

    Query Parameters:
    - start_date: Filter clicks from this date (inclusive), format YYYY-MM-DD
    - end_date: Filter clicks until this date (inclusive), format YYYY-MM-DD
    - utm_source: Filter by UTM source value
    - utm_medium: Filter by UTM medium value
    - utm_campaign: Filter by UTM campaign value

    Returns daily click aggregates with total counts and filtering metadata.
    """
    # Default date range: last 30 days
    if not end_date:
        end_date_obj = datetime.utcnow().date()
    else:
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()

    if not start_date:
        start_date_obj = end_date_obj - timedelta(days=30)
    else:
        start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()

    # Build query for clicks - select only the columns we need to avoid lazy loading issues
    click_query = db.query(
        Click.clicked_at,
        Click.utm_source,
        Click.utm_medium,
        Click.utm_campaign
    ).join(
        PartnerLink, Click.partner_link_id == PartnerLink.partner_link_id
    ).join(
        CampaignPartner, PartnerLink.campaign_partner_id == CampaignPartner.campaign_partner_id
    ).filter(
        CampaignPartner.partner_id == partner.partner_id,
        Click.is_deleted == False,
        func.date(Click.clicked_at) >= start_date_obj,
        func.date(Click.clicked_at) <= end_date_obj
    )

    # Apply optional filters
    if utm_source:
        click_query = click_query.filter(Click.utm_source == utm_source)
    if utm_medium:
        click_query = click_query.filter(Click.utm_medium == utm_medium)
    if utm_campaign:
        click_query = click_query.filter(Click.utm_campaign == utm_campaign)

    clicks = click_query.all()

    # Aggregate by date
    daily_aggregates = {}
    utm_sources = set()
    utm_mediums = set()
    utm_campaigns = set()

    for click_row in clicks:
        clicked_at, utm_src, utm_med, utm_camp = click_row
        click_date = clicked_at.date().isoformat()
        if click_date not in daily_aggregates:
            daily_aggregates[click_date] = {
                "date": click_date,
                "clicks": 0,
                "conversions": 0,
                "utm_source": utm_src,
                "utm_medium": utm_med,
                "utm_campaign": utm_camp
            }
        daily_aggregates[click_date]["clicks"] += 1

        # Collect unique UTM values
        if utm_src:
            utm_sources.add(utm_src)
        if utm_med:
            utm_mediums.add(utm_med)
        if utm_camp:
            utm_campaigns.add(utm_camp)

    # Convert to sorted list
    data = sorted(daily_aggregates.values(), key=lambda x: x["date"])

    # Calculate totals
    total_clicks = len(clicks)
    total_conversions = 0  # TODO: Add conversion counting when conversion data is linked

    return ClickAnalyticsResponse(
        date_range={
            "start_date": start_date_obj.isoformat(),
            "end_date": end_date_obj.isoformat()
        },
        total_clicks=total_clicks,
        total_conversions=total_conversions,
        data=[DailyClickData(**d) for d in data],
        utm_sources=sorted(list(utm_sources)),
        utm_mediums=sorted(list(utm_mediums)),
        utm_campaigns=sorted(list(utm_campaigns))
    )


@router.get("/{partner_id}/dashboard", response_model=PartnerDashboardResponse)
def get_partner_dashboard(
    partner_id: int = Path(...),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard data for a specific partner.
    - Partners can access their own dashboard
    - Vendors can access dashboards for partners in their campaigns
    """
    # Authorization check
    # If it's a partner, they can only access their own data
    if isinstance(current_user, Partner):
        if current_user.partner_id != partner_id:
            raise HTTPException(status_code=403, detail="Unauthorized: You can only access your own dashboard")
    # If it's a vendor user, check if partner is enrolled in any of their campaigns
    elif isinstance(current_user, VendorUser):
        partner_in_vendor_campaign = db.query(CampaignPartner).join(
            CampaignPartner.campaign_version
        ).join(
            Campaign
        ).filter(
            CampaignPartner.partner_id == partner_id,
            Campaign.vendor_id == current_user.vendor_id,
            CampaignPartner.is_deleted == False
        ).first()

        if not partner_in_vendor_campaign:
            raise HTTPException(status_code=403, detail="Unauthorized: Partner not found in your campaigns")
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Verify partner exists
    partner = db.query(Partner).filter(
        Partner.partner_id == partner_id,
        Partner.is_deleted == False
    ).first()

    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

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


@router.get("/{partner_id}/analytics", response_model=ClickAnalyticsResponse)
def get_partner_analytics_by_id(
    partner_id: int = Path(...),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    utm_source: Optional[str] = Query(None, description="Filter by UTM source"),
    utm_medium: Optional[str] = Query(None, description="Filter by UTM medium"),
    utm_campaign: Optional[str] = Query(None, description="Filter by UTM campaign"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get analytics for a specific partner.
    Returns daily click and conversion aggregates with optional UTM filtering.
    - Partners can access their own analytics
    - Vendors can access analytics for partners in their campaigns
    """
    # Authorization check
    # If it's a partner, they can only access their own data
    if isinstance(current_user, Partner):
        if current_user.partner_id != partner_id:
            raise HTTPException(status_code=403, detail="Unauthorized: You can only access your own analytics")
    # If it's a vendor user, check if partner is enrolled in any of their campaigns
    elif isinstance(current_user, VendorUser):
        partner_in_vendor_campaign = db.query(CampaignPartner).join(
            CampaignPartner.campaign_version
        ).join(
            Campaign
        ).filter(
            CampaignPartner.partner_id == partner_id,
            Campaign.vendor_id == current_user.vendor_id,
            CampaignPartner.is_deleted == False
        ).first()

        if not partner_in_vendor_campaign:
            raise HTTPException(status_code=403, detail="Unauthorized: Partner not found in your campaigns")
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Verify partner exists
    partner = db.query(Partner).filter(
        Partner.partner_id == partner_id,
        Partner.is_deleted == False
    ).first()

    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Parse dates with defaults
    if end_date:
        end_date_obj = datetime.fromisoformat(end_date).date()
    else:
        end_date_obj = datetime.now().date()

    if start_date:
        start_date_obj = datetime.fromisoformat(start_date).date()
    else:
        # Default to 7 days ago if not specified (including current day)
        start_date_obj = end_date_obj - timedelta(days=6)

    # Query clicks for this partner
    # Need to join: Click -> PartnerLink -> CampaignPartner -> Partner
    query = db.query(
        Click.clicked_at,
        Click.utm_source,
        Click.utm_medium,
        Click.utm_campaign
    ).join(
        PartnerLink, Click.partner_link_id == PartnerLink.partner_link_id
    ).join(
        CampaignPartner, PartnerLink.campaign_partner_id == CampaignPartner.campaign_partner_id
    ).filter(
        CampaignPartner.partner_id == partner_id,
        Click.is_deleted == False,
        Click.clicked_at >= start_date_obj,
        Click.clicked_at <= end_date_obj
    )

    # Apply optional UTM filters
    if utm_source:
        query = query.filter(Click.utm_source == utm_source)
    if utm_medium:
        query = query.filter(Click.utm_medium == utm_medium)
    if utm_campaign:
        query = query.filter(Click.utm_campaign == utm_campaign)

    clicks = query.all()

    # Build daily aggregates
    from collections import defaultdict
    daily_data = defaultdict(lambda: {
        'clicks': 0,
        'conversions': 0,
        'utm_sources': set(),
        'utm_mediums': set(),
        'utm_campaigns': set()
    })

    utm_sources = set()
    utm_mediums = set()
    utm_campaigns = set()
    total_clicks = len(clicks)

    for click_row in clicks:
        clicked_at, utm_src, utm_med, utm_camp = click_row
        date_key = clicked_at.date().isoformat()  # Extract just the date part (YYYY-MM-DD)
        daily_data[date_key]['clicks'] += 1

        if utm_src:
            daily_data[date_key]['utm_sources'].add(utm_src)
            utm_sources.add(utm_src)
        if utm_med:
            daily_data[date_key]['utm_mediums'].add(utm_med)
            utm_mediums.add(utm_med)
        if utm_camp:
            daily_data[date_key]['utm_campaigns'].add(utm_camp)
            utm_campaigns.add(utm_camp)

    # Count conversions per day
    conversion_query = db.query(
        func.date(ConversionEvent.occurred_at).label('date'),
        func.count(ConversionEvent.conversion_event_id).label('count')
    ).filter(
        ConversionEvent.partner_id == partner_id,
        ConversionEvent.is_deleted == False,
        ConversionEvent.occurred_at >= start_date_obj,
        ConversionEvent.occurred_at <= end_date_obj
    ).group_by(func.date(ConversionEvent.occurred_at))

    conversions_by_date = {str(row.date): row.count for row in conversion_query.all()}
    total_conversions = sum(conversions_by_date.values())

    # Build response data
    data = []
    for date_str in sorted(daily_data.keys()):
        daily_info = daily_data[date_str]
        data.append({
            'date': date_str,
            'clicks': daily_info['clicks'],
            'conversions': conversions_by_date.get(date_str, 0),
            'utm_source': None,  # Not set per day, shown in the list
            'utm_medium': None,  # Not set per day, shown in the list
            'utm_campaign': None  # Not set per day, shown in the list
        })

    return ClickAnalyticsResponse(
        date_range={
            "start_date": start_date_obj.isoformat(),
            "end_date": end_date_obj.isoformat()
        },
        total_clicks=total_clicks,
        total_conversions=total_conversions,
        data=[DailyClickData(**d) for d in data],
        utm_sources=sorted(list(utm_sources)),
        utm_mediums=sorted(list(utm_mediums)),
        utm_campaigns=sorted(list(utm_campaigns))
    )


@router.get("", response_model=dict)
def list_partners(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    tier: Optional[str] = Query(None),
    verified_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    List all verified partners (for vendor partner discovery).

    Query parameters:
    - page: Page number (default 1)
    - limit: Results per page (default 20, max 100)
    - search: Search by name or email
    - type: Filter by partner type
    - tier: Filter by partner tier (standard, bronze, silver, gold, platinum)
    - verified_only: Only show verified partners (default False)
    """
    query = db.query(Partner).filter(Partner.is_deleted == False)

    # Filter by verification status
    if verified_only:
        query = query.filter(Partner.verified == True)

    # Filter by tier
    if tier:
        query = query.filter(Partner.tier == tier)

    # Filter by type (if partner has types - would need PartnerType model)
    # For now, type filtering would require a relationship

    # Search by name or email
    if search:
        query = query.filter(
            (Partner.name.ilike(f"%{search}%")) |
            (Partner.email.ilike(f"%{search}%"))
        )

    # Get total count
    total = query.count()

    # Get paginated results
    partners = query.order_by(desc(Partner.tier)).offset((page - 1) * limit).limit(limit).all()

    # Enrich with stats
    partner_data = []
    for partner in partners:
        stats = _calculate_partner_stats(db, partner.partner_id)
        partner_dict = {
            "partner_id": partner.partner_id,
            "name": partner.name,
            "email": partner.email,
            "status": partner.status,
            "tier": partner.tier,
            "bio": partner.bio,
            "website": partner.website_url,
            "verified": partner.verified,
            "rating": partner.rating,
            "types": [t.name for t in partner.types] if partner.types else [],
            "campaign_count": stats['total_campaigns'],
            "total_conversions": stats['total_conversions'],
            "total_revenue": float(stats['total_revenue']),
            "created_at": partner.created_at,
        }
        partner_data.append(partner_dict)

    return {
        "data": partner_data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


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


@router.get("/{partner_id}/campaigns", response_model=dict)
def get_partner_campaigns(
    partner_id: int = Path(...),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get campaigns for a specific partner.

    Query parameters:
    - page: Page number (default 1)
    - limit: Results per page (default 20, max 100)
    - status: Filter by status (approved, pending, rejected)
    """
    # Verify partner exists
    partner = db.query(Partner).filter(
        Partner.partner_id == partner_id,
        Partner.is_deleted == False
    ).first()

    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Query campaigns for this partner
    query = db.query(CampaignPartner).filter(
        CampaignPartner.partner_id == partner_id,
        CampaignPartner.is_deleted == False
    )

    # Filter by status
    if status:
        query = query.filter(CampaignPartner.status == status)

    # Get total count
    total = query.count()

    # Get paginated results
    campaign_partners = query.order_by(desc(CampaignPartner.created_at)).offset((page - 1) * limit).limit(limit).all()

    # Build response
    campaigns = []
    for cp in campaign_partners:
        campaign_dict = {
            "campaign_partner_id": cp.campaign_partner_id,
            "campaign_id": cp.campaign_version.campaign_id,
            "name": cp.campaign_version.name,
            "vendor_name": cp.campaign_version.campaign.vendor.name if cp.campaign_version.campaign.vendor else "Unknown",
            "status": cp.status,
            "commission_type": cp.campaign_version.default_commission_type,
            "commission_value": cp.campaign_version.default_commission_value,
            "click_count": cp.total_clicks,
            "conversion_count": cp.total_conversions,
            "conversion_rate": round((cp.total_conversions / cp.total_clicks * 100) if cp.total_clicks > 0 else 0, 2),
            "earned_commission": float(cp.total_commission_earned or 0),
            "created_at": cp.created_at,
        }
        campaigns.append(campaign_dict)

    return {
        "data": campaigns,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


@router.get("/{partner_id}/conversions", response_model=dict)
def get_partner_conversions(
    partner_id: int = Path(...),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get conversions for a specific partner.

    Query parameters:
    - page: Page number (default 1)
    - limit: Results per page (default 20, max 100)
    - status: Filter by status (pending, approved, rejected, paid)
    - start_date: Filter from date (ISO format)
    - end_date: Filter to date (ISO format)
    """
    # Verify partner exists
    partner = db.query(Partner).filter(
        Partner.partner_id == partner_id,
        Partner.is_deleted == False
    ).first()

    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Query conversions for this partner
    query = db.query(ConversionEvent).filter(
        ConversionEvent.partner_id == partner_id,
        ConversionEvent.is_deleted == False
    )

    # Filter by status
    if status:
        query = query.filter(ConversionEvent.status == status)

    # Filter by date range
    if start_date:
        from datetime import datetime
        query = query.filter(ConversionEvent.occurred_at >= datetime.fromisoformat(start_date))
    if end_date:
        from datetime import datetime
        query = query.filter(ConversionEvent.occurred_at <= datetime.fromisoformat(end_date))

    # Get total count
    total = query.count()

    # Get paginated results
    conversions = query.order_by(desc(ConversionEvent.occurred_at)).offset((page - 1) * limit).limit(limit).all()

    # Build response
    conversion_data = []
    for ce in conversions:
        conversion_dict = {
            "conversion_event_id": ce.conversion_event_id,
            "campaign_id": ce.campaign_version.campaign_id if ce.campaign_version else None,
            "transaction_id": ce.transaction_id,
            "event_type": ce.conversion_event_type.name if ce.conversion_event_type else "unknown",
            "event_value": float(ce.event_value or 0),
            "commission_amount": float(ce.commission_amount or 0),
            "status": ce.status,
            "occurred_at": ce.occurred_at,
        }
        conversion_data.append(conversion_dict)

    return {
        "data": conversion_data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


@router.get("/{partner_id}/links", response_model=dict)
def get_partner_links(
    partner_id: int = Path(...),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get tracking links for a specific partner.

    Query parameters:
    - page: Page number (default 1)
    - limit: Results per page (default 20, max 100)
    """
    from app.models import PartnerLink

    # Verify partner exists
    partner = db.query(Partner).filter(
        Partner.partner_id == partner_id,
        Partner.is_deleted == False
    ).first()

    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Query links for this partner through campaign_partner relationship
    from app.models import CampaignPartner
    query = db.query(PartnerLink).join(
        CampaignPartner,
        PartnerLink.campaign_partner_id == CampaignPartner.campaign_partner_id
    ).filter(
        CampaignPartner.partner_id == partner_id,
        PartnerLink.is_deleted == False
    )

    # Get total count
    total = query.count()

    # Get paginated results
    links = query.order_by(desc(PartnerLink.created_at)).offset((page - 1) * limit).limit(limit).all()

    # Build response
    links_data = []
    for link in links:
        # Get click count for this link from clicks table if it exists
        try:
            from app.models import Click
            click_count = db.query(func.count(Click.click_id)).filter(
                Click.partner_link_id == link.partner_link_id,
                Click.is_deleted == False
            ).scalar() or 0
        except:
            # If Click model doesn't exist or there's an error, default to 0
            click_count = 0

        # Build tracking URL
        from app.services.link_service import LinkService
        tracking_url = LinkService.get_tracking_url(link)

        # Load campaign_partner with related campaign data
        campaign_partner = link.campaign_partner
        campaign_version = campaign_partner.campaign_version if campaign_partner else None

        link_dict = {
            "partner_link_id": link.partner_link_id,
            "campaign_partner_id": link.campaign_partner_id,
            "short_code": link.short_code,
            "full_url": link.full_url,
            "tracking_url": tracking_url,
            "custom_params": link.custom_params,
            "utm_params": link.utm_params,
            "link_label": link.link_label,
            "content_piece_id": link.content_piece_id,
            "created_at": link.created_at,
            "click_count": click_count,
            "campaign_partner": {
                "campaign_partner_id": campaign_partner.campaign_partner_id,
                "campaign_version": {
                    "name": campaign_version.name if campaign_version else "Unknown"
                } if campaign_version else None
            } if campaign_partner else None
        }
        links_data.append(link_dict)

    return {
        "data": links_data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


@router.get("/{partner_id}/payouts", response_model=dict)
def get_partner_payouts(
    partner_id: int = Path(...),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get payouts for a specific partner.

    Query parameters:
    - page: Page number (default 1)
    - limit: Results per page (default 20, max 100)
    - status: Filter by status (pending, processed, completed, failed)
    """
    from app.models import Payout

    # Verify partner exists
    partner = db.query(Partner).filter(
        Partner.partner_id == partner_id,
        Partner.is_deleted == False
    ).first()

    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Query payouts for this partner
    query = db.query(Payout).filter(
        Payout.partner_id == partner_id,
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