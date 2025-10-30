from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Vendor(BaseModel):
    """Vendor (Advertiser/Merchant) model."""
    
    __tablename__ = "vendors"
    
    vendor_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    company_name = Column(String(255))
    website_url = Column(Text)
    status = Column(String(50), default='active', nullable=False)
    api_key = Column(String(255), unique=True, index=True)
    webhook_secret = Column(String(255))
    webhook_url = Column(Text)
    
    # Relationships
    users = relationship("VendorUser", back_populates="vendor")
    campaigns = relationship("Campaign", back_populates="vendor")
    
    payout_schedules = relationship("PayoutSchedule", back_populates="vendor")

    def __repr__(self):
        return f"<Vendor {self.name} ({self.email})>"


class VendorUser(BaseModel):
    """Vendor team member model."""
    
    __tablename__ = "vendor_users"
    
    vendor_user_id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.vendor_id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=True)
    name = Column(String(255), nullable=False)
    role = Column(String(50), default='member', nullable=False)  # owner, admin, manager, member
    status = Column(String(50), default='active', nullable=False)  # active, inactive, pending
    invited_by = Column(Integer, ForeignKey("vendor_users.vendor_user_id"))
    invited_at = Column(DateTime)
    joined_at = Column(DateTime)
    last_login_at = Column(DateTime)
    oauth_provider = Column(String(50))
    oauth_provider_id = Column(String(255))
    
    # Relationships
    vendor = relationship("Vendor", back_populates="users")
    inviter = relationship("VendorUser", remote_side=[vendor_user_id])
    
    def __repr__(self):
        return f"<VendorUser {self.name} ({self.email}) - {self.role}>"
    
    def has_permission(self, action: str) -> bool:
        """Check if user has permission for an action."""
        permissions = {
            'owner': ['all'],
            'admin': ['manage_campaigns', 'approve_partners', 'approve_conversions', 'generate_payouts', 'view_reports'],
            'manager': ['approve_partners', 'approve_conversions', 'view_reports'],
            'member': ['view_reports']
        }
        
        role_permissions = permissions.get(self.role, [])
        return 'all' in role_permissions or action in role_permissions