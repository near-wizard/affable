"""
Celery Scheduled Tasks

Periodic jobs for aggregation, cleanup, and maintenance.
"""

from celery import Task
from celery.schedules import crontab
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging
from datetime import datetime, timedelta
from decimal import Decimal

from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.models import (
    CampaignPartner, Partner, Click, PartnerLink,
    ConversionEvent, Cookie, Payout, PartnerPaymentMethod,
    PaymentProvider, PayoutEvent
)

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


# =====================================================
# AGGREGATION TASKS
# =====================================================

@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.scheduled_tasks.update_all_campaign_partner_counters',
    max_retries=2
)
def update_all_campaign_partner_counters(self):
    """
    Update denormalized counters for all campaign partners.
    
    Runs every 5 minutes to keep dashboard data fresh.
    """
    logger.info("Starting bulk campaign partner counter update")
    
    try:
        db = self.db
        
        # Get all active campaign partners
        campaign_partners = db.query(CampaignPartner).filter(
            CampaignPartner.is_deleted == False,
            CampaignPartner.status == 'approved'
        ).all()
        
        updated_count = 0
        
        for cp in campaign_partners:
            try:
                # Count total clicks
                total_clicks = db.query(func.count(Click.click_id)).join(PartnerLink).filter(
                    PartnerLink.campaign_partner_id == cp.campaign_partner_id,
                    Click.is_deleted == False
                ).scalar() or 0
                
                # Get last click timestamp
                last_click = db.query(func.max(Click.clicked_at)).join(PartnerLink).filter(
                    PartnerLink.campaign_partner_id == cp.campaign_partner_id,
                    Click.is_deleted == False
                ).scalar()
                
                # Aggregate conversion stats
                conversion_stats = db.query(
                    func.count(ConversionEvent.conversion_event_id).label('total_conversions'),
                    func.sum(ConversionEvent.event_value).label('total_revenue'),
                    func.sum(ConversionEvent.commission_amount).label('total_commission'),
                    func.max(ConversionEvent.occurred_at).label('last_conversion')
                ).filter(
                    ConversionEvent.partner_id == cp.partner_id,
                    ConversionEvent.campaign_version_id == cp.campaign_version_id,
                    ConversionEvent.status.in_(['approved', 'paid']),
                    ConversionEvent.is_deleted == False
                ).first()
                
                # Update counters
                cp.total_clicks = total_clicks
                cp.total_conversions = conversion_stats.total_conversions or 0
                cp.total_revenue = conversion_stats.total_revenue or Decimal('0')
                cp.total_commission_earned = conversion_stats.total_commission or Decimal('0')
                cp.last_click_at = last_click
                cp.last_conversion_at = conversion_stats.last_conversion
                cp.updated_at = datetime.utcnow()
                
                updated_count += 1
                
            except Exception as e:
                logger.error(f"Error updating campaign_partner {cp.campaign_partner_id}: {e}")
                continue
        
        db.commit()
        
        logger.info(f"✅ Updated {updated_count}/{len(campaign_partners)} campaign partners")
        
        return {
            'status': 'success',
            'updated_count': updated_count,
            'total_count': len(campaign_partners)
        }
    
    except Exception as exc:
        logger.error(f"Error in bulk counter update: {exc}", exc_info=True)
        raise self.retry(exc=exc)


# =====================================================
# CLEANUP TASKS
# =====================================================

