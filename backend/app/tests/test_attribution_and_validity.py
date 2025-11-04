"""
Tests for Attribution Models and Conversion Validity Period

Tests different pricing models (percentage, flat, tiered) combined with
various conversion validity periods to ensure partners stop receiving credit
after the validity period expires.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models import (
    Vendor, VendorUser, Partner, Campaign, CampaignVersion, CampaignPartner,
    CampaignTier, ConversionEvent, Click, PartnerLink, Cookie
)
from app.services.commission_service import CommissionService
from app.services.attribution_service import AttributionService


class TestPercentageCommissionWithValidity:
    """Test percentage-based commission with conversion validity periods."""

    @pytest.fixture
    def setup_campaign(self, db: Session):
        """Create a campaign with percentage-based commission."""
        # Create vendor and user
        vendor = Vendor(
            name="Test Vendor",
            email="vendor@test.com",
            password_hash="hash",
            status="active"
        )
        db.add(vendor)
        db.flush()

        vendor_user = VendorUser(
            vendor_id=vendor.vendor_id,
            name="Vendor User",
            email="user@vendor.com",
            password_hash="hash",
            role="owner",
            status="active"
        )
        db.add(vendor_user)
        db.flush()

        # Create partner
        partner = Partner(
            name="Test Partner",
            email="partner@test.com",
            password_hash="hash",
            status="active",
            verified=True
        )
        db.add(partner)
        db.flush()

        # Create campaign
        campaign = Campaign(
            vendor_id=vendor.vendor_id,
            status="active"
        )
        db.add(campaign)
        db.flush()

        # Create campaign version with percentage commission
        campaign_version = CampaignVersion(
            campaign_id=campaign.campaign_id,
            version_number=1,
            name="Percentage Campaign",
            description="Test campaign with 15% commission",
            destination_url="https://example.com",
            default_commission_type="percentage",
            default_commission_value=Decimal('15'),  # 15%
            cookie_duration_days=30,
            approval_required=False,
            is_public=True,
            attribution_model="last_click",
            conversion_validity_type="monthly",  # Will be added to model
            conversion_validity_value=1  # 1 month validity
        )
        db.add(campaign_version)
        db.flush()

        campaign.current_campaign_version_id = campaign_version.campaign_version_id

        # Create campaign partner enrollment
        campaign_partner = CampaignPartner(
            campaign_version_id=campaign_version.campaign_version_id,
            partner_id=partner.partner_id,
            status="approved",
            applied_at=datetime.utcnow()
        )
        db.add(campaign_partner)

        db.commit()

        return {
            'vendor': vendor,
            'vendor_user': vendor_user,
            'partner': partner,
            'campaign': campaign,
            'campaign_version': campaign_version,
            'campaign_partner': campaign_partner
        }

    def test_percentage_commission_within_validity_period(self, db: Session, setup_campaign):
        """Partner should receive credit for conversion within validity period."""
        setup = setup_campaign
        campaign_version = setup['campaign_version']
        partner = setup['partner']

        # Create a conversion with $100 value
        conversion_event = ConversionEvent(
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,  # Assuming purchase type
            event_value=Decimal('100'),
            occurred_at=datetime.utcnow(),
            attribution_type="last_click",
            status="pending"
        )
        db.add(conversion_event)
        db.commit()

        # Calculate commission
        commission_amount, commission_type, commission_value = CommissionService.calculate_commission(db, conversion_event)

        # Should be 15% of $100 = $15
        assert commission_type == "percentage"
        assert commission_value == Decimal('15')
        assert commission_amount == Decimal('15')  # 15% of 100

    def test_percentage_commission_outside_validity_period(self, db: Session, setup_campaign):
        """Partner should NOT receive credit for conversion after validity period expires."""
        setup = setup_campaign
        campaign_version = setup['campaign_version']
        partner = setup['partner']

        # Create a conversion 32 days in the past (outside 1-month/30-day validity)
        old_date = datetime.utcnow() - timedelta(days=32)
        conversion_event = ConversionEvent(
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,
            event_value=Decimal('100'),
            occurred_at=old_date,
            attribution_type="last_click",
            status="pending"
        )
        db.add(conversion_event)
        db.commit()

        # Validate that conversion is outside validity period
        # This should either:
        # 1. Not calculate commission (return 0)
        # 2. Mark the conversion as invalid
        # 3. Reject the conversion

        commission_amount, commission_type, commission_value = CommissionService.calculate_commission(db, conversion_event)

        # Should not receive commission after validity expires
        assert commission_amount == Decimal('0') or conversion_event.status == 'rejected'

    def test_percentage_commission_exact_validity_boundary(self, db: Session, setup_campaign):
        """Partner should receive credit on the last day of validity period."""
        setup = setup_campaign
        campaign_version = setup['campaign_version']
        partner = setup['partner']

        # Create a conversion exactly 30 days old (on the boundary)
        boundary_date = datetime.utcnow() - timedelta(days=30)
        conversion_event = ConversionEvent(
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,
            event_value=Decimal('100'),
            occurred_at=boundary_date,
            attribution_type="last_click",
            status="pending"
        )
        db.add(conversion_event)
        db.commit()

        commission_amount, commission_type, commission_value = CommissionService.calculate_commission(db, conversion_event)

        # Should still be valid on the boundary
        assert commission_amount == Decimal('15')


class TestFlatCommissionWithValidity:
    """Test flat-rate commission with conversion validity periods."""

    @pytest.fixture
    def setup_campaign(self, db: Session):
        """Create a campaign with flat-rate commission."""
        vendor = Vendor(
            name="Test Vendor",
            email="vendor@test.com",
            password_hash="hash",
            status="active"
        )
        db.add(vendor)
        db.flush()

        vendor_user = VendorUser(
            vendor_id=vendor.vendor_id,
            name="Vendor User",
            email="user@vendor.com",
            password_hash="hash",
            role="owner",
            status="active"
        )
        db.add(vendor_user)
        db.flush()

        partner = Partner(
            name="Test Partner",
            email="partner@test.com",
            password_hash="hash",
            status="active",
            verified=True
        )
        db.add(partner)
        db.flush()

        campaign = Campaign(
            vendor_id=vendor.vendor_id,
            status="active"
        )
        db.add(campaign)
        db.flush()

        # Create campaign with flat $50 commission
        campaign_version = CampaignVersion(
            campaign_id=campaign.campaign_id,
            version_number=1,
            name="Flat Commission Campaign",
            description="Test campaign with $50 flat commission",
            destination_url="https://example.com",
            default_commission_type="flat",
            default_commission_value=Decimal('50'),  # $50 flat
            cookie_duration_days=30,
            approval_required=False,
            is_public=True,
            attribution_model="last_click",
            conversion_validity_type="monthly",  # 2-month validity
            conversion_validity_value=2
        )
        db.add(campaign_version)
        db.flush()

        campaign.current_campaign_version_id = campaign_version.campaign_version_id

        campaign_partner = CampaignPartner(
            campaign_version_id=campaign_version.campaign_version_id,
            partner_id=partner.partner_id,
            status="approved",
            applied_at=datetime.utcnow()
        )
        db.add(campaign_partner)

        db.commit()

        return {
            'vendor': vendor,
            'vendor_user': vendor_user,
            'partner': partner,
            'campaign': campaign,
            'campaign_version': campaign_version,
            'campaign_partner': campaign_partner
        }

    def test_flat_commission_within_validity(self, db: Session, setup_campaign):
        """Partner should receive flat commission within validity period."""
        setup = setup_campaign
        campaign_version = setup['campaign_version']
        partner = setup['partner']

        # Create conversion with any value - flat commission ignores value
        conversion_event = ConversionEvent(
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,
            event_value=Decimal('1000'),  # Value doesn't matter for flat
            occurred_at=datetime.utcnow(),
            attribution_type="last_click",
            status="pending"
        )
        db.add(conversion_event)
        db.commit()

        commission_amount, commission_type, commission_value = CommissionService.calculate_commission(db, conversion_event)

        # Should be flat $50 regardless of event value
        assert commission_type == "flat"
        assert commission_amount == Decimal('50')
        assert commission_value == Decimal('50')

    def test_flat_commission_expires_after_2_months(self, db: Session, setup_campaign):
        """Partner should NOT receive flat commission after 2-month validity expires."""
        setup = setup_campaign
        campaign_version = setup['campaign_version']
        partner = setup['partner']

        # Create conversion 62 days old (outside 2-month/60-day validity)
        old_date = datetime.utcnow() - timedelta(days=62)
        conversion_event = ConversionEvent(
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,
            event_value=Decimal('1000'),
            occurred_at=old_date,
            attribution_type="last_click",
            status="pending"
        )
        db.add(conversion_event)
        db.commit()

        commission_amount, commission_type, commission_value = CommissionService.calculate_commission(db, conversion_event)

        # Should not receive commission after validity expires
        assert commission_amount == Decimal('0') or conversion_event.status == 'rejected'


class TestTieredCommissionWithValidity:
    """Test tiered commission structures with conversion validity periods."""

    @pytest.fixture
    def setup_campaign(self, db: Session):
        """Create a campaign with tiered commission."""
        vendor = Vendor(
            name="Test Vendor",
            email="vendor@test.com",
            password_hash="hash",
            status="active"
        )
        db.add(vendor)
        db.flush()

        vendor_user = VendorUser(
            vendor_id=vendor.vendor_id,
            name="Vendor User",
            email="user@vendor.com",
            password_hash="hash",
            role="owner",
            status="active"
        )
        db.add(vendor_user)
        db.flush()

        partner = Partner(
            name="Test Partner",
            email="partner@test.com",
            password_hash="hash",
            status="active",
            verified=True
        )
        db.add(partner)
        db.flush()

        campaign = Campaign(
            vendor_id=vendor.vendor_id,
            status="active"
        )
        db.add(campaign)
        db.flush()

        campaign_version = CampaignVersion(
            campaign_id=campaign.campaign_id,
            version_number=1,
            name="Tiered Commission Campaign",
            description="Test campaign with tiered commission",
            destination_url="https://example.com",
            default_commission_type="tiered",
            cookie_duration_days=30,
            approval_required=False,
            is_public=True,
            attribution_model="last_click",
            conversion_validity_type="yearly",  # 1 year validity
            conversion_validity_value=1
        )
        db.add(campaign_version)
        db.flush()

        # Add tiers
        # Tier 1: 0-500 revenue -> 10% commission
        tier1 = CampaignTier(
            campaign_version_id=campaign_version.campaign_version_id,
            label="Tier 1",
            min_amount=Decimal('0'),
            max_amount=Decimal('500'),
            reward_type="percentage",
            reward_value=Decimal('10')
        )
        db.add(tier1)

        # Tier 2: 500-2000 revenue -> 15% commission
        tier2 = CampaignTier(
            campaign_version_id=campaign_version.campaign_version_id,
            label="Tier 2",
            min_amount=Decimal('500'),
            max_amount=Decimal('2000'),
            reward_type="percentage",
            reward_value=Decimal('15')
        )
        db.add(tier2)

        # Tier 3: 2000+ revenue -> 20% commission
        tier3 = CampaignTier(
            campaign_version_id=campaign_version.campaign_version_id,
            label="Tier 3",
            min_amount=Decimal('2000'),
            max_amount=Decimal('999999'),
            reward_type="percentage",
            reward_value=Decimal('20')
        )
        db.add(tier3)

        campaign.current_campaign_version_id = campaign_version.campaign_version_id

        campaign_partner = CampaignPartner(
            campaign_version_id=campaign_version.campaign_version_id,
            partner_id=partner.partner_id,
            status="approved",
            applied_at=datetime.utcnow(),
            total_revenue=Decimal('1000')  # Partner at $1000 revenue = Tier 2
        )
        db.add(campaign_partner)

        db.commit()

        return {
            'vendor': vendor,
            'vendor_user': vendor_user,
            'partner': partner,
            'campaign': campaign,
            'campaign_version': campaign_version,
            'campaign_partner': campaign_partner
        }

    def test_tiered_commission_applies_correct_tier(self, db: Session, setup_campaign):
        """Partner at Tier 2 ($500-2000 revenue) should receive 15% commission."""
        setup = setup_campaign
        campaign_version = setup['campaign_version']
        partner = setup['partner']

        # Partner has $1000 revenue, should be in Tier 2 (15%)
        conversion_event = ConversionEvent(
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,
            event_value=Decimal('100'),
            occurred_at=datetime.utcnow(),
            attribution_type="last_click",
            status="pending"
        )
        db.add(conversion_event)
        db.commit()

        commission_amount, commission_type, commission_value = CommissionService.calculate_commission(db, conversion_event)

        # Should be 15% of $100 = $15 (Tier 2)
        assert commission_type == "percentage"
        assert commission_value == Decimal('15')
        assert commission_amount == Decimal('15')

    def test_tiered_commission_within_1year_validity(self, db: Session, setup_campaign):
        """Tiered commission within 1-year validity period should apply."""
        setup = setup_campaign
        campaign_version = setup['campaign_version']
        partner = setup['partner']

        # Create conversion 6 months old (within 1-year validity)
        old_date = datetime.utcnow() - timedelta(days=180)
        conversion_event = ConversionEvent(
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,
            event_value=Decimal('100'),
            occurred_at=old_date,
            attribution_type="last_click",
            status="pending"
        )
        db.add(conversion_event)
        db.commit()

        commission_amount, commission_type, commission_value = CommissionService.calculate_commission(db, conversion_event)

        # Should still apply Tier 2 (15%)
        assert commission_amount == Decimal('15')

    def test_tiered_commission_expires_after_1year(self, db: Session, setup_campaign):
        """Partner should NOT receive tiered commission after 1-year validity expires."""
        setup = setup_campaign
        campaign_version = setup['campaign_version']
        partner = setup['partner']

        # Create conversion 400 days old (outside 1-year/365-day validity)
        old_date = datetime.utcnow() - timedelta(days=400)
        conversion_event = ConversionEvent(
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,
            event_value=Decimal('100'),
            occurred_at=old_date,
            attribution_type="last_click",
            status="pending"
        )
        db.add(conversion_event)
        db.commit()

        commission_amount, commission_type, commission_value = CommissionService.calculate_commission(db, conversion_event)

        # Should not receive commission after validity expires
        assert commission_amount == Decimal('0') or conversion_event.status == 'rejected'


class TestAttributionModelsWithValidity:
    """Test different attribution models work correctly with validity periods."""

    @pytest.fixture
    def setup_multi_touch_campaign(self, db: Session):
        """Create campaign for multi-touch attribution testing."""
        vendor = Vendor(
            name="Test Vendor",
            email="vendor@test.com",
            password_hash="hash",
            status="active"
        )
        db.add(vendor)
        db.flush()

        vendor_user = VendorUser(
            vendor_id=vendor.vendor_id,
            name="Vendor User",
            email="user@vendor.com",
            password_hash="hash",
            role="owner",
            status="active"
        )
        db.add(vendor_user)
        db.flush()

        partner1 = Partner(
            name="Partner 1",
            email="partner1@test.com",
            password_hash="hash",
            status="active",
            verified=True
        )
        db.add(partner1)

        partner2 = Partner(
            name="Partner 2",
            email="partner2@test.com",
            password_hash="hash",
            status="active",
            verified=True
        )
        db.add(partner2)
        db.flush()

        campaign = Campaign(
            vendor_id=vendor.vendor_id,
            status="active"
        )
        db.add(campaign)
        db.flush()

        campaign_version = CampaignVersion(
            campaign_id=campaign.campaign_id,
            version_number=1,
            name="Multi-touch Campaign",
            description="Test multi-touch attribution",
            destination_url="https://example.com",
            default_commission_type="percentage",
            default_commission_value=Decimal('10'),
            cookie_duration_days=30,
            approval_required=False,
            is_public=True,
            attribution_model="linear",  # Linear attribution
            conversion_validity_type="monthly",
            conversion_validity_value=1
        )
        db.add(campaign_version)
        db.flush()

        campaign.current_campaign_version_id = campaign_version.campaign_version_id

        cp1 = CampaignPartner(
            campaign_version_id=campaign_version.campaign_version_id,
            partner_id=partner1.partner_id,
            status="approved",
            applied_at=datetime.utcnow()
        )
        db.add(cp1)

        cp2 = CampaignPartner(
            campaign_version_id=campaign_version.campaign_version_id,
            partner_id=partner2.partner_id,
            status="approved",
            applied_at=datetime.utcnow()
        )
        db.add(cp2)

        db.commit()

        return {
            'vendor': vendor,
            'vendor_user': vendor_user,
            'partner1': partner1,
            'partner2': partner2,
            'campaign': campaign,
            'campaign_version': campaign_version
        }

    def test_linear_attribution_both_within_validity(self, db: Session, setup_multi_touch_campaign):
        """With linear attribution, both partners should get equal credit if within validity."""
        setup = setup_multi_touch_campaign
        campaign_version = setup['campaign_version']
        partner1 = setup['partner1']
        partner2 = setup['partner2']

        # Both conversions within validity period
        conversion_event1 = ConversionEvent(
            partner_id=partner1.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,
            event_value=Decimal('100'),
            occurred_at=datetime.utcnow(),
            attribution_type="linear",
            status="pending"
        )
        db.add(conversion_event1)

        conversion_event2 = ConversionEvent(
            partner_id=partner2.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,
            event_value=Decimal('100'),
            occurred_at=datetime.utcnow(),
            attribution_type="linear",
            status="pending"
        )
        db.add(conversion_event2)
        db.commit()

        # Both should get 10% commission (50% each of 20%)
        commission1, _, _ = CommissionService.calculate_commission(db, conversion_event1)
        commission2, _, _ = CommissionService.calculate_commission(db, conversion_event2)

        # Linear attribution should split credit equally
        # Assuming implementation: each gets 5% (10% * 50%)
        assert commission1 == Decimal('5')
        assert commission2 == Decimal('5')

    def test_last_click_attribution_respects_validity(self, db: Session, setup_multi_touch_campaign):
        """Last-click attribution should only credit partner if within validity period."""
        setup = setup_multi_touch_campaign
        campaign_version = setup['campaign_version']
        partner1 = setup['partner1']
        partner2 = setup['partner2']

        # Partner1 clicked 31 days ago (outside validity), Partner2 clicked today
        old_date = datetime.utcnow() - timedelta(days=31)
        current_date = datetime.utcnow()

        conversion_event1 = ConversionEvent(
            partner_id=partner1.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,
            event_value=Decimal('100'),
            occurred_at=old_date,
            attribution_type="last_click",
            status="pending"
        )
        db.add(conversion_event1)

        conversion_event2 = ConversionEvent(
            partner_id=partner2.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,
            event_value=Decimal('100'),
            occurred_at=current_date,
            attribution_type="last_click",
            status="pending"
        )
        db.add(conversion_event2)
        db.commit()

        commission1, _, _ = CommissionService.calculate_commission(db, conversion_event1)
        commission2, _, _ = CommissionService.calculate_commission(db, conversion_event2)

        # Partner1 outside validity -> no credit
        assert commission1 == Decimal('0') or conversion_event1.status == 'rejected'

        # Partner2 within validity -> gets credit
        assert commission2 == Decimal('10')


class TestOneTimeValidityPeriod:
    """Test 'one-time' conversion validity - partner gets credit only once."""

    @pytest.fixture
    def setup_campaign(self, db: Session):
        """Create campaign with one-time validity."""
        vendor = Vendor(
            name="Test Vendor",
            email="vendor@test.com",
            password_hash="hash",
            status="active"
        )
        db.add(vendor)
        db.flush()

        vendor_user = VendorUser(
            vendor_id=vendor.vendor_id,
            name="Vendor User",
            email="user@vendor.com",
            password_hash="hash",
            role="owner",
            status="active"
        )
        db.add(vendor_user)
        db.flush()

        partner = Partner(
            name="Test Partner",
            email="partner@test.com",
            password_hash="hash",
            status="active",
            verified=True
        )
        db.add(partner)
        db.flush()

        campaign = Campaign(
            vendor_id=vendor.vendor_id,
            status="active"
        )
        db.add(campaign)
        db.flush()

        campaign_version = CampaignVersion(
            campaign_id=campaign.campaign_id,
            version_number=1,
            name="One-Time Campaign",
            description="Test one-time commission",
            destination_url="https://example.com",
            default_commission_type="percentage",
            default_commission_value=Decimal('20'),
            cookie_duration_days=30,
            approval_required=False,
            is_public=True,
            attribution_model="last_click",
            conversion_validity_type="one_time"
            # No validity_value for one-time
        )
        db.add(campaign_version)
        db.flush()

        campaign.current_campaign_version_id = campaign_version.campaign_version_id

        campaign_partner = CampaignPartner(
            campaign_version_id=campaign_version.campaign_version_id,
            partner_id=partner.partner_id,
            status="approved",
            applied_at=datetime.utcnow()
        )
        db.add(campaign_partner)

        db.commit()

        return {
            'vendor': vendor,
            'vendor_user': vendor_user,
            'partner': partner,
            'campaign': campaign,
            'campaign_version': campaign_version,
            'campaign_partner': campaign_partner
        }

    def test_first_conversion_gets_credit(self, db: Session, setup_campaign):
        """First conversion should receive credit with one-time validity."""
        setup = setup_campaign
        campaign_version = setup['campaign_version']
        partner = setup['partner']

        conversion_event = ConversionEvent(
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,
            event_value=Decimal('100'),
            occurred_at=datetime.utcnow(),
            attribution_type="last_click",
            status="pending"
        )
        db.add(conversion_event)
        db.commit()

        commission_amount, _, _ = CommissionService.calculate_commission(db, conversion_event)

        # First conversion gets 20%
        assert commission_amount == Decimal('20')

    def test_second_conversion_gets_no_credit(self, db: Session, setup_campaign):
        """Second conversion should NOT receive credit with one-time validity."""
        setup = setup_campaign
        campaign_version = setup['campaign_version']
        partner = setup['partner']

        # First conversion
        conversion_event1 = ConversionEvent(
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,
            event_value=Decimal('100'),
            occurred_at=datetime.utcnow() - timedelta(hours=1),
            attribution_type="last_click",
            status="approved"
        )
        db.add(conversion_event1)
        db.flush()

        # Second conversion (within seconds)
        conversion_event2 = ConversionEvent(
            partner_id=partner.partner_id,
            campaign_version_id=campaign_version.campaign_version_id,
            conversion_event_type_id=1,
            event_value=Decimal('100'),
            occurred_at=datetime.utcnow(),
            attribution_type="last_click",
            status="pending"
        )
        db.add(conversion_event2)
        db.commit()

        commission_amount, _, _ = CommissionService.calculate_commission(db, conversion_event2)

        # Second conversion gets no credit (one-time only)
        assert commission_amount == Decimal('0') or conversion_event2.status == 'rejected'
