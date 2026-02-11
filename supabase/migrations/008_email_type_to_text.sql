-- Convert email_type column from enum to TEXT to avoid enum extension issues.
-- Each ALTER TYPE ... ADD VALUE must run outside a transaction in Postgres,
-- which makes enum maintenance fragile. TEXT is sufficient here because the
-- application layer validates the values via TypeScript types.

-- 1. Drop the default (if any) so we can alter the column type
ALTER TABLE email_logs ALTER COLUMN email_type DROP DEFAULT;

-- 2. Convert column from enum to TEXT
ALTER TABLE email_logs ALTER COLUMN email_type TYPE TEXT USING email_type::TEXT;

-- 3. Also make content nullable if not already (was required in original schema)
ALTER TABLE email_logs ALTER COLUMN content DROP NOT NULL;
