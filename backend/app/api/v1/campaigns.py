"""
Campaign API Endpoints

Handles campaign CRUD, partner enrollments, and approvals.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

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
    PartnerCampaignOverrideResponse,
    CampaignPartnerListResponse,
    PartnerInvitationCreate,
    PartnerInvitationResponse,
    PartnerInvitationListResponse,
    PartnerInvitationAccept,
    PartnerInvitationDecline
)
from app.models import (
    Campaign, CampaignVersion, CampaignPartner, Partner, VendorUser,
    PartnerCampaignOverride, Click, ConversionEvent, PartnerLink, PartnerInvitation
)
import asyncio

router = APIRouter()

from app.config import settings

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
    has_version_join = False

    # Apply filters based on user type
    if isinstance(current_user, Partner):
        # Partners see public campaigns or campaigns they're enrolled in
        query = query.join(
            CampaignVersion,
            Campaign.current_campaign_version_id == CampaignVersion.campaign_version_id
        ).filter(
            (CampaignVersion.is_public == True) |
            (Campaign.campaign_id.in_(
                db.query(Campaign.campaign_id)
                .join(CampaignVersion, Campaign.current_campaign_version_id == CampaignVersion.campaign_version_id)
                .join(CampaignPartner)
                .filter(CampaignPartner.partner_id == current_user.partner_id)
            ))
        )
        has_version_join = True
    elif isinstance(current_user, VendorUser):
        # Vendors see only their campaigns
        query = query.filter(Campaign.vendor_id == current_user.vendor_id)

    # Apply additional filters
    if status:
        query = query.filter(Campaign.status == status)

    # Only join CampaignVersion if we haven't already
    if (is_public is not None or search) and not has_version_join:
        query = query.join(
            CampaignVersion,
            Campaign.current_campaign_version_id == CampaignVersion.campaign_version_id,
            isouter=True
        )
        has_version_join = True

    if is_public is not None:
        query = query.filter(CampaignVersion.is_public == is_public)

    if search:
        query = query.filter(
            CampaignVersion.name.ilike(f"%{search}%")
        )
    
    # Get total count
    total = query.count()
    
    # Paginate and eager load the current_version relationship
    campaigns = query.options(selectinload(Campaign.current_version)).offset((page - 1) * page_size).limit(page_size).all()
    
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
    # Extract tiers separately before creating version
    tiers_data = data.version.tiers or []
    version_dict = data.version.dict(exclude={'tiers'})

    version = CampaignVersion(
        campaign_id=campaign.campaign_id,
        version_number=1,
        **version_dict
    )

    db.add(version)
    db.flush()

    # Set current version
    campaign.current_campaign_version_id = version.campaign_version_id

    # Create tiers if provided
    if tiers_data:
        from app.models import CampaignTier
        for tier_data in tiers_data:
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
    from sqlalchemy import func, Integer
    stats = db.query(
        func.count(CampaignPartner.campaign_partner_id).label('total_partners'),
        func.sum(func.cast(CampaignPartner.status == 'approved', Integer)).label('approved_partners'),
        func.sum(func.cast(CampaignPartner.status == 'pending', Integer)).label('pending_partners'),
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


@router.post("/{campaign_id}/versions", response_model=CampaignResponse)
def create_campaign_version(
    campaign_id: int,
    data: CampaignVersionCreate,
    vendor_user: VendorUser = Depends(require_vendor_role(['owner', 'admin'])),
    db: Session = Depends(get_db)
):
    """
    Create a new version of a campaign.

    This allows campaigns to be updated while preserving version history.
    Requires owner or admin role.
    """
    campaign = db.query(Campaign).filter(
        Campaign.campaign_id == campaign_id,
        Campaign.vendor_id == vendor_user.vendor_id,
        Campaign.is_deleted == False
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Get the current version to determine next version number
    current_version = db.query(CampaignVersion).filter(
        CampaignVersion.campaign_id == campaign_id
    ).order_by(CampaignVersion.version_number.desc()).first()

    next_version_number = (current_version.version_number + 1) if current_version else 1

    # Extract tiers separately before creating version
    tiers_data = data.tiers or []
    version_dict = data.dict(exclude={'tiers'})

    # Create new version
    new_version = CampaignVersion(
        campaign_id=campaign_id,
        version_number=next_version_number,
        **version_dict
    )

    db.add(new_version)
    db.flush()

    # Create tiers if provided
    if tiers_data:
        from app.models import CampaignTier
        for tier_data in tiers_data:
            tier = CampaignTier(
                campaign_version_id=new_version.campaign_version_id,
                **tier_data.dict()
            )
            db.add(tier)

    # Update campaign to use new version
    campaign.current_campaign_version_id = new_version.campaign_version_id
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


@router.get("/{campaign_id}/partners", response_model=CampaignPartnerListResponse)
def get_campaign_partners(
    campaign_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    vendor_user: VendorUser = Depends(get_current_vendor_user),
    db: Session = Depends(get_db)
):
    """
    Get partners enrolled in a campaign (paginated).

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

    # Get total count
    total = query.count()

    # Paginate
    enrollments = query.offset((page - 1) * limit).limit(limit).all()

    # Build response with calculated stats
    partners = []
    for e in enrollments:
        # Calculate stats from clicks and conversions
        clicks_count = db.query(func.count(Click.click_id)).join(
            PartnerLink, Click.partner_link_id == PartnerLink.partner_link_id
        ).filter(
            PartnerLink.campaign_partner_id == e.campaign_partner_id
        ).scalar() or 0

        conversions_data = db.query(
            func.count(ConversionEvent.conversion_event_id).label('count'),
            func.sum(ConversionEvent.event_value).label('total_value'),
            func.max(ConversionEvent.occurred_at).label('last_conversion_at')
        ).join(
            Click, ConversionEvent.click_id == Click.click_id
        ).join(
            PartnerLink, Click.partner_link_id == PartnerLink.partner_link_id
        ).filter(
            PartnerLink.campaign_partner_id == e.campaign_partner_id,
            ConversionEvent.status == 'approved'
        ).first()

        conversions_count = conversions_data.count or 0
        total_revenue = Decimal(str(conversions_data.total_value or 0))
        last_conversion_at = conversions_data.last_conversion_at

        # TODO: Calculate commission earned (would need commission structure)
        total_commission = Decimal(0)

        partners.append(CampaignPartnerResponse(
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
            total_clicks=clicks_count,
            total_conversions=conversions_count,
            total_revenue=float(total_revenue),
            total_commission_earned=float(total_commission),
            last_click_at=e.last_click_at,
            last_conversion_at=last_conversion_at
        ))

    return CampaignPartnerListResponse(
        data=partners,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit
    )


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


