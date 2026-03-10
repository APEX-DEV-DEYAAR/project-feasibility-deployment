-- =============================================================
-- Separate collections forecast module
-- Does not alter existing monthly collections tracker objects
-- =============================================================

CREATE TABLE IF NOT EXISTS project_collections_installments (
  id                 BIGSERIAL PRIMARY KEY,
  project_id         BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  customer_name      TEXT NOT NULL DEFAULT '',
  unit_ref           TEXT NOT NULL DEFAULT '',
  installment_label  TEXT NOT NULL,
  due_date           DATE NOT NULL,
  forecast_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  collected_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  collection_date    DATE,
  status             TEXT NOT NULL DEFAULT 'forecast'
                     CHECK (status IN ('forecast', 'partially_collected', 'collected', 'overdue')),
  probability_pct    NUMERIC(5,2) NOT NULL DEFAULT 100,
  notes              TEXT,
  created_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, unit_ref, installment_label, due_date)
);

CREATE INDEX IF NOT EXISTS idx_project_collections_installments_project_due
  ON project_collections_installments (project_id, due_date);

CREATE INDEX IF NOT EXISTS idx_project_collections_installments_project_status
  ON project_collections_installments (project_id, status);
