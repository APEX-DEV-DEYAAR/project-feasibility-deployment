import { Router } from "express";
import type { CostTrackingController } from "./cost-tracking.controller.js";

export function costTrackingRoutes(controller: CostTrackingController): Router {
  const router = Router();

  // ---- Categories ----
  router.get("/categories", controller.getCategories);

  // ---- Monthly Costs ----
  router.get("/projects/:projectId/costs", controller.getMonthlyCosts);
  router.get("/costs", controller.getMonthlyCostsForAllProjects);
  router.post("/costs", controller.saveMonthlyCost);
  router.post("/costs/bulk", controller.bulkSaveMonthlyCosts);
  router.delete(
    "/projects/:projectId/costs/:categoryId/:year/:month",
    controller.deleteMonthlyCost
  );

  // ---- Summaries ----
  router.get("/projects/:projectId/cost-summary", controller.getCostSummary);
  router.get("/projects/:projectId/annual-summary", controller.getAnnualSummary);

  // ---- Initialization ----
  router.post("/projects/:projectId/costs/initialize", controller.initializeYear);
  router.post("/projects/:projectId/costs/copy-year", controller.copyFromPreviousYear);

  // ---- Clear Data (project-level only) ----
  router.delete("/projects/:projectId/costs/clear", controller.clearProjectData);

  // ---- Budget vs Actuals ----
  router.get("/projects/:projectId/budget-vs-actuals", controller.getBudgetVsActuals);

  return router;
}
