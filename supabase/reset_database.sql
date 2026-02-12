-- ================================================================
-- MojiTax Connect - FULL DATABASE RESET
-- ================================================================
-- Run this in Supabase SQL Editor to drop everything and rebuild
-- from scratch. This combines ALL 16 migrations + seed data.
--
-- WARNING: This will DELETE ALL DATA. Use only for fresh deployment.
-- ================================================================

-- ============================================
-- PHASE 1: DROP EVERYTHING
-- ============================================

-- Drop all tables (CASCADE handles foreign keys, policies, triggers)
DROP TABLE IF EXISTS channel_learnworlds_links CASCADE;
DROP TABLE IF EXISTS event_rsvps CASCADE;
DROP TABLE IF EXISTS unread_tracking CASCADE;
DROP TABLE IF EXISTS support_messages CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS channel_members CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS channels CASCADE;
DROP TABLE IF EXISTS verification_codes CASCADE;
DROP TABLE IF EXISTS platform_settings CASCADE;
DROP TABLE IF EXISTS moji_knowledge_base CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop all custom enum types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS channel_type CASCADE;
DROP TYPE IF EXISTS member_role CASCADE;
DROP TYPE IF EXISTS message_type CASCADE;
DROP TYPE IF EXISTS post_type CASCADE;
DROP TYPE IF EXISTS priority_level CASCADE;
DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS resolution_type CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS email_type CASCADE;
DROP TYPE IF EXISTS email_status CASCADE;
DROP TYPE IF EXISTS sender_type CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS sync_admin_user() CASCADE;


-- ============================================
-- PHASE 2: MIGRATION 001 - Initial Schema
-- ============================================

-- Enum types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE channel_type AS ENUM ('general', 'topic', 'study_group', 'support');
CREATE TYPE member_role AS ENUM ('owner', 'moderator', 'member');
CREATE TYPE message_type AS ENUM ('user', 'admin', 'bot', 'system', 'event', 'announcement', 'article', 'newsletter');
CREATE TYPE post_type AS ENUM ('event', 'announcement', 'article', 'newsletter');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ticket_status AS ENUM ('open', 'in-progress', 'closed');
CREATE TYPE resolution_type AS ENUM ('bot-answered', 'human-answered', 'no-answer', 'escalated');
CREATE TYPE notification_type AS ENUM ('reply', 'mention', 'ticket', 'group_owner', 'announcement');
CREATE TYPE email_type AS ENUM ('announcement', 'reply', 'mention', 'ticket', 'group_notification', 'newsletter');
CREATE TYPE email_status AS ENUM ('sent', 'failed', 'pending');
CREATE TYPE sender_type AS ENUM ('user', 'admin');

-- 1. Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    open_id VARCHAR(64) NOT NULL UNIQUE,
    name TEXT,
    email VARCHAR(320),
    login_method VARCHAR(64),
    role user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_signed_in TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX users_open_id_idx ON users(open_id);
CREATE INDEX users_email_idx ON users(email);

-- 2. Channels table
CREATE TABLE channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type channel_type NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    invite_code VARCHAR(64),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_closed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX channels_created_by_idx ON channels(created_by);
CREATE INDEX channels_type_idx ON channels(type);
CREATE INDEX channels_invite_code_idx ON channels(invite_code);

-- 3. Channel members table
CREATE TABLE channel_members (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(channel_id, user_id)
);

CREATE INDEX channel_members_channel_user_idx ON channel_members(channel_id, user_id);
CREATE INDEX channel_members_user_idx ON channel_members(user_id);

-- 4. Posts table
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id) ON DELETE SET NULL,
    post_type post_type NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL REFERENCES users(id),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    event_date TIMESTAMPTZ,
    event_location TEXT,
    tags TEXT,
    featured_image TEXT,
    distribution_list TEXT,
    scheduled_for TIMESTAMPTZ,
    priority_level priority_level,
    message_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX posts_channel_idx ON posts(channel_id);
CREATE INDEX posts_author_idx ON posts(author_id);
CREATE INDEX posts_type_idx ON posts(post_type);
CREATE INDEX posts_pinned_idx ON posts(is_pinned);

