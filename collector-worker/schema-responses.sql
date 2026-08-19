CREATE TABLE IF NOT EXISTS responses (
  response_id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  cycle INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('self','boss','peer','report','other')),
  language TEXT NOT NULL CHECK (language IN ('lt','en')),
  schema_version TEXT NOT NULL DEFAULT 'leadership360-response@3',
  bank_version TEXT,
  answers_json TEXT NOT NULL,
  open_json TEXT,
  submitted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_responses_assessment_cycle_role
  ON responses(assessment_id, cycle, role, submitted_at);

CREATE INDEX IF NOT EXISTS idx_responses_assessment_cycle
  ON responses(assessment_id, cycle, submitted_at);
