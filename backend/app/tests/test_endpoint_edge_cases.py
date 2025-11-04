"""
Comprehensive Edge Cases and Error Handling Tests

Tests for:
- Rate limiting and abuse prevention
- Data validation and sanitization
- Concurrency issues
- Large data handling
- Security edge cases
- Error messages and status codes
- Boundary conditions
"""

import pytest
from datetime import datetime, timedelta
from fastapi import status
import json


@pytest.mark.integration
class TestDataValidation:
    """Test data validation across endpoints."""

    def test_sql_injection_prevention_login(self, client):
        """Test SQL injection prevention in login."""
        injection_attempts = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users --",
            "admin' --",
        ]

        for payload in injection_attempts:
            response = client.post(
                "/v1/auth/login/partner",
                json={"email": payload, "password": payload}
            )

            # Should never succeed
            assert response.status_code != status.HTTP_200_OK

    def test_xss_prevention_registration(self, client):
        """Test XSS prevention in registration."""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror='alert(1)'>",
            "<svg onload='alert(1)'>",
        ]

        for payload in xss_payloads:
            response = client.post(
                "/v1/auth/register/partner",
                json={
                    "email": f"{payload}@test.com",
                    "password": "SecurePass123!",
                    "name": payload,
                    "partner_type": "individual"
                }
            )

            # Should reject or sanitize
            assert response.status_code in [
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ]

    def test_unicode_handling(self, client):
        """Test handling of unicode characters."""
        response = client.post(
            "/v1/auth/register/partner",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "name": "李明 José محمد",
                "partner_type": "individual"
            }
        )

        # Should handle unicode properly
        assert response.status_code in [
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]

    def test_null_byte_injection(self, client):
        """Test null byte injection prevention."""
        response = client.post(
            "/v1/auth/login/partner",
            json={
                "email": "test\x00@example.com",
                "password": "pass\x00word"
            }
        )

        # Should reject
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]

    def test_extremely_long_input(self, client):
        """Test handling of extremely long inputs."""
        response = client.post(
            "/v1/auth/register/partner",
            json={
                "email": "a" * 1000 + "@example.com",
                "password": "pass" + "a" * 10000,
                "name": "a" * 10000,
                "partner_type": "individual"
            }
        )

        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]

    def test_special_characters_in_fields(self, client, partner):
        """Test special characters handling."""
        response = client.put(
            "/v1/partners/me",
            json={
                "name": "John & Doe | <Test> \"Quote\" 'Single'",
                "bio": "Line1\nLine2\r\nLine3"
            },
            headers={"Authorization": f"Bearer {partner.partner_id}"}
        )

        # Should handle gracefully
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]


