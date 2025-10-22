"""
Pytest Configuration and Shared Fixtures

Provides database, client, and model fixtures for all tests.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.models import (
    Vendor, VendorUser, Partner, PartnerType, PartnerPaymentMethod,
    Campaign, CampaignVersion, CampaignPartner, PartnerLink,
    Click, Cookie, ConversionEvent, ConversionEventType,
    PaymentProvider, Payout, Reward, CommissionRule
)


# =====================================================
# DATABASE FIXTURES
# =====================================================

@pytest.fixture(scope="function")
def db_engine():
    """Create test database engine with in-memory SQLite."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create test database session."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create FastAPI test client with test database."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# =====================================================
# MODEL FIXTURES
# =====================================================

@pytest.fixture
def vendor(db_session):
    """Create test vendor."""
    vendor = Vendor(
        name="Test Vendor",
        email="vendor@test.com",
        password_hash=get_password_hash("testpass123"),
        company_name="Test Company",
        website_url="https://test.com",
        status="active",
        api_key="test_api_key_123",
        webhook_secret="test_webhook_secret",
        webhook_url="https://test.com/webhook"
    )
    db_session.add(vendor)
    db_session.commit()
    db_session.refresh(vendor)
    return vendor


@pytest.fixture
def vendor_user(db_session, vendor):
    """Create test vendor user."""
    user = VendorUser(
        vendor_id=vendor.vendor_id,
        email="admin@test.com",
        password_hash=get_password_hash("testpass123"),
        name="Admin User",
        role="owner",
        status="active"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def partner(db_session):
    """Create test partner."""
    partner = Partner(
        name="Test Partner",
        email="partner@test.com",
        password_hash=get_password_hash("testpass123"),
        status="active",
        tier="silver",
        bio="Test partner bio",
        website_url="https://partner.com"
    )
    db_session.add(partner)
    db_session.commit()
    db_session.refresh(partner)
    return partner


@pytest.fixture
def partner_type(db_session):
    """Create test partner type."""
    ptype = PartnerType(
        name="affiliate",
        description="Traditional affiliate marketer"
    )
    db_session.add(ptype)
    db_session.commit()
    db_session.refresh(ptype)
    return ptype


@pytest.fixture
def campaign(db_session, vendor):
    """Create test campaign."""
    campaign = Campaign(
        vendor_id=vendor.vendor_id,
        status="active"
    )
    db_session.add(campaign)
    db_session.commit()
    db_session.refresh(campaign)
    return campaign


@pytest.fixture
def campaign_version(db_session, campaign):
    """Create test campaign version."""
    version = CampaignVersion(
        campaign_id=campaign.campaign_id,
        version_number=1,
        name="Test Campaign",
        description="Test campaign description",
        destination_url="https://test.com/product",
        default_commission_type="percentage",
        default_commission_value=Decimal("10.00"),
        cookie_duration_days=30,
        approval_required=False,
        is_public=True
    )
    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)
    
    # Update campaign's current version
    campaign.current_campaign_version_id = version.campaign_version_id
    db_session.commit()
    
    return version


@pytest.fixture
def campaign_partner(db_session, campaign_version, partner):
    """Create test campaign partner relationship."""
    cp = CampaignPartner(
        campaign_version_id=campaign_version.campaign_version_id,
        partner_id=partner.partner_id,
        status="approved",
        approved_at=datetime.utcnow(),
        total_clicks=0,
        total_conversions=0,
        total_revenue=Decimal("0"),
        total_commission_earned=Decimal("0")
    )
    db_session.add(cp)
    db_session.commit()
    db_session.refresh(cp)
    return cp


@pytest.fixture
def partner_link(db_session, campaign_partner):
    """Create test partner link."""
    link = PartnerLink(
        campaign_partner_id=campaign_partner.campaign_partner_id,
        short_code="test123",
        full_url="https://test.com/product",
        utm_params={
            "utm_source": "partner",
            "utm_medium": "affiliate",
            "utm_campaign": "test"
        },
        link_label="Test Link"
    )
    db_session.add(link)
    db_session.commit()
    db_session.refresh(link)
    return link


@pytest.fixture
def conversion_event_type(db_session):
    """Create test conversion event type."""
    event_type = ConversionEventType(
        name="sale",
        display_name="Completed Sale",
        description="User completed a purchase",
        is_commissionable=True,
        default_commission_type="percentage",
        default_commission_value=Decimal("10.00"),
        sort_order=1
    )
    db_session.add(event_type)
    db_session.commit()
    db_session.refresh(event_type)
    return event_type


@pytest.fixture
def payment_provider(db_session):
    """Create test payment provider."""
    provider = PaymentProvider(
        name="paypal",
        display_name="PayPal",
        is_active=True,
        config={"manual_processing": False}
    )
    db_session.add(provider)
    db_session.commit()
    db_session.refresh(provider)
    return provider


@pytest.fixture
def partner_payment_method(db_session, partner, payment_provider):
    """Create test partner payment method."""
    method = PartnerPaymentMethod(
        partner_id=partner.partner_id,
        payment_provider_id=payment_provider.payment_provider_id,
        provider_account_id="test@paypal.com",
        account_details={"email": "test@paypal.com"},
        is_default=True,
        is_verified=True,
        verified_at=datetime.utcnow()
    )
    db_session.add(method)
    db_session.commit()
    db_session.refresh(method)
    return method


