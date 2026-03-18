import { Router } from "express";
import { CfoDashboardController } from "./cfo-dashboard.controller.js";

export function cfoDashboardRoutes(controller: CfoDashboardController): Router {
  const router = Router();
  router.get("/cfo-dashboard", controller.getDashboard);
  return router;
}
