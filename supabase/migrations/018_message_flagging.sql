-- Migration 018: Add message flagging for admin moderation

-- Add is_flagged and flagged metadata to messages
ALTER TABLE messages ADD COLUMN is_flagged BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN flagged_reason TEXT;
ALTER TABLE messages ADD COLUMN flagged_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN flagged_by INTEGER REFERENCES users(id);

-- Index for quick flagged message lookups
CREATE INDEX messages_flagged_idx ON messages(is_flagged) WHERE is_flagged = TRUE;
