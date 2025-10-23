#!/usr/bin/env python3
"""
Seed sample data into the database for development and testing.
Uses ORM models to be compatible with the current database schema.
"""

import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal

# Add parent directories to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import SessionLocal
from app.models import (
    Partner, Vendor, Campaign, CampaignVersion, CampaignPartner, PartnerLink, Click,
    ConversionEventType, ConversionEvent, Payout
)


def seed_database():
    """Seed the database with sample data"""
    db = SessionLocal()

    try:
        # Check if data already exists
        existing_partners = db.query(Partner).count()
        if existing_partners > 0:
            print("✓ Database already has partner data, skipping seed")
            return True

        print("📊 Seeding database with sample data...")

        # Create vendors
        vendors = [
            Vendor(
                name="TechSaaS Inc",
                email="admin@techsaas.com",
                status="active"
            ),
            Vendor(
                name="EduPlatform",
                email="contact@eduplatform.com",
                status="active"
            ),
            Vendor(
                name="FitnessGear",
                email="partnerships@fitnessgear.com",
                status="active"
            ),
            Vendor(
                name="CloudStorage Pro",
                email="affiliates@cloudpro.io",
                status="active"
            ),
        ]
        db.add_all(vendors)
        db.flush()
        print(f"  ✓ Created {len(vendors)} vendors")

        # Create partners
        # Password for all: "password" (hashed with pbkdf2-sha256)
        password_hash = "$pbkdf2-sha256$29000$dY6x1jqntPY.x9jbO0copQ$0xgyXxBxvPlWEdVAAYF2d1VB57vp2XLjneCjs/1/Mrs"

        partners = [
            Partner(
                name="Tech Reviewer Pro",
                email="contact@techreviewerpro.com",
                password_hash=password_hash,
                status="active",
                tier="platinum",
                bio="Leading technology review website with 500K monthly visitors",
                website_url="https://techreviewerpro.com"
            ),
            Partner(
                name="Marketing Maven",
                email="hello@marketingmaven.io",
                password_hash=password_hash,
                status="active",
                tier="gold",
                bio="Digital marketing expert and educator",
                website_url="https://marketingmaven.io"
            ),
            Partner(
                name="Fitness Influencer Jane",
                email="jane@fitinfluencer.com",
                password_hash=password_hash,
                status="active",
                tier="gold",
                bio="Fitness coach with 200K Instagram followers",
                website_url="https://instagram.com/janefitness"
            ),
            Partner(
                name="StartupBlogger",
                email="admin@startupblogger.net",
                password_hash=password_hash,
                status="active",
                tier="silver",
                bio="Blog about startups and entrepreneurship",
                website_url="https://startupblogger.net"
            ),
            Partner(
                name="YouTube Tech Channel",
                email="business@yttechchannel.com",
                password_hash=password_hash,
                status="active",
                tier="platinum",
                bio="Tech reviews on YouTube - 1M subscribers",
                website_url="https://youtube.com/techreviews"
            ),
            Partner(
                name="EduTech Reviews",
                email="team@edutechreviews.com",
                password_hash=password_hash,
                status="active",
                tier="silver",
                bio="Educational technology reviews",
                website_url="https://edutechreviews.com"
            ),
        ]
        db.add_all(partners)
        db.flush()
        print(f"  ✓ Created {len(partners)} partners")

        # Create campaigns with versions
        campaigns = [
            Campaign(
                vendor_id=vendors[0].vendor_id,
                status="active"
            ),
            Campaign(
                vendor_id=vendors[1].vendor_id,
                status="active"
            ),
            Campaign(
                vendor_id=vendors[2].vendor_id,
                status="active"
            ),
            Campaign(
                vendor_id=vendors[3].vendor_id,
                status="active"
            ),
        ]
        db.add_all(campaigns)
        db.flush()

        # Create campaign versions with details
        campaign_versions = [
            CampaignVersion(
                campaign_id=campaigns[0].campaign_id,
                version_number=1,
                name="TechSaaS Pro - Project Management",
                description="Powerful project management tool for teams",
                destination_url="https://techsaas.com",
                default_commission_type="percentage",
                default_commission_value=Decimal("20.00"),
                is_public=True
            ),
            CampaignVersion(
                campaign_id=campaigns[1].campaign_id,
                version_number=1,
                name="EduPlatform Course Marketplace",
                description="Join thousands learning new skills online",
                destination_url="https://eduplatform.com",
                default_commission_type="percentage",
                default_commission_value=Decimal("15.00"),
                is_public=True
            ),
            CampaignVersion(
                campaign_id=campaigns[2].campaign_id,
                version_number=1,
                name="FitnessGear - Premium Equipment",
                description="High-quality fitness equipment",
                destination_url="https://fitnessgear.com",
                default_commission_type="percentage",
                default_commission_value=Decimal("10.00"),
                is_public=True
            ),
            CampaignVersion(
                campaign_id=campaigns[3].campaign_id,
                version_number=1,
                name="CloudStorage Pro Business",
                description="Secure cloud storage for businesses",
                destination_url="https://cloudpro.io",
                default_commission_type="percentage",
                default_commission_value=Decimal("15.00"),
                is_public=True
            ),
        ]
        db.add_all(campaign_versions)
        db.flush()

        # Link campaigns to their current versions
        for campaign, version in zip(campaigns, campaign_versions):
            campaign.current_campaign_version_id = version.campaign_version_id
        db.flush()

        print(f"  ✓ Created {len(campaigns)} campaigns with {len(campaign_versions)} versions")

        # Create campaign partners (enrollments)
        # Each partner enrolls in specific campaigns
        campaign_partners = [
            # Tech Reviewer Pro enrolls in campaigns 0 and 1
            CampaignPartner(
                campaign_version_id=campaign_versions[0].campaign_version_id,
                partner_id=partners[0].partner_id,
                status="approved"
            ),
            CampaignPartner(
                campaign_version_id=campaign_versions[1].campaign_version_id,
                partner_id=partners[0].partner_id,
                status="approved"
            ),
            # Marketing Maven enrolls in campaign 0
            CampaignPartner(
                campaign_version_id=campaign_versions[0].campaign_version_id,
                partner_id=partners[1].partner_id,
                status="approved"
            ),
            # Fitness Influencer Jane enrolls in campaign 2
            CampaignPartner(
                campaign_version_id=campaign_versions[2].campaign_version_id,
                partner_id=partners[2].partner_id,
                status="approved"
            ),
            # YouTube Tech Channel enrolls in campaigns 0 and 3
            CampaignPartner(
                campaign_version_id=campaign_versions[0].campaign_version_id,
                partner_id=partners[4].partner_id,
                status="approved"
            ),
            CampaignPartner(
                campaign_version_id=campaign_versions[3].campaign_version_id,
                partner_id=partners[4].partner_id,
                status="approved"
            ),
        ]
        db.add_all(campaign_partners)
        db.flush()
        print(f"  ✓ Created {len(campaign_partners)} campaign partner enrollments")

        # Create partner links using campaign_partner_id
        links = [
            PartnerLink(
                campaign_partner_id=campaign_partners[0].campaign_partner_id,
                short_code="tech-pro-pm",
                full_url="https://techsaas.com?aff=tech-pro-pm"
            ),
            PartnerLink(
                campaign_partner_id=campaign_partners[1].campaign_partner_id,
                short_code="tech-pro-edu",
                full_url="https://eduplatform.com?aff=tech-pro-edu"
            ),
            PartnerLink(
                campaign_partner_id=campaign_partners[2].campaign_partner_id,
                short_code="maven-pm",
                full_url="https://techsaas.com?aff=maven-pm"
            ),
            PartnerLink(
                campaign_partner_id=campaign_partners[3].campaign_partner_id,
                short_code="jane-fitness",
                full_url="https://fitnessgear.com?aff=jane-fitness"
            ),
            PartnerLink(
                campaign_partner_id=campaign_partners[4].campaign_partner_id,
                short_code="yt-pm",
                full_url="https://techsaas.com?aff=yt-pm"
            ),
            PartnerLink(
                campaign_partner_id=campaign_partners[5].campaign_partner_id,
                short_code="yt-cloud",
                full_url="https://cloudpro.io?aff=yt-cloud"
            ),
        ]
        db.add_all(links)
        db.flush()
        print(f"  ✓ Created {len(links)} partner links")

        # Create clicks
        clicks = []
        # YouTube Tech - high performer
        for i in range(50):
            clicks.append(Click(
                partner_link_id=links[4].partner_link_id,
                clicked_at=datetime.utcnow() - timedelta(hours=i*2)
            ))
        # Tech Reviewer Pro - medium performer
        for i in range(30):
            clicks.append(Click(
                partner_link_id=links[0].partner_link_id,
                clicked_at=datetime.utcnow() - timedelta(hours=i*3)
            ))
        # Fitness Influencer
        for i in range(20):
            clicks.append(Click(
                partner_link_id=links[3].partner_link_id,
                clicked_at=datetime.utcnow() - timedelta(hours=i*4)
            ))
        # Marketing Maven
        for i in range(15):
            clicks.append(Click(
                partner_link_id=links[2].partner_link_id,
                clicked_at=datetime.utcnow() - timedelta(hours=i*5)
            ))
        db.add_all(clicks)
        db.flush()
        print(f"  ✓ Created {len(clicks)} clicks")

        # Create conversions
        # First, we need to create conversion event types
        conversion_types = [
            ConversionEventType(
                name="purchase",
                display_name="Purchase",
                description="Completed purchase transaction",
                is_commissionable=True,
                default_commission_type="percentage"
            ),
            ConversionEventType(
                name="signup",
                display_name="Signup",
                description="User signup/registration",
                is_commissionable=True,
                default_commission_type="percentage"
            ),
        ]
        db.add_all(conversion_types)
        db.flush()

        conversions = []
        # YouTube Tech conversions (10% of clicks) - from first 5 YouTube clicks
        for i in range(5):
            conversions.append(ConversionEvent(
                click_id=clicks[i].click_id,  # Link to YouTube clicks (first 50)
                partner_id=partners[4].partner_id,
                campaign_version_id=campaign_versions[0].campaign_version_id,
                conversion_event_type_id=conversion_types[0].conversion_event_type_id,
                event_value=Decimal("99.99"),
                attribution_type="last_click",
                status="approved",
                occurred_at=datetime.utcnow() - timedelta(hours=i*2 + 1)
            ))

        # Tech Reviewer Pro conversions (5% of clicks) - from clicks 50-79
        for i in range(2):
            conversions.append(ConversionEvent(
                click_id=clicks[50 + i].click_id,  # Tech Reviewer clicks
                partner_id=partners[0].partner_id,
                campaign_version_id=campaign_versions[0].campaign_version_id,
                conversion_event_type_id=conversion_types[0].conversion_event_type_id,
                event_value=Decimal("149.99"),
                attribution_type="last_click",
                status="approved",
                occurred_at=datetime.utcnow() - timedelta(hours=i*6 + 2)
            ))

        # Fitness Influencer conversions - from clicks 80-99
        conversions.append(ConversionEvent(
            click_id=clicks[80].click_id,
            partner_id=partners[2].partner_id,
            campaign_version_id=campaign_versions[2].campaign_version_id,
            conversion_event_type_id=conversion_types[1].conversion_event_type_id,
            event_value=Decimal("199.99"),
            attribution_type="last_click",
            status="approved",
            occurred_at=datetime.utcnow() - timedelta(hours=8)
        ))

        # Pending conversion - from clicks 100-114
        conversions.append(ConversionEvent(
            click_id=clicks[100].click_id,
            partner_id=partners[0].partner_id,
            campaign_version_id=campaign_versions[0].campaign_version_id,
            conversion_event_type_id=conversion_types[0].conversion_event_type_id,
            event_value=Decimal("79.99"),
            attribution_type="last_click",
            status="pending",
            occurred_at=datetime.utcnow() - timedelta(hours=12)
        ))

        db.add_all(conversions)
        db.flush()
        print(f"  ✓ Created {len(conversions)} conversions")

        # Payouts require more setup (payment providers, payment methods)
        # Skipping for now to keep seed script simple
        print(f"  ✓ Skipped payouts (requires payment provider setup)")

        # Commit all changes
        db.commit()
        print("\n✅ Sample data seeded successfully!")
        print(f"\n📊 Summary:")
        print(f"   - Vendors: {db.query(Vendor).count()}")
        print(f"   - Partners: {db.query(Partner).count()}")
        print(f"   - Campaigns: {db.query(Campaign).count()}")
        print(f"   - Partner Links: {db.query(PartnerLink).count()}")
        print(f"   - Clicks: {db.query(Click).count()}")
        print(f"   - Conversions: {db.query(ConversionEvent).count()}")
        print(f"   - Payouts: {db.query(Payout).count()}")

        return True

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = seed_database()
    sys.exit(0 if success else 1)
