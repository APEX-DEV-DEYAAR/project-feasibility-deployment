-- =============================================================
-- Performance indexes for CFO Dashboard queries (PostgreSQL)
--
-- The CFO dashboard fires 4 parallel queries at page load:
--   1. getProjects:           projects LEFT JOIN feasibility_reporting_current
--   2. getMonthlyCollections: full scan project_monthly_revenue ORDER BY (project_id, year, month)
--   3. getMonthlySales:       full scan project_monthly_sales   ORDER BY (project_id, year, month)
--   4. getCostAggregates:     project_monthly_costs JOIN cost_categories GROUP BY (project_id, code, team)
--
-- At scale each of these tables may hold 10K+ rows.
-- The goal is index-only scans (no heap access) for every query.
-- =============================================================

-- ── 1. feasibility_reporting_current ────────────────────────────
-- The LEFT JOIN matches on project_id and needs many wide columns.
-- The existing idx_feasibility_reporting_current_project leads with
-- (project_id, updated_at DESC). updated_at is not used by the
-- dashboard query, so we add a lean index on just project_id that
-- the planner will prefer for the equi-join.
CREATE INDEX IF NOT EXISTS idx_frc_cfo_project
  ON feasibility_reporting_current (project_id);

-- ── 2. project_monthly_revenue (collections) ────────────────────
-- Query: SELECT ... ORDER BY project_id, year, month
-- Covering index delivers sorted rows with zero heap lookups.
-- The UNIQUE constraint already provides (project_id, year, month)
-- but does not INCLUDE the amount columns → heap fetch per row.
CREATE INDEX IF NOT EXISTS idx_monthly_revenue_cfo
  ON project_monthly_revenue (project_id, year, month)
  INCLUDE (budget_amount, actual_amount, projected_amount);

-- ── 3. project_monthly_sales ────────────────────────────────────
-- Same pattern as collections: sorted scan + covering amounts.
CREATE INDEX IF NOT EXISTS idx_monthly_sales_cfo
  ON project_monthly_sales (project_id, year, month)
  INCLUDE (budget_amount, actual_amount, projected_amount);

-- ── 4. project_monthly_costs (cost aggregates) ──────────────────
-- Query: JOIN cost_categories cc ON cc.id = pmc.category_id
--        GROUP BY pmc.project_id, cc.code, cc.team
--        ORDER BY pmc.project_id, cc.team, cc.code
--
-- The GROUP BY groups by (project_id, category_id) after the join
-- resolves code/team. Leading with (project_id, category_id) lets
-- the planner use a sorted GroupAggregate instead of HashAggregate
-- at scale, and INCLUDE covers the SUM columns.
CREATE INDEX IF NOT EXISTS idx_monthly_costs_cfo
  ON project_monthly_costs (project_id, category_id)
  INCLUDE (budget_amount, actual_amount, projected_amount);

-- ── 5. cost_categories lookup ───────────────────────────────────
-- The JOIN key is cc.id (PK), which is already indexed.
-- But the dashboard also needs cc.code and cc.team for GROUP BY.
-- A covering index on the PK + output columns avoids heap on the
-- small lookup table — matters when row count is low but called
-- once per cost row in a nested-loop plan.
CREATE INDEX IF NOT EXISTS idx_cost_categories_cfo
  ON cost_categories (id)
  INCLUDE (code, team);
