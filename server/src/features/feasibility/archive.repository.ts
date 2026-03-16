import type { BaseAdapter } from "../../shared/db/adapters/base.adapter.js";
import type { ArchivedRun, FeasibilityRun } from "../../shared/types/index.js";

const ARCHIVE_SELECT = `id, original_run_id AS "originalRunId", project_id AS "projectId",
              version, payload, metrics, frozen_at AS "frozenAt", archived_at AS "archivedAt"`;

export class ArchiveRepository {
  constructor(private readonly db: BaseAdapter) {}

  async archiveRun(run: FeasibilityRun): Promise<ArchivedRun> {
    const ph = (i: number) => this.db.placeholder(i);
    const result = await this.db.insertReturning<ArchivedRun>(
      "feasibility_archive",
      ["original_run_id", "project_id", "version", "payload", "metrics", "frozen_at"],
      [
        run.id,
        run.projectId,
        run.version,
        JSON.stringify(run.payload),
        JSON.stringify(run.metrics),
        run.frozenAt,
      ],
      ARCHIVE_SELECT,
      1,
      [ph(1), ph(2), ph(3), this.db.jsonCast(ph(4)), this.db.jsonCast(ph(5)), ph(6)]
    );
    return result.rows[0];
  }

  async findByProjectId(projectId: number): Promise<ArchivedRun[]> {
    const { rows } = await this.db.query<ArchivedRun>(
      `SELECT ${ARCHIVE_SELECT}
       FROM feasibility_archive
       WHERE project_id = ${this.db.placeholder(1)}
       ORDER BY version DESC`,
      [projectId]
    );
    return rows;
  }
}
