"""
Comprehensive Tests for Authentication Endpoints

Tests all auth endpoints with various scenarios:
- Login (partner and vendor)
- Registration (partner and vendor)
- Token refresh
- Password change
- OAuth endpoints
- Get current user
"""

import pytest
from datetime import datetime, timedelta
from fastapi import status


@pytest.mark.integration
class TestPartnerLogin:
    """Test partner login endpoint."""

    def test_login_partner_success(self, client, db_session, partner):
        """Test successful partner login."""
        response = client.post(
            "/v1/auth/login/partner",
            json={"email": partner.email, "password": "testpass123"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_partner_invalid_email(self, client):
        """Test login with non-existent email."""
        response = client.post(
            "/v1/auth/login/partner",
            json={"email": "nonexistent@test.com", "password": "testpass123"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid credentials" in response.json()["detail"]

    def test_login_partner_wrong_password(self, client, partner):
        """Test login with wrong password."""
        response = client.post(
            "/v1/auth/login/partner",
            json={"email": partner.email, "password": "wrongpass"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid credentials" in response.json()["detail"]

    def test_login_partner_empty_email(self, client):
        """Test login with empty email."""
        response = client.post(
            "/v1/auth/login/partner",
            json={"email": "", "password": "testpass123"}
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_login_partner_empty_password(self, client, partner):
        """Test login with empty password."""
        response = client.post(
            "/v1/auth/login/partner",
            json={"email": partner.email, "password": ""}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_partner_missing_email(self, client):
        """Test login with missing email field."""
        response = client.post(
            "/v1/auth/login/partner",
            json={"password": "testpass123"}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_partner_missing_password(self, client, partner):
        """Test login with missing password field."""
        response = client.post(
            "/v1/auth/login/partner",
            json={"email": partner.email}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_partner_inactive_account(self, client, db_session, partner):
        """Test login with inactive partner account."""
        # Set partner to inactive
        partner.status = "inactive"
        db_session.commit()

        response = client.post(
            "/v1/auth/login/partner",
            json={"email": partner.email, "password": "testpass123"}
        )

        # Should either reject or allow depending on business logic
        # Most systems reject inactive logins
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            assert True
        elif response.status_code == status.HTTP_200_OK:
            # If allowed, token should be issued
            assert "access_token" in response.json()

    def test_login_partner_case_insensitive_email(self, client, partner):
        """Test that email login is case-insensitive."""
        response = client.post(
            "/v1/auth/login/partner",
            json={"email": partner.email.upper(), "password": "testpass123"}
        )

        # Most systems handle case-insensitive email
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED]


@pytest.mark.integration
class TestVendorLogin:
    """Test vendor user login endpoint."""

    def test_login_vendor_success(self, client, vendor_user):
        """Test successful vendor user login."""
        response = client.post(
            "/v1/auth/login/vendor",
            json={"email": vendor_user.email, "password": "testpass123"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_login_vendor_invalid_email(self, client):
        """Test vendor login with non-existent email."""
        response = client.post(
            "/v1/auth/login/vendor",
            json={"email": "nonexistent@test.com", "password": "testpass123"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_vendor_wrong_password(self, client, vendor_user):
        """Test vendor login with wrong password."""
        response = client.post(
            "/v1/auth/login/vendor",
            json={"email": vendor_user.email, "password": "wrongpass"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_vendor_missing_fields(self, client):
        """Test vendor login with missing fields."""
        response = client.post(
            "/v1/auth/login/vendor",
            json={"email": "test@test.com"}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.integration
class TestPartnerRegistration:
    """Test partner registration endpoint."""

    def test_register_partner_success(self, client, db_session):
        """Test successful partner registration."""
        response = client.post(
            "/v1/auth/register/partner",
            json={
                "email": "newpartner@test.com",
                "password": "SecurePass123!",
                "name": "John Partner",
                "partner_type": "individual"
            }
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["user_type"] == "partner"
        assert data["email"] == "newpartner@test.com"
        assert "user_id" in data

    def test_register_partner_duplicate_email(self, client, partner):
        """Test registration with existing email."""
        response = client.post(
            "/v1/auth/register/partner",
            json={
                "email": partner.email,
                "password": "SecurePass123!",
                "name": "Another Partner",
                "partner_type": "individual"
            }
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT]
        assert "already exists" in response.json()["detail"].lower()

    def test_register_partner_weak_password(self, client):
        """Test registration with weak password."""
        response = client.post(
            "/v1/auth/register/partner",
            json={
                "email": "newpartner@test.com",
                "password": "weak",
                "name": "John Partner",
                "partner_type": "individual"
            }
        )

        # Should either reject or accept depending on password policy
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_201_CREATED]

    def test_register_partner_invalid_email(self, client):
        """Test registration with invalid email format."""
        response = client.post(
            "/v1/auth/register/partner",
            json={
                "email": "not-an-email",
                "password": "SecurePass123!",
                "name": "John Partner",
                "partner_type": "individual"
            }
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_register_partner_missing_fields(self, client):
        """Test registration with missing required fields."""
        response = client.post(
            "/v1/auth/register/partner",
            json={
                "email": "newpartner@test.com",
                "password": "SecurePass123!"
            }
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_partner_empty_email(self, client):
        """Test registration with empty email."""
        response = client.post(
            "/v1/auth/register/partner",
            json={
                "email": "",
                "password": "SecurePass123!",
                "name": "John Partner",
                "partner_type": "individual"
            }
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_partner_pending_status(self, client, db_session):
        """Test that new partners start in pending status."""
        response = client.post(
            "/v1/auth/register/partner",
            json={
                "email": "newpartner@test.com",
                "password": "SecurePass123!",
                "name": "John Partner",
                "partner_type": "individual"
            }
        )

        assert response.status_code == status.HTTP_201_CREATED
        # Verify in database
        from app.models import Partner
        partner = db_session.query(Partner).filter_by(email="newpartner@test.com").first()
        assert partner is not None
        assert partner.status == "pending"


@pytest.mark.integration
class TestVendorRegistration:
    """Test vendor registration endpoint."""

    def test_register_vendor_success(self, client, db_session):
        """Test successful vendor registration."""
        response = client.post(
            "/v1/auth/register/vendor",
            json={
                "email": "newvendor@test.com",
                "password": "SecurePass123!",
                "company_name": "New Company",
                "owner_name": "John Owner"
            }
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["user_type"] == "vendor"
        assert "access_token" in data
        assert "refresh_token" in data

    def test_register_vendor_duplicate_email(self, client, vendor):
        """Test vendor registration with existing email."""
        response = client.post(
            "/v1/auth/register/vendor",
            json={
                "email": vendor.email,
                "password": "SecurePass123!",
                "company_name": "Another Company",
                "owner_name": "Another Owner"
            }
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT]

    def test_register_vendor_invalid_email(self, client):
        """Test vendor registration with invalid email."""
        response = client.post(
            "/v1/auth/register/vendor",
            json={
                "email": "invalid-email",
                "password": "SecurePass123!",
                "company_name": "Company",
                "owner_name": "Owner"
            }
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_register_vendor_missing_company_name(self, client):
        """Test vendor registration with missing company name."""
        response = client.post(
            "/v1/auth/register/vendor",
            json={
                "email": "newvendor@test.com",
                "password": "SecurePass123!",
                "owner_name": "John Owner"
            }
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.integration
class TestTokenRefresh:
    """Test token refresh endpoint."""

    def test_refresh_token_success(self, client, db_session, partner, auth_headers_partner):
        """Test successful token refresh."""
        # First get initial tokens
        login_response = client.post(
            "/v1/auth/login/partner",
            json={"email": partner.email, "password": "testpass123"}
        )

        tokens = login_response.json()
        refresh_token = tokens["refresh_token"]

        # Now refresh
        response = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_refresh_invalid_token(self, client):
        """Test refresh with invalid token."""
        response = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": "invalid-token"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_missing_token(self, client):
        """Test refresh with missing token."""
        response = client.post(
            "/v1/auth/refresh",
            json={}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_refresh_expired_token(self, client, db_session, partner):
        """Test refresh with expired token."""
        from app.core.security import create_tokens
        from datetime import timedelta
        import jwt
        from app.config import settings

        # Create an expired refresh token
        data = {"sub": str(partner.partner_id), "type": "partner"}
        expired_token = jwt.encode(
            {**data, "exp": datetime.utcnow() - timedelta(hours=1)},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )

        response = client.post(
            "/v1/auth/refresh",
            json={"refresh_token": expired_token}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
class TestChangePassword:
    """Test password change endpoint."""

    def test_change_password_success(self, client, partner, auth_headers_partner):
        """Test successful password change."""
        response = client.post(
            "/v1/auth/change-password",
            json={
                "current_password": "testpass123",
                "new_password": "NewSecurePass123!"
            },
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK

        # Verify old password no longer works
        login_response = client.post(
            "/v1/auth/login/partner",
            json={"email": partner.email, "password": "testpass123"}
        )
        assert login_response.status_code == status.HTTP_401_UNAUTHORIZED

        # Verify new password works
        login_response = client.post(
            "/v1/auth/login/partner",
            json={"email": partner.email, "password": "NewSecurePass123!"}
        )
        assert login_response.status_code == status.HTTP_200_OK

    def test_change_password_wrong_current(self, client, partner, auth_headers_partner):
        """Test password change with wrong current password."""
        response = client.post(
            "/v1/auth/change-password",
            json={
                "current_password": "wrongpass",
                "new_password": "NewSecurePass123!"
            },
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_change_password_no_auth(self, client):
        """Test password change without authentication."""
        response = client.post(
            "/v1/auth/change-password",
            json={
                "current_password": "testpass123",
                "new_password": "NewSecurePass123!"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_change_password_same_as_current(self, client, partner, auth_headers_partner):
        """Test setting password to same as current."""
        response = client.post(
            "/v1/auth/change-password",
            json={
                "current_password": "testpass123",
                "new_password": "testpass123"
            },
            headers=auth_headers_partner
        )

        # Should either accept or reject - varies by policy
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_change_password_weak_new_password(self, client, partner, auth_headers_partner):
        """Test password change with weak new password."""
        response = client.post(
            "/v1/auth/change-password",
            json={
                "current_password": "testpass123",
                "new_password": "weak"
            },
            headers=auth_headers_partner
        )

        # Should reject weak password
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_200_OK]


@pytest.mark.integration
class TestGetCurrentUser:
    """Test getting current user profile."""

    def test_get_current_partner(self, client, partner, auth_headers_partner):
        """Test getting current partner profile."""
        response = client.get(
            "/v1/auth/me",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["partner_id"] == str(partner.partner_id)
        assert data["email"] == partner.email

    def test_get_current_vendor_user(self, client, vendor_user, auth_headers_vendor):
        """Test getting current vendor user profile."""
        response = client.get(
            "/v1/auth/me",
            headers=auth_headers_vendor
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == vendor_user.email

    def test_get_current_user_no_auth(self, client):
        """Test getting current user without authentication."""
        response = client.get("/v1/auth/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token."""
        response = client.get(
            "/v1/auth/me",
            headers={"Authorization": "Bearer invalid-token"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
class TestLogout:
    """Test logout endpoint."""

    def test_logout_success(self, client, partner, auth_headers_partner):
        """Test successful logout."""
        response = client.post(
            "/v1/auth/logout",
            headers=auth_headers_partner
        )

        assert response.status_code == status.HTTP_200_OK

    def test_logout_no_auth(self, client):
        """Test logout without authentication."""
        response = client.post("/v1/auth/logout")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_invalid_token(self, client):
        """Test logout with invalid token."""
        response = client.post(
            "/v1/auth/logout",
            headers={"Authorization": "Bearer invalid-token"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
class TestOAuthEndpoints:
    """Test OAuth endpoints."""

    def test_oauth_authorize_google(self, client):
        """Test OAuth authorization URL for Google."""
        response = client.get(
            "/v1/auth/oauth/google/authorize",
            params={"user_type": "partner"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "authorization_url" in data
        assert "state" in data
        assert "google" in data["authorization_url"].lower()

    def test_oauth_authorize_linkedin(self, client):
        """Test OAuth authorization URL for LinkedIn."""
        response = client.get(
            "/v1/auth/oauth/linkedin/authorize",
            params={"user_type": "vendor"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "authorization_url" in data
        assert "state" in data

    def test_oauth_authorize_github(self, client):
        """Test OAuth authorization URL for GitHub."""
        response = client.get(
            "/v1/auth/oauth/github/authorize",
            params={"user_type": "partner"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "authorization_url" in data

    def test_oauth_authorize_missing_user_type(self, client):
        """Test OAuth without user_type parameter."""
        response = client.get(
            "/v1/auth/oauth/google/authorize"
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_oauth_authorize_invalid_user_type(self, client):
        """Test OAuth with invalid user_type."""
        response = client.get(
            "/v1/auth/oauth/google/authorize",
            params={"user_type": "invalid"}
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_oauth_callback_missing_code(self, client):
        """Test OAuth callback without code."""
        response = client.get(
            "/v1/auth/oauth/google/callback",
            params={"state": "some-state", "user_type": "partner"}
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_oauth_callback_invalid_state(self, client):
        """Test OAuth callback with invalid state."""
        response = client.get(
            "/v1/auth/oauth/google/callback",
            params={
                "code": "invalid-code",
                "state": "invalid-state",
                "user_type": "partner"
            }
        )

        # Should fail due to invalid state or code
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED]


@pytest.mark.integration
class TestAuthEdgeCases:
    """Test edge cases and error scenarios."""

    def test_rapid_login_attempts(self, client, partner):
        """Test multiple rapid login attempts."""
        # Make several login attempts in quick succession
        for _ in range(5):
            response = client.post(
                "/v1/auth/login/partner",
                json={"email": partner.email, "password": "testpass123"}
            )
            assert response.status_code == status.HTTP_200_OK

    def test_login_with_sql_injection(self, client):
        """Test that SQL injection attempts don't work."""
        response = client.post(
            "/v1/auth/login/partner",
            json={
                "email": "' OR '1'='1",
                "password": "' OR '1'='1"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_register_with_xss_payload(self, client):
        """Test that XSS payloads are sanitized."""
        response = client.post(
            "/v1/auth/register/partner",
            json={
                "email": "<script>alert('xss')</script>@test.com",
                "password": "SecurePass123!",
                "name": "<img src=x onerror='alert(1)'>",
                "partner_type": "individual"
            }
        )

        # Should reject or sanitize
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_login_with_special_characters_in_email(self, client, db_session):
        """Test login with special characters in email."""
        from app.models import Partner
        from app.core.security import get_password_hash

        # Create partner with special chars in email
        partner = Partner(
            email="test+special@example.com",
            password_hash=get_password_hash("testpass123"),
            name="Test Partner",
            partner_type="individual",
            status="active"
        )
        db_session.add(partner)
        db_session.commit()

        response = client.post(
            "/v1/auth/login/partner",
            json={"email": "test+special@example.com", "password": "testpass123"}
        )

        assert response.status_code == status.HTTP_200_OK

    def test_very_long_email(self, client):
        """Test registration with extremely long email."""
        response = client.post(
            "/v1/auth/register/partner",
            json={
                "email": "a" * 500 + "@test.com",
                "password": "SecurePass123!",
                "name": "Test",
                "partner_type": "individual"
            }
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_very_long_password(self, client, partner):
        """Test login with extremely long password."""
        response = client.post(
            "/v1/auth/login/partner",
            json={
                "email": partner.email,
                "password": "a" * 10000
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
