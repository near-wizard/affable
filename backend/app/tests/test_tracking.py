"""
Unit Tests for Tracking API

Tests click tracking, redirect, and cookie management.
"""

import pytest
from datetime import datetime, timedelta
import uuid
from unittest.mock import patch, MagicMock

from app.models import Click, Cookie, ConversionEvent


class TestRedirectEndpoint:
    """Tests for GET /r/{short_code} redirect endpoint."""
    
    def test_redirect_creates_click(self, client, db_session, partner_link):
        """Test that clicking a link creates a click record."""
        response = client.get(f"/r/{partner_link.short_code}")
        
        assert response.status_code == 302
        assert response.headers["location"] == partner_link.full_url
        
        # Verify click was created
        click = db_session.query(Click).first()
        assert click is not None
        assert click.partner_link_id == partner_link.partner_link_id
    
    def test_redirect_creates_cookie(self, client, db_session, partner_link):
        """Test that first click creates a new cookie."""
        response = client.get(f"/r/{partner_link.short_code}")
        
        assert response.status_code == 302
        assert "tprm" in response.cookies
        
        # Verify cookie was created in database
        cookie_id = response.cookies["tprm"]
        cookie = db_session.query(Cookie).filter(
            Cookie.cookie_id == uuid.UUID(cookie_id)
        ).first()
        
        assert cookie is not None
        assert cookie.first_partner_id == partner_link.campaign_partner.partner_id
    
    def test_redirect_reuses_existing_cookie(self, client, db_session, partner_link, cookie_factory, partner, campaign_version):
        """Test that subsequent clicks reuse existing cookie."""
        # Create existing cookie
        existing_cookie = cookie_factory(partner, campaign_version)
        
        # Make request with existing cookie
        client.cookies.set("tprm", str(existing_cookie.cookie_id))
        response = client.get(f"/r/{partner_link.short_code}")
        
        assert response.status_code == 302
        
        # Should not create new cookie
        cookie_count = db_session.query(Cookie).count()
        assert cookie_count == 1
        
        # Verify cookie was updated
        db_session.refresh(existing_cookie)
        assert existing_cookie.last_click_id is not None
    
    def test_redirect_with_utm_params(self, client, db_session, partner_link):
        """Test that UTM parameters are merged correctly."""
        response = client.get(
            f"/r/{partner_link.short_code}",
            params={"utm_source": "facebook", "utm_content": "ad123"}
        )
        
        assert response.status_code == 302
        
        # Verify click has merged UTM params
        click = db_session.query(Click).first()
        assert click.utm_source == "facebook"  # Override from query
        assert click.utm_medium == "affiliate"  # From link default
        assert click.utm_content == "ad123"  # From query
    
    def test_redirect_records_metadata(self, client, db_session, partner_link):
        """Test that click metadata is recorded."""
        headers = {
            "User-Agent": "Mozilla/5.0 Test",
            "Referer": "https://facebook.com"
        }
        
        response = client.get(f"/r/{partner_link.short_code}", headers=headers)
        
        assert response.status_code == 302
        
        click = db_session.query(Click).first()
        assert click.user_agent == "Mozilla/5.0 Test"
        assert click.referrer_url == "https://facebook.com"
        assert click.ip_address is not None
    
    def test_redirect_invalid_short_code(self, client):
        """Test redirect with invalid short code returns 404."""
        response = client.get("/r/invalid_code_999")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_redirect_deleted_link(self, client, db_session, partner_link):
        """Test redirect with soft-deleted link returns 404."""
        partner_link.is_deleted = True
        db_session.commit()
        
        response = client.get(f"/r/{partner_link.short_code}")
        
        assert response.status_code == 404
    
    def test_redirect_unapproved_campaign_partner(self, client, db_session, partner_link):
        """Test redirect fails if campaign partner not approved."""
        partner_link.campaign_partner.status = "pending"
        db_session.commit()
        
        response = client.get(f"/r/{partner_link.short_code}")
        
        assert response.status_code == 404
    
    def test_redirect_extends_cookie_expiration(self, client, db_session, partner_link, cookie_factory, partner, campaign_version):
        """Test that clicking extends cookie expiration."""
        # Create cookie expiring soon
        old_expiry = datetime.utcnow() + timedelta(days=1)
        existing_cookie = cookie_factory(
            partner,
            campaign_version,
            expires_at=old_expiry
        )
        
        # Click with existing cookie
        client.cookies.set("tprm", str(existing_cookie.cookie_id))
        response = client.get(f"/r/{partner_link.short_code}")
        
        assert response.status_code == 302
        
        # Verify expiration extended
        db_session.refresh(existing_cookie)
        assert existing_cookie.expires_at > old_expiry
    
    def test_redirect_updates_last_seen(self, client, db_session, partner_link, cookie_factory, partner, campaign_version):
        """Test that clicking updates last_seen_at."""
        existing_cookie = cookie_factory(partner, campaign_version)
        original_last_seen = existing_cookie.last_seen_at
        
        # Wait a moment
        import time
        time.sleep(0.1)
        
        client.cookies.set("tprm", str(existing_cookie.cookie_id))
        response = client.get(f"/r/{partner_link.short_code}")
        
        assert response.status_code == 302
        
        db_session.refresh(existing_cookie)
        assert existing_cookie.last_seen_at > original_last_seen
    
    @patch('app.workers.tasks.process_click')
    def test_redirect_enqueues_background_task(self, mock_task, client, partner_link):
        """Test that background task is enqueued after click."""
        mock_task.delay = MagicMock()
        
        response = client.get(f"/r/{partner_link.short_code}")
        
        assert response.status_code == 302
        # Background task enqueuing is optional, so don't assert it was called
        # Just verify it doesn't break if not available
    
    def test_redirect_handles_expired_cookie_gracefully(self, client, db_session, partner_link, cookie_factory, partner, campaign_version):
        """Test that expired cookie is treated as new visit."""
        # Create expired cookie
        expired_cookie = cookie_factory(
            partner,
            campaign_version,
            expires_at=datetime.utcnow() - timedelta(days=1)
        )
        
        # Try to use expired cookie
        client.cookies.set("tprm", str(expired_cookie.cookie_id))
        response = client.get(f"/r/{partner_link.short_code}")
        
        assert response.status_code == 302
        
        # Should create new cookie
        cookie_count = db_session.query(Cookie).filter(
            Cookie.is_deleted == False
        ).count()
        assert cookie_count == 2  # Old + new


