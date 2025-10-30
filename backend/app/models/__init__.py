"""
Database models for the Affiliate Tracking Platform.

This module exports all SQLAlchemy ORM models.
"""

from app.models.base import BaseModel, TimestampMixin, SoftDeleteMixin, GUID
from app.models.vendor import Vendor, VendorUser
from app.models.partner import Partner, PartnerType
from app.models.campaign import (
    Campaign,
    CampaignVersion,
    CampaignTier,
    CampaignPartner,
    PartnerCampaignOverride
)
from app.models.tracking import (
    PartnerLink,
    Cookie,
    Click,
    ContentPiece
)
from app.models.commission import (
    ConversionEventType,
    ConversionEvent,
    Touch,
    Lead,
    FunnelJourney,
    Reward,
    CommissionRule,
    EventCommissionSnapshot
)
from app.models.payout import (
    PaymentProvider,
    PartnerPaymentMethod,
    Payout,
    PayoutEvent,
    AuditLog
)
from app.models.billing import (
    SubscriptionPlan,
    SubscriptionPlanEnum,
    BillingCycleEnum,
    SubscriptionStatus,
    InvoiceStatus,
    VendorSubscription,
    VendorInvoice,
    VendorInvoiceItem,
    GMVFee,
    GMVConversion,
    InvoiceAdjustment,
    PaymentTransaction
)

__all__ = [
    # Base
    "BaseModel",
    "TimestampMixin",
    "SoftDeleteMixin",
    "GUID",
    
    # Vendor
    "Vendor",
    "VendorUser",
    
    # Partner
    "Partner",
    "PartnerType",
    
    # Campaign
    "Campaign",
    "CampaignVersion",
    "CampaignTier",
    "CampaignPartner",
    "PartnerCampaignOverride",
    
    # Tracking
    "PartnerLink",
    "Cookie",
    "Click",
    "ContentPiece",
    
    # Commission
    "ConversionEventType",
    "ConversionEvent",
    "Touch",
    "Lead",
    "FunnelJourney",
    "Reward",
    "CommissionRule",
    "EventCommissionSnapshot",
    
    # Payout
    "PaymentProvider",
    "PartnerPaymentMethod",
    "Payout",
    "PayoutEvent",
    "AuditLog",

    # Billing
    "SubscriptionPlan",
    "SubscriptionPlanEnum",
    "BillingCycleEnum",
    "SubscriptionStatus",
    "InvoiceStatus",
    "VendorSubscription",
    "VendorInvoice",
    "VendorInvoiceItem",
    "GMVFee",
    "GMVConversion",
    "InvoiceAdjustment",
    "PaymentTransaction",
]