from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from uuid import UUID


class ConversionEventTypeResponse(BaseModel):
    """Conversion event type response."""
    conversion_event_type_id: int
    name: str
    display_name: str
    description: Optional[str] = None
    is_commissionable: bool
    default_commission_type: Optional[str] = None
    default_commission_value: Optional[Decimal] = None
    
    class Config:
        from_attributes = True


class ConversionEventBase(BaseModel):
    """Base conversion event schema."""
    transaction_id: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_id: Optional[str] = None
    event_value: Optional[Decimal] = Field(None, ge=0)
    metadata: Optional[Dict[str, Any]] = {}


class ConversionEventCreate(ConversionEventBase):
    """Create conversion event request."""
    conversion_event_type_id: int
    click_id: Optional[int] = None
    cookie_id: Optional[UUID] = None
    partner_id: int
    campaign_version_id: int


class ConversionEventUpdate(BaseModel):
    """Update conversion event request."""
    status: Optional[str] = Field(None, pattern="^(pending|approved|rejected|paid)$")
    rejection_reason: Optional[str] = None


class ConversionEventResponse(ConversionEventBase):
    """Conversion event response."""
    conversion_event_id: int
    conversion_event_type_id: int
    conversion_event_type_name: str
    click_id: Optional[int] = None
    cookie_id: Optional[UUID] = None
    partner_id: int
    partner_name: str
    campaign_version_id: int
    campaign_name: str
    attribution_type: str
    attribution_confidence: str
    commission_amount: Optional[Decimal] = None
    commission_type: Optional[str] = None
    commission_value: Optional[Decimal] = None
    status: str
    occurred_at: datetime
    recorded_at: datetime
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    class Config:
        from_attributes = True


class ConversionSummary(BaseModel):
    """Conversion summary for listings."""
    conversion_event_id: int
    transaction_id: Optional[str] = None
    event_type: str
    event_value: Optional[Decimal] = None
    commission_amount: Optional[Decimal] = None
    status: str
    occurred_at: datetime


class ConversionApproveRequest(BaseModel):
    """Approve conversion request."""
    approved: bool = True
    rejection_reason: Optional[str] = None


class RewardResponse(BaseModel):
    """Reward response."""
    reward_id: int
    name: str
    reward_type: str
    reward_value: Decimal
    created_at: datetime
    
    class Config:
        from_attributes = True


class CommissionRuleResponse(BaseModel):
    """Commission rule response."""
    commission_rule_id: int
    name: str
    description: Optional[str] = None
    active: bool
    conditions: Dict[str, Any]
    actions: Dict[str, Any]
    valid_from: datetime
    valid_until: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class TouchResponse(BaseModel):
    """Touch response."""
    touch_id: int
    conversion_event_id: Optional[int] = None
    click_id: Optional[int] = None
    partner_id: int
    campaign_version_id: int
    touch_type: str
    touch_value: Optional[Decimal] = None
    attribution_type: str
    occurred_at: datetime
    
    class Config:
        from_attributes = True


class LeadBase(BaseModel):
    """Base lead schema."""
    external_lead_id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class LeadCreate(LeadBase):
    """Create lead request."""
    partner_id: Optional[int] = None
    vendor_id: Optional[int] = None


class LeadResponse(LeadBase):
    """Lead response."""
    lead_id: int
    partner_id: Optional[int] = None
    vendor_id: Optional[int] = None
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class FunnelJourneyResponse(BaseModel):
    """Funnel journey response."""
    funnel_journey_id: int
    cookie_id: UUID
    partner_id: int
    campaign_version_id: int
    journey_started_at: datetime
    journey_completed_at: Optional[datetime] = None
    total_events: int
    total_commission: Decimal
    is_converted: bool
    events_sequence: list[Dict[str, Any]]
    attribution_map: Dict[str, Any]
    
    class Config:
        from_attributes = True


class AttributionRequest(BaseModel):
    """Attribution calculation request."""
    conversion_event_id: int
    attribution_type: str = Field(default='last_click', pattern="^(first_click|last_click|linear|time_decay)$")


class AttributionResponse(BaseModel):
    """Attribution calculation response."""
    conversion_event_id: int
    attribution_type: str
    touches: list[TouchResponse]
    total_commission: Decimal
    commission_breakdown: Dict[int, Decimal]  # partner_id -> commission_amount