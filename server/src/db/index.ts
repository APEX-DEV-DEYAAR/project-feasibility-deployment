import { PostgresAdapter } from "./adapters/postgres.adapter.js";
import { BaseAdapter } from "./adapters/base.adapter.js";
import type { AppConfig } from "../types/index.js";

type AdapterConstructor = new (url: string) => BaseAdapter;

const ADAPTERS: Record<string, AdapterConstructor> = {
  postgres: PostgresAdapter,
};

/**
 * Factory: instantiate the right database adapter based on config.
 * To add Oracle support, create OracleAdapter and register it here.
 */
export function createDatabaseAdapter(config: AppConfig): BaseAdapter {
  const AdapterClass = ADAPTERS[config.db.type];
  if (!AdapterClass) {
    throw new Error(
      `Unsupported DB_TYPE "${config.db.type}". Supported: ${Object.keys(ADAPTERS).join(", ")}`
    );
  }
  if (!config.db.url) {
    throw new Error("DATABASE_URL is required");
  }
  return new AdapterClass(config.db.url);
}
