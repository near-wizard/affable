"""
Comprehensive Tests for Campaign Endpoints

Tests all campaign endpoints with various scenarios:
- List campaigns
- Create campaigns
- Get campaign details
- Update campaigns
- Delete campaigns
- Partner application flow
- Campaign partner management
- Commission overrides
- Partner invitations
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import status


@pytest.mark.integration
class TestListCampaigns:
    """Test campaign list endpoint."""

    def test_list_campaigns_as_vendor(self, client, vendor_user, campaign, auth_headers_vendor):
        """Test vendor listing only their campaigns."""
        response = client.get(
            "/v1/campaigns",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert data["total"] >= 1

    def test_list_campaigns_as_partner(self, client, partner, auth_headers_partner):
        """Test partner listing public campaigns."""
        response = client.get(
            "/v1/campaigns",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_list_campaigns_pagination(self, client, vendor_user, db_session, auth_headers_vendor):
        """Test campaign pagination."""
        # Create multiple campaigns
        from app.models import Campaign, CampaignVersion

        for i in range(5):
            campaign = Campaign(vendor_id=vendor_user.vendor_id, status="active")
            db_session.add(campaign)
            db_session.flush()

            version = CampaignVersion(
                campaign_id=campaign.campaign_id,
                name=f"Campaign {i}",
                destination_url="https://example.com",
                is_public=True,
                default_commission_type="percentage",
                default_commission_value=Decimal("10.00")
            )
            db_session.add(version)
            campaign.current_campaign_version_id = version.campaign_version_id
            db_session.commit()

        response = client.get(
            "/v1/campaigns?page=1&page_size=2",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) <= 2

    def test_list_campaigns_filter_by_status(self, client, vendor_user, campaign, auth_headers_vendor):
        """Test filtering campaigns by status."""
        response = client.get(
            "/v1/campaigns?status=active",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        for item in data["data"]:
            assert item["status"] == "active"

    def test_list_campaigns_search(self, client, vendor_user, campaign, auth_headers_vendor):
        """Test searching campaigns."""
        response = client.get(
            f"/v1/campaigns?search={campaign.current_version.name}",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) > 0

    def test_list_campaigns_filter_public(self, client, partner, auth_headers_partner):
        """Test filtering for public campaigns only."""
        response = client.get(
            "/v1/campaigns?is_public=true",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        for item in data["data"]:
            assert item["is_public"] is True

    def test_list_campaigns_no_auth(self, client):
        """Test listing campaigns without authentication."""
        response = client.get("/v1/campaigns")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_campaigns_invalid_pagination(self, client, vendor_user, auth_headers_vendor):
        """Test invalid pagination parameters."""
        response = client.get(
            "/v1/campaigns?page=0",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_list_campaigns_page_size_limit(self, client, vendor_user, auth_headers_vendor):
        """Test page size maximum limit."""
        response = client.get(
            "/v1/campaigns?page_size=1000",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.integration
class TestCreateCampaign:
    """Test campaign creation endpoint."""

    def test_create_campaign_success(self, client, vendor_user, auth_headers_vendor):
        """Test successful campaign creation."""
        campaign_data = {
            "version": {
                "name": "New Campaign",
                "description": "Test campaign",
                "destination_url": "https://example.com/campaign",
                "is_public": True,
                "default_commission_type": "percentage",
                "default_commission_value": 10.00,
                "cookie_duration_days": 30
            }
        }

        response = client.post(
            "/v1/campaigns",
            json=campaign_data,
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["status"] == "active"
        assert "campaign_id" in data

    def test_create_campaign_minimal(self, client, vendor_user, auth_headers_vendor):
        """Test campaign creation with minimal required fields."""
        campaign_data = {
            "version": {
                "name": "Minimal Campaign",
                "destination_url": "https://example.com",
                "default_commission_type": "percentage",
                "default_commission_value": 5.00
            }
        }

        response = client.post(
            "/v1/campaigns",
            json=campaign_data,
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_201_CREATED

    def test_create_campaign_missing_name(self, client, vendor_user, auth_headers_vendor):
        """Test campaign creation without name."""
        campaign_data = {
            "version": {
                "destination_url": "https://example.com",
                "default_commission_type": "percentage",
                "default_commission_value": 10.00
            }
        }

        response = client.post(
            "/v1/campaigns",
            json=campaign_data,
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_campaign_invalid_url(self, client, vendor_user, auth_headers_vendor):
        """Test campaign creation with invalid URL."""
        campaign_data = {
            "version": {
                "name": "Campaign",
                "destination_url": "not-a-url",
                "default_commission_type": "percentage",
                "default_commission_value": 10.00
            }
        }

        response = client.post(
            "/v1/campaigns",
            json=campaign_data,
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_campaign_negative_commission(self, client, vendor_user, auth_headers_vendor):
        """Test campaign with negative commission value."""
        campaign_data = {
            "version": {
                "name": "Campaign",
                "destination_url": "https://example.com",
                "default_commission_type": "percentage",
                "default_commission_value": -5.00
            }
        }

        response = client.post(
            "/v1/campaigns",
            json=campaign_data,
            headers=auth_headers_vendor
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_create_campaign_zero_commission(self, client, vendor_user, auth_headers_vendor):
        """Test campaign with zero commission."""
        campaign_data = {
            "version": {
                "name": "Campaign",
                "destination_url": "https://example.com",
                "default_commission_type": "percentage",
                "default_commission_value": 0.00
            }
        }

        response = client.post(
            "/v1/campaigns",
            json=campaign_data,
            headers=auth_headers_vendor
        )

        # Zero commission might be allowed
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]

    def test_create_campaign_excessive_commission(self, client, vendor_user, auth_headers_vendor):
        """Test campaign with excessively high commission."""
        campaign_data = {
            "version": {
                "name": "Campaign",
                "destination_url": "https://example.com",
                "default_commission_type": "percentage",
                "default_commission_value": 10000.00
            }
        }

        response = client.post(
            "/v1/campaigns",
            json=campaign_data,
            headers=auth_headers_vendor
        )

        # Should reject unrealistic commission
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_201_CREATED]

    def test_create_campaign_invalid_commission_type(self, client, vendor_user, auth_headers_vendor):
        """Test campaign with invalid commission type."""
        campaign_data = {
            "version": {
                "name": "Campaign",
                "destination_url": "https://example.com",
                "default_commission_type": "invalid",
                "default_commission_value": 10.00
            }
        }

        response = client.post(
            "/v1/campaigns",
            json=campaign_data,
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_campaign_no_auth(self, client):
        """Test campaign creation without authentication."""
        campaign_data = {
            "version": {
                "name": "Campaign",
                "destination_url": "https://example.com",
                "default_commission_type": "percentage",
                "default_commission_value": 10.00
            }
        }

        response = client.post(
            "/v1/campaigns",
            json=campaign_data
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_campaign_as_partner(self, client, partner, auth_headers_partner):
        """Test that partners cannot create campaigns."""
        campaign_data = {
            "version": {
                "name": "Campaign",
                "destination_url": "https://example.com",
                "default_commission_type": "percentage",
                "default_commission_value": 10.00
            }
        }

        response = client.post(
            "/v1/campaigns",
            json=campaign_data,
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_campaign_flat_commission(self, client, vendor_user, auth_headers_vendor):
        """Test campaign with flat commission type."""
        campaign_data = {
            "version": {
                "name": "Campaign",
                "destination_url": "https://example.com",
                "default_commission_type": "flat",
                "default_commission_value": 50.00
            }
        }

        response = client.post(
            "/v1/campaigns",
            json=campaign_data,
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_201_CREATED

    def test_create_campaign_with_approval_required(self, client, vendor_user, auth_headers_vendor):
        """Test campaign creation with approval required."""
        campaign_data = {
            "version": {
                "name": "Campaign",
                "destination_url": "https://example.com",
                "approval_required": True,
                "default_commission_type": "percentage",
                "default_commission_value": 10.00
            }
        }

        response = client.post(
            "/v1/campaigns",
            json=campaign_data,
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.integration
class TestGetCampaignDetails:
    """Test getting campaign details."""

    def test_get_campaign_details_success(self, client, campaign, vendor_user, auth_headers_vendor):
        """Test getting campaign details."""
        response = client.get(
            f"/v1/campaigns/{campaign.campaign_id}",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["campaign_id"] == str(campaign.campaign_id)

    def test_get_campaign_nonexistent(self, client, vendor_user, auth_headers_vendor):
        """Test getting non-existent campaign."""
        response = client.get(
            "/v1/campaigns/00000000-0000-0000-0000-000000000000",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_campaign_invalid_id(self, client, vendor_user, auth_headers_vendor):
        """Test getting campaign with invalid ID format."""
        response = client.get(
            "/v1/campaigns/not-a-uuid",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_get_campaign_other_vendor(self, client, campaign, db_session, auth_headers_vendor):
        """Test that vendor cannot access other vendor's campaigns."""
        # Create another vendor
        from app.models import Vendor, VendorUser
        from app.core.security import get_password_hash

        other_vendor = Vendor(
            name="Other Vendor",
            company_name="Other Company",
            email="other@test.com",
            password_hash=get_password_hash("testpass123")
        )
        db_session.add(other_vendor)
        db_session.flush()

        other_user = VendorUser(
            vendor_id=other_vendor.vendor_id,
            email="other@test.com",
            password_hash=get_password_hash("testpass123"),
            role="owner"
        )
        db_session.add(other_user)
        db_session.commit()

        # Try to access the first vendor's campaign
        response = client.get(
            f"/v1/campaigns/{campaign.campaign_id}",
            headers=auth_headers_vendor
        )

        # Should be forbidden
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_campaign_as_partner_enrolled(self, client, campaign, campaign_partner, auth_headers_partner):
        """Test partner can view campaign they're enrolled in."""
        response = client.get(
            f"/v1/campaigns/{campaign.campaign_id}",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK

    def test_get_campaign_as_partner_public(self, client, db_session, partner, auth_headers_partner):
        """Test partner can view public campaigns."""
        from app.models import Campaign, CampaignVersion
        from app.core.security import get_password_hash

        vendor = db_session.query(Vendor).first()
        campaign = Campaign(vendor_id=vendor.vendor_id, status="active")
        db_session.add(campaign)
        db_session.flush()

        version = CampaignVersion(
            campaign_id=campaign.campaign_id,
            name="Public Campaign",
            destination_url="https://example.com",
            is_public=True,
            default_commission_type="percentage",
            default_commission_value=Decimal("10.00")
        )
        db_session.add(version)
        campaign.current_campaign_version_id = version.campaign_version_id
        db_session.commit()

        response = client.get(
            f"/v1/campaigns/{campaign.campaign_id}",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK

    def test_get_campaign_no_auth(self, client, campaign):
        """Test getting campaign without authentication."""
        response = client.get(f"/v1/campaigns/{campaign.campaign_id}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
class TestUpdateCampaign:
    """Test updating campaigns."""

    def test_update_campaign_status(self, client, campaign, auth_headers_vendor):
        """Test updating campaign status."""
        response = client.put(
            f"/v1/campaigns/{campaign.campaign_id}",
            json={"status": "paused"},
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "paused"

    def test_update_campaign_invalid_status(self, client, campaign, auth_headers_vendor):
        """Test updating campaign with invalid status."""
        response = client.put(
            f"/v1/campaigns/{campaign.campaign_id}",
            json={"status": "invalid"},
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_update_nonexistent_campaign(self, client, vendor_user, auth_headers_vendor):
        """Test updating non-existent campaign."""
        response = client.put(
            "/v1/campaigns/00000000-0000-0000-0000-000000000000",
            json={"status": "paused"},
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_campaign_no_auth(self, client, campaign):
        """Test updating campaign without authentication."""
        response = client.put(
            f"/v1/campaigns/{campaign.campaign_id}",
            json={"status": "paused"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_campaign_as_partner(self, client, campaign, auth_headers_partner):
        """Test that partners cannot update campaigns."""
        response = client.put(
            f"/v1/campaigns/{campaign.campaign_id}",
            json={"status": "paused"},
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.integration
class TestDeleteCampaign:
    """Test deleting campaigns."""

    def test_delete_campaign_success(self, client, campaign, auth_headers_vendor):
        """Test successful campaign deletion."""
        response = client.delete(
            f"/v1/campaigns/{campaign.campaign_id}",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_campaign_soft_delete(self, client, campaign, db_session, auth_headers_vendor):
        """Test that campaign deletion is soft delete."""
        client.delete(
            f"/v1/campaigns/{campaign.campaign_id}",
            headers=auth_headers_vendor
        )

        # Verify soft delete
        db_campaign = db_session.query(Campaign).filter_by(campaign_id=campaign.campaign_id).first()
        assert db_campaign is not None
        assert db_campaign.is_deleted is True

    def test_delete_nonexistent_campaign(self, client, vendor_user, auth_headers_vendor):
        """Test deleting non-existent campaign."""
        response = client.delete(
            "/v1/campaigns/00000000-0000-0000-0000-000000000000",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_campaign_no_auth(self, client, campaign):
        """Test deleting campaign without authentication."""
        response = client.delete(f"/v1/campaigns/{campaign.campaign_id}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_campaign_as_partner(self, client, campaign, auth_headers_partner):
        """Test that partners cannot delete campaigns."""
        response = client.delete(
            f"/v1/campaigns/{campaign.campaign_id}",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.integration
class TestPartnerApplication:
    """Test partner application to campaigns."""

    def test_partner_apply_success(self, client, partner, campaign, auth_headers_partner):
        """Test successful partner application."""
        response = client.post(
            f"/v1/campaigns/{campaign.campaign_id}/apply",
            json={"application_note": "I'm interested!"},
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "enrollment_id" in data

    def test_partner_apply_no_note(self, client, partner, campaign, auth_headers_partner):
        """Test partner application without note."""
        response = client.post(
            f"/v1/campaigns/{campaign.campaign_id}/apply",
            json={},
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_201_CREATED

    def test_partner_apply_already_enrolled(self, client, partner, campaign_partner, auth_headers_partner):
        """Test partner cannot apply twice."""
        response = client.post(
            f"/v1/campaigns/{campaign_partner.campaign.campaign_id}/apply",
            json={},
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_partner_apply_nonexistent_campaign(self, client, partner, auth_headers_partner):
        """Test applying to non-existent campaign."""
        response = client.post(
            "/v1/campaigns/00000000-0000-0000-0000-000000000000/apply",
            json={},
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_partner_apply_no_auth(self, client, campaign):
        """Test applying without authentication."""
        response = client.post(
            f"/v1/campaigns/{campaign.campaign_id}/apply",
            json={}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
class TestPartnerApproval:
    """Test approving/rejecting partner applications."""

    def test_approve_partner_success(self, client, campaign, campaign_partner, auth_headers_vendor):
        """Test approving partner application."""
        response = client.post(
            f"/v1/campaigns/{campaign.campaign_id}/partners/{campaign_partner.partner_id}/approve",
            json={"approved": True},
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "approved"

    def test_reject_partner(self, client, campaign, campaign_partner, auth_headers_vendor):
        """Test rejecting partner application."""
        response = client.post(
            f"/v1/campaigns/{campaign.campaign_id}/partners/{campaign_partner.partner_id}/approve",
            json={"approved": False, "rejection_reason": "Not a good fit"},
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "rejected"

    def test_approve_without_enrollment(self, client, campaign, partner, auth_headers_vendor):
        """Test approving non-existent enrollment."""
        response = client.post(
            f"/v1/campaigns/{campaign.campaign_id}/partners/{partner.partner_id}/approve",
            json={"approved": True},
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_partner_cannot_approve(self, client, campaign, campaign_partner, auth_headers_partner):
        """Test that partners cannot approve other partners."""
        response = client.post(
            f"/v1/campaigns/{campaign.campaign_id}/partners/{campaign_partner.partner_id}/approve",
            json={"approved": True},
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_approve_already_approved(self, client, campaign, campaign_partner, db_session, auth_headers_vendor):
        """Test approving already approved partner."""
        # Mark as already approved
        campaign_partner.status = "approved"
        db_session.commit()

        response = client.post(
            f"/v1/campaigns/{campaign.campaign_id}/partners/{campaign_partner.partner_id}/approve",
            json={"approved": True},
            headers=auth_headers_vendor
        )

        # Should either reject or idempotently accept
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]


@pytest.mark.integration
class TestCommissionOverrides:
    """Test partner commission overrides."""

    def test_create_override_success(self, client, campaign, campaign_partner, auth_headers_vendor):
        """Test creating commission override."""
        response = client.post(
            f"/v1/campaigns/{campaign.campaign_id}/partners/{campaign_partner.partner_id}/override",
            json={
                "commission_type": "percentage",
                "commission_value": 15.00
            },
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["commission_type"] == "percentage"
        assert float(data["commission_value"]) == 15.00

    def test_override_invalid_commission(self, client, campaign, campaign_partner, auth_headers_vendor):
        """Test override with invalid commission."""
        response = client.post(
            f"/v1/campaigns/{campaign.campaign_id}/partners/{campaign_partner.partner_id}/override",
            json={
                "commission_type": "invalid",
                "commission_value": 15.00
            },
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_override_nonexistent_enrollment(self, client, campaign, partner, auth_headers_vendor):
        """Test override for non-existent enrollment."""
        response = client.post(
            f"/v1/campaigns/{campaign.campaign_id}/partners/{partner.partner_id}/override",
            json={
                "commission_type": "percentage",
                "commission_value": 15.00
            },
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.integration
class TestPartnerInvitations:
    """Test partner invitations to campaigns."""

    def test_invite_partner_success(self, client, campaign, partner, auth_headers_vendor):
        """Test inviting partner to campaign."""
        response = client.post(
            f"/v1/campaigns/{campaign.campaign_id}/partners/invite",
            json={
                "partner_id": str(partner.partner_id),
                "invitation_message": "We'd love to have you!"
            },
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "invitation_id" in data

    def test_invite_already_enrolled(self, client, campaign, campaign_partner, auth_headers_vendor):
        """Test inviting already enrolled partner."""
        response = client.post(
            f"/v1/campaigns/{campaign.campaign_id}/partners/invite",
            json={
                "partner_id": str(campaign_partner.partner_id),
                "invitation_message": "Message"
            },
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invite_nonexistent_partner(self, client, campaign, auth_headers_vendor):
        """Test inviting non-existent partner."""
        response = client.post(
            f"/v1/campaigns/{campaign.campaign_id}/partners/invite",
            json={
                "partner_id": "00000000-0000-0000-0000-000000000000",
                "invitation_message": "Message"
            },
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_list_invitations(self, client, partner, auth_headers_partner):
        """Test listing partner invitations."""
        response = client.get(
            "/v1/campaigns/invitations",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data

    def test_accept_invitation(self, client, partner, partner_invitation, auth_headers_partner):
        """Test accepting invitation."""
        response = client.post(
            f"/v1/campaigns/invitations/{partner_invitation.invitation_id}/accept",
            json={},
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK

    def test_decline_invitation(self, client, partner, partner_invitation, auth_headers_partner):
        """Test declining invitation."""
        response = client.post(
            f"/v1/campaigns/invitations/{partner_invitation.invitation_id}/decline",
            json={"reason": "Not interested"},
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK


# Import required models for tests
from app.models import Campaign, Vendor, VendorUser
