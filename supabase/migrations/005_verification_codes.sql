-- MojiTax Connect - Verification Codes for Member Login
-- Run this in your Supabase SQL Editor

-- ============================================
-- VERIFICATION CODES TABLE
-- ============================================

-- Table to store email verification codes for member login
CREATE TABLE verification_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX verification_codes_email_idx ON verification_codes(email);
CREATE INDEX verification_codes_expires_idx ON verification_codes(expires_at);

-- Enable RLS
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Add template_type column to email_logs if it doesn't exist
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS template_type VARCHAR(100);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE verification_codes IS 'Email verification codes for member passwordless login';
COMMENT ON COLUMN verification_codes.email IS 'Email address the code was sent to';
COMMENT ON COLUMN verification_codes.code IS '6-digit verification code';
COMMENT ON COLUMN verification_codes.expires_at IS 'When the code expires (10 minutes after creation)';
COMMENT ON COLUMN verification_codes.used_at IS 'When the code was successfully used (null if unused)';
