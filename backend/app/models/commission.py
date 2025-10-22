from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, BigInteger, Numeric, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.models.base import BaseModel, GUID


class ConversionEventType(BaseModel):
    """Catalog of trackable conversion events."""
    
    __tablename__ = "conversion_event_types"
    
    conversion_event_type_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(255), nullable=False)
    description = Column(Text)
    is_commissionable = Column(Boolean, default=False)
    default_commission_type = Column(String(50))
    default_commission_value = Column(Numeric(10, 2))
    sort_order = Column(Integer, default=0)
    
    # Relationships
    conversion_events = relationship("ConversionEvent", back_populates="conversion_event_type")
    
    def __repr__(self):
        return f"<ConversionEventType {self.name}>"


class ConversionEvent(BaseModel):
    """Tracked conversion action (sale, signup, etc.)."""
    
    __tablename__ = "conversion_events"
    
    conversion_event_id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    lead_id = Column(BigInteger, ForeignKey("leads.lead_id"))
    conversion_event_type_id = Column(Integer, ForeignKey("conversion_event_types.conversion_event_type_id"), nullable=False)
    click_id = Column(BigInteger, ForeignKey("clicks.click_id"), index=True)
    cookie_id = Column(GUID(), ForeignKey("cookies.cookie_id"), index=True)
    partner_id = Column(Integer, ForeignKey("partners.partner_id"), nullable=False, index=True)
    campaign_version_id = Column(Integer, ForeignKey("campaign_versions.campaign_version_id"), nullable=False, index=True)
    reward_id = Column(Integer, ForeignKey("rewards.reward_id"))
    attribution_type = Column(String(50), nullable=False)  # first_click, last_click, linear, time_decay
    attribution_confidence = Column(String(50), default='high')  # high, medium, low
    transaction_id = Column(String(255), index=True)
    customer_email = Column(String(255))
    customer_id = Column(String(255))
    event_value = Column(Numeric(10, 2))
    commission_amount = Column(Numeric(10, 2))
    commission_type = Column(String(50))
    commission_value = Column(Numeric(10, 2))
    status = Column(String(50), default='pending', index=True)  # pending, approved, rejected, paid
    occurred_at = Column(DateTime, default=datetime.utcnow, index=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime)
    rejected_at = Column(DateTime)
    rejection_reason = Column(Text)
    event_metadata = Column(JSON)
    funnel_journey_id = Column(Integer, ForeignKey("funnel_journeys.funnel_journey_id"))
    applied_commission_rule_id = Column(Integer, ForeignKey("commission_rules.commission_rule_id"))
    
    # Relationships
    lead = relationship("Lead", back_populates="conversion_events")
    conversion_event_type = relationship("ConversionEventType", back_populates="conversion_events")
    click = relationship("Click", back_populates="conversion_events")
    cookie = relationship("Cookie", back_populates="conversion_events")
    partner = relationship("Partner", back_populates="conversion_events")
    campaign_version = relationship("CampaignVersion")
    reward = relationship("Reward")
    funnel_journey = relationship("FunnelJourney", back_populates="conversion_events")
    applied_commission_rule = relationship("CommissionRule")
    touches = relationship("Touch", back_populates="conversion_event")
    commission_snapshot = relationship("EventCommissionSnapshot", back_populates="conversion_event", uselist=False)
    payout_events = relationship("PayoutEvent", back_populates="conversion_event")
    
    def __repr__(self):
        return f"<ConversionEvent {self.conversion_event_id} - {self.status}>"
    
    def approve(self):
        """Approve conversion for payout."""
        self.status = 'approved'
        self.approved_at = datetime.utcnow()
    
    def reject(self, reason: str):
        """Reject conversion."""
        self.status = 'rejected'
        self.rejected_at = datetime.utcnow()
        self.rejection_reason = reason
    
    def mark_paid(self):
        """Mark conversion as paid."""
        self.status = 'paid'


