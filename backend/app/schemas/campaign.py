from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


class CampaignTierBase(BaseModel):
    """Base campaign tier schema."""
    label: str = Field(..., max_length=50)
    min_amount: Decimal = Field(..., ge=0)
    max_amount: Decimal = Field(..., gt=0)
    reward_type: str = Field(..., pattern="^(flat|percentage)$")
    reward_value: Decimal = Field(..., gt=0)


class CampaignTierCreate(CampaignTierBase):
    """Create campaign tier request."""
    reward_id: Optional[int] = None


class CampaignTierResponse(CampaignTierBase):
    """Campaign tier response."""
    campaign_tier_id: int
    campaign_version_id: int
    reward_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class CampaignVersionBase(BaseModel):
    """Base campaign version schema."""
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    destination_url: str
    default_commission_type: str = Field(..., pattern="^(percentage|flat|tiered)$")
    default_commission_value: Optional[Decimal] = Field(None, ge=0)
    cookie_duration_days: int = Field(default=30, ge=1, le=365)
    approval_required: bool = False
    is_public: bool = True
    max_partners: Optional[int] = Field(None, gt=0)
    terms_url: Optional[str] = None
    promotional_guidelines: Optional[str] = None


class CampaignVersionCreate(CampaignVersionBase):
    """Create campaign version request."""
    tiers: Optional[List[CampaignTierCreate]] = []


class CampaignVersionUpdate(BaseModel):
    """Update campaign version request."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    destination_url: Optional[str] = None
    default_commission_type: Optional[str] = Field(None, pattern="^(percentage|flat|tiered)$")
    default_commission_value: Optional[Decimal] = None
    cookie_duration_days: Optional[int] = Field(None, ge=1, le=365)
    approval_required: Optional[bool] = None
    is_public: Optional[bool] = None
    max_partners: Optional[int] = None
    terms_url: Optional[str] = None
    promotional_guidelines: Optional[str] = None


class CampaignVersionResponse(CampaignVersionBase):
    """Campaign version response."""
    campaign_version_id: int
    campaign_id: int
    version_number: int
    tiers: List[CampaignTierResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CampaignBase(BaseModel):
    """Base campaign schema."""
    status: str = Field(default='active', pattern="^(active|paused|archived)$")


class CampaignCreate(BaseModel):
    """Create campaign request."""
    version: CampaignVersionCreate


class CampaignUpdate(BaseModel):
    """Update campaign request."""
    status: Optional[str] = Field(None, pattern="^(active|paused|archived)$")


class CampaignResponse(BaseModel):
    """Campaign response."""
    campaign_id: int
    vendor_id: int
    status: str
    current_version: Optional[CampaignVersionResponse] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CampaignSummary(BaseModel):
    """Campaign summary for listings."""
    campaign_id: int
    vendor_id: int
    name: str
    status: str
    commission_type: str
    commission_value: Optional[Decimal]
    total_partners: int = 0
    total_clicks: int = 0
    total_conversions: int = 0
    created_at: datetime


class CampaignDetailResponse(CampaignResponse):
    """Detailed campaign response with stats."""
    total_partners: int = 0
    approved_partners: int = 0
    pending_partners: int = 0
    total_clicks: int = 0
    total_conversions: int = 0
    total_revenue: Decimal = Decimal('0.00')
    total_commission_paid: Decimal = Decimal('0.00')
    conversion_rate: float = 0.0


class CampaignPartnerBase(BaseModel):
    """Base campaign partner schema."""
    application_note: Optional[str] = None


class CampaignPartnerApply(CampaignPartnerBase):
    """Partner application to campaign."""
    campaign_version_id: int


class CampaignPartnerApprove(BaseModel):
    """Approve partner application."""
    approved: bool = True
    rejection_reason: Optional[str] = None


class CampaignPartnerResponse(BaseModel):
    """Campaign partner response."""
    campaign_partner_id: int
    campaign_version_id: int
    partner_id: int
    partner_name: str
    partner_email: str
    partner_tier: str
    status: str
    application_note: Optional[str] = None
    applied_at: datetime
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    total_clicks: int = 0
    total_conversions: int = 0
    total_revenue: Decimal = Decimal('0.00')
    total_commission_earned: Decimal = Decimal('0.00')
    last_click_at: Optional[datetime] = None
    last_conversion_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PartnerCampaignOverrideBase(BaseModel):
    """Base partner campaign override schema."""
    commission_type: str = Field(..., pattern="^(percentage|flat)$")
    commission_value: Decimal = Field(..., gt=0)
    notes: Optional[str] = None
    valid_from: datetime = Field(default_factory=datetime.utcnow)
    valid_until: Optional[datetime] = None


class PartnerCampaignOverrideCreate(PartnerCampaignOverrideBase):
    """Create partner campaign override."""
    partner_id: int
    campaign_version_id: int
    conversion_event_type_id: Optional[int] = None


class PartnerCampaignOverrideResponse(PartnerCampaignOverrideBase):
    """Partner campaign override response."""
    partner_campaign_override_id: int
    partner_id: int
    campaign_version_id: int
    conversion_event_type_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class CampaignListRequest(BaseModel):
    """Campaign list filter request."""
    status: Optional[str] = None
    is_public: Optional[bool] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class CampaignListResponse(BaseModel):
    """Paginated campaign list response."""
    campaigns: List[CampaignSummary]
    total: int
    page: int
    page_size: int
    total_pages: int


class CampaignPartnerListResponse(BaseModel):
    """Paginated campaign partners list response."""
    data: List['CampaignPartnerResponse']
    total: int
    page: int
    limit: int
    total_pages: int


class PartnerInvitationBase(BaseModel):
    """Base partner invitation schema."""
    invitation_message: Optional[str] = None


class PartnerInvitationCreate(PartnerInvitationBase):
    """Create partner invitation request."""
    campaign_id: int
    partner_id: int


class PartnerInvitationResponse(PartnerInvitationBase):
    """Partner invitation response."""
    partner_invitation_id: int
    campaign_id: int
    partner_id: int
    partner_name: str
    partner_email: str
    campaign_name: str
    status: str
    invited_at: datetime
    accepted_at: Optional[datetime] = None
    declined_at: Optional[datetime] = None
    declined_reason: Optional[str] = None
    expires_at: datetime

    class Config:
        from_attributes = True


class PartnerInvitationAccept(BaseModel):
    """Accept partner invitation request."""
    invitation_id: int


class PartnerInvitationDecline(BaseModel):
    """Decline partner invitation request."""
    invitation_id: int
    reason: Optional[str] = None


class PartnerInvitationListResponse(BaseModel):
    """Paginated partner invitations list response."""
    data: List[PartnerInvitationResponse]
    total: int
    page: int
    limit: int
    total_pages: int