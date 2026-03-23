import { Router } from "express";
import { healthRoutes } from "../features/health/health.routes.js";
import { authRoutes } from "../features/auth/auth.routes.js";
import { projectRoutes } from "../features/project/project.routes.js";
import { feasibilityRoutes } from "../features/feasibility/feasibility.routes.js";
import { costTrackingRoutes, budgetVsActualsRoutes } from "../features/cost-tracking/cost-tracking.routes.js";
import { collectionsRoutes } from "../features/collections/revenue.routes.js";
import { salesRoutes } from "../features/sales-tracking/sales.routes.js";
import { collectionsForecastRoutes } from "../features/collections-forecast/collections-forecast.routes.js";
import { cfoDashboardRoutes } from "../features/cfo-dashboard/cfo-dashboard.routes.js";
import { authMiddleware, csrfGuard } from "../features/auth/auth.middleware.js";
import { createAuditLog } from "../shared/middleware/auditLog.js";
import type { AuditLogRepository } from "../shared/middleware/audit-log.repository.js";
import type { ProjectService } from "../features/project/project.service.js";
import type { FeasibilityService } from "../features/feasibility/feasibility.service.js";
import type { CostTrackingController } from "../features/cost-tracking/cost-tracking.controller.js";
import type { CollectionsController } from "../features/collections/revenue.controller.js";
import type { SalesController } from "../features/sales-tracking/sales.controller.js";
import type { CollectionsForecastController } from "../features/collections-forecast/collections-forecast.controller.js";
import type { CfoDashboardController } from "../features/cfo-dashboard/cfo-dashboard.controller.js";
import type { AuthService } from "../features/auth/auth.service.js";

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

export function apiRoutes({
  projectService,
  feasibilityService,
  costTrackingController,
  collectionsController,
  salesController,
  collectionsForecastController,
  cfoDashboardController,
  authService,
  auditLogRepo,
}: Services): Router {
  const router = Router();

  // Public routes
  router.use(healthRoutes());
  router.use(authRoutes(authService));

  // Protected routes — require valid JWT + CSRF guard + audit logging
  router.use(csrfGuard);
  router.use(authMiddleware(authService));
  router.use(createAuditLog(auditLogRepo));

  // Route groups — role guards are applied per-route inside each router
  router.use(projectRoutes(projectService));
  router.use(feasibilityRoutes(feasibilityService));
  router.use(budgetVsActualsRoutes(costTrackingController));
  router.use(costTrackingRoutes(costTrackingController));
  router.use(collectionsRoutes(collectionsController));
  router.use(salesRoutes(salesController));
  router.use(collectionsForecastRoutes(collectionsForecastController));
  router.use(cfoDashboardRoutes(cfoDashboardController));

  return router;
}
