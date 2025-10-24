"""
Integration Tests for Partner Authorization

Tests that partners can only access their own dashboard and analytics.
Ensures unauthorized access to other partners' data returns 403 Forbidden.
"""

import pytest
from app.models import Partner


@pytest.mark.integration
class TestPartnerDashboardAuthorization:
    """Test partner dashboard authorization."""

    def test_partner_can_access_own_dashboard(self, client, partner, auth_headers_partner):
        """Test that a partner can access their own dashboard."""
        partner_id = partner.partner_id

        response = client.get(
            f"/v1/partners/{partner_id}/dashboard",
            headers=auth_headers_partner
        )

        assert response.status_code == 200
        data = response.json()
        assert "partner" in data
        assert data["partner"]["partner_id"] == partner_id
        assert "stats" in data
        assert "recent_campaigns" in data
        assert "recent_conversions" in data

    def test_partner_cannot_access_other_partner_dashboard(self, client, partner, db_session, auth_headers_partner):
        """Test that a partner cannot access another partner's dashboard."""
        from app.core.security import get_password_hash
        # Create another partner
        other_partner = Partner(
            name="Other Partner",
            email="other@test.com",
            password_hash=get_password_hash("testpass123"),
            status="active",
            tier="gold"
        )
        db_session.add(other_partner)
        db_session.commit()
        db_session.refresh(other_partner)

        response = client.get(
            f"/v1/partners/{other_partner.partner_id}/dashboard",
            headers=auth_headers_partner
        )

        assert response.status_code == 403
        data = response.json()
        assert "detail" in data
        assert "Unauthorized" in data["detail"]

    def test_partner_cannot_access_dashboard_without_auth(self, client, partner):
        """Test that unauthenticated requests cannot access partner dashboard."""
        partner_id = partner.partner_id

        response = client.get(f"/v1/partners/{partner_id}/dashboard")

        assert response.status_code == 401

    def test_dashboard_nonexistent_partner(self, client, auth_headers_partner):
        """Test accessing dashboard for a nonexistent partner."""
        response = client.get(
            "/v1/partners/99999/dashboard",
            headers=auth_headers_partner
        )

        # Should be 403 because the requesting partner is not partner 99999
        assert response.status_code == 403


@pytest.mark.integration
class TestPartnerAnalyticsAuthorization:
    """Test partner analytics authorization."""

    def test_partner_can_access_own_analytics(self, client, partner, auth_headers_partner):
        """Test that a partner can access their own analytics."""
        partner_id = partner.partner_id

        response = client.get(
            f"/v1/partners/{partner_id}/analytics",
            headers=auth_headers_partner
        )

        assert response.status_code == 200
        data = response.json()
        assert "date_range" in data
        assert "total_clicks" in data
        assert "total_conversions" in data
        assert "data" in data
        assert "utm_sources" in data
        assert "utm_mediums" in data
        assert "utm_campaigns" in data

    def test_partner_cannot_access_other_partner_analytics(self, client, partner, db_session, auth_headers_partner):
        """Test that a partner cannot access another partner's analytics."""
        from app.core.security import get_password_hash
        # Create another partner
        other_partner = Partner(
            name="Other Partner",
            email="other@test.com",
            password_hash=get_password_hash("testpass123"),
            status="active",
            tier="gold"
        )
        db_session.add(other_partner)
        db_session.commit()
        db_session.refresh(other_partner)

        response = client.get(
            f"/v1/partners/{other_partner.partner_id}/analytics",
            headers=auth_headers_partner
        )

        assert response.status_code == 403
        data = response.json()
        assert "detail" in data
        assert "Unauthorized" in data["detail"]

    def test_partner_cannot_access_analytics_without_auth(self, client, partner):
        """Test that unauthenticated requests cannot access partner analytics."""
        partner_id = partner.partner_id

        response = client.get(f"/v1/partners/{partner_id}/analytics")

        assert response.status_code == 401

    def test_analytics_nonexistent_partner(self, client, auth_headers_partner):
        """Test accessing analytics for a nonexistent partner."""
        response = client.get(
            "/v1/partners/99999/analytics",
            headers=auth_headers_partner
        )

        # Should be 403 because the requesting partner is not partner 99999
        assert response.status_code == 403

    def test_analytics_with_date_range(self, client, partner, auth_headers_partner):
        """Test analytics with custom date range."""
        partner_id = partner.partner_id

        response = client.get(
            f"/v1/partners/{partner_id}/analytics",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-01-31"
            },
            headers=auth_headers_partner
        )

        assert response.status_code == 200
        data = response.json()
        assert data["date_range"]["start_date"] == "2024-01-01"
        assert data["date_range"]["end_date"] == "2024-01-31"

    def test_analytics_with_utm_filters(self, client, partner, auth_headers_partner):
        """Test analytics with UTM filters."""
        partner_id = partner.partner_id

        response = client.get(
            f"/v1/partners/{partner_id}/analytics",
            params={
                "utm_source": "google",
                "utm_medium": "cpc",
                "utm_campaign": "summer_sale"
            },
            headers=auth_headers_partner
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["data"], list)
