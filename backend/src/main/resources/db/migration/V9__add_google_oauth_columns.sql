-- V9__add_google_oauth_columns.sql
-- Add Google OAuth support to app_users

ALTER TABLE app_users
    ADD COLUMN google_id VARCHAR(255) UNIQUE,
    ADD COLUMN avatar_url VARCHAR(1024),
    ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'email';

-- Make password_hash nullable for Google-only users
ALTER TABLE app_users
    ALTER COLUMN password_hash DROP NOT NULL;

-- Index for Google ID lookups during login
CREATE INDEX idx_app_users_google_id ON app_users(google_id);

-- Backfill: existing users are email-based
UPDATE app_users SET auth_provider = 'email' WHERE auth_provider IS NULL;
