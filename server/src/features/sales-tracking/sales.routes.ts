import { Router } from "express";
import type { SalesController } from "./sales.controller.js";

export function salesRoutes(controller: SalesController): Router {
  const router = Router();

  router.get("/projects/:projectId/sales", controller.getMonthlySales);
  router.post("/sales", controller.saveMonthlySales);
  router.post("/sales/bulk", controller.bulkSaveMonthlySales);
  router.delete("/projects/:projectId/sales/:year/:month", controller.deleteMonthlySales);
  router.delete("/projects/:projectId/sales/clear", controller.clearProjectSales);

  return router;
}
