# Affiliate Tracking Platform - Data Dictionary

## Table of Contents
1. [Core Entities](#core-entities)
2. [Campaign Management](#campaign-management)
3. [Tracking & Attribution](#tracking--attribution)
4. [Commission & Payouts](#commission--payouts)
5. [Supporting Tables](#supporting-tables)

---

## Core Entities

### vendors
Represents companies that offer affiliate programs (advertisers/merchants).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| vendor_id | SERIAL | PRIMARY KEY | Unique identifier for vendor |
| name | VARCHAR(255) | NOT NULL | Display name of the vendor |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Primary contact email |
| company_name | VARCHAR(255) | | Legal company name |
| website_url | TEXT | | Vendor's primary website |
| status | VARCHAR(50) | DEFAULT 'active' | Current status: active, suspended, inactive |
| api_key | VARCHAR(255) | UNIQUE | Authentication key for API access |
| webhook_secret | VARCHAR(255) | | Secret for verifying webhook signatures |
| webhook_url | TEXT | | Endpoint for receiving event notifications |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- Email must be unique across active vendors
- API keys should be rotated every 90 days
- Status transitions should be logged in audit_logs

**Common Queries:**
```sql
-- Active vendors with pending payouts
SELECT v.* FROM vendors v
JOIN payouts p ON p.partner_id IN (
  SELECT DISTINCT partner_id FROM campaign_partners cp
  JOIN campaign_versions cv ON cp.campaign_version_id = cv.campaign_version_id
  WHERE cv.campaign_id IN (SELECT campaign_id FROM campaigns WHERE vendor_id = v.vendor_id)
)
WHERE v.is_deleted = FALSE AND v.status = 'active';
```

---

### partners
Represents affiliates, influencers, or partners promoting vendor products.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| partner_id | SERIAL | PRIMARY KEY | Unique identifier for partner |
| name | VARCHAR(255) | NOT NULL | Partner display name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Partner contact email |
| status | VARCHAR(50) | DEFAULT 'pending' | Status: pending, active, suspended, rejected |
| tier | VARCHAR(50) | DEFAULT 'standard' | Partner tier: standard, bronze, silver, gold, platinum |
| bio | TEXT | | Partner description/bio |
| website_url | TEXT | | Partner's primary website or social profile |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- Partners must be approved (status='active') before generating links
- Tier affects default commission rates (can be overridden)
- Tier upgrades typically based on performance metrics

**Indexes:**
- `idx_partners_email` on email for login lookups
- `idx_partners_tier` for tier-based queries

---

### partner_types
Categories for partners (affiliate, influencer, content creator, reseller, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| partner_type_id | SERIAL | PRIMARY KEY | Unique identifier |
| name | VARCHAR(50) | UNIQUE, NOT NULL | Type name: affiliate, influencer, content_creator, reseller |
| description | TEXT | | Detailed description of partner type |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

**Business Rules:**
- Partners can have multiple types
- Types may affect available campaigns or commission structures

---

### partner_partner_types
Junction table linking partners to their types (many-to-many).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| partner_id | INTEGER | FK partners, PK | Reference to partner |
| partner_type_id | INTEGER | FK partner_types, PK | Reference to partner type |
| assigned_at | TIMESTAMP | DEFAULT NOW() | When type was assigned |

**Business Rules:**
- Composite primary key ensures no duplicate assignments
- Cascading deletes when partner is deleted

---

### vendor_users
Team members who manage vendor accounts and campaigns.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| vendor_user_id | SERIAL | PRIMARY KEY | Unique identifier |
| vendor_id | INTEGER | FK vendors, NOT NULL | Parent vendor account |
| email | VARCHAR(255) | NOT NULL | User email (unique within vendor) |
| name | VARCHAR(255) | NOT NULL | User's full name |
| role | VARCHAR(50) | DEFAULT 'member' | Role: owner, admin, manager, member |
| status | VARCHAR(50) | DEFAULT 'active' | Status: active, inactive, pending |
| invited_by | INTEGER | FK vendor_users | Who invited this user |
| invited_at | TIMESTAMP | | When invitation was sent |
| joined_at | TIMESTAMP | | When user accepted invitation |
| last_login_at | TIMESTAMP | | Last login timestamp |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- Email must be unique within a vendor (not globally)
- Self-referencing invited_by allows tracking invitation chains
- Role determines permissions (manage campaigns, approve partners, view reports)

---

## Campaign Management

### campaigns
Top-level campaign entity representing a marketing program.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| campaign_id | SERIAL | PRIMARY KEY | Unique identifier |
| vendor_id | INTEGER | FK vendors, NOT NULL | Campaign owner |
| current_campaign_version_id | INTEGER | FK campaign_versions | Active version |
| status | VARCHAR(50) | DEFAULT 'active' | Status: active, paused, archived |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- Campaign is immutable; changes create new versions
- Status applies to all versions
- Archiving campaign doesn't affect historical data

---

### campaign_versions
Specific versions of campaigns with concrete terms and settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| campaign_version_id | SERIAL | PRIMARY KEY | Unique identifier |
| campaign_id | INTEGER | FK campaigns, NOT NULL | Parent campaign |
| version_number | INTEGER | NOT NULL | Sequential version (1, 2, 3...) |
| name | VARCHAR(255) | NOT NULL | Campaign version name |
| description | TEXT | | Detailed description |
| destination_url | TEXT | NOT NULL | Where partner links redirect |
| default_commission_type | VARCHAR(50) | NOT NULL | Type: percentage, flat, tiered |
| default_commission_value | DECIMAL(10,2) | | Default commission amount/percentage |
| cookie_duration_days | INTEGER | DEFAULT 30 | Attribution window in days |
| approval_required | BOOLEAN | DEFAULT FALSE | Must approve partner applications |
| is_public | BOOLEAN | DEFAULT TRUE | Visible in campaign marketplace |
| max_partners | INTEGER | | Maximum number of partners allowed |
| terms_url | TEXT | | Link to legal terms |
| promotional_guidelines | TEXT | | Partner promotional requirements |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | When version was created |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- version_number must be unique within campaign_id
- Cannot delete version with active conversions
- Commission type determines how commission_value is interpreted

**Commission Types:**
- `percentage`: commission_value is % of sale (e.g., 10.00 = 10%)
- `flat`: commission_value is fixed amount per conversion
- `tiered`: uses campaign_tiers table for dynamic rates

---

### campaign_tiers
Tiered commission structures (e.g., Bronze/Silver/Gold based on volume).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| campaign_tier_id | SERIAL | PRIMARY KEY | Unique identifier |
| campaign_version_id | INTEGER | FK campaign_versions, NOT NULL | Parent campaign version |
| reward_id | INTEGER | FK rewards | Optional reward reference |
| label | VARCHAR(50) | NOT NULL | Tier name: Bronze, Silver, Gold |
| min_amount | DECIMAL(10,2) | NOT NULL | Minimum threshold for tier |
| max_amount | DECIMAL(10,2) | NOT NULL | Maximum threshold for tier |
| reward_type | VARCHAR(20) | NOT NULL | Type: flat, percentage |
| reward_value | DECIMAL(10,2) | NOT NULL | Commission for this tier |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

**Business Rules:**
- Tiers cannot overlap (max of tier N = min of tier N+1)
- When commission_type='tiered', must have at least one tier
- System picks tier based on partner's total_revenue in current period

**Example:**
```
Bronze: $0 - $999: 5%
Silver: $1000 - $4999: 10%
Gold: $5000+: 15%
```

---

### campaign_partners
Junction table tracking partner enrollment in campaigns.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| campaign_partner_id | SERIAL | PRIMARY KEY | Unique identifier |
| campaign_version_id | INTEGER | FK campaign_versions, NOT NULL | Specific campaign version |
| partner_id | INTEGER | FK partners, NOT NULL | Enrolled partner |
| status | VARCHAR(50) | DEFAULT 'pending' | Status: pending, approved, rejected, removed |
| application_note | TEXT | | Partner's application message |
| applied_at | TIMESTAMP | DEFAULT NOW() | When partner applied |
| approved_at | TIMESTAMP | | When approved by vendor |
| rejected_at | TIMESTAMP | | When rejected |
| rejection_reason | TEXT | | Why application was rejected |
| approved_by | INTEGER | FK vendor_users | Who approved |
| total_clicks | INTEGER | DEFAULT 0 | Denormalized click count |
| total_conversions | INTEGER | DEFAULT 0 | Denormalized conversion count |
| total_revenue | DECIMAL(10,2) | DEFAULT 0 | Denormalized total sale value |
| total_commission_earned | DECIMAL(10,2) | DEFAULT 0 | Denormalized commission total |
| last_click_at | TIMESTAMP | | Most recent click timestamp |
| last_conversion_at | TIMESTAMP | | Most recent conversion timestamp |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- Unique constraint prevents duplicate enrollments
- Denormalized fields updated via triggers or batch jobs
- Status transitions: pending → approved/rejected → removed
- Partners can only generate links when status='approved'

**Performance Note:**
- Denormalized totals enable fast dashboard queries
- Rebuild periodically from source tables to ensure accuracy

---

### partner_campaign_overrides
Custom commission rates for specific partners (VIP rates).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| partner_campaign_override_id | SERIAL | PRIMARY KEY | Unique identifier |
| partner_id | INTEGER | FK partners, NOT NULL | Partner receiving override |
| campaign_version_id | INTEGER | FK campaign_versions, NOT NULL | Campaign being overridden |
| conversion_event_type_id | INTEGER | FK conversion_event_types | Specific event type (optional) |
| commission_type | VARCHAR(50) | NOT NULL | Override type: percentage, flat |
| commission_value | DECIMAL(10,2) | NOT NULL | Override amount |
| notes | TEXT | | Reason for override (VIP deal, negotiated rate) |
| valid_from | TIMESTAMP | DEFAULT NOW() | When override becomes active |
| valid_until | TIMESTAMP | | When override expires (optional) |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

**Business Rules:**
- Overrides take precedence over campaign defaults
- If event_type_id is NULL, applies to all event types
- Check valid_from/valid_until when calculating commission
- Unique constraint on (partner, campaign, event_type)

---

## Tracking & Attribution

### partner_links
Trackable URLs generated for partners to share.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| partner_link_id | SERIAL | PRIMARY KEY | Unique identifier |
| campaign_partner_id | INTEGER | FK campaign_partners, NOT NULL | Campaign enrollment reference |
| short_code | VARCHAR(50) | UNIQUE, NOT NULL | URL slug (e.g., 'xyz123') |
| full_url | TEXT | NOT NULL | Complete destination URL |
| custom_params | JSONB | | Partner-defined parameters |
| utm_params | JSONB | | UTM tracking parameters |
| link_label | VARCHAR(255) | | Partner's label (e.g., 'Blog Post CTA') |
| content_piece_id | INTEGER | FK content_pieces | Associated content |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

**Business Rules:**
- short_code generates final URL: `https://track.example.com/{short_code}`
- full_url includes destination + tracking parameters
- Partners can create multiple links for different contexts

**JSONB Examples:**
```json
// custom_params
{
  "content_type": "blog",
  "article_id": "how-to-guide-123",
  "placement": "hero-cta"
}

// utm_params
{
  "utm_source": "partner_blog",
  "utm_medium": "referral",
  "utm_campaign": "summer_sale",
  "utm_content": "hero_banner"
}
```

---

### cookies
Browser tracking identifiers for attribution.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| cookie_id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique cookie identifier |
| first_click_id | BIGINT | FK clicks | First recorded click |
| last_click_id | BIGINT | FK clicks | Most recent click |
| first_partner_id | INTEGER | FK partners | First partner in journey |
| last_partner_id | INTEGER | FK partners | Most recent partner |
| last_campaign_version_id | INTEGER | FK campaign_versions | Most recent campaign |
| user_fingerprint | VARCHAR(255) | | Browser fingerprint hash |
| expires_at | TIMESTAMP | NOT NULL | Cookie expiration |
| last_seen_at | TIMESTAMP | DEFAULT NOW() | Last activity timestamp |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- Created on first partner link click
- Updated on each subsequent click (last_* fields)
- Expires based on campaign cookie_duration_days
- Circular reference with clicks (resolved via ALTER after creation)

**Fingerprinting:**
- Combines IP, user agent, screen resolution, timezone
- Helps identify users across cookie deletion
- Privacy: Store hash, not raw data

---

### clicks
Individual click events on partner links.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| click_id | BIGSERIAL | PRIMARY KEY | Unique identifier |
| partner_link_id | INTEGER | FK partner_links, NOT NULL | Link that was clicked |
| cookie_id | UUID | FK cookies | Associated tracking cookie |
| ip_address | INET | | Visitor IP address |
| user_agent | TEXT | | Browser user agent string |
| referrer_url | TEXT | | Page where click originated |
| source_url | TEXT | | Partner's page with the link |
| utm_source | VARCHAR(255) | | UTM source parameter |
| utm_medium | VARCHAR(255) | | UTM medium parameter |
| utm_campaign | VARCHAR(255) | | UTM campaign parameter |
| utm_content | VARCHAR(255) | | UTM content parameter |
| utm_term | VARCHAR(255) | | UTM term parameter |
| country_code | CHAR(2) | | ISO country code (from IP) |
| device_type | VARCHAR(50) | | Device: desktop, mobile, tablet |
| browser | VARCHAR(100) | | Browser name and version |
| os | VARCHAR(100) | | Operating system |
| clicked_at | TIMESTAMP | DEFAULT NOW() | When click occurred |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |

**Business Rules:**
- High-volume table (millions of rows expected)
- Partition by month after reaching scale
- Geo/device data derived from IP/user_agent at insert time

**Privacy Considerations:**
- IP addresses may be PII in some jurisdictions
- Consider anonymizing (last octet) or truncating after N days
- GDPR: Implement right-to-delete process

---

### conversion_events
Tracked conversion actions (sales, signups, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| conversion_event_id | BIGSERIAL | PRIMARY KEY | Unique identifier |
| lead_id | BIGINT | FK leads | Associated lead (if applicable) |
| conversion_event_type_id | INTEGER | FK conversion_event_types, NOT NULL | Type of conversion |
| click_id | BIGINT | FK clicks | Attributed click |
| cookie_id | UUID | FK cookies | Tracking cookie |
| partner_id | INTEGER | FK partners, NOT NULL | Credited partner |
| campaign_version_id | INTEGER | FK campaign_versions, NOT NULL | Campaign version |
| reward_id | INTEGER | FK rewards | Applied reward |
| attribution_type | VARCHAR(50) | NOT NULL | first_click, last_click, linear, time_decay |
| attribution_confidence | VARCHAR(50) | DEFAULT 'high' | Confidence: high, medium, low |
| transaction_id | VARCHAR(255) | | External transaction reference |
| customer_email | VARCHAR(255) | | Customer email (PII) |
| customer_id | VARCHAR(255) | | Vendor's customer ID |
| event_value | DECIMAL(10,2) | | Sale amount or event value |
| commission_amount | DECIMAL(10,2) | | Calculated commission earned |
| commission_type | VARCHAR(50) | | Type used: percentage, flat |
| commission_value | DECIMAL(10,2) | | Rate/amount used |
| status | VARCHAR(50) | DEFAULT 'pending' | Status: pending, approved, rejected, paid |
| occurred_at | TIMESTAMP | DEFAULT NOW() | When event actually happened |
| recorded_at | TIMESTAMP | DEFAULT NOW() | When event was recorded in system |
| approved_at | TIMESTAMP | | When approved for payout |
| rejected_at | TIMESTAMP | | When rejected |
| rejection_reason | TEXT | | Why rejected (fraud, return, etc.) |
| metadata | JSONB | | Additional event data |
| funnel_journey_id | INTEGER | FK funnel_journeys | Complete customer journey |
| applied_commission_rule_id | INTEGER | FK commission_rules | Rule that calculated commission |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |

**Business Rules:**
- Status lifecycle: pending → approved → paid (or rejected)
- Cannot delete approved events (soft delete only)
- commission_amount is calculated, not user-input
- occurred_at may differ from recorded_at (webhook delays)

**Metadata Example:**
```json
{
  "product_ids": [123, 456],
  "order_number": "ORD-2024-5678",
  "is_first_purchase": true,
  "coupon_code": "SAVE20"
}
```

---

### touches
Individual touchpoints in multi-touch attribution.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| touch_id | BIGSERIAL | PRIMARY KEY | Unique identifier |
| conversion_event_id | BIGINT | FK conversion_events | Parent conversion |
| lead_id | BIGINT | FK leads | Associated lead |
| click_id | BIGINT | FK clicks | Click that generated touch |
| cookie_id | UUID | FK cookies | Tracking cookie |
| partner_id | INTEGER | FK partners, NOT NULL | Partner credited |
| campaign_version_id | INTEGER | FK campaign_versions, NOT NULL | Campaign version |
| touch_type | VARCHAR(50) | NOT NULL | Type: first, middle, last, only |
| touch_value | DECIMAL(10,2) | | Attribution credit amount |
| attribution_type | VARCHAR(50) | NOT NULL | Model used |
| attribution_confidence | VARCHAR(50) | DEFAULT 'high' | Confidence level |
| metadata | JSONB | DEFAULT '{}' | Additional touch data |
| occurred_at | TIMESTAMP | DEFAULT NOW() | When touch happened |
| recorded_at | TIMESTAMP | DEFAULT NOW() | When recorded |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

**Business Rules:**
- Sum of touch_value across all touches for a conversion = total commission
- Allows recalculating attribution without losing click history
- touch_type helps in analyzing journey patterns

**Attribution Examples:**
```
Journey: Partner A (click 1) → Partner B (click 2) → Partner A (click 3) → Conversion

First-touch: 
  - Touch 1: Partner A = 100% of commission

Last-touch:
  - Touch 3: Partner A = 100% of commission

Linear:
  - Touch 1: Partner A = 33.33%
  - Touch 2: Partner B = 33.33%
  - Touch 3: Partner A = 33.33%
```

---

### funnel_journeys
Complete customer journey from first click to conversion.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| funnel_journey_id | SERIAL | PRIMARY KEY | Unique identifier |
| cookie_id | UUID | FK cookies, NOT NULL, UNIQUE | One journey per cookie |
| partner_id | INTEGER | FK partners, NOT NULL | Primary credited partner |
| campaign_version_id | INTEGER | FK campaign_versions, NOT NULL | Primary campaign |
| customer_id | VARCHAR(255) | | Identified customer |
| customer_email | VARCHAR(255) | | Customer email |
| session_id | UUID | | Browser session identifier |
| journey_started_at | TIMESTAMP | NOT NULL | First interaction |
| journey_completed_at | TIMESTAMP | | When converted (if applicable) |
| last_event_at | TIMESTAMP | NOT NULL | Most recent activity |
| total_events | INTEGER | DEFAULT 0 | Number of events in journey |
| total_commission | DECIMAL(10,2) | DEFAULT 0 | Total commission from journey |
| furthest_stage_id | INTEGER | FK conversion_event_types | Deepest funnel stage reached |
| is_converted | BOOLEAN | DEFAULT FALSE | Whether journey resulted in conversion |
| events_sequence | JSONB | DEFAULT '[]' | Ordered list of events |
| attribution_map | JSONB | DEFAULT '{}' | Attribution breakdown |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

**Business Rules:**
- One journey per cookie (unique constraint)
- Journey "completes" when conversion occurs
- Can have multiple events without conversion (abandoned journeys)

**JSONB Examples:**
```json
// events_sequence
[
  {"type": "click", "partner_id": 123, "timestamp": "2024-01-15T10:00:00Z"},
  {"type": "page_view", "page": "product", "timestamp": "2024-01-15T10:01:00Z"},
  {"type": "add_to_cart", "value": 99.99, "timestamp": "2024-01-15T10:05:00Z"},
  {"type": "conversion", "value": 99.99, "timestamp": "2024-01-15T10:10:00Z"}
]

// attribution_map
{
  "partner_123": {"weight": 0.6, "commission": 5.94},
  "partner_456": {"weight": 0.4, "commission": 3.96}
}
```

**Analytics Use:**
- Analyze funnel drop-off points
- Identify high-converting journey patterns
- Calculate average time-to-conversion
- A/B test different attribution models

---

### conversion_event_types
Catalog of trackable conversion events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| conversion_event_type_id | SERIAL | PRIMARY KEY | Unique identifier |
| name | VARCHAR(100) | UNIQUE, NOT NULL | System name: sale, signup, trial_start |
| display_name | VARCHAR(255) | NOT NULL | Human-readable name: "Completed Sale" |
| description | TEXT | | Detailed description |
| is_commissionable | BOOLEAN | DEFAULT FALSE | Whether this event earns commission |
| default_commission_type | VARCHAR(50) | | Default type for this event |
| default_commission_value | DECIMAL(10,2) | | Default rate/amount |
| sort_order | INTEGER | DEFAULT 0 | Display order in UI |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

**Business Rules:**
- Only commissionable events generate payouts
- Campaigns can override defaults for specific event types
- Non-commissionable events still tracked for funnel analysis

**Common Event Types:**
```
| name | display_name | is_commissionable |
|------|--------------|-------------------|
| click | Link Click | false |
| page_view | Page View | false |
| signup | User Signup | true |
| trial_start | Trial Started | true |
| sale | Completed Sale | true |
| subscription | Subscription | true |
| upgrade | Plan Upgrade | true |
| lead_form | Lead Form Submitted | true |
```

---

## Commission & Payouts

### rewards
Reusable reward definitions applied across campaigns.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| reward_id | SERIAL | PRIMARY KEY | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Reward name: "10% Standard Commission" |
| reward_type | VARCHAR(20) | NOT NULL | Type: flat, percentage |
| reward_value | DECIMAL(10,2) | | Value: 10.00 for 10% or $10.00 flat |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- Rewards are templates; campaigns reference them
- Can be reused across multiple campaigns
- Changing reward doesn't affect historical conversions

**Usage:**
- Campaign default: "All partners get Standard 10% Reward"
- Tier-based: "Gold tier partners get Premium 15% Reward"
- Milestone: "100 sales unlocks Bonus $500 Reward"

---

### commission_rules
Business logic rules for dynamic commission calculation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| commission_rule_id | SERIAL | PRIMARY KEY | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Rule name: "Holiday Bonus Rule" |
| description | TEXT | | Detailed explanation |
| active | BOOLEAN | DEFAULT TRUE | Whether rule is currently active |
| conditions | JSONB | NOT NULL | When rule applies |
| actions | JSONB | NOT NULL | What rule does |
| valid_from | TIMESTAMP | DEFAULT NOW() | Rule start date |
| valid_until | TIMESTAMP | | Rule end date (optional) |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

**Business Rules:**
- Rules evaluated in order (lower commission_rule_id first)
- First matching rule wins (or sum all, depending on implementation)
- Active + valid dates must all be true to apply

**JSONB Examples:**
```json
// Example 1: Holiday bonus
{
  "conditions": {
    "date_range": {"start": "2024-12-01", "end": "2024-12-31"},
    "min_event_value": 100
  },
  "actions": {
    "commission_multiplier": 1.5,
    "bonus_flat": 10
  }
}

// Example 2: High-value customer bonus
{
  "conditions": {
    "customer_lifetime_value_min": 1000,
    "event_types": ["sale", "subscription"]
  },
  "actions": {
    "commission_type": "percentage",
    "commission_value": 15
  }
}

// Example 3: First-time buyer bonus
{
  "conditions": {
    "is_first_purchase": true,
    "partner_tiers": ["gold", "platinum"]
  },
  "actions": {
    "bonus_flat": 25
  }
}
```

**Implementation Note:**
- Application layer evaluates JSONB conditions
- Consider creating a rule engine abstraction
- Log which rule was applied in `conversion_events.applied_commission_rule_id`

---

### event_commission_snapshots
Historical record of commission calculations (audit trail).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| event_commission_snapshot_id | SERIAL | PRIMARY KEY | Unique identifier |
| conversion_event_id | BIGINT | FK conversion_events, NOT NULL | Related conversion |
| commission_type | VARCHAR(50) | | Type used at calculation time |
| commission_value | DECIMAL(10,2) | | Rate/amount used |
| commission_amount | DECIMAL(10,2) | | Final calculated amount |
| partner_id | INTEGER | FK partners, NOT NULL | Partner credited |
| campaign_version_id | INTEGER | FK campaign_versions, NOT NULL | Campaign version |
| reward_id | INTEGER | FK rewards | Reward applied (if any) |
| commission_rule_id | INTEGER | FK commission_rules | Rule applied (if any) |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | When snapshot was taken |

**Business Rules:**
- Immutable once created (insert-only)
- Created when conversion is approved
- Provides proof of commission calculation for disputes

**Use Cases:**
- "Why did I get $5 instead of $10?"
- Audit compliance: prove commission was correct at time of conversion
- Recalculation: compare old vs new calculation logic

---

### payouts
Batch payments to partners.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| payout_id | SERIAL | PRIMARY KEY | Unique identifier |
| partner_id | INTEGER | FK partners, NOT NULL | Partner receiving payout |
| partner_payment_method_id | INTEGER | FK partner_payment_methods, NOT NULL | Payment method used |
| amount | DECIMAL(10,2) | NOT NULL | Total payout amount |
| currency | CHAR(3) | DEFAULT 'USD' | Currency code (ISO 4217) |
| payment_provider_id | INTEGER | FK payment_providers, NOT NULL | Provider used (PayPal, Stripe, etc.) |
| provider_transaction_id | VARCHAR(255) | | Provider's transaction ID |
| provider_response | JSONB | | Full API response from provider |
| status | VARCHAR(50) | DEFAULT 'pending' | Status: pending, processing, completed, failed |
| start_date | TIMESTAMP | NOT NULL | Period start date |
| end_date | TIMESTAMP | NOT NULL | Period end date |
| created_at | TIMESTAMP | DEFAULT NOW() | When payout was initiated |
| processed_at | TIMESTAMP | | When sent to payment provider |
| completed_at | TIMESTAMP | | When provider confirmed success |
| failed_at | TIMESTAMP | | When provider reported failure |
| failure_reason | TEXT | | Provider error message |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |

**Business Rules:**
- Status lifecycle: pending → processing → completed/failed
- Cannot delete completed payouts (accounting requirement)
- Amount must match sum of included conversion_events

**Typical Flow:**
1. System generates payout for partner for date range
2. Admin reviews and approves (status → processing)
3. System calls payment provider API
4. Provider confirms (status → completed) or fails (status → failed)
5. Retry failed payouts or manual intervention

---

### payout_events
Junction table linking payouts to specific conversion events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| payout_id | INTEGER | FK payouts, PK | Payout reference |
| conversion_event_id | BIGINT | FK conversion_events, PK | Conversion included in payout |
| commission_amount | DECIMAL(10,2) | NOT NULL | Commission for this event |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |

**Business Rules:**
- Composite primary key ensures no duplicate inclusions
- sum(commission_amount) must equal payouts.amount
- Conversion can only be included in one payout

**Query Example:**
```sql
-- Get all conversions in a payout
SELECT ce.*, pe.commission_amount
FROM payout_events pe
JOIN conversion_events ce ON ce.conversion_event_id = pe.conversion_event_id
WHERE pe.payout_id = 12345;

-- Verify payout total
SELECT 
  p.amount as payout_amount,
  SUM(pe.commission_amount) as events_total,
  p.amount - SUM(pe.commission_amount) as difference
FROM payouts p
LEFT JOIN payout_events pe ON pe.payout_id = p.payout_id
WHERE p.payout_id = 12345
GROUP BY p.payout_id, p.amount;
```

---

## Supporting Tables

### payment_providers
Available payment methods (PayPal, Stripe, Wire Transfer, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| payment_provider_id | SERIAL | PRIMARY KEY | Unique identifier |
| name | VARCHAR(50) | UNIQUE, NOT NULL | System name: paypal, stripe, wire |
| display_name | VARCHAR(100) | NOT NULL | Display name: "PayPal", "Bank Wire" |
| is_active | BOOLEAN | DEFAULT TRUE | Whether currently accepting new accounts |
| config | JSONB | | Provider-specific configuration |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- Deactivating provider doesn't affect existing payment methods
- Config stores API keys, webhook secrets, etc. (encrypted)

**Config Examples:**
```json
// PayPal
{
  "api_mode": "live",
  "client_id": "encrypted_value",
  "client_secret": "encrypted_value",
  "webhook_id": "WH-xxxxx",
  "fee_percentage": 2.9,
  "fee_fixed": 0.30
}

// Stripe
{
  "api_mode": "live",
  "api_key": "encrypted_value",
  "webhook_secret": "whsec_xxxxx"
}

// Wire Transfer
{
  "manual_processing": true,
  "requires_review": true
}
```

---

### partner_payment_methods
Partner's configured payment methods.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| partner_payment_method_id | SERIAL | PRIMARY KEY | Unique identifier |
| partner_id | INTEGER | FK partners, NOT NULL | Payment method owner |
| payment_provider_id | INTEGER | FK payment_providers, NOT NULL | Provider (PayPal, Stripe, etc.) |
| provider_account_id | VARCHAR(255) | | Account ID at provider |
| account_details | JSONB | | Provider-specific details |
| is_default | BOOLEAN | DEFAULT FALSE | Default method for payouts |
| is_verified | BOOLEAN | DEFAULT FALSE | Whether verified by provider |
| verified_at | TIMESTAMP | | When verification completed |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- Partner can have multiple payment methods
- Only one can be is_default=true per partner
- Must be verified before use in payouts
- Unique constraint on (partner_id, provider_id, provider_account_id)

**Account Details Examples:**
```json
// PayPal
{
  "email": "partner@example.com",
  "account_type": "business"
}

// Stripe
{
  "account_id": "acct_xxxxx",
  "country": "US"
}

// Wire Transfer
{
  "bank_name": "Chase Bank",
  "account_number": "****5678",
  "routing_number": "021000021",
  "account_holder": "Jane Partner LLC",
  "swift_code": "CHASUS33"
}
```

---

### leads
Potential customers generated by partners.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| lead_id | BIGSERIAL | PRIMARY KEY | Unique identifier |
| external_lead_id | VARCHAR(255) | UNIQUE, NOT NULL | Vendor's lead ID |
| partner_id | INTEGER | FK partners | Partner who generated lead |
| vendor_id | INTEGER | FK vendors | Vendor who received lead |
| first_name | VARCHAR(255) | | Lead's first name |
| last_name | VARCHAR(255) | | Lead's last name |
| email | VARCHAR(255) | | Lead's email (PII) |
| phone | VARCHAR(50) | | Lead's phone (PII) |
| status | VARCHAR(50) | DEFAULT 'new' | Status: new, contacted, qualified, converted, lost |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- external_lead_id must be unique (vendor's system ID)
- Lead can be associated with multiple touches/conversions
- PII fields: implement encryption and retention policies

**Use Cases:**
- Lead generation campaigns (not just sales)
- Connect form submissions to eventual conversions
- Track lead-to-customer conversion rate by partner

---

### content_pieces
Marketing content created by partners.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| content_piece_id | SERIAL | PRIMARY KEY | Unique identifier |
| partner_id | INTEGER | FK partners | Content creator |
| external_reference | TEXT | | URL, S3 path, or other reference |
| description | TEXT | | Content description |
| metadata | JSONB | | Additional content info |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- Optional: not all partners create formal content
- Used for tracking which content drives conversions
- Can be linked to multiple partner_links

**Metadata Example:**
```json
{
  "content_type": "blog_post",
  "title": "Top 10 Project Management Tools for 2024",
  "url": "https://partner-blog.com/pm-tools-2024",
  "publish_date": "2024-01-15",
  "views": 15000,
  "social_shares": 234
}
```

---

### integrations
Third-party integrations for event tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| integration_id | SERIAL | PRIMARY KEY | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Integration name: "Shopify", "Stripe" |
| type | VARCHAR(50) | NOT NULL | Type: webhook, api, plugin |
| config | JSONB | | Integration-specific configuration |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- Integrations push conversion events to platform
- Config stores API keys, webhook URLs, etc.

**Config Example:**
```json
// Shopify Integration
{
  "shop_domain": "mystore.myshopify.com",
  "api_key": "encrypted_value",
  "api_secret": "encrypted_value",
  "webhook_url": "https://api.affiliate-platform.com/webhooks/shopify",
  "events": ["order_created", "order_updated"]
}
```

---

### integration_event_mappings
Maps integration events to conversion event types.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| integration_event_mapping_id | SERIAL | PRIMARY KEY | Unique identifier |
| integration_id | INTEGER | FK integrations | Source integration |
| campaign_version_id | INTEGER | FK campaign_versions | Target campaign |
| event_name | VARCHAR(255) | NOT NULL | Integration's event name |
| mapping_config | JSONB | | How to map event data |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- Translates integration events to conversion_events
- Different campaigns may handle same event differently

**Mapping Config Example:**
```json
{
  "conversion_event_type_id": 5,
  "field_mappings": {
    "customer_email": "$.customer.email",
    "event_value": "$.total_price",
    "transaction_id": "$.order_number"
  },
  "conditions": {
    "min_value": 50,
    "excluded_tags": ["test", "internal"]
  }
}
```

---

### campaign_milestones
Achievement-based bonuses for partners.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| campaign_milestone_id | SERIAL | PRIMARY KEY | Unique identifier |
| campaign_version_id | INTEGER | FK campaign_versions | Parent campaign |
| reward_id | INTEGER | FK rewards | Reward when milestone achieved |
| name | VARCHAR(255) | NOT NULL | Milestone name: "100 Sales Club" |
| description | TEXT | | Detailed description |
| event_type | VARCHAR(50) | | Event type to count: sale, signup, etc. |
| target_count | INTEGER | | Number required: 100, 500, 1000 |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Business Rules:**
- One-time bonus when partner reaches target
- Track achievement in conversion_events with milestone flag
- Can have multiple milestones per campaign

**Examples:**
```
"First Sale Bonus": 1 sale → $50
"Century Club": 100 sales → $1000
"Top Performer": 500 sales → $5000 + tier upgrade
```

---

### audit_logs
Comprehensive audit trail for compliance and debugging.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| audit_log_id | BIGSERIAL | PRIMARY KEY | Unique identifier |
| entity_type | VARCHAR(50) | NOT NULL | Table name: partners, conversions, etc. |
| entity_id | BIGINT | NOT NULL | Record ID |
| action | VARCHAR(50) | NOT NULL | Action: create, update, delete, approve |
| actor_type | VARCHAR(50) | | Who did it: vendor_user, partner, system |
| actor_id | INTEGER | | ID of actor |
| changes | JSONB | | Before/after values |
| reason | TEXT | | Optional reason for change |
| ip_address | INET | | IP address of actor |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| deleted_at | TIMESTAMP | | When record was soft deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | When action occurred |

**Business Rules:**
- Insert-only (never update or delete)
- Log all sensitive operations (approvals, rejections, payouts)
- Required for SOX/GDPR compliance

**Changes JSONB Example:**
```json
{
  "before": {
    "status": "pending",
    "commission_value": 10.00
  },
  "after": {
    "status": "approved",
    "commission_value": 15.00
  },
  "changed_fields": ["status", "commission_value"]
}
```

**Common Queries:**
```sql
-- Who approved this conversion?
SELECT * FROM audit_logs
WHERE entity_type = 'conversion_events'
  AND entity_id = 12345
  AND action = 'approve';

-- All changes to a partner's commission rates
SELECT * FROM audit_logs
WHERE entity_type = 'partner_campaign_overrides'
  AND entity_id IN (
    SELECT partner_campaign_override_id 
    FROM partner_campaign_overrides 
    WHERE partner_id = 789
  )
ORDER BY created_at DESC;

-- Payout audit trail
SELECT * FROM audit_logs
WHERE entity_type = 'payouts'
  AND entity_id = 456
ORDER BY created_at;
```

---

## Indexes Summary

### Critical Performance Indexes

```sql
-- Foreign key indexes (already created)
idx_leads_partner_id
idx_leads_vendor_id
idx_campaigns_vendor_id
idx_campaign_versions_campaign_id
idx_campaign_partners_partner_id
idx_partner_links_short_code
idx_clicks_cookie_id
idx_clicks_partner_link_id
idx_conversion_events_partner_id
idx_conversion_events_campaign_version_id
idx_touches_conversion_event_id
idx_touches_partner_campaign (composite)
idx_payouts_partner_id
idx_funnel_journeys_partner_id

-- Time-based indexes for reporting
idx_clicks_clicked_at
idx_conversion_events_occurred_at
idx_touches_occurred_at
idx_audit_logs_created_at

-- Status indexes for filtering
idx_campaign_partners_status
idx_conversion_events_status
idx_payouts_status
idx_cookies_expires_at

-- Specialized indexes
idx_funnel_journeys_is_converted
idx_leads_email
idx_audit_logs_entity (composite)
idx_touches_lead_campaign (composite)
```

---

## Common Query Patterns

### Partner Dashboard
```sql
-- Partner's performance summary
SELECT 
  cp.campaign_partner_id,
  cv.name as campaign_name,
  cp.total_clicks,
  cp.total_conversions,
  cp.total_commission_earned,
  cp.last_conversion_at
FROM campaign_partners cp
JOIN campaign_versions cv ON cv.campaign_version_id = cp.campaign_version_id
WHERE cp.partner_id = :partner_id
  AND cp.status = 'approved'
  AND cp.is_deleted = FALSE;
```

### Vendor Analytics
```sql
-- Top performing partners in campaign
SELECT 
  p.partner_id,
  p.name,
  p.tier,
  COUNT(DISTINCT ce.conversion_event_id) as conversion_count,
  SUM(ce.event_value) as total_revenue,
  SUM(ce.commission_amount) as total_commission,
  AVG(ce.commission_amount) as avg_commission
FROM partners p
JOIN conversion_events ce ON ce.partner_id = p.partner_id
JOIN campaign_versions cv ON cv.campaign_version_id = ce.campaign_version_id
WHERE cv.campaign_id = :campaign_id
  AND ce.status = 'approved'
  AND ce.occurred_at BETWEEN :start_date AND :end_date
GROUP BY p.partner_id, p.name, p.tier
ORDER BY total_revenue DESC
LIMIT 10;
```

### Payout Generation
```sql
-- Generate payout for partner
INSERT INTO payouts (
  partner_id, 
  partner_payment_method_id,
  amount, 
  payment_provider_id,
  start_date, 
  end_date
)
SELECT 
  :partner_id,
  ppm.partner_payment_method_id,
  SUM(ce.commission_amount),
  ppm.payment_provider_id,
  :start_date,
  :end_date
FROM conversion_events ce
JOIN partner_payment_methods ppm ON ppm.partner_id = ce.partner_id
WHERE ce.partner_id = :partner_id
  AND ce.status = 'approved'
  AND ce.occurred_at BETWEEN :start_date AND :end_date
  AND ce.conversion_event_id NOT IN (
    SELECT conversion_event_id FROM payout_events
  )
  AND ppm.is_default = TRUE
  AND ppm.is_verified = TRUE
GROUP BY ppm.partner_payment_method_id, ppm.payment_provider_id;
```

---

## Data Retention Policies

### Recommendations by Table

| Table | Retention | Rationale |
|-------|-----------|-----------|
| conversion_events | 7 years | Financial/tax compliance |
| payouts | 7 years | Financial/tax compliance |
| audit_logs | 7 years | Compliance |
| clicks | 2 years | Performance; archive older |
| touches | 2 years | Tied to clicks retention |
| cookies | 1 year + expiry | Privacy; delete expired |
| leads | Per GDPR request | PII - honor deletion requests |
| funnel_journeys | 2 years | Analytics; less critical |
| partner_links | Indefinite | Small table; keep for reference |
| campaign_versions | Indefinite | Historical reference |

### PII Handling

**Tables with PII:**
- `partners`: email, name
- `leads`: email, phone, name
- `conversion_events`: customer_email, customer_id
- `clicks`: ip_address
- `audit_logs`: ip_address

**GDPR Compliance Actions:**
1. Implement "right to deletion" process
2. Anonymize or delete PII after retention period
3. Encrypt PII at rest
4. Limit access via database roles
5. Log all PII access in audit_logs

---

## Database Maintenance

### Regular Tasks

**Daily:**
- Monitor slow query log
- Check replication lag (if using replicas)
- Verify backup completion

**Weekly:**
- Analyze query performance trends
- Review top 10 slowest queries
- Check table bloat

**Monthly:**
- VACUUM ANALYZE on large tables
- Review and optimize indexes
- Archive old click/touch data
- Generate performance reports

**Quarterly:**
- Partition large tables (clicks, conversion_events)
- Review and update statistics
- Audit data retention compliance
- Review and remove unused indexes

---

This data dictionary provides comprehensive documentation for every table in the affiliate tracking platform schema. Use it as a reference during development, onboarding new team members, and troubleshooting production issues.