CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS app_users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_plan_access (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  UNIQUE (user_id, plan_id)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(50),
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plans (id, name)
VALUES ('plan_default', 'Default Wedding Plan')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  budget_state_rows BIGINT;
BEGIN
  SELECT COUNT(*) INTO budget_state_rows FROM budget_state;
  IF budget_state_rows > 1 THEN
    RAISE EXCEPTION
      'V4 preflight failed: budget_state has % rows. Expected at most 1 row before migrating existing data into plan_default.',
      budget_state_rows;
  END IF;
END $$;

ALTER TABLE invites ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50);
UPDATE invites SET plan_id = 'plan_default' WHERE plan_id IS NULL;
ALTER TABLE invites ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE invites DROP CONSTRAINT IF EXISTS fk_invites_plan;
ALTER TABLE invites ADD CONSTRAINT fk_invites_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_invites_plan_id ON invites(plan_id);

ALTER TABLE budget_state ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50);
UPDATE budget_state SET plan_id = 'plan_default' WHERE plan_id IS NULL;
ALTER TABLE budget_state ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE budget_state DROP CONSTRAINT IF EXISTS fk_budget_state_plan;
ALTER TABLE budget_state ADD CONSTRAINT fk_budget_state_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_state_plan_id ON budget_state(plan_id);

ALTER TABLE budget_expenses ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50);
UPDATE budget_expenses SET plan_id = 'plan_default' WHERE plan_id IS NULL;
ALTER TABLE budget_expenses ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE budget_expenses DROP CONSTRAINT IF EXISTS fk_budget_expenses_plan;
ALTER TABLE budget_expenses ADD CONSTRAINT fk_budget_expenses_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_budget_expenses_plan_id ON budget_expenses(plan_id);

ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50);
UPDATE checklist_items SET plan_id = 'plan_default' WHERE plan_id IS NULL;
ALTER TABLE checklist_items ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE checklist_items DROP CONSTRAINT IF EXISTS fk_checklist_items_plan;
ALTER TABLE checklist_items ADD CONSTRAINT fk_checklist_items_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_checklist_items_plan_id ON checklist_items(plan_id);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50);
UPDATE appointments SET plan_id = 'plan_default' WHERE plan_id IS NULL;
ALTER TABLE appointments ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS fk_appointments_plan;
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_appointments_plan_id ON appointments(plan_id);

ALTER TABLE seating_tables ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50);
UPDATE seating_tables SET plan_id = 'plan_default' WHERE plan_id IS NULL;
ALTER TABLE seating_tables ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE seating_tables DROP CONSTRAINT IF EXISTS fk_seating_tables_plan;
ALTER TABLE seating_tables ADD CONSTRAINT fk_seating_tables_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_seating_tables_plan_id ON seating_tables(plan_id);

ALTER TABLE seating_assignments ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50);
UPDATE seating_assignments SET plan_id = 'plan_default' WHERE plan_id IS NULL;
ALTER TABLE seating_assignments ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE seating_assignments DROP CONSTRAINT IF EXISTS fk_seating_assignments_plan;
ALTER TABLE seating_assignments ADD CONSTRAINT fk_seating_assignments_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_seating_assignments_plan_id ON seating_assignments(plan_id);
