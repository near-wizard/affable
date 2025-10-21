"""
Tracking Service

Handles click tracking, cookie management, and redirects.
"""

from sqlalchemy.orm import Session
from typing import Optional, Tuple
from datetime import datetime, timedelta
from uuid import uuid4
import user_agents

from app.models import PartnerLink, Click, Cookie, CampaignPartner, CampaignVersion
from app.core.exceptions import NotFoundException
from app.config import settings


class TrackingService:
    """Service for tracking operations."""
    
    @staticmethod
    def process_click(
        db: Session,
        short_code: str,
        ip_address: Optional[str],
        user_agent: Optional[str],
        referrer_url: Optional[str],
        cookie_id: Optional[str] = None
    ) -> Tuple[str, str, Optional[str]]:
        """
        Process a click on a tracking link.
        
        This creates a click record, manages cookies, and returns the redirect URL.
        
        Args:
            db: Database session
            short_code: Link short code
            ip_address: Client IP address
            user_agent: Client user agent string
            referrer_url: Referrer URL
            cookie_id: Existing cookie ID (if any)
            
        Returns:
            Tuple of (redirect_url, cookie_id, cookie_domain)
            
        Raises:
            NotFoundException: If link not found
        """
        # Get partner link
        partner_link = db.query(PartnerLink).filter(
            PartnerLink.short_code == short_code,
            PartnerLink.is_deleted == False
        ).first()
        
        if not partner_link:
            raise NotFoundException("Tracking link not found")
        
        # Get campaign partner and version
        campaign_partner = db.query(CampaignPartner).filter(
            CampaignPartner.campaign_partner_id == partner_link.campaign_partner_id,
            CampaignPartner.is_deleted == False
        ).first()
        
        if not campaign_partner or not campaign_partner.is_approved():
            raise NotFoundException("Campaign enrollment not found or not approved")
        
        campaign_version = db.query(CampaignVersion).filter(
            CampaignVersion.campaign_version_id == campaign_partner.campaign_version_id,
            CampaignVersion.is_deleted == False
        ).first()
        
        if not campaign_version or not campaign_version.is_active():
            raise NotFoundException("Campaign not active")
        
        # Parse user agent for device info
        device_info = TrackingService._parse_user_agent(user_agent)
        
        # Extract UTM parameters from partner link
        utm_params = partner_link.utm_params or {}
        
        # Handle cookie
        cookie = None
        new_cookie_id = None
        
        if cookie_id:
            # Try to get existing cookie
            cookie = db.query(Cookie).filter(
                Cookie.cookie_id == cookie_id,
                Cookie.is_deleted == False
            ).first()
            
            # Check if cookie is expired
            if cookie and cookie.is_expired():
                cookie = None
        
        # Create click record first (we'll update with cookie_id if needed)
        click = Click(
            partner_link_id=partner_link.partner_link_id,
            cookie_id=cookie.cookie_id if cookie else None,
            ip_address=ip_address,
            user_agent=user_agent,
            referrer_url=referrer_url,
            utm_source=utm_params.get('utm_source'),
            utm_medium=utm_params.get('utm_medium'),
            utm_campaign=utm_params.get('utm_campaign'),
            utm_content=utm_params.get('utm_content'),
            utm_term=utm_params.get('utm_term'),
            device_type=device_info['device_type'],
            browser=device_info['browser'],
            os=device_info['os'],
            clicked_at=datetime.utcnow()
        )
        
        db.add(click)
        db.flush()  # Get click_id
        
        # Create or update cookie
        if not cookie:
            # Create new cookie
            new_cookie_id = str(uuid4())
            cookie = Cookie(
                cookie_id=new_cookie_id,
                first_click_id=click.click_id,
                last_click_id=click.click_id,
                first_partner_id=campaign_partner.partner_id,
                last_partner_id=campaign_partner.partner_id,
                last_campaign_version_id=campaign_version.campaign_version_id,
                expires_at=datetime.utcnow() + timedelta(days=campaign_version.cookie_duration_days),
                last_seen_at=datetime.utcnow()
            )
            db.add(cookie)
            
            # Update click with cookie_id
            click.cookie_id = new_cookie_id
        else:
            # Update existing cookie
            cookie.last_click_id = click.click_id
            cookie.last_partner_id = campaign_partner.partner_id
            cookie.last_campaign_version_id = campaign_version.campaign_version_id
            cookie.update_last_seen()
        
        db.commit()
        
        # Update denormalized click counter (async in production)
        TrackingService._update_click_counters(db, campaign_partner)
        
        # Return redirect URL and cookie info
        return (
            partner_link.full_url,
            str(cookie.cookie_id),
            settings.TRACKING_DOMAIN
        )
    
    @staticmethod
    def _parse_user_agent(user_agent_string: Optional[str]) -> dict:
        """
        Parse user agent string to extract device information.
        
        Args:
            user_agent_string: User agent string
            
        Returns:
            Dictionary with device_type, browser, os
        """
        if not user_agent_string:
            return {
                'device_type': 'unknown',
                'browser': 'unknown',
                'os': 'unknown'
            }
        
        ua = user_agents.parse(user_agent_string)
        
        # Determine device type
        if ua.is_mobile:
            device_type = 'mobile'
        elif ua.is_tablet:
            device_type = 'tablet'
        elif ua.is_pc:
            device_type = 'desktop'
        else:
            device_type = 'other'
        
        # Get browser
        browser = f"{ua.browser.family} {ua.browser.version_string}".strip()
        if not browser or browser == ' ':
            browser = 'unknown'
        
        # Get OS
        os = f"{ua.os.family} {ua.os.version_string}".strip()
        if not os or os == ' ':
            os = 'unknown'
        
        return {
            'device_type': device_type,
            'browser': browser[:100],  # Limit length
            'os': os[:100]
        }
    
    @staticmethod
    def _update_click_counters(db: Session, campaign_partner: CampaignPartner):
        """
        Update denormalized click counters for campaign partner.
        
        In production, this should be done asynchronously via Celery.
        
        Args:
            db: Database session
            campaign_partner: CampaignPartner to update
        """
        from app.models import Click
        
        # Count total clicks
        total_clicks = db.query(Click).join(PartnerLink).filter(
            PartnerLink.campaign_partner_id == campaign_partner.campaign_partner_id,
            Click.is_deleted == False
        ).count()
        
        # Get last click timestamp
        last_click = db.query(Click).join(PartnerLink).filter(
            PartnerLink.campaign_partner_id == campaign_partner.campaign_partner_id,
            Click.is_deleted == False
        ).order_by(Click.clicked_at.desc()).first()
        
        # Update counters
        campaign_partner.total_clicks = total_clicks
        if last_click:
            campaign_partner.last_click_at = last_click.clicked_at
        
        campaign_partner.updated_at = datetime.utcnow()
        db.commit()
    
    @staticmethod
    def get_cookie(db: Session, cookie_id: str) -> Optional[Cookie]:
        """
        Get cookie by ID.
        
        Args:
            db: Database session
            cookie_id: Cookie UUID
            
        Returns:
            Cookie object or None
        """
        cookie = db.query(Cookie).filter(
            Cookie.cookie_id == cookie_id,
            Cookie.is_deleted == False
        ).first()
        
        # Check if expired
        if cookie and cookie.is_expired():
            return None
        
        return cookie
    
    @staticmethod
    def get_clicks_by_cookie(db: Session, cookie_id: str) -> list:
        """
        Get all clicks associated with a cookie.
        
        Args:
            db: Database session
            cookie_id: Cookie UUID
            
        Returns:
            List of Click objects
        """
        return db.query(Click).filter(
            Click.cookie_id == cookie_id,
            Click.is_deleted == False
        ).order_by(Click.clicked_at.asc()).all()
    
    @staticmethod
    def get_click_stats(
        db: Session,
        partner_id: Optional[int] = None,
        campaign_version_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> dict:
        """
        Get click statistics with filters.
        
        Args:
            db: Database session
            partner_id: Filter by partner
            campaign_version_id: Filter by campaign
            start_date: Filter by start date
            end_date: Filter by end date
            
        Returns:
            Dictionary with statistics
        """
        from sqlalchemy import func
        
        query = db.query(Click).join(PartnerLink).join(CampaignPartner)
        
        # Apply filters
        if partner_id:
            query = query.filter(CampaignPartner.partner_id == partner_id)
        
        if campaign_version_id:
            query = query.filter(CampaignPartner.campaign_version_id == campaign_version_id)
        
        if start_date:
            query = query.filter(Click.clicked_at >= start_date)
        
        if end_date:
            query = query.filter(Click.clicked_at <= end_date)
        
        query = query.filter(Click.is_deleted == False)
        
        # Get total clicks
        total_clicks = query.count()
        
        # Get unique clicks (by cookie)
        unique_clicks = query.filter(
            Click.cookie_id.isnot(None)
        ).distinct(Click.cookie_id).count()
        
        # Get clicks by device type
        device_stats = db.query(
            Click.device_type,
            func.count(Click.click_id).label('count')
        ).filter(
            Click.click_id.in_([c.click_id for c in query.all()])
        ).group_by(Click.device_type).all()
        
        clicks_by_device = {stat.device_type: stat.count for stat in device_stats}
        
        # Get clicks by date
        date_stats = db.query(
            func.date(Click.clicked_at).label('date'),
            func.count(Click.click_id).label('count')
        ).filter(
            Click.click_id.in_([c.click_id for c in query.all()])
        ).group_by(func.date(Click.clicked_at)).all()
        
        clicks_by_date = {str(stat.date): stat.count for stat in date_stats}
        
        return {
            'total_clicks': total_clicks,
            'unique_clicks': unique_clicks,
            'clicks_by_device': clicks_by_device,
            'clicks_by_date': clicks_by_date
        }