-- Metric overrides for feasibility runs (draft/frozen)
CREATE TABLE IF NOT EXISTS feasibility_run_overrides (
  id              BIGSERIAL PRIMARY KEY,
  run_id          BIGINT NOT NULL REFERENCES feasibility_runs(id) ON DELETE CASCADE,
  metric_key      TEXT NOT NULL,
  original_value  NUMERIC NOT NULL,
  override_value  NUMERIC NOT NULL,
  justification   TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (run_id, metric_key)
);

-- Metric overrides for archived feasibility runs
CREATE TABLE IF NOT EXISTS feasibility_archive_overrides (
  id              BIGSERIAL PRIMARY KEY,
  archive_id      BIGINT NOT NULL REFERENCES feasibility_archive(id) ON DELETE CASCADE,
  metric_key      TEXT NOT NULL,
  original_value  NUMERIC NOT NULL,
  override_value  NUMERIC NOT NULL,
  justification   TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (archive_id, metric_key)
);
