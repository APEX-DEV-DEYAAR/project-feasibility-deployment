import pg from "pg";
import { BaseAdapter } from "./base.adapter.js";
import type { QueryResult } from "../../types/index.js";

// Return NUMERIC and BIGINT as JavaScript numbers instead of strings
pg.types.setTypeParser(20, (val: string) => parseInt(val, 10));    // BIGINT (int8)
pg.types.setTypeParser(1700, (val: string) => parseFloat(val));    // NUMERIC / DECIMAL

export class PostgresAdapter extends BaseAdapter {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    super();
    this.pool = new pg.Pool({ connectionString });
  }

  async query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const result = await this.pool.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  }

  async initialize(): Promise<void> {
    // Migrations disabled — run them manually when needed
  }

  override placeholder(index: number): string {
    return `$${index}`;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
