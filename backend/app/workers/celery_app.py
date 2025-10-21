"""
Celery Application Configuration

Configures Celery for background task processing.
"""

from celery import Celery
from celery.schedules import crontab
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Create Celery app
celery_app = Celery(
    "affiliate_platform",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        'app.workers.tasks',
        'app.workers.scheduled_tasks'
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task execution
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_time_limit=300,  # 5 minutes hard limit
    task_soft_time_limit=240,  # 4 minutes soft limit
    
    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    
    # Result backend
    result_expires=3600,  # 1 hour
    result_backend_transport_options={
        'master_name': 'mymaster' if settings.ENV == 'production' else None
    },
    
    # Retry settings
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    
    # Rate limiting
    task_default_rate_limit='100/m',
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
)

# Scheduled tasks (Celery Beat)
celery_app.conf.beat_schedule = {
    # Update denormalized counters every 5 minutes
    'update-campaign-partner-counters': {
        'task': 'app.workers.scheduled_tasks.update_all_campaign_partner_counters',
        'schedule': crontab(minute='*/5'),
    },
    
    # Generate daily reports at 1 AM
    'generate-daily-reports': {
        'task': 'app.workers.scheduled_tasks.generate_daily_reports',
        'schedule': crontab(hour=1, minute=0),
    },
    
    # Clean up expired cookies daily at 2 AM
    'cleanup-expired-cookies': {
        'task': 'app.workers.scheduled_tasks.cleanup_expired_cookies',
        'schedule': crontab(hour=2, minute=0),
    },
    
    # Check for payouts to generate (monthly on the 1st at 3 AM)
    'auto-generate-payouts': {
        'task': 'app.workers.scheduled_tasks.auto_generate_monthly_payouts',
        'schedule': crontab(day_of_month=1, hour=3, minute=0),
    },
    
    # Recalculate partner tiers weekly (Sunday at 4 AM)
    'recalculate-partner-tiers': {
        'task': 'app.workers.scheduled_tasks.recalculate_partner_tiers',
        'schedule': crontab(day_of_week=0, hour=4, minute=0),
    },
}


@celery_app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery configuration."""
    print(f'Request: {self.request!r}')
    return {
        'status': 'ok',
        'broker': settings.REDIS_URL,
        'backend': settings.REDIS_URL
    }


# Task error handler
@celery_app.task(bind=True)
def task_failure_handler(self, uuid, exception, traceback, *args, **kwargs):
    """Handle task failures."""
    logger.error(f'Task {uuid} failed: {exception}', exc_info=True)
    # TODO: Send alert to monitoring system (Sentry, email, Slack, etc.)


# Register error handler
celery_app.Task.on_failure = task_failure_handler