import type { BaseAdapter } from "../../shared/db/adapters/base.adapter.js";
import type { FeasibilityRun, NormalizedPayload, FeasibilityMetrics } from "../../shared/types/index.js";

const FEASIBILITY_SELECT = `id, project_id AS "projectId", version, status,
              payload, metrics,
              created_at AS "createdAt", updated_at AS "updatedAt", frozen_at AS "frozenAt"`;

export class FeasibilityRepository {
  constructor(private readonly db: BaseAdapter) {}

  async findLatestByProjectId(projectId: number): Promise<FeasibilityRun | null> {
    const { rows } = await this.db.query<FeasibilityRun>(
      `SELECT ${FEASIBILITY_SELECT}
       FROM feasibility_runs
       WHERE project_id = ${this.db.placeholder(1)}
       ORDER BY COALESCE(version, 0) DESC, updated_at DESC
       ${this.db.limitClause(1)}`,
      [projectId]
    );
    return rows[0] ?? null;
  }

  async createDraft(
    projectId: number,
    payload: NormalizedPayload,
    metrics: FeasibilityMetrics
  ): Promise<FeasibilityRun> {
    const ph = (i: number) => this.db.placeholder(i);
    const result = await this.db.insertReturning<FeasibilityRun>(
      "feasibility_runs",
      ["project_id", "version", "status", "payload", "metrics"],
      [projectId, null, "draft", JSON.stringify(payload), JSON.stringify(metrics)],
      FEASIBILITY_SELECT,
      1,
      [ph(1), ph(2), ph(3), this.db.jsonCast(ph(4)), this.db.jsonCast(ph(5))]
    );
    return result.rows[0];
  }

  async updateDraft(
    runId: number,
    payload: NormalizedPayload,
    metrics: FeasibilityMetrics
  ): Promise<FeasibilityRun> {
    const ph = (i: number) => this.db.placeholder(i);
    await this.db.query(
      `UPDATE feasibility_runs
       SET payload = ${this.db.jsonCast(ph(1))},
           metrics = ${this.db.jsonCast(ph(2))},
           updated_at = ${this.db.nowExpression()}
       WHERE id = ${ph(3)} AND status = 'draft'`,
      [JSON.stringify(payload), JSON.stringify(metrics), runId]
    );
    const { rows } = await this.db.query<FeasibilityRun>(
      `SELECT ${FEASIBILITY_SELECT}
       FROM feasibility_runs WHERE id = ${ph(1)}`,
      [runId]
    );
    return rows[0];
  }

  async freeze(runId: number, version: number): Promise<FeasibilityRun> {
    const ph = (i: number) => this.db.placeholder(i);
    await this.db.query(
      `UPDATE feasibility_runs
       SET version = ${ph(1)},
           status = 'frozen',
           frozen_at = ${this.db.nowExpression()},
           updated_at = ${this.db.nowExpression()}
       WHERE id = ${ph(2)} AND status = 'draft'`,
      [version, runId]
    );
    const { rows } = await this.db.query<FeasibilityRun>(
      `SELECT ${FEASIBILITY_SELECT}
       FROM feasibility_runs WHERE id = ${ph(1)}`,
      [runId]
    );
    return rows[0];
  }

  async deleteByRunId(runId: number): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `DELETE FROM feasibility_runs WHERE id = ${this.db.placeholder(1)}`,
      [runId]
    );
    return rowCount > 0;
  }

  async findAllWithMetrics(): Promise<FeasibilityRun[]> {
    const { rows } = await this.db.query<FeasibilityRun>(
      `SELECT ${FEASIBILITY_SELECT}
       FROM (
         SELECT id, project_id, version, status, payload, metrics,
                created_at, updated_at, frozen_at,
                ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY COALESCE(version, 0) DESC, updated_at DESC) AS rn
         FROM feasibility_runs
       ) sub
       WHERE sub.rn = 1`
    );
    return rows;
  }

  async getNextVersion(projectId: number): Promise<number> {
    const { rows } = await this.db.query<{ nextVersion: number }>(
      `SELECT COALESCE(MAX(version), 0) + 1 AS "nextVersion"
       FROM (
         SELECT version
         FROM feasibility_runs
         WHERE project_id = ${this.db.placeholder(1)}
         UNION ALL
         SELECT version
         FROM feasibility_archive
         WHERE project_id = ${this.db.placeholder(2)}
       ) versions`,
      [projectId,projectId]
    );
    return Number(rows[0]?.nextVersion ?? 1);
  }
}
