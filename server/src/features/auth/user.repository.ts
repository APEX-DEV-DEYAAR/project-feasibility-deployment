import type { BaseAdapter } from "../../shared/db/adapters/base.adapter.js";
import type { AppUser, UserRole } from "../../shared/types/index.js";

/** Parse comma-separated role string into UserRole[] */
function parseRoles(role: string): UserRole[] {
  return role.split(",").map((r) => r.trim()).filter(Boolean) as UserRole[];
}

/** Map a raw DB row (with `role` string) to AppUser (with `roles` array) */
function mapRow(row: Record<string, unknown>): AppUser {
  return {
    ...row,
    roles: parseRoles(String(row.role ?? "")),
  } as unknown as AppUser;
}

export class UserRepository {
  constructor(private readonly db: BaseAdapter) {}

  async findByUsername(username: string): Promise<AppUser | null> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT id, username, password_hash AS "passwordHash", role,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM app_users
       WHERE username = ${this.db.placeholder(1)}`,
      [username]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findById(id: number): Promise<AppUser | null> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT id, username, password_hash AS "passwordHash", role,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM app_users
       WHERE id = ${this.db.placeholder(1)}`,
      [id]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async create(username: string, passwordHash: string, roles: string): Promise<AppUser> {
    const result = await this.db.insertReturning<Record<string, unknown>>(
      "app_users",
      ["username", "password_hash", "role"],
      [username, passwordHash, roles],
      'id, username, password_hash AS "passwordHash", role, created_at AS "createdAt", updated_at AS "updatedAt"'
    );
    return mapRow(result.rows[0]);
  }

  async listAll(): Promise<Omit<AppUser, "passwordHash">[]> {
    const { rows } = await this.db.query<Record<string, unknown>>(
      `SELECT id, username, role, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM app_users
       ORDER BY id`
    );
    return rows.map((row) => {
      const mapped = mapRow(row);
      const { passwordHash: _, ...rest } = mapped;
      return rest;
    });
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await this.db.query(
      `UPDATE app_users SET password_hash = ${this.db.placeholder(1)}, updated_at = ${this.db.nowExpression()} WHERE id = ${this.db.placeholder(2)}`,
      [passwordHash, id]
    );
  }

  async deleteById(id: number): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `DELETE FROM app_users WHERE id = ${this.db.placeholder(1)}`,
      [id]
    );
    return rowCount > 0;
  }

  async count(): Promise<number> {
    const { rows } = await this.db.query<{ cnt: number }>(
      `SELECT COUNT(*) AS "cnt" FROM app_users`
    );
    return Number(rows[0]?.cnt ?? 0);
  }

  async updateRoles(id: number, roles: string): Promise<void> {
    await this.db.query(
      `UPDATE app_users SET role = ${this.db.placeholder(1)}, updated_at = ${this.db.nowExpression()} WHERE id = ${this.db.placeholder(2)}`,
      [roles, id]
    );
  }
}
