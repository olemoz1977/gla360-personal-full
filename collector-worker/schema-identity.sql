PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS assessments (
  assessment_id TEXT PRIMARY KEY,
  leader_name TEXT NOT NULL,
  project_name TEXT,
  guardian_name TEXT,
  guardian_email_cipher TEXT,
  guardian_email_iv TEXT,
  manage_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cycles (
  assessment_id TEXT NOT NULL,
  cycle INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'collecting',
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (assessment_id, cycle),
  FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invitations (
  invite_id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  cycle INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('self','boss','peer','report','other')),
  language TEXT NOT NULL CHECK (language IN ('lt','en')),
  email_cipher TEXT,
  email_iv TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  token_cipher TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','opened','submitting','completed','revoked')),
  sent_at TEXT,
  opened_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id, cycle) REFERENCES cycles(assessment_id, cycle) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invites_assessment_cycle_role
  ON invitations(assessment_id, cycle, role, status);

CREATE INDEX IF NOT EXISTS idx_invites_token_hash
  ON invitations(token_hash);