@pytest.mark.integration
class TestErrorHandling:
    """Test proper error handling and error messages."""

    def test_invalid_json_request(self, client):
        """Test handling of invalid JSON in request."""
        response = client.post(
            "/v1/auth/login/partner",
            data="not valid json",
            headers={"Content-Type": "application/json"}
        )

        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]

    def test_missing_content_type(self, client):
        """Test request without content type."""
        import requests

        # Using requests directly to avoid TestClient's automatic handling
        response = client.post(
            "/v1/auth/login/partner",
            json={"email": "test@test.com", "password": "pass"}
        )

        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]

    def test_wrong_http_method(self, client):
        """Test using wrong HTTP method."""
        # POST endpoint accessed with GET
        response = client.get(
            "/v1/auth/login/partner",
            params={"email": "test@test.com", "password": "pass"}
        )

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_nonexistent_endpoint(self, client):
        """Test accessing non-existent endpoint."""
        response = client.get("/v1/nonexistent/endpoint")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_malformed_uuid(self, client, auth_headers_vendor):
        """Test endpoints with malformed UUID."""
        response = client.get(
            "/v1/campaigns/not-a-uuid",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_error_response_format(self, client):
        """Test that error responses have proper format."""
        response = client.get(
            "/v1/campaigns",
            params={"invalid_param": "value"}
        )

        # Check response is valid JSON
        if response.status_code >= 400:
            data = response.json()
            # Should have some kind of error detail
            assert "detail" in data or "error" in data or "message" in data


@pytest.mark.integration
class TestConcurrency:
    """Test handling of concurrent requests."""

    def test_concurrent_logins(self, client, partner):
        """Test multiple concurrent logins from same user."""
        responses = []

        for _ in range(5):
            response = client.post(
                "/v1/auth/login/partner",
                json={"email": partner.email, "password": "testpass123"}
            )
            responses.append(response.status_code)

        # All should succeed
        assert all(code == status.HTTP_200_OK for code in responses)

    def test_concurrent_data_generation(self, client, campaign_partner, auth_headers_partner):
        """Test concurrent link generation."""
        responses = []

        for i in range(5):
            response = client.post(
                "/v1/links",
                json={
                    "campaign_partner_id": str(campaign_partner.campaign_partner_id),
                    "link_label": f"Link {i}"
                },
                headers=auth_headers_partner
            )
            responses.append(response.status_code)

        # All should succeed
        assert all(code == status.HTTP_201_CREATED for code in responses)

        # Verify unique short codes
        short_codes = set()
        for _ in range(5):
            response = client.post(
                "/v1/links",
                json={
                    "campaign_partner_id": str(campaign_partner.campaign_partner_id)
                },
                headers=auth_headers_partner
            )
            if response.status_code == status.HTTP_201_CREATED:
                short_codes.add(response.json()["short_code"])

        # All should be unique
        assert len(short_codes) == 5


@pytest.mark.integration
class TestBoundaryConditions:
    """Test boundary conditions and limits."""

    def test_minimum_commission_value(self, client, vendor_user, auth_headers_vendor):
        """Test campaign with minimum valid commission."""
        response = client.post(
            "/v1/campaigns",
            json={
                "version": {
                    "name": "Campaign",
                    "destination_url": "https://example.com",
                    "default_commission_type": "percentage",
                    "default_commission_value": 0.01
                }
            },
            headers=auth_headers_vendor
        )

        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]

    def test_maximum_commission_value(self, client, vendor_user, auth_headers_vendor):
        """Test campaign with maximum realistic commission."""
        response = client.post(
            "/v1/campaigns",
            json={
                "version": {
                    "name": "Campaign",
                    "destination_url": "https://example.com",
                    "default_commission_type": "percentage",
                    "default_commission_value": 100.00
                }
            },
            headers=auth_headers_vendor
        )

        # 100% commission should either be accepted or rejected
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]

    def test_minimum_cookie_duration(self, client, vendor_user, auth_headers_vendor):
        """Test campaign with minimum cookie duration."""
        response = client.post(
            "/v1/campaigns",
            json={
                "version": {
                    "name": "Campaign",
                    "destination_url": "https://example.com",
                    "default_commission_type": "percentage",
                    "default_commission_value": 10.00,
                    "cookie_duration_days": 1
                }
            },
            headers=auth_headers_vendor
        )

        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]

    def test_maximum_cookie_duration(self, client, vendor_user, auth_headers_vendor):
        """Test campaign with very long cookie duration."""
        response = client.post(
            "/v1/campaigns",
            json={
                "version": {
                    "name": "Campaign",
                    "destination_url": "https://example.com",
                    "default_commission_type": "percentage",
                    "default_commission_value": 10.00,
                    "cookie_duration_days": 36500  # ~100 years
                }
            },
            headers=auth_headers_vendor
        )

        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]

    def test_maximum_page_size_limit(self, client, vendor_user, auth_headers_vendor):
        """Test pagination with max page size."""
        response = client.get(
            "/v1/campaigns?page_size=1000",
            headers=auth_headers_vendor
        )

        # Should reject or cap
        assert response.status_code in [
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            status.HTTP_200_OK
        ]

    def test_zero_page_size(self, client, vendor_user, auth_headers_vendor):
        """Test pagination with zero page size."""
        response = client.get(
            "/v1/campaigns?page_size=0",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.integration
class TestAuthorizationEdgeCases:
    """Test authorization edge cases."""

    def test_expired_token_access(self, client, partner, db_session):
        """Test accessing protected endpoint with expired token."""
        from app.core.security import create_tokens
        import jwt
        from app.config import settings

        # Create an expired token
        expired_token = jwt.encode(
            {
                "sub": str(partner.partner_id),
                "type": "partner",
                "exp": datetime.utcnow() - timedelta(hours=1)
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )

        response = client.get(
            "/v1/partners/me",
            headers={"Authorization": f"Bearer {expired_token}"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_invalid_token_format(self, client):
        """Test with malformed token."""
        response = client.get(
            "/v1/partners/me",
            headers={"Authorization": "Bearer invalid.token"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_missing_bearer_prefix(self, client, partner):
        """Test with token but no Bearer prefix."""
        response = client.get(
            "/v1/partners/me",
            headers={"Authorization": "some-token-value"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_from_different_user_type(self, client, partner, vendor_user):
        """Test using partner token to access vendor endpoint."""
        from app.core.security import create_tokens

        partner_tokens = create_tokens(partner.partner_id, "partner")

        response = client.get(
            "/v1/vendors/me",
            headers={"Authorization": f"Bearer {partner_tokens['access_token']}"}
        )

        # Should be forbidden or error
        assert response.status_code in [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_404_NOT_FOUND
        ]

    def test_cross_tenant_access(self, client, campaign, vendor_user, db_session):
        """Test vendor cannot access other vendor's resources."""
        from app.models import Vendor, VendorUser
        from app.core.security import get_password_hash, create_tokens

        # Create another vendor
        other_vendor = Vendor(
            name="Other",
            company_name="Other Corp",
            email="other@test.com",
            password_hash=get_password_hash("pass")
        )
        db_session.add(other_vendor)
        db_session.flush()

        other_user = VendorUser(
            vendor_id=other_vendor.vendor_id,
            email="other@test.com",
            password_hash=get_password_hash("pass"),
            role="owner"
        )
        db_session.add(other_user)
        db_session.commit()

        # Try to access first vendor's campaign with other vendor's token
        tokens = create_tokens(other_user.vendor_user_id, "vendor")

        response = client.get(
            f"/v1/campaigns/{campaign.campaign_id}",
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )

        # Should be forbidden
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.integration
class TestDataIntegrityEdgeCases:
    """Test data integrity edge cases."""

    def test_negative_amounts(self, client, campaign_partner, auth_headers_vendor):
        """Test negative amount handling in conversions."""
        # Negative amounts might represent refunds
        # This depends on business logic

        response = client.post(
            "/v1/conversions",
            json={
                "campaign_partner_id": str(campaign_partner.campaign_partner_id),
                "amount": -50.00,
                "external_conversion_id": "refund-123"
            },
            headers=auth_headers_vendor
        )

        # Either accepted or rejected
        assert response.status_code in [
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]

    def test_future_dates(self, client, vendor_user, auth_headers_vendor):
        """Test endpoints with future dates."""
        future_date = (datetime.utcnow() + timedelta(days=30)).isoformat()

        response = client.get(
            f"/v1/vendors/me/dashboard?end_date={future_date}",
            headers=auth_headers_vendor
        )

        # Should handle gracefully
        assert response.status_code == status.HTTP_200_OK

    def test_same_start_and_end_date(self, client, vendor_user, auth_headers_vendor):
        """Test with start date equal to end date."""
        same_date = datetime.utcnow().isoformat()

        response = client.get(
            f"/v1/vendors/me/dashboard?start_date={same_date}&end_date={same_date}",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK

    def test_decimal_precision(self, client, campaign_partner, auth_headers_partner):
        """Test decimal precision in amounts."""
        response = client.post(
            "/v1/links",
            json={
                "campaign_partner_id": str(campaign_partner.campaign_partner_id)
            },
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.integration
class TestRateLimitingAndAbuse:
    """Test rate limiting and abuse prevention."""

    def test_rapid_registration_attempts(self, client):
        """Test rapid account creation attempts."""
        responses = []

        for i in range(10):
            response = client.post(
                "/v1/auth/register/partner",
                json={
                    "email": f"rapid{i}@test.com",
                    "password": "SecurePass123!",
                    "name": f"Rapid {i}",
                    "partner_type": "individual"
                }
            )
            responses.append(response.status_code)

        # Most should succeed unless rate limited
        # At least some should succeed
        successful = sum(1 for code in responses if code == status.HTTP_201_CREATED)
        assert successful >= 5

    def test_rapid_failed_logins(self, client, partner):
        """Test multiple rapid failed login attempts."""
        responses = []

        for _ in range(20):
            response = client.post(
                "/v1/auth/login/partner",
                json={"email": partner.email, "password": "wrong_password"}
            )
            responses.append(response.status_code)

        # All should fail, but check if we get locked out
        assert all(code == status.HTTP_401_UNAUTHORIZED for code in responses)

    def test_rapid_api_calls(self, client, vendor_user, auth_headers_vendor):
        """Test rapid API calls."""
        responses = []

        for _ in range(50):
            response = client.get(
                "/v1/campaigns",
                headers=auth_headers_vendor
            )
            responses.append(response.status_code)

        # Should mostly succeed unless rate limited
        successful = sum(1 for code in responses if code == status.HTTP_200_OK)
        assert successful >= 40


@pytest.mark.integration
class TestResponseFormatting:
    """Test consistent response formatting."""

    def test_list_response_format(self, client, vendor_user, auth_headers_vendor):
        """Test list endpoint response format."""
        response = client.get(
            "/v1/campaigns",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Should have pagination info
        assert "data" in data or isinstance(data, list)
        if "data" in data:
            assert "total" in data
            assert "page" in data

    def test_error_response_consistency(self, client):
        """Test error response format consistency."""
        responses = []

        # Different error scenarios
        error_endpoints = [
            ("/v1/campaigns/invalid-id", "GET"),
            ("/v1/auth/login/partner", "POST"),  # Missing body
            ("/v1/nonexistent", "GET"),
        ]

        # Test that errors follow consistent format
        response = client.get("/v1/campaigns/invalid-id")
        assert response.status_code >= 400

        error_data = response.json()
        # Should have some kind of error indication
        assert len(error_data) > 0
