CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(30),
  role VARCHAR(16) NOT NULL CHECK (role IN ('admin', 'profesor', 'alumno')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_email_unique UNIQUE (email)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email_verified_at'
  ) THEN
    UPDATE users SET email_verified = TRUE WHERE email_verified_at IS NOT NULL;
  END IF;
END;
$$;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
DROP TABLE IF EXISTS email_verification_tokens;
DROP INDEX IF EXISTS users_single_primary_admin;
ALTER TABLE users DROP CONSTRAINT IF EXISTS primary_user_must_be_admin;
ALTER TABLE users DROP COLUMN IF EXISTS is_active;
ALTER TABLE users DROP COLUMN IF EXISTS is_primary_admin;

CREATE OR REPLACE FUNCTION prevent_primary_admin_delete() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'admin' AND OLD.id = (
    SELECT id FROM users
    WHERE role = 'admin'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'El administrador principal no se puede eliminar' USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_primary_admin_no_delete ON users;
CREATE TRIGGER users_primary_admin_no_delete
  BEFORE DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION prevent_primary_admin_delete();

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);