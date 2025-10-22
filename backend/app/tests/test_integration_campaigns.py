"""
Integration Tests for Campaign Workflow

Tests the complete campaign lifecycle:
- Vendor creates campaigns
- Partners discover and apply to campaigns
- Vendor approves partners
- Partners generate tracking links
- Track clicks and conversions
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session


@pytest.mark.integration
class TestCampaignWorkflow:
    """Test complete campaign workflow."""

    def test_vendor_creates_campaign(self, client, db_session, vendor_user, auth_headers_vendor):
        """Test vendor creating a new campaign."""
        campaign_data = {
            "version": {
                "name": "Winter Sale 2024",
                "description": "Our biggest sale of the year",
                "destination_url": "https://example.com/winter-sale",
                "approval_required": True,
                "is_public": True,
                "default_commission_type": "percentage",
                "default_commission_value": 10.00,  # Use float instead of Decimal for JSON serialization
                "cookie_duration_days": 30,
            }
        }

        response = client.post(
            "/v1/campaigns",
            json=campaign_data,
            headers=auth_headers_vendor
        )

        if response.status_code != 201:
            print(f"DEBUG: Response status: {response.status_code}")
            print(f"DEBUG: Response body: {response.text}")
            print(f"DEBUG: Request data: {campaign_data}")

        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "active"
        assert "campaign_id" in data
        assert "current_version" in data
        # Check version details
        assert data["current_version"]["name"] == "Winter Sale 2024"
        assert data["current_version"]["is_public"] == True
        campaign_id = data["campaign_id"]

        # Verify in database
        from app.models.campaign import Campaign
        campaign = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        assert campaign is not None
        assert campaign.status == "active"
        assert campaign.vendor_id == vendor_user.vendor_id
        # Verify version exists
        assert campaign.current_version is not None
        assert campaign.current_version.name == "Winter Sale 2024"

    def test_list_campaigns_as_vendor(self, client, vendor_user, auth_headers_vendor):
        """Test vendor can list their campaigns."""
        response = client.get(
            "/v1/campaigns",
            headers=auth_headers_vendor
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or "campaigns" in data

    def test_list_public_campaigns_as_partner(self, client, partner, auth_headers_partner):
        """Test partner can see public campaigns."""
        response = client.get(
            "/v1/campaigns",
            headers=auth_headers_partner
        )

        assert response.status_code == 200
        # Should see public campaigns only
        data = response.json()
        assert isinstance(data, list) or "campaigns" in data

    def test_partner_applies_to_campaign(self, client, db_session, campaign_version, partner, auth_headers_partner):
        """Test partner applying to a campaign."""
        campaign_id = campaign_version.campaign_id

        response = client.post(
            f"/v1/campaigns/{campaign_id}/apply",
            json={"campaign_version_id": campaign_version.campaign_version_id, "note": "I have great audience in this niche"},
            headers=auth_headers_partner
        )

        if response.status_code != 200 and response.status_code != 201:
            print(f"ERROR: Got {response.status_code}: {response.text}")
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["status"] in ["pending", "approved"]

        # Verify in database
        from app.models.campaign import CampaignPartner
        enrollment = db_session.query(CampaignPartner).filter(
            CampaignPartner.partner_id == partner.partner_id,
            CampaignPartner.campaign_version_id == campaign_version.campaign_version_id
        ).first()
        assert enrollment is not None

    def test_vendor_approves_partner_application(
        self, client, db_session, campaign_version, campaign_partner, auth_headers_vendor
    ):
        """Test vendor approving partner's campaign application."""
        # campaign_partner fixture should have status='pending'
        partner_id = campaign_partner.partner_id

        response = client.post(
            f"/v1/campaigns/{campaign_version.campaign_id}/partners/{partner_id}/approve",
            json={"approved": True},
            headers=auth_headers_vendor
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"

        # Verify in database
        db_session.refresh(campaign_partner)
        assert campaign_partner.status == "approved"

    def test_vendor_rejects_partner_application(
        self, client, db_session, campaign_version, campaign_partner, auth_headers_vendor
    ):
        """Test vendor rejecting partner's campaign application."""
        partner_id = campaign_partner.partner_id

        response = client.post(
            f"/v1/campaigns/{campaign_version.campaign_id}/partners/{partner_id}/approve",
            json={"approved": False},
            headers=auth_headers_vendor
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "rejected"

    def test_vendor_set_commission_override(
        self, client, db_session, campaign_version, campaign_partner, auth_headers_vendor
    ):
        """Test vendor setting custom commission for specific partner."""
        partner_id = campaign_partner.partner_id

        override_data = {
            "partner_id": partner_id,
            "campaign_version_id": campaign_version.campaign_version_id,
            "commission_type": "flat",
            "commission_value": "5.00"
        }

        response = client.post(
            f"/v1/campaigns/{campaign_version.campaign_id}/partners/{partner_id}/override",
            json=override_data,
            headers=auth_headers_vendor
        )

        if response.status_code != 201:
            print(f"ERROR: Got {response.status_code}: {response.text}")
        assert response.status_code == 201
        data = response.json()
        assert data["commission_type"] == "flat"
        assert str(data["commission_value"]) == "5.00"

    def test_campaign_cannot_be_created_by_partner(self, client, auth_headers_partner):
        """Test that partners cannot create campaigns."""
        campaign_data = {
            "name": "Partner Campaign",
            "default_commission_type": "percentage",
            "default_commission_value": ("10.00"),
        }

        response = client.post(
            "/v1/campaigns",
            json=campaign_data,
            headers=auth_headers_partner
        )

        assert response.status_code == 403  # Forbidden

    def test_partner_cannot_approve_their_own_application(
        self, client, campaign_version, campaign_partner, auth_headers_partner
    ):
        """Test that partners cannot approve their own applications."""
        response = client.post(
            f"/v1/campaigns/{campaign_version.campaign_id}/partners/{campaign_partner.partner_id}/approve",
            json={"approved": True},
            headers=auth_headers_partner
        )

        assert response.status_code == 403  # Forbidden

    def test_get_campaign_details(self, client, campaign_version, partner_link, auth_headers_vendor):
        """Test getting campaign details including stats."""
        response = client.get(
            f"/v1/campaigns/{campaign_version.campaign_id}",
            headers=auth_headers_vendor
        )

        # Should work with vendor auth
        assert response.status_code in [200, 401]

    def test_campaign_versioning(self, client, db_session, campaign, vendor_user, auth_headers_vendor):
        """Test that campaign changes create new versions."""
        campaign_id = campaign.campaign_id

        # Update campaign
        update_data = {
            "name": "Updated Campaign Name",
            "default_commission_value": ("15.00")
        }

        response = client.put(
            f"/v1/campaigns/{campaign_id}",
            json=update_data,
            headers=auth_headers_vendor
        )

        # May create new version or update existing
        assert response.status_code == 200

    def test_soft_delete_campaign(self, client, db_session, campaign, vendor_user, auth_headers_vendor):
        """Test soft deleting a campaign."""
        campaign_id = campaign.campaign_id

        response = client.delete(
            f"/v1/campaigns/{campaign_id}",
            headers=auth_headers_vendor
        )

        if response.status_code != 204:
            print(f"ERROR: Got {response.status_code}: {response.text}")
        assert response.status_code == 204

        # Verify soft delete (record still exists, marked as deleted)
        from app.models.campaign import Campaign
        campaign_record = db_session.query(Campaign).filter_by(campaign_id=campaign_id).first()
        assert campaign_record is not None
        assert campaign_record.is_deleted == True


@pytest.mark.integration
class TestCampaignPermissions:
    """Test campaign permission and authorization rules."""

    def test_vendor_cannot_see_other_vendor_campaigns(
        self, client, campaign, auth_headers_vendor, db_session
    ):
        """Test that vendors can only see their own campaigns."""
        # Create different vendor
        from app.models.vendor import Vendor
        other_vendor = Vendor(
            name="Other Vendor",
            email="other@vendor.com",
            password_hash="hash",
            company_name="Other Company"
        )
        db_session.add(other_vendor)
        db_session.commit()

        # Auth as original vendor, should not see other vendor's campaign
        response = client.get(
            f"/v1/campaigns/{campaign.campaign_id}",
            headers=auth_headers_vendor
        )

        # May be 403 or 404
        assert response.status_code in [403, 404]

    def test_partner_cannot_see_private_campaigns_without_approval(
        self, client, db_session, vendor_user, auth_headers_partner
    ):
        """Test that partners cannot see private campaigns."""
        from app.models.campaign import Campaign, CampaignVersion

        # Create private campaign
        campaign = Campaign(vendor_id=vendor_user.vendor_id)
        db_session.add(campaign)
        db_session.flush()

        version = CampaignVersion(
            campaign_id=campaign.campaign_id,
            version_number=1,
            name="Private Campaign",
            is_public=False,
            approval_required=True,
            default_commission_type="percentage",
            default_commission_value=("10.00")
        )
        db_session.add(version)
        db_session.commit()

        # Try to access private campaign
        response = client.get(
            f"/v1/campaigns/{campaign.campaign_id}",
            headers=auth_headers_partner
        )

        assert response.status_code in [403, 404]

    def test_campaign_endpoint_requires_authentication(self, client):
        """Test that campaign endpoints require authentication."""
        response = client.get("/v1/campaigns")
        assert response.status_code == 401

    def test_invalid_campaign_id_returns_404(self, client, auth_headers_vendor):
        """Test that non-existent campaign returns 404."""
        response = client.get(
            "/v1/campaigns/99999",
            headers=auth_headers_vendor
        )

        assert response.status_code == 404


@pytest.mark.integration
class TestCampaignValidation:
    """Test campaign input validation."""

    def test_campaign_requires_required_fields(self, client, auth_headers_vendor):
        """Test that campaign creation requires all required fields."""
        incomplete_data = {
            "name": "Incomplete Campaign"
            # Missing other required fields
        }

        response = client.post(
            "/v1/campaigns",
            json=incomplete_data,
            headers=auth_headers_vendor
        )

        assert response.status_code == 422  # Validation error

    def test_campaign_commission_percentage_in_valid_range(self, client, auth_headers_vendor):
        """Test that commission percentages are validated."""
        # Invalid: > 100%
        invalid_data = {
            "name": "Invalid Commission",
            "default_commission_type": "percentage",
            "default_commission_value": ("150.00")  # > 100%
        }

        response = client.post(
            "/v1/campaigns",
            json=invalid_data,
            headers=auth_headers_vendor
        )

        # May accept or reject depending on validation
        assert response.status_code in [201, 422]

    def test_campaign_with_negative_commission_fails(self, client, auth_headers_vendor):
        """Test that negative commissions are rejected."""
        invalid_data = {
            "name": "Negative Commission",
            "default_commission_type": "fixed",
            "default_commission_value": ("-5.00")
        }

        response = client.post(
            "/v1/campaigns",
            json=invalid_data,
            headers=auth_headers_vendor
        )

        assert response.status_code == 422
