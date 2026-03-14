-- Ensures the default admin user keeps admin access after deploys.
-- Safe to run multiple times.

UPDATE app_users
SET is_admin = TRUE
WHERE lower(email) = 'admin@example.com';
