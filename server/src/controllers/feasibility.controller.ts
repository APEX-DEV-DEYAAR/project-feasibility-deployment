import type { Request, Response, NextFunction } from "express";
import type { FeasibilityService } from "../services/feasibility.service.js";

export function createFeasibilityController(service: FeasibilityService) {
  return {
    async getPortfolio(_req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const data = await service.getPortfolio();
        res.json(data);
      } catch (err) {
        next(err);
      }
    },

    async getLatest(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const data = await service.getLatest(Number(req.params.id));
        res.json(data);
      } catch (err) {
        next(err);
      }
    },

    async saveDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const data = await service.saveDraft(Number(req.params.id), req.body);
        res.status(200).json(data);
      } catch (err) {
        next(err);
      }
    },

    async freeze(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const data = await service.freeze(Number(req.params.id));
        res.json(data);
      } catch (err) {
        next(err);
      }
    },

    async editFrozen(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const data = await service.editFrozen(Number(req.params.id));
        res.json(data);
      } catch (err) {
        next(err);
      }
    },

    async getArchive(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const data = await service.getArchive(Number(req.params.id));
        res.json(data);
      } catch (err) {
        next(err);
      }
    },
  };
}
