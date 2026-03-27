-- =============================================================
-- Project-level one-time actual amounts (e.g. land cost)
-- =============================================================

CREATE TABLE IF NOT EXISTS project_actuals (
  id            BIGSERIAL    PRIMARY KEY,
  project_id    BIGINT       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  line_item     TEXT         NOT NULL,
  actual_amount NUMERIC      NOT NULL DEFAULT 0,
  notes         TEXT,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, line_item)
);
