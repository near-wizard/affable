"""
Webhooks API Endpoints

Handles webhook ingestion for conversion events.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.security import verify_hmac_signature
from app.core.exceptions import UnauthorizedException, ConflictException
from app.models import Vendor, ConversionEvent, ConversionEventType, CampaignVersion
from app.services.commission_service import CommissionService
from app.services.attribution_service import AttributionService

router = APIRouter()


@router.post("/conversion")
async def receive_conversion_webhook(
    request: Request,
    x_hub_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Receive conversion event webhook from vendor.
    
    Webhook payload should include:
    - vendor_id: Vendor ID
    - transaction_id: Unique transaction identifier
    - event_type: Event type name (sale, signup, etc.)
    - event_value: Transaction value
    - cookie_id: Tracking cookie ID (optional)
    - click_id: Click ID (optional)
    - customer_email: Customer email (optional)
    - customer_id: Vendor's customer ID (optional)
    - metadata: Additional data (optional)
    
    The webhook must be signed with HMAC-SHA256 using the vendor's webhook secret.
    """
    # Read request body
    body = await request.body()
    payload = await request.json()
    
    # Get vendor
    vendor_id = payload.get('vendor_id')
    if not vendor_id:
        raise HTTPException(status_code=400, detail="vendor_id is required")
    
    vendor = db.query(Vendor).filter(
        Vendor.vendor_id == vendor_id,
        Vendor.is_deleted == False
    ).first()
    
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Verify HMAC signature
    if not vendor.webhook_secret:
        raise HTTPException(status_code=400, detail="Webhook secret not configured")
    
    if not x_hub_signature:
        raise UnauthorizedException("Missing X-Hub-Signature header")
    
    if not verify_hmac_signature(body, x_hub_signature, vendor.webhook_secret):
        raise UnauthorizedException("Invalid webhook signature")
    
    # Extract required fields
    transaction_id = payload.get('transaction_id')
    if not transaction_id:
        raise HTTPException(status_code=400, detail="transaction_id is required")
    
    event_type_name = payload.get('event_type')
    if not event_type_name:
        raise HTTPException(status_code=400, detail="event_type is required")
    
    # Check for duplicate (idempotency)
    existing = db.query(ConversionEvent).filter(
        ConversionEvent.transaction_id == transaction_id,
        ConversionEvent.is_deleted == False
    ).first()
    
    if existing:
        # Return success for duplicate (idempotent)
        return {
            "status": "duplicate",
            "conversion_event_id": existing.conversion_event_id,
            "message": "Conversion already recorded"
        }
    
    # Get event type
    event_type = db.query(ConversionEventType).filter(
        ConversionEventType.name == event_type_name,
        ConversionEventType.is_deleted == False
    ).first()
    
    if not event_type:
        raise HTTPException(status_code=400, detail=f"Unknown event type: {event_type_name}")
    
    # Get partner and campaign from cookie or click
    cookie_id = payload.get('cookie_id')
    click_id = payload.get('click_id')
    partner_id = payload.get('partner_id')
    campaign_version_id = payload.get('campaign_version_id')
    
    # Resolve partner and campaign if not provided
    if not partner_id or not campaign_version_id:
        if cookie_id:
            from app.models import Cookie
            cookie = db.query(Cookie).filter(Cookie.cookie_id == cookie_id).first()
            if cookie:
                partner_id = partner_id or cookie.last_partner_id
                campaign_version_id = campaign_version_id or cookie.last_campaign_version_id
        
        if not partner_id and click_id:
            from app.models import Click
            click = db.query(Click).filter(Click.click_id == click_id).first()
            if click and click.partner_link:
                cp = click.partner_link.campaign_partner
                partner_id = partner_id or cp.partner_id
                campaign_version_id = campaign_version_id or cp.campaign_version_id
    
    if not partner_id or not campaign_version_id:
        raise HTTPException(
            status_code=400,
            detail="Could not determine partner and campaign. Provide partner_id and campaign_version_id, or valid cookie_id/click_id"
        )
    
    # Verify campaign belongs to vendor
    campaign_version = db.query(CampaignVersion).filter(
        CampaignVersion.campaign_version_id == campaign_version_id
    ).first()
    
    if not campaign_version or campaign_version.campaign.vendor_id != vendor_id:
        raise HTTPException(status_code=400, detail="Campaign does not belong to this vendor")
    
    # Create conversion event
    conversion = ConversionEvent(
        conversion_event_type_id=event_type.conversion_event_type_id,
        click_id=click_id,
        cookie_id=cookie_id,
        partner_id=partner_id,
        campaign_version_id=campaign_version_id,
        attribution_type='last_click',  # Default, will be calculated
        transaction_id=transaction_id,
        customer_email=payload.get('customer_email'),
        customer_id=payload.get('customer_id'),
        event_value=payload.get('event_value'),
        status='pending',
        occurred_at=datetime.utcnow(),
        recorded_at=datetime.utcnow(),
        metadata=payload.get('metadata', {})
    )
    
    db.add(conversion)
    db.commit()
    db.refresh(conversion)

    # Enqueue attribution and commission calculation asynchronously
    from app.workers.tasks import process_conversion_attribution
    try:
        process_conversion_attribution.delay(
            conversion.conversion_event_id,
            attribution_type='last_click'
        )
    except Exception as e:
        # Log error but don't fail the webhook
        # The conversion is still recorded in pending state
        print(f"Error enqueueing attribution task: {e}")

    return {
        "status": "success",
        "conversion_event_id": conversion.conversion_event_id,
        "commission_amount": 0,  # Will be calculated asynchronously
        "message": "Conversion recorded successfully. Processing attribution asynchronously."
    }


@router.get("/test")
def test_webhook():
    """
    Test endpoint to verify webhook endpoint is accessible.
    """
    return {
        "status": "ok",
        "message": "Webhook endpoint is working",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.post("/test")
async def test_webhook_signature(
    request: Request,
    x_hub_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Test webhook endpoint - vendors can send test payloads here
    to verify their signature generation is correct.
    
    Returns success if signature is valid, error otherwise.
    """
    body = await request.body()
    payload = await request.json()

    # Get vendor from payload
    vendor_id = payload.get('vendor_id')
    if not vendor_id:
        return {
            "status": "failed",
            "error": "vendor_id is required in payload"
        }

    # Verify signature
    vendor = db.query(Vendor).filter(
        Vendor.vendor_id == vendor_id,
        Vendor.is_deleted == False
    ).first()

    if not vendor:
        return {
            "status": "failed",
            "error": "Vendor not found"
        }

    if not vendor.webhook_secret:
        return {
            "status": "failed",
            "error": "No webhook secret configured",
            "help": "Go to Settings → Integration and generate a webhook secret"
        }

    if not x_hub_signature:
        return {
            "status": "failed",
            "error": "Missing X-Hub-Signature header",
            "help": "Include the header: X-Hub-Signature: sha256=<your-hmac-signature>"
        }

    # Verify signature
    if not verify_hmac_signature(body, x_hub_signature, vendor.webhook_secret):
        return {
            "status": "failed",
            "error": "Invalid signature",
            "help": "Make sure you're using the correct webhook secret and signing the entire request body as-is. Don't minify or reformat the JSON."
        }

    # Signature is valid!
    return {
        "status": "success",
        "message": "Webhook signature is valid! You're ready to send conversions.",
        "received_payload": payload,
        "timestamp": datetime.utcnow().isoformat()
    }
