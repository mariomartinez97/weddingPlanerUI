ALTER TABLE invitees DROP CONSTRAINT IF EXISTS invitees_invite_id_fkey;

ALTER TABLE invites
  ALTER COLUMN id TYPE VARCHAR(50) USING id::text;

ALTER TABLE invitees
  ALTER COLUMN id TYPE VARCHAR(50) USING id::text,
  ALTER COLUMN invite_id TYPE VARCHAR(50) USING invite_id::text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'invites' AND column_name = 'invite_notes'
  ) THEN
    ALTER TABLE invites RENAME COLUMN invite_notes TO notes;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'invitees' AND column_name = 'person_notes'
  ) THEN
    ALTER TABLE invitees RENAME COLUMN person_notes TO notes;
  END IF;
END $$;

ALTER TABLE invites
  ALTER COLUMN invite_name TYPE VARCHAR(255),
  ALTER COLUMN contact_email TYPE VARCHAR(255),
  ALTER COLUMN contact_phone TYPE VARCHAR(255),
  ALTER COLUMN notes TYPE VARCHAR(255);

ALTER TABLE invitees
  ALTER COLUMN full_name TYPE VARCHAR(255),
  ALTER COLUMN rsvp TYPE VARCHAR(255),
  ALTER COLUMN meal_choice TYPE VARCHAR(255),
  ALTER COLUMN notes TYPE VARCHAR(255);

ALTER TABLE invitees
  ADD CONSTRAINT invitees_invite_id_fkey
  FOREIGN KEY (invite_id) REFERENCES invites(id) ON DELETE CASCADE;
