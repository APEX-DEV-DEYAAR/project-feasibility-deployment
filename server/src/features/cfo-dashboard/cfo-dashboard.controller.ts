import type { Request, Response, NextFunction } from "express";
import { CfoDashboardService } from "./cfo-dashboard.service.js";

export class CfoDashboardController {
  constructor(private readonly service: CfoDashboardService) {}

  getDashboard = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getDashboard();
      res.json(data);
    } catch (error) {
      next(error);
    }
  };
}
