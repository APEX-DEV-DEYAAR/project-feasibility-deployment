import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BaseAdapter } from "./base.adapter.js";
import type { QueryResult } from "../../types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    const sqlDir = path.resolve(__dirname, "..", "..", "..", "sql", "postgres");

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationFiles = [
      "001_init.sql",
      "002_cost_tracking.sql",
      "004_cost_tracking_v2.sql",
      "005_segregation_v3.sql",
      "006_relational_feasibility.sql",
      "007_sales_staff_discounts.sql",
      "008_collections_forecast.sql",
      "009_collections_forecast_source_fields.sql",
      "010_collections_forecast_lookups.sql",
      "011_collections_forecast_formula_inputs.sql",
    ];

    for (const file of migrationFiles) {
      const alreadyApplied = await this.pool.query<{ filename: string }>(
        "SELECT filename FROM schema_migrations WHERE filename = $1",
        [file]
      );

      if ((alreadyApplied.rowCount ?? 0) > 0) {
        continue;
      }

      const sqlPath = path.join(sqlDir, file);
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, "utf-8");
        await this.pool.query("BEGIN");
        try {
          await this.pool.query(sql);
          await this.pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
          await this.pool.query("COMMIT");
        } catch (error) {
          await this.pool.query("ROLLBACK");
          throw error;
        }
      }
    }
  }

  override placeholder(index: number): string {
    return `$${index}`;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