@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.scheduled_tasks.cleanup_expired_cookies',
    max_retries=1
)
def cleanup_expired_cookies(self):
    """
    Soft-delete cookies expired more than 7 days ago.
    
    Runs daily at 2 AM.
    """
    logger.info("Starting expired cookie cleanup")
    
    try:
        db = self.db
        
        # Soft delete cookies expired more than 7 days ago
        cutoff_date = datetime.utcnow() - timedelta(days=7)
        
        deleted_count = db.query(Cookie).filter(
            Cookie.expires_at < cutoff_date,
            Cookie.is_deleted == False
        ).update({
            'is_deleted': True,
            'deleted_at': datetime.utcnow()
        }, synchronize_session=False)
        
        db.commit()
        
        logger.info(f"✅ Cleaned up {deleted_count} expired cookies")
        
        return {
            'status': 'success',
            'deleted_count': deleted_count,
            'cutoff_date': cutoff_date.isoformat()
        }
    
    except Exception as exc:
        logger.error(f"Error cleaning up cookies: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.scheduled_tasks.archive_old_clicks',
    max_retries=1
)
def archive_old_clicks(self, days_old: int = 730):
    """
    Archive clicks older than retention period (default: 2 years).
    
    Args:
        days_old: Delete clicks older than this many days (default 730 = 2 years)
    """
    logger.info(f"Starting old click archival (>{days_old} days)")
    
    try:
        db = self.db
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        archived_count = db.query(Click).filter(
            Click.clicked_at < cutoff_date,
            Click.is_deleted == False
        ).update({
            'is_deleted': True,
            'deleted_at': datetime.utcnow()
        }, synchronize_session=False)
        
        db.commit()
        
        logger.info(f"✅ Archived {archived_count} old clicks")
        
        return {
            'status': 'success',
            'archived_count': archived_count,
            'cutoff_date': cutoff_date.isoformat()
        }
    
    except Exception as exc:
        logger.error(f"Error archiving clicks: {exc}", exc_info=True)
        raise self.retry(exc=exc)


# =====================================================
# PAYOUT TASKS
# =====================================================

@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.scheduled_tasks.auto_generate_monthly_payouts',
    max_retries=2
)
def auto_generate_monthly_payouts(self, min_amount: Decimal = Decimal('50.00')):
    """
    Auto-generate monthly payouts for approved conversions.
    
    Runs monthly on the 1st at 3 AM.
    
    Args:
        min_amount: Minimum payout amount (default $50)
    """
    logger.info(f"Starting auto payout generation (min: ${min_amount})")
    
    try:
        db = self.db
        
        # Find partners with approved conversions not yet in a payout
        pending_partners = db.query(
            ConversionEvent.partner_id,
            func.sum(ConversionEvent.commission_amount).label('total_commission'),
            func.count(ConversionEvent.conversion_event_id).label('conversion_count'),
            func.min(ConversionEvent.approved_at).label('earliest_approval'),
            func.max(ConversionEvent.approved_at).label('latest_approval')
        ).outerjoin(
            PayoutEvent,
            PayoutEvent.conversion_event_id == ConversionEvent.conversion_event_id
        ).filter(
            ConversionEvent.status == 'approved',
            ConversionEvent.is_deleted == False,
            PayoutEvent.payout_id == None
        ).group_by(
            ConversionEvent.partner_id
        ).having(
            func.sum(ConversionEvent.commission_amount) >= min_amount
        ).all()
        
        payouts_created = 0
        
        for partner_data in pending_partners:
            try:
                partner_id = partner_data.partner_id
                total_amount = partner_data.total_commission
                
                # Get partner's default payment method
                payment_method = db.query(PartnerPaymentMethod).filter(
                    PartnerPaymentMethod.partner_id == partner_id,
                    PartnerPaymentMethod.is_default == True,
                    PartnerPaymentMethod.is_deleted == False,
                    PartnerPaymentMethod.is_verified == True
                ).first()
                
                if not payment_method:
                    logger.warning(f"Partner {partner_id} has no verified payment method")
                    continue
                
                # Create payout record
                payout = Payout(
                    partner_id=partner_id,
                    partner_payment_method_id=payment_method.partner_payment_method_id,
                    amount=total_amount,
                    currency='USD',
                    payment_provider_id=payment_method.payment_provider_id,
                    status='pending',
                    start_date=partner_data.earliest_approval,
                    end_date=partner_data.latest_approval,
                    created_at=datetime.utcnow()
                )
                
                db.add(payout)
                db.flush()
                
                # Link conversions to payout
                conversions_to_link = db.query(ConversionEvent).outerjoin(
                    PayoutEvent,
                    PayoutEvent.conversion_event_id == ConversionEvent.conversion_event_id
                ).filter(
                    ConversionEvent.partner_id == partner_id,
                    ConversionEvent.status == 'approved',
                    ConversionEvent.is_deleted == False,
                    PayoutEvent.payout_id == None
                ).all()
                
                for conversion in conversions_to_link:
                    payout_event = PayoutEvent(
                        payout_id=payout.payout_id,
                        conversion_event_id=conversion.conversion_event_id,
                        commission_amount=conversion.commission_amount
                    )
                    db.add(payout_event)
                
                payouts_created += 1
                
                logger.info(
                    f"Created payout {payout.payout_id} for partner {partner_id}: "
                    f"${total_amount} ({partner_data.conversion_count} conversions)"
                )
                
            except Exception as e:
                logger.error(f"Error creating payout for partner {partner_data.partner_id}: {e}")
                continue
        
        db.commit()
        
        logger.info(f"✅ Generated {payouts_created} payouts")
        
        return {
            'status': 'success',
            'payouts_created': payouts_created,
            'min_amount': float(min_amount)
        }
    
    except Exception as exc:
        logger.error(f"Error generating payouts: {exc}", exc_info=True)
        raise self.retry(exc=exc)


