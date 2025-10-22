# Affable Platform Test Suite Documentation

Comprehensive test suite for the affiliate tracking platform with unit, integration, and e2e tests.

## Overview

This test suite covers the core functionality of the Affable affiliate platform across three levels:

1. **Unit Tests** - Fast, isolated tests of business logic
2. **Integration Tests** - Tests of features using database and fixtures
3. **End-to-End Tests** - Full workflow tests simulating real user journeys

## Test Files

### 1. Unit Tests

#### `test_auth_unit.py` - Authentication Logic
Tests core security functions without database.

**Coverage:**
- Password hashing and verification
  - `test_hash_password()` - Verify hashing is secure
  - `test_verify_correct_password()` - Valid password succeeds
  - `test_verify_incorrect_password()` - Wrong password fails
  - `test_verify_empty_password()` - Empty password rejected
  - `test_hash_various_passwords()` - Various password formats

- JWT Token Management
  - `test_create_access_token()` - Generate valid JWT
  - `test_verify_valid_token()` - Decode and verify token
  - `test_verify_invalid_token_format()` - Malformed token rejected
  - `test_token_includes_required_claims()` - Token has exp claim
  - `test_token_expiration()` - Expired tokens rejected
  - `test_different_tokens_for_different_data()` - Tokens are unique
  - `test_token_payload_preserved()` - Custom claims preserved

- Password Validation
  - `test_strong_password_validation()` - Strong passwords accepted
  - `test_password_case_sensitive()` - Case sensitivity enforced
  - `test_whitespace_in_password()` - Whitespace preserved

**Run:**
```bash
pytest app/tests/test_auth_unit.py -v
```

#### `test_commission_unit.py` - Commission Calculation
Tests commission calculation logic with mock calculator.

**Coverage:**
- Percentage Commission
  - `test_basic_percentage()` - 10% of $100 = $10
  - `test_percentage_various_amounts()` - Various amounts
  - `test_zero_percentage()` - 0% = $0
  - `test_full_percentage()` - 100% = full amount
  - `test_negative_event_value_fails()` - Rejects negative values
  - `test_invalid_percentage_fails()` - Rejects >100%

- Fixed Commission
  - `test_fixed_commission()` - Fixed amount regardless of event value
  - `test_fixed_commission_not_affected_by_event_value()` - Independent of value

- Tiered Commission
  - `test_basic_tiered_commission()` - Multiple tier ranges
  - `test_tiered_with_fixed_amounts()` - Fixed tiers
  - `test_value_outside_tier_range_fails()` - Out-of-range fails
  - `test_edge_case_tier_boundaries()` - Boundary values

- Commission Hierarchy
  - `test_partner_override_takes_priority()` - Override > all
  - `test_active_rules_second_priority()` - Rules > default
  - `test_tiers_third_priority()` - Tiers > default
  - `test_default_commission_fallback()` - Default as fallback
  - `test_no_commission_configured()` - Zero when unconfigured

- Rounding & Precision
  - `test_rounding_to_two_decimals()` - 2-decimal rounding
  - `test_rounding_precision()` - Precision in edge cases

**Run:**
```bash
pytest app/tests/test_commission_unit.py -v
```

### 2. Integration Tests

#### `test_integration_campaigns.py` - Campaign Workflow
Tests campaign creation, enrollment, and management with database.

**Test Classes:**

**TestCampaignWorkflow**
- `test_vendor_creates_campaign()` - Vendor can create campaign
- `test_list_campaigns_as_vendor()` - Vendor lists own campaigns
- `test_list_public_campaigns_as_partner()` - Partner sees public campaigns
- `test_partner_applies_to_campaign()` - Partner applies to campaign
- `test_vendor_approves_partner_application()` - Vendor approves partner
- `test_vendor_rejects_partner_application()` - Vendor rejects partner
- `test_vendor_set_commission_override()` - Custom partner commission
- `test_campaign_cannot_be_created_by_partner()` - Partners restricted
- `test_partner_cannot_approve_their_own_application()` - No self-approval
- `test_get_campaign_details()` - View campaign stats
- `test_campaign_versioning()` - Campaign versioning works
- `test_soft_delete_campaign()` - Soft delete functionality

**TestCampaignPermissions**
- `test_vendor_cannot_see_other_vendor_campaigns()` - Vendor isolation
- `test_partner_cannot_see_private_campaigns_without_approval()` - Private campaign access
- `test_campaign_endpoint_requires_authentication()` - Auth required
- `test_invalid_campaign_id_returns_404()` - 404 for invalid ID

**TestCampaignValidation**
- `test_campaign_requires_required_fields()` - Validation enforced
- `test_campaign_commission_percentage_in_valid_range()` - Percentage validation
- `test_campaign_with_negative_commission_fails()` - Rejects negative

