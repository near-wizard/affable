"""
Bug Reporting Endpoints
Allows users to submit bug reports with screenshots and diagnostic information.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import base64
import logging

from app.core.database import get_db
from app.core.deps import get_current_user, get_optional_current_user, get_current_partner, get_current_vendor_user
from app.models import BugReport, BugReportStatus, BugReportSeverity, VendorUser, Partner
from app.services.email_service import email_service
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["bug-reports"])


class BugReportCreate:
    """Schema for creating a bug report"""
    def __init__(
        self,
        title: str,
        description: str,
        steps_to_reproduce: str = None,
        user_email: str = None,
        page_url: str = None,
        page_title: str = None,
        user_agent: str = None,
        screenshot_data: str = None,  # Base64 encoded
        console_logs: list = None,
        network_requests: list = None,
        browser: str = None,
        browser_version: str = None,
        os: str = None,
    ):
        self.title = title
        self.description = description
        self.steps_to_reproduce = steps_to_reproduce
        self.user_email = user_email
        self.page_url = page_url
        self.page_title = page_title
        self.user_agent = user_agent
        self.screenshot_data = screenshot_data
        self.console_logs = console_logs
        self.network_requests = network_requests
        self.browser = browser
        self.browser_version = browser_version
        self.os = os


@router.post("/", response_model=dict)
async def submit_bug_report(
    data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_optional_current_user),
):
    """
    Submit a bug report with optional screenshot and diagnostic data.

    Authenticated users are automatically associated with the report.
    Anonymous submissions are accepted but should include email.
    """
    try:
        # Determine user type and get user info
        vendor_id = None
        vendor_user_id = None
        partner_id = None
        user_role = "unknown"

        if current_user:
            # Check if user is a VendorUser
            vendor_user = db.query(VendorUser).filter(
                VendorUser.vendor_user_id == current_user.get("user_id")
            ).first()

            if vendor_user:
                vendor_id = vendor_user.vendor_id
                vendor_user_id = vendor_user.vendor_user_id
                user_role = "vendor_user"
            else:
                # Check if user is a Partner
                partner = db.query(Partner).filter(
                    Partner.partner_id == current_user.get("user_id")
                ).first()

                if partner:
                    partner_id = partner.partner_id
                    user_role = "partner"

        # Extract screenshot data (remove data URI prefix if present)
        screenshot_data = data.get("screenshot_data")
        if screenshot_data and screenshot_data.startswith("data:"):
            # Remove "data:image/png;base64," or similar prefix
            screenshot_data = screenshot_data.split(",", 1)[1] if "," in screenshot_data else screenshot_data
            try:
                screenshot_binary = base64.b64decode(screenshot_data)
            except Exception as e:
                logger.error(f"Error decoding screenshot: {str(e)}")
                screenshot_binary = None
        else:
            screenshot_binary = screenshot_data.encode() if screenshot_data else None

        # Create bug report
        bug_report = BugReport(
            vendor_id=vendor_id,
            vendor_user_id=vendor_user_id,
            partner_id=partner_id,
            title=data.get("title", "Untitled Bug Report")[:255],
            description=data.get("description", ""),
            steps_to_reproduce=data.get("steps_to_reproduce"),
            user_email=data.get("user_email"),
            page_url=data.get("page_url", "unknown")[:2048],
            page_title=data.get("page_title"),
            user_agent=data.get("user_agent"),
            screenshot_data=screenshot_binary,
            console_logs=data.get("console_logs"),
            network_requests=data.get("network_requests"),
            browser=data.get("browser"),
            browser_version=data.get("browser_version"),
            os=data.get("os"),
            status=BugReportStatus.NEW,
        )

        db.add(bug_report)
        db.commit()
        db.refresh(bug_report)

        logger.info(f"Bug report {bug_report.bug_report_id} created by {user_role}")

        # Send email notification to admin
        try:
            await send_bug_report_email(bug_report, user_role)
        except Exception as e:
            logger.error(f"Failed to send bug report email: {str(e)}")

        return {
            "status": "success",
            "message": "Bug report submitted successfully",
            "bug_report_id": bug_report.bug_report_id,
        }

    except Exception as e:
        logger.error(f"Error submitting bug report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit bug report",
        )


@router.get("/{bug_report_id}", response_model=dict)
async def get_bug_report(
    bug_report_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_optional_current_user),
):
    """
    Retrieve a bug report by ID.
    Only accessible to admins or the user who submitted it.
    """
    bug_report = db.query(BugReport).filter(
        BugReport.bug_report_id == bug_report_id
    ).first()

    if not bug_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bug report not found",
        )

    # Check permissions (admin only for now)
    # TODO: Implement admin role check

    return {
        "bug_report_id": bug_report.bug_report_id,
        "title": bug_report.title,
        "description": bug_report.description,
        "steps_to_reproduce": bug_report.steps_to_reproduce,
        "user_email": bug_report.user_email,
        "page_url": bug_report.page_url,
        "page_title": bug_report.page_title,
        "browser": bug_report.browser,
        "browser_version": bug_report.browser_version,
        "os": bug_report.os,
        "status": bug_report.status,
        "created_at": bug_report.created_at.isoformat(),
        "user_role": bug_report.user_role,
    }


async def send_bug_report_email(bug_report: BugReport, user_role: str):
    """
    Send email notification to admin about bug report.
    """
    admin_email = settings.SITE_ADMIN_EMAIL

    if not admin_email:
        logger.warning("SITE_ADMIN_EMAIL not configured")
        return

    subject = f"🐛 New Bug Report: {bug_report.title}"

    body = f"""
    A new bug report has been submitted:

    **Report Details:**
    - Title: {bug_report.title}
    - Page: {bug_report.page_url}
    - Submitted by: {bug_report.user_email or user_role}
    - User Role: {user_role}
    - Browser: {bug_report.browser} {bug_report.browser_version}
    - OS: {bug_report.os}
    - Submitted at: {bug_report.created_at}

    **Description:**
    {bug_report.description}

    **Steps to Reproduce:**
    {bug_report.steps_to_reproduce or 'Not provided'}

    **View Report:**
    {settings.FRONTEND_URL}/admin/bug-reports/{bug_report.bug_report_id}

    **Data Included:**
    - Screenshot: {"Yes" if bug_report.screenshot_data else "No"}
    - Console Logs: {len(bug_report.console_logs) if bug_report.console_logs else 0} entries
    - Network Requests: {len(bug_report.network_requests) if bug_report.network_requests else 0} entries
    """

    try:
        await email_service.send_email(
            to=admin_email,
            subject=subject,
            body=body,
        )
        logger.info(f"Bug report notification sent to {admin_email}")
    except Exception as e:
        logger.error(f"Failed to send bug report email: {str(e)}")
        raise
