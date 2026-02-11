-- Add template_type column to email_logs table
-- This stores the specific email template name (e.g., verification_code, ticket_reply)
-- while email_type stores the broader category (ticket, announcement, etc.)
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS template_type VARCHAR(100);
