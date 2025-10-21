"""
Pydantic schemas for request/response validation.

This module exports all schema models.
"""

from app.schemas.auth import (
    TokenPayload,
    Token,
    TokenRefresh,
    LoginRequest,
    PartnerRegisterRequest,
    VendorRegisterRequest,
    OAuthCallbackRequest,
    OAuthLoginResponse,
    PasswordChangeRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    AuthResponse
)

from app.schemas.partner import (
    PartnerTypeResponse,
    PartnerBase,
    PartnerCreate,
    PartnerUpdate,
    PartnerResponse,
    PartnerDetailResponse,
    PartnerStatsResponse,
    PartnerDashboardResponse
)

from app.schemas.vendor import (
    VendorBase,
    VendorCreate,
    VendorUpdate,
    VendorResponse,
    VendorDetailResponse,
    VendorUserBase,
    VendorUserCreate,
    VendorUserInvite,
    VendorUserUpdate,
    VendorUserResponse,
    VendorStatsResponse,
    VendorDashboardResponse,
    RegenerateAPIKeyResponse,
    RegenerateWebhookSecretResponse
)

from app.schemas.campaign import (
    CampaignTierBase,
    CampaignTierCreate,
    CampaignTierResponse,
    CampaignVersionBase,
    CampaignVersionCreate,
    CampaignVersionUpdate,
    CampaignVersionResponse,
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
    CampaignSummary,
    CampaignDetailResponse,
    CampaignPartnerApply,
    CampaignPartnerApprove,
    CampaignPartnerResponse,
    PartnerCampaignOverrideCreate,
    PartnerCampaignOverrideResponse,
    CampaignListRequest,
    CampaignListResponse
)

from app.schemas.tracking import (
    PartnerLinkBase,
    PartnerLinkCreate,
    PartnerLinkUpdate,
    PartnerLinkResponse,
    PartnerLinkDetailResponse,
    ClickResponse,
    CookieResponse,
    ContentPieceCreate,
    ContentPieceResponse,
    TrackingStatsRequest,
    TrackingStatsResponse
)

from app.schemas.commission import (
    ConversionEventTypeResponse,
    ConversionEventBase,
    ConversionEventCreate,
    ConversionEventUpdate,
    ConversionEventResponse,
    ConversionSummary,
    ConversionApproveRequest,
    RewardResponse,
    CommissionRuleResponse,
    TouchResponse,
    LeadCreate,
    LeadResponse,
    FunnelJourneyResponse,
    AttributionRequest,
    AttributionResponse
)

from app.schemas.payout import (
    PaymentProviderResponse,
    PartnerPaymentMethodCreate,
    PartnerPaymentMethodUpdate,
    PartnerPaymentMethodResponse,
    PayoutCreate,
    PayoutBulkCreate,
    PayoutProcessRequest,
    PayoutResponse,
    PayoutDetailResponse,
    PayoutStatsResponse,
    PayoutListRequest,
    PayoutListResponse
)

__all__ = [
    # Auth
    "TokenPayload",
    "Token",
    "TokenRefresh",
    "LoginRequest",
    "PartnerRegisterRequest",
    "VendorRegisterRequest",
    "OAuthCallbackRequest",
    "OAuthLoginResponse",
    "PasswordChangeRequest",
    "PasswordResetRequest",
    "PasswordResetConfirm",
    "AuthResponse",
    
    # Partner
    "PartnerTypeResponse",
    "PartnerCreate",
    "PartnerUpdate",
    "PartnerResponse",
    "PartnerDetailResponse",
    "PartnerStatsResponse",
    "PartnerDashboardResponse",
    
    # Vendor
    "VendorCreate",
    "VendorUpdate",
    "VendorResponse",
    "VendorDetailResponse",
    "VendorUserCreate",
    "VendorUserInvite",
    "VendorUserUpdate",
    "VendorUserResponse",
    "VendorStatsResponse",
    "VendorDashboardResponse",
    "RegenerateAPIKeyResponse",
    "RegenerateWebhookSecretResponse",
    
    # Campaign
    "CampaignTierCreate",
    "CampaignTierResponse",
    "CampaignVersionCreate",
    "CampaignVersionUpdate",
    "CampaignVersionResponse",
    "CampaignCreate",
    "CampaignUpdate",
    "CampaignResponse",
    "CampaignSummary",
    "CampaignDetailResponse",
    "CampaignPartnerApply",
    "CampaignPartnerApprove",
    "CampaignPartnerResponse",
    "PartnerCampaignOverrideCreate",
    "PartnerCampaignOverrideResponse",
    "CampaignListRequest",
    "CampaignListResponse",
    
    # Tracking
    "PartnerLinkCreate",
    "PartnerLinkUpdate",
    "PartnerLinkResponse",
    "PartnerLinkDetailResponse",
    "ClickResponse",
    "CookieResponse",
    "ContentPieceCreate",
    "ContentPieceResponse",
    "TrackingStatsRequest",
    "TrackingStatsResponse",
    
    # Commission
    "ConversionEventTypeResponse",
    "ConversionEventCreate",
    "ConversionEventUpdate",
    "ConversionEventResponse",
    "ConversionSummary",
    "ConversionApproveRequest",
    "RewardResponse",
    "CommissionRuleResponse",
    "TouchResponse",
    "LeadCreate",
    "LeadResponse",
    "FunnelJourneyResponse",
    "AttributionRequest",
    "AttributionResponse",
    
    # Payout
    "PaymentProviderResponse",
    "PartnerPaymentMethodCreate",
    "PartnerPaymentMethodUpdate",
    "PartnerPaymentMethodResponse",
    "PayoutCreate",
    "PayoutBulkCreate",
    "PayoutProcessRequest",
    "PayoutResponse",
    "PayoutDetailResponse",
    "PayoutStatsResponse",
    "PayoutListRequest",
    "PayoutListResponse",
]