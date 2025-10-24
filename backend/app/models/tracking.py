from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, BigInteger, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.models.base import BaseModel, GUID


class PartnerLink(BaseModel):
    """Trackable URLs generated for partners."""

    __tablename__ = "partner_links"

    partner_link_id = Column(Integer, primary_key=True, index=True)
    campaign_partner_id = Column(Integer, ForeignKey("campaign_partners.campaign_partner_id", ondelete="CASCADE"), nullable=False, index=True)
    short_code = Column(String(50), unique=True, nullable=False, index=True)
    full_url = Column(Text, nullable=False)
    custom_params = Column(JSON)
    utm_params = Column(JSON)
    link_label = Column(String(255))
    content_piece_id = Column(Integer, ForeignKey("content_pieces.content_piece_id"))

    # Link lifecycle management
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=True, index=True)  # Optional expiration date
    deactivated_at = Column(DateTime, nullable=True)  # When link was manually deactivated
    deactivation_reason = Column(String(255), nullable=True)  # Reason for deactivation

    # Relationships
    campaign_partner = relationship("CampaignPartner", back_populates="partner_links")
    clicks = relationship("Click", back_populates="partner_link")
    content_piece = relationship("ContentPiece", back_populates="partner_links")

    # Convenience relationship to partner
    @property
    def partner(self):
        return self.campaign_partner.partner if self.campaign_partner else None

    def __repr__(self):
        return f"<PartnerLink {self.short_code}>"

    def get_tracking_url(self, domain: str) -> str:
        """Generate the full tracking URL."""
        return f"https://{domain}/r/{self.short_code}"

    def is_expired(self) -> bool:
        """Check if link has expired."""
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return False

    def is_valid(self) -> bool:
        """Check if link is valid (active and not expired)."""
        return self.is_active and not self.is_expired()

    def deactivate(self, reason: str = None):
        """Deactivate the link."""
        self.is_active = False
        self.deactivated_at = datetime.utcnow()
        self.deactivation_reason = reason

    def reactivate(self):
        """Reactivate the link."""
        self.is_active = True
        self.deactivated_at = None
        self.deactivation_reason = None


class Cookie(BaseModel):
    """Browser tracking cookie."""
    
    __tablename__ = "cookies"
    
    cookie_id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    first_click_id = Column(Integer, ForeignKey("clicks.click_id"))
    last_click_id = Column(Integer, ForeignKey("clicks.click_id"))
    first_partner_id = Column(Integer, ForeignKey("partners.partner_id"))
    last_partner_id = Column(Integer, ForeignKey("partners.partner_id"), index=True)
    last_campaign_version_id = Column(Integer, ForeignKey("campaign_versions.campaign_version_id"))
    user_fingerprint = Column(String(255))
    expires_at = Column(DateTime, nullable=False, index=True)
    last_seen_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    clicks = relationship("Click", foreign_keys="Click.cookie_id", back_populates="cookie")
    first_click = relationship("Click", foreign_keys=[first_click_id], post_update=True)
    last_click = relationship("Click", foreign_keys=[last_click_id], post_update=True)
    first_partner = relationship("Partner", foreign_keys=[first_partner_id])
    last_partner = relationship("Partner", foreign_keys=[last_partner_id])
    conversion_events = relationship("ConversionEvent", back_populates="cookie")
    funnel_journey = relationship("FunnelJourney", back_populates="cookie", uselist=False)
    
    def __repr__(self):
        return f"<Cookie {self.cookie_id}>"
    
    def is_expired(self) -> bool:
        """Check if cookie is expired."""
        return datetime.utcnow() > self.expires_at
    
    def update_last_seen(self):
        """Update last seen timestamp."""
        self.last_seen_at = datetime.utcnow()


class Click(BaseModel):
    """Individual click event on partner links."""
    
    __tablename__ = "clicks"
    
    click_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    partner_link_id = Column(Integer, ForeignKey("partner_links.partner_link_id", ondelete="CASCADE"), nullable=False, index=True)
    cookie_id = Column(GUID(), ForeignKey("cookies.cookie_id"), index=True)
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(Text)
    referrer_url = Column(Text)
    source_url = Column(Text)
    utm_source = Column(String(255))
    utm_medium = Column(String(255))
    utm_campaign = Column(String(255))
    utm_content = Column(String(255))
    utm_term = Column(String(255))
    country_code = Column(String(2))
    device_type = Column(String(50))
    browser = Column(String(100))
    os = Column(String(100))
    clicked_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    partner_link = relationship("PartnerLink", back_populates="clicks")
    cookie = relationship("Cookie", foreign_keys=[cookie_id], back_populates="clicks")
    conversion_events = relationship("ConversionEvent", back_populates="click")
    touches = relationship("Touch", back_populates="click")
    
    def __repr__(self):
        return f"<Click {self.click_id} at {self.clicked_at}>"


class ContentPiece(BaseModel):
    """Marketing content created by partners."""
    
    __tablename__ = "content_pieces"
    
    content_piece_id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.partner_id"))
    external_reference = Column(Text)
    description = Column(Text)
    content_metadata = Column(JSON)
    
    # Relationships
    partner = relationship("Partner")
    partner_links = relationship("PartnerLink", back_populates="content_piece")
    
    def __repr__(self):
        return f"<ContentPiece {self.content_piece_id}>"