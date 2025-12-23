-- MojiTax Connect - Fix RLS for Server-Side Access
-- Run this in Supabase SQL Editor to allow the server app to access data
--
-- The issue: RLS policies use auth.uid() which is NULL when connecting via
-- Drizzle/postgres-js because there's no Supabase Auth session context.
--
-- Solution: The server should connect using the DATABASE_URL that includes
-- the service_role, OR we need to grant permissions to the authenticator role.

-- ============================================
-- OPTION 1: DISABLE RLS (Simplest for server-only access)
-- ============================================
-- If your server is the only thing that accesses the database directly,
-- you can disable RLS. Client access would go through your server API.

-- Uncomment these if you want to disable RLS completely:
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE channel_members DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE support_messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE moji_knowledge_base DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE email_logs DISABLE ROW LEVEL SECURITY;

-- ============================================
-- OPTION 2: ADD POLICIES FOR AUTHENTICATED ROLE (Recommended)
-- ============================================
-- Grant access to the "authenticated" and "anon" roles which are used
-- by Supabase connection pooler

-- Grant table permissions to postgres role
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;

-- Grant to authenticated role (for Supabase Auth users)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant to anon role (for unauthenticated access)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant to service_role (bypasses RLS)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- ============================================
-- OPTION 3: PERMISSIVE POLICIES FOR ALL ROLES
-- ============================================
-- Add "allow all" policies that permit access without auth context
-- These will work alongside the existing auth-based policies

-- Users table
DROP POLICY IF EXISTS "Allow server access to users" ON users;
CREATE POLICY "Allow server access to users" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- Channels table
DROP POLICY IF EXISTS "Allow server access to channels" ON channels;
CREATE POLICY "Allow server access to channels" ON channels
    FOR ALL USING (true) WITH CHECK (true);

-- Channel members table
DROP POLICY IF EXISTS "Allow server access to channel_members" ON channel_members;
CREATE POLICY "Allow server access to channel_members" ON channel_members
    FOR ALL USING (true) WITH CHECK (true);

-- Messages table
DROP POLICY IF EXISTS "Allow server access to messages" ON messages;
CREATE POLICY "Allow server access to messages" ON messages
    FOR ALL USING (true) WITH CHECK (true);

-- Posts table
DROP POLICY IF EXISTS "Allow server access to posts" ON posts;
CREATE POLICY "Allow server access to posts" ON posts
    FOR ALL USING (true) WITH CHECK (true);

-- Support tickets table
DROP POLICY IF EXISTS "Allow server access to support_tickets" ON support_tickets;
CREATE POLICY "Allow server access to support_tickets" ON support_tickets
    FOR ALL USING (true) WITH CHECK (true);

-- Support messages table
DROP POLICY IF EXISTS "Allow server access to support_messages" ON support_messages;
CREATE POLICY "Allow server access to support_messages" ON support_messages
    FOR ALL USING (true) WITH CHECK (true);

-- Notifications table
DROP POLICY IF EXISTS "Allow server access to notifications" ON notifications;
CREATE POLICY "Allow server access to notifications" ON notifications
    FOR ALL USING (true) WITH CHECK (true);

-- Knowledge base table
DROP POLICY IF EXISTS "Allow server access to moji_knowledge_base" ON moji_knowledge_base;
CREATE POLICY "Allow server access to moji_knowledge_base" ON moji_knowledge_base
    FOR ALL USING (true) WITH CHECK (true);

-- Email logs table
DROP POLICY IF EXISTS "Allow server access to email_logs" ON email_logs;
CREATE POLICY "Allow server access to email_logs" ON email_logs
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- VERIFY POLICIES
-- ============================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