# =====================================================
# TIER MANAGEMENT
# =====================================================

@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.scheduled_tasks.recalculate_partner_tiers',
    max_retries=1
)
def recalculate_partner_tiers(self):
    """
    Recalculate partner tier assignments based on 90-day performance.
    
    Tiers: standard < bronze < silver < gold < platinum
    
    Runs weekly on Sunday at 4 AM.
    """
    logger.info("Starting partner tier recalculation")
    
    try:
        db = self.db
        
        # Define tier thresholds based on last 90 days
        tier_thresholds = [
            ('platinum', {'revenue': 50000, 'conversions': 500}),
            ('gold', {'revenue': 20000, 'conversions': 200}),
            ('silver', {'revenue': 5000, 'conversions': 50}),
            ('bronze', {'revenue': 1000, 'conversions': 10}),
            ('standard', {'revenue': 0, 'conversions': 0})
        ]
        
        # Calculate partner performance over last 90 days
        cutoff_date = datetime.utcnow() - timedelta(days=90)
        
        partners = db.query(
            Partner.partner_id,
            Partner.tier.label('current_tier'),
            func.coalesce(func.sum(ConversionEvent.event_value), 0).label('total_revenue'),
            func.count(ConversionEvent.conversion_event_id).label('total_conversions')
        ).outerjoin(
            ConversionEvent,
            (ConversionEvent.partner_id == Partner.partner_id) &
            (ConversionEvent.occurred_at > cutoff_date) &
            (ConversionEvent.status.in_(['approved', 'paid'])) &
            (ConversionEvent.is_deleted == False)
        ).filter(
            Partner.is_deleted == False,
            Partner.status == 'active'
        ).group_by(
            Partner.partner_id,
            Partner.tier
        ).all()
        
        tier_changes = 0
        tier_change_log = []
        
        for partner_data in partners:
            partner_id = partner_data.partner_id
            current_tier = partner_data.current_tier
            revenue = float(partner_data.total_revenue or 0)
            conversions = partner_data.total_conversions or 0
            
            # Determine new tier
            new_tier = 'standard'
            for tier_name, thresholds in tier_thresholds:
                if revenue >= thresholds['revenue'] and conversions >= thresholds['conversions']:
                    new_tier = tier_name
                    break
            
            # Update if tier changed
            if new_tier != current_tier:
                db.query(Partner).filter(
                    Partner.partner_id == partner_id
                ).update({
                    'tier': new_tier,
                    'updated_at': datetime.utcnow()
                }, synchronize_session=False)
                
                tier_changes += 1
                tier_change_log.append({
                    'partner_id': partner_id,
                    'old_tier': current_tier,
                    'new_tier': new_tier,
                    'revenue': revenue,
                    'conversions': conversions
                })
                
                logger.info(f"Partner {partner_id}: {current_tier} → {new_tier}")
        
        db.commit()
        
        logger.info(f"✅ Recalculated tiers for {len(partners)} partners ({tier_changes} changes)")
        
        return {
            'status': 'success',
            'partners_processed': len(partners),
            'tier_changes': tier_changes,
            'changes': tier_change_log
        }
    
    except Exception as exc:
        logger.error(f"Error recalculating tiers: {exc}", exc_info=True)
        raise self.retry(exc=exc)


