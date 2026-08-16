CREATE TABLE IF NOT EXISTS users (
  chat_id TEXT PRIMARY KEY,
  telegram_user_id TEXT,
  language_code TEXT,
  focus_codes TEXT,
  cadence TEXT NOT NULL DEFAULT 'weekly',
  status TEXT NOT NULL DEFAULT 'onboarding',
  awaiting TEXT,
  started_at TEXT NOT NULL,
  next_due_at TEXT,
  last_checkin_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commitments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (chat_id) REFERENCES users(chat_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_commitments_chat_status
  ON commitments(chat_id, status);

CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  commitment_id INTEGER,
  status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES users(chat_id) ON DELETE CASCADE,
  FOREIGN KEY (commitment_id) REFERENCES commitments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_checkins_chat_created
  ON checkins(chat_id, created_at);

CREATE INDEX IF NOT EXISTS idx_users_due
  ON users(status, next_due_at);