class Touch(BaseModel):
    """Individual touchpoint in multi-touch attribution."""
    
    __tablename__ = "touches"
    
    touch_id = Column(BigInteger, primary_key=True, index=True)
    conversion_event_id = Column(BigInteger, ForeignKey("conversion_events.conversion_event_id"), index=True)
    lead_id = Column(BigInteger, ForeignKey("leads.lead_id"))
    click_id = Column(BigInteger, ForeignKey("clicks.click_id"))
    cookie_id = Column(GUID(), ForeignKey("cookies.cookie_id"))
    partner_id = Column(Integer, ForeignKey("partners.partner_id"), nullable=False, index=True)
    campaign_version_id = Column(Integer, ForeignKey("campaign_versions.campaign_version_id"), nullable=False, index=True)
    touch_type = Column(String(50), nullable=False)  # first, middle, last, only
    touch_value = Column(Numeric(10, 2))
    attribution_type = Column(String(50), nullable=False)
    attribution_confidence = Column(String(50), default='high')
    event_metadata = Column(JSON, default={})
    occurred_at = Column(DateTime, default=datetime.utcnow, index=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    conversion_event = relationship("ConversionEvent", back_populates="touches")
    lead = relationship("Lead")
    click = relationship("Click", back_populates="touches")
    cookie = relationship("Cookie")
    partner = relationship("Partner")
    campaign_version = relationship("CampaignVersion")
    
    def __repr__(self):
        return f"<Touch {self.touch_id} - {self.touch_type}>"


class Lead(BaseModel):
    """Potential customer generated by partners."""
    
    __tablename__ = "leads"
    
    lead_id = Column(BigInteger, primary_key=True, index=True)
    external_lead_id = Column(String(255), unique=True, nullable=False)
    partner_id = Column(Integer, ForeignKey("partners.partner_id"), index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.vendor_id"), index=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    email = Column(String(255), index=True)
    phone = Column(String(50))
    status = Column(String(50), default='new')  # new, contacted, qualified, converted, lost
    
    # Relationships
    partner = relationship("Partner")
    vendor = relationship("Vendor")
    conversion_events = relationship("ConversionEvent", back_populates="lead")
    
    def __repr__(self):
        return f"<Lead {self.external_lead_id} - {self.status}>"


class FunnelJourney(BaseModel):
    """Complete customer journey from first click to conversion."""
    
    __tablename__ = "funnel_journeys"
    
    funnel_journey_id = Column(Integer, primary_key=True, index=True)
    cookie_id = Column(GUID(), ForeignKey("cookies.cookie_id"), unique=True, nullable=False)
    partner_id = Column(Integer, ForeignKey("partners.partner_id"), nullable=False, index=True)
    campaign_version_id = Column(Integer, ForeignKey("campaign_versions.campaign_version_id"), nullable=False)
    customer_id = Column(String(255))
    customer_email = Column(String(255))
    session_id = Column(String(36))
    journey_started_at = Column(DateTime, nullable=False)
    journey_completed_at = Column(DateTime)
    last_event_at = Column(DateTime, nullable=False)
    total_events = Column(Integer, default=0)
    total_commission = Column(Numeric(10, 2), default=0)
    furthest_stage_id = Column(Integer, ForeignKey("conversion_event_types.conversion_event_type_id"))
    is_converted = Column(Boolean, default=False, index=True)
    events_sequence = Column(JSON, default=[])
    attribution_map = Column(JSON, default={})
    
    # Relationships
    cookie = relationship("Cookie", back_populates="funnel_journey")
    partner = relationship("Partner")
    campaign_version = relationship("CampaignVersion")
    furthest_stage = relationship("ConversionEventType", foreign_keys=[furthest_stage_id])
    conversion_events = relationship("ConversionEvent", back_populates="funnel_journey")
    
    def __repr__(self):
        return f"<FunnelJourney {self.funnel_journey_id} - converted={self.is_converted}>"


class Reward(BaseModel):
    """Reusable reward definitions."""
    
    __tablename__ = "rewards"
    
    reward_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    reward_type = Column(String(20), nullable=False)  # flat, percentage
    reward_value = Column(Numeric(10, 2))
    
    # Relationships
    conversion_events = relationship("ConversionEvent", back_populates="reward")
    
    def __repr__(self):
        return f"<Reward {self.name}>"


class CommissionRule(BaseModel):
    """Business logic rules for dynamic commission calculation."""
    
    __tablename__ = "commission_rules"
    
    commission_rule_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    active = Column(Boolean, default=True)
    conditions = Column(JSON, nullable=False)
    actions = Column(JSON, nullable=False)
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)
    
    # Relationships
    conversion_events = relationship("ConversionEvent", back_populates="applied_commission_rule")
    
    def __repr__(self):
        return f"<CommissionRule {self.name}>"
    
    def is_active(self) -> bool:
        """Check if rule is currently active."""
        if not self.active or self.is_deleted:
            return False
        
        now = datetime.utcnow()
        if self.valid_from > now:
            return False
        if self.valid_until and self.valid_until < now:
            return False
        
        return True


class EventCommissionSnapshot(BaseModel):
    """Historical record of commission calculations (audit trail)."""
    
    __tablename__ = "event_commission_snapshots"
    
    event_commission_snapshot_id = Column(Integer, primary_key=True, index=True)
    conversion_event_id = Column(BigInteger, ForeignKey("conversion_events.conversion_event_id"), nullable=False, index=True)
    commission_type = Column(String(50))
    commission_value = Column(Numeric(10, 2))
    commission_amount = Column(Numeric(10, 2))
    partner_id = Column(Integer, ForeignKey("partners.partner_id"), nullable=False)
    campaign_version_id = Column(Integer, ForeignKey("campaign_versions.campaign_version_id"), nullable=False)
    reward_id = Column(Integer, ForeignKey("rewards.reward_id"))
    commission_rule_id = Column(Integer, ForeignKey("commission_rules.commission_rule_id"))
    
    # Relationships
    conversion_event = relationship("ConversionEvent", back_populates="commission_snapshot")
    partner = relationship("Partner")
    campaign_version = relationship("CampaignVersion")
    reward = relationship("Reward")
    commission_rule = relationship("CommissionRule")
    
    def __repr__(self):
        return f"<EventCommissionSnapshot {self.event_commission_snapshot_id} - ${self.commission_amount}>"