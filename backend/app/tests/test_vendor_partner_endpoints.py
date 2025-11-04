"""
Comprehensive Tests for Vendor and Partner Endpoints

Tests for:
- Vendor profile endpoints
- Vendor dashboard and analytics
- Partner profile endpoints
- Partner dashboard and analytics
- Partner statistics
"""

import pytest
from datetime import datetime, timedelta
from fastapi import status


@pytest.mark.integration
class TestVendorProfile:
    """Test vendor profile endpoints."""

    def test_get_vendor_profile(self, client, vendor_user, auth_headers_vendor):
        """Test getting vendor profile."""
        response = client.get(
            "/v1/vendors/me",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == vendor_user.email
        assert "vendor_id" in data

    def test_get_vendor_profile_no_auth(self, client):
        """Test getting vendor profile without authentication."""
        response = client.get("/v1/vendors/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_vendor_profile_partner_access(self, client, partner, auth_headers_partner):
        """Test that partners cannot access vendor profile endpoint."""
        response = client.get(
            "/v1/vendors/me",
            headers=auth_headers_partner
        )

        # Should be forbidden or redirect
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

    def test_get_vendor_profile_legacy(self, client, vendor_user, auth_headers_vendor):
        """Test getting vendor profile via legacy endpoint."""
        response = client.get(
            "/v1/vendors/profile",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == vendor_user.email


@pytest.mark.integration
class TestVendorDashboard:
    """Test vendor dashboard endpoints."""

    def test_get_vendor_dashboard(self, client, vendor_user, auth_headers_vendor):
        """Test getting vendor dashboard."""
        response = client.get(
            "/v1/vendors/me/dashboard",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_campaigns" in data or "campaigns" in data
        assert "total_partners" in data or "partners" in data

    def test_dashboard_with_date_filters(self, client, vendor_user, auth_headers_vendor):
        """Test dashboard with date range filters."""
        start_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
        end_date = datetime.utcnow().isoformat()

        response = client.get(
            f"/v1/vendors/me/dashboard?start_date={start_date}&end_date={end_date}",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK

    def test_dashboard_with_invalid_dates(self, client, vendor_user, auth_headers_vendor):
        """Test dashboard with invalid date format."""
        response = client.get(
            "/v1/vendors/me/dashboard?start_date=invalid",
            headers=auth_headers_vendor
        )

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_dashboard_no_auth(self, client):
        """Test dashboard without authentication."""
        response = client.get("/v1/vendors/me/dashboard")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
class TestVendorCampaigns:
    """Test vendor campaigns endpoint."""

    def test_get_vendor_campaigns(self, client, vendor_user, campaign, auth_headers_vendor):
        """Test getting vendor's campaigns."""
        response = client.get(
            "/v1/vendors/me/campaigns",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data
        assert len(data["data"]) >= 1

    def test_get_vendor_campaigns_pagination(self, client, vendor_user, auth_headers_vendor):
        """Test vendor campaigns pagination."""
        response = client.get(
            "/v1/vendors/me/campaigns?page=1&limit=10",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) <= 10

    def test_get_vendor_campaigns_filter_by_status(self, client, vendor_user, campaign, auth_headers_vendor):
        """Test filtering vendor campaigns by status."""
        response = client.get(
            "/v1/vendors/me/campaigns?status=active",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        for item in data["data"]:
            assert item["status"] == "active"

    def test_get_vendor_campaigns_no_auth(self, client):
        """Test getting campaigns without authentication."""
        response = client.get("/v1/vendors/me/campaigns")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
class TestVendorPayouts:
    """Test vendor payouts endpoint."""

    def test_get_vendor_payouts(self, client, vendor_user, auth_headers_vendor):
        """Test getting vendor's payouts."""
        response = client.get(
            "/v1/vendors/me/payouts",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data

    def test_get_vendor_payouts_filter_by_status(self, client, vendor_user, auth_headers_vendor):
        """Test filtering vendor payouts by status."""
        response = client.get(
            "/v1/vendors/me/payouts?status=pending",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK

    def test_get_vendor_payouts_pagination(self, client, vendor_user, auth_headers_vendor):
        """Test vendor payouts pagination."""
        response = client.get(
            "/v1/vendors/me/payouts?page=1&limit=20",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.integration
class TestVendorWebhooks:
    """Test vendor webhook management endpoints."""

    def test_get_webhook_secret(self, client, vendor_user, auth_headers_vendor):
        """Test getting webhook secret."""
        response = client.get(
            "/v1/vendors/me/webhook-secret",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "webhook_secret" in data
        assert "webhook_url" in data

    def test_regenerate_webhook_secret(self, client, vendor_user, db_session, auth_headers_vendor):
        """Test regenerating webhook secret."""
        # Get original secret
        response1 = client.get(
            "/v1/vendors/me/webhook-secret",
            headers=auth_headers_vendor
        )
        original_secret = response1.json()["webhook_secret"]

        # Regenerate
        response2 = client.post(
            "/v1/vendors/me/webhook-secret/regenerate",
            headers=auth_headers_vendor
        )

        assert response2.status_code == status.HTTP_200_OK
        new_secret = response2.json()["webhook_secret"]
        assert new_secret != original_secret

    def test_regenerate_webhook_no_auth(self, client):
        """Test regenerating webhook without authentication."""
        response = client.post(
            "/v1/vendors/me/webhook-secret/regenerate"
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
class TestPartnerProfile:
    """Test partner profile endpoints."""

    def test_get_partner_profile(self, client, partner, auth_headers_partner):
        """Test getting partner profile."""
        response = client.get(
            "/v1/partners/me",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["partner_id"] == str(partner.partner_id)
        assert data["email"] == partner.email

    def test_get_partner_profile_no_auth(self, client):
        """Test getting partner profile without authentication."""
        response = client.get("/v1/partners/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_partner_profile(self, client, partner, auth_headers_partner):
        """Test updating partner profile."""
        response = client.put(
            "/v1/partners/me",
            json={
                "name": "Updated Name",
                "bio": "Updated bio",
                "website_url": "https://newsite.com"
            },
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated Name"

    def test_update_partner_profile_invalid_url(self, client, partner, auth_headers_partner):
        """Test updating profile with invalid website URL."""
        response = client.put(
            "/v1/partners/me",
            json={
                "website_url": "not-a-url"
            },
            headers=auth_headers_partner
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_200_OK]


@pytest.mark.integration
class TestPartnerStats:
    """Test partner statistics endpoints."""

    def test_get_partner_stats(self, client, partner, auth_headers_partner):
        """Test getting partner statistics."""
        response = client.get(
            "/v1/partners/me/stats",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_clicks" in data or "clicks" in data
        assert "total_conversions" in data or "conversions" in data

    def test_get_partner_dashboard(self, client, partner, auth_headers_partner):
        """Test getting partner dashboard."""
        response = client.get(
            "/v1/partners/me/dashboard",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "campaigns" in data or "active_campaigns" in data

    def test_get_partner_analytics(self, client, partner, auth_headers_partner):
        """Test getting partner analytics."""
        response = client.get(
            "/v1/partners/me/analytics",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, dict) or isinstance(data, list)

    def test_analytics_with_date_range(self, client, partner, auth_headers_partner):
        """Test analytics with date range."""
        start_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
        end_date = datetime.utcnow().isoformat()

        response = client.get(
            f"/v1/partners/me/analytics?start_date={start_date}&end_date={end_date}",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK

    def test_analytics_with_utm_filters(self, client, partner, auth_headers_partner):
        """Test analytics with UTM filters."""
        response = client.get(
            "/v1/partners/me/analytics?utm_source=facebook&utm_medium=social",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.integration
class TestListPartners:
    """Test listing partners."""

    def test_list_all_partners(self, client, vendor_user, partner, auth_headers_vendor):
        """Test vendor listing all partners."""
        response = client.get(
            "/v1/partners",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data

    def test_list_partners_pagination(self, client, vendor_user, auth_headers_vendor):
        """Test partners pagination."""
        response = client.get(
            "/v1/partners?page=1&limit=20",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) <= 20

    def test_list_partners_search(self, client, vendor_user, partner, auth_headers_vendor):
        """Test searching partners."""
        response = client.get(
            f"/v1/partners?search={partner.name}",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK

    def test_list_partners_filter_by_type(self, client, vendor_user, auth_headers_vendor):
        """Test filtering partners by type."""
        response = client.get(
            "/v1/partners?type=individual",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK

    def test_list_partners_verified_only(self, client, vendor_user, auth_headers_vendor):
        """Test filtering verified partners only."""
        response = client.get(
            "/v1/partners?verified_only=true",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK

    def test_list_partners_no_auth(self, client):
        """Test listing partners without authentication."""
        response = client.get("/v1/partners")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
class TestGetPartnerDetails:
    """Test getting specific partner details."""

    def test_get_partner_by_id(self, client, partner, vendor_user, auth_headers_vendor):
        """Test getting partner details by ID."""
        response = client.get(
            f"/v1/partners/{partner.partner_id}",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["partner_id"] == str(partner.partner_id)

    def test_get_partner_nonexistent(self, client, vendor_user, auth_headers_vendor):
        """Test getting non-existent partner."""
        response = client.get(
            "/v1/partners/00000000-0000-0000-0000-000000000000",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_partner_campaigns(self, client, partner, vendor_user, campaign_partner, auth_headers_vendor):
        """Test getting partner's campaigns."""
        response = client.get(
            f"/v1/partners/{partner.partner_id}/campaigns",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data

    def test_get_partner_conversions(self, client, partner, vendor_user, auth_headers_vendor):
        """Test getting partner's conversions."""
        response = client.get(
            f"/v1/partners/{partner.partner_id}/conversions",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data

    def test_get_partner_links(self, client, partner, vendor_user, auth_headers_vendor):
        """Test getting partner's links."""
        response = client.get(
            f"/v1/partners/{partner.partner_id}/links",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data

    def test_get_partner_payouts(self, client, partner, vendor_user, auth_headers_vendor):
        """Test getting partner's payouts."""
        response = client.get(
            f"/v1/partners/{partner.partner_id}/payouts",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data


@pytest.mark.integration
class TestPartnerPayments:
    """Test partner payment method endpoints."""

    def test_get_partner_payment_methods(self, client, partner, auth_headers_partner):
        """Test getting partner payment methods."""
        response = client.get(
            "/v1/payouts/payment-methods",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_add_payment_method(self, client, partner, auth_headers_partner):
        """Test adding payment method."""
        response = client.post(
            "/v1/payouts/payment-methods",
            json={
                "payment_provider_id": "paypal",
                "provider_account_id": "partner@paypal.com"
            },
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_201_CREATED

    def test_add_invalid_payment_method(self, client, partner, auth_headers_partner):
        """Test adding invalid payment method."""
        response = client.post(
            "/v1/payouts/payment-methods",
            json={
                "payment_provider_id": "invalid_provider",
                "provider_account_id": "account"
            },
            headers=auth_headers_partner
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]


@pytest.mark.integration
class TestPartnerPayoutsInfo:
    """Test partner payout information endpoints."""

    def test_get_partner_payouts(self, client, partner, auth_headers_partner):
        """Test getting partner's payouts."""
        response = client.get(
            "/v1/partner-payouts/me/payouts",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data

    def test_get_payout_summary(self, client, partner, auth_headers_partner):
        """Test getting payout summary."""
        response = client.get(
            "/v1/partner-payouts/me/payout-summary",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_earned" in data or "total" in data

    def test_get_upcoming_payouts(self, client, partner, auth_headers_partner):
        """Test getting upcoming payouts."""
        response = client.get(
            "/v1/partner-payouts/me/upcoming-payouts",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
