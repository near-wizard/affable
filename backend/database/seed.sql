-- Seed Data for Affiliate Tracking Platform
-- Realistic test data for development and testing

-- =====================================================
-- VENDORS
-- =====================================================

-- Password: TestPass123! (hashed with bcrypt)
-- Hash generated with: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy

INSERT INTO vendors (vendor_id, name, email, password_hash, company_name, website_url, status, api_key, webhook_secret, webhook_url) VALUES
    (1, 'TechSaaS Inc', 'admin@techsaas.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'TechSaaS Inc.', 'https://techsaas.com', 'active', 'vendor_api_key_techsaas_' || gen_random_uuid()::text, encode(gen_random_bytes(32), 'hex'), 'https://techsaas.com/webhooks/affiliate'),
    (2, 'EduPlatform', 'contact@eduplatform.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'EduPlatform LLC', 'https://eduplatform.com', 'active', 'vendor_api_key_eduplatform_' || gen_random_uuid()::text, encode(gen_random_bytes(32), 'hex'), 'https://eduplatform.com/api/webhooks'),
    (3, 'FitnessGear', 'partnerships@fitnessgear.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'FitnessGear Corp', 'https://fitnessgear.com', 'active', 'vendor_api_key_fitnessgear_' || gen_random_uuid()::text, encode(gen_random_bytes(32), 'hex'), NULL),
    (4, 'CloudStorage Pro', 'affiliates@cloudpro.io', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'CloudStorage Pro Inc', 'https://cloudpro.io', 'active', 'vendor_api_key_cloudpro_' || gen_random_uuid()::text, encode(gen_random_bytes(32), 'hex'), 'https://api.cloudpro.io/webhooks/conversions'),
    (5, 'DesignTools Studio', 'hello@designtools.studio', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'DesignTools Studio', 'https://designtools.studio', 'active', 'vendor_api_key_designtools_' || gen_random_uuid()::text, encode(gen_random_bytes(32), 'hex'), NULL);

-- Reset sequence
SELECT setval('vendors_vendor_id_seq', (SELECT MAX(vendor_id) FROM vendors));

-- =====================================================
-- VENDOR USERS
-- =====================================================

INSERT INTO vendor_users (vendor_id, email, password_hash, name, role, status, joined_at, last_login_at) VALUES
    (1, 'john.doe@techsaas.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'John Doe', 'owner', 'active', NOW() - INTERVAL '180 days', NOW() - INTERVAL '2 hours'),
    (1, 'sarah.manager@techsaas.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'Sarah Manager', 'admin', 'active', NOW() - INTERVAL '150 days', NOW() - INTERVAL '1 day'),
    (2, 'mike.founder@eduplatform.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'Mike Founder', 'owner', 'active', NOW() - INTERVAL '200 days', NOW() - INTERVAL '5 hours'),
    (3, 'lisa.owner@fitnessgear.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'Lisa Owner', 'owner', 'active', NOW() - INTERVAL '120 days', NOW() - INTERVAL '1 hour'),
    (4, 'alex.admin@cloudpro.io', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'Alex Admin', 'owner', 'active', NOW() - INTERVAL '90 days', NOW() - INTERVAL '3 hours'),
    (5, 'emma.ceo@designtools.studio', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'Emma CEO', 'owner', 'active', NOW() - INTERVAL '60 days', NOW() - INTERVAL '6 hours');

-- =====================================================
-- PARTNERS
-- =====================================================

INSERT INTO partners (partner_id, name, email, password_hash, status, tier, bio, website_url) VALUES
    (1, 'Tech Reviewer Pro', 'contact@techreviewerpro.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'platinum', 'Leading technology review website with 500K monthly visitors', 'https://techreviewerpro.com'),
    (2, 'Marketing Maven', 'hello@marketingmaven.io', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'gold', 'Digital marketing expert and educator', 'https://marketingmaven.io'),
    (3, 'Fitness Influencer Jane', 'jane@fitinfluencer.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'gold', 'Fitness coach with 200K Instagram followers', 'https://instagram.com/janefitness'),
    (4, 'StartupBlogger', 'admin@startupblogger.net', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'silver', 'Blog about startups and entrepreneurship', 'https://startupblogger.net'),
    (5, 'EduTech Reviews', 'team@edutechreviews.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'silver', 'Educational technology reviews and comparisons', 'https://edutechreviews.com'),
    (6, 'Design Community Hub', 'hello@designhub.community', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'bronze', 'Community of designers and creatives', 'https://designhub.community'),
    (7, 'ProductHunt Curator', 'curator@phhunter.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'bronze', 'Curating the best new products', 'https://phhunter.com'),
    (8, 'Cloud Computing Today', 'editor@cloudcomputingtoday.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'gold', 'News and reviews for cloud technologies', 'https://cloudcomputingtoday.com'),
    (9, 'Wellness Blogger', 'contact@wellnessblog.life', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'silver', 'Holistic wellness and healthy living', 'https://wellnessblog.life'),
    (10, 'Developer Tools Review', 'hello@devtoolsreview.dev', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'silver', 'Developer tools and software reviews', 'https://devtoolsreview.dev'),
    (11, 'SaaS Scout', 'team@saasscout.io', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'bronze', 'Discovering the best SaaS products', 'https://saasscout.io'),
    (12, 'YouTube Tech Channel', 'business@yttechchannel.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'platinum', 'Tech reviews on YouTube - 1M subscribers', 'https://youtube.com/techreviews'),
    (13, 'E-Learning Expert', 'contact@elearningexpert.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'gold', 'Online education and e-learning specialist', 'https://elearningexpert.edu'),
    (14, 'Productivity Guru', 'hello@productivityguru.pro', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'silver', 'Productivity tips and tool recommendations', 'https://productivityguru.pro'),
    (15, 'New Affiliate', 'newbie@newaffiliate.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILCbZEVmy', 'active', 'standard', 'Just getting started with affiliate marketing', 'https://newaffiliate.com');

SELECT setval('partners_partner_id_seq', (SELECT MAX(partner_id) FROM partners));

-- Assign partner types
INSERT INTO partner_partner_types (partner_id, partner_type_id) VALUES
    (1, 1), (1, 3), -- Tech Reviewer Pro: affiliate, content_creator
    (2, 2), (2, 3), -- Marketing Maven: influencer, content_creator
    (3, 2), -- Fitness Influencer: influencer
    (4, 3), -- StartupBlogger: content_creator
    (5, 1), (5, 3), -- EduTech Reviews: affiliate, content_creator
    (6, 3), -- Design Community: content_creator
    (7, 1), -- ProductHunt Curator: affiliate
    (8, 1), (8, 3), -- Cloud Computing Today: affiliate, content_creator
    (9, 2), (9, 3), -- Wellness Blogger: influencer, content_creator
    (10, 1), (10, 3), -- Developer Tools: affiliate, content_creator
    (11, 1), -- SaaS Scout: affiliate
    (12, 2), -- YouTube Tech: influencer
    (13, 3), -- E-Learning Expert: content_creator
    (14, 2), (14, 3), -- Productivity Guru: influencer, content_creator
    (15, 1); -- New Affiliate: affiliate

-- =====================================================
-- CAMPAIGNS & VERSIONS
-- =====================================================

-- Campaign 1: TechSaaS Project Management Tool
INSERT INTO campaigns (campaign_id, vendor_id, status) VALUES (1, 1, 'active');

INSERT INTO campaign_versions (campaign_version_id, campaign_id, version_number, name, description, destination_url, default_commission_type, default_commission_value, cookie_duration_days, approval_required, is_public, max_partners, terms_url) VALUES
    (1, 1, 1, 'TechSaaS Pro - Project Management', 'Powerful project management tool for teams', 'https://techsaas.com/signup', 'percentage', 20.00, 30, FALSE, TRUE, NULL, 'https://techsaas.com/affiliate-terms');

UPDATE campaigns SET current_campaign_version_id = 1 WHERE campaign_id = 1;

-- Campaign 2: EduPlatform Online Courses
INSERT INTO campaigns (campaign_id, vendor_id, status) VALUES (2, 2, 'active');

INSERT INTO campaign_versions (campaign_version_id, campaign_id, version_number, name, description, destination_url, default_commission_type, default_commission_value, cookie_duration_days, approval_required, is_public) VALUES
    (2, 2, 1, 'EduPlatform Course Marketplace', 'Join thousands learning new skills online', 'https://eduplatform.com/courses', 'percentage', 15.00, 60, FALSE, TRUE);

UPDATE campaigns SET current_campaign_version_id = 2 WHERE campaign_id = 2;

-- Campaign 3: FitnessGear Equipment
INSERT INTO campaigns (campaign_id, vendor_id, status) VALUES (3, 3, 'active');

INSERT INTO campaign_versions (campaign_version_id, campaign_id, version_number, name, description, destination_url, default_commission_type, default_commission_value, cookie_duration_days, approval_required, is_public) VALUES
    (3, 3, 1, 'FitnessGear - Premium Equipment', 'High-quality fitness equipment for home and gym', 'https://fitnessgear.com/shop', 'percentage', 10.00, 45, TRUE, TRUE);

UPDATE campaigns SET current_campaign_version_id = 3 WHERE campaign_id = 3;

-- Campaign 4: CloudStorage Pro
INSERT INTO campaigns (campaign_id, vendor_id, status) VALUES (4, 4, 'active');

INSERT INTO campaign_versions (campaign_version_id, campaign_id, version_number, name, description, destination_url, default_commission_type, default_commission_value, cookie_duration_days, approval_required, is_public) VALUES
    (4, 4, 1, 'CloudStorage Pro Business Plans', 'Secure cloud storage for businesses', 'https://cloudpro.io/business', 'tiered', NULL, 30, FALSE, TRUE);

UPDATE campaigns SET current_campaign_version_id = 4 WHERE campaign_id = 4;

-- Add tiered structure for CloudStorage
INSERT INTO campaign_tiers (campaign_version_id, reward_id, label, min_amount, max_amount, reward_type, reward_value) VALUES
    (4, 1, 'Bronze Tier', 0, 999.99, 'percentage', 10.00),
    (4, 2, 'Silver Tier', 1000.00, 4999.99, 'percentage', 15.00),
    (4, 3, 'Gold Tier', 5000.00, 999999.99, 'percentage', 20.00);

-- Campaign 5: DesignTools Studio
INSERT INTO campaigns (campaign_id, vendor_id, status) VALUES (5, 5, 'active');

INSERT INTO campaign_versions (campaign_version_id, campaign_id, version_number, name, description, destination_url, default_commission_type, default_commission_value, cookie_duration_days, approval_required, is_public) VALUES
    (5, 5, 1, 'DesignTools Studio Subscription', 'Professional design tools for creators', 'https://designtools.studio/pricing', 'flat', 25.00, 30, FALSE, TRUE);

UPDATE campaigns SET current_campaign_version_id = 5 WHERE campaign_id = 5;

-- Campaign 6: TechSaaS Analytics Tool (second campaign for vendor 1)
INSERT INTO campaigns (campaign_id, vendor_id, status) VALUES (6, 1, 'active');

INSERT INTO campaign_versions (campaign_version_id, campaign_id, version_number, name, description, destination_url, default_commission_type, default_commission_value, cookie_duration_days, approval_required, is_public) VALUES
    (6, 6, 1, 'TechSaaS Analytics Platform', 'Advanced analytics for data-driven decisions', 'https://techsaas.com/analytics', 'percentage', 25.00, 30, FALSE, TRUE);

UPDATE campaigns SET current_campaign_version_id = 6 WHERE campaign_id = 6;

SELECT setval('campaigns_campaign_id_seq', (SELECT MAX(campaign_id) FROM campaigns));
SELECT setval('campaign_versions_campaign_version_id_seq', (SELECT MAX(campaign_version_id) FROM campaign_versions));

-- =====================================================
-- CAMPAIGN PARTNERS (Partner enrollments)
-- =====================================================

-- Tech Reviewer Pro joins multiple campaigns
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at, approved_at, approved_by) VALUES
    (1, 1, 1, 'approved', NOW() - INTERVAL '80 days', NOW() - INTERVAL '79 days', 1),
    (2, 2, 1, 'approved', NOW() - INTERVAL '75 days', NOW() - INTERVAL '74 days', 3),
    (3, 4, 1, 'approved', NOW() - INTERVAL '70 days', NOW() - INTERVAL '69 days', 4),
    (4, 6, 1, 'approved', NOW() - INTERVAL '65 days', NOW() - INTERVAL '64 days', 1);

-- Marketing Maven
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at, approved_at, approved_by) VALUES
    (5, 1, 2, 'approved', NOW() - INTERVAL '60 days', NOW() - INTERVAL '59 days', 1),
    (6, 5, 2, 'approved', NOW() - INTERVAL '55 days', NOW() - INTERVAL '54 days', 6);

-- Fitness Influencer Jane
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at, approved_at, approved_by) VALUES
    (7, 3, 3, 'approved', NOW() - INTERVAL '50 days', NOW() - INTERVAL '49 days', 4);

-- StartupBlogger
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at, approved_at, approved_by) VALUES
    (8, 1, 4, 'approved', NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days', 1),
    (9, 4, 4, 'approved', NOW() - INTERVAL '40 days', NOW() - INTERVAL '39 days', 4);

-- EduTech Reviews
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at, approved_at, approved_by) VALUES
    (10, 2, 5, 'approved', NOW() - INTERVAL '35 days', NOW() - INTERVAL '34 days', 3);

-- Design Community Hub
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at, approved_at, approved_by) VALUES
    (11, 5, 6, 'approved', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days', 6);

-- ProductHunt Curator
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at, approved_at, approved_by) VALUES
    (12, 1, 7, 'approved', NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days', 1),
    (13, 6, 7, 'approved', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days', 1);

-- Cloud Computing Today
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at, approved_at, approved_by) VALUES
    (14, 4, 8, 'approved', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', 4),
    (15, 6, 8, 'approved', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', 1);

-- Wellness Blogger
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at, approved_at, approved_by) VALUES
    (16, 3, 9, 'approved', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', 4);

-- Developer Tools Review
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at, approved_at, approved_by) VALUES
    (17, 1, 10, 'approved', NOW() - INTERVAL '60 days', NOW() - INTERVAL '59 days', 1),
    (18, 4, 10, 'approved', NOW() - INTERVAL '55 days', NOW() - INTERVAL '54 days', 4);

-- SaaS Scout
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at, approved_at, approved_by) VALUES
    (19, 1, 11, 'approved', NOW() - INTERVAL '50 days', NOW() - INTERVAL '49 days', 1);

-- YouTube Tech Channel
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at, approved_at, approved_by) VALUES
    (20, 1, 12, 'approved', NOW() - INTERVAL '70 days', NOW() - INTERVAL '69 days', 1),
    (21, 4, 12, 'approved', NOW() - INTERVAL '65 days', NOW() - INTERVAL '64 days', 4),
    (22, 6, 12, 'approved', NOW() - INTERVAL '60 days', NOW() - INTERVAL '59 days', 1);

-- E-Learning Expert
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at, approved_at, approved_by) VALUES
    (23, 2, 13, 'approved', NOW() - INTERVAL '55 days', NOW() - INTERVAL '54 days', 3);

-- Productivity Guru
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at, approved_at, approved_by) VALUES
    (24, 1, 14, 'approved', NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days', 1),
    (25, 5, 14, 'approved', NOW() - INTERVAL '40 days', NOW() - INTERVAL '39 days', 6);

-- New Affiliate (pending approval)
INSERT INTO campaign_partners (campaign_partner_id, campaign_version_id, partner_id, status, applied_at) VALUES
    (26, 1, 15, 'pending', NOW() - INTERVAL '2 days');

SELECT setval('campaign_partners_campaign_partner_id_seq', (SELECT MAX(campaign_partner_id) FROM campaign_partners));

-- =====================================================
-- PARTNER LINKS
-- =====================================================

-- Generate realistic short codes and links for approved partners
INSERT INTO partner_links (partner_link_id, campaign_partner_id, short_code, full_url, utm_params, link_label) VALUES
    (1, 1, 'tr-pm-001', 'https://techsaas.com/signup', '{"utm_source": "techreviewerpro", "utm_medium": "affiliate", "utm_campaign": "project_management"}'::jsonb, 'Main Review Article'),
    (2, 1, 'tr-pm-002', 'https://techsaas.com/signup', '{"utm_source": "techreviewerpro", "utm_medium": "affiliate", "utm_campaign": "project_management", "utm_content": "sidebar"}'::jsonb, 'Sidebar Widget'),
    (3, 2, 'tr-edu-001', 'https://eduplatform.com/courses', '{"utm_source": "techreviewerpro", "utm_medium": "affiliate", "utm_campaign": "online_courses"}'::jsonb, 'Education Tools Roundup'),
    (4, 3, 'tr-cloud-001', 'https://cloudpro.io/business', '{"utm_source": "techreviewerpro", "utm_medium": "affiliate", "utm_campaign": "cloud_storage"}'::jsonb, 'Cloud Storage Comparison'),
    (5, 5, 'mm-pm-001', 'https://techsaas.com/signup', '{"utm_source": "marketingmaven", "utm_medium": "affiliate", "utm_campaign": "productivity_tools"}'::jsonb, 'Marketing Tools Post'),
    (6, 7, 'fi-gear-001', 'https://fitnessgear.com/shop', '{"utm_source": "fitinfluencer", "utm_medium": "affiliate", "utm_campaign": "home_gym"}'::jsonb, 'Home Gym Equipment'),
    (7, 8, 'sb-pm-001', 'https://techsaas.com/signup', '{"utm_source": "startupblogger", "utm_medium": "affiliate", "utm_campaign": "startup_tools"}'::jsonb, 'Startup Tool Stack'),
    (8, 10, 'edu-courses-001', 'https://eduplatform.com/courses', '{"utm_source": "edutechreviews", "utm_medium": "affiliate", "utm_campaign": "best_platforms"}'::jsonb, 'Platform Comparison'),
    (9, 12, 'ph-pm-001', 'https://techsaas.com/signup', '{"utm_source": "phhunter", "utm_medium": "affiliate", "utm_campaign": "featured_tool"}'::jsonb, 'Product Hunt Feature'),
    (10, 14, 'cc-cloud-001', 'https://cloudpro.io/business', '{"utm_source": "cloudcomputingtoday", "utm_medium": "affiliate", "utm_campaign": "enterprise_cloud"}'::jsonb, 'Enterprise Cloud Review'),
    (11, 20, 'yt-pm-001', 'https://techsaas.com/signup', '{"utm_source": "youtube_tech", "utm_medium": "affiliate", "utm_campaign": "video_review"}'::jsonb, 'YouTube Review Video'),
    (12, 20, 'yt-pm-002', 'https://techsaas.com/signup', '{"utm_source": "youtube_tech", "utm_medium": "affiliate", "utm_campaign": "video_review", "utm_content": "description"}'::jsonb, 'Video Description Link'),
    (13, 21, 'yt-cloud-001', 'https://cloudpro.io/business', '{"utm_source": "youtube_tech", "utm_medium": "affiliate", "utm_campaign": "cloud_comparison"}'::jsonb, 'Cloud Storage Video'),
    (14, 23, 'el-courses-001', 'https://eduplatform.com/courses', '{"utm_source": "elearningexpert", "utm_medium": "affiliate", "utm_campaign": "course_recommendation"}'::jsonb, 'Course Recommendations'),
    (15, 24, 'pg-pm-001', 'https://techsaas.com/signup', '{"utm_source": "productivityguru", "utm_medium": "affiliate", "utm_campaign": "productivity_suite"}'::jsonb, 'Productivity Tools Article');

SELECT setval('partner_links_partner_link_id_seq', (SELECT MAX(partner_link_id) FROM partner_links));

-- =====================================================
-- CLICKS (Sample click data for last 90 days)
-- =====================================================

-- Generate clicks for various links with realistic distribution
-- High-performing link: YouTube Tech Channel
INSERT INTO clicks (partner_link_id, ip_address, user_agent, referrer_url, utm_source, utm_medium, utm_campaign, device_type, browser, clicked_at)
SELECT 
    11, -- yt-pm-001
    ('192.168.1.' || (random() * 255)::int)::inet,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'https://youtube.com/watch?v=xyz123',
    'youtube_tech',
    'affiliate',
    'video_review',
    'desktop',
    'Chrome',
    NOW() - (random() * INTERVAL '90 days')
FROM generate_series(1, 500);

-- Medium-performing link: Tech Reviewer Pro
INSERT INTO clicks (partner_link_id, ip_address, user_agent, referrer_url, utm_source, utm_medium, utm_campaign, device_type, browser, clicked_at)
SELECT 
    1, -- tr-pm-001
    ('10.0.0.' || (random() * 255)::int)::inet,
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'https://techreviewerpro.com/reviews/project-management',
    'techreviewerpro',
    'affiliate',
    'project_management',
    CASE WHEN random() < 0.7 THEN 'desktop' ELSE 'mobile' END,
    'Chrome',
    NOW() - (random() * INTERVAL '80 days')
FROM generate_series(1, 300);

-- Fitness Influencer clicks
INSERT INTO clicks (partner_link_id, ip_address, user_agent, referrer_url, utm_source, utm_medium, utm_campaign, device_type, browser, clicked_at)
SELECT 
    6, -- fi-gear-001
    ('172.16.0.' || (random() * 255)::int)::inet,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    'https://instagram.com/janefitness',
    'fitinfluencer',
    'affiliate',
    'home_gym',
    'mobile',
    'Safari',
    NOW() - (random() * INTERVAL '50 days')
FROM generate_series(1, 200);

-- Marketing Maven clicks
INSERT INTO clicks (partner_link_id, ip_address, user_agent, referrer_url, utm_source, utm_medium, utm_campaign, device_type, browser, clicked_at)
SELECT 
    5, -- mm-pm-001
    ('192.0.2.' || (random() * 255)::int)::inet,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'https://marketingmaven.io/productivity-tools',
    'marketingmaven',
    'affiliate',
    'productivity_tools',
    'desktop',
    'Firefox',
    NOW() - (random() * INTERVAL '60 days')
FROM generate_series(1, 150);

-- Add clicks for other partners with lower volume
INSERT INTO clicks (partner_link_id, ip_address, user_agent, referrer_url, utm_source, utm_medium, utm_campaign, device_type, browser, clicked_at)
SELECT 
    link_id,
    ('198.51.100.' || (random() * 255)::int)::inet,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    NULL,
    'various',
    'affiliate',
    'general',
    CASE WHEN random() < 0.6 THEN 'desktop' ELSE 'mobile' END,
    CASE WHEN random() < 0.7 THEN 'Chrome' ELSE 'Safari' END,
    NOW() - (random() * INTERVAL '60 days')
FROM generate_series(7, 15) AS link_id,
     generate_series(1, 50);

-- =====================================================
-- COOKIES (Create cookies for click tracking)
-- =====================================================

-- Create cookies for some clicks (simulating returning users)
INSERT INTO cookies (cookie_id, first_click_id, last_click_id, first_partner_id, last_partner_id, last_campaign_version_id, expires_at, last_seen_at, created_at)
SELECT 
    gen_random_uuid(),
    c.click_id,
    c.click_id,
    pl.campaign_partner_id,
    pl.campaign_partner_id,
    cp.campaign_version_id,
    c.clicked_at + INTERVAL '30 days',
    c.clicked_at,
    c.clicked_at
FROM clicks c
JOIN partner_links pl ON pl.partner_link_id = c.partner_link_id
JOIN campaign_partners cp ON cp.campaign_partner_id = pl.campaign_partner_id
WHERE random() < 0.3 -- 30% of clicks create cookies
LIMIT 300;

-- Update clicks with cookie_id
UPDATE clicks c
SET cookie_id = ck.cookie_id
FROM cookies ck
WHERE c.click_id = ck.first_click_id;

-- =====================================================
-- CONVERSION EVENTS
-- =====================================================

-- Generate realistic conversions (10% conversion rate for high performers, 2-5% for others)

-- YouTube Tech Channel - High conversion rate (10%)
INSERT INTO conversion_events (
    conversion_event_type_id, click_id, partner_id, campaign_version_id,
    attribution_type, transaction_id, customer_email, event_value,
    commission_amount, commission_type, commission_value, status,
    occurred_at, recorded_at, approved_at
)
SELECT 
    5, -- sale
    c.click_id,
    12, -- YouTube Tech Channel partner_id
    1, -- TechSaaS campaign
    'last_click',
    'TXN-' || gen_random_uuid()::text,
    'customer' || floor(random() * 1000)::int || '@example.com',
    49.00 + (random() * 150)::numeric(10,2), -- $49-$199
    (49.00 + (random() * 150)::numeric(10,2)) * 0.20, -- 20% commission
    'percentage',
    20.00,
    'approved',
    c.clicked_at + (random() * INTERVAL '7 days'),
    c.clicked_at + (random() * INTERVAL '7 days') + INTERVAL '1 hour',
    c.clicked_at + (random() * INTERVAL '14 days')
FROM clicks c
JOIN partner_links pl ON pl.partner_link_id = c.partner_link_id
JOIN campaign_partners cp ON cp.campaign_partner_id = pl.campaign_partner_id
WHERE cp.partner_id = 12 AND cp.campaign_version_id = 1
  AND random() < 0.10 -- 10% conversion
LIMIT 50;

-- Tech Reviewer Pro - Medium conversion (5%)
INSERT INTO conversion_events (
    conversion_event_type_id, click_id, partner_id, campaign_version_id,
    attribution_type, transaction_id, customer_email, event_value,
    commission_amount, commission_type, commission_value, status,
    occurred_at, recorded_at, approved_at
)
SELECT 
    5, -- sale
    c.click_id,
    1, -- Tech Reviewer Pro
    1,
    'last_click',
    'TXN-' || gen_random_uuid()::text,
    'customer' || floor(random() * 1000)::int || '@example.com',
    49.00 + (random() * 150)::numeric(10,2),
    (49.00 + (random() * 150)::numeric(10,2)) * 0.20,
    'percentage',
    20.00,
    'approved',
    c.clicked_at + (random() * INTERVAL '7 days'),
    c.clicked_at + (random() * INTERVAL '7 days') + INTERVAL '1 hour',
    c.clicked_at + (random() * INTERVAL '14 days')
FROM clicks c
JOIN partner_links pl ON pl.partner_link_id = c.partner_link_id
JOIN campaign_partners cp ON cp.campaign_partner_id = pl.campaign_partner_id
WHERE cp.partner_id = 1 AND cp.campaign_version_id = 1
  AND random() < 0.05
LIMIT 15;

-- Fitness Influencer - Product sales
INSERT INTO conversion_events (
    conversion_event_type_id, click_id, partner_id, campaign_version_id,
    attribution_type, transaction_id, customer_email, event_value,
    commission_amount, commission_type, commission_value, status,
    occurred_at, recorded_at, approved_at
)
SELECT 
    5, -- sale
    c.click_id,
    3, -- Fitness Influencer Jane
    3,
    'last_click',
    'TXN-' || gen_random_uuid()::text,
    'customer' || floor(random() * 1000)::int || '@example.com',
    99.00 + (random() * 400)::numeric(10,2), -- $99-$499
    (99.00 + (random() * 400)::numeric(10,2)) * 0.10, -- 10% commission
    'percentage',
    10.00,
    'approved',
    c.clicked_at + (random() * INTERVAL '3 days'),
    c.clicked_at + (random() * INTERVAL '3 days') + INTERVAL '1 hour',
    c.clicked_at + (random() * INTERVAL '7 days')
FROM clicks c
JOIN partner_links pl ON pl.partner_link_id = c.partner_link_id
JOIN campaign_partners cp ON cp.campaign_partner_id = pl.campaign_partner_id
WHERE cp.partner_id = 3 AND cp.campaign_version_id = 3
  AND random() < 0.08
LIMIT 16;

-- EduPlatform conversions
INSERT INTO conversion_events (
    conversion_event_type_id, click_id, partner_id, campaign_version_id,
    attribution_type, transaction_id, customer_email, event_value,
    commission_amount, commission_type, commission_value, status,
    occurred_at, recorded_at, approved_at
)
SELECT 
    5, -- sale
    c.click_id,
    5, -- EduTech Reviews
    2,
    'last_click',
    'TXN-' || gen_random_uuid()::text,
    'student' || floor(random() * 1000)::int || '@example.com',
    29.00 + (random() * 170)::numeric(10,2), -- $29-$199
    (29.00 + (random() * 170)::numeric(10,2)) * 0.15, -- 15% commission
    'percentage',
    15.00,
    'approved',
    c.clicked_at + (random() * INTERVAL '5 days'),
    c.clicked_at + (random() * INTERVAL '5 days') + INTERVAL '2 hours',
    c.clicked_at + (random() * INTERVAL '10 days')
FROM clicks c
JOIN partner_links pl ON pl.partner_link_id = c.partner_link_id
JOIN campaign_partners cp ON cp.campaign_partner_id = pl.campaign_partner_id
WHERE cp.partner_id = 5 AND cp.campaign_version_id = 2
  AND random() < 0.04
LIMIT 8;

-- Add some pending conversions (not yet approved)
INSERT INTO conversion_events (
    conversion_event_type_id, click_id, partner_id, campaign_version_id,
    attribution_type, transaction_id, customer_email, event_value,
    commission_amount, commission_type, commission_value, status,
    occurred_at, recorded_at
)
SELECT 
    5, -- sale
    c.click_id,
    cp.partner_id,
    cp.campaign_version_id,
    'last_click',
    'TXN-' || gen_random_uuid()::text,
    'pending' || floor(random() * 100)::int || '@example.com',
    49.00 + (random() * 150)::numeric(10,2),
    (49.00 + (random() * 150)::numeric(10,2)) * 0.20,
    'percentage',
    20.00,
    'pending',
    NOW() - (random() * INTERVAL '3 days'),
    NOW() - (random() * INTERVAL '3 days') + INTERVAL '1 hour'
FROM clicks c
JOIN partner_links pl ON pl.partner_link_id = c.partner_link_id
JOIN campaign_partners cp ON cp.campaign_partner_id = pl.campaign_partner_id
WHERE random() < 0.02
LIMIT 10;

-- =====================================================
-- UPDATE DENORMALIZED COUNTERS
-- =====================================================

-- Update campaign_partners with aggregated stats
UPDATE campaign_partners cp
SET 
    total_clicks = (SELECT COUNT(*) FROM clicks c 
                    JOIN partner_links pl ON pl.partner_link_id = c.partner_link_id 
                    WHERE pl.campaign_partner_id = cp.campaign_partner_id),
    total_conversions = (SELECT COUNT(*) FROM conversion_events ce 
                        WHERE ce.partner_id = cp.partner_id 
                        AND ce.campaign_version_id = cp.campaign_version_id 
                        AND ce.status = 'approved'),
    total_revenue = (SELECT COALESCE(SUM(event_value), 0) FROM conversion_events ce 
                    WHERE ce.partner_id = cp.partner_id 
                    AND ce.campaign_version_id = cp.campaign_version_id 
                    AND ce.status = 'approved'),
    total_commission_earned = (SELECT COALESCE(SUM(commission_amount), 0) FROM conversion_events ce 
                              WHERE ce.partner_id = cp.partner_id 
                              AND ce.campaign_version_id = cp.campaign_version_id 
                              AND ce.status = 'approved'),
    last_click_at = (SELECT MAX(clicked_at) FROM clicks c 
                    JOIN partner_links pl ON pl.partner_link_id = c.partner_link_id 
                    WHERE pl.campaign_partner_id = cp.campaign_partner_id),
    last_conversion_at = (SELECT MAX(occurred_at) FROM conversion_events ce 
                         WHERE ce.partner_id = cp.partner_id 
                         AND ce.campaign_version_id = cp.campaign_version_id);

-- =====================================================
-- PAYMENT METHODS
-- =====================================================

-- Add payment methods for top partners
INSERT INTO partner_payment_methods (partner_id, payment_provider_id, provider_account_id, account_details, is_default, is_verified, verified_at) VALUES
    (1, 1, 'paypal_techreviewer@paypal.com', '{"email": "contact@techreviewerpro.com", "account_type": "business"}'::jsonb, TRUE, TRUE, NOW() - INTERVAL '70 days'),
    (2, 2, 'acct_stripe_marketing_maven', '{"account_id": "acct_1234567890", "country": "US"}'::jsonb, TRUE, TRUE, NOW() - INTERVAL '50 days'),
    (3, 1, 'jane.fitness@paypal.com', '{"email": "jane@fitinfluencer.com", "account_type": "personal"}'::jsonb, TRUE, TRUE, NOW() - INTERVAL '45 days'),
    (12, 2, 'acct_stripe_youtube_tech', '{"account_id": "acct_9876543210", "country": "US"}'::jsonb, TRUE, TRUE, NOW() - INTERVAL '60 days');

-- =====================================================
-- PAYOUTS
-- =====================================================

-- Generate payouts for partners with approved conversions
INSERT INTO payouts (partner_id, partner_payment_method_id, amount, payment_provider_id, provider_transaction_id, status, start_date, end_date, processed_at, completed_at)
SELECT 
    1,
    1,
    SUM(ce.commission_amount),
    1,
    'PAYPAL-' || gen_random_uuid()::text,
    'completed',
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '28 days',
    NOW() - INTERVAL '27 days'
FROM conversion_events ce
WHERE ce.partner_id = 1 
  AND ce.status = 'approved'
  AND ce.occurred_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days';

INSERT INTO payouts (partner_id, partner_payment_method_id, amount, payment_provider_id, provider_transaction_id, status, start_date, end_date, processed_at, completed_at)
SELECT 
    12,
    4,
    SUM(ce.commission_amount),
    2,
    'STRIPE-' || gen_random_uuid()::text,
    'completed',
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '28 days',
    NOW() - INTERVAL '27 days'
FROM conversion_events ce
WHERE ce.partner_id = 12 
  AND ce.status = 'approved'
  AND ce.occurred_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days';

-- Link payout events to conversions
INSERT INTO payout_events (payout_id, conversion_event_id, commission_amount)
SELECT 
    p.payout_id,
    ce.conversion_event_id,
    ce.commission_amount
FROM payouts p
JOIN conversion_events ce ON ce.partner_id = p.partner_id
WHERE ce.status = 'approved'
  AND ce.occurred_at BETWEEN p.start_date AND p.end_date;

-- Mark paid conversions
UPDATE conversion_events ce
SET status = 'paid'
WHERE conversion_event_id IN (
    SELECT conversion_event_id FROM payout_events
);

-- =====================================================
-- AUDIT LOGS (Sample entries)
-- =====================================================

INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, changes, created_at) VALUES
    ('campaign_partners', 1, 'approve', 'vendor_user', 1, '{"before": {"status": "pending"}, "after": {"status": "approved"}}'::jsonb, NOW() - INTERVAL '79 days'),
    ('conversion_events', 1, 'approve', 'vendor_user', 1, '{"before": {"status": "pending"}, "after": {"status": "approved"}}'::jsonb, NOW() - INTERVAL '45 days'),
    ('payouts', 1, 'create', 'system', NULL, '{"amount": 125.50, "partner_id": 1}'::jsonb, NOW() - INTERVAL '28 days');

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Database seeded successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Vendors: % records', (SELECT COUNT(*) FROM vendors);
    RAISE NOTICE 'Partners: % records', (SELECT COUNT(*) FROM partners);
    RAISE NOTICE 'Campaigns: % records', (SELECT COUNT(*) FROM campaigns);
    RAISE NOTICE 'Campaign Partners: % records', (SELECT COUNT(*) FROM campaign_partners);
    RAISE NOTICE 'Partner Links: % records', (SELECT COUNT(*) FROM partner_links);
    RAISE NOTICE 'Clicks: % records', (SELECT COUNT(*) FROM clicks);
    RAISE NOTICE 'Conversion Events: % records', (SELECT COUNT(*) FROM conversion_events);
    RAISE NOTICE 'Payouts: % records', (SELECT COUNT(*) FROM payouts);
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Test Credentials:';
    RAISE NOTICE 'All accounts password: TestPass123!';
    RAISE NOTICE 'Vendor: admin@techsaas.com';
    RAISE NOTICE 'Partner: contact@techreviewerpro.com';
    RAISE NOTICE '==============================================';
END $;