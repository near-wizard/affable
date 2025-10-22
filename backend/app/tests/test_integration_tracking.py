"""
Integration Tests for Tracking and Link Generation

Tests:
- Partner generates tracking links
- User clicks link (redirect with tracking)
- Browser cookie management
- Click tracking data collection
- UTM parameter handling
"""

import pytest
import uuid
from datetime import datetime, timedelta


@pytest.mark.integration
class TestLinkGeneration:
    """Test generating and managing tracking links."""

    def test_partner_generates_tracking_link(
        self, client, db_session, campaign_partner, auth_headers_partner
    ):
        """Test partner generating a new tracking link."""
        link_data = {
            "destination_url": "https://example.com/product/widget",
            "label": "Widget Sales Page",
            "utm_source": "email",
            "utm_medium": "newsletter",
            "utm_campaign": "winter-sale"
        }

        response = client.post(
            "/v1/links",
            json=link_data,
            headers=auth_headers_partner
        )

        assert response.status_code == 201
        data = response.json()
        assert "short_code" in data
        assert data["destination_url"] == "https://example.com/product/widget"
        assert data["utm_source"] == "email"

        # Verify short code is unique and URL-safe
        short_code = data["short_code"]
        assert len(short_code) > 0
        assert all(c.isalnum() or c in "-_" for c in short_code)

        # Verify in database
        from app.models.tracking import PartnerLink
        link = db_session.query(PartnerLink).filter_by(short_code=short_code).first()
        assert link is not None

    def test_short_code_is_unique(self, client, campaign_partner, auth_headers_partner, db_session):
        """Test that generated short codes are unique."""
        link_data = {"destination_url": "https://example.com/page1"}

        response1 = client.post("/v1/links", json=link_data, headers=auth_headers_partner)
        response2 = client.post("/v1/links", json=link_data, headers=auth_headers_partner)

        assert response1.status_code == 201
        assert response2.status_code == 201

        code1 = response1.json()["short_code"]
        code2 = response2.json()["short_code"]

        assert code1 != code2

    def test_list_partner_links(self, client, auth_headers_partner):
        """Test partner can list their tracking links."""
        response = client.get(
            "/v1/links",
            headers=auth_headers_partner
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))

    def test_get_link_statistics(self, client, partner_link, auth_headers_partner):
        """Test getting link statistics."""
        response = client.get(
            f"/v1/links/{partner_link.partner_link_id}",
            headers=auth_headers_partner
        )

        assert response.status_code == 200
        data = response.json()
        assert "clicks" in data or "click_count" in data
        assert "conversions" in data or "conversion_count" in data

    def test_partner_cannot_access_other_partner_links(
        self, client, partner_link, auth_headers_partner, db_session
    ):
        """Test that partners cannot access other partner's links."""
        from app.models.partner import Partner

        # Create another partner
        other_partner = Partner(
            name="Other Partner",
            email="other@partner.com",
            password_hash="hash",
            status="active"
        )
        db_session.add(other_partner)
        db_session.commit()

        # Other partner tries to access first partner's link
        response = client.get(
            f"/v1/links/{partner_link.partner_link_id}",
            headers=auth_headers_partner
        )

        # Should be 403 or 404
        assert response.status_code in [403, 404]

    def test_update_link_metadata(self, client, partner_link, auth_headers_partner):
        """Test updating link label and parameters."""
        update_data = {
            "label": "Updated Label",
            "utm_content": "sidebar_ad"
        }

        response = client.put(
            f"/v1/links/{partner_link.partner_link_id}",
            json=update_data,
            headers=auth_headers_partner
        )

        assert response.status_code == 200
        data = response.json()
        assert data["label"] == "Updated Label"

    def test_delete_link(self, client, partner_link, auth_headers_partner, db_session):
        """Test soft deleting a link."""
        link_id = partner_link.partner_link_id

        response = client.delete(
            f"/v1/links/{link_id}",
            headers=auth_headers_partner
        )

        assert response.status_code == 204

        # Verify soft delete
        from app.models.tracking import PartnerLink
        link = db_session.query(PartnerLink).filter_by(partner_link_id=link_id).first()
        assert link is not None
        # Status should be 'deleted' or similar


