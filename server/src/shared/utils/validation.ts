import { z } from "zod";
import { ValidationError } from "../errors/AppError.js";

// ---------- Shared helpers ----------

const nullableNumber = z.preprocess(
  (v) => (v == null ? null : Number(v)),
  z.number().finite().nullable()
);

const positiveInt = z.preprocess(
  (v) => Number(v),
  z.number().int().positive()
);

const yearRange = z.preprocess(
  (v) => Number(v),
  z.number().int().min(2000).max(2100)
);

const monthRange = z.preprocess(
  (v) => Number(v),
  z.number().int().min(1).max(12)
);

// ---------- Cost Tracking ----------

export const saveMonthlyCostSchema = z.object({
  projectId: positiveInt,
  categoryId: positiveInt,
  year: yearRange,
  month: monthRange,
  actualAmount: nullableNumber.optional().default(null),
  projectedAmount: nullableNumber,
  budgetAmount: nullableNumber.optional().default(null),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
}).strict();

// ---------- Collections ----------

export const saveMonthlyCollectionsSchema = z.object({
  projectId: positiveInt,
  year: yearRange,
  month: monthRange,
  budgetAmount: nullableNumber.optional().default(null),
  actualAmount: nullableNumber.optional().default(null),
  projectedAmount: nullableNumber.optional().default(null),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
}).strict();

// ---------- Sales ----------

export const saveMonthlySalesSchema = z.object({
  projectId: positiveInt,
  year: yearRange,
  month: monthRange,
  budgetAmount: nullableNumber.optional().default(null),
  actualAmount: nullableNumber.optional().default(null),
  projectedAmount: nullableNumber.optional().default(null),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
}).strict();

// ---------- Collections Forecast Lookups ----------

export const completionLookupSchema = z.object({
  buildingName: z.string().min(1),
  projectDldCompletionDate: z.string().nullable().optional().default(null),
  latestConstructionProgress: nullableNumber.optional().default(null),
}).strict();

export const agingLookupSchema = z.object({
  locationCode: z.string().min(1),
  bucket0To29: z.preprocess((v) => Number(v ?? 0), z.number().finite()).optional().default(0),
  bucket30To59: z.preprocess((v) => Number(v ?? 0), z.number().finite()).optional().default(0),
  bucket60To89: z.preprocess((v) => Number(v ?? 0), z.number().finite()).optional().default(0),
  bucket90To179: z.preprocess((v) => Number(v ?? 0), z.number().finite()).optional().default(0),
  bucket180To365: z.preprocess((v) => Number(v ?? 0), z.number().finite()).optional().default(0),
  bucket365Plus: z.preprocess((v) => Number(v ?? 0), z.number().finite()).optional().default(0),
}).strict();

// ---------- Parse helper ----------

/**
 * Parse and validate a payload against a Zod schema.
 * Returns the parsed (stripped) object or throws a ValidationError.
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues.map((i) => i.message).join("; ");
    throw new ValidationError(messages);
  }
  return result.data;
}
