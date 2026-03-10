import "dotenv/config";
import type { AppConfig } from "../types/index.js";

export const config: AppConfig = Object.freeze({
  port: Number(process.env.PORT) || 4000,
  db: {
    type: process.env.DB_TYPE || "postgres",
    url: process.env.DATABASE_URL,
  },
});