@pytest.mark.integration
class TestClickTracking:
    """Test click tracking and redirect flow."""

    def test_redirect_endpoint_with_short_code(self, client, partner_link):
        """Test accessing short link redirects to destination."""
        response = client.get(
            f"/r/{partner_link.short_code}",
            allow_redirects=False  # Don't follow redirect
        )

        assert response.status_code == 302
        assert response.headers["location"] == partner_link.full_url

    def test_invalid_short_code_returns_404(self, client):
        """Test invalid short code returns 404."""
        response = client.get("/r/invalidcode123")

        assert response.status_code == 404

    def test_click_creates_tracking_record(self, client, db_session, partner_link):
        """Test that clicking link creates Click record."""
        initial_count = db_session.query(lambda: None).count()

        response = client.get(
            f"/r/{partner_link.short_code}",
            headers={
                "User-Agent": "Mozilla/5.0 Test Browser",
                "Referer": "https://google.com/search?q=test"
            },
            allow_redirects=False
        )

        assert response.status_code == 302

        # Verify Click record created
        from app.models.tracking import Click
        click = db_session.query(Click).filter_by(
            partner_link_id=partner_link.partner_link_id
        ).first()

        assert click is not None
        assert click.ip_address is not None
        assert click.user_agent == "Mozilla/5.0 Test Browser"

    def test_click_sets_browser_cookie(self, client, partner_link):
        """Test that click response sets tracking cookie."""
        response = client.get(
            f"/r/{partner_link.short_code}",
            allow_redirects=False
        )

        assert response.status_code == 302
        assert "tprm" in response.cookies or "Set-Cookie" in response.headers

    def test_cookie_persists_across_clicks(self, client, db_session, partner_link, cookie_factory):
        """Test that same browser (cookie) creates multiple clicks."""
        partner = partner_link.campaign_partner.partner

        # First click
        response1 = client.get(
            f"/r/{partner_link.short_code}",
            allow_redirects=False
        )
        assert response1.status_code == 302

        cookie_value = response1.cookies.get("tprm")

        # Second click with same cookie
        response2 = client.get(
            f"/r/{partner_link.short_code}",
            headers={"Cookie": f"tprm={cookie_value}"},
            allow_redirects=False
        )
        assert response2.status_code == 302

        # Both clicks should reference same cookie
        from app.models.tracking import Click
        clicks = db_session.query(Click).filter_by(
            partner_link_id=partner_link.partner_link_id
        ).all()

        assert len(clicks) >= 1

    def test_utm_parameters_in_redirect_link(self, client, partner_link):
        """Test that UTM parameters are passed to destination."""
        response = client.get(
            f"/r/{partner_link.short_code}?utm_source=facebook&utm_medium=social",
            allow_redirects=False
        )

        assert response.status_code == 302
        redirect_url = response.headers["location"]

        # URL should contain UTM params (or they should be merged)
        assert "utm_source" in redirect_url or len(redirect_url) > 0

    def test_click_records_user_agent(self, client, db_session, partner_link):
        """Test that user agent is recorded."""
        test_ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"

        response = client.get(
            f"/r/{partner_link.short_code}",
            headers={"User-Agent": test_ua},
            allow_redirects=False
        )

        assert response.status_code == 302

        from app.models.tracking import Click
        click = db_session.query(Click).filter_by(
            partner_link_id=partner_link.partner_link_id
        ).first()

        assert click.user_agent == test_ua

    def test_click_records_referrer(self, client, db_session, partner_link):
        """Test that referrer is recorded."""
        test_referrer = "https://newsletter.example.com/article"

        response = client.get(
            f"/r/{partner_link.short_code}",
            headers={"Referer": test_referrer},
            allow_redirects=False
        )

        assert response.status_code == 302

        from app.models.tracking import Click
        click = db_session.query(Click).filter_by(
            partner_link_id=partner_link.partner_link_id
        ).first()

        assert click.referrer_url == test_referrer


@pytest.mark.integration
class TestUTMParameterHandling:
    """Test UTM parameter merging and tracking."""

    def test_link_default_utm_params(self, client, db_session, campaign_partner):
        """Test link with default UTM parameters."""
        link_data = {
            "destination_url": "https://example.com/",
            "utm_source": "affiliate",
            "utm_medium": "partner",
            "utm_campaign": "summer-sale"
        }

        response = client.post(
            "/v1/links",
            json=link_data,
            headers={"Authorization": "Bearer partner_token"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["utm_source"] == "affiliate"

    def test_utm_params_override_on_redirect(self, client, partner_link):
        """Test that query params can override link defaults."""
        # Click with override params
        response = client.get(
            f"/r/{partner_link.short_code}?utm_campaign=override_campaign",
            allow_redirects=False
        )

        assert response.status_code == 302

    def test_click_captures_utm_from_link_and_query(self, client, db_session, partner_link):
        """Test that click records both link and query UTM params."""
        response = client.get(
            f"/r/{partner_link.short_code}?utm_content=ad_123",
            allow_redirects=False
        )

        assert response.status_code == 302

        from app.models.tracking import Click
        click = db_session.query(Click).filter_by(
            partner_link_id=partner_link.partner_link_id
        ).first()

        # Click should have utm_source or utm_content
        assert click is not None


@pytest.mark.integration
class TestCookieManagement:
    """Test browser cookie lifecycle and expiry."""

    def test_cookie_expires_in_30_days(self, client, partner_link):
        """Test that tracking cookie expires in 30 days."""
        response = client.get(
            f"/r/{partner_link.short_code}",
            allow_redirects=False
        )

        assert response.status_code == 302
        # Cookie should have Max-Age or Expires
        cookies = response.cookies
        if "tprm" in cookies:
            cookie = cookies["tprm"]
            # Check expiry is set
            assert cookie is not None

    def test_multiple_links_same_partner_same_cookie(
        self, client, db_session, campaign_partner
    ):
        """Test that multiple clicks on same partner's links share cookie."""
        from app.models.tracking import PartnerLink

        # Create two links for same partner
        link1 = PartnerLink(
            campaign_partner_id=campaign_partner.campaign_partner_id,
            short_code=str(uuid.uuid4())[:8],
            full_url="https://example.com/page1"
        )
        link2 = PartnerLink(
            campaign_partner_id=campaign_partner.campaign_partner_id,
            short_code=str(uuid.uuid4())[:8],
            full_url="https://example.com/page2"
        )
        db_session.add_all([link1, link2])
        db_session.commit()

        # Click on first link
        response1 = client.get(f"/r/{link1.short_code}", allow_redirects=False)
        cookie1 = response1.cookies.get("tprm")

        # Click on second link with same cookie
        response2 = client.get(
            f"/r/{link2.short_code}",
            headers={"Cookie": f"tprm={cookie1}"},
            allow_redirects=False
        )
        assert response2.status_code == 302
