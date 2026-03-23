import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireRole } from "../auth/auth.middleware.js";
import type { CollectionsController } from "./revenue.controller.js";

const bulkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: "Too many bulk requests. Try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

const guard = requireRole("admin", "collections");

export function collectionsRoutes(controller: CollectionsController): Router {
  const router = Router();

  router.get("/projects/:projectId/collections", controller.getMonthlyCollections);
  router.post("/collections", guard, controller.saveMonthlyCollections);
  router.post("/collections/bulk", guard, bulkLimiter, controller.bulkSaveMonthlyCollections);
  router.delete("/projects/:projectId/collections/:year/:month", guard, controller.deleteMonthlyCollections);
  router.delete("/projects/:projectId/collections/clear", guard, controller.clearProjectCollections);

  return router;
}
