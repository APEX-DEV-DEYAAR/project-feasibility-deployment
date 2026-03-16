import type { BaseAdapter } from "../../shared/db/adapters/base.adapter.js";
import type {
  CollectionsAgingLookup,
  CollectionsCompletionLookup,
  SaveCollectionsAgingLookupPayload,
  SaveCollectionsCompletionLookupPayload,
} from "../../shared/types/index.js";

const AGING_SELECT = `id,
           location_code AS "locationCode",
           bucket_0_29 AS "bucket0To29",
           bucket_30_59 AS "bucket30To59",
           bucket_60_89 AS "bucket60To89",
           bucket_90_179 AS "bucket90To179",
           bucket_180_365 AS "bucket180To365",
           bucket_365_plus AS "bucket365Plus",
           created_at AS "createdAt",
           updated_at AS "updatedAt"`;

export class CollectionsLookupRepository {
  constructor(private readonly db: BaseAdapter) {}

  private buildInClause(values: string[], startIndex = 1): string {
    return values.map((_, index) => this.db.placeholder(startIndex + index)).join(", ");
  }

  private completionSelect(): string {
    return `id,
           building_name AS "buildingName",
           ${this.db.dateToText("project_dld_completion_date")} AS "projectDldCompletionDate",
           latest_construction_progress AS "latestConstructionProgress",
           created_at AS "createdAt",
           updated_at AS "updatedAt"`;
  }

  async bulkSaveCompletionLookups(
    payloads: SaveCollectionsCompletionLookupPayload[]
  ): Promise<CollectionsCompletionLookup[]> {
    if (payloads.length > 500) {
      throw new Error("Bulk operations are limited to 500 items");
    }
    const results: CollectionsCompletionLookup[] = [];
    for (const payload of payloads) {
      const result = await this.db.upsertReturning<CollectionsCompletionLookup>({
        table: "collections_completion_lookup",
        conflictCols: ["building_name"],
        insertCols: ["building_name", "project_dld_completion_date", "latest_construction_progress"],
        updateCols: ["project_dld_completion_date", "latest_construction_progress"],
        values: [
          payload.buildingName,
          payload.projectDldCompletionDate ?? null,
          payload.latestConstructionProgress ?? null,
        ],
        selectExpr: this.completionSelect(),
        extraSetClauses: [`updated_at = ${this.db.nowExpression()}`],
      });
      results.push(result.rows[0]);
    }
    return results;
  }

  async bulkSaveAgingLookups(
    payloads: SaveCollectionsAgingLookupPayload[]
  ): Promise<CollectionsAgingLookup[]> {
    if (payloads.length > 500) {
      throw new Error("Bulk operations are limited to 500 items");
    }
    const results: CollectionsAgingLookup[] = [];
    for (const payload of payloads) {
      const result = await this.db.upsertReturning<CollectionsAgingLookup>({
        table: "collections_aging_lookup",
        conflictCols: ["location_code"],
        insertCols: ["location_code", "bucket_0_29", "bucket_30_59", "bucket_60_89", "bucket_90_179", "bucket_180_365", "bucket_365_plus"],
        updateCols: ["bucket_0_29", "bucket_30_59", "bucket_60_89", "bucket_90_179", "bucket_180_365", "bucket_365_plus"],
        values: [
          payload.locationCode,
          payload.bucket0To29 ?? 0,
          payload.bucket30To59 ?? 0,
          payload.bucket60To89 ?? 0,
          payload.bucket90To179 ?? 0,
          payload.bucket180To365 ?? 0,
          payload.bucket365Plus ?? 0,
        ],
        selectExpr: AGING_SELECT,
        extraSetClauses: [`updated_at = ${this.db.nowExpression()}`],
      });
      results.push(result.rows[0]);
    }
    return results;
  }

  async getCompletionLookup(buildingName: string): Promise<CollectionsCompletionLookup | null> {
    const { rows } = await this.db.query<CollectionsCompletionLookup>(
      `SELECT
         ${this.completionSelect()}
       FROM collections_completion_lookup
       WHERE building_name = ${this.db.placeholder(1)}
       ${this.db.limitClause(1)}`,
      [buildingName]
    );
    return rows[0] ?? null;
  }

  async getCompletionLookups(buildingNames: string[]): Promise<Map<string, CollectionsCompletionLookup>> {
    const normalized = Array.from(new Set(buildingNames.map((value) => value.trim()).filter(Boolean)));
    if (normalized.length === 0) {
      return new Map();
    }

    const { rows } = await this.db.query<CollectionsCompletionLookup>(
      `SELECT
         ${this.completionSelect()}
       FROM collections_completion_lookup
       WHERE building_name IN (${this.buildInClause(normalized)})`,
      normalized
    );

    return new Map(rows.map((row) => [row.buildingName, row]));
  }

  async getAgingLookup(locationCode: string): Promise<CollectionsAgingLookup | null> {
    const { rows } = await this.db.query<CollectionsAgingLookup>(
      `SELECT
         ${AGING_SELECT}
       FROM collections_aging_lookup
       WHERE location_code = ${this.db.placeholder(1)}
       ${this.db.limitClause(1)}`,
      [locationCode]
    );
    return rows[0] ?? null;
  }

  async getAgingLookups(locationCodes: string[]): Promise<Map<string, CollectionsAgingLookup>> {
    const normalized = Array.from(new Set(locationCodes.map((value) => value.trim()).filter(Boolean)));
    if (normalized.length === 0) {
      return new Map();
    }

    const { rows } = await this.db.query<CollectionsAgingLookup>(
      `SELECT
         ${AGING_SELECT}
       FROM collections_aging_lookup
       WHERE location_code IN (${this.buildInClause(normalized)})`,
      normalized
    );

    return new Map(rows.map((row) => [row.locationCode, row]));
  }
}
