-- Affiliate Tracking Platform - Complete Database Schema
-- Pure CREATE statements (no migrations/alters)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE ENTITIES
-- =====================================================

-- Vendors (Advertisers/Merchants)
CREATE TABLE vendors (
    vendor_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    company_name VARCHAR(255),
    website_url TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    api_key VARCHAR(255) UNIQUE,
    webhook_secret VARCHAR(255),
    webhook_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Integration Event Mappings
CREATE TABLE integration_event_mappings (
    integration_event_mapping_id SERIAL PRIMARY KEY,
    integration_id INTEGER REFERENCES integrations(integration_id) ON DELETE CASCADE,
    campaign_version_id INTEGER REFERENCES campaign_versions(campaign_version_id),
    event_name VARCHAR(255) NOT NULL,
    mapping_config JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Campaign Milestones
CREATE TABLE campaign_milestones (
    campaign_milestone_id SERIAL PRIMARY KEY,
    campaign_version_id INTEGER REFERENCES campaign_versions(campaign_version_id) ON DELETE CASCADE,
    reward_id INTEGER REFERENCES rewards(reward_id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50),
    target_count INTEGER,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    audit_log_id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'approve', 'reject')),
    actor_type VARCHAR(50) CHECK (actor_type IN ('vendor_user', 'partner', 'system')),
    actor_id INTEGER,
    changes JSONB,
    reason TEXT,
    ip_address INET,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Add foreign key constraints to rewards table
ALTER TABLE campaign_tiers ADD CONSTRAINT fk_campaign_tiers_reward 
    FOREIGN KEY (reward_id) REFERENCES rewards(reward_id);

ALTER TABLE conversion_events ADD CONSTRAINT fk_conversion_events_reward 
    FOREIGN KEY (reward_id) REFERENCES rewards(reward_id);

ALTER TABLE conversion_events ADD CONSTRAINT fk_conversion_events_rule 
    FOREIGN KEY (applied_commission_rule_id) REFERENCES commission_rules(commission_rule_id);

ALTER TABLE conversion_events ADD CONSTRAINT fk_conversion_events_journey 
    FOREIGN KEY (funnel_journey_id) REFERENCES funnel_journeys(funnel_journey_id);

ALTER TABLE partner_campaign_overrides ADD CONSTRAINT fk_partner_overrides_event_type 
    FOREIGN KEY (conversion_event_type_id) REFERENCES conversion_event_types(conversion_event_type_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_users_updated_at BEFORE UPDATE ON vendor_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_versions_updated_at BEFORE UPDATE ON campaign_versions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_partners_updated_at BEFORE UPDATE ON campaign_partners 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cookies_updated_at BEFORE UPDATE ON cookies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_providers_updated_at BEFORE UPDATE ON payment_providers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_payment_methods_updated_at BEFORE UPDATE ON partner_payment_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_pieces_updated_at BEFORE UPDATE ON content_pieces 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_event_mappings_updated_at BEFORE UPDATE ON integration_event_mappings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_milestones_updated_at BEFORE UPDATE ON campaign_milestones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Partner Performance View
CREATE OR REPLACE VIEW partner_performance AS
SELECT 
    p.partner_id,
    p.name as partner_name,
    p.email as partner_email,
    p.tier,
    COUNT(DISTINCT cp.campaign_partner_id) as total_campaigns,
    SUM(cp.total_clicks) as total_clicks,
    SUM(cp.total_conversions) as total_conversions,
    SUM(cp.total_revenue) as total_revenue,
    SUM(cp.total_commission_earned) as total_commission_earned,
    MAX(cp.last_conversion_at) as last_conversion_at
FROM partners p
LEFT JOIN campaign_partners cp ON cp.partner_id = p.partner_id AND cp.is_deleted = FALSE
WHERE p.is_deleted = FALSE
GROUP BY p.partner_id, p.name, p.email, p.tier;

-- Campaign Performance View
CREATE OR REPLACE VIEW campaign_performance AS
SELECT 
    c.campaign_id,
    cv.campaign_version_id,
    cv.name as campaign_name,
    v.vendor_id,
    v.name as vendor_name,
    COUNT(DISTINCT cp.partner_id) as total_partners,
    SUM(cp.total_clicks) as total_clicks,
    SUM(cp.total_conversions) as total_conversions,
    SUM(cp.total_revenue) as total_revenue,
    SUM(cp.total_commission_earned) as total_commission_paid,
    cv.created_at as campaign_created_at
FROM campaigns c
JOIN campaign_versions cv ON cv.campaign_id = c.campaign_id
JOIN vendors v ON v.vendor_id = c.vendor_id
LEFT JOIN campaign_partners cp ON cp.campaign_version_id = cv.campaign_version_id AND cp.is_deleted = FALSE
WHERE c.is_deleted = FALSE AND cv.is_deleted = FALSE AND v.is_deleted = FALSE
GROUP BY c.campaign_id, cv.campaign_version_id, cv.name, v.vendor_id, v.name, cv.created_at;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default partner types
INSERT INTO partner_types (name, description) VALUES
    ('affiliate', 'Traditional affiliate marketers'),
    ('influencer', 'Social media influencers'),
    ('content_creator', 'Bloggers and content creators'),
    ('reseller', 'Product resellers');

-- Insert default conversion event types
INSERT INTO conversion_event_types (name, display_name, description, is_commissionable, default_commission_type, default_commission_value, sort_order) VALUES
    ('click', 'Link Click', 'User clicked on affiliate link', FALSE, NULL, NULL, 1),
    ('page_view', 'Page View', 'User viewed target page', FALSE, NULL, NULL, 2),
    ('signup', 'User Signup', 'User created an account', TRUE, 'flat', 5.00, 3),
    ('trial_start', 'Trial Started', 'User started free trial', TRUE, 'flat', 10.00, 4),
    ('sale', 'Completed Sale', 'User completed a purchase', TRUE, 'percentage', 10.00, 5),
    ('subscription', 'Subscription', 'User subscribed to service', TRUE, 'percentage', 20.00, 6),
    ('upgrade', 'Plan Upgrade', 'User upgraded their plan', TRUE, 'percentage', 15.00, 7),
    ('lead_form', 'Lead Form Submitted', 'User submitted lead form', TRUE, 'flat', 2.00, 8);

-- Insert default payment providers
INSERT INTO payment_providers (name, display_name, is_active, config) VALUES
    ('paypal', 'PayPal', TRUE, '{"manual_processing": false}'::jsonb),
    ('stripe', 'Stripe Connect', TRUE, '{"manual_processing": false}'::jsonb),
    ('wire', 'Bank Wire Transfer', TRUE, '{"manual_processing": true, "requires_review": true}'::jsonb);

-- Insert default rewards
INSERT INTO rewards (name, reward_type, reward_value) VALUES
    ('Standard 10% Commission', 'percentage', 10.00),
    ('Premium 15% Commission', 'percentage', 15.00),
    ('VIP 20% Commission', 'percentage', 20.00),
    ('Flat $5 Bonus', 'flat', 5.00),
    ('Flat $10 Bonus', 'flat', 10.00),
    ('Flat $50 Bonus', 'flat', 50.00);

-- Create indexes for performance
CREATE INDEX idx_conversion_events_partner_date ON conversion_events(partner_id, occurred_at) WHERE is_deleted = FALSE;
CREATE INDEX idx_clicks_partner_link_date ON clicks(partner_link_id, clicked_at) WHERE is_deleted = FALSE;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO affiliate_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO affiliate_user;d_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vendors_email ON vendors(email) WHERE is_deleted = FALSE;
CREATE INDEX idx_vendors_api_key ON vendors(api_key) WHERE is_deleted = FALSE;

-- Partners (Affiliates/Influencers)
CREATE TABLE partners (
    partner_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
    tier VARCHAR(50) DEFAULT 'standard' CHECK (tier IN ('standard', 'bronze', 'silver', 'gold', 'platinum')),
    bio TEXT,
    website_url TEXT,
    oauth_provider VARCHAR(50),
    oauth_provider_id VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_partners_email ON partners(email) WHERE is_deleted = FALSE;
CREATE INDEX idx_partners_tier ON partners(tier);
CREATE INDEX idx_partners_oauth ON partners(oauth_provider, oauth_provider_id);

-- Partner Types
CREATE TABLE partner_types (
    partner_type_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Partner to Partner Types (many-to-many)
CREATE TABLE partner_partner_types (
    partner_id INTEGER REFERENCES partners(partner_id) ON DELETE CASCADE,
    partner_type_id INTEGER REFERENCES partner_types(partner_type_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (partner_id, partner_type_id)
);

-- Vendor Users (Team members)
CREATE TABLE vendor_users (
    vendor_user_id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    invited_by INTEGER REFERENCES vendor_users(vendor_user_id),
    invited_at TIMESTAMP,
    joined_at TIMESTAMP,
    last_login_at TIMESTAMP,
    oauth_provider VARCHAR(50),
    oauth_provider_id VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (vendor_id, email)
);

CREATE INDEX idx_vendor_users_vendor ON vendor_users(vendor_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_vendor_users_email ON vendor_users(vendor_id, email);

-- =====================================================
-- CAMPAIGN MANAGEMENT
-- =====================================================

-- Campaigns (top-level marketing programs)
CREATE TABLE campaigns (
    campaign_id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    current_campaign_version_id INTEGER,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaigns_vendor ON campaigns(vendor_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Campaign Versions (versioned campaign details)
CREATE TABLE campaign_versions (
    campaign_version_id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    destination_url TEXT NOT NULL,
    default_commission_type VARCHAR(50) NOT NULL CHECK (default_commission_type IN ('percentage', 'flat', 'tiered')),
    default_commission_value DECIMAL(10,2),
    cookie_duration_days INTEGER DEFAULT 30,
    approval_required BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    max_partners INTEGER,
    terms_url TEXT,
    promotional_guidelines TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (campaign_id, version_number)
);

CREATE INDEX idx_campaign_versions_campaign ON campaign_versions(campaign_id);

-- Add foreign key back to campaigns after campaign_versions exists
ALTER TABLE campaigns ADD CONSTRAINT fk_campaigns_current_version 
    FOREIGN KEY (current_campaign_version_id) REFERENCES campaign_versions(campaign_version_id);

-- Campaign Tiers (for tiered commission structures)
CREATE TABLE campaign_tiers (
    campaign_tier_id SERIAL PRIMARY KEY,
    campaign_version_id INTEGER NOT NULL REFERENCES campaign_versions(campaign_version_id) ON DELETE CASCADE,
    reward_id INTEGER,
    label VARCHAR(50) NOT NULL,
    min_amount DECIMAL(10,2) NOT NULL,
    max_amount DECIMAL(10,2) NOT NULL,
    reward_type VARCHAR(20) NOT NULL CHECK (reward_type IN ('flat', 'percentage')),
    reward_value DECIMAL(10,2) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaign_tiers_version ON campaign_tiers(campaign_version_id);

-- Campaign Partners (partner enrollment)
CREATE TABLE campaign_partners (
    campaign_partner_id SERIAL PRIMARY KEY,
    campaign_version_id INTEGER NOT NULL REFERENCES campaign_versions(campaign_version_id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES partners(partner_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
    application_note TEXT,
    applied_at TIMESTAMP DEFAULT NOW(),
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (campaign_version_id, partner_id)
);

CREATE INDEX idx_campaign_partners_partner ON campaign_partners(partner_id);
CREATE INDEX idx_campaign_partners_status ON campaign_partners(status);
CREATE INDEX idx_campaign_partners_version ON campaign_partners(campaign_version_id);

-- Partner Campaign Overrides (custom commission rates)
CREATE TABLE partner_campaign_overrides (
    partner_campaign_override_id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(partner_id) ON DELETE CASCADE,
    campaign_version_id INTEGER NOT NULL REFERENCES campaign_versions(campaign_version_id) ON DELETE CASCADE,
    conversion_event_type_id INTEGER,
    commission_type VARCHAR(50) NOT NULL CHECK (commission_type IN ('percentage', 'flat')),
    commission_value DECIMAL(10,2) NOT NULL,
    notes TEXT,
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (partner_id, campaign_version_id, conversion_event_type_id)
);

CREATE INDEX idx_partner_overrides_partner ON partner_campaign_overrides(partner_id);
CREATE INDEX idx_partner_overrides_campaign ON partner_campaign_overrides(campaign_version_id);

-- =====================================================
-- TRACKING & ATTRIBUTION
-- =====================================================

-- Partner Links (trackable URLs)
CREATE TABLE partner_links (
    partner_link_id SERIAL PRIMARY KEY,
    campaign_partner_id INTEGER NOT NULL REFERENCES campaign_partners(campaign_partner_id) ON DELETE CASCADE,
    short_code VARCHAR(50) UNIQUE NOT NULL,
    full_url TEXT NOT NULL,
    custom_params JSONB,
    utm_params JSONB,
    link_label VARCHAR(255),
    content_piece_id INTEGER,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_partner_links_short_code ON partner_links(short_code) WHERE is_deleted = FALSE;
CREATE INDEX idx_partner_links_campaign_partner ON partner_links(campaign_partner_id);

-- Cookies (browser tracking)
CREATE TABLE cookies (
    cookie_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_click_id BIGINT,
    last_click_id BIGINT,
    first_partner_id INTEGER REFERENCES partners(partner_id),
    last_partner_id INTEGER REFERENCES partners(partner_id),
    last_campaign_version_id INTEGER REFERENCES campaign_versions(campaign_version_id),
    user_fingerprint VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    last_seen_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cookies_expires ON cookies(expires_at);
CREATE INDEX idx_cookies_last_partner ON cookies(last_partner_id);

-- Clicks (individual click events)
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
    clicked_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_clicks_partner_link ON clicks(partner_link_id);
CREATE INDEX idx_clicks_cookie ON clicks(cookie_id);
CREATE INDEX idx_clicks_clicked_at ON clicks(clicked_at);

-- Add circular FK constraints after both tables exist
ALTER TABLE cookies ADD CONSTRAINT fk_cookies_first_click FOREIGN KEY (first_click_id) REFERENCES clicks(click_id);
ALTER TABLE cookies ADD CONSTRAINT fk_cookies_last_click FOREIGN KEY (last_click_id) REFERENCES clicks(click_id);

-- Conversion Event Types
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
    created_at TIMESTAMP DEFAULT NOW()
);

-- Leads (potential customers)
CREATE TABLE leads (
    lead_id BIGSERIAL PRIMARY KEY,
    external_lead_id VARCHAR(255) UNIQUE NOT NULL,
    partner_id INTEGER REFERENCES partners(partner_id),
    vendor_id INTEGER REFERENCES vendors(vendor_id),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leads_partner ON leads(partner_id);
CREATE INDEX idx_leads_vendor ON leads(vendor_id);
CREATE INDEX idx_leads_email ON leads(email);

-- Conversion Events
CREATE TABLE conversion_events (
    conversion_event_id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT REFERENCES leads(lead_id),
    conversion_event_type_id INTEGER NOT NULL REFERENCES conversion_event_types(conversion_event_type_id),
    click_id BIGINT REFERENCES clicks(click_id),
    cookie_id UUID REFERENCES cookies(cookie_id),
    partner_id INTEGER NOT NULL REFERENCES partners(partner_id),
    campaign_version_id INTEGER NOT NULL REFERENCES campaign_versions(campaign_version_id),
    reward_id INTEGER,
    attribution_type VARCHAR(50) NOT NULL CHECK (attribution_type IN ('first_click', 'last_click', 'linear', 'time_decay')),
    attribution_confidence VARCHAR(50) DEFAULT 'high' CHECK (attribution_confidence IN ('high', 'medium', 'low')),
    transaction_id VARCHAR(255),
    customer_email VARCHAR(255),
    customer_id VARCHAR(255),
    event_value DECIMAL(10,2),
    commission_amount DECIMAL(10,2),
    commission_type VARCHAR(50),
    commission_value DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    occurred_at TIMESTAMP DEFAULT NOW(),
    recorded_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    metadata JSONB,
    funnel_journey_id INTEGER,
    applied_commission_rule_id INTEGER,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_conversion_events_partner ON conversion_events(partner_id);
CREATE INDEX idx_conversion_events_campaign ON conversion_events(campaign_version_id);
CREATE INDEX idx_conversion_events_status ON conversion_events(status);
CREATE INDEX idx_conversion_events_occurred_at ON conversion_events(occurred_at);
CREATE INDEX idx_conversion_events_transaction ON conversion_events(transaction_id, partner_id) WHERE transaction_id IS NOT NULL;

-- Unique constraint for idempotency
CREATE UNIQUE INDEX ux_conversion_transaction_partner ON conversion_events (transaction_id, partner_id) WHERE transaction_id IS NOT NULL AND is_deleted = FALSE;

-- Touches (multi-touch attribution)
CREATE TABLE touches (
    touch_id BIGSERIAL PRIMARY KEY,
    conversion_event_id BIGINT REFERENCES conversion_events(conversion_event_id),
    lead_id BIGINT REFERENCES leads(lead_id),
    click_id BIGINT REFERENCES clicks(click_id),
    cookie_id UUID REFERENCES cookies(cookie_id),
    partner_id INTEGER NOT NULL REFERENCES partners(partner_id),
    campaign_version_id INTEGER NOT NULL REFERENCES campaign_versions(campaign_version_id),
    touch_type VARCHAR(50) NOT NULL CHECK (touch_type IN ('first', 'middle', 'last', 'only')),
    touch_value DECIMAL(10,2),
    attribution_type VARCHAR(50) NOT NULL,
    attribution_confidence VARCHAR(50) DEFAULT 'high',
    metadata JSONB DEFAULT '{}',
    occurred_at TIMESTAMP DEFAULT NOW(),
    recorded_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_touches_conversion ON touches(conversion_event_id);
CREATE INDEX idx_touches_partner_campaign ON touches(partner_id, campaign_version_id);
CREATE INDEX idx_touches_occurred_at ON touches(occurred_at);

-- Funnel Journeys (complete customer journey)
CREATE TABLE funnel_journeys (
    funnel_journey_id SERIAL PRIMARY KEY,
    cookie_id UUID UNIQUE NOT NULL REFERENCES cookies(cookie_id),
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
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_funnel_journeys_partner ON funnel_journeys(partner_id);
CREATE INDEX idx_funnel_journeys_is_converted ON funnel_journeys(is_converted);

-- =====================================================
-- COMMISSION & PAYOUTS
-- =====================================================

-- Rewards (reusable commission definitions)
CREATE TABLE rewards (
    reward_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    reward_type VARCHAR(20) NOT NULL CHECK (reward_type IN ('flat', 'percentage')),
    reward_value DECIMAL(10,2),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Commission Rules (dynamic commission logic)
CREATE TABLE commission_rules (
    commission_rule_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Event Commission Snapshots (audit trail)
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
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_snapshots_conversion ON event_commission_snapshots(conversion_event_id);

-- Payment Providers
CREATE TABLE payment_providers (
    payment_provider_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Partner Payment Methods
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (partner_id, payment_provider_id, provider_account_id)
);

CREATE INDEX idx_payment_methods_partner ON partner_payment_methods(partner_id);

-- Payouts
CREATE TABLE payouts (
    payout_id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(partner_id),
    partner_payment_method_id INTEGER NOT NULL REFERENCES partner_payment_methods(partner_payment_method_id),
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'USD',
    payment_provider_id INTEGER NOT NULL REFERENCES payment_providers(payment_provider_id),
    provider_transaction_id VARCHAR(255),
    provider_response JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_payouts_partner ON payouts(partner_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- Payout Events (link payouts to conversions)
CREATE TABLE payout_events (
    payout_id INTEGER REFERENCES payouts(payout_id) ON DELETE CASCADE,
    conversion_event_id BIGINT REFERENCES conversion_events(conversion_event_id),
    commission_amount DECIMAL(10,2) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    PRIMARY KEY (payout_id, conversion_event_id)
);

-- =====================================================
-- SUPPORTING TABLES
-- =====================================================

-- Content Pieces
CREATE TABLE content_pieces (
    content_piece_id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(partner_id),
    external_reference TEXT,
    description TEXT,
    metadata JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE partner_links ADD CONSTRAINT fk_partner_links_content 
    FOREIGN KEY (content_piece_id) REFERENCES content_pieces(content_piece_id);

-- Integrations
CREATE TABLE integrations (
    integration_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('webhook', 'api', 'plugin')),
    config JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    delete