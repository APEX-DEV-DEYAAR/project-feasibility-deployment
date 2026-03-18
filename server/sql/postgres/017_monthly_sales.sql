-- Monthly sales tracking (TSV actual + projected)
CREATE TABLE IF NOT EXISTS project_monthly_sales (
  id               BIGSERIAL    PRIMARY KEY,
  project_id       BIGINT       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  year             INT          NOT NULL,
  month            INT          NOT NULL CHECK (month BETWEEN 1 AND 12),
  budget_amount    NUMERIC(15,2),
  actual_amount    NUMERIC(15,2),
  projected_amount NUMERIC(15,2),
  notes            TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_sales_project_year
  ON project_monthly_sales (project_id, year, month);
