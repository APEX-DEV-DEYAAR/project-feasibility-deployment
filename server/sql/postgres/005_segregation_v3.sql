-- =============================================================
-- Segregation of Duties V3 - Clean category names, split sales
-- Idempotent: handles any prior DB state safely
-- =============================================================

CREATE OR REPLACE FUNCTION merge_cost_category_codes(
  keep_code TEXT,
  legacy_codes TEXT[],
  category_name TEXT,
  category_team TEXT,
  category_order INT,
  category_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  keep_id BIGINT;
  legacy_id BIGINT;
  legacy_code TEXT;
BEGIN
  INSERT INTO cost_categories (code, name, description, display_order, team)
  VALUES (keep_code, category_name, category_description, category_order, category_team)
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    team = EXCLUDED.team;

  SELECT id INTO keep_id
  FROM cost_categories
  WHERE code = keep_code
  LIMIT 1;

  FOREACH legacy_code IN ARRAY legacy_codes
  LOOP
    EXIT WHEN legacy_code IS NULL OR legacy_code = keep_code;

    SELECT id INTO legacy_id
    FROM cost_categories
    WHERE code = legacy_code
    LIMIT 1;

    IF legacy_id IS NULL OR legacy_id = keep_id THEN
      CONTINUE;
    END IF;

    UPDATE project_monthly_costs
      SET category_id = keep_id
      WHERE category_id = legacy_id
        AND NOT EXISTS (
          SELECT 1
          FROM project_monthly_costs existing
          WHERE existing.project_id = project_monthly_costs.project_id
            AND existing.year = project_monthly_costs.year
            AND existing.month = project_monthly_costs.month
            AND existing.category_id = keep_id
        );

    DELETE FROM project_monthly_costs
      WHERE category_id = legacy_id;

    DELETE FROM cost_categories
      WHERE id = legacy_id;
  END LOOP;

  UPDATE cost_categories
    SET name = category_name,
        team = category_team,
        display_order = category_order,
        description = category_description
    WHERE id = keep_id;
END $$;

-- ============ COMMERCIAL TEAM (4 categories) ============

SELECT merge_cost_category_codes(
  'hard_cost',
  ARRAY['hard'],
  'Hard Cost',
  'commercial',
  1,
  'Construction hard costs'
);

SELECT merge_cost_category_codes(
  'soft_cost',
  ARRAY['professional_fees', 'soft'],
  'Soft Cost',
  'commercial',
  2,
  'Design, engineering, permits, and indirect professional fees'
);

SELECT merge_cost_category_codes(
  'statutory_cost',
  ARRAY['authority'],
  'Statutory Cost',
  'commercial',
  3,
  'Government and authority fees and charges'
);

UPDATE cost_categories
  SET name = 'Contingency', team = 'commercial', display_order = 4,
      description = 'Project contingency reserves'
  WHERE code = 'contingency';

-- ============ SALES TEAM (4 categories) ============

SELECT merge_cost_category_codes(
  'broker_cost',
  ARRAY['sales_expenses'],
  'Broker Cost',
  'sales',
  5,
  'Broker commissions and fees'
);

INSERT INTO cost_categories (code, name, description, display_order, team) VALUES
  ('staff_discounts', 'Staff Discounts', 'Sales discounts granted to staff purchases', 6, 'sales'),
  ('dld_cost', 'DLD Waiver Cost', 'Dubai Land Department waiver and transfer fee costs', 7, 'sales'),
  ('sales_incentives', 'Staff Incentives', 'Sales staff incentives and bonuses', 8, 'sales')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  team = EXCLUDED.team;

-- ============ MARKETING TEAM (1 category) ============

SELECT merge_cost_category_codes(
  'marketing',
  ARRAY['marketing_expenses'],
  'Marketing',
  'marketing',
  8,
  'Marketing campaigns, events, and brand costs'
);

-- ============ CLEANUP stale categories ============
DELETE FROM cost_categories
  WHERE code NOT IN (
    'hard_cost', 'soft_cost', 'statutory_cost', 'contingency',
    'broker_cost', 'staff_discounts', 'dld_cost', 'sales_incentives',
    'marketing'
  );

-- ============ RECREATE VIEWS ============
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

DROP FUNCTION IF EXISTS merge_cost_category_codes(TEXT, TEXT[], TEXT, TEXT, INT, TEXT);
