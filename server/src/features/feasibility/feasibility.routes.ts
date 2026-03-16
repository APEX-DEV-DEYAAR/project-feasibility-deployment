import { Router } from "express";
import { createFeasibilityController } from "./feasibility.controller.js";
import type { FeasibilityService } from "./feasibility.service.js";

export function feasibilityRoutes(service: FeasibilityService): Router {
  const router = Router();
  const controller = createFeasibilityController(service);

  router.get("/portfolio", controller.getPortfolio);
  router.get("/projects/:id/feasibility", controller.getLatest);
  router.put("/projects/:id/feasibility", controller.saveDraft);
  router.post("/projects/:id/feasibility/freeze", controller.freeze);
  router.post("/projects/:id/feasibility/edit", controller.editFrozen);
  router.get("/projects/:id/feasibility/archive", controller.getArchive);

  return router;
}
