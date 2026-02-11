-- Migration 013: Add unread message tracking
-- Adds last_read_at to channel_members for per-user per-channel read tracking

ALTER TABLE channel_members
ADD COLUMN last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Initialize last_read_at to NOW() for existing members (marks everything as read)
-- The DEFAULT NOW() above handles this for new rows

-- Index for efficient unread count queries
CREATE INDEX idx_channel_members_last_read
ON channel_members (user_id, channel_id, last_read_at);

-- Index for counting messages after a timestamp
CREATE INDEX idx_messages_channel_created
ON messages (channel_id, created_at);
