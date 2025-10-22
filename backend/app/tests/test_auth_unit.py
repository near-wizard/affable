"""
Unit Tests for Authentication

Tests core authentication logic, JWT tokens, and password hashing.
No database required - tests use mocks.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from app.core.security import verify_password, get_password_hash, create_access_token, verify_access_token
from app.config import settings


class TestPasswordHashing:
    """Test password hashing and verification."""

    def test_hash_password(self):
        """Test that passwords are hashed (not stored plaintext)."""
        password = "test_password_123"
        hashed = get_password_hash(password)

        # Hash should be different from original
        assert hashed != password
        # Hash should be deterministic
        assert get_password_hash(password) != hashed  # bcrypt adds salt, so hashes differ

    def test_verify_correct_password(self):
        """Test verifying correct password."""
        password = "correct_password"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_verify_incorrect_password(self):
        """Test verifying incorrect password fails."""
        correct_password = "correct_password"
        wrong_password = "wrong_password"
        hashed = get_password_hash(correct_password)

        assert verify_password(wrong_password, hashed) is False

    def test_verify_empty_password(self):
        """Test verifying empty password fails."""
        hashed = get_password_hash("something")

        assert verify_password("", hashed) is False

    @pytest.mark.parametrize("password", [
        "short",
        "a" * 100,
        "with special !@#$%^&*()",
        "with unicode 你好世界",
        "with newline\n",
    ])
    def test_hash_various_passwords(self, password):
        """Test hashing various password formats."""
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True
        assert hashed != password


class TestJWTTokens:
    """Test JWT token generation and validation."""

    def test_create_access_token(self):
        """Test creating valid access token."""
        data = {"sub": "123", "email": "test@example.com", "type": "partner"}
        token = create_access_token(data)

        assert isinstance(token, str)
        assert len(token) > 0
        # JWT format: header.payload.signature
        assert token.count(".") == 2

    def test_verify_valid_token(self):
        """Test verifying valid token returns payload."""
        data = {"sub": "456", "email": "partner@example.com", "type": "partner"}
        token = create_access_token(data)

        payload = verify_access_token(token)
        assert payload["sub"] == "456"
        assert payload["email"] == "partner@example.com"
        assert payload["type"] == "partner"

    def test_verify_invalid_token_format(self):
        """Test verifying malformed token fails."""
        invalid_token = "not.a.real.token"

        with pytest.raises(Exception):
            verify_access_token(invalid_token)

    def test_verify_empty_token(self):
        """Test verifying empty token fails."""
        with pytest.raises((Exception, ValueError)):
            verify_access_token("")

    def test_token_includes_required_claims(self):
        """Test token includes standard JWT claims."""
        data = {"sub": "user123", "type": "vendor_user"}
        token = create_access_token(data)

        payload = verify_access_token(token)
        # Should have exp (expiration) claim
        assert "exp" in payload
        assert isinstance(payload["exp"], int)

    def test_token_expiration(self):
        """Test that expired tokens are rejected."""
        # Create token with past expiration
        from jose import jwt

        expired_data = {
            "sub": "123",
            "type": "partner",
            "exp": datetime.utcnow() - timedelta(hours=1)
        }
        expired_token = jwt.encode(expired_data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        with pytest.raises(Exception):
            verify_access_token(expired_token)

    def test_different_tokens_for_different_data(self):
        """Test that different data produces different tokens."""
        data1 = {"sub": "user1", "type": "partner"}
        data2 = {"sub": "user2", "type": "partner"}

        token1 = create_access_token(data1)
        token2 = create_access_token(data2)

        assert token1 != token2

    def test_token_payload_preserved(self):
        """Test that custom claims are preserved in token."""
        data = {
            "sub": "789",
            "email": "test@example.com",
            "type": "partner",
            "custom_field": "custom_value",
            "number": 42
        }
        token = create_access_token(data)
        payload = verify_access_token(token)

        assert payload["custom_field"] == "custom_value"
        assert payload["number"] == 42


class TestPasswordValidation:
    """Test password validation rules."""

    def test_strong_password_validation(self):
        """Test that strong passwords work."""
        strong_passwords = [
            "StrongP@ss123",
            "MyAff1liate!Program",
            "Tracking2024@Secure",
        ]

        for password in strong_passwords:
            hashed = get_password_hash(password)
            assert verify_password(password, hashed) is True

    def test_password_case_sensitive(self):
        """Test that passwords are case-sensitive."""
        password = "MyPassword123"
        hashed = get_password_hash(password)

        # Wrong case should fail
        assert verify_password("mypassword123", hashed) is False
        assert verify_password("MYPASSWORD123", hashed) is False

    def test_whitespace_in_password(self):
        """Test that whitespace is preserved in password."""
        password = "Pass word 123"
        hashed = get_password_hash(password)

        assert verify_password("Password123", hashed) is False  # Different (whitespace removed)
        assert verify_password("Pass word 123", hashed) is True


class TestTokenDataTypes:
    """Test that token handles various data types."""

    @pytest.mark.parametrize("data", [
        {"sub": "123", "type": "partner", "tier": "gold"},
        {"sub": "456", "type": "vendor_user", "role": "admin"},
        {"sub": "789", "email": "test@test.com", "permissions": ["read", "write"]},
    ])
    def test_create_token_with_various_claims(self, data):
        """Test creating tokens with different claim structures."""
        token = create_access_token(data)
        payload = verify_access_token(token)

        for key, value in data.items():
            assert payload[key] == value

    def test_token_with_numeric_sub(self):
        """Test token with numeric subject."""
        data = {"sub": "12345", "type": "partner"}
        token = create_access_token(data)
        payload = verify_access_token(token)

        assert payload["sub"] == "12345"
        assert isinstance(payload["sub"], str)

    def test_token_with_special_characters_in_claims(self):
        """Test token with special characters in claims."""
        data = {
            "sub": "user@example.com",
            "type": "partner",
            "display_name": "John Doe & Partners"
        }
        token = create_access_token(data)
        payload = verify_access_token(token)

        assert payload["display_name"] == "John Doe & Partners"
