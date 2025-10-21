from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class VendorBase(BaseModel):
    """Base vendor schema."""
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    company_name: str = Field(..., min_length=2, max_length=255)
    website_url: str


class VendorCreate(VendorBase):
    """Create vendor request."""
    password: str = Field(..., min_length=8)


class VendorUpdate(BaseModel):
    """Update vendor request."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    company_name: Optional[str] = None
    website_url: Optional[str] = None
    webhook_url: Optional[str] = None
    status: Optional[str] = None


class VendorResponse(VendorBase):
    """Vendor response."""
    vendor_id: int
    status: str
    api_key: Optional[str] = None
    webhook_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class VendorDetailResponse(VendorResponse):
    """Detailed vendor response with stats."""
    total_campaigns: int = 0
    total_partners: int = 0
    total_conversions: int = 0
    total_revenue: Decimal = Decimal('0.00')
    total_commission_paid: Decimal = Decimal('0.00')


class VendorUserBase(BaseModel):
    """Base vendor user schema."""
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=255)
    role: str = Field(..., pattern="^(owner|admin|manager|member)$")


class VendorUserCreate(VendorUserBase):
    """Create vendor user request."""
    password: Optional[str] = Field(None, min_length=8)


class VendorUserInvite(BaseModel):
    """Invite vendor user request."""
    email: EmailStr
    name: str
    role: str = Field(..., pattern="^(owner|admin|manager|member)$")


class VendorUserUpdate(BaseModel):
    """Update vendor user request."""
    name: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(owner|admin|manager|member)$")
    status: Optional[str] = Field(None, pattern="^(active|inactive|pending)$")


class VendorUserResponse(VendorUserBase):
    """Vendor user response."""
    vendor_user_id: int
    vendor_id: int
    status: str
    invited_by: Optional[int] = None
    invited_at: Optional[datetime] = None
    joined_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    oauth_provider: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class VendorStatsResponse(BaseModel):
    """Vendor performance statistics."""
    vendor_id: int
    total_campaigns: int
    active_campaigns: int
    total_partners: int
    approved_partners: int
    total_clicks: int
    total_conversions: int
    pending_conversions: int
    total_revenue: Decimal
    total_commission_owed: Decimal
    total_commission_paid: Decimal
    conversion_rate: float
    average_order_value: Decimal


class VendorDashboardResponse(BaseModel):
    """Vendor dashboard summary."""
    vendor: VendorResponse
    stats: VendorStatsResponse
    recent_campaigns: List["CampaignSummary"]
    pending_approvals: int
    recent_conversions: List["ConversionSummary"]
    
    class Config:
        from_attributes = True


class RegenerateAPIKeyResponse(BaseModel):
    """Response after regenerating API key."""
    api_key: str
    message: str = "API key regenerated successfully. Store this securely - it will not be shown again."


class RegenerateWebhookSecretResponse(BaseModel):
    """Response after regenerating webhook secret."""
    webhook_secret: str
    message: str = "Webhook secret regenerated successfully. Update your webhook configuration with this secret."


# Forward references
from app.schemas.campaign import CampaignSummary
from app.schemas.commission import ConversionSummary

VendorDashboardResponse.model_rebuild()