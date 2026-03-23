import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireRole } from "../auth/auth.middleware.js";
import type { CostTrackingController } from "./cost-tracking.controller.js";

const bulkLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { message: "Too many bulk requests. Try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Each team can write their own cost data; admin can write all
const costWriteGuard = requireRole("admin", "commercial", "sales", "marketing", "finance");

export function costTrackingRoutes(controller: CostTrackingController): Router {
  const router = Router();

  // ---- Categories (read: all authenticated) ----
  router.get("/categories", controller.getCategories);

  // ---- Monthly Costs (read: all authenticated, write: team roles + admin) ----
  router.get("/projects/:projectId/costs", controller.getMonthlyCosts);
  router.get("/costs", controller.getMonthlyCostsForAllProjects);
  router.post("/costs", costWriteGuard, controller.saveMonthlyCost);
  router.post("/costs/bulk", costWriteGuard, bulkLimiter, controller.bulkSaveMonthlyCosts);
  router.delete(
    "/projects/:projectId/costs/:categoryId/:year/:month",
    costWriteGuard, controller.deleteMonthlyCost
  );

  // ---- Summaries (read: all authenticated) ----
  router.get("/projects/:projectId/cost-summary", controller.getCostSummary);
  router.get("/projects/:projectId/annual-summary", controller.getAnnualSummary);

  // ---- Initialization (write: team roles + admin) ----
  router.post("/projects/:projectId/costs/initialize", costWriteGuard, controller.initializeYear);
  router.post("/projects/:projectId/costs/copy-year", costWriteGuard, controller.copyFromPreviousYear);

  // ---- Clear Data (write: team roles + admin) ----
  router.delete("/projects/:projectId/costs/clear", costWriteGuard, controller.clearProjectData);

  return router;
}

/** Budget vs Actuals — accessible to admin, cfo, finance */
export function budgetVsActualsRoutes(controller: CostTrackingController): Router {
  const router = Router();
  router.get("/projects/:projectId/budget-vs-actuals", requireRole("admin", "cfo", "finance"), controller.getBudgetVsActuals);
  return router;
}
