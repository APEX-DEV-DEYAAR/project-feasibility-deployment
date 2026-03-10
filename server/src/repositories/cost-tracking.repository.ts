import type { BaseAdapter } from "../db/adapters/base.adapter.js";
import type {
  CostCategory,
  ProjectMonthlyCost,
  CostSummaryItem,
  CostAnnualSummaryItem,
  SaveMonthlyCostPayload,
  TeamCode,
} from "../types/index.js";

export class CostTrackingRepository {
  constructor(private readonly db: BaseAdapter) {}

  // ---- Cost Categories ----

  async getCategories(team?: TeamCode): Promise<CostCategory[]> {
    const params: unknown[] = [];
    let teamFilter = "";
    if (team) {
      params.push(team);
      teamFilter = `WHERE team = ${this.db.placeholder(1)}`;
    }
    const { rows } = await this.db.query<CostCategory>(
      `SELECT
         id::int,
         code,
         name,
         description,
         display_order AS "displayOrder",
         team
       FROM cost_categories
       ${teamFilter}
       ORDER BY display_order`,
      params
    );
    return rows;
  }

  // ---- Monthly Costs ----

  async getMonthlyCosts(
    projectId: number,
    year?: number,
    team?: TeamCode
  ): Promise<ProjectMonthlyCost[]> {
    const params: unknown[] = [projectId];
    let paramIdx = 1;

    let yearFilter = "";
    if (typeof year === "number") {
      paramIdx++;
      params.push(year);
      yearFilter = `AND pmc.year = ${this.db.placeholder(paramIdx)}`;
    }

    let teamFilter = "";
    if (team) {
      paramIdx++;
      params.push(team);
      teamFilter = `AND cc.team = ${this.db.placeholder(paramIdx)}`;
    }

    const { rows } = await this.db.query<ProjectMonthlyCost>(
      `SELECT
         pmc.id::int,
         pmc.project_id::int AS "projectId",
         pmc.category_id::int AS "categoryId",
         pmc.year,
         pmc.month,
         pmc.actual_amount::float AS "actualAmount",
         pmc.projected_amount::float AS "projectedAmount",
         pmc.budget_amount::float AS "budgetAmount",
         pmc.notes,
         pmc.created_by AS "createdBy",
         pmc.created_at AS "createdAt",
         pmc.updated_at AS "updatedAt",
         cc.name AS "categoryName",
         cc.code AS "categoryCode"
       FROM project_monthly_costs pmc
       JOIN cost_categories cc ON cc.id = pmc.category_id
       WHERE pmc.project_id = ${this.db.placeholder(1)}
         ${yearFilter}
         ${teamFilter}
       ORDER BY pmc.year, pmc.month, cc.display_order`,
      params
    );
    return rows;
  }

  async getMonthlyCostsForAllProjects(year: number): Promise<ProjectMonthlyCost[]> {
    const { rows } = await this.db.query<ProjectMonthlyCost>(
      `SELECT
         pmc.id::int,
         pmc.project_id::int AS "projectId",
         pmc.category_id::int AS "categoryId",
         pmc.year,
         pmc.month,
         pmc.actual_amount::float AS "actualAmount",
         pmc.projected_amount::float AS "projectedAmount",
         pmc.budget_amount::float AS "budgetAmount",
         pmc.notes,
         pmc.created_by AS "createdBy",
         pmc.created_at AS "createdAt",
         pmc.updated_at AS "updatedAt",
         cc.name AS "categoryName",
         cc.code AS "categoryCode",
         p.name AS "projectName"
       FROM project_monthly_costs pmc
       JOIN cost_categories cc ON cc.id = pmc.category_id
       JOIN projects p ON p.id = pmc.project_id
       WHERE pmc.year = ${this.db.placeholder(1)}
       ORDER BY p.name, pmc.month, cc.display_order`,
      [year]
    );
    return rows;
  }

