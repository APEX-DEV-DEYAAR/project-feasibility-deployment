-- =============================================================
-- Commercial Team Cost Tracking Schema — PostgreSQL
-- Tracks actual commitments and projections per project/month
-- =============================================================

-- Cost Categories (Hard Cost, Soft Cost, Authority Fees)
CREATE TABLE IF NOT EXISTS cost_categories (
  id          BIGSERIAL    PRIMARY KEY,
  code        TEXT         NOT NULL UNIQUE,
  name        TEXT         NOT NULL,
  description TEXT,
  display_order INT        NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Insert default cost categories (initial 3; expanded in 004_cost_tracking_v2.sql)
INSERT INTO cost_categories (code, name, description, display_order) VALUES
  ('hard', 'Hard Cost', 'Construction, materials, labor, and direct project costs', 1),
  ('professional_fees', 'Professional Fees', 'Design, engineering, permits, and indirect professional fees', 2),
  ('authority', 'Authority Fees', 'Government fees, municipality charges, and regulatory costs', 3)
ON CONFLICT (code) DO NOTHING;

-- Monthly Cost Tracking (Actual vs Projected)
CREATE TABLE IF NOT EXISTS project_monthly_costs (
  id               BIGSERIAL    PRIMARY KEY,
  project_id       BIGINT       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_id      BIGINT       NOT NULL REFERENCES cost_categories(id) ON DELETE CASCADE,
  year             INT          NOT NULL,
  month            INT          NOT NULL CHECK (month BETWEEN 1 AND 12),
  actual_amount    NUMERIC(15,2),           -- NULL until actual is entered
  projected_amount NUMERIC(15,2),          -- NULL if no projection
  notes            TEXT,
  created_by       TEXT,                    -- User who created/updated
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, category_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_costs_project_year_month
  ON project_monthly_costs (project_id, year, month);

CREATE INDEX IF NOT EXISTS idx_monthly_costs_category
  ON project_monthly_costs (category_id);

-- Views are created in 004_cost_tracking_v2.sql (with team + budget columns)
