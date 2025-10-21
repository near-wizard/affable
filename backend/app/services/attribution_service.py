"""
Attribution Service

Handles multi-touch attribution algorithms and touch tracking.
"""

from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from app.models import (
    ConversionEvent, Click, Cookie, Touch, Partner,
    CampaignPartner, CampaignVersion
)
from app.core.exceptions import NotFoundException, BadRequestException


class AttributionService:
    """Service for attribution operations."""
    
    ATTRIBUTION_MODELS = ['first_click', 'last_click', 'linear', 'time_decay']
    
    @staticmethod
    def attribute_conversion(
        db: Session,
        conversion_event: ConversionEvent,
        attribution_type: str = 'last_click'
    ) -> Dict[int, Decimal]:
        """
        Attribute a conversion to partner(s) based on attribution model.
        
        Args:
            db: Database session
            conversion_event: Conversion event to attribute
            attribution_type: Attribution model to use
            
        Returns:
            Dictionary mapping partner_id to attribution weight (0-1)
            
        Raises:
            BadRequestException: If attribution type is invalid
        """
        if attribution_type not in AttributionService.ATTRIBUTION_MODELS:
            raise BadRequestException(
                f"Invalid attribution type. Must be one of: {', '.join(AttributionService.ATTRIBUTION_MODELS)}"
            )
        
        # Get relevant clicks for this conversion
        clicks = AttributionService._get_relevant_clicks(db, conversion_event)
        
        if not clicks:
            # No clicks found - direct attribution to partner
            return {conversion_event.partner_id: Decimal('1.0')}
        
        # Apply attribution model
        if attribution_type == 'first_click':
            return AttributionService._first_click_attribution(clicks)
        elif attribution_type == 'last_click':
            return AttributionService._last_click_attribution(clicks)
        elif attribution_type == 'linear':
            return AttributionService._linear_attribution(clicks)
        elif attribution_type == 'time_decay':
            return AttributionService._time_decay_attribution(clicks, conversion_event.occurred_at)
        
        # Default to last click
        return AttributionService._last_click_attribution(clicks)
    
    @staticmethod
    def create_touches(
        db: Session,
        conversion_event: ConversionEvent,
        attribution_weights: Dict[int, Decimal],
        total_commission: Decimal
    ) -> List[Touch]:
        """
        Create touch records for a conversion based on attribution weights.
        
        Args:
            db: Database session
            conversion_event: Conversion event
            attribution_weights: Partner ID to weight mapping
            total_commission: Total commission to distribute
            
        Returns:
            List of created Touch objects
        """
        touches = []
        partner_ids = list(attribution_weights.keys())
        
        for i, (partner_id, weight) in enumerate(attribution_weights.items()):
            # Determine touch type
            if len(partner_ids) == 1:
                touch_type = 'only'
            elif i == 0:
                touch_type = 'first'
            elif i == len(partner_ids) - 1:
                touch_type = 'last'
            else:
                touch_type = 'middle'
            
            # Calculate touch value
            touch_value = total_commission * weight
            
            # Get campaign version for this partner
            campaign_partner = db.query(CampaignPartner).filter(
                CampaignPartner.partner_id == partner_id,
                CampaignPartner.campaign_version_id == conversion_event.campaign_version_id
            ).first()
            
            if not campaign_partner:
                continue
            
            # Create touch
            touch = Touch(
                conversion_event_id=conversion_event.conversion_event_id,
                click_id=conversion_event.click_id,
                cookie_id=conversion_event.cookie_id,
                partner_id=partner_id,
                campaign_version_id=conversion_event.campaign_version_id,
                touch_type=touch_type,
                touch_value=touch_value,
                attribution_type=conversion_event.attribution_type,
                attribution_confidence=conversion_event.attribution_confidence,
                occurred_at=conversion_event.occurred_at
            )
            
            db.add(touch)
            touches.append(touch)
        
        db.commit()
        return touches
    
    @staticmethod
    def _get_relevant_clicks(
        db: Session,
        conversion_event: ConversionEvent
    ) -> List[Click]:
        """
        Get relevant clicks for attribution.
        
        Looks for clicks within the attribution window based on cookie or click ID.
        
        Args:
            db: Database session
            conversion_event: Conversion event
            
        Returns:
            List of relevant Click objects
        """
        # Get campaign version for cookie duration
        campaign_version = db.query(CampaignVersion).filter(
            CampaignVersion.campaign_version_id == conversion_event.campaign_version_id
        ).first()
        
        if not campaign_version:
            return []
        
        attribution_window_start = conversion_event.occurred_at - timedelta(
            days=campaign_version.cookie_duration_days
        )
        
        # If we have a specific click, get it
        if conversion_event.click_id:
            click = db.query(Click).filter(
                Click.click_id == conversion_event.click_id,
                Click.is_deleted == False
            ).first()
            return [click] if click else []
        
        # If we have a cookie, get all clicks for that cookie within window
        if conversion_event.cookie_id:
            return db.query(Click).filter(
                Click.cookie_id == conversion_event.cookie_id,
                Click.clicked_at >= attribution_window_start,
                Click.clicked_at <= conversion_event.occurred_at,
                Click.is_deleted == False
            ).order_by(Click.clicked_at.asc()).all()
        
        return []
    
    @staticmethod
    def _first_click_attribution(clicks: List[Click]) -> Dict[int, Decimal]:
        """
        First-click attribution: 100% credit to first touchpoint.
        
        Args:
            clicks: List of clicks
            
        Returns:
            Attribution weights
        """
        if not clicks:
            return {}
        
        first_click = min(clicks, key=lambda c: c.clicked_at)
        partner_id = AttributionService._get_partner_id_from_click(first_click)
        
        return {partner_id: Decimal('1.0')}
    
    @staticmethod
    def _last_click_attribution(clicks: List[Click]) -> Dict[int, Decimal]:
        """
        Last-click attribution: 100% credit to last touchpoint.
        
        Args:
            clicks: List of clicks
            
        Returns:
            Attribution weights
        """
        if not clicks:
            return {}
        
        last_click = max(clicks, key=lambda c: c.clicked_at)
        partner_id = AttributionService._get_partner_id_from_click(last_click)
        
        return {partner_id: Decimal('1.0')}
    
    @staticmethod
    def _linear_attribution(clicks: List[Click]) -> Dict[int, Decimal]:
        """
        Linear attribution: Equal credit to all touchpoints.
        
        Args:
            clicks: List of clicks
            
        Returns:
            Attribution weights
        """
        if not clicks:
            return {}
        
        # Group by partner
        partner_clicks = {}
        for click in clicks:
            partner_id = AttributionService._get_partner_id_from_click(click)
            if partner_id not in partner_clicks:
                partner_clicks[partner_id] = []
            partner_clicks[partner_id].append(click)
        
        # Equal weight for each unique partner
        weight = Decimal('1.0') / len(partner_clicks)
        return {partner_id: weight for partner_id in partner_clicks.keys()}
    
    @staticmethod
    def _time_decay_attribution(
        clicks: List[Click],
        conversion_time: datetime,
        half_life_days: int = 7
    ) -> Dict[int, Decimal]:
        """
        Time-decay attribution: More recent touchpoints get more credit.
        
        Uses exponential decay with configurable half-life.
        
        Args:
            clicks: List of clicks
            conversion_time: When conversion occurred
            half_life_days: Half-life for decay in days
            
        Returns:
            Attribution weights
        """
        if not clicks:
            return {}
        
        import math
        
        # Calculate weight for each click based on time decay
        click_weights = []
        for click in clicks:
            days_before_conversion = (conversion_time - click.clicked_at).total_seconds() / 86400
            
            # Exponential decay: weight = 2^(-days / half_life)
            weight = 2 ** (-days_before_conversion / half_life_days)
            partner_id = AttributionService._get_partner_id_from_click(click)
            
            click_weights.append((partner_id, Decimal(str(weight))))
        
        # Group by partner and sum weights
        partner_weights = {}
        total_weight = Decimal('0')
        
        for partner_id, weight in click_weights:
            if partner_id not in partner_weights:
                partner_weights[partner_id] = Decimal('0')
            partner_weights[partner_id] += weight
            total_weight += weight
        
        # Normalize to sum to 1.0
        if total_weight > 0:
            return {
                partner_id: weight / total_weight
                for partner_id, weight in partner_weights.items()
            }
        
        return partner_weights
    
    @staticmethod
    def _get_partner_id_from_click(click: Click) -> int:
        """
        Get partner ID from a click.
        
        Args:
            click: Click object
            
        Returns:
            Partner ID
        """
        # Navigate through relationships: Click -> PartnerLink -> CampaignPartner -> Partner
        if click.partner_link and click.partner_link.campaign_partner:
            return click.partner_link.campaign_partner.partner_id
        
        # Fallback: shouldn't happen in normal operation
        return 0
    
    @staticmethod
    def get_conversion_touches(db: Session, conversion_event_id: int) -> List[Touch]:
        """
        Get all touches for a conversion event.
        
        Args:
            db: Database session
            conversion_event_id: Conversion event ID
            
        Returns:
            List of Touch objects
        """
        return db.query(Touch).filter(
            Touch.conversion_event_id == conversion_event_id,
            Touch.is_deleted == False
        ).order_by(Touch.occurred_at.asc()).all()
    
    @staticmethod
    def recalculate_attribution(
        db: Session,
        conversion_event_id: int,
        new_attribution_type: str
    ) -> ConversionEvent:
        """
        Recalculate attribution for a conversion with a different model.
        
        Args:
            db: Database session
            conversion_event_id: Conversion event ID
            new_attribution_type: New attribution model
            
        Returns:
            Updated ConversionEvent
            
        Raises:
            NotFoundException: If conversion not found
        """
        conversion_event = db.query(ConversionEvent).filter(
            ConversionEvent.conversion_event_id == conversion_event_id,
            ConversionEvent.is_deleted == False
        ).first()
        
        if not conversion_event:
            raise NotFoundException("Conversion event not found")
        
        # Delete existing touches
        db.query(Touch).filter(
            Touch.conversion_event_id == conversion_event_id
        ).delete()
        
        # Recalculate attribution
        attribution_weights = AttributionService.attribute_conversion(
            db, conversion_event, new_attribution_type
        )
        
        # Create new touches
        if conversion_event.commission_amount:
            AttributionService.create_touches(
                db,
                conversion_event,
                attribution_weights,
                conversion_event.commission_amount
            )
        
        # Update conversion event
        conversion_event.attribution_type = new_attribution_type
        conversion_event.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(conversion_event)
        
        return conversion_event