-- =============================================================
-- Performance indexes for Budget vs Actuals queries
-- Budget vs Actuals aggregates across all years (since inception).
-- Idempotent: all use IF NOT EXISTS
-- =============================================================

-- 1. cost_categories: getCategories(team) filters by team, orders by display_order
CREATE INDEX IF NOT EXISTS idx_cost_categories_team_order
  ON cost_categories (team, display_order);

-- 2. project_monthly_costs: getBvaCostAggregates uses LEFT JOIN on
--    (category_id, project_id) then aggregates SUM/MAX over numeric columns.
--    Covering index avoids table heap access entirely (no LOB columns needed).
CREATE INDEX IF NOT EXISTS idx_monthly_costs_bva
  ON project_monthly_costs (category_id, project_id)
  INCLUDE (actual_amount, projected_amount, budget_amount, updated_at);

-- 3. project_monthly_revenue: getBvaRevenueAggregate aggregates by project_id.
--    Covering index for the aggregate — avoids heap access for LOB notes column.
CREATE INDEX IF NOT EXISTS idx_monthly_revenue_bva
  ON project_monthly_revenue (project_id)
  INCLUDE (actual_amount, projected_amount, budget_amount, updated_at);

-- 4. project_monthly_costs: annual summary view groups by project_id, year, category_id
CREATE INDEX IF NOT EXISTS idx_monthly_costs_annual
  ON project_monthly_costs (project_id, year, category_id)
  INCLUDE (actual_amount, projected_amount, budget_amount);

-- 5. Drop the redundant idx_monthly_revenue_project_year.
--    The UNIQUE constraint on (project_id, year, month) already creates
--    an implicit index that covers the same columns and more.
DROP INDEX IF EXISTS idx_monthly_revenue_project_year;

-- 6. Clean up old index from earlier version of this migration
DROP INDEX IF EXISTS idx_monthly_costs_project_covering;
DROP INDEX IF EXISTS idx_monthly_revenue_project_covering;
DROP INDEX IF EXISTS idx_monthly_costs_project_year_updated;
DROP INDEX IF EXISTS idx_monthly_revenue_project_year_updated;
