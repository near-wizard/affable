"""
Tracking API Endpoints

Anonymous click tracking and redirect endpoint.
"""

from fastapi import APIRouter, Request, Depends, HTTPException, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import uuid
import logging
import requests
from urllib.parse import urlparse

from app.core.database import get_db
from app.models import PartnerLink, Click, Cookie, CampaignPartner, CampaignVersion
from app.schemas.tracking import ClickResponse, CookieResponse

logger = logging.getLogger(__name__)

router = APIRouter()

# Constants
COOKIE_NAME = "tprm"
DEFAULT_COOKIE_DAYS = 30
REDIRECT_TIMEOUT = 5  # seconds


def resolve_redirect_url(url: str) -> str:
    """
    Resolve destination URL with fallback from HTTPS to HTTP.

    Attempts to verify the URL exists using HTTPS first. If the request fails,
    logs a warning and attempts with HTTP. This handles cases where destination
    servers don't support HTTPS.

    Args:
        url: The destination URL (full_url from PartnerLink)

    Returns:
        The working URL (either HTTPS or HTTP version)

    Raises:
        ValueError: If neither HTTPS nor HTTP URL is reachable
    """
    parsed = urlparse(url)

    # If URL doesn't have a scheme, assume it's malformed
    if not parsed.scheme:
        logger.error(f"Invalid URL format (no scheme): {url}")
        raise ValueError(f"Invalid URL: missing scheme")

    # If already HTTP, return as-is
    if parsed.scheme == "http":
        return url

    # Try HTTPS first
    if parsed.scheme == "https":
        try:
            # Use HEAD request with short timeout to verify URL accessibility
            response = requests.head(
                url,
                timeout=REDIRECT_TIMEOUT,
                allow_redirects=True,
                verify=True
            )
            # Consider 2xx and 3xx as valid
            if 200 <= response.status_code < 400:
                logger.debug(f"HTTPS URL verified: {url}")
                return url
            else:
                # Server responded but with error - still try fallback
                logger.warning(
                    f"HTTPS URL returned status {response.status_code}: {url}. "
                    f"Attempting HTTP fallback."
                )
        except requests.exceptions.SSLError as e:
            logger.warning(
                f"HTTPS SSL error for {url}: {str(e)}. "
                f"Attempting HTTP fallback."
            )
        except requests.exceptions.Timeout:
            logger.warning(
                f"HTTPS request timeout for {url}. "
                f"Attempting HTTP fallback."
            )
        except requests.exceptions.ConnectionError as e:
            logger.warning(
                f"HTTPS connection error for {url}: {str(e)}. "
                f"Attempting HTTP fallback."
            )
        except requests.exceptions.RequestException as e:
            logger.warning(
                f"HTTPS request failed for {url}: {str(e)}. "
                f"Attempting HTTP fallback."
            )

        # Try HTTP fallback
        http_url = url.replace("https://", "http://", 1)
        try:
            response = requests.head(
                http_url,
                timeout=REDIRECT_TIMEOUT,
                allow_redirects=True,
                verify=False
            )
            if 200 <= response.status_code < 400:
                logger.info(f"HTTP fallback succeeded for {url}")
                return http_url
            else:
                logger.warning(
                    f"HTTP fallback also returned status {response.status_code}: {http_url}"
                )
                # Still return HTTP as it at least responded
                return http_url
        except requests.exceptions.RequestException as e:
            logger.error(
                f"Both HTTPS and HTTP failed for {url}. "
                f"HTTPS error and HTTP error: {str(e)}"
            )
            # Return original URL and let redirect response handle it
            # FastAPI will still redirect, but may fail on destination
            logger.warning(f"Returning original URL despite verification failure: {url}")
            return url

    # For other schemes, return as-is
    return url


