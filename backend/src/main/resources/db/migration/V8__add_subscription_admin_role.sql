ALTER TABLE user_plan_access
  ADD COLUMN IF NOT EXISTS access_role VARCHAR(40) NOT NULL DEFAULT 'MEMBER';

UPDATE user_plan_access
SET access_role = 'MEMBER'
WHERE access_role IS NULL;
