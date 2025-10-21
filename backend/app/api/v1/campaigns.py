"""
Campaign API Endpoints

Handles campaign CRUD, partner enrollments, and approvals.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_partner, get_current_vendor_user, require_vendor_role
from app.schemas.campaign import (
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
    CampaignDetailResponse,
    CampaignListRequest,
    CampaignListResponse,
    CampaignSummary,
    CampaignPartnerApply,
    CampaignPartnerApprove,
    CampaignPartnerResponse,
    CampaignVersionCreate,
    PartnerCampaignOverrideCreate,
    PartnerCampaignOverrideResponse
)
from app.models import (
    Campaign, CampaignVersion, CampaignPartner, Partner, VendorUser,
    PartnerCampaignOverride
)

router = APIRouter()


@router.get("", response_model=CampaignListResponse)
def list_campaigns(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    is_public: Optional[bool] = None,
    search: Optional[str] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List campaigns.
    
    Partners see public campaigns and their enrolled campaigns.
    Vendors see only their own campaigns.
    """
    query = db.query(Campaign).filter(Campaign.is_deleted == False)
    
    # Apply filters based on user type
    if isinstance(current_user, Partner):
        # Partners see public campaigns or campaigns they're enrolled in
        query = query.join(CampaignVersion).filter(
            (CampaignVersion.is_public == True) |
            (Campaign.campaign_id.in_(
                db.query(Campaign.campaign_id)
                .join(CampaignVersion)
                .join(CampaignPartner)
                .filter(CampaignPartner.partner_id == current_user.partner_id)
            ))
        )
    elif isinstance(current_user, VendorUser):
        # Vendors see only their campaigns
        query = query.filter(Campaign.vendor_id == current_user.vendor_id)
    
    # Apply additional filters
    if status:
        query = query.filter(Campaign.status == status)
    
    if is_public is not None:
        query = query.join(CampaignVersion).filter(CampaignVersion.is_public == is_public)
    
    if search:
        query = query.join(CampaignVersion).filter(
            CampaignVersion.name.ilike(f"%{search}%")
        )
    
    # Get total count
    total = query.count()
    
    # Paginate
    campaigns = query.offset((page - 1) * page_size).limit(page_size).all()
    
    # Build summaries
    summaries = []
    for campaign in campaigns:
        if campaign.current_version:
            summaries.append(CampaignSummary(
                campaign_id=campaign.campaign_id,
                vendor_id=campaign.vendor_id,
                name=campaign.current_version.name,
                status=campaign.status,
                commission_type=campaign.current_version.default_commission_type,
                commission_value=campaign.current_version.default_commission_value,
                total_partners=0,  # TODO: Calculate
                total_clicks=0,
                total_conversions=0,
                created_at=campaign.created_at
            ))
    
    return CampaignListResponse(
        campaigns=summaries,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(
    data: CampaignCreate,
    vendor_user: VendorUser = Depends(require_vendor_role(['owner', 'admin'])),
    db: Session = Depends(get_db)
):
    """
    Create a new campaign.
    
    Requires owner or admin role.
    """
    # Create campaign
    campaign = Campaign(
        vendor_id=vendor_user.vendor_id,
        status='active'
    )
    
    db.add(campaign)
    db.flush()  # Get campaign_id
    
    # Create first version
    version = CampaignVersion(
        campaign_id=campaign.campaign_id,
        version_number=1,
        **data.version.dict()
    )
    
    db.add(version)
    db.flush()
    
    # Set current version
    campaign.current_campaign_version_id = version.campaign_version_id
    
    # Create tiers if provided
    if data.version.tiers:
        from app.models import CampaignTier
        for tier_data in data.version.tiers:
            tier = CampaignTier(
                campaign_version_id=version.campaign_version_id,
                **tier_data.dict()
            )
            db.add(tier)
    
    db.commit()
    db.refresh(campaign)
    
    return campaign


@router.get("/{campaign_id}", response_model=CampaignDetailResponse)
def get_campaign(
    campaign_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get campaign details.
    """
    campaign = db.query(Campaign).filter(
        Campaign.campaign_id == campaign_id,
        Campaign.is_deleted == False
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Check access
    if isinstance(current_user, VendorUser):
        if campaign.vendor_id != current_user.vendor_id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif isinstance(current_user, Partner):
        if not campaign.current_version or not campaign.current_version.is_public:
            # Check if partner is enrolled
            enrollment = db.query(CampaignPartner).filter(
                CampaignPartner.partner_id == current_user.partner_id,
                CampaignPartner.campaign_version_id == campaign.current_campaign_version_id
            ).first()
            if not enrollment:
                raise HTTPException(status_code=403, detail="Access denied")
    
    # Calculate stats
    from sqlalchemy import func
    stats = db.query(
        func.count(CampaignPartner.campaign_partner_id).label('total_partners'),
        func.sum(func.cast(CampaignPartner.status == 'approved', db.Integer)).label('approved_partners'),
        func.sum(func.cast(CampaignPartner.status == 'pending', db.Integer)).label('pending_partners'),
        func.sum(CampaignPartner.total_clicks).label('total_clicks'),
        func.sum(CampaignPartner.total_conversions).label('total_conversions'),
        func.sum(CampaignPartner.total_revenue).label('total_revenue'),
        func.sum(CampaignPartner.total_commission_earned).label('total_commission')
    ).filter(
        CampaignPartner.campaign_version_id == campaign.current_campaign_version_id,
        CampaignPartner.is_deleted == False
    ).first()
    
    total_clicks = stats.total_clicks or 0
    total_conversions = stats.total_conversions or 0
    conversion_rate = (total_conversions / total_clicks * 100) if total_clicks > 0 else 0
    
    return CampaignDetailResponse(
        campaign_id=campaign.campaign_id,
        vendor_id=campaign.vendor_id,
        status=campaign.status,
        current_version=campaign.current_version,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        total_partners=stats.total_partners or 0,
        approved_partners=stats.approved_partners or 0,
        pending_partners=stats.pending_partners or 0,
        total_clicks=total_clicks,
        total_conversions=total_conversions,
        total_revenue=stats.total_revenue or 0,
        total_commission_paid=stats.total_commission or 0,
        conversion_rate=round(conversion_rate, 2)
    )


@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(
    campaign_id: int,
    data: CampaignUpdate,
    vendor_user: VendorUser = Depends(require_vendor_role(['owner', 'admin'])),
    db: Session = Depends(get_db)
):
    """
    Update campaign status.
    
    Requires owner or admin role.
    """
    campaign = db.query(Campaign).filter(
        Campaign.campaign_id == campaign_id,
        Campaign.vendor_id == vendor_user.vendor_id,
        Campaign.is_deleted == False
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if data.status:
        campaign.status = data.status
    
    campaign.update()
    db.commit()
    db.refresh(campaign)
    
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(
    campaign_id: int,
    vendor_user: VendorUser = Depends(require_vendor_role(['owner'])),
    db: Session = Depends(get_db)
):
    """
    Delete campaign (soft delete).
    
    Requires owner role.
    """
    campaign = db.query(Campaign).filter(
        Campaign.campaign_id == campaign_id,
        Campaign.vendor_id == vendor_user.vendor_id,
        Campaign.is_deleted == False
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign.soft_delete()
    db.commit()


# Partner Enrollment Endpoints

@router.post("/{campaign_id}/apply", response_model=CampaignPartnerResponse, status_code=status.HTTP_201_CREATED)
def apply_to_campaign(
    campaign_id: int,
    data: CampaignPartnerApply,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Partner applies to join a campaign.
    """
    campaign = db.query(Campaign).filter(
        Campaign.campaign_id == campaign_id,
        Campaign.is_deleted == False
    ).first()
    
    if not campaign or not campaign.current_version:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Check if already applied
    existing = db.query(CampaignPartner).filter(
        CampaignPartner.campaign_version_id == campaign.current_campaign_version_id,
        CampaignPartner.partner_id == partner.partner_id,
        CampaignPartner.is_deleted == False
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this campaign")
    
    # Create enrollment
    enrollment = CampaignPartner(
        campaign_version_id=campaign.current_campaign_version_id,
        partner_id=partner.partner_id,
        status='approved' if not campaign.current_version.approval_required else 'pending',
        application_note=data.application_note,
        applied_at=datetime.utcnow(),
        approved_at=datetime.utcnow() if not campaign.current_version.approval_required else None
    )
    
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    
    return CampaignPartnerResponse(
        campaign_partner_id=enrollment.campaign_partner_id,
        campaign_version_id=enrollment.campaign_version_id,
        partner_id=enrollment.partner_id,
        partner_name=partner.name,
        partner_email=partner.email,
        partner_tier=partner.tier,
        status=enrollment.status,
        application_note=enrollment.application_note,
        applied_at=enrollment.applied_at,
        approved_at=enrollment.approved_at,
        total_clicks=0,
        total_conversions=0,
        total_revenue=0,
        total_commission_earned=0
    )


@router.get("/{campaign_id}/partners", response_model=List[CampaignPartnerResponse])
def get_campaign_partners(
    campaign_id: int,
    status_filter: Optional[str] = Query(None, alias="status"),
    vendor_user: VendorUser = Depends(get_current_vendor_user),
    db: Session = Depends(get_db)
):
    """
    Get all partners enrolled in a campaign.
    
    Vendor users only.
    """
    campaign = db.query(Campaign).filter(
        Campaign.campaign_id == campaign_id,
        Campaign.vendor_id == vendor_user.vendor_id,
        Campaign.is_deleted == False
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    query = db.query(CampaignPartner).filter(
        CampaignPartner.campaign_version_id == campaign.current_campaign_version_id,
        CampaignPartner.is_deleted == False
    )
    
    if status_filter:
        query = query.filter(CampaignPartner.status == status_filter)
    
    enrollments = query.all()
    
    return [
        CampaignPartnerResponse(
            campaign_partner_id=e.campaign_partner_id,
            campaign_version_id=e.campaign_version_id,
            partner_id=e.partner_id,
            partner_name=e.partner.name,
            partner_email=e.partner.email,
            partner_tier=e.partner.tier,
            status=e.status,
            application_note=e.application_note,
            applied_at=e.applied_at,
            approved_at=e.approved_at,
            rejected_at=e.rejected_at,
            rejection_reason=e.rejection_reason,
            total_clicks=e.total_clicks,
            total_conversions=e.total_conversions,
            total_revenue=e.total_revenue,
            total_commission_earned=e.total_commission_earned,
            last_click_at=e.last_click_at,
            last_conversion_at=e.last_conversion_at
        )
        for e in enrollments
    ]


@router.post("/{campaign_id}/partners/{partner_id}/approve", response_model=CampaignPartnerResponse)
def approve_partner(
    campaign_id: int,
    partner_id: int,
    data: CampaignPartnerApprove,
    vendor_user: VendorUser = Depends(require_vendor_role(['owner', 'admin', 'manager'])),
    db: Session = Depends(get_db)
):
    """
    Approve or reject partner application.
    
    Requires owner, admin, or manager role.
    """
    campaign = db.query(Campaign).filter(
        Campaign.campaign_id == campaign_id,
        Campaign.vendor_id == vendor_user.vendor_id,
        Campaign.is_deleted == False
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    enrollment = db.query(CampaignPartner).filter(
        CampaignPartner.campaign_version_id == campaign.current_campaign_version_id,
        CampaignPartner.partner_id == partner_id,
        CampaignPartner.is_deleted == False
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Partner enrollment not found")
    
    if data.approved:
        enrollment.approve(vendor_user.vendor_user_id)
    else:
        enrollment.reject(data.rejection_reason or "Application rejected")
    
    db.commit()
    db.refresh(enrollment)
    
    return CampaignPartnerResponse(
        campaign_partner_id=enrollment.campaign_partner_id,
        campaign_version_id=enrollment.campaign_version_id,
        partner_id=enrollment.partner_id,
        partner_name=enrollment.partner.name,
        partner_email=enrollment.partner.email,
        partner_tier=enrollment.partner.tier,
        status=enrollment.status,
        application_note=enrollment.application_note,
        applied_at=enrollment.applied_at,
        approved_at=enrollment.approved_at,
        rejected_at=enrollment.rejected_at,
        rejection_reason=enrollment.rejection_reason,
        total_clicks=enrollment.total_clicks,
        total_conversions=enrollment.total_conversions,
        total_revenue=enrollment.total_revenue,
        total_commission_earned=enrollment.total_commission_earned
    )


# Partner-specific commission overrides

@router.post("/{campaign_id}/partners/{partner_id}/override", response_model=PartnerCampaignOverrideResponse, status_code=status.HTTP_201_CREATED)
def create_commission_override(
    campaign_id: int,
    partner_id: int,
    data: PartnerCampaignOverrideCreate,
    vendor_user: VendorUser = Depends(require_vendor_role(['owner', 'admin'])),
    db: Session = Depends(get_db)
):
    """
    Create custom commission rate for a partner.
    
    Requires owner or admin role.
    """
    campaign = db.query(Campaign).filter(
        Campaign.campaign_id == campaign_id,
        Campaign.vendor_id == vendor_user.vendor_id,
        Campaign.is_deleted == False
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    override = PartnerCampaignOverride(**data.dict())
    db.add(override)
    db.commit()
    db.refresh(override)
    
    return override