@router.get("/r/{short_code}")
def redirect_link(
    short_code: str, 
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Anonymous redirect endpoint - NO authentication required.
    
    Flow:
    1. Resolve partner_link by short_code
    2. Create click record
    3. Create/update tracking cookie
    4. Redirect (302) to destination with UTM params
    5. Enqueue background processing
    
    Args:
        short_code: The short link identifier
        request: FastAPI request object
        db: Database session
        
    Returns:
        RedirectResponse with 302 status and Set-Cookie header
    """
    # 1. Resolve link with campaign info (single query with joins)
    link = db.query(PartnerLink).join(
        CampaignPartner, PartnerLink.campaign_partner_id == CampaignPartner.campaign_partner_id
    ).join(
        CampaignVersion, CampaignPartner.campaign_version_id == CampaignVersion.campaign_version_id
    ).filter(
        PartnerLink.short_code == short_code,
        PartnerLink.is_deleted == False,
        CampaignPartner.status == 'approved'
    ).first()

    if not link:
        raise HTTPException(status_code=404, detail="Link not found or inactive")

    # Validate link is active and not expired
    if not link.is_valid():
        reason = "Link has been deactivated"
        if link.is_expired():
            reason = "Link has expired"
        logger.warning(f"Attempt to access invalid link: {short_code} ({reason})")
        raise HTTPException(status_code=410, detail=f"Link is no longer active: {reason}")
    
    campaign_partner = link.campaign_partner
    campaign_version = campaign_partner.campaign_version
    
    # 2. Gather click metadata
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")
    referrer = request.headers.get("referer")
    query_params = dict(request.query_params)
    
    # Merge UTM parameters: query params override link defaults
    utm_raw = link.utm_params or {}
    utm = {
        "utm_source": query_params.get("utm_source", utm_raw.get("utm_source")),
        "utm_medium": query_params.get("utm_medium", utm_raw.get("utm_medium")),
        "utm_campaign": query_params.get("utm_campaign", utm_raw.get("utm_campaign")),
        "utm_content": query_params.get("utm_content", utm_raw.get("utm_content")),
        "utm_term": query_params.get("utm_term", utm_raw.get("utm_term")),
    }
    
    # 3. Handle cookie - check if exists
    cookie_header = request.cookies.get(COOKIE_NAME)
    cookie_id = None
    cookie_obj = None
    new_cookie = False
    
    if cookie_header:
        # Validate cookie exists and is not expired
        try:
            cookie_uuid = uuid.UUID(cookie_header)
            cookie_obj = db.query(Cookie).filter(
                Cookie.cookie_id == cookie_uuid,
                Cookie.is_deleted == False,
                Cookie.expires_at > datetime.utcnow()
            ).first()
            
            if cookie_obj:
                cookie_id = cookie_uuid
        except (ValueError, AttributeError):
            # Invalid UUID format
            logger.warning(f"Invalid cookie format: {cookie_header}")
    
    # 4. Create click record
    click = Click(
        partner_link_id=link.partner_link_id,
        cookie_id=cookie_id,
        ip_address=ip,
        user_agent=ua,
        referrer_url=referrer,
        utm_source=utm["utm_source"],
        utm_medium=utm["utm_medium"],
        utm_campaign=utm["utm_campaign"],
        utm_content=utm["utm_content"],
        utm_term=utm["utm_term"],
        clicked_at=datetime.utcnow()
    )
    
    db.add(click)
    db.flush()  # Get click_id without committing
    
    # 5. Create or update cookie
    cookie_duration = campaign_version.cookie_duration_days or DEFAULT_COOKIE_DAYS
    expires_at = datetime.utcnow() + timedelta(days=cookie_duration)

    # Resolve destination URL with HTTPS->HTTP fallback
    try:
        destination_url = resolve_redirect_url(link.full_url)
    except ValueError as e:
        logger.error(f"Invalid URL in link {short_code}: {link.full_url}")
        raise HTTPException(status_code=500, detail="Invalid destination URL")

    # Prepare redirect response
    response = RedirectResponse(url=destination_url, status_code=302)
    
    if not cookie_obj:
        # Create new cookie
        new_cookie_id = uuid.uuid4()
        new_cookie = True
        
        cookie_obj = Cookie(
            cookie_id=new_cookie_id,
            first_click_id=click.click_id,
            last_click_id=click.click_id,
            first_partner_id=campaign_partner.partner_id,
            last_partner_id=campaign_partner.partner_id,
            last_campaign_version_id=campaign_version.campaign_version_id,
            expires_at=expires_at,
            last_seen_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(cookie_obj)
        db.flush()
        
        # Update click with new cookie_id
        click.cookie_id = new_cookie_id
        
        # Set cookie in response
        response.set_cookie(
            key=COOKIE_NAME,
            value=str(new_cookie_id),
            max_age=cookie_duration * 24 * 3600,  # Convert days to seconds
            secure=True,
            httponly=True,
            samesite="none"
        )
        
        cookie_id = new_cookie_id
        
        logger.info(f"Created new cookie {new_cookie_id} for click {click.click_id}")
        
    else:
        # Update existing cookie
        cookie_obj.last_click_id = click.click_id
        cookie_obj.last_partner_id = campaign_partner.partner_id
        cookie_obj.last_campaign_version_id = campaign_version.campaign_version_id
        cookie_obj.last_seen_at = datetime.utcnow()
        cookie_obj.expires_at = expires_at  # Extend expiration
        cookie_obj.updated_at = datetime.utcnow()
        
        logger.info(f"Updated existing cookie {cookie_id} for click {click.click_id}")
    
    # Capture click_id before commit (SQLAlchemy lazy loading issue)
    click_id = click.click_id

    # Commit all changes
    db.commit()

    # 6. Enqueue background tasks (non-blocking)
    try:
        from app.workers.tasks import process_click, update_campaign_partner_counters

        # Process click for analytics
        process_click.delay(click_id)

        # Update denormalized counters
        update_campaign_partner_counters.delay(
            campaign_partner.partner_id,
            campaign_version.campaign_version_id
        )

    except ImportError:
        # Celery not configured - skip background processing
        logger.warning("Celery not available, skipping background tasks")
    except Exception as e:
        # Log error but don't fail the redirect
        logger.error(f"Failed to enqueue background task: {e}", exc_info=True)

    logger.info(
        f"Redirect: link={short_code}, click={click_id}, "
        f"cookie={cookie_id}, new_cookie={new_cookie}"
    )

    return response


@router.get("/pixel.gif")
def tracking_pixel(
    request: Request,
    event: Optional[str] = None,
    value: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """
    Optional: Tracking pixel endpoint for client-side events.
    
    Returns a 1x1 transparent GIF.
    Can be used as fallback when webhooks are not available.
    
    Usage:
        <img src="/pixel.gif?event=page_view&value=99.99" />
    
    Args:
        request: FastAPI request
        event: Event type (page_view, etc.)
        value: Optional event value
        db: Database session
        
    Returns:
        1x1 transparent GIF response
    """
    # Get cookie if exists
    cookie_header = request.cookies.get(COOKIE_NAME)
    
    if cookie_header and event:
        try:
            from app.models import ConversionEvent, ConversionEventType
            
            cookie_uuid = uuid.UUID(cookie_header)
            cookie_obj = db.query(Cookie).filter(
                Cookie.cookie_id == cookie_uuid,
                Cookie.is_deleted == False
            ).first()
            
            if cookie_obj:
                # Get event type
                event_type = db.query(ConversionEventType).filter(
                    ConversionEventType.name == event,
                    ConversionEventType.is_deleted == False
                ).first()
                
                if event_type:
                    # Create conversion event (simplified - should validate more)
                    conversion = ConversionEvent(
                        conversion_event_type_id=event_type.conversion_event_type_id,
                        cookie_id=cookie_uuid,
                        partner_id=cookie_obj.last_partner_id,
                        campaign_version_id=cookie_obj.last_campaign_version_id,
                        attribution_type='last_click',
                        event_value=value,
                        status='pending',
                        occurred_at=datetime.utcnow(),
                        recorded_at=datetime.utcnow()
                    )
                    
                    db.add(conversion)
                    db.commit()
                    
                    logger.info(f"Pixel conversion: event={event}, cookie={cookie_uuid}")
                    
        except (ValueError, ImportError) as e:
            logger.warning(f"Pixel tracking error: {e}")
        except Exception as e:
            logger.error(f"Failed to record pixel event: {e}", exc_info=True)
    
    # Return 1x1 transparent GIF
    # Base64 encoded transparent GIF
    gif_data = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
    
    return Response(
        content=gif_data,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )