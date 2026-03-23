import type { NextFunction, Request, Response } from "express";
import { ValidationError } from "../../shared/errors/AppError.js";
import { CollectionsForecastService } from "./collections-forecast.service.js";
import type {
  SaveCollectionsAgingLookupPayload,
  SaveCollectionsCompletionLookupPayload,
  SaveCollectionsInstallmentPayload,
} from "../../shared/types/index.js";
import { completionLookupSchema, agingLookupSchema, parseOrThrow } from "../../shared/utils/validation.js";

function parseIntParam(value: string, name: string): number {
  const num = parseInt(value, 10);
  if (isNaN(num)) throw new ValidationError(`Invalid ${name}`);
  return num;
}

function normalizePayload(payload: SaveCollectionsInstallmentPayload): SaveCollectionsInstallmentPayload {
  const projectId = Number(payload.projectId);
  const forecastAmount = Number(payload.forecastAmount);
  const collectedAmount = Number(payload.collectedAmount ?? 0);
  const probabilityPct = Number(payload.probabilityPct ?? 100);
  const tsvAmount = payload.tsvAmount == null ? null : Number(payload.tsvAmount);
  const totalCleared = payload.totalCleared == null ? null : Number(payload.totalCleared);
  const waivedAmount = payload.waivedAmount == null ? null : Number(payload.waivedAmount);
  const totalOverDue = payload.totalOverDue == null ? null : Number(payload.totalOverDue);
  const installmentsOverDue = payload.installmentsOverDue == null ? null : Number(payload.installmentsOverDue);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new ValidationError("Valid projectId is required");
  }
  if (!payload.installmentLabel?.trim()) {
    throw new ValidationError("Installment label is required");
  }
  if (!payload.dueDate) {
    throw new ValidationError("Due date is required");
  }
  if (!Number.isFinite(forecastAmount) || forecastAmount < 0) {
    throw new ValidationError("Forecast amount must be a valid non-negative number");
  }
  if (!Number.isFinite(collectedAmount) || collectedAmount < 0) {
    throw new ValidationError("Collected amount must be a valid non-negative number");
  }
  if (!Number.isFinite(probabilityPct) || probabilityPct < 0 || probabilityPct > 100) {
    throw new ValidationError("Probability must be between 0 and 100");
  }

  return {
    ...payload,
    projectId,
    customerName: payload.customerName?.trim() ?? "",
    unitRef: payload.unitRef?.trim() ?? "",
    buildingName: payload.buildingName?.trim() || undefined,
    locationCode: payload.locationCode?.trim() || undefined,
    installmentLabel: payload.installmentLabel.trim(),
    forecastAmount,
    collectedAmount,
    probabilityPct,
    paymentPlanName: payload.paymentPlanName?.trim() || undefined,
    propertyType: payload.propertyType?.trim() || undefined,
    spaSignedDate: payload.spaSignedDate || null,
    spaSignStatus: payload.spaSignStatus?.trim() || undefined,
    tsvAmount: Number.isFinite(tsvAmount) ? tsvAmount : null,
    totalCleared: Number.isFinite(totalCleared) ? totalCleared : null,
    waivedAmount: Number.isFinite(waivedAmount) ? waivedAmount : null,
    totalOverDue: Number.isFinite(totalOverDue) ? totalOverDue : null,
    installmentsOverDue: Number.isFinite(installmentsOverDue) ? installmentsOverDue : null,
    notes: payload.notes?.trim() || undefined,
    collectionDate: payload.collectionDate || null,
  };
}

const MAX_BULK_SIZE = 1000;

export class CollectionsForecastController {
  constructor(private readonly service: CollectionsForecastService) {}

  getInstallments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseIntParam(req.params.projectId, "project ID");
      res.json(await this.service.getInstallments(projectId));
    } catch (error) {
      next(error);
    }
  };

  bulkSaveInstallments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { installments } = req.body as { installments?: SaveCollectionsInstallmentPayload[] };
      if (!Array.isArray(installments) || installments.length === 0) {
        throw new ValidationError("Installments array is required and must not be empty");
      }
      if (installments.length > MAX_BULK_SIZE) {
        throw new ValidationError(`Bulk save limited to ${MAX_BULK_SIZE} items`);
      }

      const normalized = installments.map(normalizePayload);
      res.status(201).json(await this.service.bulkSaveInstallments(normalized));
    } catch (error) {
      next(error);
    }
  };

  bulkSaveCompletionLookups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { lookups } = req.body as { lookups?: unknown[] };
      if (!Array.isArray(lookups) || lookups.length === 0) {
        throw new ValidationError("Completion lookups array is required and must not be empty");
      }
      const validated = lookups.map((l) => parseOrThrow(completionLookupSchema, l)) as SaveCollectionsCompletionLookupPayload[];
      res.status(201).json(await this.service.bulkSaveCompletionLookups(validated));
    } catch (error) {
      next(error);
    }
  };

  bulkSaveAgingLookups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { lookups } = req.body as { lookups?: unknown[] };
      if (!Array.isArray(lookups) || lookups.length === 0) {
        throw new ValidationError("Aging lookups array is required and must not be empty");
      }
      const validated = lookups.map((l) => parseOrThrow(agingLookupSchema, l)) as SaveCollectionsAgingLookupPayload[];
      res.status(201).json(await this.service.bulkSaveAgingLookups(validated));
    } catch (error) {
      next(error);
    }
  };

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseIntParam(req.params.projectId, "project ID");
      const asOf = req.query.asOf as string | undefined;
      res.json(await this.service.getDashboard(projectId, asOf));
    } catch (error) {
      next(error);
    }
  };

  getPortfolioDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const asOf = req.query.asOf as string | undefined;
      res.json(await this.service.getPortfolioDashboard(asOf));
    } catch (error) {
      next(error);
    }
  };
}
