-- Migration 014: Add Learnworlds entity linking to channels
-- Admin can link channels to specific Learnworlds courses, bundles, or subscriptions

ALTER TABLE channels
ADD COLUMN learnworlds_course_id VARCHAR(255),
ADD COLUMN learnworlds_bundle_id VARCHAR(255),
ADD COLUMN learnworlds_subscription_id VARCHAR(255);

-- Index for efficient lookup during auto-enrollment
CREATE INDEX idx_channels_lw_course ON channels (learnworlds_course_id) WHERE learnworlds_course_id IS NOT NULL;
CREATE INDEX idx_channels_lw_bundle ON channels (learnworlds_bundle_id) WHERE learnworlds_bundle_id IS NOT NULL;
CREATE INDEX idx_channels_lw_subscription ON channels (learnworlds_subscription_id) WHERE learnworlds_subscription_id IS NOT NULL;
