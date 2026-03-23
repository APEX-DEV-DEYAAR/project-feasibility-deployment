import { Router } from "express";
import { createFeasibilityController } from "./feasibility.controller.js";
import { requireRole } from "../auth/auth.middleware.js";
import type { FeasibilityService } from "./feasibility.service.js";

export function feasibilityRoutes(service: FeasibilityService): Router {
  const router = Router();
  const controller = createFeasibilityController(service);

  router.get("/portfolio", controller.getPortfolio);
  router.get("/projects/:id/feasibility", controller.getLatest);
  router.get("/projects/:id/feasibility/archive", controller.getArchive);

  // Write operations: admin + business_development only
  const writeGuard = requireRole("admin", "business_development");
  router.put("/projects/:id/feasibility", writeGuard, controller.saveDraft);
  router.post("/projects/:id/feasibility/freeze", writeGuard, controller.freeze);
  router.post("/projects/:id/feasibility/edit", writeGuard, controller.editFrozen);
  router.put("/projects/:id/feasibility/overrides", writeGuard, controller.saveOverrides);

  return router;
}
