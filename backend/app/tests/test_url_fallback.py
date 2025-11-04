"""
Tests for HTTPS to HTTP URL Fallback Mechanism

Tests the resolve_redirect_url function and redirect endpoint behavior
when HTTPS fails and falls back to HTTP.
"""

import pytest
from unittest.mock import patch, MagicMock
import requests
from fastapi import status
import logging

from app.api.v1.tracking import resolve_redirect_url


@pytest.mark.integration
class TestURLFallbackMechanism:
    """Test HTTPS to HTTP fallback for redirect URLs."""

    def test_https_url_success_no_fallback(self):
        """Test that HTTPS URL succeeding doesn't trigger fallback."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            # Mock successful HTTPS response
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_head.return_value = mock_response

            url = "https://example.com/page"
            result = resolve_redirect_url(url)

            assert result == url
            assert mock_head.call_count == 1
            # Verify HTTPS was attempted with verify=True
            mock_head.assert_called_once()
            call_args = mock_head.call_args
            assert call_args[1]['verify'] is True

    def test_http_url_passed_through(self):
        """Test that HTTP URLs are passed through without verification."""
        url = "http://example.com/page"
        result = resolve_redirect_url(url)

        assert result == url

    def test_https_fails_http_succeeds(self):
        """Test fallback from HTTPS to HTTP on connection error."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            # First call (HTTPS) raises error
            mock_head.side_effect = [
                requests.exceptions.ConnectionError("Connection refused"),
                MagicMock(status_code=200)  # Second call (HTTP) succeeds
            ]

            url = "https://example.com/page"
            result = resolve_redirect_url(url)

            # Should return HTTP version
            assert result == "http://example.com/page"
            # Should have called twice (HTTPS then HTTP)
            assert mock_head.call_count == 2

    def test_https_ssl_error_tries_http(self):
        """Test fallback on SSL error."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.side_effect = [
                requests.exceptions.SSLError("SSL certificate verify failed"),
                MagicMock(status_code=200)
            ]

            url = "https://example.com/page"
            result = resolve_redirect_url(url)

            assert result == "http://example.com/page"
            assert mock_head.call_count == 2

    def test_https_timeout_tries_http(self):
        """Test fallback on timeout."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.side_effect = [
                requests.exceptions.Timeout("Request timed out"),
                MagicMock(status_code=200)
            ]

            url = "https://example.com/page"
            result = resolve_redirect_url(url)

            assert result == "http://example.com/page"
            assert mock_head.call_count == 2

    def test_https_http_both_fail(self):
        """Test behavior when both HTTPS and HTTP fail."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.side_effect = requests.exceptions.ConnectionError("No connection")

            url = "https://example.com/page"
            result = resolve_redirect_url(url)

            # Should return original URL when both fail
            assert result == url
            assert mock_head.call_count == 2

    def test_https_error_status_code_tries_http(self):
        """Test fallback when HTTPS returns error status."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            # HTTPS returns 503, HTTP returns 200
            mock_head.side_effect = [
                MagicMock(status_code=503),
                MagicMock(status_code=200)
            ]

            url = "https://example.com/page"
            result = resolve_redirect_url(url)

            assert result == "http://example.com/page"

    def test_http_returns_error_still_used(self):
        """Test that HTTP is returned even if it returns error status."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            # HTTPS fails, HTTP returns 404
            mock_head.side_effect = [
                requests.exceptions.ConnectionError(),
                MagicMock(status_code=404)
            ]

            url = "https://example.com/page"
            result = resolve_redirect_url(url)

            # Should still return HTTP version (even with 404)
            assert result == "http://example.com/page"

    def test_redirect_2xx_status_codes(self):
        """Test that 2xx status codes are considered successful."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            for status_code in [200, 201, 204]:
                mock_head.reset_mock()
                mock_head.return_value = MagicMock(status_code=status_code)

                url = "https://example.com/page"
                result = resolve_redirect_url(url)

                assert result == url
                mock_head.assert_called_once()

    def test_redirect_3xx_status_codes(self):
        """Test that 3xx (redirect) status codes are considered successful."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            for status_code in [301, 302, 304, 307]:
                mock_head.reset_mock()
                mock_head.return_value = MagicMock(status_code=status_code)

                url = "https://example.com/page"
                result = resolve_redirect_url(url)

                assert result == url
                mock_head.assert_called_once()

    def test_invalid_url_no_scheme(self):
        """Test that URL without scheme raises error."""
        url = "example.com/page"

        with pytest.raises(ValueError):
            resolve_redirect_url(url)

    def test_timeout_value_used(self):
        """Test that configured timeout is used."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.return_value = MagicMock(status_code=200)

            url = "https://example.com/page"
            resolve_redirect_url(url)

            # Verify timeout was passed
            call_kwargs = mock_head.call_args[1]
            assert call_kwargs['timeout'] == 5

    def test_ssl_verification_https(self):
        """Test that HTTPS uses SSL verification."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.return_value = MagicMock(status_code=200)

            url = "https://example.com/page"
            resolve_redirect_url(url)

            # HTTPS call should have verify=True
            call_kwargs = mock_head.call_args[1]
            assert call_kwargs['verify'] is True

    def test_ssl_verification_http_fallback(self):
        """Test that HTTP fallback skips SSL verification."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.side_effect = [
                requests.exceptions.SSLError(),
                MagicMock(status_code=200)
            ]

            url = "https://example.com/page"
            resolve_redirect_url(url)

            # HTTP call should have verify=False
            http_call = mock_head.call_args_list[1]
            assert http_call[1]['verify'] is False

    def test_url_with_query_parameters(self):
        """Test URL with query parameters."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.return_value = MagicMock(status_code=200)

            url = "https://example.com/page?param1=value1&param2=value2"
            result = resolve_redirect_url(url)

            assert result == url
            # Verify full URL including parameters was used
            called_url = mock_head.call_args[0][0]
            assert "param1=value1" in called_url

    def test_url_with_fragment(self):
        """Test URL with fragment identifier."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.return_value = MagicMock(status_code=200)

            url = "https://example.com/page#section"
            result = resolve_redirect_url(url)

            assert result == url

    def test_url_with_port(self):
        """Test URL with explicit port."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.return_value = MagicMock(status_code=200)

            url = "https://example.com:8443/page"
            result = resolve_redirect_url(url)

            assert result == url

    def test_url_replacement_only_first_https(self):
        """Test that only first https:// is replaced with http://."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.side_effect = [
                requests.exceptions.ConnectionError(),
                MagicMock(status_code=200)
            ]

            # URL with https in path (unlikely but possible)
            url = "https://example.com/page?ref=https://other.com"
            result = resolve_redirect_url(url)

            # Should replace only the first https://
            assert result == "http://example.com/page?ref=https://other.com"

    def test_allow_redirects_enabled(self):
        """Test that allow_redirects is enabled for URL verification."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.return_value = MagicMock(status_code=200)

            url = "https://example.com/page"
            resolve_redirect_url(url)

            call_kwargs = mock_head.call_args[1]
            assert call_kwargs['allow_redirects'] is True


@pytest.mark.integration
class TestRedirectEndpointWithFallback:
    """Test redirect endpoint with HTTPS->HTTP fallback."""

    def test_redirect_https_url_success(self, client, partner_link, db_session):
        """Test redirect with working HTTPS URL."""
        with patch('app.api.v1.tracking.resolve_redirect_url') as mock_resolve:
            mock_resolve.return_value = partner_link.full_url

            response = client.get(f"/v1/tracking/r/{partner_link.short_code}")

            assert response.status_code == status.HTTP_302_FOUND
            assert response.headers["location"] == partner_link.full_url
            mock_resolve.assert_called_once_with(partner_link.full_url)

    def test_redirect_http_fallback_used(self, client, partner_link, db_session):
        """Test redirect using HTTP fallback."""
        with patch('app.api.v1.tracking.resolve_redirect_url') as mock_resolve:
            http_url = partner_link.full_url.replace("https://", "http://")
            mock_resolve.return_value = http_url

            response = client.get(f"/v1/tracking/r/{partner_link.short_code}")

            assert response.status_code == status.HTTP_302_FOUND
            assert response.headers["location"] == http_url

    def test_redirect_invalid_url_error(self, client, partner_link, db_session):
        """Test redirect with invalid URL."""
        # Set invalid URL in database
        partner_link.full_url = "invalid-url-without-scheme"
        db_session.commit()

        response = client.get(f"/v1/tracking/r/{partner_link.short_code}")

        # Should return 500 error
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_redirect_logs_https_failure(self, client, partner_link, db_session):
        """Test that HTTPS failure is logged."""
        with patch('app.api.v1.tracking.resolve_redirect_url') as mock_resolve:
            with patch('app.api.v1.tracking.logger') as mock_logger:
                mock_resolve.return_value = "http://example.com"

                client.get(f"/v1/tracking/r/{partner_link.short_code}")

                # verify_redirect_url should have been called
                mock_resolve.assert_called_once()

    def test_redirect_click_recorded_before_url_resolution(self, client, partner_link, db_session):
        """Test that click is recorded even if URL resolution has issues."""
        from app.models import Click

        initial_clicks = db_session.query(Click).count()

        with patch('app.api.v1.tracking.resolve_redirect_url') as mock_resolve:
            mock_resolve.return_value = "https://example.com"

            response = client.get(f"/v1/tracking/r/{partner_link.short_code}")

            assert response.status_code == status.HTTP_302_FOUND

            # Click should be recorded
            final_clicks = db_session.query(Click).count()
            assert final_clicks == initial_clicks + 1

    def test_redirect_preserves_original_url_on_failure(self, client, partner_link, db_session):
        """Test that original URL is used if resolution fails."""
        with patch('app.api.v1.tracking.resolve_redirect_url') as mock_resolve:
            # Return original URL when all resolution attempts fail
            mock_resolve.return_value = partner_link.full_url

            response = client.get(f"/v1/tracking/r/{partner_link.short_code}")

            assert response.status_code == status.HTTP_302_FOUND
            assert response.headers["location"] == partner_link.full_url


@pytest.mark.integration
class TestURLFallbackLogging:
    """Test logging behavior of URL fallback mechanism."""

    def test_https_success_logs_debug(self):
        """Test that successful HTTPS is logged at debug level."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            with patch('app.api.v1.tracking.logger') as mock_logger:
                mock_head.return_value = MagicMock(status_code=200)

                url = "https://example.com/page"
                resolve_redirect_url(url)

                # Should log debug message
                debug_calls = [call for call in mock_logger.debug.call_args_list]
                assert len(debug_calls) > 0

    def test_https_failure_logs_warning(self):
        """Test that HTTPS failure is logged as warning."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            with patch('app.api.v1.tracking.logger') as mock_logger:
                mock_head.side_effect = [
                    requests.exceptions.ConnectionError(),
                    MagicMock(status_code=200)
                ]

                url = "https://example.com/page"
                resolve_redirect_url(url)

                # Should log warning about HTTPS failure
                warning_calls = [call for call in mock_logger.warning.call_args_list]
                assert len(warning_calls) > 0
                # Check that warning mentions HTTP fallback
                warning_text = str(warning_calls[0])
                assert "fallback" in warning_text.lower()

    def test_http_success_logs_info(self):
        """Test that HTTP fallback success is logged at info level."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            with patch('app.api.v1.tracking.logger') as mock_logger:
                mock_head.side_effect = [
                    requests.exceptions.ConnectionError(),
                    MagicMock(status_code=200)
                ]

                url = "https://example.com/page"
                resolve_redirect_url(url)

                # Should log info about successful fallback
                info_calls = [call for call in mock_logger.info.call_args_list]
                assert len(info_calls) > 0

    def test_both_fail_logs_error(self):
        """Test that failure of both HTTPS and HTTP is logged as error."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            with patch('app.api.v1.tracking.logger') as mock_logger:
                mock_head.side_effect = requests.exceptions.ConnectionError()

                url = "https://example.com/page"
                resolve_redirect_url(url)

                # Should log error
                error_calls = [call for call in mock_logger.error.call_args_list]
                assert len(error_calls) > 0


@pytest.mark.integration
class TestURLFallbackEdgeCases:
    """Test edge cases for URL fallback mechanism."""

    def test_url_with_international_domain(self):
        """Test URL with international domain (IDN)."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.return_value = MagicMock(status_code=200)

            # IDN domain (encoded)
            url = "https://xn--e28h.com/page"
            result = resolve_redirect_url(url)

            assert result == url

    def test_url_with_authentication(self):
        """Test URL with embedded credentials (not recommended)."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.return_value = MagicMock(status_code=200)

            url = "https://user:pass@example.com/page"
            result = resolve_redirect_url(url)

            assert result == url

    def test_url_with_ipv4_address(self):
        """Test URL with IPv4 address."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.return_value = MagicMock(status_code=200)

            url = "https://192.168.1.1/page"
            result = resolve_redirect_url(url)

            assert result == url

    def test_url_with_ipv6_address(self):
        """Test URL with IPv6 address."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.return_value = MagicMock(status_code=200)

            url = "https://[2001:db8::1]/page"
            result = resolve_redirect_url(url)

            assert result == url

    def test_url_with_encoded_characters(self):
        """Test URL with URL-encoded characters."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.return_value = MagicMock(status_code=200)

            url = "https://example.com/page?q=hello%20world&name=John%20Doe"
            result = resolve_redirect_url(url)

            assert result == url

    def test_very_long_url(self):
        """Test very long URL."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.return_value = MagicMock(status_code=200)

            # Create a very long URL
            url = "https://example.com/page?" + "&".join([f"param{i}=value{i}" for i in range(100)])
            result = resolve_redirect_url(url)

            assert result == url

    def test_url_with_multiple_consecutive_slashes(self):
        """Test URL path with multiple consecutive slashes."""
        with patch('app.api.v1.tracking.requests.head') as mock_head:
            mock_head.return_value = MagicMock(status_code=200)

            url = "https://example.com//path///to////page"
            result = resolve_redirect_url(url)

            assert result == url