-- 5. Messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type message_type NOT NULL DEFAULT 'user',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX messages_channel_idx ON messages(channel_id);
CREATE INDEX messages_user_idx ON messages(user_id);
CREATE INDEX messages_created_at_idx ON messages(created_at);
CREATE INDEX messages_post_idx ON messages(post_id);

-- FK from posts.message_id to messages.id
ALTER TABLE posts ADD CONSTRAINT posts_message_id_fkey
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- 6. Support tickets table
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subject VARCHAR(500) NOT NULL,
    status ticket_status NOT NULL DEFAULT 'open',
    priority priority_level NOT NULL DEFAULT 'medium',
    assigned_to_admin_id INTEGER REFERENCES users(id),
    resolution_type resolution_type,
    enquiry_type VARCHAR(100),
    tags TEXT,
    bot_interaction_count INTEGER NOT NULL DEFAULT 0,
    human_interaction_count INTEGER NOT NULL DEFAULT 0,
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX support_tickets_user_idx ON support_tickets(user_id);
CREATE INDEX support_tickets_status_idx ON support_tickets(status);
CREATE INDEX support_tickets_assigned_idx ON support_tickets(assigned_to_admin_id);
CREATE INDEX support_tickets_last_message_idx ON support_tickets(last_message_at);

-- 7. Support messages table
CREATE TABLE support_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    sender_type sender_type NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX support_messages_ticket_idx ON support_messages(ticket_id);
CREATE INDEX support_messages_sender_idx ON support_messages(sender_id);
CREATE INDEX support_messages_created_at_idx ON support_messages(created_at);

-- 8. Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    content TEXT NOT NULL,
    related_id INTEGER,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_idx ON notifications(user_id);
CREATE INDEX notifications_type_idx ON notifications(type);
CREATE INDEX notifications_is_read_idx ON notifications(is_read);

