# HTTPS to HTTP Fallback Implementation

## Overview

Implemented automatic fallback mechanism for redirect links that attempts HTTPS first and falls back to HTTP if HTTPS fails. This handles cases where destination servers don't support HTTPS or have SSL certificate issues.

## Implementation Details

### File: `backend/app/api/v1/tracking.py`

#### New Function: `resolve_redirect_url(url: str) -> str`

**Purpose**: Resolve destination URL with intelligent HTTPS to HTTP fallback

**Location**: Lines 31-129

**Logic Flow**:
1. Parse the URL to extract scheme
2. Validate URL has a scheme (http or https)
3. If scheme is `http`, return URL as-is (no verification needed)
4. If scheme is `https`:
   - Attempt HEAD request with SSL verification
   - If successful (2xx-3xx status), return HTTPS URL
   - If HTTPS fails (SSL error, timeout, connection error, etc.):
     - Log warning about HTTPS failure
     - Attempt HTTP version of URL
     - If HTTP succeeds, log info and return HTTP URL
     - If HTTP also fails, log error and return original URL
5. For other schemes, return as-is

**Parameters**:
- `url` (str): Full destination URL from PartnerLink.full_url

**Returns**:
- str: Verified working URL (HTTPS, HTTP, or original if both fail)

**Raises**:
- ValueError: If URL doesn't have a scheme

**Error Handling**:
- SSL Errors: Triggers HTTP fallback
- Timeout Errors: Triggers HTTP fallback
- Connection Errors: Triggers HTTP fallback
- Status Codes 4xx-5xx: Triggers HTTP fallback
- Both fail: Returns original URL (graceful degradation)

### Modified Function: `redirect_link()`

**Changes**: Lines 241-246

Added URL resolution before creating redirect response:

```python
# Resolve destination URL with HTTPS->HTTP fallback
try:
    destination_url = resolve_redirect_url(link.full_url)
except ValueError as e:
    logger.error(f"Invalid URL in link {short_code}: {link.full_url}")
    raise HTTPException(status_code=500, detail="Invalid destination URL")

# Prepare redirect response
response = RedirectResponse(url=destination_url, status_code=302)
```

### Configuration

**Timeout**: 5 seconds
- Used for HEAD requests to verify URL accessibility
- Prevents hanging on slow/unresponsive servers

**SSL Verification**:
- HTTPS: `verify=True` (strict SSL verification)
- HTTP fallback: `verify=False` (skip SSL verification)

## Logging Behavior

### Log Levels by Scenario

| Scenario | Level | Message |
|----------|-------|---------|
| HTTPS success | DEBUG | `"HTTPS URL verified: {url}"` |
| HTTPS connection error | WARNING | `"HTTPS connection error for {url}: {error}. Attempting HTTP fallback."` |
| HTTPS SSL error | WARNING | `"HTTPS SSL error for {url}: {error}. Attempting HTTP fallback."` |
| HTTPS timeout | WARNING | `"HTTPS request timeout for {url}. Attempting HTTP fallback."` |
| HTTPS error status | WARNING | `"HTTPS URL returned status {code}: {url}. Attempting HTTP fallback."` |
| HTTP fallback success | INFO | `"HTTP fallback succeeded for {url}"` |
| Both HTTPS and HTTP fail | ERROR | `"Both HTTPS and HTTP failed for {url}. HTTPS error and HTTP error: {error}"` |
| Invalid URL (no scheme) | ERROR | `"Invalid URL format (no scheme): {url}"` |

## Test Coverage

### Test File: `backend/app/tests/test_url_fallback.py`

**Test Classes**: 4
**Test Methods**: 35+

#### TestURLFallbackMechanism (15 tests)
Tests the `resolve_redirect_url()` function directly:
- HTTPS success without fallback
- HTTP URLs passed through
- HTTPS fails, HTTP succeeds
- SSL error fallback
- Timeout fallback
- Both fail scenario
- Error status code handling
- 2xx and 3xx status codes
- Invalid URLs without scheme
- Timeout configuration
- SSL verification settings
- URLs with query parameters, fragments, ports
- URL replacement correctness
- Redirect handling

#### TestRedirectEndpointWithFallback (5 tests)
Tests the redirect endpoint with fallback:
- Redirect with working HTTPS URL
- Redirect using HTTP fallback
- Invalid URL error handling
- HTTPS failure logging
- Click recording before URL resolution
- Original URL preservation on failure

#### TestURLFallbackLogging (4 tests)
Tests logging behavior:
- HTTPS success at debug level
- HTTPS failure at warning level
- HTTP fallback success at info level
- Both fail at error level

