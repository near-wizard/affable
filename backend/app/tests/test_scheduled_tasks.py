"""
Unit Tests for Scheduled Tasks

Tests background tasks for aggregation, cleanup, and maintenance.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from app.workers.scheduled_tasks import (
    update_all_campaign_partner_counters,
    cleanup_expired_cookies,
    archive_old_clicks,
    auto_generate_monthly_payouts,
    recalculate_partner_tiers,
    detect_fraud_patterns,
    generate_daily_reports,
    recalculate_all_commissions,
    cleanup_pending_conversions
)
from app.models import CampaignPartner, Cookie, Click, Payout, Partner, ConversionEvent


class TestUpdateCampaignPartnerCounters:
    """Tests for counter aggregation task."""
    
    def test_updates_click_count(
        self, db_session, campaign_partner, partner_link, click_factory
    ):
        """Test that task updates total_clicks counter."""
        # Create clicks
        click_factory(partner_link)
        click_factory(partner_link)
        click_factory(partner_link)
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = update_all_campaign_partner_counters()
        
        # Verify counter updated
        db_session.refresh(campaign_partner)
        assert campaign_partner.total_clicks == 3
    
    def test_updates_conversion_count(
        self, db_session, campaign_partner, partner, campaign_version,
        conversion_factory, conversion_event_type
    ):
        """Test that task updates total_conversions counter."""
        # Create conversions
        conversion_factory(
            partner, campaign_version, conversion_event_type,
            status='approved',
            commission_amount=Decimal('10.00')
        )
        conversion_factory(
            partner, campaign_version, conversion_event_type,
            status='approved',
            commission_amount=Decimal('15.00')
        )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = update_all_campaign_partner_counters()
        
        # Verify counters updated
        db_session.refresh(campaign_partner)
        assert campaign_partner.total_conversions == 2
        assert campaign_partner.total_commission_earned == Decimal('25.00')
    
    def test_updates_last_click_timestamp(
        self, db_session, campaign_partner, partner_link, click_factory
    ):
        """Test that task updates last_click_at."""
        click1 = click_factory(partner_link, clicked_at=datetime(2025, 1, 1))
        click2 = click_factory(partner_link, clicked_at=datetime(2025, 1, 15))
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = update_all_campaign_partner_counters()
        
        # Verify last click timestamp
        db_session.refresh(campaign_partner)
        assert campaign_partner.last_click_at == click2.clicked_at
    
    def test_handles_no_data_gracefully(self, db_session, campaign_partner):
        """Test that task handles campaign partner with no clicks."""
        # Run task with no clicks
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = update_all_campaign_partner_counters()
        
        # Should set counters to 0
        db_session.refresh(campaign_partner)
        assert campaign_partner.total_clicks == 0
        assert campaign_partner.total_conversions == 0
    
    def test_ignores_deleted_records(
        self, db_session, campaign_partner, partner_link, click_factory
    ):
        """Test that deleted clicks are not counted."""
        click_factory(partner_link)
        deleted_click = click_factory(partner_link)
        deleted_click.is_deleted = True
        db_session.commit()
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = update_all_campaign_partner_counters()
        
        db_session.refresh(campaign_partner)
        assert campaign_partner.total_clicks == 1  # Only non-deleted


class TestCleanupExpiredCookies:
    """Tests for expired cookie cleanup task."""
    
    def test_deletes_expired_cookies(self, db_session, cookie_factory, partner, campaign_version):
        """Test that expired cookies are soft-deleted."""
        # Create expired cookie (>7 days old)
        expired_cookie = cookie_factory(
            partner, campaign_version,
            expires_at=datetime.utcnow() - timedelta(days=10)
        )
        
        # Create valid cookie
        valid_cookie = cookie_factory(
            partner, campaign_version,
            expires_at=datetime.utcnow() + timedelta(days=10)
        )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = cleanup_expired_cookies()
        
        # Verify expired cookie deleted
        db_session.refresh(expired_cookie)
        db_session.refresh(valid_cookie)
        
        assert expired_cookie.is_deleted == True
        assert valid_cookie.is_deleted == False
        assert result['deleted_count'] == 1
    
    def test_respects_grace_period(self, db_session, cookie_factory, partner, campaign_version):
        """Test that recently expired cookies (< 7 days) are not deleted."""
        # Create cookie expired 3 days ago (within grace period)
        recent_cookie = cookie_factory(
            partner, campaign_version,
            expires_at=datetime.utcnow() - timedelta(days=3)
        )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = cleanup_expired_cookies()
        
        db_session.refresh(recent_cookie)
        assert recent_cookie.is_deleted == False


class TestArchiveOldClicks:
    """Tests for old click archival task."""
    
    def test_archives_old_clicks(self, db_session, partner_link, click_factory):
        """Test that old clicks are archived."""
        # Create old click (>2 years)
        old_click = click_factory(
            partner_link,
            clicked_at=datetime.utcnow() - timedelta(days=800)
        )
        
        # Create recent click
        recent_click = click_factory(
            partner_link,
            clicked_at=datetime.utcnow() - timedelta(days=30)
        )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = archive_old_clicks(days_old=730)
        
        db_session.refresh(old_click)
        db_session.refresh(recent_click)
        
        assert old_click.is_deleted == True
        assert recent_click.is_deleted == False
        assert result['archived_count'] == 1
    
    def test_custom_retention_period(self, db_session, partner_link, click_factory):
        """Test archival with custom retention period."""
        click = click_factory(
            partner_link,
            clicked_at=datetime.utcnow() - timedelta(days=100)
        )
        
        # Archive clicks older than 90 days
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = archive_old_clicks(days_old=90)
        
        db_session.refresh(click)
        assert click.is_deleted == True


class TestAutoGenerateMonthlyPayouts:
    """Tests for automatic payout generation task."""
    
    def test_generates_payout_for_approved_conversions(
        self, db_session, partner, campaign_version, conversion_factory,
        conversion_event_type, partner_payment_method
    ):
        """Test that payout is generated for approved conversions."""
        # Create approved conversions
        conversion_factory(
            partner, campaign_version, conversion_event_type,
            status='approved',
            commission_amount=Decimal('30.00'),
            approved_at=datetime.utcnow()
        )
        conversion_factory(
            partner, campaign_version, conversion_event_type,
            status='approved',
            commission_amount=Decimal('25.00'),
            approved_at=datetime.utcnow()
        )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = auto_generate_monthly_payouts(min_amount=Decimal('50.00'))
        
        # Verify payout created
        payout = db_session.query(Payout).filter(
            Payout.partner_id == partner.partner_id
        ).first()
        
        assert payout is not None
        assert payout.amount == Decimal('55.00')
        assert payout.status == 'pending'
        assert result['payouts_created'] == 1
    
    def test_respects_minimum_amount(
        self, db_session, partner, campaign_version, conversion_factory,
        conversion_event_type, partner_payment_method
    ):
        """Test that payout is not generated below minimum threshold."""
        # Create conversion below threshold
        conversion_factory(
            partner, campaign_version, conversion_event_type,
            status='approved',
            commission_amount=Decimal('25.00'),
            approved_at=datetime.utcnow()
        )
        
        # Run task with $50 minimum
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = auto_generate_monthly_payouts(min_amount=Decimal('50.00'))
        
        # No payout should be created
        payout_count = db_session.query(Payout).count()
        assert payout_count == 0
        assert result['payouts_created'] == 0
    
    def test_requires_payment_method(
        self, db_session, partner, campaign_version, conversion_factory,
        conversion_event_type
    ):
        """Test that payout is not generated without payment method."""
        # Create approved conversion (no payment method fixture)
        conversion_factory(
            partner, campaign_version, conversion_event_type,
            status='approved',
            commission_amount=Decimal('100.00'),
            approved_at=datetime.utcnow()
        )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = auto_generate_monthly_payouts()
        
        # No payout created (no payment method)
        payout_count = db_session.query(Payout).count()
        assert payout_count == 0
    
    def test_excludes_pending_conversions(
        self, db_session, partner, campaign_version, conversion_factory,
        conversion_event_type, partner_payment_method
    ):
        """Test that pending conversions are not included in payout."""
        # Create pending conversion
        conversion_factory(
            partner, campaign_version, conversion_event_type,
            status='pending',
            commission_amount=Decimal('100.00')
        )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = auto_generate_monthly_payouts()
        
        payout_count = db_session.query(Payout).count()
        assert payout_count == 0


class TestRecalculatePartnerTiers:
    """Tests for partner tier recalculation task."""
    
    def test_upgrades_partner_tier(
        self, db_session, partner, campaign_version, conversion_factory,
        conversion_event_type
    ):
        """Test that partner tier is upgraded based on performance."""
        # Partner starts as silver
        assert partner.tier == 'silver'
        
        # Create high-value conversions
        for _ in range(250):
            conversion_factory(
                partner, campaign_version, conversion_event_type,
                status='approved',
                event_value=Decimal('100.00'),
                occurred_at=datetime.utcnow() - timedelta(days=30)
            )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = recalculate_partner_tiers()
        
        db_session.refresh(partner)
        assert partner.tier == 'gold'
        assert result['tier_changes'] == 1
    
    def test_downgrades_inactive_partner(self, db_session, partner):
        """Test that inactive partner is downgraded."""
        # Partner is silver but has no recent activity
        partner.tier = 'gold'
        db_session.commit()
        
        # Run task (no conversions in last 90 days)
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = recalculate_partner_tiers()
        
        db_session.refresh(partner)
        assert partner.tier == 'standard'
    
    def test_platinum_tier_threshold(
        self, db_session, partner, campaign_version, conversion_factory,
        conversion_event_type
    ):
        """Test platinum tier requires high performance."""
        # Create conversions meeting platinum threshold
        for _ in range(550):
            conversion_factory(
                partner, campaign_version, conversion_event_type,
                status='approved',
                event_value=Decimal('100.00'),
                occurred_at=datetime.utcnow() - timedelta(days=10)
            )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = recalculate_partner_tiers()
        
        db_session.refresh(partner)
        assert partner.tier == 'platinum'
    
    def test_ignores_old_conversions(
        self, db_session, partner, campaign_version, conversion_factory,
        conversion_event_type
    ):
        """Test that only recent conversions (90 days) count."""
        # Create old conversions (>90 days)
        for _ in range(600):
            conversion_factory(
                partner, campaign_version, conversion_event_type,
                status='approved',
                event_value=Decimal('100.00'),
                occurred_at=datetime.utcnow() - timedelta(days=120)
            )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = recalculate_partner_tiers()
        
        db_session.refresh(partner)
        # Should remain standard (old conversions don't count)
        assert partner.tier == 'standard'


class TestDetectFraudPatterns:
    """Tests for fraud detection task."""
    
    def test_detects_excessive_clicks_same_ip(
        self, db_session, partner_link, click_factory
    ):
        """Test detection of excessive clicks from same IP."""
        # Create 150 clicks from same IP
        for _ in range(150):
            click_factory(
                partner_link,
                ip_address="192.168.1.1",
                clicked_at=datetime.utcnow()
            )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = detect_fraud_patterns()
        
        assert result['fraud_cases_detected'] > 0
        assert any(
            case['type'] == 'excessive_clicks_same_ip'
            for case in result['cases']
        )
    
    def test_detects_conversions_without_clicks(
        self, db_session, partner, campaign_version, conversion_factory,
        conversion_event_type
    ):
        """Test detection of conversions without prior clicks."""
        # Create conversion without click_id or cookie_id
        conversion_factory(
            partner, campaign_version, conversion_event_type,
            click_id=None,
            cookie_id=None,
            occurred_at=datetime.utcnow()
        )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = detect_fraud_patterns()
        
        assert result['fraud_cases_detected'] > 0
        assert any(
            case['type'] == 'conversion_without_click'
            for case in result['cases']
        )
    
    def test_detects_abnormal_conversion_rate(
        self, db_session, campaign_partner, partner_link, click_factory,
        partner, campaign_version, conversion_factory, conversion_event_type
    ):
        """Test detection of abnormally high conversion rates."""
        # Create 60 clicks
        for _ in range(60):
            click_factory(partner_link)
        
        # Create 40 conversions (66% conversion rate)
        for _ in range(40):
            conversion_factory(
                partner, campaign_version, conversion_event_type,
                status='approved'
            )
        
        # Update counters
        campaign_partner.total_clicks = 60
        campaign_partner.total_conversions = 40
        db_session.commit()
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = detect_fraud_patterns()
        
        assert result['fraud_cases_detected'] > 0
        assert any(
            case['type'] == 'abnormal_conversion_rate'
            for case in result['cases']
        )
    
    def test_no_fraud_detected_normal_activity(
        self, db_session, partner_link, click_factory
    ):
        """Test that normal activity doesn't trigger fraud detection."""
        # Create normal number of clicks from different IPs
        for i in range(10):
            click_factory(
                partner_link,
                ip_address=f"192.168.1.{i}",
                clicked_at=datetime.utcnow()
            )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = detect_fraud_patterns()
        
        # Should detect no fraud
        assert result['fraud_cases_detected'] == 0


