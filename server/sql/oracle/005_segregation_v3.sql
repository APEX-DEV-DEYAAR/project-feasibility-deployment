-- =============================================================
-- Segregation of Duties V3 - Clean category names, split sales
-- =============================================================

MERGE INTO cost_categories tgt
USING (
  SELECT 'hard_cost' AS code, 'Hard Cost' AS name, 'Construction hard costs' AS description, 1 AS display_order, 'commercial' AS team FROM dual
  UNION ALL
  SELECT 'soft_cost', 'Soft Cost', 'Design, engineering, permits, and indirect professional fees', 2, 'commercial' FROM dual
  UNION ALL
  SELECT 'statutory_cost', 'Statutory Cost', 'Government and authority fees and charges', 3, 'commercial' FROM dual
  UNION ALL
  SELECT 'contingency', 'Contingency', 'Project contingency reserves', 4, 'commercial' FROM dual
  UNION ALL
  SELECT 'broker_cost', 'Broker Cost', 'Broker commissions and fees', 5, 'sales' FROM dual
  UNION ALL
  SELECT 'staff_discounts', 'Staff Discounts', 'Sales discounts granted to staff purchases', 6, 'sales' FROM dual
  UNION ALL
  SELECT 'dld_cost', 'DLD Waiver Cost', 'Dubai Land Department waiver and transfer fee costs', 7, 'sales' FROM dual
  UNION ALL
  SELECT 'sales_incentives', 'Staff Incentives', 'Sales staff incentives and bonuses', 8, 'sales' FROM dual
  UNION ALL
  SELECT 'marketing', 'Marketing', 'Marketing campaigns, events, and brand costs', 8, 'marketing' FROM dual
) src
ON (tgt.code = src.code)
WHEN MATCHED THEN
  UPDATE SET
    tgt.name = src.name,
    tgt.description = src.description,
    tgt.display_order = src.display_order,
    tgt.team = src.team
WHEN NOT MATCHED THEN
  INSERT (code, name, description, display_order, team)
  VALUES (src.code, src.name, src.description, src.display_order, src.team);

UPDATE project_monthly_costs pmc
SET category_id = (SELECT id FROM cost_categories WHERE code = 'hard_cost')
WHERE category_id = (SELECT id FROM cost_categories WHERE code = 'hard')
  AND NOT EXISTS (
    SELECT 1
    FROM project_monthly_costs existing
    WHERE existing.project_id = pmc.project_id
      AND existing.year = pmc.year
      AND existing.month = pmc.month
      AND existing.category_id = (SELECT id FROM cost_categories WHERE code = 'hard_cost')
  );

DELETE FROM project_monthly_costs
WHERE category_id = (SELECT id FROM cost_categories WHERE code = 'hard');

UPDATE project_monthly_costs pmc
SET category_id = (SELECT id FROM cost_categories WHERE code = 'soft_cost')
WHERE category_id = (SELECT id FROM cost_categories WHERE code = 'professional_fees')
  AND NOT EXISTS (
    SELECT 1
    FROM project_monthly_costs existing
    WHERE existing.project_id = pmc.project_id
      AND existing.year = pmc.year
      AND existing.month = pmc.month
      AND existing.category_id = (SELECT id FROM cost_categories WHERE code = 'soft_cost')
  );

DELETE FROM project_monthly_costs
WHERE category_id = (SELECT id FROM cost_categories WHERE code = 'professional_fees');

UPDATE project_monthly_costs pmc
SET category_id = (SELECT id FROM cost_categories WHERE code = 'soft_cost')
WHERE category_id = (SELECT id FROM cost_categories WHERE code = 'soft')
  AND NOT EXISTS (
    SELECT 1
    FROM project_monthly_costs existing
    WHERE existing.project_id = pmc.project_id
      AND existing.year = pmc.year
      AND existing.month = pmc.month
      AND existing.category_id = (SELECT id FROM cost_categories WHERE code = 'soft_cost')
  );

DELETE FROM project_monthly_costs
WHERE category_id = (SELECT id FROM cost_categories WHERE code = 'soft');

UPDATE project_monthly_costs pmc
SET category_id = (SELECT id FROM cost_categories WHERE code = 'statutory_cost')
WHERE category_id = (SELECT id FROM cost_categories WHERE code = 'authority')
  AND NOT EXISTS (
    SELECT 1
    FROM project_monthly_costs existing
    WHERE existing.project_id = pmc.project_id
      AND existing.year = pmc.year
      AND existing.month = pmc.month
      AND existing.category_id = (SELECT id FROM cost_categories WHERE code = 'statutory_cost')
  );

