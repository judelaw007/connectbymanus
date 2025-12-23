-- MojiTax Connect - Admin Auth Setup
-- This configures Supabase Auth for admin login via /auth/admin

-- ============================================
-- ADMIN AUTH NOTES
-- ============================================
--
-- Admin authentication uses Supabase Auth (auth.users table)
-- This is SEPARATE from regular users who come from Learnworlds
--
-- Setup in Supabase Dashboard:
-- 1. Go to Authentication → Providers
-- 2. Ensure Email provider is enabled
-- 3. Go to Authentication → Users
-- 4. Click "Add user" → "Create new user"
-- 5. Enter admin email and password
-- 6. User will be created in auth.users
--
-- ============================================

-- Function to check if a user is an admin (via Supabase Auth)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the authenticated user's email matches admin email
    -- You can customize this logic based on your needs
    RETURN (
        SELECT EXISTS (
            SELECT 1 FROM users
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADMIN-ONLY RLS POLICIES
-- ============================================

-- Email logs: Only admins can read/write
DROP POLICY IF EXISTS "Admins can manage email logs" ON email_logs;
CREATE POLICY "Admins can manage email logs" ON email_logs
    FOR ALL USING (is_admin());

-- Knowledge base: Admins can write, public can read active entries
DROP POLICY IF EXISTS "Admins can manage knowledge base" ON moji_knowledge_base;
CREATE POLICY "Admins can manage knowledge base" ON moji_knowledge_base
    FOR ALL USING (is_admin());

-- Support tickets: Admins can see all tickets
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
CREATE POLICY "Admins can view all tickets" ON support_tickets
    FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can update tickets" ON support_tickets;
CREATE POLICY "Admins can update tickets" ON support_tickets
    FOR UPDATE USING (is_admin());

-- ============================================
-- LINK SUPABASE AUTH TO APP USERS
-- ============================================

-- When an admin logs in via Supabase Auth, ensure they exist in users table
-- This function syncs Supabase auth.users to our users table for admins

CREATE OR REPLACE FUNCTION sync_admin_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if this is an admin (you'd set metadata during user creation)
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

-- Trigger to sync admin users (requires superuser or service_role)
-- Note: This trigger might need to be created via Supabase Dashboard
-- if you don't have direct access to auth schema

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION sync_admin_user();

-- ============================================
-- MANUAL ADMIN SETUP INSTRUCTIONS
-- ============================================
--
-- Since we can't directly modify auth.users via SQL,
-- follow these steps in Supabase Dashboard:
--
-- 1. Go to Authentication → Users
-- 2. Click "Add user" → "Create new user"
-- 3. Enter:
--    - Email: admin@mojitax.co.uk (or your admin email)
--    - Password: [strong password]
--    - Auto Confirm User: Yes (check this)
-- 4. After creating, click on the user
-- 5. In "User Metadata", add:
--    {
--      "is_admin": true,
--      "name": "MojiTax Admin"
--    }
-- 6. Save
--
-- Then run this SQL to link to users table:
--
-- INSERT INTO users (open_id, name, email, role, login_method)
-- VALUES (
--     '[PASTE_USER_ID_FROM_DASHBOARD]',
--     'MojiTax Admin',
--     'admin@mojitax.co.uk',
--     'admin',
--     'supabase'
-- );
--
-- ============================================