# =====================================================
# REPORTING TASKS
# =====================================================

@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.scheduled_tasks.generate_daily_reports',
    max_retries=1
)
def generate_daily_reports(self):
    """
    Generate daily performance reports.
    
    Runs daily at 1 AM.
    """
    logger.info("Starting daily report generation")
    
    try:
        db = self.db
        
        # Get yesterday's date range
        today = datetime.utcnow().date()
        yesterday_start = datetime.combine(today - timedelta(days=1), datetime.min.time())
        yesterday_end = datetime.combine(today, datetime.min.time())
        
        # Aggregate daily stats
        daily_stats = {
            'date': (today - timedelta(days=1)).isoformat(),
            'clicks': 0,
            'conversions': 0,
            'revenue': 0,
            'commission': 0
        }
        
        # Count clicks
        daily_stats['clicks'] = db.query(func.count(Click.click_id)).filter(
            Click.clicked_at >= yesterday_start,
            Click.clicked_at < yesterday_end,
            Click.is_deleted == False
        ).scalar() or 0
        
        # Aggregate conversions
        conversion_stats = db.query(
            func.count(ConversionEvent.conversion_event_id).label('count'),
            func.sum(ConversionEvent.event_value).label('revenue'),
            func.sum(ConversionEvent.commission_amount).label('commission')
        ).filter(
            ConversionEvent.occurred_at >= yesterday_start,
            ConversionEvent.occurred_at < yesterday_end,
            ConversionEvent.is_deleted == False
        ).first()
        
        daily_stats['conversions'] = conversion_stats.count or 0
        daily_stats['revenue'] = float(conversion_stats.revenue or 0)
        daily_stats['commission'] = float(conversion_stats.commission or 0)
        
        logger.info(f"✅ Daily report: {daily_stats}")
        
        # TODO: Store in reporting table or send via email
        
        return {
            'status': 'success',
            'report': daily_stats
        }
    
    except Exception as exc:
        logger.error(f"Error generating daily report: {exc}", exc_info=True)
        raise self.retry(exc=exc)


# =====================================================
# FRAUD DETECTION
# =====================================================

