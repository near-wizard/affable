from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class PartnerTypeBase(BaseModel):
    """Base partner type schema."""
    name: str
    description: Optional[str] = None


class PartnerTypeResponse(PartnerTypeBase):
    """Partner type response."""
    partner_type_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class PartnerBase(BaseModel):
    """Base partner schema."""
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    bio: Optional[str] = None
    website_url: Optional[str] = None


class PartnerCreate(PartnerBase):
    """Create partner request."""
    password: str = Field(..., min_length=8)
    type_ids: Optional[List[int]] = []


class PartnerUpdate(BaseModel):
    """Update partner request."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    bio: Optional[str] = None
    website_url: Optional[str] = None
    type_ids: Optional[List[int]] = None


class PartnerResponse(PartnerBase):
    """Partner response."""
    partner_id: int
    status: str
    tier: str
    types: List[PartnerTypeResponse] = []
    oauth_provider: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PartnerDetailResponse(PartnerResponse):
    """Detailed partner response with statistics."""
    total_campaigns: int = 0
    total_clicks: int = 0
    total_conversions: int = 0
    total_revenue: Decimal = Decimal('0.00')
    total_commission_earned: Decimal = Decimal('0.00')
    pending_payout: Decimal = Decimal('0.00')


class PartnerStatsResponse(BaseModel):
    """Partner performance statistics."""
    partner_id: int
    total_campaigns: int
    total_clicks: int
    total_conversions: int
    total_revenue: Decimal
    total_commission_earned: Decimal
    conversion_rate: float
    average_order_value: Decimal
    pending_commission: Decimal
    paid_commission: Decimal
    last_click_at: Optional[datetime] = None
    last_conversion_at: Optional[datetime] = None


class PartnerDashboardResponse(BaseModel):
    """Partner dashboard summary."""
    partner: PartnerResponse
    stats: PartnerStatsResponse
    recent_campaigns: List["CampaignSummary"]
    recent_conversions: List["ConversionSummary"]
    
    class Config:
        from_attributes = True


# Forward references for circular imports
from app.schemas.campaign import CampaignSummary
from app.schemas.commission import ConversionSummary

PartnerDashboardResponse.model_rebuild()