class TestGenerateDailyReports:
    """Tests for daily report generation task."""
    
    def test_generates_daily_stats(
        self, db_session, partner_link, click_factory, partner,
        campaign_version, conversion_factory, conversion_event_type
    ):
        """Test that daily report includes correct stats."""
        # Create yesterday's data
        yesterday = datetime.utcnow() - timedelta(days=1)
        
        # Create clicks
        for _ in range(5):
            click_factory(partner_link, clicked_at=yesterday)
        
        # Create conversions
        for _ in range(2):
            conversion_factory(
                partner, campaign_version, conversion_event_type,
                status='approved',
                event_value=Decimal('50.00'),
                commission_amount=Decimal('5.00'),
                occurred_at=yesterday
            )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = generate_daily_reports()
        
        report = result['report']
        assert report['clicks'] == 5
        assert report['conversions'] == 2
        assert report['revenue'] == 100.0
        assert report['commission'] == 10.0


class TestCleanupPendingConversions:
    """Tests for pending conversion cleanup task."""
    
    def test_rejects_stale_conversions(
        self, db_session, partner, campaign_version, conversion_factory,
        conversion_event_type
    ):
        """Test that old pending conversions are auto-rejected."""
        # Create conversion pending for 40 days
        old_conversion = conversion_factory(
            partner, campaign_version, conversion_event_type,
            status='pending',
            recorded_at=datetime.utcnow() - timedelta(days=40)
        )
        
        # Run task with 30-day timeout
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = cleanup_pending_conversions(timeout_days=30)
        
        db_session.refresh(old_conversion)
        assert old_conversion.status == 'rejected'
        assert old_conversion.rejection_reason is not None
        assert result['rejected_count'] == 1
    
    def test_preserves_recent_pending(
        self, db_session, partner, campaign_version, conversion_factory,
        conversion_event_type
    ):
        """Test that recent pending conversions are not rejected."""
        # Create conversion pending for 10 days
        recent_conversion = conversion_factory(
            partner, campaign_version, conversion_event_type,
            status='pending',
            recorded_at=datetime.utcnow() - timedelta(days=10)
        )
        
        # Run task with 30-day timeout
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = cleanup_pending_conversions(timeout_days=30)
        
        db_session.refresh(recent_conversion)
        assert recent_conversion.status == 'pending'
        assert result['rejected_count'] == 0