@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.scheduled_tasks.detect_fraud_patterns',
    max_retries=1
)
def detect_fraud_patterns(self):
    """
    Detect suspicious patterns in clicks and conversions.
    
    Patterns checked:
    - Excessive clicks from same IP
    - Conversions without clicks
    - Abnormally high conversion rates
    """
    logger.info("Starting fraud pattern detection")
    
    try:
        db = self.db
        fraud_cases = []
        
        # Pattern 1: Excessive clicks from same IP (last hour)
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        
        excessive_clicks = db.query(
            Click.ip_address,
            Click.partner_link_id,
            func.count(Click.click_id).label('click_count'),
            func.count(func.distinct(Click.cookie_id)).label('unique_cookies')
        ).filter(
            Click.clicked_at > one_hour_ago,
            Click.is_deleted == False
        ).group_by(
            Click.ip_address,
            Click.partner_link_id
        ).having(
            (func.count(Click.click_id) > 100) |
            ((func.count(Click.click_id) > 10) & (func.count(func.distinct(Click.cookie_id)) == 1))
        ).all()
        
        for row in excessive_clicks:
            fraud_cases.append({
                'type': 'excessive_clicks_same_ip',
                'ip_address': str(row.ip_address),
                'partner_link_id': row.partner_link_id,
                'click_count': row.click_count,
                'unique_cookies': row.unique_cookies
            })
        
        # Pattern 2: Conversions without clicks (last 24 hours)
        yesterday = datetime.utcnow() - timedelta(hours=24)
        
        conversions_without_clicks = db.query(
            ConversionEvent.conversion_event_id,
            ConversionEvent.partner_id
        ).filter(
            ConversionEvent.click_id == None,
            ConversionEvent.cookie_id == None,
            ConversionEvent.occurred_at > yesterday,
            ConversionEvent.is_deleted == False
        ).all()
        
        for row in conversions_without_clicks:
            fraud_cases.append({
                'type': 'conversion_without_click',
                'conversion_event_id': row.conversion_event_id,
                'partner_id': row.partner_id
            })
        
        # Pattern 3: Abnormally high conversion rate (>50%)
        high_conversion_partners = db.query(
            CampaignPartner.campaign_partner_id,
            CampaignPartner.partner_id,
            CampaignPartner.total_clicks,
            CampaignPartner.total_conversions,
            (CampaignPartner.total_conversions.cast(float) / 
             func.nullif(CampaignPartner.total_clicks, 0) * 100).label('conversion_rate')
        ).filter(
            CampaignPartner.total_clicks > 50,
            CampaignPartner.is_deleted == False,
            (CampaignPartner.total_conversions.cast(float) / 
             func.nullif(CampaignPartner.total_clicks, 0)) > 0.5
        ).all()
        
        for row in high_conversion_partners:
            fraud_cases.append({
                'type': 'abnormal_conversion_rate',
                'campaign_partner_id': row.campaign_partner_id,
                'partner_id': row.partner_id,
                'conversion_rate': float(row.conversion_rate)
            })
        
        # Log fraud cases
        if fraud_cases:
            logger.warning(f"⚠️ Detected {len(fraud_cases)} potential fraud cases")
            for case in fraud_cases[:10]:  # Log first 10
                logger.warning(f"  {case['type']}: {case}")
        else:
            logger.info("✅ No fraud patterns detected")
        
        # TODO: Insert into fraud_alerts table for manual review
        # TODO: Send alerts to monitoring system
        
        return {
            'status': 'success',
            'fraud_cases_detected': len(fraud_cases),
            'cases': fraud_cases[:50]  # Return first 50
        }
    
    except Exception as exc:
        logger.error(f"Error detecting fraud: {exc}", exc_info=True)
        raise self.retry(exc=exc)


# =====================================================
# MANUAL TRIGGER TASKS
# =====================================================