**Run:**
```bash
pytest app/tests/test_integration_campaigns.py -v
pytest app/tests/test_integration_campaigns.py::TestCampaignWorkflow -v
```

#### `test_integration_tracking.py` - Tracking & Link Generation
Tests link generation, click tracking, and cookie management.

**Test Classes:**

**TestLinkGeneration**
- `test_partner_generates_tracking_link()` - Create tracking link
- `test_short_code_is_unique()` - Unique short codes
- `test_list_partner_links()` - List links
- `test_get_link_statistics()` - View link stats
- `test_partner_cannot_access_other_partner_links()` - Link isolation
- `test_update_link_metadata()` - Update link properties
- `test_delete_link()` - Soft delete link

**TestClickTracking**
- `test_redirect_endpoint_with_short_code()` - Redirect works
- `test_invalid_short_code_returns_404()` - 404 for invalid code
- `test_click_creates_tracking_record()` - Click recorded in DB
- `test_click_sets_browser_cookie()` - Cookie set in response
- `test_cookie_persists_across_clicks()` - Cookie reused
- `test_utm_parameters_in_redirect_link()` - UTM params passed
- `test_click_records_user_agent()` - User agent recorded
- `test_click_records_referrer()` - Referrer recorded

**TestUTMParameterHandling**
- `test_link_default_utm_params()` - Default UTM params
- `test_utm_params_override_on_redirect()` - Query param overrides
- `test_click_captures_utm_from_link_and_query()` - Merges UTM params

**TestCookieManagement**
- `test_cookie_expires_in_30_days()` - Expiry set
- `test_multiple_links_same_partner_same_cookie()` - Cookie sharing

**Run:**
```bash
pytest app/tests/test_integration_tracking.py -v
pytest app/tests/test_integration_tracking.py::TestClickTracking -v
```

### 3. End-to-End Tests

#### `test_e2e_affiliate_flow.py` - Complete Workflows
Tests full affiliate workflows end-to-end.

**Test Classes:**

**TestCompleteAffiliateFlow**

`test_end_to_end_affiliate_journey()` - Complete flow simulation:
1. Vendor creates campaign
2. Partner applies
3. Vendor approves
4. Partner generates tracking link
5. User clicks link (tracking)
6. User converts
7. Webhook sent
8. Conversion credited
9. Commission calculated
10. Payout generated

**Output example:**
```
✓ Step 1: Campaign created (ID: 123)
✓ Step 2: Partner applied to campaign
✓ Step 3: Vendor approved partner
✓ Step 4: Tracking link created (abc123de)
✓ Step 5: User clicked link (Cookie: 550e8400...)
✓ Step 7: Conversion webhook received
  - Commission calculated: $15.00
✓ Step 8: Conversion credited to partner
✓ Step 9: Commission calculated ($15.00)
✓ Step 10: Payout generated
✅ COMPLETE E2E FLOW SUCCESSFUL!
```

`test_multiple_partners_same_campaign()` - Multiple partners in same campaign

`test_commission_hierarchy_applied_correctly()` - Commission hierarchy testing

**TestErrorHandlingInFlow**

- `test_duplicate_transaction_id_idempotent()` - Duplicate webhooks handled
- `test_invalid_webhook_signature_rejected()` - Invalid signatures rejected
- `test_missing_required_conversion_fields()` - Data validation

**Run:**
```bash
pytest app/tests/test_e2e_affiliate_flow.py -v -s
```

## Running Tests

### All Tests
```bash
# Run all tests
pytest app/tests/ -v

# Run with coverage
pytest app/tests/ --cov=app --cov-report=term-missing
```

### By Type
```bash
# Unit tests only (fast)
pytest -m unit -v

# Integration tests
pytest -m integration -v

# E2E tests
pytest -m e2e -v
```

### By File
```bash
pytest app/tests/test_auth_unit.py -v
pytest app/tests/test_commission_unit.py -v
pytest app/tests/test_integration_campaigns.py -v
pytest app/tests/test_integration_tracking.py -v
pytest app/tests/test_e2e_affiliate_flow.py -v
```

### Specific Test
```bash
pytest app/tests/test_auth_unit.py::TestPasswordHashing::test_verify_correct_password -v
pytest app/tests/test_integration_campaigns.py::TestCampaignWorkflow::test_vendor_creates_campaign -v
```

### With Output
```bash
# Show print statements
pytest app/tests/test_e2e_affiliate_flow.py -v -s

# Show slowest tests
pytest app/tests/ --durations=10

# Stop on first failure
pytest app/tests/ -x
```

## Test Coverage Goals

