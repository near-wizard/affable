from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Table, and_
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.core.database import Base


# Association table for many-to-many relationship
partner_partner_types = Table(
    'partner_partner_types',
    Base.metadata,
    Column('partner_id', Integer, ForeignKey('partners.partner_id', ondelete='CASCADE'), primary_key=True),
    Column('partner_type_id', Integer, ForeignKey('partner_types.partner_type_id', ondelete='CASCADE'), primary_key=True),
    Column('assigned_at', DateTime)
)


class Partner(BaseModel):
    """Partner (Affiliate/Influencer) model."""
    
    __tablename__ = "partners"
    
    partner_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    status = Column(String(50), default='pending', nullable=False)  # pending, active, suspended, rejected
    tier = Column(String(50), default='standard', nullable=False, index=True)  # standard, bronze, silver, gold, platinum
    bio = Column(Text)
    website_url = Column(Text)
    oauth_provider = Column(String(50))
    oauth_provider_id = Column(String(255))
    
    # Relationships
    types = relationship("PartnerType", secondary=partner_partner_types, back_populates="partners")
    campaign_partners = relationship("CampaignPartner", back_populates="partner")
    # partner_links - defined via campaign_partners relationship
    payment_methods = relationship("PartnerPaymentMethod", back_populates="partner")
    conversion_events = relationship("ConversionEvent", back_populates="partner")
    payouts = relationship("Payout", back_populates="partner")
    
    def __repr__(self):
        return f"<Partner {self.name} ({self.email}) - {self.tier}>"
    
    def is_active(self) -> bool:
        """Check if partner is active."""
        return self.status == 'active' and not self.is_deleted
    
    def can_join_campaign(self) -> bool:
        """Check if partner can join new campaigns."""
        return self.status in ['active', 'pending'] and not self.is_deleted


class PartnerType(BaseModel):
    """Partner type/category model."""
    
    __tablename__ = "partner_types"
    
    partner_type_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    
    # Relationships
    partners = relationship("Partner", secondary=partner_partner_types, back_populates="types")
    
    def __repr__(self):
        return f"<PartnerType {self.name}>"