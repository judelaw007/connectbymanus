-- Migration 012: Event auto-reminders and article author attribution
-- Adds reminder scheduling for events and optional author name for articles

-- Event reminder scheduling: hours before event to auto-send reminder
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reminder_hours INTEGER;
-- Track when the auto-reminder was sent so we don't send duplicates
ALTER TABLE posts ADD COLUMN IF NOT EXISTS auto_reminder_sent_at TIMESTAMPTZ;

-- Article author attribution: optional custom author name (defaults to "MojiTax" in app)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS article_author TEXT;
