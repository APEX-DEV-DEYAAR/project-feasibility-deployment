import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireRole } from "../auth/auth.middleware.js";
import type { SalesController } from "./sales.controller.js";

const bulkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: "Too many bulk requests. Try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

const guard = requireRole("admin", "sales");

export function salesRoutes(controller: SalesController): Router {
  const router = Router();

  router.get("/projects/:projectId/sales", controller.getMonthlySales);
  router.post("/sales", guard, controller.saveMonthlySales);
  router.post("/sales/bulk", guard, bulkLimiter, controller.bulkSaveMonthlySales);
  router.delete("/projects/:projectId/sales/:year/:month", guard, controller.deleteMonthlySales);
  router.delete("/projects/:projectId/sales/clear", guard, controller.clearProjectSales);

  return router;
}
