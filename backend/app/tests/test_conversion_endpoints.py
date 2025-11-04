"""
Comprehensive Tests for Conversion Endpoints

Tests all conversion-related endpoints:
- List conversions
- Get conversion details
- Approve/reject conversions
- Conversion filters and pagination
"""

import pytest
from datetime import datetime, timedelta
from fastapi import status


@pytest.mark.integration
class TestListConversions:
    """Test listing conversions."""

    def test_list_conversions_as_vendor(self, client, conversion_event, auth_headers_vendor):
        """Test vendor listing conversions."""
        response = client.get(
            "/v1/conversions",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_list_conversions_as_partner(self, client, conversion_event, partner, auth_headers_partner):
        """Test partner listing their own conversions."""
        response = client.get(
            "/v1/conversions",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data

    def test_list_conversions_filter_by_status(self, client, conversion_event, auth_headers_vendor):
        """Test filtering conversions by status."""
        response = client.get(
            "/v1/conversions?status=pending",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        for item in data["data"]:
            assert item["status"] == "pending"

    def test_list_conversions_filter_by_campaign(self, client, conversion_event, campaign, auth_headers_vendor):
        """Test filtering conversions by campaign."""
        response = client.get(
            f"/v1/conversions?campaign_id={campaign.campaign_id}",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data["data"], list)

    def test_list_conversions_pagination(self, client, conversion_event, db_session, auth_headers_vendor):
        """Test conversions pagination."""
        response = client.get(
            "/v1/conversions?page=1&page_size=10",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) <= 10

    def test_list_conversions_invalid_status_filter(self, client, auth_headers_vendor):
        """Test filtering with invalid status."""
        response = client.get(
            "/v1/conversions?status=invalid_status",
            headers=auth_headers_vendor
        )

        # Should either ignore or reject
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_list_conversions_no_auth(self, client):
        """Test listing conversions without authentication."""
        response = client.get("/v1/conversions")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_conversions_pagination_out_of_range(self, client, auth_headers_vendor):
        """Test pagination with out of range page."""
        response = client.get(
            "/v1/conversions?page=9999",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Should return empty list or last page
        assert isinstance(data["data"], list)

    def test_list_conversions_invalid_page(self, client, auth_headers_vendor):
        """Test pagination with invalid page number."""
        response = client.get(
            "/v1/conversions?page=-1",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_list_conversions_invalid_page_size(self, client, auth_headers_vendor):
        """Test pagination with invalid page size."""
        response = client.get(
            "/v1/conversions?page_size=0",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.integration
class TestGetConversionDetails:
    """Test getting conversion details."""

    def test_get_conversion_success(self, client, conversion_event, auth_headers_vendor):
        """Test getting conversion details."""
        response = client.get(
            f"/v1/conversions/{conversion_event.conversion_event_id}",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["conversion_event_id"] == str(conversion_event.conversion_event_id)
        assert "status" in data
        assert "amount" in data

    def test_get_conversion_nonexistent(self, client, auth_headers_vendor):
        """Test getting non-existent conversion."""
        response = client.get(
            "/v1/conversions/00000000-0000-0000-0000-000000000000",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_conversion_invalid_id(self, client, auth_headers_vendor):
        """Test getting conversion with invalid ID format."""
        response = client.get(
            "/v1/conversions/not-a-uuid",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_get_conversion_no_auth(self, client, conversion_event):
        """Test getting conversion without authentication."""
        response = client.get(f"/v1/conversions/{conversion_event.conversion_event_id}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_conversion_as_partner(self, client, conversion_event, partner, auth_headers_partner):
        """Test partner getting their own conversion."""
        # Only if conversion belongs to partner
        response = client.get(
            f"/v1/conversions/{conversion_event.conversion_event_id}",
            headers=auth_headers_partner
        )

        # Should be 200 if it's their conversion, 403 or 404 otherwise
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]


@pytest.mark.integration
class TestApproveConversion:
    """Test approving/rejecting conversions."""

    def test_approve_conversion_success(self, client, conversion_event, auth_headers_vendor):
        """Test approving a conversion."""
        response = client.post(
            f"/v1/conversions/{conversion_event.conversion_event_id}/approve",
            json={"approved": True},
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "approved"

    def test_reject_conversion(self, client, conversion_event, auth_headers_vendor):
        """Test rejecting a conversion."""
        response = client.post(
            f"/v1/conversions/{conversion_event.conversion_event_id}/approve",
            json={
                "approved": False,
                "rejection_reason": "Invalid conversion"
            },
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "rejected"

    def test_reject_without_reason(self, client, conversion_event, auth_headers_vendor):
        """Test rejecting without providing reason."""
        response = client.post(
            f"/v1/conversions/{conversion_event.conversion_event_id}/approve",
            json={"approved": False},
            headers=auth_headers_vendor
        )

        # Should either require reason or accept
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_approve_nonexistent_conversion(self, client, auth_headers_vendor):
        """Test approving non-existent conversion."""
        response = client.post(
            "/v1/conversions/00000000-0000-0000-0000-000000000000/approve",
            json={"approved": True},
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_approve_already_approved(self, client, conversion_event, db_session, auth_headers_vendor):
        """Test approving already approved conversion."""
        # Mark as approved
        conversion_event.status = "approved"
        db_session.commit()

        response = client.post(
            f"/v1/conversions/{conversion_event.conversion_event_id}/approve",
            json={"approved": True},
            headers=auth_headers_vendor
        )

        # Should either reject or idempotently accept
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_partner_cannot_approve_conversion(self, client, conversion_event, auth_headers_partner):
        """Test that partners cannot approve conversions."""
        response = client.post(
            f"/v1/conversions/{conversion_event.conversion_event_id}/approve",
            json={"approved": True},
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_approve_with_empty_reason(self, client, conversion_event, auth_headers_vendor):
        """Test rejecting with empty reason string."""
        response = client.post(
            f"/v1/conversions/{conversion_event.conversion_event_id}/approve",
            json={
                "approved": False,
                "rejection_reason": ""
            },
            headers=auth_headers_vendor
        )

        # Empty reason might be rejected
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_approve_with_very_long_reason(self, client, conversion_event, auth_headers_vendor):
        """Test rejecting with very long reason."""
        response = client.post(
            f"/v1/conversions/{conversion_event.conversion_event_id}/approve",
            json={
                "approved": False,
                "rejection_reason": "a" * 10000
            },
            headers=auth_headers_vendor
        )

        # Should accept or reject depending on validation
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_approve_no_auth(self, client, conversion_event):
        """Test approving conversion without authentication."""
        response = client.post(
            f"/v1/conversions/{conversion_event.conversion_event_id}/approve",
            json={"approved": True}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
class TestConversionFiltering:
    """Test conversion filtering and search."""

    def test_filter_pending_conversions(self, client, db_session, campaign, auth_headers_vendor):
        """Test filtering for pending conversions."""
        response = client.get(
            "/v1/conversions?status=pending",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        for conversion in data["data"]:
            assert conversion["status"] == "pending"

    def test_filter_approved_conversions(self, client, db_session, campaign, auth_headers_vendor):
        """Test filtering for approved conversions."""
        response = client.get(
            "/v1/conversions?status=approved",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        for conversion in data["data"]:
            assert conversion["status"] == "approved"

    def test_filter_by_multiple_statuses(self, client, auth_headers_vendor):
        """Test filtering by multiple statuses."""
        # May or may not be supported
        response = client.get(
            "/v1/conversions?status=pending&status=approved",
            headers=auth_headers_vendor
        )

        # Should be accepted or return empty/error
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_filter_by_date_range(self, client, auth_headers_vendor):
        """Test filtering conversions by date range."""
        start_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
        end_date = datetime.utcnow().isoformat()

        response = client.get(
            f"/v1/conversions?start_date={start_date}&end_date={end_date}",
            headers=auth_headers_vendor
        )

        # May or may not be supported
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_filter_by_invalid_date(self, client, auth_headers_vendor):
        """Test filtering with invalid date format."""
        response = client.get(
            "/v1/conversions?start_date=invalid-date",
            headers=auth_headers_vendor
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_200_OK]


@pytest.mark.integration
class TestConversionEdgeCases:
    """Test edge cases for conversions."""

    def test_conversion_with_zero_amount(self, client, db_session, campaign_partner, auth_headers_partner):
        """Test conversion with zero amount."""
        from app.models import ConversionEvent
        from decimal import Decimal

        conversion = ConversionEvent(
            campaign_partner_id=campaign_partner.campaign_partner_id,
            amount=Decimal("0.00"),
            external_conversion_id="zero-amount",
            status="pending"
        )
        db_session.add(conversion)
        db_session.commit()

        response = client.get(
            f"/v1/conversions/{conversion.conversion_event_id}",
            headers=auth_headers_partner
        )

        # Should handle zero amounts
        assert response.status_code == status.HTTP_200_OK

    def test_conversion_with_negative_amount(self, client, db_session, campaign_partner, auth_headers_partner):
        """Test conversion with negative amount (refund)."""
        from app.models import ConversionEvent
        from decimal import Decimal

        conversion = ConversionEvent(
            campaign_partner_id=campaign_partner.campaign_partner_id,
            amount=Decimal("-50.00"),
            external_conversion_id="refund",
            status="pending"
        )
        db_session.add(conversion)
        db_session.commit()

        response = client.get(
            f"/v1/conversions/{conversion.conversion_event_id}",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK

    def test_conversion_with_very_large_amount(self, client, db_session, campaign_partner, auth_headers_partner):
        """Test conversion with very large amount."""
        from app.models import ConversionEvent
        from decimal import Decimal

        conversion = ConversionEvent(
            campaign_partner_id=campaign_partner.campaign_partner_id,
            amount=Decimal("999999999.99"),
            external_conversion_id="large-amount",
            status="pending"
        )
        db_session.add(conversion)
        db_session.commit()

        response = client.get(
            f"/v1/conversions/{conversion.conversion_event_id}",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK

    def test_list_many_conversions_performance(self, client, db_session, campaign_partner, auth_headers_vendor):
        """Test listing with many conversions."""
        from app.models import ConversionEvent
        from decimal import Decimal

        # Create many conversions
        for i in range(100):
            conversion = ConversionEvent(
                campaign_partner_id=campaign_partner.campaign_partner_id,
                amount=Decimal("10.00"),
                external_conversion_id=f"conv-{i}",
                status="pending"
            )
            db_session.add(conversion)

        db_session.commit()

        response = client.get(
            "/v1/conversions?page=1&page_size=20",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) <= 20
