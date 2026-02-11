-- Migration 011: Event RSVPs / Interest Tracking
-- Tracks users who indicate interest in events promoted via MojiTax Connect

CREATE TABLE IF NOT EXISTS event_rsvps (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(320) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'interested'
        CHECK (status IN ('interested', 'confirmed', 'declined', 'cancelled')),
    confirmation_sent_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_rsvps_post_id ON event_rsvps(post_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_email ON event_rsvps(email);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON event_rsvps(status);

-- Prevent duplicate RSVPs per email per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_rsvps_unique_email_post
    ON event_rsvps(post_id, email);
