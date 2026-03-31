import type { Request, Response, NextFunction } from "express";
import type { ProjectActualsRepository } from "./project-actuals.repository.js";
import { ValidationError } from "../../shared/errors/AppError.js";

export class ProjectActualsController {
  constructor(private readonly repo: ProjectActualsRepository) {}

  getByProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (isNaN(projectId)) throw new ValidationError("Invalid project ID");
      const actuals = await this.repo.findByProject(projectId);
      res.json(actuals);
    } catch (error) {
      next(error);
    }
  };

  upsert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (isNaN(projectId)) throw new ValidationError("Invalid project ID");

      const { lineItem, actualAmount, projectedAmount, notes } = req.body;
      if (!lineItem || typeof lineItem !== "string") throw new ValidationError("lineItem is required");
      if (actualAmount == null || typeof actualAmount !== "number") throw new ValidationError("actualAmount is required");

      const projected = typeof projectedAmount === "number" ? projectedAmount : 0;
      const result = await this.repo.upsert(projectId, lineItem, actualAmount, projected, notes);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (isNaN(projectId)) throw new ValidationError("Invalid project ID");

      const lineItem = decodeURIComponent(req.params.lineItem);
      const deletedCount = await this.repo.delete(projectId, lineItem);
      res.json({ message: `Deleted ${deletedCount} actual(s)`, deletedCount });
    } catch (error) {
      next(error);
    }
  };
}
