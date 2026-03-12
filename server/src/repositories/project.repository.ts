import type { BaseAdapter } from "../db/adapters/base.adapter.js";
import type { Project, ProjectSummary } from "../types/index.js";

export class ProjectRepository {
  constructor(private readonly db: BaseAdapter) {}

  async findAll(): Promise<ProjectSummary[]> {
    const { rows } = await this.db.query<ProjectSummary>(
      `SELECT
         p.id,
         p.name,
         fr.version  AS "latestVersion",
         fr.status,
         ${this.db.boolExpr('fr.run_id IS NOT NULL')} AS "hasFeasibility",
         COALESCE(fr.updated_at, p.created_at) AS "updatedAt"
       FROM projects p
       LEFT JOIN (
         SELECT id AS run_id, project_id, version, status, updated_at,
           ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY COALESCE(version, 0) DESC, updated_at DESC) AS rn
         FROM feasibility_runs
       ) fr ON fr.project_id = p.id AND fr.rn = 1
       ORDER BY COALESCE(fr.updated_at, p.created_at) DESC`
    );
    return rows;
  }

  async findById(id: number): Promise<Project | null> {
    const { rows } = await this.db.query<Project>(
      `SELECT id, name, created_at AS "createdAt"
       FROM projects
       WHERE id = ${this.db.placeholder(1)}`,
      [id]
    );
    return rows[0] ?? null;
  }

  async findByName(name: string): Promise<Project | null> {
    const { rows } = await this.db.query<Project>(
      `SELECT id, name, created_at AS "createdAt"
       FROM projects
       WHERE name = ${this.db.placeholder(1)}`,
      [name]
    );
    return rows[0] ?? null;
  }

  async create(name: string): Promise<Project> {
    const result = await this.db.insertReturning<Project>(
      "projects",
      ["name"],
      [name],
      'id, name, created_at AS "createdAt"'
    );
    return result.rows[0];
  }

  async delete(id: number): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `DELETE FROM projects WHERE id = ${this.db.placeholder(1)}`,
      [id]
    );
    return rowCount > 0;
  }
}
