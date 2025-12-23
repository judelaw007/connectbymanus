-- MojiTax Connect - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- ============================================
-- ENUM TYPES
-- ============================================

-- User roles
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Channel types
CREATE TYPE channel_type AS ENUM ('general', 'topic', 'study_group', 'support');

-- Channel member roles
CREATE TYPE member_role AS ENUM ('owner', 'moderator', 'member');

-- Message types
CREATE TYPE message_type AS ENUM ('user', 'admin', 'bot', 'system', 'event', 'announcement', 'article', 'newsletter');

-- Post types
CREATE TYPE post_type AS ENUM ('event', 'announcement', 'article', 'newsletter');

-- Priority levels
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');

-- Ticket status
CREATE TYPE ticket_status AS ENUM ('open', 'in-progress', 'closed');

-- Resolution types
CREATE TYPE resolution_type AS ENUM ('bot-answered', 'human-answered', 'no-answer', 'escalated');

-- Notification types
CREATE TYPE notification_type AS ENUM ('reply', 'mention', 'ticket', 'group_owner', 'announcement');

-- Email types
CREATE TYPE email_type AS ENUM ('announcement', 'reply', 'mention', 'ticket', 'group_notification', 'newsletter');

-- Email status
CREATE TYPE email_status AS ENUM ('sent', 'failed', 'pending');

-- Sender type for support messages
CREATE TYPE sender_type AS ENUM ('user', 'admin');

-- ============================================
-- TABLES
-- ============================================

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

-- 4. Posts table (before messages, as messages reference posts)
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id) ON DELETE SET NULL,
    post_type post_type NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL REFERENCES users(id),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

    -- Event-specific fields
    event_date TIMESTAMPTZ,
    event_location TEXT,

    -- Article-specific fields
    tags TEXT,
    featured_image TEXT,

    -- Newsletter-specific fields
    distribution_list TEXT,
    scheduled_for TIMESTAMPTZ,

    -- Announcement-specific fields
    priority_level priority_level,

    -- Link to the message in chat
    message_id INTEGER, -- Will add FK after messages table

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

-- Add FK from posts.message_id to messages.id
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

    -- Analytics fields
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

-- 10. Email logs table
CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    recipient_email VARCHAR(320) NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    email_type email_type NOT NULL,
    status email_status NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX email_logs_recipient_idx ON email_logs(recipient_email);
CREATE INDEX email_logs_type_idx ON email_logs(email_type);
CREATE INDEX email_logs_status_idx ON email_logs(status);
CREATE INDEX email_logs_sent_at_idx ON email_logs(sent_at);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
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

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
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

-- For now, allow all authenticated users to read public data
-- You can customize these policies based on your needs

-- Users: users can read all, update their own
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid()::text = open_id);

-- Channels: public channels visible to all, private to members
CREATE POLICY "Public channels visible to all" ON channels
    FOR SELECT USING (is_private = false);

CREATE POLICY "Private channels visible to members" ON channels
    FOR SELECT USING (
        is_private = true AND EXISTS (
            SELECT 1 FROM channel_members cm
            JOIN users u ON u.id = cm.user_id
            WHERE cm.channel_id = channels.id
            AND u.open_id = auth.uid()::text
        )
    );

-- Messages: visible in channels user has access to
CREATE POLICY "Messages visible in accessible channels" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = messages.channel_id
            AND (c.is_private = false OR EXISTS (
                SELECT 1 FROM channel_members cm
                JOIN users u ON u.id = cm.user_id
                WHERE cm.channel_id = c.id
                AND u.open_id = auth.uid()::text
            ))
        )
    );

-- Posts: public posts visible to all
CREATE POLICY "Posts visible to all" ON posts
    FOR SELECT USING (true);

-- Knowledge base: public read access
CREATE POLICY "Knowledge base readable by all" ON moji_knowledge_base
    FOR SELECT USING (is_active = true);

-- Support tickets: users see their own, admins see all
CREATE POLICY "Users see their own tickets" ON support_tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = support_tickets.user_id
            AND u.open_id = auth.uid()::text
        )
    );

-- Notifications: users see their own
CREATE POLICY "Users see their own notifications" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = notifications.user_id
            AND u.open_id = auth.uid()::text
        )
    );

-- ============================================
-- COMMENTS
-- ============================================

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