-- 9. Moji Knowledge Base table
CREATE TABLE moji_knowledge_base (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(255),
    tags TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX moji_kb_category_idx ON moji_knowledge_base(category);
CREATE INDEX moji_kb_active_idx ON moji_knowledge_base(is_active);

-- 10. Email logs table (using TEXT for email_type per migration 008)
CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    recipient_email VARCHAR(320) NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    content TEXT, -- nullable per migration 007
    email_type TEXT NOT NULL, -- TEXT instead of enum per migration 008
    template_type VARCHAR(100), -- added by migration 009
    status email_status NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX email_logs_recipient_idx ON email_logs(recipient_email);
CREATE INDEX email_logs_type_idx ON email_logs(email_type);
CREATE INDEX email_logs_status_idx ON email_logs(status);
CREATE INDEX email_logs_sent_at_idx ON email_logs(sent_at);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_moji_kb_updated_at
    BEFORE UPDATE ON moji_knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE moji_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE users IS 'User accounts for MojiTax Connect platform';
COMMENT ON TABLE channels IS 'Chat channels including topics, study groups, and support';
COMMENT ON TABLE channel_members IS 'Membership tracking for channels';
COMMENT ON TABLE messages IS 'Chat messages in channels';
COMMENT ON TABLE posts IS 'Structured content: events, announcements, articles, newsletters';
COMMENT ON TABLE support_tickets IS 'Support ticket tracking';
COMMENT ON TABLE support_messages IS 'Messages within support tickets';
COMMENT ON TABLE notifications IS 'User notifications';
COMMENT ON TABLE moji_knowledge_base IS 'Q&A knowledge base for @moji chatbot';
COMMENT ON TABLE email_logs IS 'Log of all emails sent by the platform';


-- ============================================
-- PHASE 3: MIGRATION 003 - Admin Auth Setup
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT EXISTS (
            SELECT 1 FROM users
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin-only RLS policies
CREATE POLICY "Admins can manage email logs" ON email_logs
    FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage knowledge base" ON moji_knowledge_base
    FOR ALL USING (is_admin());

CREATE POLICY "Admins can view all tickets" ON support_tickets
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update tickets" ON support_tickets
    FOR UPDATE USING (is_admin());

CREATE OR REPLACE FUNCTION sync_admin_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.raw_user_meta_data->>'is_admin' = 'true' THEN
        INSERT INTO users (open_id, name, email, role, login_method)
        VALUES (
            NEW.id::text,
            COALESCE(NEW.raw_user_meta_data->>'name', 'Admin'),
            NEW.email,
            'admin',
            'supabase'
        )
        ON CONFLICT (open_id) DO UPDATE SET
            email = EXCLUDED.email,
            role = 'admin',
            last_signed_in = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- PHASE 4: MIGRATION 004 - Fix RLS for Server
-- ============================================

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO anon;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Permissive server access policies
CREATE POLICY "Allow server access to users" ON users
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow server access to channels" ON channels
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow server access to channel_members" ON channel_members
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow server access to messages" ON messages
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow server access to posts" ON posts
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow server access to support_tickets" ON support_tickets
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow server access to support_messages" ON support_messages
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow server access to notifications" ON notifications
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow server access to moji_knowledge_base" ON moji_knowledge_base
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow server access to email_logs" ON email_logs
    FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- PHASE 5: MIGRATION 005 - Verification Codes
-- ============================================

CREATE TABLE verification_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX verification_codes_email_idx ON verification_codes(email);
CREATE INDEX verification_codes_expires_idx ON verification_codes(expires_at);
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE verification_codes IS 'Email verification codes for member passwordless login';


-- ============================================
-- PHASE 6: MIGRATION 006 - Platform Settings
-- ============================================

CREATE TABLE platform_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('platform_name', 'MojiTax Connect'),
    ('admin_email', 'admin@mojitax.com'),
    ('email_notifications_enabled', 'true')
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage platform settings"
ON platform_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read platform settings"
ON platform_settings FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_platform_settings_key ON platform_settings(setting_key);

-- Add display_name to users
ALTER TABLE users ADD COLUMN display_name VARCHAR(255);


-- ============================================
-- PHASE 7: MIGRATION 010 - User Suspension
-- ============================================

ALTER TABLE users
  ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN suspension_reason TEXT,
  ADD COLUMN suspended_at TIMESTAMPTZ,
  ADD COLUMN suspended_until TIMESTAMPTZ,
  ADD COLUMN suspended_by INTEGER REFERENCES users(id);

CREATE INDEX idx_users_is_suspended ON users (is_suspended) WHERE is_suspended = TRUE;


-- ============================================
-- PHASE 8: MIGRATION 011 - Event RSVPs
-- ============================================

CREATE TABLE event_rsvps (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(320) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'interested'
        CHECK (status IN ('interested', 'confirmed', 'declined', 'cancelled')),
    confirmation_sent_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_rsvps_post_id ON event_rsvps(post_id);
CREATE INDEX idx_event_rsvps_email ON event_rsvps(email);
CREATE INDEX idx_event_rsvps_status ON event_rsvps(status);
CREATE UNIQUE INDEX idx_event_rsvps_unique_email_post ON event_rsvps(post_id, email);


-- ============================================
-- PHASE 9: MIGRATION 012 - Event Reminders & Article Author
-- ============================================

ALTER TABLE posts ADD COLUMN reminder_hours INTEGER;
ALTER TABLE posts ADD COLUMN auto_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN article_author TEXT;


-- ============================================
-- PHASE 10: MIGRATION 013 - Unread Tracking
-- ============================================

ALTER TABLE channel_members ADD COLUMN last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX idx_channel_members_last_read ON channel_members (user_id, channel_id, last_read_at);
CREATE INDEX idx_messages_channel_created ON messages (channel_id, created_at);


-- ============================================
-- PHASE 11: MIGRATION 014 - Channel LearnWorlds Linking (single)
-- ============================================

ALTER TABLE channels
ADD COLUMN learnworlds_course_id VARCHAR(255),
ADD COLUMN learnworlds_bundle_id VARCHAR(255),
ADD COLUMN learnworlds_subscription_id VARCHAR(255);

CREATE INDEX idx_channels_lw_course ON channels (learnworlds_course_id) WHERE learnworlds_course_id IS NOT NULL;
CREATE INDEX idx_channels_lw_bundle ON channels (learnworlds_bundle_id) WHERE learnworlds_bundle_id IS NOT NULL;
CREATE INDEX idx_channels_lw_subscription ON channels (learnworlds_subscription_id) WHERE learnworlds_subscription_id IS NOT NULL;


-- ============================================
-- PHASE 12: MIGRATION 015 - Group Suspension & Admin Hours
-- ============================================

ALTER TABLE channels ADD COLUMN is_suspended boolean DEFAULT false;
ALTER TABLE channels ADD COLUMN suspension_reason text;
ALTER TABLE channels ADD COLUMN suspended_at timestamptz;
ALTER TABLE channels ADD COLUMN suspended_by integer REFERENCES users(id);

INSERT INTO platform_settings (setting_key, setting_value, created_at, updated_at)
VALUES
  ('admin_hours_enabled', 'true', now(), now()),
  ('admin_hours_timezone', 'Europe/London', now(), now()),
  ('admin_hours_start', '09:00', now(), now()),
  ('admin_hours_end', '17:00', now(), now()),
  ('admin_hours_days', 'mon,tue,wed,thu,fri', now(), now()),
  ('admin_avg_response_minutes', '60', now(), now())
ON CONFLICT (setting_key) DO NOTHING;


-- ============================================
-- PHASE 13: MIGRATION 016 - Multi-Entity Channel Links
-- ============================================

CREATE TABLE channel_learnworlds_links (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('course', 'bundle', 'subscription')),
    entity_id VARCHAR(255) NOT NULL,
    entity_title VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(channel_id, entity_type, entity_id)
);

CREATE INDEX idx_cll_channel ON channel_learnworlds_links (channel_id);
CREATE INDEX idx_cll_entity ON channel_learnworlds_links (entity_type, entity_id);

-- RLS + server access for new tables
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_learnworlds_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow server access to verification_codes" ON verification_codes
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow server access to platform_settings" ON platform_settings
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow server access to event_rsvps" ON event_rsvps
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow server access to channel_learnworlds_links" ON channel_learnworlds_links
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions on new tables/sequences
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;


-- ============================================
-- PHASE 14: SEED DATA (from migration 002)
-- ============================================

-- Create admin user
INSERT INTO users (open_id, name, email, role, login_method)
VALUES ('admin-mojitax', 'MojiTax Admin', 'admin@mojitax.co.uk', 'admin', 'oauth')
ON CONFLICT (open_id) DO UPDATE SET role = 'admin';

-- Create default channels and seed data
DO $$
DECLARE
    admin_id INTEGER;
BEGIN
    SELECT id INTO admin_id FROM users WHERE open_id = 'admin-mojitax';

    -- Default channel (only #General — admins create topic channels as needed)
    INSERT INTO channels (name, description, type, is_private, created_by)
    VALUES
        ('General', 'Welcome to MojiTax Connect! Introduce yourself and connect with fellow tax professionals.', 'general', false, admin_id);

    -- Add admin as owner of all channels
    INSERT INTO channel_members (channel_id, user_id, role)
    SELECT c.id, admin_id, 'owner'
    FROM channels c
    WHERE c.created_by = admin_id
    ON CONFLICT (channel_id, user_id) DO NOTHING;

END $$;

-- Knowledge base entries
INSERT INTO moji_knowledge_base (question, answer, category, tags, is_active)
VALUES
    ('How do I use @moji?', 'Just mention @moji in any chat message and ask your question! I''ll search my knowledge base and use AI to help answer your tax questions. If I can''t help, I''ll connect you with Team MojiTax.', 'Platform Help', 'moji, chatbot, help, getting started', true),
    ('How do I create a study group?', 'Click the "Create Group" button in the sidebar. Enter a name and description for your group. You can make it private (invite-only) or public. Once created, share the invite code with your study partners!', 'Platform Help', 'study group, create, private, invite', true),
    ('How do I contact support?', 'Click "Chat with Team MojiTax" in the sidebar to start a support conversation. You can chat with @moji first, or request a human agent for complex questions.', 'Platform Help', 'support, help, contact, human', true),
    ('What is the ADIT qualification?', 'The Advanced Diploma in International Taxation (ADIT) is a specialist qualification offered by the Chartered Institute of Taxation (CIOT). It covers principles of international taxation, transfer pricing, and allows specialization through optional modules.', 'ADIT Exam', 'ADIT, qualification, CIOT, diploma', true),
    ('What are the ADIT exam papers?', 'ADIT consists of: Paper 1 (Principles of International Taxation - compulsory), Paper 2 (Advanced International Taxation - choose one jurisdiction), and Paper 3 (Transfer Pricing OR Indirect Taxes OR Taxation of Corporate Finance).', 'ADIT Exam', 'ADIT, papers, modules, exam structure', true),
    ('When are ADIT exams held?', 'ADIT exams are typically held twice a year in June and December. Registration usually opens 3-4 months before the exam date. Check the CIOT website for exact dates and deadlines.', 'ADIT Exam', 'ADIT, exam dates, schedule, registration', true),
    ('What is the VAT registration threshold in the UK?', 'As of 2024, the UK VAT registration threshold is £85,000. Businesses must register if their taxable turnover exceeds this amount in any 12-month period, or if they expect it to exceed the threshold in the next 30 days alone.', 'VAT', 'VAT, UK, registration, threshold', true),
    ('What is reverse charge VAT?', 'Reverse charge is a mechanism where the recipient of goods/services accounts for VAT instead of the supplier. It''s commonly used in B2B cross-border transactions within the EU and for certain domestic supplies like construction services in the UK.', 'VAT', 'VAT, reverse charge, B2B, cross-border', true),
    ('What is the arm''s length principle?', 'The arm''s length principle requires that transactions between related parties be priced as if they were between independent parties. This is the international standard for transfer pricing set by the OECD Guidelines.', 'Transfer Pricing', 'transfer pricing, arm''s length, OECD, related parties', true),
    ('What are the five transfer pricing methods?', 'The OECD recognizes five methods: 1) Comparable Uncontrolled Price (CUP), 2) Resale Price Method, 3) Cost Plus Method, 4) Transactional Net Margin Method (TNMM), and 5) Profit Split Method. The most appropriate method depends on the transaction type and data availability.', 'Transfer Pricing', 'transfer pricing, methods, OECD, CUP, TNMM', true),
    ('What is BEPS?', 'BEPS (Base Erosion and Profit Shifting) refers to tax planning strategies that exploit gaps between tax rules to artificially shift profits to low-tax locations. The OECD/G20 BEPS Project developed 15 Actions to address these issues.', 'International Tax', 'BEPS, OECD, profit shifting, tax avoidance', true),
    ('What is a double tax treaty?', 'A double tax treaty (or double taxation agreement/DTA) is a bilateral agreement between two countries that defines taxing rights to prevent the same income being taxed twice. They typically reduce withholding taxes and provide tie-breaker rules for residency.', 'International Tax', 'double tax, treaty, DTA, withholding', true);

-- Welcome message in General channel
DO $$
DECLARE
    admin_id INTEGER;
    general_channel_id INTEGER;
BEGIN
    SELECT id INTO admin_id FROM users WHERE open_id = 'admin-mojitax';
    SELECT id INTO general_channel_id FROM channels WHERE name = 'General' AND type = 'general';

    INSERT INTO messages (channel_id, user_id, content, message_type)
    VALUES (
        general_channel_id,
        admin_id,
        E'Welcome to **MojiTax Connect**! \n\nThis is your community hub for international tax professionals. Here''s how to get started:\n\n• **Explore Topic Channels** - Join discussions on VAT, Transfer Pricing, ADIT, and more\n• **Create Study Groups** - Form private groups for exam prep or project collaboration\n• **Ask @moji** - Mention @moji in any message to get AI-powered tax assistance\n• **Get Support** - Click "Chat with Team MojiTax" for human support\n\nIntroduce yourself below and let us know what area of international tax you specialize in!',
        'system'
    );
END $$;


-- ============================================
-- PHASE 15: VERIFICATION
-- ============================================

SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'Channels', COUNT(*) FROM channels
UNION ALL SELECT 'Channel Members', COUNT(*) FROM channel_members
UNION ALL SELECT 'Messages', COUNT(*) FROM messages
UNION ALL SELECT 'Knowledge Base', COUNT(*) FROM moji_knowledge_base
UNION ALL SELECT 'Platform Settings', COUNT(*) FROM platform_settings;
