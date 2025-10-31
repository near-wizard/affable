from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime

from app.models.base import BaseModel


class Campaign(BaseModel):
    """Campaign (marketing program) model."""
    
    __tablename__ = "campaigns"
    
    campaign_id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.vendor_id", ondelete="CASCADE"), nullable=False, index=True)
    current_campaign_version_id = Column(Integer, ForeignKey("campaign_versions.campaign_version_id"))
    status = Column(String(50), default='active', nullable=False, index=True)  # active, paused, archived
    
    # Relationships
    vendor = relationship("Vendor", back_populates="campaigns")
    versions = relationship("CampaignVersion", back_populates="campaign", foreign_keys="CampaignVersion.campaign_id")
    current_version = relationship("CampaignVersion", foreign_keys=[current_campaign_version_id], post_update=True)
    
    def __repr__(self):
        return f"<Campaign {self.campaign_id} - {self.status}>"


class CampaignVersion(BaseModel):
    """Campaign version with specific terms."""
    
    __tablename__ = "campaign_versions"
    
    campaign_version_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    destination_url = Column(Text, nullable=False)
    default_commission_type = Column(String(50), nullable=False)  # percentage, flat, tiered
    default_commission_value = Column(Numeric(10, 2))
    cookie_duration_days = Column(Integer, default=30)
    approval_required = Column(Boolean, default=False)
    is_public = Column(Boolean, default=True)
    max_partners = Column(Integer)
    terms_url = Column(Text)
    promotional_guidelines = Column(Text)
    attribution_model = Column(String(50), default="last_click", nullable=False)  # last_click, first_click, linear, time_decay
    
    # Relationships
    campaign = relationship("Campaign", back_populates="versions", foreign_keys=[campaign_id])
    tiers = relationship("CampaignTier", back_populates="campaign_version")
    campaign_partners = relationship("CampaignPartner", back_populates="campaign_version")
    partner_overrides = relationship("PartnerCampaignOverride", back_populates="campaign_version")
    
    def __repr__(self):
        return f"<CampaignVersion {self.name} v{self.version_number}>"
    
    def is_active(self) -> bool:
        """Check if this version is active."""
        return (
            not self.is_deleted and 
            self.campaign.status == 'active' and
            self.campaign.current_campaign_version_id == self.campaign_version_id
        )


class CampaignTier(BaseModel):
    """Tiered commission structure."""
    
    __tablename__ = "campaign_tiers"
    
    campaign_tier_id = Column(Integer, primary_key=True, index=True)
    campaign_version_id = Column(Integer, ForeignKey("campaign_versions.campaign_version_id", ondelete="CASCADE"), nullable=False, index=True)
    reward_id = Column(Integer, ForeignKey("rewards.reward_id"))
    label = Column(String(50), nullable=False)
    min_amount = Column(Numeric(10, 2), nullable=False)
    max_amount = Column(Numeric(10, 2), nullable=False)
    reward_type = Column(String(20), nullable=False)  # flat, percentage
    reward_value = Column(Numeric(10, 2), nullable=False)
    
    # Relationships
    campaign_version = relationship("CampaignVersion", back_populates="tiers")
    reward = relationship("Reward")
    
    def __repr__(self):
        return f"<CampaignTier {self.label}: ${self.min_amount}-${self.max_amount}>"
    
    def applies_to_amount(self, amount: float) -> bool:
        """Check if this tier applies to given amount."""
        return self.min_amount <= amount <= self.max_amount


