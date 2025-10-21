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
    PartnerLinkDetailResponse
)
from app.models import Partner
from app.services.link_service import LinkService

router = APIRouter()


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
    
    tracking_url = LinkService.get_tracking_url(partner_link)
    
    return PartnerLinkResponse(
        partner_link_id=partner_link.partner_link_id,
        campaign_partner_id=partner_link.campaign_partner_id,
        short_code=partner_link.short_code,
        full_url=partner_link.full_url,
        tracking_url=tracking_url,
        custom_params=partner_link.custom_params,
        utm_params=partner_link.utm_params,
        link_label=partner_link.link_label,
        content_piece_id=partner_link.content_piece_id,
        created_at=partner_link.created_at
    )


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
    
    return [
        PartnerLinkResponse(
            partner_link_id=link.partner_link_id,
            campaign_partner_id=link.campaign_partner_id,
            short_code=link.short_code,
            full_url=link.full_url,
            tracking_url=LinkService.get_tracking_url(link),
            custom_params=link.custom_params,
            utm_params=link.utm_params,
            link_label=link.link_label,
            content_piece_id=link.content_piece_id,
            created_at=link.created_at
        )
        for link in links
    ]


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
    
    return PartnerLinkResponse(
        partner_link_id=partner_link.partner_link_id,
        campaign_partner_id=partner_link.campaign_partner_id,
        short_code=partner_link.short_code,
        full_url=partner_link.full_url,
        tracking_url=LinkService.get_tracking_url(partner_link),
        custom_params=partner_link.custom_params,
        utm_params=partner_link.utm_params,
        link_label=partner_link.link_label,
        content_piece_id=partner_link.content_piece_id,
        created_at=partner_link.created_at
    )


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