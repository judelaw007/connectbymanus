-- Migration 017: Knowledge base expiry dates + flagged questions for @moji learning

-- Add optional expiry date to knowledge base entries
ALTER TABLE moji_knowledge_base ADD COLUMN expires_at TIMESTAMPTZ;

-- Create flagged questions table for questions @moji couldn't answer
CREATE TABLE moji_flagged_questions (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    channel_id INTEGER REFERENCES channels(id),
    bot_response TEXT,
    confidence VARCHAR(10) NOT NULL DEFAULT 'low',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- status: 'pending' (needs review), 'added' (added to KB), 'dismissed' (not relevant)
CREATE INDEX moji_flagged_status_idx ON moji_flagged_questions(status);
CREATE INDEX moji_flagged_created_idx ON moji_flagged_questions(created_at DESC);

-- RLS
ALTER TABLE moji_flagged_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Flagged questions readable by all authenticated" ON moji_flagged_questions
    FOR SELECT USING (true);

CREATE POLICY "Flagged questions insertable by service role" ON moji_flagged_questions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Flagged questions updatable by service role" ON moji_flagged_questions
    FOR UPDATE USING (true);
