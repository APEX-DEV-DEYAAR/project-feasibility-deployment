import { config } from "./config/index.js";
import { createDatabaseAdapter } from "./db/index.js";
import { ProjectRepository } from "./repositories/project.repository.js";
import { FeasibilityRepository } from "./repositories/feasibility.repository.js";
import { ArchiveRepository } from "./repositories/archive.repository.js";
import { FeasibilityRelationalRepository } from "./repositories/feasibility-relational.repository.js";
import { ReportingRepository } from "./repositories/reporting.repository.js";
import { CostTrackingRepository } from "./repositories/cost-tracking.repository.js";
import { CollectionsRepository } from "./repositories/revenue.repository.js";
import { CollectionsForecastRepository } from "./repositories/collections-forecast.repository.js";
import { CollectionsLookupRepository } from "./repositories/collections-lookup.repository.js";
import { ProjectService } from "./services/project.service.js";
import { FeasibilityService } from "./services/feasibility.service.js";
import { CostTrackingService } from "./services/cost-tracking.service.js";
import { CollectionsService } from "./services/revenue.service.js";
import { CollectionsForecastService } from "./services/collections-forecast.service.js";
import { CostTrackingController } from "./controllers/cost-tracking.controller.js";
import { CollectionsController } from "./controllers/revenue.controller.js";
import { CollectionsForecastController } from "./controllers/collections-forecast.controller.js";
import { createApp } from "./app.js";

async function start(): Promise<void> {
  const db = createDatabaseAdapter(config);
  await db.initialize();

  const projectRepo = new ProjectRepository(db);
  const feasibilityRepo = new FeasibilityRepository(db);
  const archiveRepo = new ArchiveRepository(db);
  const relationalRepo = new FeasibilityRelationalRepository(db);
  const reportingRepo = new ReportingRepository(db);
  const costTrackingRepo = new CostTrackingRepository(db);
  const collectionsRepo = new CollectionsRepository(db);
  const collectionsForecastRepo = new CollectionsForecastRepository(db);
  const collectionsLookupRepo = new CollectionsLookupRepository(db);
  await reportingRepo.backfill();
  await relationalRepo.backfillFromJson();

  const projectService = new ProjectService(projectRepo);
  const feasibilityService = new FeasibilityService(
    feasibilityRepo,
    archiveRepo,
    relationalRepo,
    projectRepo,
    reportingRepo
  );
  const collectionsService = new CollectionsService(collectionsRepo);
  const collectionsForecastService = new CollectionsForecastService(collectionsForecastRepo, collectionsLookupRepo);
  const costTrackingService = new CostTrackingService(costTrackingRepo, collectionsRepo);
  const costTrackingController = new CostTrackingController(costTrackingService);
  const collectionsController = new CollectionsController(collectionsService);
  const collectionsForecastController = new CollectionsForecastController(collectionsForecastService);

  const app = createApp({
    projectService,
    feasibilityService,
    costTrackingController,
    collectionsController,
    collectionsForecastController,
  });

  app.listen(config.port, () => {
    console.log(`Feasibility API running on http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  console.error("Startup failed:", error);
  process.exit(1);
});
