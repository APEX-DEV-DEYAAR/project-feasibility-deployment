import type { BaseAdapter } from "../db/adapters/base.adapter.js";
import type { ArchivedRun, FeasibilityRun } from "../types/index.js";

export class ArchiveRepository {
  constructor(private readonly db: BaseAdapter) {}

  async archiveRun(run: FeasibilityRun): Promise<ArchivedRun> {
    const { rows } = await this.db.query<ArchivedRun>(
      `INSERT INTO feasibility_archive
         (original_run_id, project_id, version, payload, metrics, frozen_at)
       VALUES (${this.db.placeholder(1)}, ${this.db.placeholder(2)}, ${this.db.placeholder(3)},
               ${this.db.placeholder(4)}::jsonb, ${this.db.placeholder(5)}::jsonb, ${this.db.placeholder(6)})
       RETURNING id::int, original_run_id::int AS "originalRunId", project_id::int AS "projectId",
                 version::int, payload, metrics, frozen_at AS "frozenAt", archived_at AS "archivedAt"`,
      [
        run.id,
        run.projectId,
        run.version,
        JSON.stringify(run.payload),
        JSON.stringify(run.metrics),
        run.frozenAt,
      ]
    );
    return rows[0];
  }

  async findByProjectId(projectId: number): Promise<ArchivedRun[]> {
    const { rows } = await this.db.query<ArchivedRun>(
      `SELECT id::int, original_run_id::int AS "originalRunId", project_id::int AS "projectId",
              version::int, payload, metrics, frozen_at AS "frozenAt", archived_at AS "archivedAt"
       FROM feasibility_archive
       WHERE project_id = ${this.db.placeholder(1)}
       ORDER BY version DESC`,
      [projectId]
    );
    return rows;
  }
}