class CampaignPartner(BaseModel):
    """Partner enrollment in campaign."""
    
    __tablename__ = "campaign_partners"
    
    campaign_partner_id = Column(Integer, primary_key=True, index=True)
    campaign_version_id = Column(Integer, ForeignKey("campaign_versions.campaign_version_id", ondelete="CASCADE"), nullable=False, index=True)
    partner_id = Column(Integer, ForeignKey("partners.partner_id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default='pending', nullable=False, index=True)  # pending, approved, rejected, removed
    application_note = Column(Text)
    applied_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime)
    rejected_at = Column(DateTime)
    rejection_reason = Column(Text)
    approved_by = Column(Integer, ForeignKey("vendor_users.vendor_user_id"))
    
    # Denormalized counters for performance
    total_clicks = Column(Integer, default=0)
    total_conversions = Column(Integer, default=0)
    total_revenue = Column(Numeric(10, 2), default=0)
    total_commission_earned = Column(Numeric(10, 2), default=0)
    last_click_at = Column(DateTime)
    last_conversion_at = Column(DateTime)
    
    # Relationships
    campaign_version = relationship("CampaignVersion", back_populates="campaign_partners")
    partner = relationship("Partner", back_populates="campaign_partners")
    approver = relationship("VendorUser", foreign_keys=[approved_by])
    partner_links = relationship("PartnerLink", back_populates="campaign_partner")
    
    def __repr__(self):
        return f"<CampaignPartner campaign={self.campaign_version_id} partner={self.partner_id} status={self.status}>"
    
    def approve(self, approved_by_user_id: int):
        """Approve partner enrollment."""
        self.status = 'approved'
        self.approved_at = datetime.utcnow()
        self.approved_by = approved_by_user_id
    
    def reject(self, reason: str):
        """Reject partner enrollment."""
        self.status = 'rejected'
        self.rejected_at = datetime.utcnow()
        self.rejection_reason = reason
    
    def is_approved(self) -> bool:
        """Check if enrollment is approved."""
        return self.status == 'approved' and not self.is_deleted


class PartnerCampaignOverride(BaseModel):
    """Custom commission rates for specific partners."""

    __tablename__ = "partner_campaign_overrides"

    partner_campaign_override_id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.partner_id", ondelete="CASCADE"), nullable=False, index=True)
    campaign_version_id = Column(Integer, ForeignKey("campaign_versions.campaign_version_id", ondelete="CASCADE"), nullable=False, index=True)
    conversion_event_type_id = Column(Integer, ForeignKey("conversion_event_types.conversion_event_type_id"))
    commission_type = Column(String(50), nullable=False)  # percentage, flat
    commission_value = Column(Numeric(10, 2), nullable=False)
    notes = Column(Text)
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)

    # Relationships
    partner = relationship("Partner")
    campaign_version = relationship("CampaignVersion", back_populates="partner_overrides")
    conversion_event_type = relationship("ConversionEventType")

    def __repr__(self):
        return f"<PartnerCampaignOverride partner={self.partner_id} campaign={self.campaign_version_id}>"

    def is_valid(self) -> bool:
        """Check if override is currently valid."""
        now = datetime.utcnow()
        return (
            not self.is_deleted and
            self.valid_from <= now and
            (self.valid_until is None or self.valid_until >= now)
        )


class PartnerInvitation(BaseModel):
    """Partner invitation to join a campaign."""

    __tablename__ = "partner_invitations"

    partner_invitation_id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.campaign_id", ondelete="CASCADE"), nullable=False, index=True)
    partner_id = Column(Integer, ForeignKey("partners.partner_id", ondelete="CASCADE"), nullable=False, index=True)
    invited_by = Column(Integer, ForeignKey("vendor_users.vendor_user_id"), nullable=False)
    status = Column(String(50), default='pending', nullable=False, index=True)  # pending, accepted, declined, expired
    invitation_message = Column(Text)
    invited_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    accepted_at = Column(DateTime)
    declined_at = Column(DateTime)
    declined_reason = Column(Text)
    expires_at = Column(DateTime, nullable=False)  # 30 days from invitation by default

    # Relationships
    campaign = relationship("Campaign")
    partner = relationship("Partner")
    inviter = relationship("VendorUser", foreign_keys=[invited_by])

    def __repr__(self):
        return f"<PartnerInvitation campaign={self.campaign_id} partner={self.partner_id} status={self.status}>"

    def accept(self):
        """Accept the invitation."""
        self.status = 'accepted'
        self.accepted_at = datetime.utcnow()

    def decline(self, reason: str = None):
        """Decline the invitation."""
        self.status = 'declined'
        self.declined_at = datetime.utcnow()
        self.declined_reason = reason

    def is_pending(self) -> bool:
        """Check if invitation is still pending."""
        return self.status == 'pending' and datetime.utcnow() < self.expires_at and not self.is_deleted

    def is_expired(self) -> bool:
        """Check if invitation has expired."""
        return self.status == 'pending' and datetime.utcnow() >= self.expires_at