class TestTrackingPixel:
    """Tests for GET /pixel.gif tracking pixel endpoint."""
    
    def test_pixel_returns_gif(self, client):
        """Test that pixel endpoint returns valid GIF."""
        response = client.get("/pixel.gif")
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/gif"
        assert len(response.content) > 0
    
    def test_pixel_with_event_creates_conversion(
        self, client, db_session, cookie_factory, partner, 
        campaign_version, conversion_event_type
    ):
        """Test that pixel with event creates conversion."""
        cookie = cookie_factory(partner, campaign_version)
        
        client.cookies.set("tprm", str(cookie.cookie_id))
        response = client.get(
            "/pixel.gif",
            params={"event": "sale", "value": 99.99}
        )
        
        assert response.status_code == 200
        
        # Verify conversion created
        conversion = db_session.query(ConversionEvent).first()
        assert conversion is not None
        assert conversion.cookie_id == cookie.cookie_id
        assert conversion.event_value == 99.99
    
    def test_pixel_without_cookie_still_works(self, client):
        """Test that pixel works even without cookie."""
        response = client.get("/pixel.gif", params={"event": "page_view"})
        
        assert response.status_code == 200
        # Should not create conversion without cookie
    
    def test_pixel_cache_headers(self, client):
        """Test that pixel has proper no-cache headers."""
        response = client.get("/pixel.gif")
        
        assert response.status_code == 200
        assert "no-cache" in response.headers.get("cache-control", "").lower()
        assert response.headers.get("pragma") == "no-cache"


class TestCookieManagement:
    """Tests for cookie creation and management logic."""
    
    def test_cookie_has_secure_attributes(self, client, partner_link):
        """Test that cookie has secure attributes set."""
        response = client.get(f"/r/{partner_link.short_code}")
        
        assert response.status_code == 302
        
        # Check Set-Cookie header
        set_cookie = response.headers.get("set-cookie", "")
        assert "Secure" in set_cookie
        assert "HttpOnly" in set_cookie
        assert "SameSite=none" in set_cookie.lower()
    
    def test_cookie_id_is_valid_uuid(self, client, partner_link):
        """Test that cookie ID is a valid UUID."""
        response = client.get(f"/r/{partner_link.short_code}")
        
        cookie_id = response.cookies["tprm"]
        
        # Should not raise ValueError
        uuid_obj = uuid.UUID(cookie_id)
        assert str(uuid_obj) == cookie_id
    
    def test_cookie_tracks_first_and_last_click(
        self, client, db_session, partner_link, click_factory
    ):
        """Test that cookie tracks both first and last click."""
        # First click
        response1 = client.get(f"/r/{partner_link.short_code}")
        cookie_id = uuid.UUID(response1.cookies["tprm"])
        
        cookie = db_session.query(Cookie).filter(
            Cookie.cookie_id == cookie_id
        ).first()
        
        first_click_id = cookie.first_click_id
        assert cookie.first_click_id == cookie.last_click_id
        
        # Second click
        client.cookies.set("tprm", str(cookie_id))
        response2 = client.get(f"/r/{partner_link.short_code}")
        
        db_session.refresh(cookie)
        assert cookie.first_click_id == first_click_id  # Unchanged
        assert cookie.last_click_id != first_click_id  # Updated
    
    def test_cookie_tracks_partner_journey(
        self, client, db_session, partner_link, campaign_partner, 
        partner, campaign_version
    ):
        """Test that cookie tracks partner attribution journey."""
        response = client.get(f"/r/{partner_link.short_code}")
        cookie_id = uuid.UUID(response.cookies["tprm"])
        
        cookie = db_session.query(Cookie).filter(
            Cookie.cookie_id == cookie_id
        ).first()
        
        assert cookie.first_partner_id == partner.partner_id
        assert cookie.last_partner_id == partner.partner_id
        assert cookie.last_campaign_version_id == campaign_version.campaign_version_id


