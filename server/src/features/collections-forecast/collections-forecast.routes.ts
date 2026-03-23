import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireRole } from "../auth/auth.middleware.js";
import type { CollectionsForecastController } from "./collections-forecast.controller.js";

const bulkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: "Too many bulk requests. Try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

const guard = requireRole("admin", "cfo", "collections");

export function collectionsForecastRoutes(controller: CollectionsForecastController): Router {
  const router = Router();

  router.get("/collections-forecast/portfolio-dashboard", controller.getPortfolioDashboard);
  router.get("/projects/:projectId/collections-forecast/installments", controller.getInstallments);
  router.get("/projects/:projectId/collections-forecast/dashboard", controller.getDashboard);
  router.post("/collections-forecast/lookups/completion/bulk", guard, bulkLimiter, controller.bulkSaveCompletionLookups);
  router.post("/collections-forecast/lookups/aging/bulk", guard, bulkLimiter, controller.bulkSaveAgingLookups);
  router.post("/collections-forecast/installments/bulk", guard, bulkLimiter, controller.bulkSaveInstallments);

  return router;
}