@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.scheduled_tasks.recalculate_all_commissions',
    max_retries=1
)
def recalculate_all_commissions(self, campaign_version_id: int = None):
    """
    Manually recalculate commissions for all pending conversions.
    
    Useful after commission rule changes.
    
    Args:
        campaign_version_id: Optional - recalculate only for specific campaign
    """
    logger.info(f"Starting commission recalculation (campaign: {campaign_version_id or 'all'})")
    
    try:
        from app.workers.tasks import process_conversion_attribution
        
        db = self.db
        
        # Build query
        query = db.query(ConversionEvent.conversion_event_id).filter(
            ConversionEvent.status == 'pending',
            ConversionEvent.is_deleted == False
        )
        
        if campaign_version_id:
            query = query.filter(ConversionEvent.campaign_version_id == campaign_version_id)
        
        conversions = query.all()
        
        # Queue attribution tasks
        queued = 0
        for conv in conversions:
            try:
                process_conversion_attribution.delay(conv.conversion_event_id)
                queued += 1
            except Exception as e:
                logger.error(f"Failed to queue attribution for {conv.conversion_event_id}: {e}")
        
        logger.info(f"✅ Queued {queued}/{len(conversions)} conversions for recalculation")
        
        return {
            'status': 'success',
            'conversions_queued': queued,
            'total_conversions': len(conversions)
        }
    
    except Exception as exc:
        logger.error(f"Error recalculating commissions: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.scheduled_tasks.export_conversion_report',
    max_retries=1
)
def export_conversion_report(
    self,
    start_date: str,
    end_date: str,
    partner_id: int = None,
    vendor_id: int = None
):
    """
    Generate and export conversion report as CSV.
    
    Args:
        start_date: ISO format date string
        end_date: ISO format date string
        partner_id: Optional partner filter
        vendor_id: Optional vendor filter
    """
    logger.info(f"Generating conversion report: {start_date} to {end_date}")
    
    try:
        from app.models import Campaign, Vendor, CampaignVersion, ConversionEventType
        
        db = self.db
        
        # Build query
        query = db.query(
            ConversionEvent.conversion_event_id,
            ConversionEvent.transaction_id,
            ConversionEvent.occurred_at,
            ConversionEvent.status,
            ConversionEvent.event_value,
            ConversionEvent.commission_amount,
            Partner.name.label('partner_name'),
            Partner.email.label('partner_email'),
            CampaignVersion.name.label('campaign_name'),
            Vendor.name.label('vendor_name'),
            ConversionEventType.display_name.label('event_type')
        ).join(
            Partner, Partner.partner_id == ConversionEvent.partner_id
        ).join(
            CampaignVersion, CampaignVersion.campaign_version_id == ConversionEvent.campaign_version_id
        ).join(
            Campaign, Campaign.campaign_id == CampaignVersion.campaign_id
        ).join(
            Vendor, Vendor.vendor_id == Campaign.vendor_id
        ).join(
            ConversionEventType, ConversionEventType.conversion_event_type_id == ConversionEvent.conversion_event_type_id
        ).filter(
            ConversionEvent.is_deleted == False,
            ConversionEvent.occurred_at.between(
                datetime.fromisoformat(start_date),
                datetime.fromisoformat(end_date)
            )
        )
        
        if partner_id:
            query = query.filter(ConversionEvent.partner_id == partner_id)
        
        if vendor_id:
            query = query.filter(Campaign.vendor_id == vendor_id)
        
        results = query.order_by(ConversionEvent.occurred_at.desc()).all()
        
        # Generate CSV
        csv_lines = [
            "conversion_id,transaction_id,occurred_at,status,event_value,commission,"
            "partner,partner_email,campaign,vendor,event_type"
        ]
        
        for row in results:
            csv_lines.append(
                f"{row.conversion_event_id},"
                f"{row.transaction_id or ''},"
                f"{row.occurred_at.isoformat()},"
                f"{row.status},"
                f"{row.event_value or 0},"
                f"{row.commission_amount or 0},"
                f"\"{row.partner_name}\","
                f"{row.partner_email},"
                f"\"{row.campaign_name}\","
                f"\"{row.vendor_name}\","
                f"\"{row.event_type}\""
            )
        
        csv_data = "\n".join(csv_lines)
        
        logger.info(f"✅ Exported {len(results)} conversions to CSV")
        
        # TODO: Save to S3 or file storage and return URL
        # For now, return preview
        
        return {
            'status': 'success',
            'row_count': len(results),
            'preview': csv_data[:500] + "..." if len(csv_data) > 500 else csv_data
        }
    
    except Exception as exc:
        logger.error(f"Error exporting report: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.scheduled_tasks.cleanup_pending_conversions',
    max_retries=1
)
def cleanup_pending_conversions(self, timeout_days: int = 30):
    """
    Auto-reject conversions that have been pending too long.
    
    Args:
        timeout_days: Auto-reject conversions pending > this many days (default 30)
    """
    logger.info(f"Cleaning up conversions pending > {timeout_days} days")
    
    try:
        db = self.db
        
        cutoff_date = datetime.utcnow() - timedelta(days=timeout_days)
        
        rejected_count = db.query(ConversionEvent).filter(
            ConversionEvent.status == 'pending',
            ConversionEvent.recorded_at < cutoff_date,
            ConversionEvent.is_deleted == False
        ).update({
            'status': 'rejected',
            'rejected_at': datetime.utcnow(),
            'rejection_reason': f'Auto-rejected: exceeded {timeout_days}-day approval timeout'
        }, synchronize_session=False)
        
        db.commit()
        
        logger.info(f"✅ Auto-rejected {rejected_count} stale conversions")
        
        return {
            'status': 'success',
            'rejected_count': rejected_count,
            'timeout_days': timeout_days
        }
    
    except Exception as exc:
        logger.error(f"Error cleaning up pending conversions: {exc}", exc_info=True)
        raise self.retry(exc=exc)


# =====================================================
# MONITORING & HEALTH
# =====================================================

