-- =====================================================
-- MERGED AFFILIATE TRACKING PLATFORM DATABASE SCHEMA
-- Dependency-ordered with <tablename>_id convention
-- =====================================================

-- ====================================
-- LEVEL 1: Independent Base Tables
-- ====================================

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
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE partners (
    partner_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    tier VARCHAR(50) DEFAULT 'standard',
    bio TEXT,
    website_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE partner_types (
    partner_type_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_providers (
    payment_provider_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversion_event_types (
    conversion_event_type_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_commissionable BOOLEAN DEFAULT FALSE,
    default_commission_type VARCHAR(50),
    default_commission_value DECIMAL(10,2),
    sort_order INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rewards (
    reward_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    reward_type VARCHAR(20) NOT NULL, -- flat, percentage
    reward_value DECIMAL(10,2),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE integrations (
    integration_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- webhook, api, plugin
    config JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE commission_rules (
    commission_rule_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- LEVEL 2: Tables depending on Level 1
-- ====================================

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
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, email)
);

CREATE TABLE partner_partner_types (
    partner_id INTEGER NOT NULL REFERENCES partners(partner_id) ON DELETE CASCADE,
    partner_type_id INTEGER NOT NULL REFERENCES partner_types(partner_type_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (partner_id, partner_type_id)
);

CREATE TABLE partner_payment_methods (
    partner_payment_method_id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(partner_id) ON DELETE CASCADE,
    payment_provider_id INTEGER NOT NULL REFERENCES payment_providers(payment_provider_id),
    provider_account_id VARCHAR(255),
    account_details JSONB,
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(partner_id, payment_provider_id, provider_account_id)
);

CREATE TABLE leads (
    lead_id BIGSERIAL PRIMARY KEY,
    external_lead_id VARCHAR(255) UNIQUE NOT NULL,
    partner_id INTEGER REFERENCES partners(partner_id),
    vendor_id INTEGER REFERENCES vendors(vendor_id),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'new',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leads_partner_id ON leads(partner_id);
CREATE INDEX idx_leads_vendor_id ON leads(vendor_id);
CREATE INDEX idx_leads_email ON leads(email);

CREATE TABLE campaigns (
    campaign_id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    current_campaign_version_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_vendor_id ON campaigns(vendor_id);

CREATE TABLE content_pieces (
    content_piece_id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(partner_id),
    external_reference TEXT,
    description TEXT,
    metadata JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- LEVEL 3: Tables depending on Level 2
-- ====================================

CREATE TABLE campaign_versions (
    campaign_version_id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    destination_url TEXT NOT NULL,
    default_commission_type VARCHAR(50) NOT NULL, -- percentage, flat, tiered
    default_commission_value DECIMAL(10,2),
    cookie_duration_days INTEGER DEFAULT 30,
    approval_required BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    max_partners INTEGER,
    terms_url TEXT,
    promotional_guidelines TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, version_number)
);

CREATE INDEX idx_campaign_versions_campaign_id ON campaign_versions(campaign_id);

-- Now add the foreign key for current_campaign_version_id
ALTER TABLE campaigns
ADD CONSTRAINT fk_current_campaign_version 
FOREIGN KEY (current_campaign_version_id) REFERENCES campaign_versions(campaign_version_id);

-- ====================================
-- LEVEL 4: Tables depending on Level 3
-- ====================================

CREATE TABLE campaign_tiers (
    campaign_tier_id SERIAL PRIMARY KEY,
    campaign_version_id INTEGER NOT NULL REFERENCES campaign_versions(campaign_version_id) ON DELETE CASCADE,
    reward_id INTEGER REFERENCES rewards(reward_id),
    label VARCHAR(50) NOT NULL,
    min_amount DECIMAL(10,2) NOT NULL,
    max_amount DECIMAL(10,2) NOT NULL,
    reward_type VARCHAR(20) NOT NULL,
    reward_value DECIMAL(10,2) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaign_partners (
    campaign_partner_id SERIAL PRIMARY KEY,
    campaign_version_id INTEGER NOT NULL REFERENCES campaign_versions(campaign_version_id) ON DELETE CASCADE,
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
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_version_id, partner_id)
);

CREATE INDEX idx_campaign_partners_partner_id ON campaign_partners(partner_id);
CREATE INDEX idx_campaign_partners_status ON campaign_partners(status);

CREATE TABLE partner_campaign_overrides (
    partner_campaign_override_id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(partner_id) ON DELETE CASCADE,
    campaign_version_id INTEGER NOT NULL REFERENCES campaign_versions(campaign_version_id) ON DELETE CASCADE,
    conversion_event_type_id INTEGER REFERENCES conversion_event_types(conversion_event_type_id),
    commission_type VARCHAR(50) NOT NULL,
    commission_value DECIMAL(10,2) NOT NULL,
    notes TEXT,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(partner_id, campaign_version_id, conversion_event_type_id)
);

CREATE TABLE integration_event_mappings (
    integration_event_mapping_id SERIAL PRIMARY KEY,
    integration_id INTEGER REFERENCES integrations(integration_id),
    campaign_version_id INTEGER REFERENCES campaign_versions(campaign_version_id),
    event_name VARCHAR(255) NOT NULL,
    mapping_config JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaign_milestones (
    campaign_milestone_id SERIAL PRIMARY KEY,
    campaign_version_id INTEGER REFERENCES campaign_versions(campaign_version_id),
    reward_id INTEGER REFERENCES rewards(reward_id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50),
    target_count INTEGER,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cookies (
    cookie_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_click_id BIGINT,
    last_click_id BIGINT,
    first_partner_id INTEGER REFERENCES partners(partner_id),
    last_partner_id INTEGER REFERENCES partners(partner_id),
    last_campaign_version_id INTEGER REFERENCES campaign_versions(campaign_version_id),
    user_fingerprint VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cookies_expires_at ON cookies(expires_at);

-- ====================================
-- LEVEL 5: Tables depending on Level 4
-- ====================================

CREATE TABLE partner_links (
    partner_link_id SERIAL PRIMARY KEY,
    campaign_partner_id INTEGER NOT NULL REFERENCES campaign_partners(campaign_partner_id) ON DELETE CASCADE,
    short_code VARCHAR(50) UNIQUE NOT NULL,
    full_url TEXT NOT NULL,
    custom_params JSONB,
    utm_params JSONB,
    link_label VARCHAR(255),
    content_piece_id INTEGER REFERENCES content_pieces(content_piece_id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_partner_links_short_code ON partner_links(short_code);

CREATE TABLE funnel_journeys (
    funnel_journey_id SERIAL PRIMARY KEY,
    cookie_id UUID NOT NULL REFERENCES cookies(cookie_id),
    partner_id INTEGER NOT NULL REFERENCES partners(partner_id),
    campaign_version_id INTEGER NOT NULL REFERENCES campaign_versions(campaign_version_id),
    customer_id VARCHAR(255),
    customer_email VARCHAR(255),
    session_id UUID,
    journey_started_at TIMESTAMP NOT NULL,
    journey_completed_at TIMESTAMP,
    last_event_at TIMESTAMP NOT NULL,
    total_events INTEGER DEFAULT 0,
    total_commission DECIMAL(10,2) DEFAULT 0,
    furthest_stage_id INTEGER REFERENCES conversion_event_types(conversion_event_type_id),
    is_converted BOOLEAN DEFAULT FALSE,
    events_sequence JSONB DEFAULT '[]',
    attribution_map JSONB DEFAULT '{}',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cookie_id)
);

CREATE INDEX idx_funnel_journeys_partner_id ON funnel_journeys(partner_id);
CREATE INDEX idx_funnel_journeys_is_converted ON funnel_journeys(is_converted);

-- ====================================
-- LEVEL 6: Tables depending on Level 5
-- ====================================

CREATE TABLE clicks (
    click_id BIGSERIAL PRIMARY KEY,
    partner_link_id INTEGER NOT NULL REFERENCES partner_links(partner_link_id) ON DELETE CASCADE,
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
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_clicks_cookie_id ON clicks(cookie_id);
CREATE INDEX idx_clicks_partner_link_id ON clicks(partner_link_id);
CREATE INDEX idx_clicks_clicked_at ON clicks(clicked_at);

-- Now add the foreign key constraints for cookie click references
ALTER TABLE cookies
ADD CONSTRAINT fk_first_click FOREIGN KEY (first_click_id) REFERENCES clicks(click_id),
ADD CONSTRAINT fk_last_click FOREIGN KEY (last_click_id) REFERENCES clicks(click_id);

CREATE TABLE conversion_events (
    conversion_event_id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT REFERENCES leads(lead_id),
    conversion_event_type_id INTEGER NOT NULL REFERENCES conversion_event_types(conversion_event_type_id),
    click_id BIGINT REFERENCES clicks(click_id),
    cookie_id UUID REFERENCES cookies(cookie_id),
    partner_id INTEGER NOT NULL REFERENCES partners(partner_id),
    campaign_version_id INTEGER NOT NULL REFERENCES campaign_versions(campaign_version_id),
    reward_id INTEGER REFERENCES rewards(reward_id),
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
    metadata JSONB,
    funnel_journey_id INTEGER REFERENCES funnel_journeys(funnel_journey_id),
    applied_commission_rule_id INTEGER REFERENCES commission_rules(commission_rule_id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_conversion_events_partner_id ON conversion_events(partner_id);
CREATE INDEX idx_conversion_events_campaign_version_id ON conversion_events(campaign_version_id);
CREATE INDEX idx_conversion_events_status ON conversion_events(status);
CREATE INDEX idx_conversion_events_occurred_at ON conversion_events(occurred_at);

CREATE TABLE touches (
    touch_id BIGSERIAL PRIMARY KEY,
    conversion_event_id BIGINT REFERENCES conversion_events(conversion_event_id),
    lead_id BIGINT REFERENCES leads(lead_id),
    click_id BIGINT REFERENCES clicks(click_id),
    cookie_id UUID REFERENCES cookies(cookie_id),
    partner_id INTEGER NOT NULL REFERENCES partners(partner_id),
    campaign_version_id INTEGER NOT NULL REFERENCES campaign_versions(campaign_version_id),
    touch_type VARCHAR(50) NOT NULL,
    touch_value DECIMAL(10,2),
    attribution_type VARCHAR(50) NOT NULL,
    attribution_confidence VARCHAR(50) DEFAULT 'high',
    metadata JSONB DEFAULT '{}',
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_touches_lead_campaign ON touches(lead_id, campaign_version_id);
CREATE INDEX idx_touches_partner_campaign ON touches(partner_id, campaign_version_id);
CREATE INDEX idx_touches_occurred_at ON touches(occurred_at);
CREATE INDEX idx_touches_conversion_event_id ON touches(conversion_event_id);

CREATE TABLE payouts (
    payout_id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(partner_id),
    partner_payment_method_id INTEGER NOT NULL REFERENCES partner_payment_methods(partner_payment_method_id),
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'USD',
    payment_provider_id INTEGER NOT NULL REFERENCES payment_providers(payment_provider_id),
    provider_transaction_id VARCHAR(255),
    provider_response JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_payouts_partner_id ON payouts(partner_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- ====================================
-- LEVEL 7: Tables depending on Level 6
-- ====================================

CREATE TABLE event_commission_snapshots (
    event_commission_snapshot_id SERIAL PRIMARY KEY,
    conversion_event_id BIGINT NOT NULL REFERENCES conversion_events(conversion_event_id),
    commission_type VARCHAR(50),
    commission_value DECIMAL(10,2),
    commission_amount DECIMAL(10,2),
    partner_id INTEGER NOT NULL REFERENCES partners(partner_id),
    campaign_version_id INTEGER NOT NULL REFERENCES campaign_versions(campaign_version_id),
    reward_id INTEGER REFERENCES rewards(reward_id),
    commission_rule_id INTEGER REFERENCES commission_rules(commission_rule_id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payout_events (
    payout_id INTEGER NOT NULL REFERENCES payouts(payout_id) ON DELETE CASCADE,
    conversion_event_id BIGINT NOT NULL REFERENCES conversion_events(conversion_event_id),
    commission_amount DECIMAL(10,2) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    PRIMARY KEY (payout_id, conversion_event_id)
);

-- ====================================
-- LEVEL 8: Audit & Logging (no dependencies)
-- ====================================

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
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);