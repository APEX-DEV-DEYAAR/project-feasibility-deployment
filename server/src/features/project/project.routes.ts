import { Router } from "express";
import { createProjectController } from "./project.controller.js";
import { requireRole } from "../auth/auth.middleware.js";
import type { ProjectService } from "./project.service.js";

export function projectRoutes(service: ProjectService): Router {
  const router = Router();
  const controller = createProjectController(service);

  router.get("/projects", controller.list);
  router.get("/projects/:id", controller.getById);
  router.post("/projects", requireRole("admin", "business_development"), controller.create);
  router.delete("/projects/:id", requireRole("admin"), controller.remove);

  return router;
}
