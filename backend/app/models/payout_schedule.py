"""Payout scheduling models."""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum

from app.models.base import BaseModel
from app.core.database import Base


class PayoutFrequency(str, Enum):
    """Payout frequency options."""
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    MANUALLY = "manually"


class PayoutSchedule(BaseModel):
    """Scheduled payout configuration."""

    __tablename__ = "payout_schedules"

    payout_schedule_id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.vendor_id"), nullable=False, index=True)
    partner_id = Column(Integer, ForeignKey("partners.partner_id"), nullable=True, index=True)

    # Schedule configuration
    frequency = Column(SQLEnum(PayoutFrequency), default=PayoutFrequency.MONTHLY, nullable=False)
    day_of_period = Column(Integer, default=15)  # Day of month/week to process
    is_active = Column(Boolean, default=True)

    # Thresholds
    min_amount = Column(Integer, default=0)  # Minimum amount to trigger payout (in cents)

    # Tracking
    last_processed_at = Column(DateTime)
    next_scheduled_at = Column(DateTime)
    notes = Column(Text)

    # Relationships
    vendor = relationship("Vendor", back_populates="payout_schedules")
    partner = relationship("Partner", back_populates="payout_schedules")
    payout_schedule_executions = relationship("PayoutScheduleExecution", back_populates="schedule")

    def __repr__(self):
        return f"<PayoutSchedule {self.payout_schedule_id} - {self.frequency} for vendor {self.vendor_id}>"


class PayoutScheduleExecution(BaseModel):
    """Record of a scheduled payout execution."""

    __tablename__ = "payout_schedule_executions"

    execution_id = Column(Integer, primary_key=True, index=True)
    payout_schedule_id = Column(Integer, ForeignKey("payout_schedules.payout_schedule_id"), nullable=False, index=True)

    # Execution details
    status = Column(String(50), default="pending", index=True)  # pending, processing, completed, failed, skipped
    payout_ids = Column(String(500))  # Comma-separated list of payout IDs created
    total_amount = Column(Integer, default=0)  # Total amount in cents
    total_payouts = Column(Integer, default=0)  # Number of payouts created

    # Timing
    scheduled_at = Column(DateTime, nullable=False)
    executed_at = Column(DateTime)
    completed_at = Column(DateTime)

    # Error tracking
    error_message = Column(Text)
    skip_reason = Column(Text)

    # Relationships
    schedule = relationship("PayoutSchedule", back_populates="payout_schedule_executions")

    def __repr__(self):
        return f"<PayoutScheduleExecution {self.execution_id} - {self.status}>"
