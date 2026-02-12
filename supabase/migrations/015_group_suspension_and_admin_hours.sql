-- Migration 015: Group suspension and admin hours
-- Adds group suspension support (admin can suspend groups on complaint)
-- Adds admin availability hours settings

-- Add group suspension fields to channels table
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS suspension_reason text;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS suspended_by integer REFERENCES users(id);

-- Seed admin hours platform settings
INSERT INTO platform_settings (setting_key, setting_value, created_at, updated_at)
VALUES
  ('admin_hours_enabled', 'true', now(), now()),
  ('admin_hours_timezone', 'Europe/London', now(), now()),
  ('admin_hours_start', '09:00', now(), now()),
  ('admin_hours_end', '17:00', now(), now()),
  ('admin_hours_days', 'mon,tue,wed,thu,fri', now(), now()),
  ('admin_avg_response_minutes', '60', now(), now())
ON CONFLICT (setting_key) DO NOTHING;
