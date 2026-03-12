import type { BaseAdapter } from "../db/adapters/base.adapter.js";
import type { AppUser } from "../types/index.js";

export class UserRepository {
  constructor(private readonly db: BaseAdapter) {}

  async findByUsername(username: string): Promise<AppUser | null> {
    const { rows } = await this.db.query<AppUser>(
      `SELECT id, username, password_hash AS "passwordHash", role,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM app_users
       WHERE username = ${this.db.placeholder(1)}`,
      [username]
    );
    return rows[0] ?? null;
  }

  async findById(id: number): Promise<AppUser | null> {
    const { rows } = await this.db.query<AppUser>(
      `SELECT id, username, password_hash AS "passwordHash", role,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM app_users
       WHERE id = ${this.db.placeholder(1)}`,
      [id]
    );
    return rows[0] ?? null;
  }

  async create(username: string, passwordHash: string, role: string): Promise<AppUser> {
    const result = await this.db.insertReturning<AppUser>(
      "app_users",
      ["username", "password_hash", "role"],
      [username, passwordHash, role],
      'id, username, password_hash AS "passwordHash", role, created_at AS "createdAt", updated_at AS "updatedAt"'
    );
    return result.rows[0];
  }

  async listAll(): Promise<Omit<AppUser, "passwordHash">[]> {
    const { rows } = await this.db.query<Omit<AppUser, "passwordHash">>(
      `SELECT id, username, role, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM app_users
       ORDER BY id`
    );
    return rows;
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await this.db.query(
      `UPDATE app_users SET password_hash = ${this.db.placeholder(1)}, updated_at = ${this.db.nowExpression()} WHERE id = ${this.db.placeholder(2)}`,
      [passwordHash, id]
    );
  }

  async count(): Promise<number> {
    const { rows } = await this.db.query<{ cnt: number }>(
      `SELECT COUNT(*) AS "cnt" FROM app_users`
    );
    return Number(rows[0]?.cnt ?? 0);
  }
}
