import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./config/index.js";
import { apiRoutes } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import type { ProjectService } from "./services/project.service.js";
import type { FeasibilityService } from "./services/feasibility.service.js";
import type { CostTrackingController } from "./controllers/cost-tracking.controller.js";
import type { CollectionsController } from "./controllers/revenue.controller.js";
import type { CollectionsForecastController } from "./controllers/collections-forecast.controller.js";
import type { AuthService } from "./services/auth.service.js";
import type { AuditLogRepository } from "./repositories/audit-log.repository.js";

interface Services {
  projectService: ProjectService;
  feasibilityService: FeasibilityService;
  costTrackingController: CostTrackingController;
  collectionsController: CollectionsController;
  collectionsForecastController: CollectionsForecastController;
  authService: AuthService;
  auditLogRepo: AuditLogRepository;
}

export function createApp(services: Services): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: config.allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", apiRoutes(services));

  app.use(errorHandler);

  return app;
}
