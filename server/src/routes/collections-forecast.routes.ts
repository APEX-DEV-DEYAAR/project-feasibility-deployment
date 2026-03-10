import { Router } from "express";
import type { CollectionsForecastController } from "../controllers/collections-forecast.controller.js";

export function collectionsForecastRoutes(controller: CollectionsForecastController): Router {
  const router = Router();

  router.get("/collections-forecast/portfolio-dashboard", controller.getPortfolioDashboard);
  router.post("/collections-forecast/lookups/completion/bulk", controller.bulkSaveCompletionLookups);
  router.post("/collections-forecast/lookups/aging/bulk", controller.bulkSaveAgingLookups);
  router.get("/projects/:projectId/collections-forecast/installments", controller.getInstallments);
  router.post("/collections-forecast/installments/bulk", controller.bulkSaveInstallments);
  router.get("/projects/:projectId/collections-forecast/dashboard", controller.getDashboard);

  return router;
}
