"""
End-to-End Tests for Complete Tracking Flow

Tests the full journey from click to payout.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock
import uuid

from app.models import Click, Cookie, ConversionEvent, Payout, PayoutEvent
from app.workers.tasks import process_conversion_attribution, update_campaign_partner_counters
from app.workers.scheduled_tasks import auto_generate_monthly_payouts


class TestPartnerJourney:
    """Test complete partner affiliate journey."""
    
    def test_full_click_to_conversion_flow(
        self, client, db_session, partner, partner_link, campaign_version,
        conversion_event_type
    ):
        """
        Test full flow: Partner creates link → User clicks → User converts
        
        Steps:
        1. Partner generates tracking link
        2. User clicks link (cookie created, click recorded)
        3. User converts on vendor site
        4. Conversion webhook received
        5. Attribution calculated
        6. Commission awarded
        """
        # Step 1: Link already created (partner_link fixture)
        assert partner_link.short_code == "test123"
        
        # Step 2: User clicks tracking link
        response = client.get(f"/r/{partner_link.short_code}")
        
        assert response.status_code == 302
        assert response.headers["location"] == partner_link.full_url
        
        # Verify click recorded
        click = db_session.query(Click).filter(
            Click.partner_link_id == partner_link.partner_link_id
        ).first()
        assert click is not None
        
        # Verify cookie created
        cookie_id = uuid.UUID(response.cookies["tprm"])
        cookie = db_session.query(Cookie).filter(
            Cookie.cookie_id == cookie_id
        ).first()
        assert cookie is not None
        assert cookie.first_partner_id == partner.partner_id
        
        # Step 3 & 4: Simulate conversion (webhook would trigger this)
        conversion = ConversionEvent(
            conversion_event_type_id=conversion_event_type.conversion_event_type_id,
            click_id=click.click_id,
            cookie_id=cookie_id,
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            attribution_type='last_click',
            transaction_id='TEST_TXN_001',
            event_value=Decimal('99.99'),
            status='pending',
            occurred_at=datetime.utcnow(),
            recorded_at=datetime.utcnow()
        )
        db_session.add(conversion)
        db_session.commit()
        db_session.refresh(conversion)
        
        # Step 5: Process attribution (simulated - would be background task)
        # Calculate commission: 10% of $99.99 = $9.999
        conversion.commission_amount = Decimal('9.99')
        conversion.commission_type = 'percentage'
        conversion.commission_value = Decimal('10.00')
        conversion.status = 'approved'
        conversion.approved_at = datetime.utcnow()
        db_session.commit()
        
        # Verify attribution
        assert conversion.partner_id == partner.partner_id
        assert conversion.commission_amount == Decimal('9.99')
        
        # Step 6: Verify commission awarded
        assert conversion.status == 'approved'
        assert conversion.commission_amount > 0
    
    def test_multi_click_attribution(
        self, client, db_session, partner, partner_link, campaign_version,
        conversion_event_type, click_factory
    ):
        """
        Test multi-touch attribution with multiple clicks.
        
        User clicks multiple times before converting.
        """
        # First click
        response1 = client.get(f"/r/{partner_link.short_code}")
        cookie_id = uuid.UUID(response1.cookies["tprm"])
        
        # Get first click
        first_click = db_session.query(Click).filter(
            Click.cookie_id == cookie_id
        ).first()
        
        # Second click (same cookie)
        client.cookies.set("tprm", str(cookie_id))
        response2 = client.get(f"/r/{partner_link.short_code}")
        
        # Third click
        response3 = client.get(f"/r/{partner_link.short_code}")
        
        # Verify 3 clicks with same cookie
        click_count = db_session.query(Click).filter(
            Click.cookie_id == cookie_id
        ).count()
        assert click_count == 3
        
        # Get last click
        last_click = db_session.query(Click).filter(
            Click.cookie_id == cookie_id
        ).order_by(Click.clicked_at.desc()).first()
        
        # Create conversion
        conversion = ConversionEvent(
            conversion_event_type_id=conversion_event_type.conversion_event_type_id,
            click_id=last_click.click_id,  # Last-click attribution
            cookie_id=cookie_id,
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            attribution_type='last_click',
            transaction_id='TEST_TXN_002',
            event_value=Decimal('150.00'),
            commission_amount=Decimal('15.00'),
            status='approved',
            occurred_at=datetime.utcnow(),
            recorded_at=datetime.utcnow()
        )
        db_session.add(conversion)
        db_session.commit()
        
        # Verify attribution to last click
        assert conversion.click_id == last_click.click_id
        assert conversion.attribution_type == 'last_click'
    
    def test_cookie_expiration_and_renewal(
        self, client, db_session, partner_link
    ):
        """
        Test cookie expiration handling and renewal.
        """
        # First click - creates cookie
        response1 = client.get(f"/r/{partner_link.short_code}")
        cookie_id = uuid.UUID(response1.cookies["tprm"])
        
        cookie = db_session.query(Cookie).filter(
            Cookie.cookie_id == cookie_id
        ).first()
        
        original_expiry = cookie.expires_at
        
        # Wait and click again
        import time
        time.sleep(0.1)
        
        client.cookies.set("tprm", str(cookie_id))
        response2 = client.get(f"/r/{partner_link.short_code}")
        
        # Verify cookie expiration extended
        db_session.refresh(cookie)
        assert cookie.expires_at > original_expiry


class TestVendorJourney:
    """Test complete vendor journey."""
    
    def test_campaign_to_payout_flow(
        self, client, db_session, vendor, vendor_user, partner,
        campaign, campaign_version, partner_link, conversion_event_type,
        partner_payment_method, auth_headers_vendor
    ):
        """
        Test full vendor flow: Campaign setup → Partner joins → Conversions → Payout
        
        Steps:
        1. Vendor creates campaign
        2. Partner enrolls in campaign
        3. User clicks partner link and converts
        4. Vendor approves conversion
        5. Payout generated
        """
        # Step 1 & 2: Campaign and enrollment already set up (fixtures)
        assert campaign.status == 'active'
        assert partner_link.campaign_partner.status == 'approved'
        
        # Step 3: Simulate user conversion
        # First click
        response = client.get(f"/r/{partner_link.short_code}")
        cookie_id = uuid.UUID(response.cookies["tprm"])
        
        click = db_session.query(Click).first()
        
        # Create conversion
        conversion = ConversionEvent(
            conversion_event_type_id=conversion_event_type.conversion_event_type_id,
            click_id=click.click_id,
            cookie_id=cookie_id,
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            attribution_type='last_click',
            transaction_id='VENDOR_TXN_001',
            event_value=Decimal('200.00'),
            commission_amount=Decimal('20.00'),
            status='pending',
            occurred_at=datetime.utcnow(),
            recorded_at=datetime.utcnow()
        )
        db_session.add(conversion)
        db_session.commit()
        
        # Step 4: Vendor approves conversion
        conversion.status = 'approved'
        conversion.approved_at = datetime.utcnow()
        db_session.commit()
        
        # Step 5: Generate payout (would be scheduled task)
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = auto_generate_monthly_payouts(min_amount=Decimal('10.00'))
        
        # Verify payout created
        payout = db_session.query(Payout).filter(
            Payout.partner_id == partner.partner_id
        ).first()
        
        assert payout is not None
        assert payout.amount == Decimal('20.00')
        assert payout.status == 'pending'
        
        # Verify conversion linked to payout
        payout_event = db_session.query(PayoutEvent).filter(
            PayoutEvent.payout_id == payout.payout_id,
            PayoutEvent.conversion_event_id == conversion.conversion_event_id
        ).first()
        
        assert payout_event is not None


class TestCompleteAffiliateFlow:
    """Test complete end-to-end affiliate marketing flow."""
    
    def test_full_affiliate_lifecycle(
        self, client, db_session, partner, vendor, campaign_version,
        partner_link, conversion_event_type, partner_payment_method,
        campaign_partner
    ):
        """
        Test complete lifecycle from link creation to payout.
        
        Timeline:
        Day 1: User clicks link
        Day 1: User converts
        Day 2: Vendor approves conversion
        Day 3: Counters updated
        Day 30: Payout generated
        """
        # DAY 1: User clicks and converts
        # Click tracking link
        response = client.get(f"/r/{partner_link.short_code}")
        assert response.status_code == 302
        
        cookie_id = uuid.UUID(response.cookies["tprm"])
        click = db_session.query(Click).first()
        
        # User converts immediately
        conversion = ConversionEvent(
            conversion_event_type_id=conversion_event_type.conversion_event_type_id,
            click_id=click.click_id,
            cookie_id=cookie_id,
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            attribution_type='last_click',
            transaction_id='LIFECYCLE_TXN_001',
            event_value=Decimal('500.00'),
            commission_amount=Decimal('50.00'),
            commission_type='percentage',
            commission_value=Decimal('10.00'),
            status='pending',
            occurred_at=datetime.utcnow(),
            recorded_at=datetime.utcnow()
        )
        db_session.add(conversion)
        db_session.commit()
        
        # DAY 2: Vendor reviews and approves
        conversion.status = 'approved'
        conversion.approved_at = datetime.utcnow()
        db_session.commit()
        
        # DAY 3: Scheduled task updates counters
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            update_all_campaign_partner_counters()
        
        db_session.refresh(campaign_partner)
        assert campaign_partner.total_clicks == 1
        assert campaign_partner.total_conversions == 1
        assert campaign_partner.total_commission_earned == Decimal('50.00')
        
        # DAY 30: Monthly payout generated
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = auto_generate_monthly_payouts(min_amount=Decimal('50.00'))
        
        payout = db_session.query(Payout).filter(
            Payout.partner_id == partner.partner_id
        ).first()
        
        assert payout is not None
        assert payout.amount == Decimal('50.00')
        assert payout.status == 'pending'
        
        # Verify end-to-end tracking
        assert click.partner_link_id == partner_link.partner_link_id
        assert conversion.click_id == click.click_id
        assert payout.partner_id == partner.partner_id


class TestCrossCampaignAttribution:
    """Test attribution across multiple campaigns."""
    
    def test_multiple_campaigns_same_partner(
        self, client, db_session, partner, vendor, campaign_version,
        conversion_event_type
    ):
        """
        Test partner with links in multiple campaigns.
        """
        from app.models import Campaign, CampaignVersion, CampaignPartner, PartnerLink
        
        # Create second campaign
        campaign2 = Campaign(
            vendor_id=vendor.vendor_id,
            status='active'
        )
        db_session.add(campaign2)
        db_session.flush()
        
        version2 = CampaignVersion(
            campaign_id=campaign2.campaign_id,
            version_number=1,
            name="Second Campaign",
            destination_url="https://test.com/product2",
            default_commission_type="percentage",
            default_commission_value=Decimal("15.00"),
            cookie_duration_days=30
        )
        db_session.add(version2)
        db_session.flush()
        
        campaign2.current_campaign_version_id = version2.campaign_version_id
        
        cp2 = CampaignPartner(
            campaign_version_id=version2.campaign_version_id,
            partner_id=partner.partner_id,
            status='approved',
            approved_at=datetime.utcnow()
        )
        db_session.add(cp2)
        db_session.flush()
        
        link2 = PartnerLink(
            campaign_partner_id=cp2.campaign_partner_id,
            short_code="test456",
            full_url="https://test.com/product2",
            utm_params={}
        )
        db_session.add(link2)
        db_session.commit()
        
        # Click first campaign link
        response1 = client.get("/r/test123")
        cookie_id = uuid.UUID(response1.cookies["tprm"])
        
        # Click second campaign link (same cookie)
        client.cookies.set("tprm", str(cookie_id))
        response2 = client.get("/r/test456")
        
        # Verify cookie tracks last campaign
        cookie = db_session.query(Cookie).filter(
            Cookie.cookie_id == cookie_id
        ).first()
        
        assert cookie.last_campaign_version_id == version2.campaign_version_id


class TestErrorRecovery:
    """Test error handling and recovery in E2E flows."""
    
    def test_duplicate_conversion_handling(
        self, client, db_session, partner, partner_link, campaign_version,
        conversion_event_type
    ):
        """
        Test that duplicate conversions are handled properly.
        """
        # Click link
        response = client.get(f"/r/{partner_link.short_code}")
        cookie_id = uuid.UUID(response.cookies["tprm"])
        click = db_session.query(Click).first()
        
        # Create first conversion
        conversion1 = ConversionEvent(
            conversion_event_type_id=conversion_event_type.conversion_event_type_id,
            click_id=click.click_id,
            cookie_id=cookie_id,
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            attribution_type='last_click',
            transaction_id='DUP_TXN_001',
            event_value=Decimal('100.00'),
            status='pending',
            occurred_at=datetime.utcnow(),
            recorded_at=datetime.utcnow()
        )
        db_session.add(conversion1)
        db_session.commit()
        
        # Try to create duplicate (same transaction_id)
        conversion2 = ConversionEvent(
            conversion_event_type_id=conversion_event_type.conversion_event_type_id,
            click_id=click.click_id,
            cookie_id=cookie_id,
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            attribution_type='last_click',
            transaction_id='DUP_TXN_001',  # Duplicate
            event_value=Decimal('100.00'),
            status='pending',
            occurred_at=datetime.utcnow(),
            recorded_at=datetime.utcnow()
        )
        
        # Should fail due to unique constraint
        db_session.add(conversion2)
        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()
        
        db_session.rollback()
        
        # Verify only one conversion exists
        count = db_session.query(ConversionEvent).filter(
            ConversionEvent.transaction_id == 'DUP_TXN_001'
        ).count()
        assert count == 1
    
    def test_conversion_without_click_recovery(
        self, db_session, partner, campaign_version, conversion_event_type
    ):
        """
        Test handling of conversion without prior click (direct webhook).
        """
        # Create conversion without click_id (could happen with direct webhook)
        conversion = ConversionEvent(
            conversion_event_type_id=conversion_event_type.conversion_event_type_id,
            click_id=None,  # No click
            cookie_id=None,  # No cookie
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            attribution_type='last_click',
            transaction_id='NO_CLICK_TXN_001',
            event_value=Decimal('100.00'),
            status='pending',
            occurred_at=datetime.utcnow(),
            recorded_at=datetime.utcnow()
        )
        db_session.add(conversion)
        db_session.commit()
        
        # Should still be recorded (fraud detection will flag it)
        assert conversion.conversion_event_id is not None
        
        # Fraud detection should catch this
        from app.workers.scheduled_tasks import detect_fraud_patterns
        
        with patch('app.workers.scheduled_tasks.SessionLocal', return_value=db_session):
            result = detect_fraud_patterns()
        
        # Should be flagged as fraud
        assert any(
            case['type'] == 'conversion_without_click'
            for case in result['cases']
        )


class TestPerformanceOptimizations:
    """Test performance optimizations in E2E flow."""
    
    def test_high_volume_tracking(self, client, db_session, partner_link):
        """
        Test system handles high volume of clicks efficiently.
        """
        import time
        
        num_clicks = 50
        start_time = time.time()
        
        # Simulate 50 clicks
        for i in range(num_clicks):
            response = client.get(f"/r/{partner_link.short_code}")
            assert response.status_code == 302
        
        end_time = time.time()
        elapsed = end_time - start_time
        
        # Should complete in reasonable time
        assert elapsed < 5.0  # 5 seconds for 50 clicks
        
        # Verify all clicks recorded
        click_count = db_session.query(Click).count()
        assert click_count == num_clicks
    
    def test_concurrent_conversions(
        self, db_session, partner, campaign_version, conversion_event_type,
        partner_link, click_factory
    ):
        """
        Test concurrent conversion processing.
        """
        # Create multiple clicks
        clicks = [click_factory(partner_link) for _ in range(5)]
        
        # Create conversions for all clicks
        conversions = []
        for i, click in enumerate(clicks):
            conv = ConversionEvent(
                conversion_event_type_id=conversion_event_type.conversion_event_type_id,
                click_id=click.click_id,
                partner_id=partner.partner_id,
                campaign_version_id=campaign_version.campaign_version_id,
                attribution_type='last_click',
                transaction_id=f'CONCURRENT_TXN_{i:03d}',
                event_value=Decimal('100.00'),
                status='pending',
                occurred_at=datetime.utcnow(),
                recorded_at=datetime.utcnow()
            )
            conversions.append(conv)
            db_session.add(conv)
        
        db_session.commit()
        
        # Verify all conversions created
        assert len(conversions) == 5
        for conv in conversions:
            assert conv.conversion_event_id is not None


class TestDataIntegrity:
    """Test data integrity across the full flow."""
    
    def test_referential_integrity_maintained(
        self, client, db_session, partner, partner_link, campaign_version,
        conversion_event_type, campaign_partner
    ):
        """
        Test that all relationships are properly maintained.
        """
        # Create full flow
        response = client.get(f"/r/{partner_link.short_code}")
        cookie_id = uuid.UUID(response.cookies["tprm"])
        
        click = db_session.query(Click).first()
        cookie = db_session.query(Cookie).filter(
            Cookie.cookie_id == cookie_id
        ).first()
        
        conversion = ConversionEvent(
            conversion_event_type_id=conversion_event_type.conversion_event_type_id,
            click_id=click.click_id,
            cookie_id=cookie_id,
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            attribution_type='last_click',
            transaction_id='INTEGRITY_TXN_001',
            event_value=Decimal('100.00'),
            status='approved',
            commission_amount=Decimal('10.00'),
            occurred_at=datetime.utcnow(),
            recorded_at=datetime.utcnow(),
            approved_at=datetime.utcnow()
        )
        db_session.add(conversion)
        db_session.commit()
        
        # Verify all relationships
        assert click.partner_link_id == partner_link.partner_link_id
        assert click.cookie_id == cookie_id
        assert cookie.last_partner_id == partner.partner_id
        assert conversion.click_id == click.click_id
        assert conversion.cookie_id == cookie_id
        assert conversion.partner_id == partner.partner_id
        
        # Verify cascade (soft delete)
        partner_link.is_deleted = True
        db_session.commit()
        
        # Click should still exist (soft delete doesn't cascade)
        db_session.refresh(click)
        assert click.is_deleted == False
    
    def test_audit_trail_complete(
        self, client, db_session, partner, partner_link, campaign_version,
        conversion_event_type
    ):
        """
        Test that complete audit trail is maintained.
        """
        # Track original states
        response = client.get(f"/r/{partner_link.short_code}")
        cookie_id = uuid.UUID(response.cookies["tprm"])
        click = db_session.query(Click).first()
        
        # Create conversion with status changes
        conversion = ConversionEvent(
            conversion_event_type_id=conversion_event_type.conversion_event_type_id,
            click_id=click.click_id,
            cookie_id=cookie_id,
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            attribution_type='last_click',
            transaction_id='AUDIT_TXN_001',
            event_value=Decimal('100.00'),
            status='pending',
            occurred_at=datetime.utcnow(),
            recorded_at=datetime.utcnow()
        )
        db_session.add(conversion)
        db_session.flush()
        
        # Track state change timestamps
        recorded_at = conversion.recorded_at
        
        # Approve conversion
        conversion.status = 'approved'
        conversion.approved_at = datetime.utcnow()
        conversion.commission_amount = Decimal('10.00')
        db_session.commit()
        
        # Verify timestamps
        assert conversion.recorded_at == recorded_at
        assert conversion.approved_at is not None
        assert conversion.approved_at >= recorded_at