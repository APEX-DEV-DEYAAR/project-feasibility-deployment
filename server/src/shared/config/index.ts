import "dotenv/config";
import type { AppConfig } from "../types/index.js";

const dbType = process.env.DB_TYPE || "postgres";

const jwtSecret = process.env.JWT_SECRET ?? "";
if (!jwtSecret || jwtSecret.length < 32) {
  // Logger may not be initialized yet; use stderr directly for fatal config errors.
  process.stderr.write(
    "FATAL: JWT_SECRET environment variable must be set and at least 32 characters long.\n" +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n"
  );
  process.exit(1);
}

export const config: AppConfig = Object.freeze({
  port: Number(process.env.PORT) || 4000,
  jwtSecret,
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(s => s.trim())
    : ["http://localhost:5173"],
  db: {
    type: dbType,
    url: process.env.DATABASE_URL,
    ...(dbType === "oracle" && {
      oracle: {
        user: process.env.ORACLE_USER || "",
        password: process.env.ORACLE_PASSWORD || "",
        connectString: process.env.ORACLE_CONNECT_STRING || "",
        walletDir: process.env.ORACLE_WALLET_DIR || "",
        walletPassword: process.env.ORACLE_WALLET_PASSWORD || "",
      },
    }),
  },
});
