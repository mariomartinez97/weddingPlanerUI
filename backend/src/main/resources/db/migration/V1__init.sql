CREATE TABLE invites (
  id VARCHAR(50) PRIMARY KEY,
  invite_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(255),
  notes VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invitees (
  id VARCHAR(50) PRIMARY KEY,
  invite_id VARCHAR(50) NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  rsvp VARCHAR(255) NOT NULL DEFAULT 'PENDING',
  meal_choice VARCHAR(255),
  notes VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitees_invite_id ON invitees(invite_id);