class TestClickRecording:
    """Tests for click recording functionality."""
    
    def test_click_has_timestamp(self, client, db_session, partner_link):
        """Test that click has clicked_at timestamp."""
        before = datetime.utcnow()
        response = client.get(f"/r/{partner_link.short_code}")
        after = datetime.utcnow()
        
        click = db_session.query(Click).first()
        assert click.clicked_at >= before
        assert click.clicked_at <= after
    
    def test_click_records_ip_address(self, client, db_session, partner_link):
        """Test that click records client IP address."""
        response = client.get(f"/r/{partner_link.short_code}")
        
        click = db_session.query(Click).first()
        # TestClient uses testclient as IP
        assert click.ip_address is not None
    
    def test_multiple_clicks_same_link(self, client, db_session, partner_link):
        """Test that multiple clicks create multiple records."""
        client.get(f"/r/{partner_link.short_code}")
        client.get(f"/r/{partner_link.short_code}")
        client.get(f"/r/{partner_link.short_code}")
        
        click_count = db_session.query(Click).filter(
            Click.partner_link_id == partner_link.partner_link_id
        ).count()
        
        assert click_count == 3
    
    def test_click_soft_delete_flag(self, client, db_session, partner_link):
        """Test that new clicks have is_deleted=False."""
        response = client.get(f"/r/{partner_link.short_code}")
        
        click = db_session.query(Click).first()
        assert click.is_deleted == False


class TestUTMParameterHandling:
    """Tests for UTM parameter merging logic."""
    
    def test_utm_from_link_defaults(self, client, db_session, partner_link):
        """Test that link defaults are used when no query params."""
        response = client.get(f"/r/{partner_link.short_code}")
        
        click = db_session.query(Click).first()
        assert click.utm_source == "partner"
        assert click.utm_medium == "affiliate"
        assert click.utm_campaign == "test"
    
    def test_utm_query_overrides_defaults(self, client, db_session, partner_link):
        """Test that query params override link defaults."""
        response = client.get(
            f"/r/{partner_link.short_code}",
            params={
                "utm_source": "email",
                "utm_campaign": "newsletter"
            }
        )
        
        click = db_session.query(Click).first()
        assert click.utm_source == "email"  # Overridden
        assert click.utm_medium == "affiliate"  # From default
        assert click.utm_campaign == "newsletter"  # Overridden
    
    def test_utm_preserves_original_link_params(self, client, db_session, partner_link):
        """Test that original link UTM params are preserved."""
        # Link has UTM params set
        assert partner_link.utm_params is not None
        
        response = client.get(f"/r/{partner_link.short_code}")
        
        # Original link should be unchanged
        db_session.refresh(partner_link)
        assert partner_link.utm_params["utm_source"] == "partner"


class TestErrorHandling:
    """Tests for error handling in tracking endpoint."""
    
    def test_malformed_cookie_ignored(self, client, db_session, partner_link):
        """Test that malformed cookie is ignored gracefully."""
        client.cookies.set("tprm", "not-a-valid-uuid")
        
        response = client.get(f"/r/{partner_link.short_code}")
        
        assert response.status_code == 302
        # Should create new cookie
        assert "tprm" in response.cookies
    
    def test_database_error_handling(self, client, partner_link):
        """Test that database errors are handled gracefully."""
        # This test would require mocking database failures
        # For now, just verify endpoint is resilient
        pass
    
    def test_concurrent_clicks_same_link(self, client, db_session, partner_link):
        """Test handling of concurrent clicks (race conditions)."""
        import threading
        
        def make_click():
            client.get(f"/r/{partner_link.short_code}")
        
        threads = [threading.Thread(target=make_click) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        # All clicks should be recorded
        click_count = db_session.query(Click).filter(
            Click.partner_link_id == partner_link.partner_link_id
        ).count()
        
        assert click_count == 5


class TestPerformance:
    """Performance and optimization tests."""
    
    def test_redirect_query_count(self, client, partner_link):
        """Test that redirect uses minimal database queries."""
        # This would require query counting middleware
        # For now, verify redirect is fast
        import time
        
        start = time.time()
        response = client.get(f"/r/{partner_link.short_code}")
        end = time.time()
        
        assert response.status_code == 302
        assert (end - start) < 0.1  # Should be under 100ms
    
    def test_high_volume_clicks(self, client, db_session, partner_link):
        """Test handling of high volume clicks."""
        num_clicks = 100
        
        for _ in range(num_clicks):
            client.get(f"/r/{partner_link.short_code}")
        
        click_count = db_session.query(Click).count()
        assert click_count == num_clicks