-- =============================================================
-- Performance indexes for CFO Dashboard queries (Oracle)
--
-- The CFO dashboard fires 4 parallel queries at page load:
--   1. getProjects:           projects LEFT JOIN feasibility_reporting_current
--   2. getMonthlyCollections: full scan project_monthly_revenue ORDER BY (project_id, year, month)
--   3. getMonthlySales:       full scan project_monthly_sales   ORDER BY (project_id, year, month)
--   4. getCostAggregates:     project_monthly_costs JOIN cost_categories GROUP BY (project_id, code, team)
--
-- Oracle does not support INCLUDE syntax. Covering indexes list
-- all needed columns so that the CBO can satisfy the query from
-- the index alone (index-only / index fast full scan).
-- =============================================================

-- ── 1. feasibility_reporting_current ────────────────────────────
-- Lean join index on project_id only (existing one trails updated_at DESC).
BEGIN
  EXECUTE IMMEDIATE '
    CREATE INDEX idx_frc_cfo_project
      ON feasibility_reporting_current (project_id)
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE NOT IN (-955, -1408) THEN RAISE; END IF;
END;
/

-- ── 2. project_monthly_revenue (collections) ────────────────────
-- Covering: sort key + amount columns → index-only scan.
BEGIN
  EXECUTE IMMEDIATE '
    CREATE INDEX idx_monthly_revenue_cfo
      ON project_monthly_revenue (project_id, year, month, budget_amount, actual_amount, projected_amount)
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE NOT IN (-955, -1408) THEN RAISE; END IF;
END;
/

-- ── 3. project_monthly_sales ────────────────────────────────────
-- Covering: sort key + amount columns → index-only scan.
BEGIN
  EXECUTE IMMEDIATE '
    CREATE INDEX idx_monthly_sales_cfo
      ON project_monthly_sales (project_id, year, month, budget_amount, actual_amount, projected_amount)
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE NOT IN (-955, -1408) THEN RAISE; END IF;
END;
/

-- ── 4. project_monthly_costs (cost aggregates) ──────────────────
-- Leading (project_id, category_id) supports sorted GroupAggregate.
-- Trailing amount columns enable index-only SUM aggregation.
BEGIN
  EXECUTE IMMEDIATE '
    CREATE INDEX idx_monthly_costs_cfo
      ON project_monthly_costs (project_id, category_id, budget_amount, actual_amount, projected_amount)
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE NOT IN (-955, -1408) THEN RAISE; END IF;
END;
/

-- ── 5. cost_categories lookup covering index ────────────────────
-- PK lookup already indexed, but adding code + team avoids table
-- access during the JOIN resolution.
BEGIN
  EXECUTE IMMEDIATE '
    CREATE INDEX idx_cost_categories_cfo
      ON cost_categories (id, code, team)
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE NOT IN (-955, -1408) THEN RAISE; END IF;
END;
/
