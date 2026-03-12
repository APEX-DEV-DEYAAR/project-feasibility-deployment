import { PostgresAdapter } from "./adapters/postgres.adapter.js";
import { OracleAdapter } from "./adapters/oracle.adapter.js";
import { BaseAdapter } from "./adapters/base.adapter.js";
import type { AppConfig } from "../types/index.js";

/**
 * Factory: instantiate the right database adapter based on config.
 */
export function createDatabaseAdapter(config: AppConfig): BaseAdapter {
  switch (config.db.type) {
    case "postgres": {
      if (!config.db.url) {
        throw new Error("DATABASE_URL is required for PostgreSQL");
      }
      return new PostgresAdapter(config.db.url);
    }

    case "oracle": {
      const oc = config.db.oracle;
      if (!oc || !oc.user || !oc.password || !oc.connectString || !oc.walletDir) {
        throw new Error(
          "ORACLE_USER, ORACLE_PASSWORD, ORACLE_CONNECT_STRING, and ORACLE_WALLET_DIR are all required for Oracle"
        );
      }
      return new OracleAdapter({
        user: oc.user,
        password: oc.password,
        connectString: oc.connectString,
        configDir:  oc.walletDir,
        walletDir: oc.walletDir,
        walletPassword: oc.walletPassword,
      });
    }

    default:
      throw new Error(
        `Unsupported DB_TYPE "${config.db.type}". Supported: postgres, oracle`
      );
  }
}
