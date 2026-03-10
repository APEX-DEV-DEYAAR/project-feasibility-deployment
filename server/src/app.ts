import express, { type Express } from "express";
import cors from "cors";
import { apiRoutes } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import type { ProjectService } from "./services/project.service.js";
import type { FeasibilityService } from "./services/feasibility.service.js";
import type { CostTrackingController } from "./controllers/cost-tracking.controller.js";
import type { CollectionsController } from "./controllers/revenue.controller.js";
import type { CollectionsForecastController } from "./controllers/collections-forecast.controller.js";

interface Services {
  projectService: ProjectService;
  feasibilityService: FeasibilityService;
  costTrackingController: CostTrackingController;
  collectionsController: CollectionsController;
  collectionsForecastController: CollectionsForecastController;
}

export function createApp(services: Services): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", apiRoutes(services));

  app.use(errorHandler);

  return app;
}
