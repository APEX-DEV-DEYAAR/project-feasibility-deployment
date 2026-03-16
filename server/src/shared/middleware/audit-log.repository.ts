import type { BaseAdapter } from "../db/adapters/base.adapter.js";

export interface AuditEntry {
  username: string;
  role: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}

export class AuditLogRepository {
  constructor(private readonly db: BaseAdapter) {}

  async insert(entry: AuditEntry): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_log (username, role, method, path, status_code, duration_ms)
       VALUES (${this.db.placeholder(1)}, ${this.db.placeholder(2)}, ${this.db.placeholder(3)}, ${this.db.placeholder(4)}, ${this.db.placeholder(5)}, ${this.db.placeholder(6)})`,
      [entry.username, entry.role, entry.method, entry.path, entry.statusCode, entry.durationMs]
    );
  }
}
