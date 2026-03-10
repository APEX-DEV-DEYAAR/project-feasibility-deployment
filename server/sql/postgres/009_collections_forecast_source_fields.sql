ALTER TABLE project_collections_installments
  ADD COLUMN IF NOT EXISTS risk_category TEXT,
  ADD COLUMN IF NOT EXISTS exposure_bucket TEXT,
  ADD COLUMN IF NOT EXISTS expected_forfeiture TEXT,
  ADD COLUMN IF NOT EXISTS unit_forecast TEXT,
  ADD COLUMN IF NOT EXISTS over_due_pct NUMERIC(9,4),
  ADD COLUMN IF NOT EXISTS installments_over_due INT,
  ADD COLUMN IF NOT EXISTS source_status TEXT,
  ADD COLUMN IF NOT EXISTS payment_plan_name TEXT,
  ADD COLUMN IF NOT EXISTS project_completion_date DATE;
