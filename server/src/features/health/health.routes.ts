import { Router } from "express";
import { createHealthController } from "./health.controller.js";

export function healthRoutes(): Router {
  const router = Router();
  const controller = createHealthController();

  router.get("/health", controller.check);

  return router;
}
