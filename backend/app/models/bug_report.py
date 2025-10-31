"""
Bug Report Model - Track user-reported bugs and issues.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, LargeBinary, JSON, Boolean, Enum
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class BugReportStatus(str, enum.Enum):
    """Status of a bug report"""
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    WONT_FIX = "wont_fix"
    DUPLICATE = "duplicate"


class BugReportSeverity(str, enum.Enum):
    """Severity level of the bug"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class BugReport(Base):
    """
    Track bug reports submitted by users.
    Includes user info, description, reproduction steps, and captured data.
    """
    __tablename__ = "bug_reports"

    bug_report_id = Column(Integer, primary_key=True, index=True)

    # User Information - Depending on user type (vendor_user or partner)
    vendor_id = Column(Integer, ForeignKey("vendors.vendor_id"), nullable=True, index=True)
    vendor_user_id = Column(Integer, ForeignKey("vendor_users.vendor_user_id"), nullable=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.partner_id"), nullable=True, index=True)

    # Report Details
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    steps_to_reproduce = Column(Text, nullable=True)
    user_email = Column(String(255), nullable=True)

    # Page Information
    page_url = Column(String(2048), nullable=False)
    page_title = Column(String(255), nullable=True)
    user_agent = Column(String(1024), nullable=True)

    # Captured Data
    screenshot_data = Column(LargeBinary, nullable=True)  # Base64 encoded PNG/JPG
    console_logs = Column(JSON, nullable=True)  # Array of console log entries
    network_requests = Column(JSON, nullable=True)  # Array of network request/response data

    # Metadata
    status = Column(String(50), default=BugReportStatus.NEW, nullable=False, index=True)
    severity = Column(String(50), nullable=True)
    browser = Column(String(255), nullable=True)
    browser_version = Column(String(50), nullable=True)
    os = Column(String(255), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    # Admin Notes
    admin_notes = Column(Text, nullable=True)
    assigned_to = Column(String(255), nullable=True)

    # Relationships
    vendor = relationship("Vendor", foreign_keys=[vendor_id], backref="bug_reports")
    vendor_user = relationship("VendorUser", foreign_keys=[vendor_user_id], backref="bug_reports")
    partner = relationship("Partner", foreign_keys=[partner_id], backref="bug_reports")

    def __repr__(self):
        return f"<BugReport {self.bug_report_id}: {self.title}>"

    @property
    def user_role(self) -> str:
        """Determine the role of the user who submitted the report"""
        if self.vendor_user_id:
            return "vendor_user"
        elif self.partner_id:
            return "partner"
        elif self.vendor_id:
            return "vendor"
        return "unknown"
