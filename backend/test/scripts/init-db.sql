-- ====================================================================
-- INITIALIZATION SQL
-- ====================================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- VENDORS & USERS
-- ============================================================

CREATE TABLE vendors (
  vendor_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  company_name VARCHAR(255),
  website_url TEXT,
  status VARCHAR(50) DEFAULT 'active',
  api_key VARCHAR(255) UNIQUE,
  webhook_secret VARCHAR(255),
  webhook_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendor_users (
  vendor_user_id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  status VARCHAR(50) DEFAULT 'active',
  invited_by INTEGER REFERENCES vendor_users(vendor_user_id),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(vendor_id, email)
);

CREATE INDEX idx_vendor_users_vendor_status ON vendor_users (vendor_id, status);

-- ============================================================
-- PARTNERS & PAYMENT
-- ============================================================

CREATE TABLE partners (
  partner_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  tier VARCHAR(50) DEFAULT 'standard',
  bio TEXT,
  website_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_providers (
  provider_id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE partner_payment_methods (
  partner_payment_method_id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES partners(partner_id) ON DELETE CASCADE,
  provider_id INTEGER NOT NULL REFERENCES payment_providers(provider_id),
  provider_account_id VARCHAR(255),
  account_details JSONB,
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(partner_id, provider_id, provider_account_id)
);

-- ============================================================
-- CAMPAIGNS & PARTICIPATION
-- ============================================================

CREATE TABLE campaigns (
  campaign_id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  destination_url TEXT NOT NULL,
  default_commission_type VARCHAR(50) NOT NULL,
  default_commission_value DECIMAL(10,2) NOT NULL,
  cookie_duration_days INTEGER DEFAULT 30,
  approval_required BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  max_affiliates INTEGER,
  terms_url TEXT,
  promotional_guidelines TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_vendor_status ON campaigns (vendor_id, status);
CREATE INDEX idx_campaigns_ispublic_status ON campaigns (is_public, status);

CREATE TABLE conversion_event_types (
  conversion_event_type_id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  is_commissionable BOOLEAN DEFAULT false,
  default_commission_type VARCHAR(50),
  default_commission_value DECIMAL(10,2),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaign_partners (
  campaign_partner_id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  partner_id INTEGER NOT NULL REFERENCES partners(partner_id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  application_note TEXT,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  approved_by INTEGER REFERENCES vendor_users(vendor_user_id),
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_commission_earned DECIMAL(10,2) DEFAULT 0,
  last_click_at TIMESTAMP,
  last_conversion_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_id, partner_id)
);

CREATE INDEX idx_campaign_partners_campaign_status ON campaign_partners (campaign_id, status);
CREATE INDEX idx_campaign_partners_partner_status ON campaign_partners (partner_id, status);

CREATE TABLE partner_campaign_overrides (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES partners(partner_id) ON DELETE CASCADE,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  event_type_id INTEGER REFERENCES conversion_event_types(conversion_event_type_id),
  commission_type VARCHAR(50) NOT NULL,
  commission_value DECIMAL(10,2) NOT NULL,
  notes TEXT,
  valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(partner_id, campaign_id, event_type_id)
);

CREATE TABLE partner_links (
  partner_link_id SERIAL PRIMARY KEY,
  campaign_partner_id INTEGER NOT NULL REFERENCES campaign_partners(campaign_partner_id) ON DELETE CASCADE,
  short_code VARCHAR(50) UNIQUE NOT NULL,
  custom_params JSONB,
  link_label VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_partner_links_short_code ON partner_links (short_code);

-- ============================================================
-- TRACKING
-- ============================================================

CREATE TABLE cookies (
  cookie_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_click_id BIGINT,
  last_click_id BIGINT,
  first_partner_id INTEGER REFERENCES partners(partner_id),
  last_partner_id INTEGER REFERENCES partners(partner_id),
  last_campaign_id INTEGER REFERENCES campaigns(campaign_id),
  user_fingerprint VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cookies_expires_at ON cookies (expires_at);
CREATE INDEX idx_cookies_last_partner_id ON cookies (last_partner_id);

CREATE TABLE clicks (
  click_id BIGSERIAL PRIMARY KEY,
  link_id INTEGER NOT NULL REFERENCES partner_links(partner_link_id) ON DELETE CASCADE,
  cookie_id UUID REFERENCES cookies(cookie_id),
  ip_address INET,
  user_agent TEXT,
  referrer_url TEXT,
  source_url TEXT,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  country_code CHAR(2),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clicks_link_clicked_at ON clicks (link_id, clicked_at);
CREATE INDEX idx_clicks_cookie_id ON clicks (cookie_id);
CREATE INDEX idx_clicks_clicked_at ON clicks (clicked_at);

ALTER TABLE cookies 
  ADD CONSTRAINT fk_first_click FOREIGN KEY (first_click_id) REFERENCES clicks(click_id),
  ADD CONSTRAINT fk_last_click FOREIGN KEY (last_click_id) REFERENCES clicks(click_id);

CREATE TABLE conversion_events (
  conversion_event_id BIGSERIAL PRIMARY KEY,
  event_type_id INTEGER NOT NULL REFERENCES conversion_event_types(conversion_event_type_id),
  click_id BIGINT REFERENCES clicks(click_id),
  cookie_id UUID REFERENCES cookies(cookie_id),
  partner_id INTEGER NOT NULL REFERENCES partners(partner_id),
  campaign_id INTEGER NOT NULL REFERENCES campaigns(campaign_id),
  attribution_type VARCHAR(50) NOT NULL,
  attribution_confidence VARCHAR(50) DEFAULT 'high',
  transaction_id VARCHAR(255),
  customer_email VARCHAR(255),
  customer_id VARCHAR(255),
  event_value DECIMAL(10,2),
  commission_amount DECIMAL(10,2),
  commission_type VARCHAR(50),
  commission_value DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  metadata JSONB
);

-- ============================================================
-- FUNNEL / ANALYTICS
-- ============================================================

CREATE MATERIALIZED VIEW funnel_journeys AS
SELECT
  c.cookie_id,
  cp.partner_id,
  cp.campaign_id,
  ce.customer_id,
  ce.customer_email,
  MIN(ce.occurred_at) AS journey_started_at,
  MAX(ce.occurred_at) AS last_event_at,
  MAX(ce.occurred_at) FILTER (WHERE ce.event_type_id = (SELECT MAX(conversion_event_type_id) FROM conversion_event_types)) AS journey_completed_at,
  COUNT(ce.*) AS total_events,
  SUM(ce.commission_amount) AS total_commission,
  MAX(ce.event_type_id) AS furthest_stage_id,
  MAX(ce.event_type_id) = (SELECT MAX(conversion_event_type_id) FROM conversion_event_types) AS is_converted
FROM cookies c
JOIN conversion_events ce ON ce.cookie_id = c.cookie_id
JOIN campaign_partners cp ON cp.campaign_id = ce.campaign_id AND cp.partner_id = ce.partner_id
GROUP BY c.cookie_id, cp.partner_id, cp.campaign_id;

CREATE INDEX idx_funnel_journeys_partner_converted ON funnel_journeys (partner_id, is_converted);

-- ============================================================
-- PAYOUTS & AUDIT
-- ============================================================

CREATE TABLE payouts (
  payout_id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES partners(partner_id),
  payment_method_id INTEGER NOT NULL REFERENCES partner_payment_methods(partner_payment_method_id),
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) DEFAULT 'USD',
  provider_id INTEGER NOT NULL REFERENCES payment_providers(provider_id),
  provider_transaction_id VARCHAR(255),
  provider_response JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT
);

CREATE TABLE payout_events (
  payout_id INTEGER NOT NULL REFERENCES payouts(payout_id) ON DELETE CASCADE,
  event_id BIGINT NOT NULL REFERENCES conversion_events(conversion_event_id),
  commission_amount DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (payout_id, event_id)
);

CREATE TABLE audit_logs (
  audit_log_id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  actor_type VARCHAR(50),
  actor_id INTEGER,
  changes JSONB,
  reason TEXT,
  ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DAILY STATS
-- ============================================================

CREATE TABLE campaign_daily_stats (
  id BIGSERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  total_clicks INTEGER DEFAULT 0,
  unique_cookies INTEGER DEFAULT 0,
  event_counts JSONB DEFAULT '{}',
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_commission DECIMAL(10,2) DEFAULT 0,
  active_partners INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_id, stat_date)
);

CREATE TABLE partner_daily_stats (
  id BIGSERIAL PRIMARY KEY,
  campaign_partner_id INTEGER NOT NULL REFERENCES campaign_partners(campaign_partner_id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  clicks INTEGER DEFAULT 0,
  unique_cookies INTEGER DEFAULT 0,
  event_counts JSONB DEFAULT '{}',
  revenue DECIMAL(10,2) DEFAULT 0,
  commission_earned DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_partner_id, stat_date)
);
