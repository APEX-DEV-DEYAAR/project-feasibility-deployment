import { Router } from "express";
import { requireRole } from "../auth/auth.middleware.js";
import { CfoDashboardController } from "./cfo-dashboard.controller.js";

export function cfoDashboardRoutes(controller: CfoDashboardController): Router {
  const router = Router();
  router.get("/cfo-dashboard", requireRole("admin", "cfo"), controller.getDashboard);
  return router;
}
