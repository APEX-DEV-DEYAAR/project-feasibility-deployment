import type { Request, Response, NextFunction } from "express";
import { CollectionsService } from "./revenue.service.js";
import { AppError, ValidationError } from "../../shared/errors/AppError.js";
import type { SaveMonthlyCollectionsPayload } from "../../shared/types/index.js";

function parseIntParam(value: string, name: string): number {
  const num = parseInt(value, 10);
  if (isNaN(num)) throw new ValidationError(`Invalid ${name}`);
  return num;
}

function validateMonth(month: number): void {
  if (month < 1 || month > 12) throw new ValidationError("Month must be between 1 and 12");
}

function validateYear(year: number): void {
  if (year < 2000 || year > 2100) throw new ValidationError("Year must be between 2000 and 2100");
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

function validateAndNormalizeCollectionsPayload(payload: SaveMonthlyCollectionsPayload): SaveMonthlyCollectionsPayload {
  const projectId = Number(payload.projectId);
  const year = Number(payload.year);
  const month = Number(payload.month);

  if (!Number.isInteger(projectId) || projectId <= 0)
    throw new ValidationError("Valid projectId is required");
  if (!Number.isInteger(year)) throw new ValidationError("Year is required");
  if (!Number.isInteger(month)) throw new ValidationError("Month is required");

  validateYear(year);
  validateMonth(month);

  return {
    ...payload,
    projectId,
    year,
    month,
    budgetAmount: toNumberOrNull(payload.budgetAmount),
    actualAmount: toNumberOrNull(payload.actualAmount),
    projectedAmount: toNumberOrNull(payload.projectedAmount),
  };
}

const MAX_BULK_SIZE = 500;

export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  getMonthlyCollections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseIntParam(req.params.projectId, "project ID");
      const rawYear = req.query.year as string | undefined;
      let year: number | undefined;
      if (rawYear) {
        year = parseIntParam(rawYear, "year");
        validateYear(year);
      }
      const data = await this.service.getMonthlyCollections(projectId, year);
      res.json(data);
    } catch (error) {
      next(error);
    }
  };

  saveMonthlyCollections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const normalized = validateAndNormalizeCollectionsPayload(req.body);
      const result = await this.service.saveMonthlyCollections(normalized);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  bulkSaveMonthlyCollections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { collections } = req.body;

      if (!Array.isArray(collections) || collections.length === 0) {
        throw new ValidationError("Collections array is required and must not be empty");
      }
      if (collections.length > MAX_BULK_SIZE) {
        throw new ValidationError(`Bulk save limited to ${MAX_BULK_SIZE} items`);
      }

      const normalized = collections.map(validateAndNormalizeCollectionsPayload);
      const saved = await this.service.bulkSaveMonthlyCollections(normalized);
      res.status(201).json(saved);
    } catch (error) {
      next(error);
    }
  };

  deleteMonthlyCollections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseIntParam(req.params.projectId, "project ID");
      const year = parseIntParam(req.params.year, "year");
      const month = parseIntParam(req.params.month, "month");

      validateYear(year);
      validateMonth(month);

      const deleted = await this.service.deleteMonthlyCollections(projectId, year, month);
      if (!deleted) {
        throw new AppError("Collections entry not found", 404);
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  clearProjectCollections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseIntParam(req.params.projectId, "project ID");
      const deletedCount = await this.service.clearProjectCollections(projectId);
      res.json({ message: `Deleted ${deletedCount} collections records for project ${projectId}`, deletedCount });
    } catch (error) {
      next(error);
    }
  };
}
