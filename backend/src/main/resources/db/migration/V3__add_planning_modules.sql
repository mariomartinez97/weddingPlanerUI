CREATE TABLE IF NOT EXISTS budget_state (
  id VARCHAR(50) PRIMARY KEY,
  total_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'CAD'
);

CREATE TABLE IF NOT EXISTS budget_expenses (
  id VARCHAR(50) PRIMARY KEY,
  category VARCHAR(255) NOT NULL,
  vendor VARCHAR(255),
  amount NUMERIC(12,2) NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  expense_date VARCHAR(20),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  owner VARCHAR(255) NOT NULL,
  due_date VARCHAR(20),
  done BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(50) PRIMARY KEY,
  appt_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  with_whom VARCHAR(255) NOT NULL,
  start_at VARCHAR(40) NOT NULL,
  end_at VARCHAR(40) NOT NULL,
  location VARCHAR(255),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS seating_tables (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  seats INT NOT NULL CHECK (seats > 0)
);

CREATE TABLE IF NOT EXISTS seating_assignments (
  invitee_id VARCHAR(50) PRIMARY KEY,
  table_id VARCHAR(50) NOT NULL,
  seat_number INT,
  CONSTRAINT fk_seating_assignments_invitee
    FOREIGN KEY (invitee_id) REFERENCES invitees(id) ON DELETE CASCADE,
  CONSTRAINT fk_seating_assignments_table
    FOREIGN KEY (table_id) REFERENCES seating_tables(id) ON DELETE CASCADE
);

INSERT INTO budget_state (id, total_budget, currency)
VALUES ('budget_main', 0, 'CAD')
ON CONFLICT (id) DO NOTHING;
