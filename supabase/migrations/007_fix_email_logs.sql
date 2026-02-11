-- Fix email_logs table: extend email_type enum and make content nullable
-- Run this migration in your Supabase SQL editor

-- 1. Add missing enum values to email_type
-- (existing: announcement, reply, mention, ticket, group_notification, newsletter)
ALTER TYPE email_type ADD VALUE IF NOT EXISTS 'verification_code';
ALTER TYPE email_type ADD VALUE IF NOT EXISTS 'event';
ALTER TYPE email_type ADD VALUE IF NOT EXISTS 'support_update';
ALTER TYPE email_type ADD VALUE IF NOT EXISTS 'general';

-- 2. Make content nullable — the subject + template_type is sufficient for log readability
ALTER TABLE email_logs ALTER COLUMN content DROP NOT NULL;
