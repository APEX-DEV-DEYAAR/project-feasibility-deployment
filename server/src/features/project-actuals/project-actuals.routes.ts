import { Router } from "express";
import { requireRole } from "../auth/auth.middleware.js";
import type { ProjectActualsController } from "./project-actuals.controller.js";

export function projectActualsRoutes(controller: ProjectActualsController): Router {
  const router = Router();

  router.get("/projects/:projectId/actuals", controller.getByProject);
  router.put("/projects/:projectId/actuals", requireRole("admin", "finance", "cfo"), controller.upsert);
  router.delete("/projects/:projectId/actuals/:lineItem", requireRole("admin", "finance", "cfo"), controller.delete);

  return router;
}
