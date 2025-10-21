-- ====================================================================
-- TEST SEED DATA FOR AFFABLE PLATFORM
-- ====================================================================

-- Vendors
INSERT INTO vendors (name, email, company_name, website_url, api_key, webhook_secret)
VALUES
  ('Acme SaaS', 'owner@acme.io', 'Acme Inc.', 'https://acme.io', 'acme-api-key', 'secret-acme'),
  ('BrightTech', 'admin@brighttech.com', 'BrightTech LLC', 'https://brighttech.com', 'bright-api-key', 'secret-bright'),
  ('GrowthLabs', 'ceo@growthlabs.io', 'GrowthLabs', 'https://growthlabs.io', 'growth-api-key', 'secret-growth');

-- Vendor Users
INSERT INTO vendor_users (vendor_id, email, name, role, status)
VALUES
  (1, 'owner@acme.io', 'Alice Founder', 'owner', 'active'),
  (1, 'marketing@acme.io', 'Bob Marketer', 'admin', 'active'),
  (2, 'admin@brighttech.com', 'Charlie Admin', 'owner', 'active'),
  (3, 'ceo@growthlabs.io', 'Dana CEO', 'owner', 'active');

-- Partners
INSERT INTO partners (name, email, tier, bio, website_url, status)
VALUES
  ('John Influencer', 'john@example.com', 'standard', 'Tech content creator.', 'https://johnsblog.dev', 'active'),
  ('Mia Marketer', 'mia@example.com', 'premium', 'Affiliate marketing expert.', 'https://miamarketing.com', 'active'),
  ('Leo Creator', 'leo@example.com', 'vip', 'Runs SaaS growth community.', 'https://leocreator.io', 'active'),
  ('Ava Streamer', 'ava@example.com', 'standard', 'Live streams SaaS product demos.', 'https://twitch.tv/avastream', 'active');

-- Payment Providers
INSERT INTO payment_providers (name, display_name)
VALUES
  ('stripe', 'Stripe'),
  ('paypal', 'PayPal'),
  ('direct_deposit', 'Direct Deposit');

-- Partner Payment Methods
INSERT INTO partner_payment_methods (partner_id, provider_id, provider_account_id, is_default, is_verified)
VALUES
  (1, 1, 'acct_john_stripe', true, true),
  (2, 2, 'mia@paypal.com', true, true),
  (3, 3, 'leo_dd_001', true, false),
  (4, 1, 'acct_ava_stripe', true, true);

-- Campaigns
INSERT INTO campaigns (
  vendor_id, name, description, destination_url,
  default_commission_type, default_commission_value,
  approval_required, is_public, status
)
VALUES
  (1, 'Acme SaaS Launch', 'Promote our new SaaS platform.', 'https://acme.io/signup', 'percentage', 25.00, false, true, 'active'),
  (2, 'BrightTech Referral', 'Refer customers to BrightTech.', 'https://brighttech.com/demo', 'flat', 50.00, true, true, 'active'),
  (3, 'GrowthLabs Accelerator', 'Join our startup growth program.', 'https://growthlabs.io/apply', 'percentage', 15.00, false, true, 'active');

-- Campaign Partners
INSERT INTO campaign_partners (campaign_id, partner_id, status, total_clicks, total_conversions, total_revenue, total_commission_earned)
VALUES
  (1, 1, 'approved', 250, 15, 1200.00, 300.00),
  (1, 2, 'approved', 180, 12, 900.00, 225.00),
  (2, 3, 'approved', 90, 8, 400.00, 400.00),
  (3, 4, 'pending', 20, 0, 0, 0);

-- Partner Links
INSERT INTO partner_links (campaign_partner_id, short_code, link_label)
VALUES
  (1, 'acme-john', 'YouTube Link'),
  (2, 'acme-mia', 'Newsletter CTA'),
  (3, 'bright-leo', 'Growth Forum'),
  (4, 'growth-ava', 'Twitch Stream');

-- Conversion Event Types (if not already seeded)
INSERT INTO conversion_event_types (name, display_name, is_commissionable, sort_order)
VALUES
  ('click', 'Link Click', false, 1),
  ('purchase', 'Purchase', true, 2)
ON CONFLICT (name) DO NOTHING;

-- Conversion Events
INSERT INTO conversion_events (
  event_type_id, click_id, partner_id, campaign_id, attribution_type,
  transaction_id, customer_email, event_value, commission_amount, status
)
VALUES
  (2, NULL, 1, 1, 'last_click', 'txn_001', 'cust1@domain.com', 100.00, 25.00, 'approved'),
  (2, NULL, 2, 1, 'last_click', 'txn_002', 'cust2@domain.com', 75.00, 18.75, 'approved'),
  (2, NULL, 3, 2, 'last_click', 'txn_003', 'cust3@domain.com', 50.00, 50.00, 'approved');

-- Payouts
INSERT INTO payouts (partner_id, payment_method_id, provider_id, amount, status, period_start, period_end)
VALUES
  (1, 1, 1, 300.00, 'completed', '2025-09-01', '2025-09-30'),
  (2, 2, 2, 225.00, 'completed', '2025-09-01', '2025-09-30'),
  (3, 3, 3, 400.00, 'pending', '2025-09-01', '2025-09-30');

-- Payout Events
INSERT INTO payout_events (payout_id, event_id, commission_amount)
SELECT 1, conversion_event_id, commission_amount FROM conversion_events WHERE partner_id = 1;

-- Campaign Daily Stats
INSERT INTO campaign_daily_stats (campaign_id, stat_date, total_clicks, unique_cookies, total_revenue, total_commission, active_partners)
VALUES
  (1, '2025-10-09', 430, 350, 2100.00, 525.00, 2),
  (2, '2025-10-09', 90, 85, 400.00, 400.00, 1),
  (3, '2025-10-09', 20, 18, 0, 0, 1);

-- Partner Daily Stats
INSERT INTO partner_daily_stats (campaign_partner_id, stat_date, clicks, unique_cookies, revenue, commission_earned)
VALUES
  (1, '2025-10-09', 250, 200, 1200.00, 300.00),
  (2, '2025-10-09', 180, 150, 900.00, 225.00),
  (3, '2025-10-09', 90, 85, 400.00, 400.00);

-- Audit Logs
INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, reason)
VALUES
  ('campaign', 1, 'created', 'vendor_user', 1, 'Initial setup'),
  ('campaign_partner', 1, 'approved', 'vendor_user', 2, 'Top performer'),
  ('conversion_event', 1, 'approved', 'system', NULL, 'Auto-approved by rule engine');
