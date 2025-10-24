"""
Commission Service

Handles commission calculation and rules evaluation.
"""

from sqlalchemy.orm import Session
from typing import Optional, Tuple
from datetime import datetime
from decimal import Decimal

from app.models import (
    ConversionEvent, CampaignVersion, CampaignTier,
    PartnerCampaignOverride, CommissionRule, EventCommissionSnapshot,
    Reward, Partner, CampaignPartner
)
from app.core.exceptions import NotFoundException, BadRequestException


class CommissionService:
    """Service for commission operations."""
    
    @staticmethod
    def calculate_commission(
        db: Session,
        conversion_event: ConversionEvent
    ) -> Tuple[Decimal, str, Decimal]:
        """
        Calculate commission for a conversion event.
        
        Checks in order:
        1. Partner-specific overrides
        2. Active commission rules
        3. Tiered commission structure
        4. Default campaign commission
        
        Args:
            db: Database session
            conversion_event: Conversion event
            
        Returns:
            Tuple of (commission_amount, commission_type, commission_value)
        """
        # Check for partner-specific override
        override = db.query(PartnerCampaignOverride).filter(
            PartnerCampaignOverride.partner_id == conversion_event.partner_id,
            PartnerCampaignOverride.campaign_version_id == conversion_event.campaign_version_id,
            PartnerCampaignOverride.is_deleted == False
        ).filter(
            # Check if override is valid for this event type
            (PartnerCampaignOverride.conversion_event_type_id == conversion_event.conversion_event_type_id) |
            (PartnerCampaignOverride.conversion_event_type_id.is_(None))
        ).first()
        
        if override and override.is_valid():
            return CommissionService._calculate_from_override(conversion_event, override)
        
        # Check for active commission rules
        rules = db.query(CommissionRule).filter(
            CommissionRule.active == True,
            CommissionRule.is_deleted == False
        ).all()

        for rule in rules:
            if rule.is_active() and CommissionService._rule_applies(db, conversion_event, rule):
                return CommissionService._calculate_from_rule(conversion_event, rule)
        
        # Get campaign version
        campaign_version = db.query(CampaignVersion).filter(
            CampaignVersion.campaign_version_id == conversion_event.campaign_version_id,
            CampaignVersion.is_deleted == False
        ).first()
        
        if not campaign_version:
            raise NotFoundException("Campaign version not found")
        
        # Check for tiered commission
        if campaign_version.default_commission_type == 'tiered':
            return CommissionService._calculate_from_tiers(db, conversion_event, campaign_version)
        
        # Use default campaign commission
        return CommissionService._calculate_from_campaign_default(conversion_event, campaign_version)
    
    @staticmethod
    def _calculate_from_override(
        conversion_event: ConversionEvent,
        override: PartnerCampaignOverride
    ) -> Tuple[Decimal, str, Decimal]:
        """Calculate commission from partner override."""
        commission_type = override.commission_type
        commission_value = override.commission_value
        
        if commission_type == 'percentage':
            commission_amount = (conversion_event.event_value or Decimal('0')) * (commission_value / Decimal('100'))
        else:  # flat
            commission_amount = commission_value
        
        return commission_amount, commission_type, commission_value
    
    @staticmethod
    def _calculate_from_rule(
        conversion_event: ConversionEvent,
        rule: CommissionRule
    ) -> Tuple[Decimal, str, Decimal]:
        """Calculate commission from rule actions."""
        actions = rule.actions
        
        commission_type = actions.get('commission_type', 'percentage')
        commission_value = Decimal(str(actions.get('commission_value', 0)))
        
        # Apply multiplier if specified
        multiplier = Decimal(str(actions.get('commission_multiplier', 1)))
        
        if commission_type == 'percentage':
            commission_amount = (conversion_event.event_value or Decimal('0')) * (commission_value / Decimal('100')) * multiplier
        else:  # flat
            commission_amount = commission_value * multiplier
        
        # Add bonus if specified
        bonus = Decimal(str(actions.get('bonus_flat', 0)))
        commission_amount += bonus
        
        return commission_amount, commission_type, commission_value
    
    @staticmethod
    def _calculate_from_tiers(
        db: Session,
        conversion_event: ConversionEvent,
        campaign_version: CampaignVersion
    ) -> Tuple[Decimal, str, Decimal]:
        """Calculate commission from tiered structure."""
        # Get partner's total revenue for this campaign
        campaign_partner = db.query(CampaignPartner).filter(
            CampaignPartner.partner_id == conversion_event.partner_id,
            CampaignPartner.campaign_version_id == conversion_event.campaign_version_id
        ).first()
        
        total_revenue = campaign_partner.total_revenue if campaign_partner else Decimal('0')
        
        # Find applicable tier
        tier = db.query(CampaignTier).filter(
            CampaignTier.campaign_version_id == campaign_version.campaign_version_id,
            CampaignTier.min_amount <= total_revenue,
            CampaignTier.max_amount >= total_revenue,
            CampaignTier.is_deleted == False
        ).first()
        
        if not tier:
            # Fallback to highest tier or default
            tier = db.query(CampaignTier).filter(
                CampaignTier.campaign_version_id == campaign_version.campaign_version_id,
                CampaignTier.is_deleted == False
            ).order_by(CampaignTier.max_amount.desc()).first()
        
        if not tier:
            # No tiers defined, use campaign default
            return CommissionService._calculate_from_campaign_default(conversion_event, campaign_version)
        
        commission_type = tier.reward_type
        commission_value = tier.reward_value
        
        if commission_type == 'percentage':
            commission_amount = (conversion_event.event_value or Decimal('0')) * (commission_value / Decimal('100'))
        else:  # flat
            commission_amount = commission_value
        
        return commission_amount, commission_type, commission_value
    
    @staticmethod
    def _calculate_from_campaign_default(
        conversion_event: ConversionEvent,
        campaign_version: CampaignVersion
    ) -> Tuple[Decimal, str, Decimal]:
        """Calculate commission from campaign default."""
        commission_type = campaign_version.default_commission_type
        commission_value = campaign_version.default_commission_value or Decimal('0')
        
        if commission_type == 'percentage':
            commission_amount = (conversion_event.event_value or Decimal('0')) * (commission_value / Decimal('100'))
        else:  # flat
            commission_amount = commission_value
        
        return commission_amount, commission_type, commission_value
    
    @staticmethod
    def _rule_applies(db: Session, conversion_event: ConversionEvent, rule: CommissionRule) -> bool:
        """
        Check if a commission rule applies to a conversion event.

        Args:
            db: Database session
            conversion_event: Conversion event
            rule: Commission rule

        Returns:
            True if rule applies
        """
        conditions = rule.conditions

        # Check date range
        if 'date_range' in conditions:
            date_range = conditions['date_range']
            start = datetime.fromisoformat(date_range.get('start', '2000-01-01'))
            end = datetime.fromisoformat(date_range.get('end', '2099-12-31'))

            if not (start <= conversion_event.occurred_at <= end):
                return False

        # Check minimum event value
        if 'min_event_value' in conditions:
            min_value = Decimal(str(conditions['min_event_value']))
            if (conversion_event.event_value or Decimal('0')) < min_value:
                return False

        # Check event types
        if 'event_types' in conditions:
            allowed_event_types = conditions.get('event_types', [])
            if allowed_event_types:
                # Check if conversion event type is in allowed list
                from app.models import ConversionEventType
                event_type = db.query(ConversionEventType).filter(
                    ConversionEventType.conversion_event_type_id == conversion_event.conversion_event_type_id
                ).first()

                if not event_type or event_type.name not in allowed_event_types:
                    return False

        # Check partner tiers
        if 'partner_tiers' in conditions:
            allowed_tiers = conditions.get('partner_tiers', [])
            if allowed_tiers:
                # Get partner's tier
                partner = db.query(Partner).filter(
                    Partner.partner_id == conversion_event.partner_id
                ).first()

                if not partner or not hasattr(partner, 'tier') or partner.tier not in allowed_tiers:
                    return False

        # Check if first purchase
        if 'is_first_purchase' in conditions:
            check_first_purchase = conditions.get('is_first_purchase', False)
            if check_first_purchase:
                # Check if this customer has made a previous purchase
                previous_conversions = db.query(ConversionEvent).filter(
                    ConversionEvent.customer_email == conversion_event.customer_email,
                    ConversionEvent.status.in_(['approved', 'paid']),
                    ConversionEvent.conversion_event_id != conversion_event.conversion_event_id,
                    ConversionEvent.occurred_at < conversion_event.occurred_at,
                    ConversionEvent.is_deleted == False
                ).count()

                # If check_first_purchase is True, rule only applies to first purchases (no previous)
                # If check_first_purchase is False, rule applies to repeat purchases (has previous)
                if check_first_purchase and previous_conversions > 0:
                    return False
                elif not check_first_purchase and previous_conversions == 0:
                    return False

        return True
    
    @staticmethod
    def create_commission_snapshot(
        db: Session,
        conversion_event: ConversionEvent,
        commission_amount: Decimal,
        commission_type: str,
        commission_value: Decimal,
        reward_id: Optional[int] = None,
        commission_rule_id: Optional[int] = None
    ) -> EventCommissionSnapshot:
        """
        Create an immutable commission snapshot for audit trail.
        
        Args:
            db: Database session
            conversion_event: Conversion event
            commission_amount: Calculated commission amount
            commission_type: Commission type used
            commission_value: Commission value/rate used
            reward_id: Optional reward ID
            commission_rule_id: Optional rule ID
            
        Returns:
            Created EventCommissionSnapshot
        """
        snapshot = EventCommissionSnapshot(
            conversion_event_id=conversion_event.conversion_event_id,
            commission_type=commission_type,
            commission_value=commission_value,
            commission_amount=commission_amount,
            partner_id=conversion_event.partner_id,
            campaign_version_id=conversion_event.campaign_version_id,
            reward_id=reward_id,
            commission_rule_id=commission_rule_id
        )
        
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)
        
        return snapshot
    
    @staticmethod
    def update_conversion_commission(
        db: Session,
        conversion_event: ConversionEvent,
        commission_amount: Decimal,
        commission_type: str,
        commission_value: Decimal,
        applied_rule_id: Optional[int] = None
    ):
        """
        Update conversion event with calculated commission.
        
        Args:
            db: Database session
            conversion_event: Conversion event to update
            commission_amount: Commission amount
            commission_type: Commission type
            commission_value: Commission value/rate
            applied_rule_id: Optional applied rule ID
        """
        conversion_event.commission_amount = commission_amount
        conversion_event.commission_type = commission_type
        conversion_event.commission_value = commission_value
        conversion_event.applied_commission_rule_id = applied_rule_id
        conversion_event.updated_at = datetime.utcnow()
        
        db.commit()
    
    @staticmethod
    def get_partner_commission_summary(
        db: Session,
        partner_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> dict:
        """
        Get commission summary for a partner.
        
        Args:
            db: Database session
            partner_id: Partner ID
            start_date: Optional start date filter
            end_date: Optional end date filter
            
        Returns:
            Dictionary with commission summary
        """
        from sqlalchemy import func
        
        query = db.query(
            func.count(ConversionEvent.conversion_event_id).label('total_conversions'),
            func.sum(ConversionEvent.event_value).label('total_revenue'),
            func.sum(ConversionEvent.commission_amount).label('total_commission')
        ).filter(
            ConversionEvent.partner_id == partner_id,
            ConversionEvent.is_deleted == False
        )
        
        if start_date:
            query = query.filter(ConversionEvent.occurred_at >= start_date)
        
        if end_date:
            query = query.filter(ConversionEvent.occurred_at <= end_date)
        
        # Group by status
        approved = query.filter(ConversionEvent.status == 'approved').first()
        pending = query.filter(ConversionEvent.status == 'pending').first()
        paid = query.filter(ConversionEvent.status == 'paid').first()
        
        return {
            'total_conversions': (approved.total_conversions or 0) + (pending.total_conversions or 0) + (paid.total_conversions or 0),
            'total_revenue': float((approved.total_revenue or 0) + (pending.total_revenue or 0) + (paid.total_revenue or 0)),
            'total_commission': float((approved.total_commission or 0) + (pending.total_commission or 0) + (paid.total_commission or 0)),
            'approved_commission': float(approved.total_commission or 0),
            'pending_commission': float(pending.total_commission or 0),
            'paid_commission': float(paid.total_commission or 0)
        }