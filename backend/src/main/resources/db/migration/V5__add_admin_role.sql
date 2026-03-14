ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE app_users
SET is_admin = TRUE
WHERE lower(email) = 'admin@example.com';
