from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, BigInteger, Numeric, Table
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime

from app.models.base import BaseModel
from app.core.database import Base


class PaymentProvider(BaseModel):
    """Available payment methods (PayPal, Stripe, Wire Transfer, etc.)."""
    
    __tablename__ = "payment_providers"
    
    payment_provider_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    config = Column(JSONB)
    
    # Relationships
    partner_payment_methods = relationship("PartnerPaymentMethod", back_populates="payment_provider")
    payouts = relationship("Payout", back_populates="payment_provider")
    
    def __repr__(self):
        return f"<PaymentProvider {self.display_name}>"


class PartnerPaymentMethod(BaseModel):
    """Partner's configured payment methods."""
    
    __tablename__ = "partner_payment_methods"
    
    partner_payment_method_id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.partner_id", ondelete="CASCADE"), nullable=False, index=True)
    payment_provider_id = Column(Integer, ForeignKey("payment_providers.payment_provider_id"), nullable=False)
    provider_account_id = Column(String(255))
    account_details = Column(JSONB)
    is_default = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime)
    
    # Relationships
    partner = relationship("Partner", back_populates="payment_methods")
    payment_provider = relationship("PaymentProvider", back_populates="partner_payment_methods")
    payouts = relationship("Payout", back_populates="payment_method")
    
    def __repr__(self):
        return f"<PartnerPaymentMethod {self.partner_id} - {self.payment_provider.name if self.payment_provider else 'Unknown'}>"
    
    def verify(self):
        """Mark payment method as verified."""
        self.is_verified = True
        self.verified_at = datetime.utcnow()


class Payout(BaseModel):
    """Batch payment to partners."""
    
    __tablename__ = "payouts"
    
    payout_id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.partner_id"), nullable=False, index=True)
    partner_payment_method_id = Column(Integer, ForeignKey("partner_payment_methods.partner_payment_method_id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default='USD')
    payment_provider_id = Column(Integer, ForeignKey("payment_providers.payment_provider_id"), nullable=False)
    provider_transaction_id = Column(String(255))
    provider_response = Column(JSONB)
    status = Column(String(50), default='pending', index=True)  # pending, processing, completed, failed
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    processed_at = Column(DateTime)
    completed_at = Column(DateTime)
    failed_at = Column(DateTime)
    failure_reason = Column(Text)
    
    # Relationships
    partner = relationship("Partner", back_populates="payouts")
    payment_method = relationship("PartnerPaymentMethod", back_populates="payouts")
    payment_provider = relationship("PaymentProvider", back_populates="payouts")
    payout_events = relationship("PayoutEvent", back_populates="payout")
    
    def __repr__(self):
        return f"<Payout {self.payout_id} - ${self.amount} - {self.status}>"
    
    def process(self):
        """Mark payout as processing."""
        self.status = 'processing'
        self.processed_at = datetime.utcnow()
    
    def complete(self, transaction_id: str):
        """Mark payout as completed."""
        self.status = 'completed'
        self.completed_at = datetime.utcnow()
        self.provider_transaction_id = transaction_id
    
    def fail(self, reason: str):
        """Mark payout as failed."""
        self.status = 'failed'
        self.failed_at = datetime.utcnow()
        self.failure_reason = reason


class PayoutEvent(Base):
    """Junction table linking payouts to specific conversion events."""
    
    __tablename__ = "payout_events"
    
    payout_id = Column(Integer, ForeignKey("payouts.payout_id", ondelete="CASCADE"), primary_key=True)
    conversion_event_id = Column(BigInteger, ForeignKey("conversion_events.conversion_event_id"), primary_key=True)
    commission_amount = Column(Numeric(10, 2), nullable=False)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime)
    
    # Relationships
    payout = relationship("Payout", back_populates="payout_events")
    conversion_event = relationship("ConversionEvent", back_populates="payout_events")
    
    def __repr__(self):
        return f"<PayoutEvent payout={self.payout_id} conversion={self.conversion_event_id}>"


class AuditLog(BaseModel):
    """Comprehensive audit trail for compliance and debugging."""
    
    __tablename__ = "audit_logs"
    
    audit_log_id = Column(BigInteger, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(BigInteger, nullable=False, index=True)
    action = Column(String(50), nullable=False)  # create, update, delete, approve, reject
    actor_type = Column(String(50))  # vendor_user, partner, system
    actor_id = Column(Integer)
    changes = Column(JSONB)
    reason = Column(Text)
    ip_address = Column(String(45))  # Support IPv6
    
    def __repr__(self):
        return f"<AuditLog {self.entity_type}:{self.entity_id} - {self.action}>"
    
    @classmethod
    def log_action(cls, db, entity_type: str, entity_id: int, action: str, 
                   actor_type: str = None, actor_id: int = None, 
                   changes: dict = None, reason: str = None, ip_address: str = None):
        """
        Helper method to create audit log entries.
        
        Usage:
            AuditLog.log_action(
                db=db,
                entity_type="conversion_events",
                entity_id=123,
                action="approve",
                actor_type="vendor_user",
                actor_id=1,
                changes={"before": {"status": "pending"}, "after": {"status": "approved"}}
            )
        """
        audit_log = cls(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor_type=actor_type,
            actor_id=actor_id,
            changes=changes,
            reason=reason,
            ip_address=ip_address
        )
        db.add(audit_log)
        db.commit()
        return audit_log