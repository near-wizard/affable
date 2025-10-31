import logging
from typing import Optional, List
try:
    from resend import Resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    Resend = None

try:
    from jinja2 import Template
except ImportError:
    Template = None

from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via Resend"""

    def __init__(self):
        if not RESEND_AVAILABLE:
            logger.warning("Resend package not installed. Email sending will be disabled.")
            self.client = None
        elif not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY not configured. Email sending will be disabled.")
            self.client = None
        else:
            self.client = Resend(api_key=settings.RESEND_API_KEY)

    def is_enabled(self) -> bool:
        """Check if email service is configured"""
        return self.client is not None

    async def send_partner_invitation_email(
        self,
        partner_email: str,
        partner_name: str,
        campaign_name: str,
        vendor_name: str,
        vendor_email: str,
        commission_description: str,
        invitation_url: str,
        invitation_message: Optional[str] = None,
    ) -> bool:
        """Send partner invitation email via Resend"""
        if not self.is_enabled():
            logger.warning(f"Email service not configured. Skipping invitation email to {partner_email}")
            return False

        # HTML email template
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f8f8f8; padding: 20px; border-radius: 5px; }
                .content { margin: 20px 0; }
                .cta-button {
                    display: inline-block;
                    background-color: #007bff;
                    color: white;
                    padding: 10px 20px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 10px 0;
                }
                .footer { font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
                .details { background-color: #f8f8f8; padding: 15px; border-radius: 5px; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>You're invited to a partnership opportunity!</h1>
                </div>

                <div class="content">
                    <p>Hi {{ partner_name }},</p>

                    <p>{{ vendor_name }} ({{ vendor_email }}) has invited you to participate in their referral program.</p>

                    <div class="details">
                        <h3>{{ campaign_name }}</h3>
                        <p><strong>Commission Structure:</strong></p>
                        <p>{{ commission_description }}</p>
                    </div>

                    {% if invitation_message %}
                    <div class="details">
                        <p><strong>Message from {{ vendor_name }}:</strong></p>
                        <p>{{ invitation_message }}</p>
                    </div>
                    {% endif %}

                    <p>Ready to get started? Click the button below to accept this invitation and begin earning commissions.</p>

                    <a href="{{ invitation_url }}" class="cta-button">Accept Invitation</a>

                    <p>Or copy this link into your browser:<br><code>{{ invitation_url }}</code></p>

                    <p>This invitation expires in 30 days.</p>
                </div>

                <div class="footer">
                    <p>Questions? Contact {{ vendor_name }} at {{ vendor_email }}</p>
                    <p>© {{ current_year }} Affable. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        try:
            template = Template(html_template)
            html_content = template.render(
                partner_name=partner_name,
                vendor_name=vendor_name,
                vendor_email=vendor_email,
                campaign_name=campaign_name,
                commission_description=commission_description,
                invitation_url=invitation_url,
                invitation_message=invitation_message,
                current_year=2025,
            )

            response = self.client.emails.send(
                {
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": partner_email,
                    "subject": f"{vendor_name} has invited you to earn commissions",
                    "html": html_content,
                }
            )

            logger.info(f"Invitation email sent to {partner_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send invitation email to {partner_email}: {str(e)}")
            return False

    async def send_partner_approval_email(
        self,
        partner_email: str,
        partner_name: str,
        campaign_name: str,
        vendor_name: str,
        approved: bool,
        rejection_reason: Optional[str] = None,
    ) -> bool:
        """Send approval/rejection email to partner"""
        if not self.is_enabled():
            logger.warning(f"Email service not configured. Skipping approval email to {partner_email}")
            return False

        if approved:
            subject = f"Approved for {campaign_name}!"
            html_template = """
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1>Great news, {{ partner_name }}!</h1>
                    <p>Your application to participate in <strong>{{ campaign_name }}</strong> by {{ vendor_name }} has been approved.</p>
                    <p>You can now start sharing your referral links and earning commissions!</p>
                    <p><a href="{{ dashboard_url }}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Your Dashboard</a></p>
                </div>
            </body>
            </html>
            """
        else:
            subject = f"Application for {campaign_name}"
            rejection_reason_text = f"<p><strong>Reason:</strong> {rejection_reason}</p>" if rejection_reason else ""
            html_template = f"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1>Application Status</h1>
                    <p>Hi {{ partner_name }},</p>
                    <p>Unfortunately, your application to participate in <strong>{{ campaign_name }}</strong> by {{ vendor_name }} was not approved at this time.</p>
                    {rejection_reason_text}
                    <p>You may be able to reapply in the future. Feel free to reach out to {{ vendor_name }} with any questions.</p>
                </div>
            </body>
            </html>
            """

        try:
            template = Template(html_template)
            html_content = template.render(
                partner_name=partner_name,
                campaign_name=campaign_name,
                vendor_name=vendor_name,
                dashboard_url=f"{settings.FRONTEND_URL}/partner/campaigns/current",
            )

            response = self.client.emails.send(
                {
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": partner_email,
                    "subject": subject,
                    "html": html_content,
                }
            )

            logger.info(f"Approval email sent to {partner_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send approval email to {partner_email}: {str(e)}")
            return False

    async def send_payout_notification_email(
        self,
        partner_email: str,
        partner_name: str,
        amount: float,
        currency: str = "USD",
        payout_date: Optional[str] = None,
    ) -> bool:
        """Send payout notification email to partner"""
        if not self.is_enabled():
            logger.warning(f"Email service not configured. Skipping payout email to {partner_email}")
            return False

        html_template = """
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1>Payout Processed!</h1>
                <p>Hi {{ partner_name }},</p>
                <p>Your payout of <strong>{{ currency }} {{ amount }}</strong> has been processed and sent to your connected Stripe account.</p>
                {% if payout_date %}
                <p><strong>Expected delivery date:</strong> {{ payout_date }}</p>
                {% endif %}
                <p>You can track your payout status in your dashboard.</p>
                <p><a href="{{ dashboard_url }}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Payouts</a></p>
            </div>
        </body>
        </html>
        """

        try:
            template = Template(html_template)
            html_content = template.render(
                partner_name=partner_name,
                amount=f"{amount:.2f}",
                currency=currency,
                payout_date=payout_date,
                dashboard_url=f"{settings.FRONTEND_URL}/partner/payouts",
            )

            response = self.client.emails.send(
                {
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": partner_email,
                    "subject": f"Your {currency} {amount:.2f} payout has been processed",
                    "html": html_content,
                }
            )

            logger.info(f"Payout notification sent to {partner_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send payout email to {partner_email}: {str(e)}")
            return False


# Create global instance
email_service = EmailService()