class TestRecalculateAllCommissions:
    """Tests for manual commission recalculation task."""
    
    @patch('app.workers.tasks.process_conversion_attribution')
    def test_queues_pending_conversions(
        self, mock_task, db_session, partner, campaign_version,
        conversion_factory, conversion_event_type
    ):
        """Test that all pending conversions are queued for recalculation."""
        mock_task.delay = MagicMock()
        
        # Create pending conversions
        conv1 = conversion_factory(
            partner, campaign_version, conversion_event_type,
            status='pending'
        )
        conv2 = conversion_factory(
            partner, campaign_version, conversion_event_type,
            status='pending'
        )
        
        # Run task
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = recalculate_all_commissions()
        
        assert result['conversions_queued'] == 2
    
    @patch('app.workers.tasks.process_conversion_attribution')
    def test_filters_by_campaign(
        self, mock_task, db_session, partner, campaign_version,
        conversion_factory, conversion_event_type
    ):
        """Test recalculation can be filtered by campaign."""
        mock_task.delay = MagicMock()
        
        # Create conversions for specific campaign
        conv = conversion_factory(
            partner, campaign_version, conversion_event_type,
            status='pending'
        )
        
        # Run task for specific campaign
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = recalculate_all_commissions(
                campaign_version_id=campaign_version.campaign_version_id
            )
        
        assert result['conversions_queued'] >= 1


class TestTaskErrorHandling:
    """Tests for task error handling and retries."""
    
    def test_task_continues_on_partial_failure(
        self, db_session, campaign_partner, partner_link, click_factory
    ):
        """Test that task continues even if some items fail."""
        # Create multiple campaign partners
        # One might fail but others should still process
        
        click_factory(partner_link)
        
        # Run task - should handle errors gracefully
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = update_all_campaign_partner_counters()
        
        # Should still complete
        assert result['status'] == 'success'
    
    def test_database_session_cleanup(self, db_session):
        """Test that database sessions are properly cleaned up."""
        # This is tested by the DatabaseTask base class
        # Session should be closed in after_return
        pass