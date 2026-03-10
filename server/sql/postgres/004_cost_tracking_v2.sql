-- =============================================================
-- Cost Tracking V2 — Team segregation, Revenue, Budget
-- =============================================================

-- 1. Add team column to cost_categories
ALTER TABLE cost_categories ADD COLUMN IF NOT EXISTS team TEXT NOT NULL DEFAULT 'commercial';

-- 2. Rename 'soft' → 'professional_fees' (only if 'soft' still exists)
UPDATE cost_categories SET code = 'professional_fees', name = 'Professional Fees',
  description = 'Design, engineering, permits, and indirect professional fees'
  WHERE code = 'soft'
    AND NOT EXISTS (SELECT 1 FROM cost_categories WHERE code = 'professional_fees');

-- 3. Set team for existing categories
UPDATE cost_categories SET team = 'commercial' WHERE code IN ('hard', 'professional_fees', 'authority');

-- 4. Insert new categories (contingency, sales_expenses, marketing)
INSERT INTO cost_categories (code, name, description, display_order, team) VALUES
  ('contingency', 'Contingency', 'Project contingency reserves', 4, 'commercial'),
  ('sales_expenses', 'Sales Expenses', 'Sales commissions and related expenses', 5, 'sales'),
  ('marketing', 'Marketing', 'Marketing campaigns, events, and brand costs', 6, 'marketing')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  team = EXCLUDED.team;

-- 5. Add budget_amount column to project_monthly_costs
ALTER TABLE project_monthly_costs
  ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(15,2);

-- 6. Create project_monthly_revenue table
CREATE TABLE IF NOT EXISTS project_monthly_revenue (
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

CREATE INDEX IF NOT EXISTS idx_monthly_revenue_project_year
  ON project_monthly_revenue (project_id, year, month);

-- 7. Drop and recreate summary views with team + budget
DROP VIEW IF EXISTS project_cost_summary CASCADE;
DROP VIEW IF EXISTS project_cost_annual_summary CASCADE;

CREATE OR REPLACE VIEW project_cost_summary AS
SELECT
  pmc.project_id,
  p.name as project_name,
  pmc.year,
  pmc.month,
  SUM(pmc.actual_amount) as total_actual,
  SUM(pmc.projected_amount) FILTER (WHERE pmc.projected_amount IS NOT NULL) as total_projected,
  SUM(pmc.budget_amount) FILTER (WHERE pmc.budget_amount IS NOT NULL) as total_budget,
  SUM(COALESCE(pmc.actual_amount, pmc.projected_amount, 0)) as blended_total,
  COUNT(pmc.actual_amount) as categories_with_actual,
  COUNT(*) as total_categories
FROM project_monthly_costs pmc
JOIN projects p ON p.id = pmc.project_id
GROUP BY pmc.project_id, p.name, pmc.year, pmc.month;

CREATE OR REPLACE VIEW project_cost_annual_summary AS
SELECT
  pmc.project_id,
  p.name as project_name,
  pmc.year,
  cc.code as category_code,
  cc.name as category_name,
  cc.team as category_team,
  SUM(pmc.actual_amount) as annual_actual,
  SUM(pmc.projected_amount) FILTER (WHERE pmc.projected_amount IS NOT NULL) as annual_projected,
  SUM(pmc.budget_amount) FILTER (WHERE pmc.budget_amount IS NOT NULL) as annual_budget,
  SUM(COALESCE(pmc.actual_amount, 0)) as ytd_actual,
  SUM(CASE WHEN pmc.month <= EXTRACT(MONTH FROM CURRENT_DATE) AND pmc.projected_amount IS NOT NULL
           THEN pmc.projected_amount ELSE 0 END) as ytd_projected,
  COUNT(pmc.actual_amount) FILTER (WHERE pmc.actual_amount IS NOT NULL) as months_with_actual
FROM project_monthly_costs pmc
JOIN projects p ON p.id = pmc.project_id
JOIN cost_categories cc ON cc.id = pmc.category_id
GROUP BY pmc.project_id, p.name, pmc.year, cc.code, cc.name, cc.team;
