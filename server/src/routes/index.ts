import { Router } from "express";
import { healthRoutes } from "./health.routes.js";
import { projectRoutes } from "./project.routes.js";
import { feasibilityRoutes } from "./feasibility.routes.js";
import { costTrackingRoutes } from "./cost-tracking.routes.js";
import { collectionsRoutes } from "./revenue.routes.js";
import { collectionsForecastRoutes } from "./collections-forecast.routes.js";
import type { ProjectService } from "../services/project.service.js";
import type { FeasibilityService } from "../services/feasibility.service.js";
import type { CostTrackingController } from "../controllers/cost-tracking.controller.js";
import type { CollectionsController } from "../controllers/revenue.controller.js";
import type { CollectionsForecastController } from "../controllers/collections-forecast.controller.js";

interface Services {
  projectService: ProjectService;
  feasibilityService: FeasibilityService;
  costTrackingController: CostTrackingController;
  collectionsController: CollectionsController;
  collectionsForecastController: CollectionsForecastController;
}

export function apiRoutes({
  projectService,
  feasibilityService,
  costTrackingController,
  collectionsController,
  collectionsForecastController,
}: Services): Router {
  const router = Router();

  router.use(healthRoutes());
  router.use(projectRoutes(projectService));
  router.use(feasibilityRoutes(feasibilityService));
  router.use(costTrackingRoutes(costTrackingController));
  router.use(collectionsRoutes(collectionsController));
  router.use(collectionsForecastRoutes(collectionsForecastController));

  return router;
}