@pytest.fixture
def reward(db_session):
    """Create test reward."""
    reward = Reward(
        name="Standard 10% Commission",
        reward_type="percentage",
        reward_value=Decimal("10.00")
    )
    db_session.add(reward)
    db_session.commit()
    db_session.refresh(reward)
    return reward


# =====================================================
# AUTHENTICATION FIXTURES
# =====================================================

@pytest.fixture
def partner_token(partner):
    """Create JWT token for partner."""
    token_data = {
        "sub": str(partner.partner_id),
        "user_type": "partner",
        "email": partner.email
    }
    return create_access_token(data=token_data)


@pytest.fixture
def vendor_token(vendor_user):
    """Create JWT token for vendor user."""
    token_data = {
        "sub": str(vendor_user.vendor_user_id),
        "user_type": "vendor_user",
        "email": vendor_user.email,
        "vendor_id": vendor_user.vendor_id
    }
    return create_access_token(data=token_data)


@pytest.fixture
def auth_headers_partner(partner_token):
    """Create authorization headers for partner."""
    return {"Authorization": f"Bearer {partner_token}"}


@pytest.fixture
def auth_headers_vendor(vendor_token):
    """Create authorization headers for vendor."""
    return {"Authorization": f"Bearer {vendor_token}"}


# =====================================================
# FACTORY FIXTURES
# =====================================================

@pytest.fixture
def click_factory(db_session):
    """Factory for creating clicks."""
    def _create_click(partner_link, cookie_id=None, **kwargs):
        defaults = {
            "partner_link_id": partner_link.partner_link_id,
            "cookie_id": cookie_id,
            "ip_address": "192.168.1.1",
            "user_agent": "Mozilla/5.0 Test Browser",
            "referrer_url": "https://google.com",
            "utm_source": "test",
            "utm_medium": "affiliate",
            "clicked_at": datetime.utcnow()
        }
        defaults.update(kwargs)
        
        click = Click(**defaults)
        db_session.add(click)
        db_session.commit()
        db_session.refresh(click)
        return click
    
    return _create_click


@pytest.fixture
def cookie_factory(db_session):
    """Factory for creating cookies."""
    def _create_cookie(partner, campaign_version, **kwargs):
        defaults = {
            "cookie_id": uuid.uuid4(),
            "first_partner_id": partner.partner_id,
            "last_partner_id": partner.partner_id,
            "last_campaign_version_id": campaign_version.campaign_version_id,
            "expires_at": datetime.utcnow() + timedelta(days=30),
            "last_seen_at": datetime.utcnow()
        }
        defaults.update(kwargs)
        
        cookie = Cookie(**defaults)
        db_session.add(cookie)
        db_session.commit()
        db_session.refresh(cookie)
        return cookie
    
    return _create_cookie


@pytest.fixture
def conversion_factory(db_session):
    """Factory for creating conversion events."""
    def _create_conversion(
        partner,
        campaign_version,
        conversion_event_type,
        **kwargs
    ):
        defaults = {
            "conversion_event_type_id": conversion_event_type.conversion_event_type_id,
            "partner_id": partner.partner_id,
            "campaign_version_id": campaign_version.campaign_version_id,
            "attribution_type": "last_click",
            "transaction_id": f"txn_{uuid.uuid4().hex[:8]}",
            "event_value": Decimal("100.00"),
            "status": "pending",
            "occurred_at": datetime.utcnow(),
            "recorded_at": datetime.utcnow()
        }
        defaults.update(kwargs)
        
        conversion = ConversionEvent(**defaults)
        db_session.add(conversion)
        db_session.commit()
        db_session.refresh(conversion)
        return conversion
    
    return _create_conversion


# =====================================================
# CELERY FIXTURES
# =====================================================

@pytest.fixture
def celery_config():
    """Celery configuration for testing."""
    return {
        'broker_url': 'memory://',
        'result_backend': 'cache+memory://',
        'task_always_eager': True,  # Execute tasks synchronously
        'task_eager_propagates': True,  # Propagate exceptions
    }


@pytest.fixture
def celery_worker_parameters():
    """Celery worker parameters for testing."""
    return {
        'perform_ping_check': False,
    }


# =====================================================
# HELPER FIXTURES
# =====================================================

@pytest.fixture
def freeze_time():
    """Freeze time for consistent testing."""
    from unittest.mock import patch
    frozen_time = datetime(2025, 1, 15, 12, 0, 0)
    
    with patch('app.models.tracking.datetime') as mock_datetime:
        mock_datetime.utcnow.return_value = frozen_time
        mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
        yield frozen_time


@pytest.fixture
def mock_redis():
    """Mock Redis for testing."""
    from unittest.mock import MagicMock
    mock = MagicMock()
    return mock


# =====================================================
# CLEANUP
# =====================================================

@pytest.fixture(autouse=True)
def cleanup_celery_tasks():
    """Clean up Celery tasks after each test."""
    yield
    # Clear any pending tasks (gracefully handle no broker connection)
    try:
        from celery import current_app
        current_app.control.purge()
    except Exception:
        # Celery broker not available, skip cleanup
        pass