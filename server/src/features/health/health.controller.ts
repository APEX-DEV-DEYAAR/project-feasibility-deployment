import type { Request, Response } from "express";

export function createHealthController() {
  return {
    check(_req: Request, res: Response): void {
      res.json({ ok: true, service: "feasibility-api" });
    },
  };
}