#### TestURLFallbackEdgeCases (9+ tests)
Tests edge cases and unusual URLs:
- International domains (IDN)
- Embedded credentials
- IPv4 addresses
- IPv6 addresses
- URL-encoded characters
- Very long URLs
- Multiple consecutive slashes

## Usage Example

```python
from app.api.v1.tracking import resolve_redirect_url

# HTTPS URL that's working
url = "https://example.com/page"
result = resolve_redirect_url(url)  # Returns: "https://example.com/page"

# HTTPS URL that fails, but HTTP works
url = "https://old-server.com/page"
result = resolve_redirect_url(url)  # Returns: "http://old-server.com/page"

# Invalid URL
url = "example.com/page"  # No scheme
try:
    result = resolve_redirect_url(url)
except ValueError as e:
    print(f"Invalid URL: {e}")
```

## Integration with Click Tracking

The URL resolution happens **after** click recording:

1. Link is validated (active, not expired)
2. Click record is created and flushed
3. Cookie is created/updated
4. **URL is resolved** (HTTPS -> HTTP fallback)
5. Redirect response is returned
6. Background tasks are enqueued

This ensures that clicks are recorded even if the destination URL cannot be reached.

## Performance Considerations

- **HEAD Requests**: Uses lightweight HEAD requests instead of GET
- **Timeout**: 5-second timeout prevents hanging
- **No Redirect Following**: Direct HEAD request, not following entire redirect chain
- **Database Unaffected**: URL resolution is separate from database operations

## Security Considerations

- **SSL Verification**: HTTPS uses strict SSL verification
- **No Credentials in URLs**: Code doesn't extract or log credentials
- **Logging**: URLs are logged for debugging but not sensitive data
- **Graceful Fallback**: Never exposes error details to end users

## Error Scenarios Handled

| Scenario | Behavior |
|----------|----------|
| Unreachable HTTPS | Try HTTP |
| SSL Certificate Invalid | Try HTTP |
| SSL Certificate Expired | Try HTTP |
| Connection Timeout | Try HTTP |
| Connection Refused | Try HTTP |
| DNS Resolution Failure | Try HTTP |
| HTTP Fallback Also Fails | Return original URL |
| Both Fail Completely | Log error, return original URL for redirect |
| Invalid URL Format | Raise ValueError, return 500 error to client |

## Future Enhancements

1. **Caching**: Cache verified URLs to avoid repeated requests
2. **Metrics**: Track fallback usage for monitoring
3. **Configuration**: Make timeout and SSL settings configurable
4. **Async**: Convert to async/await for better performance
5. **Circuit Breaker**: Skip verification for known-good URLs
6. **Retry Logic**: Implement exponential backoff for retries

## Dependencies

New dependencies added to requirements:
- `requests` - For HEAD requests (usually already included)
- `urllib.parse` - Standard library

## Testing Instructions

Run the test suite:
```bash
# All URL fallback tests
pytest backend/app/tests/test_url_fallback.py -v

# Specific test class
pytest backend/app/tests/test_url_fallback.py::TestURLFallbackMechanism -v

# With coverage
pytest backend/app/tests/test_url_fallback.py --cov=app.api.v1.tracking
```

## Deployment Notes

1. Ensure `requests` library is installed
2. Monitor logs for HTTPS failures
3. Verify no increased latency from URL verification
4. Test with sample URLs that have SSL issues
5. Consider timeout value for your infrastructure

## Documentation

- Implementation file: `backend/app/api/v1/tracking.py` (lines 1-260)
- Test file: `backend/app/tests/test_url_fallback.py`
- This document: `backend/app/api/v1/URL_FALLBACK_IMPLEMENTATION.md`

## Example Log Output

```
DEBUG:    HTTPS URL verified: https://secure.example.com/page
DEBUG:    Redirect: link=abc123, click=1, cookie=uuid-string, new_cookie=True

WARNING:  HTTPS SSL error for https://old-site.com: SSL: CERTIFICATE_VERIFY_FAILED. Attempting HTTP fallback.
INFO:     HTTP fallback succeeded for https://old-site.com
DEBUG:    Redirect: link=def456, click=2, cookie=uuid-string, new_cookie=False

WARNING:  HTTPS connection error for https://unreachable.com: Connection refused. Attempting HTTP fallback.
WARNING:  Returning original URL despite verification failure: https://unreachable.com
DEBUG:    Redirect: link=ghi789, click=3, cookie=uuid-string, new_cookie=False
```

## Summary

This implementation provides a robust solution for handling redirect links that may have HTTPS issues, while maintaining security through strict SSL verification and graceful degradation when both HTTPS and HTTP fail.