@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.scheduled_tasks.health_check',
    max_retries=1
)
def health_check(self):
    """
    Perform system health checks.
    
    Verifies database connectivity, queue status, etc.
    """
    logger.info("Running health check")
    
    health_status = {
        'timestamp': datetime.utcnow().isoformat(),
        'database': 'unknown',
        'celery': 'ok',
        'errors': []
    }
    
    try:
        db = self.db
        
        # Check database connectivity
        db.execute('SELECT 1')
        health_status['database'] = 'ok'
        
        # Check for stale tasks (optional)
        # TODO: Query task results table if implemented
        
        logger.info(f"✅ Health check passed: {health_status}")
        
    except Exception as e:
        health_status['database'] = 'error'
        health_status['errors'].append(f"Database error: {str(e)}")
        logger.error(f"❌ Health check failed: {e}", exc_info=True)
    
    return health_status


# =====================================================
# NOTIFICATION TASKS
# =====================================================

@celery_app.task(
    base=DatabaseTask,
    bind=True,
    name='app.workers.scheduled_tasks.send_performance_reports',
    max_retries=2
)
def send_performance_reports(self):
    """
    Send weekly performance reports to active partners.
    
    Runs weekly (configure in beat schedule).
    """
    logger.info("Starting performance report emails")
    
    try:
        db = self.db
        
        # Get active partners with recent activity
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        partners_with_activity = db.query(
            Partner.partner_id,
            Partner.name,
            Partner.email,
            func.coalesce(func.sum(ConversionEvent.commission_amount), 0).label('weekly_earnings'),
            func.count(ConversionEvent.conversion_event_id).label('weekly_conversions'),
            func.sum(
                func.case((ConversionEvent.status == 'pending', 1), else_=0)
            ).label('pending_approvals')
        ).outerjoin(
            ConversionEvent,
            (ConversionEvent.partner_id == Partner.partner_id) &
            (ConversionEvent.occurred_at > seven_days_ago) &
            (ConversionEvent.is_deleted == False)
        ).filter(
            Partner.is_deleted == False,
            Partner.status == 'active'
        ).group_by(
            Partner.partner_id,
            Partner.name,
            Partner.email
        ).having(
            func.count(ConversionEvent.conversion_event_id) > 0
        ).all()
        
        reports_sent = 0
        
        for partner in partners_with_activity:
            # In production, send actual emails via SMTP or service
            report_data = {
                'partner_id': partner.partner_id,
                'name': partner.name,
                'email': partner.email,
                'weekly_earnings': float(partner.weekly_earnings),
                'weekly_conversions': partner.weekly_conversions,
                'pending_approvals': partner.pending_approvals
            }
            
            logger.info(
                f"📧 Report for {partner.name}: "
                f"${report_data['weekly_earnings']:.2f} earned, "
                f"{report_data['weekly_conversions']} conversions"
            )
            
            # TODO: Integrate with email service (SendGrid, AWS SES, etc.)
            # from app.workers.tasks import send_notification
            # send_notification.delay('weekly_report', partner.email, report_data)
            
            reports_sent += 1
        
        logger.info(f"✅ Sent {reports_sent} performance reports")
        
        return {
            'status': 'success',
            'reports_sent': reports_sent
        }
    
    except Exception as exc:
        logger.error(f"Error sending performance reports: {exc}", exc_info=True)
        raise self.retry(exc=exc)


# =====================================================
# SCHEDULED TASK REGISTRATION
# =====================================================

# Note: Schedule is defined in celery_app.py beat_schedule
# This ensures all tasks are properly registered and discoverable

if __name__ == "__main__":
    # For testing individual tasks
    print("🚀 Celery Scheduled Tasks Module")
    print("\nAvailable scheduled tasks:")
    print("  - update_all_campaign_partner_counters (every 5 min)")
    print("  - generate_daily_reports (daily 1 AM)")
    print("  - cleanup_expired_cookies (daily 2 AM)")
    print("  - auto_generate_monthly_payouts (monthly 1st, 3 AM)")
    print("  - recalculate_partner_tiers (weekly Sunday 4 AM)")
    print("\nAvailable manual tasks:")
    print("  - detect_fraud_patterns")
    print("  - recalculate_all_commissions")
    print("  - export_conversion_report")
    print("  - cleanup_pending_conversions")
    print("  - health_check")
    print("  - send_performance_reports")