-- Marks admin@example.com as an admin user.
-- Safe to run multiple times.

UPDATE app_users
SET is_admin = TRUE
WHERE lower(email) = 'admin@example.com';

-- Optional verification
SELECT id, email, display_name, is_admin
FROM app_users
WHERE lower(email) = 'admin@example.com';
