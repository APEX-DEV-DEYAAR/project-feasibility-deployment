import type { BaseAdapter } from "../db/adapters/base.adapter.js";
import type { Project, ProjectSummary } from "../types/index.js";

export class ProjectRepository {
  constructor(private readonly db: BaseAdapter) {}

  async findAll(): Promise<ProjectSummary[]> {
    const { rows } = await this.db.query<ProjectSummary>(
      `SELECT
         p.id::int,
         p.name,
         fr.version::int  AS "latestVersion",
         fr.status,
         (fr.run_id IS NOT NULL) AS "hasFeasibility",
         COALESCE(fr.updated_at, p.created_at) AS "updatedAt"
       FROM projects p
       LEFT JOIN LATERAL (
         SELECT id AS run_id, version, status, updated_at
         FROM feasibility_runs
         WHERE project_id = p.id
         ORDER BY COALESCE(version, 0) DESC, updated_at DESC
         LIMIT 1
       ) fr ON true
       ORDER BY COALESCE(fr.updated_at, p.created_at) DESC`
    );
    return rows;
  }

  async findById(id: number): Promise<Project | null> {
    const { rows } = await this.db.query<Project>(
      `SELECT id::int, name, created_at AS "createdAt"
       FROM projects
       WHERE id = ${this.db.placeholder(1)}`,
      [id]
    );
    return rows[0] ?? null;
  }

  async findByName(name: string): Promise<Project | null> {
    const { rows } = await this.db.query<Project>(
      `SELECT id::int, name, created_at AS "createdAt"
       FROM projects
       WHERE name = ${this.db.placeholder(1)}`,
      [name]
    );
    return rows[0] ?? null;
  }

  async create(name: string): Promise<Project> {
    const { rows } = await this.db.query<Project>(
      `INSERT INTO projects (name)
       VALUES (${this.db.placeholder(1)})
       RETURNING id, name, created_at AS "createdAt"`,
      [name]
    );
    return rows[0];
  }

  async delete(id: number): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `DELETE FROM projects WHERE id = ${this.db.placeholder(1)}`,
      [id]
    );
    return rowCount > 0;
  }
}
