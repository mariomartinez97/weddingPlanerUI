ALTER TABLE plans ADD COLUMN status VARCHAR(20);
UPDATE plans SET status = 'ACTIVE' WHERE status IS NULL;
ALTER TABLE plans ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE plans ALTER COLUMN status SET NOT NULL;

ALTER TABLE plans ADD COLUMN created_at TIMESTAMPTZ;
UPDATE plans SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE plans ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE plans ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE plans ADD COLUMN updated_at TIMESTAMPTZ;
UPDATE plans SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE plans ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE plans ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE plans ADD COLUMN deactivated_at TIMESTAMPTZ;
ALTER TABLE plans ADD COLUMN archived_at TIMESTAMPTZ;
ALTER TABLE plans ADD COLUMN purge_after TIMESTAMPTZ;

ALTER TABLE plans
  ADD CONSTRAINT chk_plans_status
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED'));

CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_purge_after ON plans(purge_after);
