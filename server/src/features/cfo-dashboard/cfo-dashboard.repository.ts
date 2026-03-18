import type { BaseAdapter } from "../../shared/db/adapters/base.adapter.js";

export interface CfoProjectRow {
  projectId: number;
  projectName: string;
  projectCreatedAt: string;
  runId: number | null;
  version: number | null;
  status: string | null;
  runCreatedAt: string | null;
  runUpdatedAt: string | null;
  frozenAt: string | null;
  gfa: number | null;
  nsaTotal: number | null;
  units: number | null;
  budgetRevenue: number | null;
  budgetTotalCost: number | null;
  budgetProfit: number | null;
  budgetMarginPct: number | null;
  budgetLandCost: number | null;
  budgetHardCost: number | null;
  budgetSoftCost: number | null;
  budgetStatutory: number | null;
  budgetContingency: number | null;
  budgetDevMgmt: number | null;
  budgetCof: number | null;
  budgetSalesExp: number | null;
  budgetMarketing: number | null;
}

export interface CfoMonthlyAmountRow {
  projectId: number;
  year: number;
  month: number;
  budgetAmount: number | null;
  actualAmount: number | null;
  projectedAmount: number | null;
}

export interface CfoCostAggregateRow {
  projectId: number;
  categoryCode: string;
  team: string;
  budgetAmount: number | null;
  actualAmount: number | null;
  projectedAmount: number | null;
}

export class CfoDashboardRepository {
  constructor(private readonly db: BaseAdapter) {}

  async ensurePerformanceIndexes(): Promise<void> {
    const statements = [
      // Fast path for projects -> feasibility join used by CFO dashboard header query.
      `CREATE INDEX idx_frc_project_id ON feasibility_reporting_current (project_id)`,
      // Monthly collections/sales are ordered by project/year/month in dashboard queries.
      `CREATE INDEX idx_pmr_project_year_month ON project_monthly_revenue (project_id, year, month)`,
      `CREATE INDEX idx_pms_project_year_month ON project_monthly_sales (project_id, year, month)`,
      // Cost aggregate query groups by project and joins by category_id.
      `CREATE INDEX idx_pmc_project_category ON project_monthly_costs (project_id, category_id)`,
      // Supports other dashboard/cost views filtered by project and time buckets.
      `CREATE INDEX idx_pmc_project_year_month ON project_monthly_costs (project_id, year, month)`,
    ];

    for (const sql of statements) {
      await this.createIndexIfMissing(sql);
    }
  }

  private async createIndexIfMissing(sql: string): Promise<void> {
    try {
      await this.db.query(sql);
    } catch (err: unknown) {
      const code = err as { errorNum?: number; code?: string };
      // Oracle: ORA-00955 name already used, ORA-01408 equivalent column list already indexed.
      // Oracle/Postgres table missing errors are also ignored to keep startup resilient.
      // Postgres: 42P07 relation already exists, 42P01 undefined table.
      if (
        code.errorNum !== 955 &&
        code.errorNum !== 1408 &&
        code.errorNum !== 942 &&
        code.code !== "42P07" &&
        code.code !== "42P01"
      ) {
        throw err;
      }
    }
  }

  async getProjects(): Promise<CfoProjectRow[]> {
    const { rows } = await this.db.query<CfoProjectRow>(
      `SELECT
         p.id AS "projectId",
         p.name AS "projectName",
         ${this.db.dateToText("p.created_at")} AS "projectCreatedAt",
         frc.run_id AS "runId",
         frc.version,
         frc.status,
         ${this.db.dateToText("frc.created_at")} AS "runCreatedAt",
         ${this.db.dateToText("frc.updated_at")} AS "runUpdatedAt",
         ${this.db.dateToText("frc.frozen_at")} AS "frozenAt",
         frc.gfa AS "gfa",
         frc.area_nsa_total AS "nsaTotal",
         frc.kpi_total_units AS "units",
         frc.kpi_total_revenue AS "budgetRevenue",
         frc.kpi_total_cost AS "budgetTotalCost",
         frc.kpi_net_profit AS "budgetProfit",
         frc.kpi_margin_pct AS "budgetMarginPct",
         frc.cost_land AS "budgetLandCost",
         frc.cost_construction AS "budgetHardCost",
         frc.cost_soft AS "budgetSoftCost",
         frc.cost_statutory AS "budgetStatutory",
         frc.cost_contingency AS "budgetContingency",
         frc.cost_dev_mgmt AS "budgetDevMgmt",
         frc.cost_cof AS "budgetCof",
         frc.cost_sales_expense AS "budgetSalesExp",
         frc.cost_marketing AS "budgetMarketing"
       FROM projects p
       LEFT JOIN feasibility_reporting_current frc ON frc.project_id = p.id
       ORDER BY p.id`
    );
    return rows;
  }

  async getMonthlyCollections(): Promise<CfoMonthlyAmountRow[]> {
    const { rows } = await this.db.query<CfoMonthlyAmountRow>(
      `SELECT
         project_id AS "projectId",
         year,
         month,
         budget_amount AS "budgetAmount",
         actual_amount AS "actualAmount",
         projected_amount AS "projectedAmount"
       FROM project_monthly_revenue
       ORDER BY project_id, year, month`
    );
    return rows;
  }

  async getMonthlySales(): Promise<CfoMonthlyAmountRow[]> {
    const { rows } = await this.db.query<CfoMonthlyAmountRow>(
      `SELECT
         project_id AS "projectId",
         year,
         month,
         budget_amount AS "budgetAmount",
         actual_amount AS "actualAmount",
         projected_amount AS "projectedAmount"
       FROM project_monthly_sales
       ORDER BY project_id, year, month`
    );
    return rows;
  }

  async getCostAggregates(): Promise<CfoCostAggregateRow[]> {
    const { rows } = await this.db.query<CfoCostAggregateRow>(
      `SELECT
         pmc.project_id AS "projectId",
         cc.code AS "categoryCode",
         cc.team AS "team",
         COALESCE(SUM(pmc.budget_amount), 0) AS "budgetAmount",
         COALESCE(SUM(pmc.actual_amount), 0) AS "actualAmount",
         COALESCE(SUM(pmc.projected_amount), 0) AS "projectedAmount"
       FROM project_monthly_costs pmc
       JOIN cost_categories cc ON cc.id = pmc.category_id
       GROUP BY pmc.project_id, cc.code, cc.team
       ORDER BY pmc.project_id, cc.team, cc.code`
    );
    return rows;
  }
}
