"""
Celery Background Tasks

Handles async processing for attribution, commission calculation, and aggregation.
"""

from celery import Task
from sqlalchemy.orm import Session
import logging
from datetime import datetime
from decimal import Decimal

from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.models import (
    ConversionEvent, CampaignPartner, Click, PartnerLink,
    Cookie, AuditLog
)
from app.services.attribution_service import AttributionService
from app.services.commission_service import CommissionService

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """Base task class that provides database session management."""
    
    _db = None
    
    @property
    def db(self) -> Session:
        if self._db is None:
            self._db = SessionLocal()
        return self._db
    
    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.tasks.process_conversion_attribution',
    max_retries=3,
    default_retry_delay=60
)
def process_conversion_attribution(self, conversion_event_id: int, attribution_type: str = 'last_click'):
    """
    Process attribution and commission calculation for a conversion event.
    
    This is the main task that gets triggered when a conversion is recorded.
    
    Args:
        conversion_event_id: ID of the conversion event
        attribution_type: Attribution model to use
    """
    logger.info(f"Processing attribution for conversion {conversion_event_id}")
    
    try:
        db = self.db
        
        # Get conversion event
        conversion = db.query(ConversionEvent).filter(
            ConversionEvent.conversion_event_id == conversion_event_id,
            ConversionEvent.is_deleted == False
        ).first()
        
        if not conversion:
            logger.error(f"Conversion {conversion_event_id} not found")
            return {'status': 'error', 'message': 'Conversion not found'}
        
        # Check if already processed
        if conversion.commission_amount is not None:
            logger.info(f"Conversion {conversion_event_id} already processed")
            return {'status': 'already_processed', 'conversion_event_id': conversion_event_id}
        
        # Calculate attribution
        logger.info(f"Calculating attribution with model: {attribution_type}")
        attribution_weights = AttributionService.attribute_conversion(
            db, conversion, attribution_type
        )
        
        # Calculate commission
        logger.info(f"Calculating commission for conversion {conversion_event_id}")
        commission_amount, commission_type, commission_value = CommissionService.calculate_commission(
            db, conversion
        )
        
        # Update conversion with commission
        CommissionService.update_conversion_commission(
            db, conversion, commission_amount, commission_type, commission_value
        )
        
        # Create commission snapshot for audit trail
        CommissionService.create_commission_snapshot(
            db, conversion, commission_amount, commission_type, commission_value
        )
        
        # Create touches for multi-touch attribution
        if commission_amount > 0:
            AttributionService.create_touches(
                db, conversion, attribution_weights, commission_amount
            )
        
        # Trigger counter update
        update_campaign_partner_counters.delay(conversion.partner_id, conversion.campaign_version_id)
        
        logger.info(
            f"Successfully processed conversion {conversion_event_id}. "
            f"Commission: ${commission_amount}"
        )
        
        return {
            'status': 'success',
            'conversion_event_id': conversion_event_id,
            'commission_amount': float(commission_amount),
            'attribution_type': attribution_type
        }
    
    except Exception as exc:
        logger.error(f"Error processing conversion {conversion_event_id}: {exc}", exc_info=True)
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.tasks.update_campaign_partner_counters',
    max_retries=2
)
def update_campaign_partner_counters(self, partner_id: int, campaign_version_id: int):
    """
    Update denormalized counters for a campaign partner.
    
    This includes total clicks, conversions, revenue, and commission.
    
    Args:
        partner_id: Partner ID
        campaign_version_id: Campaign version ID
    """
    logger.info(f"Updating counters for partner {partner_id}, campaign {campaign_version_id}")
    
    try:
        from sqlalchemy import func
        db = self.db
        
        # Get campaign partner
        campaign_partner = db.query(CampaignPartner).filter(
            CampaignPartner.partner_id == partner_id,
            CampaignPartner.campaign_version_id == campaign_version_id,
            CampaignPartner.is_deleted == False
        ).first()
        
        if not campaign_partner:
            logger.warning(f"CampaignPartner not found for partner {partner_id}, campaign {campaign_version_id}")
            return
        
        # Count total clicks
        total_clicks = db.query(func.count(Click.click_id)).join(PartnerLink).filter(
            PartnerLink.campaign_partner_id == campaign_partner.campaign_partner_id,
            Click.is_deleted == False
        ).scalar() or 0
        
        # Get last click timestamp
        last_click = db.query(func.max(Click.clicked_at)).join(PartnerLink).filter(
            PartnerLink.campaign_partner_id == campaign_partner.campaign_partner_id,
            Click.is_deleted == False
        ).scalar()
        
        # Aggregate conversion stats
        conversion_stats = db.query(
            func.count(ConversionEvent.conversion_event_id).label('total_conversions'),
            func.sum(ConversionEvent.event_value).label('total_revenue'),
            func.sum(ConversionEvent.commission_amount).label('total_commission'),
            func.max(ConversionEvent.occurred_at).label('last_conversion')
        ).filter(
            ConversionEvent.partner_id == partner_id,
            ConversionEvent.campaign_version_id == campaign_version_id,
            ConversionEvent.status.in_(['approved', 'paid']),
            ConversionEvent.is_deleted == False
        ).first()
        
        # Update counters
        campaign_partner.total_clicks = total_clicks
        campaign_partner.total_conversions = conversion_stats.total_conversions or 0
        campaign_partner.total_revenue = conversion_stats.total_revenue or Decimal('0')
        campaign_partner.total_commission_earned = conversion_stats.total_commission or Decimal('0')
        campaign_partner.last_click_at = last_click
        campaign_partner.last_conversion_at = conversion_stats.last_conversion
        campaign_partner.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(
            f"Updated counters: {total_clicks} clicks, "
            f"{conversion_stats.total_conversions} conversions"
        )
        
        return {
            'status': 'success',
            'partner_id': partner_id,
            'campaign_version_id': campaign_version_id,
            'total_clicks': total_clicks,
            'total_conversions': conversion_stats.total_conversions or 0
        }
    
    except Exception as exc:
        logger.error(f"Error updating counters: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.tasks.process_click',
    max_retries=2
)
def process_click(self, click_id: int):
    """
    Process a click event (lightweight post-processing).
    
    Can be used for creating funnel journey records, updating analytics, etc.
    
    Args:
        click_id: Click ID
    """
    logger.info(f"Post-processing click {click_id}")
    
    try:
        db = self.db
        
        click = db.query(Click).filter(Click.click_id == click_id).first()
        if not click:
            return {'status': 'not_found'}
        
        # TODO: Add funnel journey tracking
        # TODO: Add to analytics aggregation
        
        return {'status': 'success', 'click_id': click_id}
    
    except Exception as exc:
        logger.error(f"Error processing click {click_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.tasks.recalculate_attribution',
    max_retries=2
)
def recalculate_attribution(self, conversion_event_id: int, new_attribution_type: str):
    """
    Recalculate attribution for a conversion with a different model.
    
    Args:
        conversion_event_id: Conversion event ID
        new_attribution_type: New attribution model
    """
    logger.info(f"Recalculating attribution for conversion {conversion_event_id} with model {new_attribution_type}")
    
    try:
        db = self.db
        
        conversion = AttributionService.recalculate_attribution(
            db, conversion_event_id, new_attribution_type
        )
        
        # Audit log
        AuditLog.log_action(
            db=db,
            entity_type='conversion_events',
            entity_id=conversion_event_id,
            action='recalculate_attribution',
            actor_type='system',
            changes={
                'new_attribution_type': new_attribution_type
            }
        )
        
        return {
            'status': 'success',
            'conversion_event_id': conversion_event_id,
            'attribution_type': new_attribution_type
        }
    
    except Exception as exc:
        logger.error(f"Error recalculating attribution: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.tasks.send_notification',
    max_retries=3
)
def send_notification(self, notification_type: str, recipient_email: str, data: dict):
    """
    Send email notification.
    
    Args:
        notification_type: Type of notification (conversion_approved, payout_processed, etc.)
        recipient_email: Email address
        data: Notification data
    """
    logger.info(f"Sending {notification_type} notification to {recipient_email}")
    
    try:
        # TODO: Implement email sending using SMTP settings
        # For now, just log
        logger.info(f"Would send email: {notification_type} to {recipient_email}")
        logger.info(f"Data: {data}")
        
        return {
            'status': 'success',
            'notification_type': notification_type,
            'recipient': recipient_email
        }
    
    except Exception as exc:
        logger.error(f"Error sending notification: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.tasks.cleanup_old_data',
    max_retries=1
)
def cleanup_old_data(self, table_name: str, days_old: int = 90):
    """
    Clean up old data (soft deletes or archives).
    
    Args:
        table_name: Table to clean
        days_old: Delete records older than this many days
    """
    logger.info(f"Cleaning up old data from {table_name} (>{days_old} days)")
    
    try:
        from datetime import timedelta
        db = self.db
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        # TODO: Implement table-specific cleanup logic
        # For now, just log
        logger.info(f"Would clean {table_name} records older than {cutoff_date}")
        
        return {
            'status': 'success',
            'table': table_name,
            'cutoff_date': cutoff_date.isoformat()
        }
    
    except Exception as exc:
        logger.error(f"Error cleaning up data: {exc}", exc_info=True)
        raise self.retry(exc=exc)