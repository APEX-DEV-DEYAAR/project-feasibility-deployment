import type { BaseAdapter } from "../db/adapters/base.adapter.js";
import type { FeasibilityRun, NormalizedPayload, FeasibilityMetrics } from "../types/index.js";

export class FeasibilityRepository {
  constructor(private readonly db: BaseAdapter) {}

  async findLatestByProjectId(projectId: number): Promise<FeasibilityRun | null> {
    const { rows } = await this.db.query<FeasibilityRun>(
      `SELECT id::int, project_id::int AS "projectId", version::int, status,
              payload, metrics,
              created_at AS "createdAt", updated_at AS "updatedAt", frozen_at AS "frozenAt"
       FROM feasibility_runs
       WHERE project_id = ${this.db.placeholder(1)}
       ORDER BY COALESCE(version, 0) DESC, updated_at DESC
       LIMIT 1`,
      [projectId]
    );
    return rows[0] ?? null;
  }

  async createDraft(
    projectId: number,
    payload: NormalizedPayload,
    metrics: FeasibilityMetrics
  ): Promise<FeasibilityRun> {
    const { rows } = await this.db.query<FeasibilityRun>(
      `INSERT INTO feasibility_runs (project_id, version, status, payload, metrics)
       VALUES (${this.db.placeholder(1)}, NULL, 'draft',
               ${this.db.placeholder(2)}::jsonb, ${this.db.placeholder(3)}::jsonb)
       RETURNING id::int, project_id::int AS "projectId", version::int, status,
                 payload, metrics,
                 created_at AS "createdAt", updated_at AS "updatedAt", frozen_at AS "frozenAt"`,
      [projectId, JSON.stringify(payload), JSON.stringify(metrics)]
    );
    return rows[0];
  }

  async updateDraft(
    runId: number,
    payload: NormalizedPayload,
    metrics: FeasibilityMetrics
  ): Promise<FeasibilityRun> {
    const { rows } = await this.db.query<FeasibilityRun>(
      `UPDATE feasibility_runs
       SET payload = ${this.db.placeholder(1)}::jsonb,
           metrics = ${this.db.placeholder(2)}::jsonb,
           updated_at = NOW()
       WHERE id = ${this.db.placeholder(3)} AND status = 'draft'
       RETURNING id::int, project_id::int AS "projectId", version::int, status,
                 payload, metrics,
                 created_at AS "createdAt", updated_at AS "updatedAt", frozen_at AS "frozenAt"`,
      [JSON.stringify(payload), JSON.stringify(metrics), runId]
    );
    return rows[0];
  }

  async freeze(runId: number, version: number): Promise<FeasibilityRun> {
    const { rows } = await this.db.query<FeasibilityRun>(
      `UPDATE feasibility_runs
       SET version = ${this.db.placeholder(1)},
           status = 'frozen',
           frozen_at = NOW(),
           updated_at = NOW()
       WHERE id = ${this.db.placeholder(2)} AND status = 'draft'
       RETURNING id::int, project_id::int AS "projectId", version::int, status,
                 payload, metrics,
                 created_at AS "createdAt", updated_at AS "updatedAt", frozen_at AS "frozenAt"`,
      [version, runId]
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
      `SELECT DISTINCT ON (project_id)
              id::int, project_id::int AS "projectId", version::int, status,
              payload, metrics,
              created_at AS "createdAt", updated_at AS "updatedAt", frozen_at AS "frozenAt"
       FROM feasibility_runs
       ORDER BY project_id, COALESCE(version, 0) DESC, updated_at DESC`
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
         WHERE project_id = ${this.db.placeholder(1)}
       ) versions`,
      [projectId]
    );
    return Number(rows[0]?.nextVersion ?? 1);
  }
}
