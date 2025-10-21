from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class PartnerLinkBase(BaseModel):
    """Base partner link schema."""
    link_label: Optional[str] = Field(None, max_length=255)
    custom_params: Optional[Dict[str, Any]] = {}
    utm_params: Optional[Dict[str, str]] = {}


class PartnerLinkCreate(PartnerLinkBase):
    """Create partner link request."""
    campaign_partner_id: int
    content_piece_id: Optional[int] = None


class PartnerLinkUpdate(BaseModel):
    """Update partner link request."""
    link_label: Optional[str] = None
    custom_params: Optional[Dict[str, Any]] = None
    utm_params: Optional[Dict[str, str]] = None


class PartnerLinkResponse(PartnerLinkBase):
    """Partner link response."""
    partner_link_id: int
    campaign_partner_id: int
    short_code: str
    full_url: str
    tracking_url: str
    content_piece_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class PartnerLinkDetailResponse(PartnerLinkResponse):
    """Detailed partner link response with stats."""
    total_clicks: int = 0
    total_conversions: int = 0
    conversion_rate: float = 0.0
    total_revenue: float = 0.0
    total_commission: float = 0.0


class ClickResponse(BaseModel):
    """Click response."""
    click_id: int
    partner_link_id: int
    cookie_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    referrer_url: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    country_code: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    clicked_at: datetime
    
    class Config:
        from_attributes = True


class CookieResponse(BaseModel):
    """Cookie response."""
    cookie_id: UUID
    first_partner_id: Optional[int] = None
    last_partner_id: Optional[int] = None
    expires_at: datetime
    last_seen_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class ContentPieceBase(BaseModel):
    """Base content piece schema."""
    external_reference: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}


class ContentPieceCreate(ContentPieceBase):
    """Create content piece request."""
    partner_id: int


class ContentPieceResponse(ContentPieceBase):
    """Content piece response."""
    content_piece_id: int
    partner_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TrackingStatsRequest(BaseModel):
    """Tracking statistics request."""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    partner_link_id: Optional[int] = None
    campaign_id: Optional[int] = None


class TrackingStatsResponse(BaseModel):
    """Tracking statistics response."""
    total_clicks: int
    unique_clicks: int
    total_conversions: int
    conversion_rate: float
    clicks_by_date: Dict[str, int]
    clicks_by_device: Dict[str, int]
    clicks_by_country: Dict[str, int]
    top_referrers: list[Dict[str, Any]]