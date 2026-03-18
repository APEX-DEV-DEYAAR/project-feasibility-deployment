import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./shared/config/index.js";
import { apiRoutes } from "./routes/index.js";
import { errorHandler } from "./shared/middleware/errorHandler.js";
import type { ProjectService } from "./features/project/project.service.js";
import type { FeasibilityService } from "./features/feasibility/feasibility.service.js";
import type { CostTrackingController } from "./features/cost-tracking/cost-tracking.controller.js";
import type { CollectionsController } from "./features/collections/revenue.controller.js";
import type { SalesController } from "./features/sales-tracking/sales.controller.js";
import type { CollectionsForecastController } from "./features/collections-forecast/collections-forecast.controller.js";
import type { CfoDashboardController } from "./features/cfo-dashboard/cfo-dashboard.controller.js";
import type { AuthService } from "./features/auth/auth.service.js";
import type { AuditLogRepository } from "./shared/middleware/audit-log.repository.js";

interface Services {
  projectService: ProjectService;
  feasibilityService: FeasibilityService;
  costTrackingController: CostTrackingController;
  collectionsController: CollectionsController;
  salesController: SalesController;
  collectionsForecastController: CollectionsForecastController;
  cfoDashboardController: CfoDashboardController;
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
