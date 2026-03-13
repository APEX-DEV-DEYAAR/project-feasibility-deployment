CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL DEFAULT 'anonymous',
  role TEXT NOT NULL DEFAULT 'unknown',
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_username ON audit_log (username);
