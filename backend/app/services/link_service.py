"""
Link Service

Handles partner link generation and management.
"""

from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime
from urllib.parse import urlencode, urlparse, parse_qs, urlunparse

from app.models import PartnerLink, CampaignPartner, Partner, CampaignVersion, Click, ConversionEvent
from app.core.security import generate_short_code
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException
from app.config import settings


class LinkService:
    """Service for partner link operations."""

    @staticmethod
    def generate_link(
        db: Session,
        campaign_partner_id: int,
        partner: Partner,
        link_label: Optional[str] = None,
        custom_params: Optional[Dict[str, Any]] = None,
        utm_params: Optional[Dict[str, str]] = None,
        content_piece_id: Optional[int] = None
    ) -> PartnerLink:
        """
        Generate a new tracking link for a partner.

        Args:
            db: Database session
            campaign_partner_id: Campaign partner enrollment ID
            partner: Partner generating the link
            link_label: Optional label for the link
            custom_params: Custom parameters
            utm_params: UTM parameters
            content_piece_id: Optional content piece ID

        Returns:
            Created PartnerLink object

        Raises:
            NotFoundException: If campaign partner not found
            ForbiddenException: If partner doesn't own the enrollment
        """
        # Verify campaign partner exists and belongs to partner
        campaign_partner = db.query(CampaignPartner).filter(
            CampaignPartner.campaign_partner_id == campaign_partner_id,
            CampaignPartner.is_deleted == False
        ).first()

        if not campaign_partner:
            raise NotFoundException("Campaign enrollment not found")

        if campaign_partner.partner_id != partner.partner_id:
            raise ForbiddenException("You can only create links for your own campaigns")

        if not campaign_partner.is_approved():
            raise BadRequestException("Campaign enrollment must be approved before generating links")

        # Get campaign version for destination URL
        campaign_version = db.query(CampaignVersion).filter(
            CampaignVersion.campaign_version_id == campaign_partner.campaign_version_id,
            CampaignVersion.is_deleted == False
        ).first()

        if not campaign_version or not campaign_version.is_active():
            raise BadRequestException("Campaign is not active")

        # Generate unique short code
        short_code = LinkService._generate_unique_short_code(db)

        # Build full URL with UTM parameters
        full_url = LinkService._build_full_url(
            campaign_version.destination_url,
            utm_params or {},
            custom_params or {}
        )

        # Create partner link
        partner_link = PartnerLink(
            campaign_partner_id=campaign_partner_id,
            short_code=short_code,
            full_url=full_url,
            custom_params=custom_params,
            utm_params=utm_params,
            link_label=link_label,
            content_piece_id=content_piece_id
        )

        db.add(partner_link)
        db.commit()
        db.refresh(partner_link)

        return partner_link

    @staticmethod
    def get_partner_links(
        db: Session,
        partner: Partner,
        campaign_partner_id: Optional[int] = None
    ) -> List[PartnerLink]:
        """
        Get all links for a partner.

        Args:
            db: Database session
            partner: Partner object
            campaign_partner_id: Optional filter by campaign

        Returns:
            List of PartnerLink objects
        """
        query = db.query(PartnerLink).join(CampaignPartner).filter(
            CampaignPartner.partner_id == partner.partner_id,
            PartnerLink.is_deleted == False
        )

        if campaign_partner_id:
            query = query.filter(
                PartnerLink.campaign_partner_id == campaign_partner_id
            )

        return query.order_by(PartnerLink.created_at.desc()).all()

    @staticmethod
    def get_link_by_short_code(db: Session, short_code: str) -> Optional[PartnerLink]:
        """
        Get partner link by short code.

        Args:
            db: Database session
            short_code: Link short code

        Returns:
            PartnerLink object or None
        """
        return db.query(PartnerLink).filter(
            PartnerLink.short_code == short_code,
            PartnerLink.is_deleted == False
        ).first()

    @staticmethod
    def update_link(
        db: Session,
        partner_link_id: int,
        partner: Partner,
        link_label: Optional[str] = None,
        custom_params: Optional[Dict[str, Any]] = None,
        utm_params: Optional[Dict[str, str]] = None
    ) -> PartnerLink:
        """
        Update a partner link.

        Args:
            db: Database session
            partner_link_id: Link ID to update
            partner: Partner updating the link
            link_label: New label
            custom_params: New custom parameters
            utm_params: New UTM parameters

        Returns:
            Updated PartnerLink object

        Raises:
            NotFoundException: If link not found
            ForbiddenException: If partner doesn't own the link
        """
        partner_link = db.query(PartnerLink).filter(
            PartnerLink.partner_link_id == partner_link_id,
            PartnerLink.is_deleted == False
        ).first()

        if not partner_link:
            raise NotFoundException("Link not found")

        # Verify ownership through campaign_partner
        campaign_partner = db.query(CampaignPartner).filter(
            CampaignPartner.campaign_partner_id == partner_link.campaign_partner_id
        ).first()

        if not campaign_partner or campaign_partner.partner_id != partner.partner_id:
            raise ForbiddenException("You can only update your own links")

        # Update fields
        if link_label is not None:
            partner_link.link_label = link_label

        if custom_params is not None:
            partner_link.custom_params = custom_params

        if utm_params is not None:
            partner_link.utm_params = utm_params

            # Rebuild full URL with new UTM params
            campaign_version = db.query(CampaignVersion).filter(
                CampaignVersion.campaign_version_id == campaign_partner.campaign_version_id
            ).first()

            if campaign_version:
                partner_link.full_url = LinkService._build_full_url(
                    campaign_version.destination_url,
                    utm_params,
                    custom_params or {}
                )

        partner_link.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(partner_link)

        return partner_link

    @staticmethod
    def delete_link(db: Session, partner_link_id: int, partner: Partner) -> bool:
        """
        Soft delete a partner link.

        Args:
            db: Database session
            partner_link_id: Link ID to delete
            partner: Partner deleting the link

        Returns:
            True if deleted

        Raises:
            NotFoundException: If link not found
            ForbiddenException: If partner doesn't own the link
        """
        partner_link = db.query(PartnerLink).filter(
            PartnerLink.partner_link_id == partner_link_id,
            PartnerLink.is_deleted == False
        ).first()

        if not partner_link:
            raise NotFoundException("Link not found")

        # Verify ownership
        campaign_partner = db.query(CampaignPartner).filter(
            CampaignPartner.campaign_partner_id == partner_link.campaign_partner_id
        ).first()

        if not campaign_partner or campaign_partner.partner_id != partner.partner_id:
            raise ForbiddenException("You can only delete your own links")

        partner_link.soft_delete()
        db.commit()

        return True

    @staticmethod
    def get_tracking_url(partner_link: PartnerLink) -> str:
        """
        Get the full tracking URL for a link.

        Args:
            partner_link: PartnerLink object

        Returns:
            Full tracking URL
        """
        return f"https://{settings.TRACKING_DOMAIN}/r/{partner_link.short_code}"

    @staticmethod
    def get_link_stats(db: Session, partner_link_id: int, partner: Partner) -> Dict[str, Any]:
        """
        Get statistics for a partner link.

        Args:
            db: Database session
            partner_link_id: Link ID
            partner: Partner requesting stats

        Returns:
            Dictionary with link statistics

        Raises:
            NotFoundException: If link not found
            ForbiddenException: If partner doesn't own the link
        """
        partner_link = db.query(PartnerLink).filter(
            PartnerLink.partner_link_id == partner_link_id,
            PartnerLink.is_deleted == False
        ).first()

        if not partner_link:
            raise NotFoundException("Link not found")

        # Verify ownership
        campaign_partner = db.query(CampaignPartner).filter(
            CampaignPartner.campaign_partner_id == partner_link.campaign_partner_id
        ).first()

        if not campaign_partner or campaign_partner.partner_id != partner.partner_id:
            raise ForbiddenException("You can only view stats for your own links")

        # Get click count
        total_clicks = db.query(Click).filter(
            Click.partner_link_id == partner_link_id,
            Click.is_deleted == False
        ).count()

        # Get unique clicks (by cookie)
        unique_clicks = db.query(Click.cookie_id).filter(
            Click.partner_link_id == partner_link_id,
            Click.cookie_id.isnot(None),
            Click.is_deleted == False
        ).distinct().count()

        # Get conversions from clicks on this link
        conversions = db.query(ConversionEvent).join(Click).filter(
            Click.partner_link_id == partner_link_id,
            ConversionEvent.status == 'approved'
        ).all()

        total_conversions = len(conversions)
        total_revenue = sum(c.event_value or 0 for c in conversions)
        total_commission = sum(c.commission_amount or 0 for c in conversions)

        conversion_rate = (total_conversions / total_clicks * 100) if total_clicks > 0 else 0

        return {
            'partner_link_id': partner_link_id,
            'short_code': partner_link.short_code,
            'tracking_url': LinkService.get_tracking_url(partner_link),
            'total_clicks': total_clicks,
            'unique_clicks': unique_clicks,
            'total_conversions': total_conversions,
            'conversion_rate': round(conversion_rate, 2),
            'total_revenue': float(total_revenue),
            'total_commission': float(total_commission),
            'created_at': partner_link.created_at
        }

    @staticmethod
    def _generate_unique_short_code(db: Session, max_attempts: int = 10) -> str:
        """
        Generate a unique short code for tracking links.

        Args:
            db: Database session
            max_attempts: Maximum number of attempts to find unique code

        Returns:
            Unique short code

        Raises:
            RuntimeError: If unable to generate unique code
        """
        for _ in range(max_attempts):
            short_code = generate_short_code(length=8)

            # Check if code already exists
            existing = db.query(PartnerLink).filter(
                PartnerLink.short_code == short_code
            ).first()

            if not existing:
                return short_code

        raise RuntimeError("Unable to generate unique short code")

    @staticmethod
    def deactivate_link(
        db: Session,
        partner_link_id: int,
        partner: Partner,
        reason: Optional[str] = None
    ) -> PartnerLink:
        """
        Deactivate a partner link without deleting it.

        Args:
            db: Database session
            partner_link_id: Link ID to deactivate
            partner: Partner deactivating the link
            reason: Optional reason for deactivation

        Returns:
            Updated PartnerLink object

        Raises:
            NotFoundException: If link not found
            ForbiddenException: If partner doesn't own the link
        """
        partner_link = db.query(PartnerLink).filter(
            PartnerLink.partner_link_id == partner_link_id,
            PartnerLink.is_deleted == False
        ).first()

        if not partner_link:
            raise NotFoundException("Link not found")

        # Verify ownership
        campaign_partner = db.query(CampaignPartner).filter(
            CampaignPartner.campaign_partner_id == partner_link.campaign_partner_id
        ).first()

        if not campaign_partner or campaign_partner.partner_id != partner.partner_id:
            raise ForbiddenException("You can only deactivate your own links")

        partner_link.deactivate(reason)
        db.commit()
        db.refresh(partner_link)

        return partner_link

    @staticmethod
    def reactivate_link(
        db: Session,
        partner_link_id: int,
        partner: Partner
    ) -> PartnerLink:
        """
        Reactivate a previously deactivated partner link.

        Args:
            db: Database session
            partner_link_id: Link ID to reactivate
            partner: Partner reactivating the link

        Returns:
            Updated PartnerLink object

        Raises:
            NotFoundException: If link not found
            ForbiddenException: If partner doesn't own the link
        """
        partner_link = db.query(PartnerLink).filter(
            PartnerLink.partner_link_id == partner_link_id,
            PartnerLink.is_deleted == False
        ).first()

        if not partner_link:
            raise NotFoundException("Link not found")

        # Verify ownership
        campaign_partner = db.query(CampaignPartner).filter(
            CampaignPartner.campaign_partner_id == partner_link.campaign_partner_id
        ).first()

        if not campaign_partner or campaign_partner.partner_id != partner.partner_id:
            raise ForbiddenException("You can only reactivate your own links")

        partner_link.reactivate()
        db.commit()
        db.refresh(partner_link)

        return partner_link

    @staticmethod
    def _build_full_url(
        destination_url: str,
        utm_params: Dict[str, str],
        custom_params: Dict[str, Any]
    ) -> str:
        """
        Build full destination URL with UTM and custom parameters.

        Args:
            destination_url: Base destination URL
            utm_params: UTM tracking parameters
            custom_params: Custom parameters

        Returns:
            Full URL with parameters
        """
        # Parse destination URL
        parsed = urlparse(destination_url)
        query_params = parse_qs(parsed.query)

        # Add UTM parameters
        for key, value in utm_params.items():
            if value:
                query_params[key] = [value]

        # Add custom parameters (prefix with 'ref_')
        for key, value in custom_params.items():
            if value:
                query_params[f'ref_{key}'] = [str(value)]

        # Build query string
        query_string = urlencode(query_params, doseq=True)

        # Rebuild URL
        new_parsed = parsed._replace(query=query_string)
        return urlunparse(new_parsed)
