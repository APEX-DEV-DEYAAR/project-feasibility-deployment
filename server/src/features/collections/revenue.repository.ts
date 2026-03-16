import type { BaseAdapter } from "../../shared/db/adapters/base.adapter.js";
import type {
  ProjectMonthlyCollections,
  SaveMonthlyCollectionsPayload,
} from "../../shared/types/index.js";

const COLLECTIONS_INSERT_COLS = [
  "project_id", "year", "month",
  "budget_amount", "actual_amount", "projected_amount", "notes", "created_by",
] as const;

const COLLECTIONS_UPDATE_COLS = [
  "budget_amount", "actual_amount", "projected_amount", "notes", "created_by",
] as const;

const COLLECTIONS_CONFLICT_COLS = ["project_id", "year", "month"] as const;

const COLLECTIONS_SELECT = `id,
         project_id AS "projectId",
         year,
         month,
         budget_amount AS "budgetAmount",
         actual_amount AS "actualAmount",
         projected_amount AS "projectedAmount",
         notes,
         created_by AS "createdBy",
         created_at AS "createdAt",
         updated_at AS "updatedAt"`;

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
         ${COLLECTIONS_SELECT}
       FROM project_monthly_revenue
       WHERE project_id = ${this.db.placeholder(1)}
         ${yearFilter}
       ORDER BY year, month`,
      params
    );
    return rows;
  }

  async saveMonthlyCollections(payload: SaveMonthlyCollectionsPayload): Promise<ProjectMonthlyCollections> {
    const result = await this.db.upsertReturning<ProjectMonthlyCollections>({
      table: "project_monthly_revenue",
      conflictCols: [...COLLECTIONS_CONFLICT_COLS],
      insertCols: [...COLLECTIONS_INSERT_COLS],
      updateCols: [...COLLECTIONS_UPDATE_COLS],
      values: [
        payload.projectId,
        payload.year,
        payload.month,
        payload.budgetAmount ?? null,
        payload.actualAmount ?? null,
        payload.projectedAmount ?? null,
        payload.notes ?? null,
        payload.createdBy ?? null,
      ],
      selectExpr: COLLECTIONS_SELECT,
      extraSetClauses: [`updated_at = ${this.db.nowExpression()}`],
    });
    return result.rows[0];
  }

  async bulkSaveMonthlyCollections(
    payloads: SaveMonthlyCollectionsPayload[]
  ): Promise<ProjectMonthlyCollections[]> {
    if (payloads.length > 500) {
      throw new Error("Bulk operations are limited to 500 items");
    }
    if (payloads.length === 0) return [];

    const rows = payloads.map((p) => [
      p.projectId,
      p.year,
      p.month,
      p.budgetAmount ?? null,
      p.actualAmount ?? null,
      p.projectedAmount ?? null,
      p.notes ?? null,
      p.createdBy ?? null,
    ]);

    const result = await this.db.bulkUpsertReturning<ProjectMonthlyCollections>({
      table: "project_monthly_revenue",
      conflictCols: [...COLLECTIONS_CONFLICT_COLS],
      insertCols: [...COLLECTIONS_INSERT_COLS],
      updateCols: [...COLLECTIONS_UPDATE_COLS],
      selectExpr: COLLECTIONS_SELECT,
      extraSetClauses: [`updated_at = ${this.db.nowExpression()}`],
      rows,
    });

    return result.rows;
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