  async saveMonthlyCost(payload: SaveMonthlyCostPayload): Promise<ProjectMonthlyCost> {
    const { rows } = await this.db.query<ProjectMonthlyCost>(
      `INSERT INTO project_monthly_costs
         (project_id, category_id, year, month, actual_amount, projected_amount, budget_amount, notes, created_by)
       VALUES
         (${this.db.placeholder(1)}, ${this.db.placeholder(2)}, ${this.db.placeholder(3)},
          ${this.db.placeholder(4)}, ${this.db.placeholder(5)}, ${this.db.placeholder(6)},
          ${this.db.placeholder(7)}, ${this.db.placeholder(8)}, ${this.db.placeholder(9)})
       ON CONFLICT (project_id, category_id, year, month)
       DO UPDATE SET
         actual_amount = EXCLUDED.actual_amount,
         projected_amount = EXCLUDED.projected_amount,
         budget_amount = EXCLUDED.budget_amount,
         notes = EXCLUDED.notes,
         created_by = EXCLUDED.created_by,
         updated_at = NOW()
       RETURNING
         id::int,
         project_id::int AS "projectId",
         category_id::int AS "categoryId",
         year,
         month,
         actual_amount::float AS "actualAmount",
         projected_amount::float AS "projectedAmount",
         budget_amount::float AS "budgetAmount",
         notes,
         created_by AS "createdBy",
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [
        payload.projectId,
        payload.categoryId,
        payload.year,
        payload.month,
        payload.actualAmount ?? null,
        payload.projectedAmount ?? 0,
        payload.budgetAmount ?? null,
        payload.notes ?? null,
        payload.createdBy ?? null,
      ]
    );
    return rows[0];
  }

  async bulkSaveMonthlyCosts(
    payloads: SaveMonthlyCostPayload[]
  ): Promise<ProjectMonthlyCost[]> {
    const results: ProjectMonthlyCost[] = [];
    for (const payload of payloads) {
      const result = await this.saveMonthlyCost(payload);
      results.push(result);
    }
    return results;
  }

  async deleteMonthlyCost(
    projectId: number,
    categoryId: number,
    year: number,
    month: number
  ): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `DELETE FROM project_monthly_costs
       WHERE project_id = ${this.db.placeholder(1)}
         AND category_id = ${this.db.placeholder(2)}
         AND year = ${this.db.placeholder(3)}
         AND month = ${this.db.placeholder(4)}`,
      [projectId, categoryId, year, month]
    );
    return rowCount > 0;
  }

  // ---- Summary Views ----

  async getCostSummary(projectId: number, year?: number): Promise<CostSummaryItem[]> {
    const params: unknown[] = [projectId];
    const yearFilter =
      typeof year === "number"
        ? `AND year = ${this.db.placeholder(2)}`
        : "";

    if (typeof year === "number") {
      params.push(year);
    }

    const { rows } = await this.db.query<CostSummaryItem>(
      `SELECT
         project_id::int AS "projectId",
         project_name AS "projectName",
         year,
         month,
         total_actual::float AS "totalActual",
         total_projected::float AS "totalProjected",
         total_budget::float AS "totalBudget",
         blended_total::float AS "blendedTotal",
         categories_with_actual::int AS "categoriesWithActual",
         total_categories::int AS "totalCategories"
       FROM project_cost_summary
       WHERE project_id = ${this.db.placeholder(1)}
         ${yearFilter}
       ORDER BY year, month`,
      params
    );
    return rows;
  }

  async getAnnualSummary(projectId: number, year?: number): Promise<CostAnnualSummaryItem[]> {
    const params: unknown[] = [projectId];
    const yearFilter =
      typeof year === "number"
        ? `AND year = ${this.db.placeholder(2)}`
        : "";

    if (typeof year === "number") {
      params.push(year);
    }

    const { rows } = await this.db.query<CostAnnualSummaryItem>(
      `SELECT
         project_id::int AS "projectId",
         project_name AS "projectName",
         year,
         category_code AS "categoryCode",
         category_name AS "categoryName",
         category_team AS "categoryTeam",
         annual_actual::float AS "annualActual",
         annual_projected::float AS "annualProjected",
         annual_budget::float AS "annualBudget",
         ytd_actual::float AS "ytdActual",
         ytd_projected::float AS "ytdProjected",
         months_with_actual::int AS "monthsWithActual"
       FROM project_cost_annual_summary
       WHERE project_id = ${this.db.placeholder(1)}
         ${yearFilter}
       ORDER BY year, category_code`,
      params
    );
    return rows;
  }

  // ---- Initialize default data for a project/year ----

  async initializeYear(
    projectId: number,
    year: number,
    defaultProjectedAmount: number = 0,
    createdBy?: string,
    team?: TeamCode
  ): Promise<ProjectMonthlyCost[]> {
    const categories = await this.getCategories(team);
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    const payloads: SaveMonthlyCostPayload[] = [];
    for (const category of categories) {
      for (const month of months) {
        payloads.push({
          projectId,
          categoryId: category.id,
          year,
          month,
          actualAmount: null,
          projectedAmount: defaultProjectedAmount,
          budgetAmount: null,
          notes: undefined,
          createdBy,
        });
      }
    }

    return this.bulkSaveMonthlyCosts(payloads);
  }

  // ---- Team Activity ----

  async getTeamLastActivity(
    projectId: number,
    year: number
  ): Promise<Record<string, string | null>> {
    // Cost team activity (commercial, sales, marketing)
    const { rows: costActivity } = await this.db.query<{ team: string; lastActivity: string }>(
      `SELECT cc.team, MAX(pmc.updated_at) AS "lastActivity"
       FROM project_monthly_costs pmc
       JOIN cost_categories cc ON cc.id = pmc.category_id
       WHERE pmc.project_id = ${this.db.placeholder(1)}
         AND pmc.year = ${this.db.placeholder(2)}
         AND (pmc.actual_amount IS NOT NULL OR pmc.projected_amount IS NOT NULL)
       GROUP BY cc.team`,
      [projectId, year]
    );

    // Revenue team activity (collections)
    const { rows: revenueActivity } = await this.db.query<{ lastActivity: string }>(
      `SELECT MAX(updated_at) AS "lastActivity"
       FROM project_monthly_revenue
       WHERE project_id = ${this.db.placeholder(1)}
         AND year = ${this.db.placeholder(2)}
         AND (actual_amount IS NOT NULL OR projected_amount IS NOT NULL)`,
      [projectId, year]
    );

    const result: Record<string, string | null> = {
      commercial: null,
      sales: null,
      marketing: null,
      collections: null,
    };

    for (const row of costActivity) {
      result[row.team] = row.lastActivity;
    }

    if (revenueActivity.length > 0 && revenueActivity[0].lastActivity) {
      result.collections = revenueActivity[0].lastActivity;
    }

    return result;
  }

  // ---- Clear all cost data ----

  async clearAllData(): Promise<number> {
    const { rowCount } = await this.db.query(
      `DELETE FROM project_monthly_costs`
    );
    return rowCount;
  }

  async clearProjectData(projectId: number, team?: TeamCode): Promise<number> {
    if (team) {
      const { rowCount } = await this.db.query(
        `DELETE FROM project_monthly_costs pmc
         USING cost_categories cc
         WHERE pmc.category_id = cc.id
           AND pmc.project_id = ${this.db.placeholder(1)}
           AND cc.team = ${this.db.placeholder(2)}`,
        [projectId, team]
      );
      return rowCount;
    }

    const { rowCount } = await this.db.query(
      `DELETE FROM project_monthly_costs WHERE project_id = ${this.db.placeholder(1)}`,
      [projectId]
    );
    return rowCount;
  }
}
