-- Add suspension columns to users table for moderation system
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by INTEGER REFERENCES users(id);

-- Index for quickly filtering suspended users
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users (is_suspended) WHERE is_suspended = TRUE;
