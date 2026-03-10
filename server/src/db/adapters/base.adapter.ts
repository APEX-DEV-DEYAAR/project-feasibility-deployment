import type { QueryResult } from "../../types/index.js";

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
}