# Partner Invitation Endpoints

@router.post("/{campaign_id}/partners/invite", response_model=PartnerInvitationResponse)
def invite_partner_to_campaign(
    campaign_id: int,
    data: PartnerInvitationCreate,
    vendor_user: VendorUser = Depends(get_current_vendor_user),
    db: Session = Depends(get_db)
):
    """
    Invite a partner to a campaign.

    Vendor users only. Creates an invitation that the partner can accept or decline.
    """
    # Verify campaign belongs to vendor
    campaign = db.query(Campaign).filter(
        Campaign.campaign_id == campaign_id,
        Campaign.vendor_id == vendor_user.vendor_id,
        Campaign.is_deleted == False
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Verify partner exists
    partner = db.query(Partner).filter(
        Partner.partner_id == data.partner_id,
        Partner.is_deleted == False
    ).first()

    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Check if invitation already exists and is pending
    existing_invitation = db.query(PartnerInvitation).filter(
        PartnerInvitation.campaign_id == campaign_id,
        PartnerInvitation.partner_id == data.partner_id,
        PartnerInvitation.status.in_(['pending', 'accepted'])
    ).first()

    if existing_invitation:
        raise HTTPException(
            status_code=400,
            detail="Invitation already exists for this partner and campaign"
        )

    # Check if partner is already enrolled
    existing_enrollment = db.query(CampaignPartner).filter(
        CampaignPartner.campaign_version_id == campaign.current_campaign_version_id,
        CampaignPartner.partner_id == data.partner_id,
        CampaignPartner.status.in_(['pending', 'approved']),
        CampaignPartner.is_deleted == False
    ).first()

    if existing_enrollment:
        raise HTTPException(
            status_code=400,
            detail="Partner is already enrolled in this campaign"
        )

    # Create invitation (expires in 30 days)
    invitation = PartnerInvitation(
        campaign_id=campaign_id,
        partner_id=data.partner_id,
        invited_by=vendor_user.vendor_user_id,
        invitation_message=data.invitation_message,
        invited_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=30)
    )

    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    # Send invitation email asynchronously (fire and forget)
    try:
        campaign_version = campaign.current_version
        vendor = vendor_user.vendor

        # Format commission description based on campaign type
        if campaign_version.commission_type == "percentage":
            commission_desc = f"{campaign_version.commission_value}% commission on each sale"
        elif campaign_version.commission_type == "fixed":
            commission_desc = f"${campaign_version.commission_value} per sale"
        else:
            commission_desc = "Tiered commission structure"

        # Build invitation URL
        invitation_url = f"{settings.FRONTEND_URL}/invitations/{invitation.partner_invitation_id}/accept"

        # Send email (fire and forget with asyncio task)
        # Import here to avoid circular imports and missing dependencies
        from app.services.email_service import email_service
        asyncio.create_task(
            email_service.send_partner_invitation_email(
                partner_email=partner.email,
                partner_name=partner.name,
                campaign_name=campaign_version.name,
                vendor_name=vendor.company_name,
                vendor_email=vendor.email,
                commission_description=commission_desc,
                invitation_url=invitation_url,
                invitation_message=data.invitation_message,
            )
        )
    except Exception as e:
        # Log but don't fail the request - invitation was created successfully
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to queue invitation email for {partner.email}: {str(e)}")

    return PartnerInvitationResponse(
        partner_invitation_id=invitation.partner_invitation_id,
        campaign_id=invitation.campaign_id,
        partner_id=invitation.partner_id,
        partner_name=partner.name,
        partner_email=partner.email,
        campaign_name=campaign.current_version.name,
        status=invitation.status,
        invitation_message=invitation.invitation_message,
        invited_at=invitation.invited_at,
        expires_at=invitation.expires_at
    )


