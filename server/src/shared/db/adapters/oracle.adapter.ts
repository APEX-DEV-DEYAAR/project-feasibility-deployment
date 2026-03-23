import oracledb from "oracledb";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../../logger.js";
import { BaseAdapter } from "./base.adapter.js";
import type { UpsertReturningOptions } from "./base.adapter.js";
import type { QueryResult } from "../../types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface OracleConnectionConfig {
  user: string;
  password: string;
  connectString: string;
  configDir: string;
  walletDir: string;
  walletPassword: string;
}

export class OracleAdapter extends BaseAdapter {
  private pool: oracledb.Pool | null = null;
  private config: OracleConnectionConfig;

  constructor(config: OracleConnectionConfig) {
    super();
    this.config = config;
  }

  // ---------------------------------------------------------------------------
  // Column name normalization: Oracle returns unquoted columns as UPPERCASE.
  // Quoted aliases ("projectId") are preserved.  Normalize ALL-UPPERCASE keys
  // to lowercase so the rest of the app can use consistent casing.
  // ---------------------------------------------------------------------------
  private normalizeRows<T>(rows: Record<string, unknown>[]): T[] {
    return rows.map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        const newKey = key === key.toUpperCase() ? key.toLowerCase() : key;
        normalized[newKey] = value;
      }
      return normalized;
    }) as T[];
  }

  // ---------------------------------------------------------------------------
  // JSON auto-parse: PostgreSQL's pg driver auto-parses jsonb columns into
  // objects.  Oracle returns JSON / CLOB as strings.  Detect and parse them.
  // ---------------------------------------------------------------------------
  private autoParseJson(rows: Record<string, unknown>[]): void {
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        const val = row[key];
        if (typeof val === "string" && val.length > 0 && (val[0] === "{" || val[0] === "[")) {
          try {
            row[key] = JSON.parse(val);
          } catch {
            // Not valid JSON — keep as string
          }
        }
      }
    }
  }

  async query<T = Record<string, unknown>>(
    text: string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error("Oracle pool not initialized. Call initialize() first.");
    }

    const connection = await this.pool.getConnection();
    try {
      const result = await connection.execute<Record<string, unknown>>(text, params, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: true,
      });

      const rawRows = (result.rows ?? []) as Record<string, unknown>[];
      const normalized = this.normalizeRows<T>(rawRows);
      this.autoParseJson(normalized as unknown as Record<string, unknown>[]);
      const rowCount = result.rowsAffected ?? normalized.length;

      return { rows: normalized, rowCount };
    } finally {
      await connection.close();
    }
  }

  async initialize(): Promise<void> {
    // Convert CLOBs to strings globally so JSON columns are returned as strings
    oracledb.fetchAsString = [oracledb.CLOB];

    // ATP thin mode — no initOracleClient needed, just walletLocation/walletPassword
    this.pool = await oracledb.createPool({
      user: this.config.user,
      password: this.config.password,
      connectString: this.config.connectString,
      configDir:  this.config.configDir,
      walletLocation: this.config.walletDir,
      walletPassword: this.config.walletPassword,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1,
    });

    logger.info("Oracle connection pool created successfully");
  }

  private async runMigrations(): Promise<void> {
    const sqlDir = path.resolve(__dirname, "..", "..", "..", "sql", "oracle");

    // Create migration tracking table
    const connection = await this.pool!.getConnection();
    try {
      await connection.execute(
        `BEGIN
           EXECUTE IMMEDIATE 'CREATE TABLE schema_migrations (
             filename  VARCHAR2(255) PRIMARY KEY,
             applied_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL
           )';
         EXCEPTION
           WHEN OTHERS THEN
             IF SQLCODE != -955 THEN RAISE; END IF;
         END;`
      );
      await connection.commit();
    } finally {
      await connection.close();
    }

    const migrationFiles = [
      "001_init.sql",
      "002_cost_tracking.sql",
      "003_clear_cost_data.sql",
      "004_cost_tracking_v2.sql",
      "005_segregation_v3.sql",
      "006_relational_feasibility.sql",
      "007_sales_staff_discounts.sql",
      "008_collections_forecast.sql",
      "009_collections_forecast_source_fields.sql",
      "010_collections_forecast_lookups.sql",
      "011_collections_forecast_formula_inputs.sql",
      "012_users.sql",
      "014_budget_vs_actuals_indexes.sql",
      "015_metric_overrides.sql",
      "016_metric_overrides_fix.sql",
      "017_monthly_sales.sql",
      "018_monthly_sales_retry.sql",
      "019_cfo_dashboard_indexes.sql",
    ];

    for (const file of migrationFiles) {
      const conn = await this.pool!.getConnection();
      try {
        const result = await conn.execute<{ FILENAME: string }>(
          `SELECT filename FROM schema_migrations WHERE filename = :1`,
          [file]
        );

        if ((result.rows?.length ?? 0) > 0) {
          continue;
        }

        const sqlPath = path.join(sqlDir, file);
        if (!fs.existsSync(sqlPath)) {
          continue;
        }

        const sql = fs.readFileSync(sqlPath, "utf-8");

        // Split on "/" on its own line (PL/SQL block terminator)
        // and also on ";" for plain statements
        const blocks = this.splitOracleStatements(sql);

        for (const block of blocks) {
          const trimmed = block.trim();
          if (!trimmed || trimmed === "/") continue;
          try {
            await conn.execute(trimmed);
          } catch (ddlError: unknown) {
            const oraErr = ddlError as { errorNum?: number };
            // ORA-00955: name already used (table/index exists)
            // ORA-01430: column already exists
            // ORA-02261: unique/primary key already exists
            // ORA-00942: table/view does not exist (for DROP IF NOT EXISTS patterns)
            const ignorable = [955, 1430, 1408, 2261, 942];
            if (oraErr.errorNum && ignorable.includes(oraErr.errorNum)) {
              // Object already exists — safe to skip
              continue;
            }
            throw ddlError;
          }
        }

        await conn.execute(
          `INSERT INTO schema_migrations (filename) VALUES (:1)`,
          [file]
        );
        await conn.commit();
        logger.info({ file }, "Applied migration");
      } catch (error) {
        await conn.rollback();
        logger.error({ file, err: error }, "Migration failed");
        throw error;
      } finally {
        await conn.close();
      }
    }
  }

  /**
   * Split Oracle SQL script into individual executable statements.
   * Handles PL/SQL blocks (BEGIN...END;) terminated by "/" and plain
   * statements terminated by ";".
   */
  private splitOracleStatements(sql: string): string[] {
    const statements: string[] = [];
    const lines = sql.split("\n");
    let current = "";
    let inPlsql = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comment-only lines at statement boundaries
      if (!current.trim() && trimmedLine.startsWith("--")) {
        continue;
      }

      // Detect PL/SQL block start
      if (
        !inPlsql &&
        /^\s*(BEGIN|DECLARE|CREATE\s+(OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION|TRIGGER|PACKAGE))/i.test(
          trimmedLine
        )
      ) {
        inPlsql = true;
      }

      // "/" on its own line terminates a PL/SQL block
      if (trimmedLine === "/") {
        if (current.trim()) {
          statements.push(current.trim());
          current = "";
        }
        inPlsql = false;
        continue;
      }

      current += line + "\n";

      // For non-PL/SQL statements, split on ";" at end of line
      if (!inPlsql && trimmedLine.endsWith(";")) {
        const stmt = current.trim().replace(/;\s*$/u, "");
        if (stmt) {
          statements.push(stmt);
        }
        current = "";
      }
    }

    // Handle any remaining content
    if (current.trim()) {
      const stmt = current.trim().replace(/;\s*$/u, "");
      if (stmt) {
        statements.push(stmt);
      }
    }

    return statements;
  }

  // ---------------------------------------------------------------------------
  // Dialect overrides
  // ---------------------------------------------------------------------------

  override placeholder(index: number): string {
    return `:${index}`;
  }

  override nowExpression(): string {
    return "SYSTIMESTAMP";
  }

  override limitClause(count: number): string {
    return `FETCH FIRST ${count} ROWS ONLY`;
  }

  override jsonCast(ph: string): string {
    return ph; // Oracle accepts plain string for JSON/CLOB columns
  }

  override dateToText(column: string): string {
    return `TO_CHAR(${column}, 'YYYY-MM-DD')`;
  }

  override boolExpr(expr: string): string {
    return `CASE WHEN ${expr} THEN 1 ELSE 0 END`;
  }

  // ---------------------------------------------------------------------------
  // UPSERT — Oracle uses MERGE INTO ... USING dual
  // ---------------------------------------------------------------------------
  override upsert(
    table: string,
    conflictCols: string[],
    insertCols: string[],
    updateCols: string[],
    startIdx: number,
    extraSetClauses?: string[]
  ): string {
    // Use positional aliases (c0, c1, ...) to avoid Oracle reserved-word issues
    const srcCols = insertCols
      .map((_, i) => `${this.placeholder(startIdx + i)} AS c${i}`)
      .join(", ");
    const colToAlias = new Map(insertCols.map((col, i) => [col, `c${i}`]));

    const onCondition = conflictCols
      .map((col) => `t.${col} = src.${colToAlias.get(col)}`)
      .join(" AND ");

    const updateSet = updateCols.map((col) => `t.${col} = src.${colToAlias.get(col)}`);
    if (extraSetClauses) updateSet.push(...extraSetClauses);

    const insertColList = insertCols.join(", ");
    const insertValues = insertCols.map((col) => `src.${colToAlias.get(col)}`).join(", ");

    return (
      `MERGE INTO ${table} t ` +
      `USING (SELECT ${srcCols} FROM dual) src ` +
      `ON (${onCondition}) ` +
      `WHEN MATCHED THEN UPDATE SET ${updateSet.join(", ")} ` +
      `WHEN NOT MATCHED THEN INSERT (${insertColList}) VALUES (${insertValues})`
    );
  }

  override upsertOrIgnore(
    table: string,
    conflictCols: string[],
    insertCols: string[],
    startIdx: number
  ): string {
    const srcCols = insertCols
      .map((_, i) => `${this.placeholder(startIdx + i)} AS c${i}`)
      .join(", ");
    const colToAlias = new Map(insertCols.map((col, i) => [col, `c${i}`]));

    const onCondition = conflictCols
      .map((col) => `t.${col} = src.${colToAlias.get(col)}`)
      .join(" AND ");

    const insertColList = insertCols.join(", ");
    const insertValues = insertCols.map((col) => `src.${colToAlias.get(col)}`).join(", ");

    return (
      `MERGE INTO ${table} t ` +
      `USING (SELECT ${srcCols} FROM dual) src ` +
      `ON (${onCondition}) ` +
      `WHEN NOT MATCHED THEN INSERT (${insertColList}) VALUES (${insertValues})`
    );
  }

  // ---------------------------------------------------------------------------
  // INSERT RETURNING — Oracle uses RETURNING id INTO :outBind + separate SELECT
  // ---------------------------------------------------------------------------
  override async insertReturning<T = Record<string, unknown>>(
    table: string,
    insertCols: string[],
    values: unknown[],
    returningExpr: string,
    startIdx: number = 1,
    valueExprs?: string[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error("Oracle pool not initialized. Call initialize() first.");
    }

    const placeholders = valueExprs
      ? valueExprs.join(", ")
      : insertCols.map((_, i) => this.placeholder(startIdx + i)).join(", ");

    const outIdx = values.length + 1;
    const sql =
      `INSERT INTO ${table} (${insertCols.join(", ")}) VALUES (${placeholders}) ` +
      `RETURNING id INTO ${this.placeholder(outIdx)}`;

    const connection = await this.pool.getConnection();
    try {
      const allParams = [...values, { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }];
      const result = await connection.execute(sql, allParams, { autoCommit: true });

      const outBinds = result.outBinds as unknown[];
      const id = Array.isArray(outBinds[0]) ? (outBinds[0] as number[])[0] : outBinds[0];

      const selectResult = await connection.execute<Record<string, unknown>>(
        `SELECT ${returningExpr} FROM ${table} WHERE id = ${this.placeholder(1)}`,
        [id],
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          autoCommit: true,
        }
      );

      const rawRows = (selectResult.rows ?? []) as Record<string, unknown>[];
      const rows = this.normalizeRows<T>(rawRows);
      this.autoParseJson(rows as unknown as Record<string, unknown>[]);
      return { rows, rowCount: rows.length };
    } finally {
      await connection.close();
    }
  }

  // ---------------------------------------------------------------------------
  // UPSERT RETURNING — Oracle: execute MERGE, then SELECT back by conflict key
  // ---------------------------------------------------------------------------
  override async upsertReturning<T = Record<string, unknown>>(
    opts: UpsertReturningOptions
  ): Promise<QueryResult<T>> {
    const sql = this.upsert(
      opts.table,
      opts.conflictCols,
      opts.insertCols,
      opts.updateCols,
      opts.startIdx ?? 1,
      opts.extraSetClauses
    );
    await this.query(sql, opts.values);

    // SELECT back the row using the conflict-key values
    const conflictValues = opts.conflictCols.map((col) => {
      const idx = opts.insertCols.indexOf(col);
      return opts.values[idx];
    });
    const where = opts.conflictCols
      .map((col, i) => `${col} = ${this.placeholder(i + 1)}`)
      .join(" AND ");

    return this.query<T>(
      `SELECT ${opts.selectExpr} FROM ${opts.table} WHERE ${where} ${this.limitClause(1)}`,
      conflictValues
    );
  }

  // ---------------------------------------------------------------------------
  // BULK UPSERT RETURNING — Oracle: multi-row MERGE + SELECT back all rows
  // ---------------------------------------------------------------------------
  override async bulkUpsertReturning<T = Record<string, unknown>>(
    opts: Omit<UpsertReturningOptions, "values" | "startIdx"> & { rows: unknown[][] }
  ): Promise<QueryResult<T>> {
    if (opts.rows.length === 0) return { rows: [], rowCount: 0 };

    const colCount = opts.insertCols.length;
    const colToAlias = new Map(opts.insertCols.map((col, i) => [col, `c${i}`]));

    // Build UNION ALL subquery: SELECT :1 AS c0, :2 AS c1, ... FROM dual UNION ALL ...
    const allValues: unknown[] = [];
    const unionParts: string[] = [];
    for (let r = 0; r < opts.rows.length; r++) {
      const startIdx = r * colCount + 1;
      const srcCols = opts.insertCols
        .map((_, i) => `${this.placeholder(startIdx + i)} AS c${i}`)
        .join(", ");
      unionParts.push(`SELECT ${srcCols} FROM dual`);
      allValues.push(...opts.rows[r]);
    }

    const onCondition = opts.conflictCols
      .map((col) => `t.${col} = src.${colToAlias.get(col)}`)
      .join(" AND ");

    const updateSet = opts.updateCols.map((col) => `t.${col} = src.${colToAlias.get(col)}`);
    if (opts.extraSetClauses) updateSet.push(...opts.extraSetClauses);

    const insertColList = opts.insertCols.join(", ");
    const insertValues = opts.insertCols.map((col) => `src.${colToAlias.get(col)}`).join(", ");

    const mergeSql =
      `MERGE INTO ${opts.table} t ` +
      `USING (${unionParts.join(" UNION ALL ")}) src ` +
      `ON (${onCondition}) ` +
      `WHEN MATCHED THEN UPDATE SET ${updateSet.join(", ")} ` +
      `WHEN NOT MATCHED THEN INSERT (${insertColList}) VALUES (${insertValues})`;

    await this.query(mergeSql, allValues);

    // SELECT back all affected rows using conflict-key tuples
    const conflictIdxes = opts.conflictCols.map((col) => opts.insertCols.indexOf(col));
    const whereParts: string[] = [];
    const selectValues: unknown[] = [];
    let paramIdx = 1;

    for (const row of opts.rows) {
      const conds = opts.conflictCols.map((col, ci) => {
        selectValues.push(row[conflictIdxes[ci]]);
        return `${col} = ${this.placeholder(paramIdx++)}`;
      });
      whereParts.push(`(${conds.join(" AND ")})`);
    }

    return this.query<T>(
      `SELECT ${opts.selectExpr} FROM ${opts.table} WHERE ${whereParts.join(" OR ")}`,
      selectValues
    );
  }

  // ---------------------------------------------------------------------------
  // DELETE with JOIN — Oracle uses WHERE EXISTS instead of USING
  // ---------------------------------------------------------------------------
  override deleteWithJoin(
    targetTable: string,
    targetAlias: string,
    joinTable: string,
    joinAlias: string,
    joinCondition: string,
    whereCondition: string
  ): string {
    return (
      `DELETE FROM ${targetTable} ${targetAlias} ` +
      `WHERE EXISTS (SELECT 1 FROM ${joinTable} ${joinAlias} ` +
      `WHERE ${joinCondition} AND ${whereCondition})`
    );
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close(0);
      this.pool = null;
    }
  }
}
