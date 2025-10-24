"""
Partner Links API Endpoints

Handles partner link generation and management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_partner
from app.schemas.tracking import (
    PartnerLinkCreate,
    PartnerLinkUpdate,
    PartnerLinkResponse,
    PartnerLinkDetailResponse,
    AttachContentUrlRequest
)
from app.models import Partner, Click, PartnerLink
from app.services.link_service import LinkService

router = APIRouter()


def _build_link_response(link: PartnerLink, db: Session) -> PartnerLinkResponse:
    """
    Helper to build a PartnerLinkResponse with click count populated.
    """
    click_count = db.query(Click).filter(
        Click.partner_link_id == link.partner_link_id,
        Click.is_deleted == False
    ).count()

    return PartnerLinkResponse(
        partner_link_id=link.partner_link_id,
        campaign_partner_id=link.campaign_partner_id,
        short_code=link.short_code,
        full_url=link.full_url,
        tracking_url=LinkService.get_tracking_url(link),
        custom_params=link.custom_params,
        utm_params=link.utm_params,
        link_label=link.link_label,
        content_piece_id=link.content_piece_id,
        content_url=link.content_url,
        content_verification_status=link.content_verification_status,
        created_at=link.created_at,
        click_count=click_count,
        total_clicks=click_count
    )


@router.post("", response_model=PartnerLinkResponse, status_code=status.HTTP_201_CREATED)
def create_link(
    data: PartnerLinkCreate,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Generate a new tracking link.
    
    Partner must be approved for the campaign.
    """
    partner_link = LinkService.generate_link(
        db=db,
        campaign_partner_id=data.campaign_partner_id,
        partner=partner,
        link_label=data.link_label,
        custom_params=data.custom_params,
        utm_params=data.utm_params,
        content_piece_id=data.content_piece_id
    )

    return _build_link_response(partner_link, db)


@router.get("", response_model=List[PartnerLinkResponse])
def list_my_links(
    campaign_partner_id: Optional[int] = None,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Get all links for current partner.

    Optionally filter by campaign.
    """
    links = LinkService.get_partner_links(db, partner, campaign_partner_id)

    return [_build_link_response(link, db) for link in links]


@router.get("/{link_id}", response_model=PartnerLinkDetailResponse)
def get_link(
    link_id: int,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Get link details with statistics.
    """
    stats = LinkService.get_link_stats(db, link_id, partner)
    
    return PartnerLinkDetailResponse(**stats)


@router.put("/{link_id}", response_model=PartnerLinkResponse)
def update_link(
    link_id: int,
    data: PartnerLinkUpdate,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Update a partner link.
    """
    partner_link = LinkService.update_link(
        db=db,
        partner_link_id=link_id,
        partner=partner,
        link_label=data.link_label,
        custom_params=data.custom_params,
        utm_params=data.utm_params
    )

    return _build_link_response(partner_link, db)


@router.post("/{link_id}/attach-content", response_model=PartnerLinkResponse)
def attach_content_url(
    link_id: int,
    data: AttachContentUrlRequest,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Attach a content URL to a partner link.
    This marks the link for verification and triggers async verification.
    """
    partner_link = LinkService.attach_content_url(
        db=db,
        partner_link_id=link_id,
        partner=partner,
        content_url=data.content_url
    )

    # Trigger Celery task to verify content URL
    from app.workers.tasks import verify_content_url
    verify_content_url.delay(partner_link.partner_link_id)

    return _build_link_response(partner_link, db)


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(
    link_id: int,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Delete a partner link (soft delete).
    """
    LinkService.delete_link(db, link_id, partner)


@router.post("/{link_id}/deactivate", response_model=PartnerLinkResponse)
def deactivate_link(
    link_id: int,
    reason: Optional[str] = None,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Deactivate a partner link (disable without deleting).

    Deactivated links will no longer redirect to the destination.
    The link record remains in the database for historical tracking.
    """
    partner_link = LinkService.deactivate_link(
        db=db,
        partner_link_id=link_id,
        partner=partner,
        reason=reason
    )

    return _build_link_response(partner_link, db)


@router.post("/{link_id}/reactivate", response_model=PartnerLinkResponse)
def reactivate_link(
    link_id: int,
    partner: Partner = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """
    Reactivate a previously deactivated link.

    The link will resume redirecting to its destination URL.
    """
    partner_link = LinkService.reactivate_link(
        db=db,
        partner_link_id=link_id,
        partner=partner
    )

    return _build_link_response(partner_link, db)