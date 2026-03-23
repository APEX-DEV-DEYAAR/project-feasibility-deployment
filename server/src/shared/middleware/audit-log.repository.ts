import type { BaseAdapter } from "../db/adapters/base.adapter.js";

export interface AuditEntry {
  username: string;
  role: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  resourceId?: string | null;
  resourceType?: string | null;
  action?: string | null;
  bodySnapshot?: string | null;
}

export class AuditLogRepository {
  constructor(private readonly db: BaseAdapter) {}

  async insert(entry: AuditEntry): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_log (username, role, method, path, status_code, duration_ms, resource_id, resource_type, action, body_snapshot)
       VALUES (${this.db.placeholder(1)}, ${this.db.placeholder(2)}, ${this.db.placeholder(3)}, ${this.db.placeholder(4)}, ${this.db.placeholder(5)}, ${this.db.placeholder(6)}, ${this.db.placeholder(7)}, ${this.db.placeholder(8)}, ${this.db.placeholder(9)}, ${this.db.placeholder(10)})`,
      [
        entry.username,
        entry.role,
        entry.method,
        entry.path,
        entry.statusCode,
        entry.durationMs,
        entry.resourceId ?? null,
        entry.resourceType ?? null,
        entry.action ?? null,
        entry.bodySnapshot ?? null,
      ]
    );
  }
}
