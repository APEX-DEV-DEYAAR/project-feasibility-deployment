import type { BaseAdapter } from "../db/adapters/base.adapter.js";
import type {
  ProjectMonthlyCollections,
  SaveMonthlyCollectionsPayload,
} from "../types/index.js";

export class CollectionsRepository {
  constructor(private readonly db: BaseAdapter) {}

  async getMonthlyCollections(
    projectId: number,
    year?: number
  ): Promise<ProjectMonthlyCollections[]> {
    const params: unknown[] = [projectId];
    let yearFilter = "";
    if (typeof year === "number") {
      params.push(year);
      yearFilter = `AND year = ${this.db.placeholder(2)}`;
    }

    const { rows } = await this.db.query<ProjectMonthlyCollections>(
      `SELECT
         id::int,
         project_id::int AS "projectId",
         year,
         month,
         budget_amount::float AS "budgetAmount",
         actual_amount::float AS "actualAmount",
         projected_amount::float AS "projectedAmount",
         notes,
         created_by AS "createdBy",
         created_at AS "createdAt",
         updated_at AS "updatedAt"
       FROM project_monthly_revenue
       WHERE project_id = ${this.db.placeholder(1)}
         ${yearFilter}
       ORDER BY year, month`,
      params
    );
    return rows;
  }

  async saveMonthlyCollections(payload: SaveMonthlyCollectionsPayload): Promise<ProjectMonthlyCollections> {
    const { rows } = await this.db.query<ProjectMonthlyCollections>(
      `INSERT INTO project_monthly_revenue
         (project_id, year, month, budget_amount, actual_amount, projected_amount, notes, created_by)
       VALUES
         (${this.db.placeholder(1)}, ${this.db.placeholder(2)}, ${this.db.placeholder(3)},
          ${this.db.placeholder(4)}, ${this.db.placeholder(5)}, ${this.db.placeholder(6)},
          ${this.db.placeholder(7)}, ${this.db.placeholder(8)})
       ON CONFLICT (project_id, year, month)
       DO UPDATE SET
         budget_amount = EXCLUDED.budget_amount,
         actual_amount = EXCLUDED.actual_amount,
         projected_amount = EXCLUDED.projected_amount,
         notes = EXCLUDED.notes,
         created_by = EXCLUDED.created_by,
         updated_at = NOW()
       RETURNING
         id::int,
         project_id::int AS "projectId",
         year,
         month,
         budget_amount::float AS "budgetAmount",
         actual_amount::float AS "actualAmount",
         projected_amount::float AS "projectedAmount",
         notes,
         created_by AS "createdBy",
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [
        payload.projectId,
        payload.year,
        payload.month,
        payload.budgetAmount ?? null,
        payload.actualAmount ?? null,
        payload.projectedAmount ?? null,
        payload.notes ?? null,
        payload.createdBy ?? null,
      ]
    );
    return rows[0];
  }

  async bulkSaveMonthlyCollections(
    payloads: SaveMonthlyCollectionsPayload[]
  ): Promise<ProjectMonthlyCollections[]> {
    const results: ProjectMonthlyCollections[] = [];
    for (const payload of payloads) {
      const result = await this.saveMonthlyCollections(payload);
      results.push(result);
    }
    return results;
  }

  async deleteMonthlyCollections(
    projectId: number,
    year: number,
    month: number
  ): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `DELETE FROM project_monthly_revenue
       WHERE project_id = ${this.db.placeholder(1)}
         AND year = ${this.db.placeholder(2)}
         AND month = ${this.db.placeholder(3)}`,
      [projectId, year, month]
    );
    return rowCount > 0;
  }

  async clearProjectCollections(projectId: number): Promise<number> {
    const { rowCount } = await this.db.query(
      `DELETE FROM project_monthly_revenue WHERE project_id = ${this.db.placeholder(1)}`,
      [projectId]
    );
    return rowCount;
  }
}
