-- Migration 016: Support multiple LearnWorlds entities per channel
-- Replaces single-entity columns with a junction table for many-to-many linking.

CREATE TABLE channel_learnworlds_links (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('course', 'bundle', 'subscription')),
    entity_id VARCHAR(255) NOT NULL,
    entity_title VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(channel_id, entity_type, entity_id)
);

CREATE INDEX idx_cll_channel ON channel_learnworlds_links (channel_id);
CREATE INDEX idx_cll_entity ON channel_learnworlds_links (entity_type, entity_id);

-- Migrate existing single-link data into the new table
INSERT INTO channel_learnworlds_links (channel_id, entity_type, entity_id)
SELECT id, 'course', learnworlds_course_id
FROM channels WHERE learnworlds_course_id IS NOT NULL;

INSERT INTO channel_learnworlds_links (channel_id, entity_type, entity_id)
SELECT id, 'bundle', learnworlds_bundle_id
FROM channels WHERE learnworlds_bundle_id IS NOT NULL;

INSERT INTO channel_learnworlds_links (channel_id, entity_type, entity_id)
SELECT id, 'subscription', learnworlds_subscription_id
FROM channels WHERE learnworlds_subscription_id IS NOT NULL;
