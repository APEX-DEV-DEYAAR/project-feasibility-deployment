-- =============================================================
-- Performance indexes for Budget vs Actuals queries (Oracle)
-- Budget vs Actuals aggregates across all years (since inception).
--
-- The aggregate queries need: category_id + project_id for join/filter,
-- then actual_amount, projected_amount, budget_amount, updated_at for
-- SUM/MAX. A composite index covering all these columns enables
-- index-only scans (no table heap access, avoids LOB columns).
-- =============================================================

-- 1. project_monthly_costs: getBvaCostAggregates
--    LEFT JOIN on (category_id, project_id), aggregates SUM/MAX.
--    Leading with category_id matches the join order from cost_categories.
BEGIN
  EXECUTE IMMEDIATE '
    CREATE INDEX idx_monthly_costs_bva
      ON project_monthly_costs (category_id, project_id, actual_amount, projected_amount, budget_amount, updated_at)
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- 2. project_monthly_revenue: getBvaRevenueAggregate
--    Aggregates SUM/MAX by project_id. Composite index covers all
--    needed columns so Oracle can satisfy the query from the index alone.
BEGIN
  EXECUTE IMMEDIATE '
    CREATE INDEX idx_monthly_revenue_bva
      ON project_monthly_revenue (project_id, actual_amount, projected_amount, budget_amount, updated_at)
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- 3. Drop the earlier index from a previous version of this migration
BEGIN
  EXECUTE IMMEDIATE 'DROP INDEX idx_monthly_costs_project_activity';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -1418 THEN RAISE; END IF;
END;
/
