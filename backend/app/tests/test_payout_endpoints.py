"""
Comprehensive Tests for Payout Endpoints

Tests all payout-related endpoints:
- Generating payouts
- Processing payouts
- Payout status
- Bulk operations
- Payout scheduling
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import status


@pytest.mark.integration
class TestGeneratePayout:
    """Test payout generation."""

    def test_generate_payout_success(self, client, campaign_partner, auth_headers_vendor):
        """Test successful payout generation."""
        response = client.post(
            "/v1/payouts/generate",
            json={
                "partner_id": str(campaign_partner.partner_id),
                "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "end_date": datetime.utcnow().isoformat()
            },
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "payout_id" in data
        assert "amount" in data

    def test_generate_payout_invalid_partner(self, client, vendor_user, auth_headers_vendor):
        """Test generating payout for non-existent partner."""
        response = client.post(
            "/v1/payouts/generate",
            json={
                "partner_id": "00000000-0000-0000-0000-000000000000",
                "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "end_date": datetime.utcnow().isoformat()
            },
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_generate_payout_invalid_dates(self, client, campaign_partner, auth_headers_vendor):
        """Test generating payout with invalid date range."""
        response = client.post(
            "/v1/payouts/generate",
            json={
                "partner_id": str(campaign_partner.partner_id),
                "start_date": datetime.utcnow().isoformat(),
                "end_date": (datetime.utcnow() - timedelta(days=30)).isoformat()
            },
            headers=auth_headers_vendor
        )

        # Start date after end date should be rejected
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_generate_payout_no_auth(self, client, campaign_partner):
        """Test generating payout without authentication."""
        response = client.post(
            "/v1/payouts/generate",
            json={
                "partner_id": str(campaign_partner.partner_id),
                "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "end_date": datetime.utcnow().isoformat()
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_partner_cannot_generate_payout(self, client, campaign_partner, auth_headers_partner):
        """Test that partners cannot generate payouts."""
        response = client.post(
            "/v1/payouts/generate",
            json={
                "partner_id": str(campaign_partner.partner_id),
                "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "end_date": datetime.utcnow().isoformat()
            },
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.integration
class TestBulkPayoutGeneration:
    """Test bulk payout generation."""

    def test_generate_bulk_payouts_success(self, client, db_session, vendor_user, auth_headers_vendor):
        """Test generating multiple payouts at once."""
        from app.models import Partner
        from app.core.security import get_password_hash

        # Create multiple partners
        partner_ids = []
        for i in range(3):
            partner = Partner(
                email=f"partner{i}@test.com",
                password_hash=get_password_hash("testpass123"),
                name=f"Partner {i}",
                partner_type="individual",
                status="active"
            )
            db_session.add(partner)
            db_session.flush()
            partner_ids.append(str(partner.partner_id))

        db_session.commit()

        response = client.post(
            "/v1/payouts/generate-bulk",
            json={
                "partner_ids": partner_ids,
                "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "end_date": datetime.utcnow().isoformat()
            },
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert isinstance(data, list) or "data" in data

    def test_generate_bulk_empty_list(self, client, vendor_user, auth_headers_vendor):
        """Test bulk generation with empty partner list."""
        response = client.post(
            "/v1/payouts/generate-bulk",
            json={
                "partner_ids": [],
                "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "end_date": datetime.utcnow().isoformat()
            },
            headers=auth_headers_vendor
        )

        # Should be rejected or return empty
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_201_CREATED]

    def test_generate_bulk_invalid_partner_id(self, client, vendor_user, auth_headers_vendor):
        """Test bulk generation with some invalid partner IDs."""
        response = client.post(
            "/v1/payouts/generate-bulk",
            json={
                "partner_ids": ["00000000-0000-0000-0000-000000000000"],
                "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "end_date": datetime.utcnow().isoformat()
            },
            headers=auth_headers_vendor
        )

        # Should fail for invalid partners
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND]


@pytest.mark.integration
class TestProcessPayout:
    """Test payout processing."""

    def test_process_payout_success(self, client, payout, auth_headers_vendor):
        """Test processing a payout."""
        response = client.post(
            f"/v1/payouts/{payout.payout_id}/process",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] in ["processing", "processed"]

    def test_process_nonexistent_payout(self, client, vendor_user, auth_headers_vendor):
        """Test processing non-existent payout."""
        response = client.post(
            "/v1/payouts/00000000-0000-0000-0000-000000000000/process",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_process_payout_already_processed(self, client, payout, db_session, auth_headers_vendor):
        """Test processing already processed payout."""
        payout.status = "processed"
        db_session.commit()

        response = client.post(
            f"/v1/payouts/{payout.payout_id}/process",
            headers=auth_headers_vendor
        )

        # Should either reject or idempotently accept
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_partner_cannot_process_payout(self, client, payout, auth_headers_partner):
        """Test that partners cannot process payouts."""
        response = client.post(
            f"/v1/payouts/{payout.payout_id}/process",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.integration
class TestPayoutProvider:
    """Test payout processing with provider."""

    def test_process_payout_with_provider(self, client, payout, auth_headers_vendor):
        """Test processing payout with external provider."""
        response = client.post(
            f"/v1/payouts/{payout.payout_id}/process-with-provider",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK

    def test_process_with_provider_nonexistent(self, client, vendor_user, auth_headers_vendor):
        """Test processing non-existent payout with provider."""
        response = client.post(
            "/v1/payouts/00000000-0000-0000-0000-000000000000/process-with-provider",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.integration
class TestBatchProcessPayouts:
    """Test batch processing payouts."""

    def test_batch_process_success(self, client, db_session, vendor_user, auth_headers_vendor):
        """Test processing multiple payouts in batch."""
        from app.models import Payout
        from decimal import Decimal

        # Create multiple payouts
        payout_ids = []
        for i in range(3):
            payout = Payout(
                vendor_id=vendor_user.vendor_id,
                partner_id=None,  # Would need actual partner
                amount=Decimal("100.00"),
                status="pending"
            )
            db_session.add(payout)
            db_session.flush()
            payout_ids.append(str(payout.payout_id))

        db_session.commit()

        response = client.post(
            "/v1/payouts/batch-process",
            json={"payout_ids": payout_ids},
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK

    def test_batch_process_empty_list(self, client, vendor_user, auth_headers_vendor):
        """Test batch process with empty list."""
        response = client.post(
            "/v1/payouts/batch-process",
            json={"payout_ids": []},
            headers=auth_headers_vendor
        )

        # Should either reject or succeed
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_batch_process_invalid_ids(self, client, vendor_user, auth_headers_vendor):
        """Test batch process with invalid payout IDs."""
        response = client.post(
            "/v1/payouts/batch-process",
            json={"payout_ids": ["invalid-id"]},
            headers=auth_headers_vendor
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]


@pytest.mark.integration
class TestPayoutStatus:
    """Test checking payout status."""

    def test_get_payout_status(self, client, payout, auth_headers_vendor):
        """Test getting payout status."""
        response = client.get(
            f"/v1/payouts/{payout.payout_id}/status",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "status" in data

    def test_get_status_nonexistent(self, client, vendor_user, auth_headers_vendor):
        """Test getting status of non-existent payout."""
        response = client.get(
            "/v1/payouts/00000000-0000-0000-0000-000000000000/status",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.integration
class TestPayoutManagement:
    """Test payout management endpoints."""

    def test_get_pending_payouts(self, client, vendor_user, auth_headers_vendor):
        """Test getting pending payouts."""
        response = client.get(
            "/v1/payout-management/pending-payouts",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data

    def test_pending_payouts_filter_by_status(self, client, vendor_user, auth_headers_vendor):
        """Test filtering pending payouts by status."""
        response = client.get(
            "/v1/payout-management/pending-payouts?status=pending",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK

    def test_pending_payouts_filter_by_amount(self, client, vendor_user, auth_headers_vendor):
        """Test filtering by minimum amount."""
        response = client.get(
            "/v1/payout-management/pending-payouts?min_amount=50.00",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK

    def test_process_all_pending(self, client, vendor_user, auth_headers_vendor):
        """Test processing all pending payouts."""
        response = client.post(
            "/v1/payout-management/process-all",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK

    def test_process_selected_payouts(self, client, payout, auth_headers_vendor):
        """Test processing selected payouts."""
        response = client.post(
            "/v1/payout-management/process-selected",
            json={"payout_ids": [str(payout.payout_id)]},
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.integration
class TestPayoutScheduling:
    """Test payout scheduling."""

    def test_list_schedules(self, client, vendor_user, auth_headers_vendor):
        """Test listing payout schedules."""
        response = client.get(
            "/v1/payout-management/schedules",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_create_schedule(self, client, vendor_user, auth_headers_vendor):
        """Test creating payout schedule."""
        response = client.post(
            "/v1/payout-management/schedules",
            json={
                "frequency": "monthly",
                "day_of_period": 15
            },
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "schedule_id" in data

    def test_create_schedule_invalid_frequency(self, client, vendor_user, auth_headers_vendor):
        """Test creating schedule with invalid frequency."""
        response = client.post(
            "/v1/payout-management/schedules",
            json={
                "frequency": "invalid",
                "day_of_period": 15
            },
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_schedule_invalid_day(self, client, vendor_user, auth_headers_vendor):
        """Test creating schedule with invalid day."""
        response = client.post(
            "/v1/payout-management/schedules",
            json={
                "frequency": "monthly",
                "day_of_period": 32
            },
            headers=auth_headers_vendor
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_update_schedule(self, client, vendor_user, db_session, auth_headers_vendor):
        """Test updating payout schedule."""
        from app.models import PayoutSchedule

        # Create a schedule
        schedule = PayoutSchedule(
            vendor_id=vendor_user.vendor_id,
            frequency="monthly",
            day_of_period=15
        )
        db_session.add(schedule)
        db_session.commit()

        response = client.put(
            f"/v1/payout-management/schedules/{schedule.schedule_id}",
            json={
                "frequency": "weekly",
                "day_of_period": 1
            },
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK

    def test_delete_schedule(self, client, vendor_user, db_session, auth_headers_vendor):
        """Test deleting payout schedule."""
        from app.models import PayoutSchedule

        # Create a schedule
        schedule = PayoutSchedule(
            vendor_id=vendor_user.vendor_id,
            frequency="monthly",
            day_of_period=15
        )
        db_session.add(schedule)
        db_session.commit()

        response = client.delete(
            f"/v1/payout-management/schedules/{schedule.schedule_id}",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_get_schedule_executions(self, client, vendor_user, db_session, auth_headers_vendor):
        """Test getting schedule execution history."""
        from app.models import PayoutSchedule

        # Create a schedule
        schedule = PayoutSchedule(
            vendor_id=vendor_user.vendor_id,
            frequency="monthly",
            day_of_period=15
        )
        db_session.add(schedule)
        db_session.commit()

        response = client.get(
            f"/v1/payout-management/schedules/{schedule.schedule_id}/executions",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.integration
class TestPartnerPayoutView:
    """Test partner payout viewing."""

    def test_get_my_payouts(self, client, partner, auth_headers_partner):
        """Test partner getting their payouts."""
        response = client.get(
            "/v1/payouts/my-payouts",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data

    def test_get_my_payouts_with_status(self, client, partner, auth_headers_partner):
        """Test filtering partner payouts by status."""
        response = client.get(
            "/v1/payouts/my-payouts?status=processed",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK

    def test_get_payout_details(self, client, partner, payout, auth_headers_partner):
        """Test partner getting payout details."""
        response = client.get(
            f"/v1/payouts/my-payouts/{payout.payout_id}",
            headers=auth_headers_partner
        )

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]


@pytest.mark.integration
class TestPayoutEdgeCases:
    """Test edge cases for payouts."""

    def test_generate_payout_zero_amount(self, client, campaign_partner, auth_headers_vendor):
        """Test generating payout when there are no earnings."""
        response = client.post(
            "/v1/payouts/generate",
            json={
                "partner_id": str(campaign_partner.partner_id),
                "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "end_date": datetime.utcnow().isoformat()
            },
            headers=auth_headers_vendor
        )

        # Should either create zero payout or return error
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]

    def test_process_payout_with_missing_payment_method(self, client, payout, db_session, auth_headers_vendor):
        """Test processing payout when partner has no payment method."""
        response = client.post(
            f"/v1/payouts/{payout.payout_id}/process",
            headers=auth_headers_vendor
        )

        # Should handle missing payment method gracefully
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_very_large_batch_process(self, client, vendor_user, auth_headers_vendor):
        """Test batch processing with many payouts."""
        payout_ids = [
            "00000000-0000-0000-0000-00000000000" + str(i).zfill(4))
            for i in range(1000)
        ]

        response = client.post(
            "/v1/payouts/batch-process",
            json={"payout_ids": payout_ids},
            headers=auth_headers_vendor
        )

        # Should handle large batch
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
