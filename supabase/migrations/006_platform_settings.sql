-- Platform Settings table for storing platform-wide configuration
-- Run this migration in your Supabase SQL editor

-- Create platform_settings table
CREATE TABLE IF NOT EXISTS platform_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO platform_settings (setting_key, setting_value) VALUES
    ('platform_name', 'MojiTax Connect'),
    ('admin_email', 'admin@mojitax.com'),
    ('email_notifications_enabled', 'true')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Policy for service role (server-side access)
CREATE POLICY "Service role can manage platform settings"
ON platform_settings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read settings
CREATE POLICY "Authenticated users can read platform settings"
ON platform_settings FOR SELECT
TO authenticated
USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(setting_key);

-- Add display_name column to users table if it doesn't exist
-- This allows admins to set their display name (Esther, Jude, etc.)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'display_name') THEN
        ALTER TABLE users ADD COLUMN display_name VARCHAR(255);
    END IF;
END $$;

-- Update existing admin users to use their email username as display_name if not set
UPDATE users 
SET display_name = SPLIT_PART(email, '@', 1)
WHERE role = 'admin' AND display_name IS NULL AND email IS NOT NULL;
