import { config } from "./shared/config/index.js";
import { createDatabaseAdapter } from "./shared/db/index.js";
import { ProjectRepository } from "./features/project/project.repository.js";
import { FeasibilityRepository } from "./features/feasibility/feasibility.repository.js";
import { ArchiveRepository } from "./features/feasibility/archive.repository.js";
import { FeasibilityRelationalRepository } from "./features/feasibility/feasibility-relational.repository.js";
import { ReportingRepository } from "./features/feasibility/reporting.repository.js";
import { OverridesRepository } from "./features/feasibility/overrides.repository.js";
import { CostTrackingRepository } from "./features/cost-tracking/cost-tracking.repository.js";
import { CollectionsRepository } from "./features/collections/revenue.repository.js";
import { SalesRepository } from "./features/sales-tracking/sales.repository.js";
import { CfoDashboardRepository } from "./features/cfo-dashboard/cfo-dashboard.repository.js";
import { CollectionsForecastRepository } from "./features/collections-forecast/collections-forecast.repository.js";
import { CollectionsLookupRepository } from "./features/collections-forecast/collections-lookup.repository.js";
import { UserRepository } from "./features/auth/user.repository.js";
import { AuditLogRepository } from "./shared/middleware/audit-log.repository.js";
import { ProjectService } from "./features/project/project.service.js";
import { FeasibilityService } from "./features/feasibility/feasibility.service.js";
import { CostTrackingService } from "./features/cost-tracking/cost-tracking.service.js";
import { CollectionsService } from "./features/collections/revenue.service.js";
import { SalesService } from "./features/sales-tracking/sales.service.js";
import { CfoDashboardService } from "./features/cfo-dashboard/cfo-dashboard.service.js";
import { CollectionsForecastService } from "./features/collections-forecast/collections-forecast.service.js";
import { AuthService } from "./features/auth/auth.service.js";
import { CostTrackingController } from "./features/cost-tracking/cost-tracking.controller.js";
import { CollectionsController } from "./features/collections/revenue.controller.js";
import { SalesController } from "./features/sales-tracking/sales.controller.js";
import { CfoDashboardController } from "./features/cfo-dashboard/cfo-dashboard.controller.js";
import { CollectionsForecastController } from "./features/collections-forecast/collections-forecast.controller.js";
import { createApp } from "./app.js";

async function start(): Promise<void> {
  const db = await createDatabaseAdapter(config);
  await db.initialize();

  const projectRepo = new ProjectRepository(db);
  const feasibilityRepo = new FeasibilityRepository(db);
  const archiveRepo = new ArchiveRepository(db);
  const relationalRepo = new FeasibilityRelationalRepository(db);
  const reportingRepo = new ReportingRepository(db);
  const overridesRepo = new OverridesRepository(db);
  await overridesRepo.ensureTables();
  const costTrackingRepo = new CostTrackingRepository(db);
  const collectionsRepo = new CollectionsRepository(db);
  const salesRepo = new SalesRepository(db);
  await salesRepo.ensureTable();
  const cfoDashboardRepo = new CfoDashboardRepository(db);
  await cfoDashboardRepo.ensurePerformanceIndexes();
  const collectionsForecastRepo = new CollectionsForecastRepository(db);
  const collectionsLookupRepo = new CollectionsLookupRepository(db);
  const userRepo = new UserRepository(db);
  const auditLogRepo = new AuditLogRepository(db);
  await reportingRepo.backfill();
  await relationalRepo.backfillFromJson();

  const projectService = new ProjectService(projectRepo);
  const feasibilityService = new FeasibilityService(
    feasibilityRepo,
    archiveRepo,
    relationalRepo,
    projectRepo,
    reportingRepo,
    overridesRepo
  );
  const collectionsService = new CollectionsService(collectionsRepo);
  const salesService = new SalesService(salesRepo);
  const cfoDashboardService = new CfoDashboardService(cfoDashboardRepo);
  const collectionsForecastService = new CollectionsForecastService(collectionsForecastRepo, collectionsLookupRepo);
  const costTrackingService = new CostTrackingService(costTrackingRepo, collectionsRepo, salesRepo);
  const authService = new AuthService(userRepo, config.jwtSecret);
  const costTrackingController = new CostTrackingController(costTrackingService);
  const collectionsController = new CollectionsController(collectionsService);
  const salesController = new SalesController(salesService);
  const cfoDashboardController = new CfoDashboardController(cfoDashboardService);
  const collectionsForecastController = new CollectionsForecastController(collectionsForecastService);

  // Seed default admin if no users exist
  await authService.seedDefaultUser();

  const app = createApp({
    projectService,
    feasibilityService,
    costTrackingController,
    collectionsController,
    salesController,
    collectionsForecastController,
    cfoDashboardController,
    authService,
    auditLogRepo,
  });

  app.listen(config.port, () => {
    console.log(`Feasibility API running on http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  console.error("Startup failed:", error);
  process.exit(1);
});
