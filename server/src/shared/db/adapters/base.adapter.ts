import type { QueryResult } from "../../types/index.js";

export interface UpsertReturningOptions {
  table: string;
  conflictCols: string[];
  insertCols: string[];
  updateCols: string[];
  values: unknown[];
  selectExpr: string;
  extraSetClauses?: string[];
  startIdx?: number;
}

/**
 * Abstract database adapter.
 * Implement this for each supported database engine (Postgres, Oracle, etc.).
 */
export abstract class BaseAdapter {
  abstract query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  abstract initialize(): Promise<void>;
  abstract close(): Promise<void>;

  /**
   * Return the positional placeholder token for the given 1-based index.
   * Postgres: $1   Oracle: :1
   */
  placeholder(index: number): string {
    return `$${index}`;
  }

  /**
   * Database-specific expression for the current timestamp.
   */
  nowExpression(): string {
    return "CURRENT_TIMESTAMP";
  }

  /**
   * Database-specific single-row limiter.
   */
  limitClause(count: number): string {
    return `FETCH FIRST ${count} ROWS ONLY`;
  }

  /** Cast a placeholder to JSON column type. PG: ::jsonb, Oracle: no-op */
  jsonCast(placeholder: string): string {
    return `${placeholder}::jsonb`;
  }

  /** Convert a date/timestamp column to text string. PG: ::text, Oracle: TO_CHAR */
  dateToText(column: string): string {
    return `${column}::text`;
  }

  /** Wrap an expression that should evaluate to a boolean value. PG: native bool, Oracle: CASE 0/1 */
  boolExpr(expr: string): string {
    return `(${expr})`;
  }

  /**
   * Generate an UPSERT (INSERT ... ON CONFLICT ... DO UPDATE) statement.
   * PG: INSERT ... ON CONFLICT ... DO UPDATE SET col = EXCLUDED.col
   * Oracle: MERGE INTO ... USING dual ...
   */
  upsert(
    table: string,
    conflictCols: string[],
    insertCols: string[],
    updateCols: string[],
    startIdx: number,
    extraSetClauses?: string[]
  ): string {
    const placeholders = insertCols.map((_, i) => this.placeholder(startIdx + i)).join(", ");
    const updates = updateCols.map((c) => `${c} = EXCLUDED.${c}`);
    if (extraSetClauses) updates.push(...extraSetClauses);
    return (
      `INSERT INTO ${table} (${insertCols.join(", ")}) VALUES (${placeholders}) ` +
      `ON CONFLICT (${conflictCols.join(", ")}) DO UPDATE SET ${updates.join(", ")}`
    );
  }

  /**
   * Generate an UPSERT-or-ignore (INSERT ... ON CONFLICT ... DO NOTHING) statement.
   * PG: INSERT ... ON CONFLICT ... DO NOTHING
   * Oracle: MERGE INTO ... WHEN NOT MATCHED THEN INSERT
   */
  upsertOrIgnore(
    table: string,
    conflictCols: string[],
    insertCols: string[],
    startIdx: number
  ): string {
    const placeholders = insertCols.map((_, i) => this.placeholder(startIdx + i)).join(", ");
    return (
      `INSERT INTO ${table} (${insertCols.join(", ")}) VALUES (${placeholders}) ` +
      `ON CONFLICT (${conflictCols.join(", ")}) DO NOTHING`
    );
  }

  /**
   * Execute an INSERT and return the inserted row.
   * PG: appends RETURNING clause
   * Oracle: uses RETURNING id INTO + separate SELECT
   *
   * @param valueExprs  Optional custom value expressions (e.g. with jsonCast).
   *                    If omitted, plain placeholders are generated.
   */
  async insertReturning<T = Record<string, unknown>>(
    table: string,
    insertCols: string[],
    values: unknown[],
    returningExpr: string,
    startIdx: number = 1,
    valueExprs?: string[]
  ): Promise<QueryResult<T>> {
    const placeholders = valueExprs
      ? valueExprs.join(", ")
      : insertCols.map((_, i) => this.placeholder(startIdx + i)).join(", ");
    const sql =
      `INSERT INTO ${table} (${insertCols.join(", ")}) VALUES (${placeholders}) ` +
      `RETURNING ${returningExpr}`;
    return this.query<T>(sql, values);
  }

  /**
   * Execute an UPSERT and return the resulting row.
   * PG: appends RETURNING to the ON CONFLICT statement
   * Oracle: executes MERGE then SELECT by conflict key
   */
  async upsertReturning<T = Record<string, unknown>>(
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
    return this.query<T>(`${sql} RETURNING ${opts.selectExpr}`, opts.values);
  }

  /**
   * Execute a batched multi-row UPSERT and return all resulting rows.
   * Builds a single INSERT ... VALUES (...), (...), ... ON CONFLICT ... RETURNING statement.
   */
  async bulkUpsertReturning<T = Record<string, unknown>>(
    opts: Omit<UpsertReturningOptions, "values" | "startIdx"> & { rows: unknown[][] }
  ): Promise<QueryResult<T>> {
    if (opts.rows.length === 0) return { rows: [], rowCount: 0 };

    const colCount = opts.insertCols.length;
    const allValues: unknown[] = [];
    const valuesClauses: string[] = [];

    for (let r = 0; r < opts.rows.length; r++) {
      const startIdx = r * colCount + 1;
      const placeholders = opts.insertCols.map((_, i) => this.placeholder(startIdx + i)).join(", ");
      valuesClauses.push(`(${placeholders})`);
      allValues.push(...opts.rows[r]);
    }

    const updates = opts.updateCols.map((c) => `${c} = EXCLUDED.${c}`);
    if (opts.extraSetClauses) updates.push(...opts.extraSetClauses);

    const sql =
      `INSERT INTO ${opts.table} (${opts.insertCols.join(", ")}) VALUES ${valuesClauses.join(", ")} ` +
      `ON CONFLICT (${opts.conflictCols.join(", ")}) DO UPDATE SET ${updates.join(", ")} ` +
      `RETURNING ${opts.selectExpr}`;

    return this.query<T>(sql, allValues);
  }

  /**
   * Generate a DELETE with JOIN.
   * PG: DELETE ... USING
   * Oracle: DELETE ... WHERE EXISTS
   */
  deleteWithJoin(
    targetTable: string,
    targetAlias: string,
    joinTable: string,
    joinAlias: string,
    joinCondition: string,
    whereCondition: string
  ): string {
    return (
      `DELETE FROM ${targetTable} ${targetAlias} ` +
      `USING ${joinTable} ${joinAlias} ` +
      `WHERE ${joinCondition} AND ${whereCondition}`
    );
  }
}
