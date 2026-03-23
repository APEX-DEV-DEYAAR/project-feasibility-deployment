import type { Request, Response, NextFunction } from "express";
import { SalesService } from "./sales.service.js";
import { AppError, ValidationError } from "../../shared/errors/AppError.js";
import type { SaveMonthlySalesPayload } from "../../shared/types/index.js";
import { saveMonthlySalesSchema, parseOrThrow } from "../../shared/utils/validation.js";

function parseIntParam(value: string, name: string): number {
  const num = parseInt(value, 10);
  if (isNaN(num)) throw new ValidationError(`Invalid ${name}`);
  return num;
}

function validateYear(year: number): void {
  if (year < 2000 || year > 2100) throw new ValidationError("Year must be between 2000 and 2100");
}

function validateMonth(month: number): void {
  if (month < 1 || month > 12) throw new ValidationError("Month must be between 1 and 12");
}

const MAX_BULK_SIZE = 500;

export class SalesController {
  constructor(private readonly service: SalesService) {}

  getMonthlySales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseIntParam(req.params.projectId, "project ID");
      const rawYear = req.query.year as string | undefined;
      let year: number | undefined;
      if (rawYear) {
        year = parseIntParam(rawYear, "year");
        validateYear(year);
      }
      const data = await this.service.getMonthlySales(projectId, year);
      res.json(data);
    } catch (error) {
      next(error);
    }
  };

  saveMonthlySales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const normalized = parseOrThrow(saveMonthlySalesSchema, req.body) as SaveMonthlySalesPayload;
      const result = await this.service.saveMonthlySales(normalized);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  bulkSaveMonthlySales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sales } = req.body;

      if (!Array.isArray(sales) || sales.length === 0) {
        throw new ValidationError("Sales array is required and must not be empty");
      }
      if (sales.length > MAX_BULK_SIZE) {
        throw new ValidationError(`Bulk save limited to ${MAX_BULK_SIZE} items`);
      }

      const normalized = sales.map((s: unknown) => parseOrThrow(saveMonthlySalesSchema, s)) as SaveMonthlySalesPayload[];
      const saved = await this.service.bulkSaveMonthlySales(normalized);
      res.status(201).json(saved);
    } catch (error) {
      next(error);
    }
  };

  deleteMonthlySales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseIntParam(req.params.projectId, "project ID");
      const year = parseIntParam(req.params.year, "year");
      const month = parseIntParam(req.params.month, "month");

      validateYear(year);
      validateMonth(month);

      const deleted = await this.service.deleteMonthlySales(projectId, year, month);
      if (!deleted) {
        throw new AppError("Sales entry not found", 404);
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  clearProjectSales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseIntParam(req.params.projectId, "project ID");
      const deletedCount = await this.service.clearProjectSales(projectId);
      res.json({ message: `Deleted ${deletedCount} sales records for project ${projectId}`, deletedCount });
    } catch (error) {
      next(error);
    }
  };
}