@router.get("/invitations", response_model=PartnerInvitationListResponse)
def list_partner_invitations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    List partner invitations.

    Partners see their own invitations. Vendors see invitations sent by them.
    """
    query = db.query(PartnerInvitation).filter(PartnerInvitation.is_deleted == False)

    # Filter for partner's invitations
    query = query.filter(PartnerInvitation.partner_id == partner.partner_id)

    if status_filter:
        query = query.filter(PartnerInvitation.status == status_filter)

    total = query.count()
    invitations = query.offset((page - 1) * limit).limit(limit).all()

    # Build response
    invitation_responses = []
    for inv in invitations:
        invitation_responses.append(
            PartnerInvitationResponse(
                partner_invitation_id=inv.partner_invitation_id,
                campaign_id=inv.campaign_id,
                partner_id=inv.partner_id,
                partner_name=partner.name,
                partner_email=partner.email,
                campaign_name=inv.campaign.current_version.name,
                status=inv.status,
                invitation_message=inv.invitation_message,
                invited_at=inv.invited_at,
                accepted_at=inv.accepted_at,
                declined_at=inv.declined_at,
                declined_reason=inv.declined_reason,
                expires_at=inv.expires_at
            )
        )

    return PartnerInvitationListResponse(
        data=invitation_responses,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit
    )


@router.post("/invitations/{invitation_id}/accept", response_model=PartnerInvitationResponse)
def accept_invitation(
    invitation_id: int,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Accept a partner invitation to join a campaign.

    Partners only. Creates enrollment in the campaign.
    """
    invitation = db.query(PartnerInvitation).filter(
        PartnerInvitation.partner_invitation_id == invitation_id,
        PartnerInvitation.partner_id == partner.partner_id,
        PartnerInvitation.is_deleted == False
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.status != 'pending':
        raise HTTPException(
            status_code=400,
            detail=f"Invitation is already {invitation.status}"
        )

    if invitation.is_expired():
        raise HTTPException(status_code=400, detail="Invitation has expired")

    # Accept the invitation
    invitation.accept()

    # Create enrollment in the campaign
    campaign = invitation.campaign
    enrollment = CampaignPartner(
        campaign_version_id=campaign.current_campaign_version_id,
        partner_id=partner.partner_id,
        status='approved' if not campaign.current_version.approval_required else 'pending',
        applied_at=datetime.utcnow(),
        approved_at=datetime.utcnow() if not campaign.current_version.approval_required else None
    )

    db.add(enrollment)
    db.commit()
    db.refresh(invitation)

    return PartnerInvitationResponse(
        partner_invitation_id=invitation.partner_invitation_id,
        campaign_id=invitation.campaign_id,
        partner_id=invitation.partner_id,
        partner_name=partner.name,
        partner_email=partner.email,
        campaign_name=campaign.current_version.name,
        status=invitation.status,
        invitation_message=invitation.invitation_message,
        invited_at=invitation.invited_at,
        accepted_at=invitation.accepted_at,
        expires_at=invitation.expires_at
    )


@router.post("/invitations/{invitation_id}/decline", response_model=PartnerInvitationResponse)
def decline_invitation(
    invitation_id: int,
    data: PartnerInvitationDecline,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Decline a partner invitation.

    Partners only.
    """
    invitation = db.query(PartnerInvitation).filter(
        PartnerInvitation.partner_invitation_id == invitation_id,
        PartnerInvitation.partner_id == partner.partner_id,
        PartnerInvitation.is_deleted == False
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.status != 'pending':
        raise HTTPException(
            status_code=400,
            detail=f"Invitation is already {invitation.status}"
        )

    # Decline the invitation
    invitation.decline(data.reason)

    db.commit()
    db.refresh(invitation)

    return PartnerInvitationResponse(
        partner_invitation_id=invitation.partner_invitation_id,
        campaign_id=invitation.campaign_id,
        partner_id=invitation.partner_id,
        partner_name=partner.name,
        partner_email=partner.email,
        campaign_name=invitation.campaign.current_version.name,
        status=invitation.status,
        invitation_message=invitation.invitation_message,
        invited_at=invitation.invited_at,
        declined_at=invitation.declined_at,
        declined_reason=invitation.declined_reason,
        expires_at=invitation.expires_at
    )