DELETE FROM project_monthly_costs
WHERE category_id = (SELECT id FROM cost_categories WHERE code = 'authority');

UPDATE project_monthly_costs pmc
SET category_id = (SELECT id FROM cost_categories WHERE code = 'broker_cost')
WHERE category_id = (SELECT id FROM cost_categories WHERE code = 'sales_expenses')
  AND NOT EXISTS (
    SELECT 1
    FROM project_monthly_costs existing
    WHERE existing.project_id = pmc.project_id
      AND existing.year = pmc.year
      AND existing.month = pmc.month
      AND existing.category_id = (SELECT id FROM cost_categories WHERE code = 'broker_cost')
  );

DELETE FROM project_monthly_costs
WHERE category_id = (SELECT id FROM cost_categories WHERE code = 'sales_expenses');

UPDATE project_monthly_costs pmc
SET category_id = (SELECT id FROM cost_categories WHERE code = 'marketing')
WHERE category_id = (SELECT id FROM cost_categories WHERE code = 'marketing_expenses')
  AND NOT EXISTS (
    SELECT 1
    FROM project_monthly_costs existing
    WHERE existing.project_id = pmc.project_id
      AND existing.year = pmc.year
      AND existing.month = pmc.month
      AND existing.category_id = (SELECT id FROM cost_categories WHERE code = 'marketing')
  );

DELETE FROM project_monthly_costs
WHERE category_id = (SELECT id FROM cost_categories WHERE code = 'marketing_expenses');

DELETE FROM cost_categories
WHERE code NOT IN (
  'hard_cost', 'soft_cost', 'statutory_cost', 'contingency',
  'broker_cost', 'staff_discounts', 'dld_cost', 'sales_incentives',
  'marketing'
);

BEGIN
  EXECUTE IMMEDIATE 'DROP VIEW project_cost_summary';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN
      RAISE;
    END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'DROP VIEW project_cost_annual_summary';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -942 THEN
      RAISE;
    END IF;
END;
/

CREATE OR REPLACE VIEW project_cost_summary AS
SELECT
  pmc.project_id,
  p.name AS project_name,
  pmc.year,
  pmc.month,
  SUM(pmc.actual_amount) AS total_actual,
  SUM(CASE WHEN pmc.projected_amount IS NOT NULL THEN pmc.projected_amount END) AS total_projected,
  SUM(CASE WHEN pmc.budget_amount IS NOT NULL THEN pmc.budget_amount END) AS total_budget,
  SUM(COALESCE(pmc.actual_amount, pmc.projected_amount, 0)) AS blended_total,
  COUNT(pmc.actual_amount) AS categories_with_actual,
  COUNT(*) AS total_categories
FROM project_monthly_costs pmc
JOIN projects p ON p.id = pmc.project_id
GROUP BY pmc.project_id, p.name, pmc.year, pmc.month;

CREATE OR REPLACE VIEW project_cost_annual_summary AS
SELECT
  pmc.project_id,
  p.name AS project_name,
  pmc.year,
  cc.code AS category_code,
  cc.name AS category_name,
  cc.team AS category_team,
  SUM(pmc.actual_amount) AS annual_actual,
  SUM(CASE WHEN pmc.projected_amount IS NOT NULL THEN pmc.projected_amount END) AS annual_projected,
  SUM(CASE WHEN pmc.budget_amount IS NOT NULL THEN pmc.budget_amount END) AS annual_budget,
  SUM(COALESCE(pmc.actual_amount, 0)) AS ytd_actual,
  SUM(
    CASE
      WHEN pmc.month <= EXTRACT(MONTH FROM CURRENT_DATE) AND pmc.projected_amount IS NOT NULL
      THEN pmc.projected_amount
      ELSE 0
    END
  ) AS ytd_projected,
  SUM(CASE WHEN pmc.actual_amount IS NOT NULL THEN 1 ELSE 0 END) AS months_with_actual
FROM project_monthly_costs pmc
JOIN projects p ON p.id = pmc.project_id
JOIN cost_categories cc ON cc.id = pmc.category_id
GROUP BY pmc.project_id, p.name, pmc.year, cc.code, cc.name, cc.team;
