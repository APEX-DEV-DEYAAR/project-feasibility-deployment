import { logger } from "../../shared/logger.js";
import type { BaseAdapter } from "../../shared/db/adapters/base.adapter.js";
import type { MetricOverride } from "../../shared/types/index.js";

interface OverrideRow {
  metricKey: string;
  originalValue: string;
  overrideValue: string;
  justification: string;
}

function toOverride(row: OverrideRow): MetricOverride {
  return {
    metricKey: row.metricKey,
    originalValue: Number(row.originalValue),
    overrideValue: Number(row.overrideValue),
    justification: row.justification,
  };
}

export class OverridesRepository {
  constructor(private readonly db: BaseAdapter) {}

  /** Ensure override tables exist. Safe to call on every startup. */
  async ensureTables(): Promise<void> {
    const isOracle = this.db.placeholder(0) === ':0';

    const tables = [
      {
        name: "feasibility_run_overrides",
        fk: "run_id",
        fkRef: "feasibility_runs(id)",
        constraint: "uq_run_override",
      },
      {
        name: "feasibility_archive_overrides",
        fk: "archive_id",
        fkRef: "feasibility_archive(id)",
        constraint: "uq_archive_override",
      },
    ];

    for (const t of tables) {
      const ddl = isOracle
        ? `CREATE TABLE ${t.name} (
            id              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            ${t.fk}         NUMBER NOT NULL REFERENCES ${t.fkRef} ON DELETE CASCADE,
            metric_key      VARCHAR2(200) NOT NULL,
            original_value  NUMBER NOT NULL,
            override_value  NUMBER NOT NULL,
            justification   CLOB DEFAULT '' NOT NULL,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT ${t.constraint} UNIQUE (${t.fk}, metric_key)
          )`
        : `CREATE TABLE IF NOT EXISTS ${t.name} (
            id              BIGSERIAL PRIMARY KEY,
            ${t.fk}         BIGINT NOT NULL REFERENCES ${t.fkRef} ON DELETE CASCADE,
            metric_key      TEXT NOT NULL,
            original_value  NUMERIC NOT NULL,
            override_value  NUMERIC NOT NULL,
            justification   TEXT NOT NULL DEFAULT '',
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT ${t.constraint} UNIQUE (${t.fk}, metric_key)
          )`;

      try {
        await this.db.query(ddl);
        logger.info({ table: t.name }, "Created table");
      } catch (err: unknown) {
        const code = (err as { errorNum?: number; code?: string });
        // ORA-00955 = table already exists, 42P07 = Postgres table already exists
        if (code.errorNum === 955 || code.code === '42P07') {
          // table already exists — OK
        } else {
          throw err;
        }
      }
    }
  }

  async findByRunId(runId: number): Promise<MetricOverride[]> {
    const ph = this.db.placeholder(1);
    const { rows } = await this.db.query<OverrideRow>(
      `SELECT metric_key AS "metricKey", original_value AS "originalValue",
              override_value AS "overrideValue", justification
       FROM feasibility_run_overrides
       WHERE run_id = ${ph}
       ORDER BY metric_key`,
      [runId]
    );
    return rows.map(toOverride);
  }

  async saveForRun(runId: number, overrides: MetricOverride[]): Promise<void> {
    const ph = this.db.placeholder(1);
    await this.db.query(
      `DELETE FROM feasibility_run_overrides WHERE run_id = ${ph}`,
      [runId]
    );
    for (const ov of overrides) {
      const p = (i: number) => this.db.placeholder(i);
      await this.db.query(
        `INSERT INTO feasibility_run_overrides (run_id, metric_key, original_value, override_value, justification)
         VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)})`,
        [runId, ov.metricKey, ov.originalValue, ov.overrideValue, ov.justification]
      );
    }
  }

  async findByArchiveId(archiveId: number): Promise<MetricOverride[]> {
    const ph = this.db.placeholder(1);
    const { rows } = await this.db.query<OverrideRow>(
      `SELECT metric_key AS "metricKey", original_value AS "originalValue",
              override_value AS "overrideValue", justification
       FROM feasibility_archive_overrides
       WHERE archive_id = ${ph}
       ORDER BY metric_key`,
      [archiveId]
    );
    return rows.map(toOverride);
  }

  async saveForArchive(archiveId: number, overrides: MetricOverride[]): Promise<void> {
    const ph = this.db.placeholder(1);
    await this.db.query(
      `DELETE FROM feasibility_archive_overrides WHERE archive_id = ${ph}`,
      [archiveId]
    );
    for (const ov of overrides) {
      const p = (i: number) => this.db.placeholder(i);
      await this.db.query(
        `INSERT INTO feasibility_archive_overrides (archive_id, metric_key, original_value, override_value, justification)
         VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)})`,
        [archiveId, ov.metricKey, ov.originalValue, ov.overrideValue, ov.justification]
      );
    }
  }

  async copyRunToArchive(runId: number, archiveId: number): Promise<void> {
    const p = (i: number) => this.db.placeholder(i);
    await this.db.query(
      `INSERT INTO feasibility_archive_overrides (archive_id, metric_key, original_value, override_value, justification)
       SELECT ${p(1)}, metric_key, original_value, override_value, justification
       FROM feasibility_run_overrides
       WHERE run_id = ${p(2)}`,
      [archiveId, runId]
    );
  }

  async deleteForRun(runId: number): Promise<void> {
    const ph = this.db.placeholder(1);
    await this.db.query(
      `DELETE FROM feasibility_run_overrides WHERE run_id = ${ph}`,
      [runId]
    );
  }
}
