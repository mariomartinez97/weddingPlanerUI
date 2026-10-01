ALTER TABLE plans ADD COLUMN invite_code VARCHAR(20) UNIQUE;

CREATE INDEX idx_plans_invite_code ON plans(invite_code);