| Area | Target | Status |
|------|--------|--------|
| **Authentication** | >90% | ✓ |
| **Commission Logic** | >95% | ✓ |
| **Campaign Workflow** | >85% | ✓ |
| **Link Tracking** | >80% | ✓ |
| **E2E Flows** | >70% | ✓ |
| **Overall** | >80% | ✓ |

## Key Test Features

### Fixtures Used
- `client` - FastAPI test client
- `db_session` - Test database session
- `vendor` - Test vendor account
- `vendor_user` - Test vendor team member
- `partner` - Test affiliate partner
- `campaign` - Test campaign
- `campaign_version` - Campaign with settings
- `campaign_partner` - Partner enrollment
- `partner_link` - Tracking link
- `auth_headers_vendor` - Vendor JWT auth
- `auth_headers_partner` - Partner JWT auth

### Authentication
- JWT token-based auth for API endpoints
- Separate auth headers for vendor and partner
- Role-based access control testing

### Database Isolation
- In-memory SQLite for fast tests
- Fresh database per test
- Automatic rollback after each test
- No test data pollution

### Error Scenarios
- Invalid credentials
- Expired tokens
- Unauthorized access
- Missing required fields
- Invalid signatures
- Duplicate transaction IDs

## Common Test Commands

```bash
# Quick feedback
make quick-test  # or: bash scripts/quick-test.sh

# Pre-commit validation
make validate  # or: bash scripts/validate.sh

# Full validation with coverage
make full-validate  # or: bash scripts/full-validate.sh

# Watch mode (auto-run on changes)
make watch  # or: bash scripts/watch.sh
```

## Writing New Tests

### Unit Test Template
```python
@pytest.mark.unit
class TestMyFeature:
    """Test description."""

    def test_specific_behavior(self):
        """What specifically is being tested."""
        # Arrange
        input_data = {"key": "value"}

        # Act
        result = my_function(input_data)

        # Assert
        assert result == expected
```

### Integration Test Template
```python
@pytest.mark.integration
class TestMyWorkflow:
    """Test description."""

    def test_workflow(self, client, db_session, auth_headers_partner):
        """Complete workflow test."""
        # Create data
        response = client.post(
            "/v1/endpoint",
            json=data,
            headers=auth_headers_partner
        )

        # Verify response
        assert response.status_code == 201

        # Verify database
        from app.models import MyModel
        record = db_session.query(MyModel).first()
        assert record is not None
```

### E2E Test Template
```python
@pytest.mark.e2e
class TestMyFlow:
    """Test description."""

    def test_full_flow(self, client, db_session, ...):
        """Full flow from start to finish."""
        # Step 1
        resp1 = client.post(..., headers=...)
        assert resp1.status_code == 201

        # Step 2
        resp2 = client.get(..., headers=...)
        assert resp2.status_code == 200

        # Verify final state
        assert final_state_is_correct()
```

## Debugging Tests

### Verbose Output
```bash
pytest app/tests/ -v -s
```

### Specific Test with Debugging
```bash
pytest app/tests/test_file.py::TestClass::test_function -v -s
```

### With Breakpoint
```python
def test_something():
    result = my_function()
    import pdb; pdb.set_trace()  # Debugger stops here
    assert result == expected
```

### Database Query in Test
```python
def test_database_state(self, db_session):
    # Verify data in database
    from app.models import MyModel
    record = db_session.query(MyModel).first()
    print(f"Record: {record}")
    assert record is not None
```

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

```bash
# Pre-commit (local)
bash scripts/validate.sh

# Pre-PR (comprehensive)
bash scripts/full-validate.sh

# CI/CD pipeline
pytest --cov=app --cov-report=xml app/tests/
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Tests not found** | Ensure files start with `test_` |
| **Import errors** | Install dependencies: `pip install -r requirements.txt -r requirements-dev.txt` |
| **Database errors** | Tests use in-memory SQLite, should work without config |
| **Auth failures** | Check JWT token generation in fixtures |
| **Flaky tests** | Add `pytest.mark.flaky(reruns=2)` |

## Performance

- **Unit tests**: ~0.5s total
- **Integration tests**: ~2-5s total
- **E2E tests**: ~5-10s total
- **Full suite**: ~10-15s total

Target: < 30 seconds for complete test suite.

## Next Steps

1. Run unit tests: `pytest app/tests/test_auth_unit.py -v`
2. Run integration tests: `pytest app/tests/test_integration_campaigns.py -v`
3. Run E2E tests: `pytest app/tests/test_e2e_affiliate_flow.py -v -s`
4. Run all: `pytest app/tests/ -v --cov=app`
5. Use pre-commit hooks: `bash scripts/validate.sh`
