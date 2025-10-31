#!/usr/bin/env python3
"""
Seed sample data into the database for development and testing.
Uses ORM models to be compatible with the current database schema.
"""

import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal
import io

# Fix for Windows encoding issues
if sys.platform == 'win32':
    # Redirect stdout to use UTF-8
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add parent directories to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import SessionLocal
from app.models import (
    Partner, Vendor, VendorUser, Campaign, CampaignVersion, CampaignPartner, PartnerLink, Click,
    ConversionEventType, ConversionEvent, Payout, SubscriptionPlan, VendorSubscription,
    SubscriptionPlanEnum, BillingCycleEnum, SubscriptionStatus, VendorInvoice, VendorInvoiceItem,
    VendorPaymentMethod, PaymentProviderEnum, InvoiceStatus, PaymentProvider, PartnerPaymentMethod,
    PayoutEvent
)


def seed_database():
    """Seed the database with sample data"""
    db = SessionLocal()

    try:
        print("📊 Seeding database with sample data...")

        # Check which sections already exist
        existing_partners = db.query(Partner).count()
        existing_plans = db.query(SubscriptionPlan).count()
        existing_payment_methods = db.query(VendorPaymentMethod).count()
        existing_invoices = db.query(VendorInvoice).count()
        existing_payouts = db.query(Payout).count()

        # Skip partner/campaign/conversion seeding if already exists
        skip_core_seed = existing_partners > 0
        skip_billing_plans_seed = existing_plans > 0
        skip_billing_details_seed = (existing_payment_methods > 0 and existing_invoices > 0 and existing_payouts > 0)

        # Only skip entire seed if everything exists
        if skip_core_seed and skip_billing_plans_seed and skip_billing_details_seed:
            print("✓ Database already has all data, skipping seed")
            return True

        if skip_core_seed:
            print("✓ Database already has partner/campaign data, will only seed billing if needed")

        # Create vendors (always needed for subscriptions)
        vendors = []
        if not skip_core_seed:
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
        else:
            # Retrieve existing vendors for subscription linking
            vendors = db.query(Vendor).limit(4).all()
            print(f"  ✓ Using {len(vendors)} existing vendors")

        # Create core data (vendors, partners, campaigns, etc.) only if not already seeded
        if not skip_core_seed:
            # Create vendor users
            # Password for all: "password" (hashed with pbkdf2-sha256)
            password_hash = "$pbkdf2-sha256$29000$dY6x1jqntPY.x9jbO0copQ$0xgyXxBxvPlWEdVAAYF2d1VB57vp2XLjneCjs/1/Mrs"

            vendor_users = [
                VendorUser(
                    vendor_id=vendors[0].vendor_id,
                    email="admin@techsaas.com",
                    password_hash=password_hash,
                    name="Tech Admin",
                    role="owner",
                    status="active"
                ),
                VendorUser(
                    vendor_id=vendors[1].vendor_id,
                    email="admin@eduplatform.com",
                    password_hash=password_hash,
                    name="Edu Admin",
                    role="owner",
                    status="active"
                ),
                VendorUser(
                    vendor_id=vendors[2].vendor_id,
                    email="admin@fitnessgear.com",
                    password_hash=password_hash,
                    name="Fitness Admin",
                    role="owner",
                    status="active"
                ),
            ]
            db.add_all(vendor_users)
            db.flush()
            print(f"  ✓ Created {len(vendor_users)} vendor users")

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
                    website_url="https://techreviewerpro.com",
                    verified=True,
                    rating=5
                ),
                Partner(
                    name="Marketing Maven",
                    email="hello@marketingmaven.io",
                    password_hash=password_hash,
                    status="active",
                    tier="gold",
                    bio="Digital marketing expert and educator",
                    website_url="https://marketingmaven.io",
                    verified=True,
                    rating=5
                ),
                Partner(
                    name="Fitness Influencer Jane",
                    email="jane@fitinfluencer.com",
                    password_hash=password_hash,
                    status="active",
                    tier="gold",
                    bio="Fitness coach with 200K Instagram followers",
                    website_url="https://instagram.com/janefitness",
                    verified=True,
                    rating=4
                ),
                Partner(
                    name="StartupBlogger",
                    email="admin@startupblogger.net",
                    password_hash=password_hash,
                    status="active",
                    tier="silver",
                    bio="Blog about startups and entrepreneurship",
                    website_url="https://startupblogger.net",
                    verified=True,
                    rating=4
                ),
                Partner(
                    name="YouTube Tech Channel",
                    email="business@yttechchannel.com",
                    password_hash=password_hash,
                    status="active",
                    tier="platinum",
                    bio="Tech reviews on YouTube - 1M subscribers",
                    website_url="https://youtube.com/techreviews",
                    verified=True,
                    rating=5
                ),
                Partner(
                    name="EduTech Reviews",
                    email="team@edutechreviews.com",
                    password_hash=password_hash,
                    status="active",
                    tier="silver",
                    bio="Educational technology reviews",
                    website_url="https://edutechreviews.com",
                    verified=True,
                    rating=4
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
                    is_public=True,
                    attribution_model="last_click"
                ),
                CampaignVersion(
                    campaign_id=campaigns[1].campaign_id,
                    version_number=1,
                    name="EduPlatform Course Marketplace",
                    description="Join thousands learning new skills online",
                    destination_url="https://eduplatform.com",
                    default_commission_type="percentage",
                    default_commission_value=Decimal("15.00"),
                    is_public=True,
                    attribution_model="linear"
                ),
                CampaignVersion(
                    campaign_id=campaigns[2].campaign_id,
                    version_number=1,
                    name="FitnessGear - Premium Equipment",
                    description="High-quality fitness equipment",
                    destination_url="https://fitnessgear.com",
                    default_commission_type="percentage",
                    default_commission_value=Decimal("10.00"),
                    is_public=True,
                    attribution_model="time_decay"
                ),
                CampaignVersion(
                    campaign_id=campaigns[3].campaign_id,
                    version_number=1,
                    name="CloudStorage Pro Business",
                    description="Secure cloud storage for businesses",
                    destination_url="https://cloudpro.io",
                    default_commission_type="percentage",
                    default_commission_value=Decimal("15.00"),
                    is_public=True,
                    attribution_model="first_click"
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
                # Fitness Influencer Jane enrolls in campaign 2 (APPROVED) and campaign 0 (PENDING)
                CampaignPartner(
                    campaign_version_id=campaign_versions[2].campaign_version_id,
                    partner_id=partners[2].partner_id,
                    status="approved"
                ),
                CampaignPartner(
                    campaign_version_id=campaign_versions[0].campaign_version_id,
                    partner_id=partners[2].partner_id,
                    status="pending",
                    applied_at=datetime.utcnow()
                ),
                # StartupBlogger enrolls in campaign 0 (PENDING)
                CampaignPartner(
                    campaign_version_id=campaign_versions[0].campaign_version_id,
                    partner_id=partners[3].partner_id,
                    status="pending",
                    applied_at=datetime.utcnow()
                ),
                # EduTech Reviews enrolls in campaign 0 (PENDING)
                CampaignPartner(
                    campaign_version_id=campaign_versions[0].campaign_version_id,
                    partner_id=partners[5].partner_id,
                    status="pending",
                    applied_at=datetime.utcnow()
                ),
                # Marketing Maven enrolls in campaign 0 (REJECTED)
                CampaignPartner(
                    campaign_version_id=campaign_versions[0].campaign_version_id,
                    partner_id=partners[1].partner_id,
                    status="rejected",
                    applied_at=datetime.utcnow() - timedelta(days=5),
                    rejected_at=datetime.utcnow() - timedelta(days=4),
                    rejection_reason="Does not meet audience quality requirements"
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

            # Create clicks with UTM parameters
            clicks = []
            utm_sources = ["google", "facebook", "linkedin", "twitter", "direct"]
            utm_mediums = ["cpc", "social", "organic", "email", "referral"]
            utm_campaigns = ["summer_sale", "black_friday", "product_launch", "brand_awareness", "retargeting"]

            # YouTube Tech - high performer
            for i in range(50):
                clicks.append(Click(
                    partner_link_id=links[4].partner_link_id,
                    clicked_at=datetime.utcnow() - timedelta(hours=i*2),
                    utm_source=utm_sources[i % len(utm_sources)],
                    utm_medium=utm_mediums[i % len(utm_mediums)],
                    utm_campaign=utm_campaigns[i % len(utm_campaigns)]
                ))
            # Tech Reviewer Pro - medium performer
            for i in range(30):
                clicks.append(Click(
                    partner_link_id=links[0].partner_link_id,
                    clicked_at=datetime.utcnow() - timedelta(hours=i*3),
                    utm_source=utm_sources[(i+1) % len(utm_sources)],
                    utm_medium=utm_mediums[(i+2) % len(utm_mediums)],
                    utm_campaign=utm_campaigns[(i+1) % len(utm_campaigns)]
                ))
            # Fitness Influencer
            for i in range(20):
                clicks.append(Click(
                    partner_link_id=links[3].partner_link_id,
                    clicked_at=datetime.utcnow() - timedelta(hours=i*4),
                    utm_source=utm_sources[(i+2) % len(utm_sources)],
                    utm_medium=utm_mediums[(i+1) % len(utm_mediums)],
                    utm_campaign=utm_campaigns[(i+2) % len(utm_campaigns)]
                ))
            # Marketing Maven
            for i in range(15):
                clicks.append(Click(
                    partner_link_id=links[2].partner_link_id,
                    clicked_at=datetime.utcnow() - timedelta(hours=i*5),
                    utm_source=utm_sources[(i+3) % len(utm_sources)],
                    utm_medium=utm_mediums[(i+3) % len(utm_mediums)],
                    utm_campaign=utm_campaigns[(i+3) % len(utm_campaigns)]
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

        # Define now for use in billing data (both inside and outside skip_billing_seed block)
        now = datetime.utcnow()
        next_billing = now + timedelta(days=30)

        # Seed billing data only if not already done
        if not skip_billing_plans_seed:
            # Create subscription plans
            plans = [
                SubscriptionPlan(
                    plan_name=SubscriptionPlanEnum.BETA,
                    display_name="Beta Plan",
                    description="Free beta access for early adopters - Limited time offer",
                    base_price=Decimal("0.00"),
                    gmv_percentage=Decimal("10.00"),
                    billing_cycle=BillingCycleEnum.MONTHLY,
                    is_active=True,
                    has_usage_limits=True,
                    max_monthly_volume=Decimal("50000.00"),
                    is_custom=False
                ),
                SubscriptionPlan(
                    plan_name=SubscriptionPlanEnum.FOUNDER,
                    display_name="Founder Plan",
                    description="Perfect for growing vendors - Recurring billing",
                    base_price=Decimal("20.00"),
                    gmv_percentage=Decimal("10.00"),
                    billing_cycle=BillingCycleEnum.MONTHLY,
                    is_active=True,
                    has_usage_limits=False,
                    is_custom=False
                ),
                SubscriptionPlan(
                    plan_name=SubscriptionPlanEnum.BOOTSTRAP,
                    display_name="Bootstrap Plan",
                    description="For scaling vendors - Recurring billing",
                    base_price=Decimal("200.00"),
                    gmv_percentage=Decimal("7.50"),
                    billing_cycle=BillingCycleEnum.MONTHLY,
                    is_active=True,
                    has_usage_limits=False,
                    is_custom=False
                ),
                SubscriptionPlan(
                    plan_name=SubscriptionPlanEnum.ACCELERATOR,
                    display_name="Accelerator Plan",
                    description="Enterprise tier for high-volume vendors",
                    base_price=Decimal("1200.00"),
                    gmv_percentage=Decimal("5.00"),
                    billing_cycle=BillingCycleEnum.MONTHLY,
                    is_active=True,
                    has_usage_limits=False,
                    is_custom=False
                ),
            ]

            # Create a custom negotiated plan example (for vendor 0)
            if vendors:  # Check vendors exist before creating custom plan
                custom_plan = SubscriptionPlan(
                    plan_name=SubscriptionPlanEnum.BOOTSTRAP,
                    display_name="Custom Enterprise Plan - TechSaaS Inc",
                    description="Negotiated custom plan for high-volume vendor",
                    base_price=Decimal("1500.00"),
                    gmv_percentage=Decimal("4.50"),
                    billing_cycle=BillingCycleEnum.MONTHLY,
                    is_active=True,
                    has_usage_limits=False,
                    is_custom=True,
                    custom_for_vendor_id=vendors[0].vendor_id
                )
                plans.append(custom_plan)

            db.add_all(plans)
            db.flush()
            print(f"  ✓ Created {len(plans)} subscription plans (4 standard + 1 custom)")

            # Create vendor subscriptions
            subscriptions = [
                VendorSubscription(
                    vendor_id=vendors[0].vendor_id,
                    subscription_plan_id=plans[4].subscription_plan_id,  # Custom plan
                    status=SubscriptionStatus.ACTIVE,
                    start_date=now - timedelta(days=60),
                    next_billing_date=next_billing,
                    stripe_customer_id="cus_techsaas_123",
                    stripe_subscription_id="sub_techsaas_123",
                    currency="USD",
                    tax_exempt=False
                ),
                VendorSubscription(
                    vendor_id=vendors[1].vendor_id,
                    subscription_plan_id=plans[0].subscription_plan_id,  # Beta
                    status=SubscriptionStatus.ACTIVE,
                    start_date=now - timedelta(days=30),
                    next_billing_date=next_billing,
                    stripe_customer_id="cus_eduplatform_123",
                    stripe_subscription_id="sub_eduplatform_123",
                    currency="USD",
                    tax_exempt=False
                ),
                VendorSubscription(
                    vendor_id=vendors[2].vendor_id,
                    subscription_plan_id=plans[1].subscription_plan_id,  # Founder
                    status=SubscriptionStatus.ACTIVE,
                    start_date=now - timedelta(days=90),
                    next_billing_date=next_billing,
                    stripe_customer_id="cus_fitnessgear_123",
                    stripe_subscription_id="sub_fitnessgear_123",
                    currency="USD",
                    tax_exempt=False
                ),
                VendorSubscription(
                    vendor_id=vendors[3].vendor_id,
                    subscription_plan_id=plans[3].subscription_plan_id,  # Accelerator
                    status=SubscriptionStatus.ACTIVE,
                    start_date=now - timedelta(days=120),
                    next_billing_date=next_billing,
                    stripe_customer_id="cus_cloudpro_123",
                    stripe_subscription_id="sub_cloudpro_123",
                    currency="USD",
                    tax_exempt=False
                ),
            ]

            db.add_all(subscriptions)
            db.flush()
            print(f"  ✓ Created {len(subscriptions)} vendor subscriptions")

        # Create vendor payment methods
        payment_methods = []
        existing_payment_methods = db.query(VendorPaymentMethod).count()
        if existing_payment_methods == 0:
            # Get vendors for payment methods
            vendors = db.query(Vendor).all()

            for i, vendor in enumerate(vendors):
                # Add Stripe card for all vendors
                payment_methods.append(
                    VendorPaymentMethod(
                        vendor_id=vendor.vendor_id,
                        payment_provider=PaymentProviderEnum.STRIPE,
                        provider_account_id=f"pm_stripe_card_{i+1}_test",
                        account_details={
                            "card_last_4": f"{4242 + i}",
                            "card_brand": "Visa",
                            "exp_month": 12,
                            "exp_year": 2026
                        },
                        is_default=True,
                        is_verified=True,
                        verified_at=datetime.utcnow()
                    )
                )

            db.add_all(payment_methods)
            db.flush()
            print(f"  ✓ Created {len(payment_methods)} vendor payment methods (Stripe)")

        # Create sample invoices for vendors with subscriptions (active or paused)
        invoices = []
        existing_invoices = db.query(VendorInvoice).count()
        if existing_invoices == 0:
            subscriptions = db.query(VendorSubscription).filter(
                VendorSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED])
            ).all()

            for subscription in subscriptions:
                # Create one invoice per subscription (current month)
                invoice = VendorInvoice(
                    vendor_subscription_id=subscription.vendor_subscription_id,
                    invoice_number=f"INV-2025-{subscription.vendor_id:03d}-001",
                    status=InvoiceStatus.DRAFT,  # Draft until generated
                    billing_start_date=now - timedelta(days=30),
                    billing_end_date=now,
                    subtotal=Decimal("100.00"),  # Base subscription fee
                    tax_amount=Decimal("0.00"),
                    adjustment_amount=Decimal("0.00"),
                    total_amount=Decimal("100.00"),
                    notes=f"Monthly invoice for {subscription.plan.display_name}"
                )
                invoices.append(invoice)

            db.add_all(invoices)
            db.flush()
            print(f"  ✓ Created {len(invoices)} sample invoices")

        # Create payment providers and partner payment methods
        existing_providers = db.query(PaymentProvider).count()
        if existing_providers == 0:
            providers = [
                PaymentProvider(name="stripe", display_name="Stripe"),
                PaymentProvider(name="paypal", display_name="PayPal"),
                PaymentProvider(name="wire_transfer", display_name="Wire Transfer"),
                PaymentProvider(name="ach", display_name="ACH"),
            ]
            db.add_all(providers)
            db.flush()
            print(f"  ✓ Created {len(providers)} payment providers")
        else:
            providers = db.query(PaymentProvider).all()

        # Create partner payment methods
        existing_partner_methods = db.query(PartnerPaymentMethod).count()
        if existing_partner_methods == 0:
            partners = db.query(Partner).all()[:4]  # First 4 partners
            payment_methods = []

            for i, partner in enumerate(partners):
                provider = providers[i % len(providers)]
                payment_methods.append(
                    PartnerPaymentMethod(
                        partner_id=partner.partner_id,
                        payment_provider_id=provider.payment_provider_id,
                        provider_account_id=f"{provider.name}_{partner.partner_id}_test",
                        account_details={
                            "account_type": "verified",
                            "verified_date": now.isoformat()
                        },
                        is_default=True,
                        is_verified=True,
                        verified_at=now
                    )
                )

            db.add_all(payment_methods)
            db.flush()
            print(f"  ✓ Created {len(payment_methods)} partner payment methods")

        # Create payouts with history
        existing_payouts = db.query(Payout).count()
        if existing_payouts == 0:
            payouts = []
            partners = db.query(Partner).all()[:4]

            for i, partner in enumerate(partners):
                # Get partner's payment method
                payment_method = db.query(PartnerPaymentMethod).filter_by(
                    partner_id=partner.partner_id
                ).first()
                payment_provider = payment_method.payment_provider if payment_method else None

                if not payment_method or not payment_provider:
                    continue  # Skip if no payment method configured

                # Paid payouts (history)
                payouts.append(
                    Payout(
                        partner_id=partner.partner_id,
                        partner_payment_method_id=payment_method.partner_payment_method_id,
                        amount=Decimal("250.00") * (i + 1),
                        currency="USD",
                        payment_provider_id=payment_provider.payment_provider_id,
                        status="completed",
                        start_date=now - timedelta(days=45),
                        end_date=now - timedelta(days=30),
                        completed_at=now - timedelta(days=30)
                    )
                )

                # Pending payouts (current)
                payouts.append(
                    Payout(
                        partner_id=partner.partner_id,
                        partner_payment_method_id=payment_method.partner_payment_method_id,
                        amount=Decimal("150.00") * (i + 1),
                        currency="USD",
                        payment_provider_id=payment_provider.payment_provider_id,
                        status="pending",
                        start_date=now - timedelta(days=7),
                        end_date=now
                    )
                )

            db.add_all(payouts)
            db.flush()
            print(f"  ✓ Created {len(payouts)} partner payouts (paid + pending)")

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
        print(f"   - Subscription Plans: {db.query(SubscriptionPlan).count()}")
        print(f"   - Vendor Subscriptions: {db.query(VendorSubscription).count()}")
        print(f"   - Vendor Payment Methods: {db.query(VendorPaymentMethod).count()}")
        print(f"   - Vendor Invoices: {db.query(VendorInvoice).count()}")
        print(f"   - Payment Providers: {db.query(PaymentProvider).count()}")
        print(f"   - Partner Payment Methods: {db.query(PartnerPaymentMethod).count()}")
        print(f"   - Partner Payouts: {db.query(Payout).count()}")

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
