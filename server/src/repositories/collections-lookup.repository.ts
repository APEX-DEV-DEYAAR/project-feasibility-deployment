import type { BaseAdapter } from "../db/adapters/base.adapter.js";
import type {
  CollectionsAgingLookup,
  CollectionsCompletionLookup,
  SaveCollectionsAgingLookupPayload,
  SaveCollectionsCompletionLookupPayload,
} from "../types/index.js";

export class CollectionsLookupRepository {
  constructor(private readonly db: BaseAdapter) {}

  private buildInClause(values: string[], startIndex = 1): string {
    return values.map((_, index) => this.db.placeholder(startIndex + index)).join(", ");
  }

  async bulkSaveCompletionLookups(
    payloads: SaveCollectionsCompletionLookupPayload[]
  ): Promise<CollectionsCompletionLookup[]> {
    const results: CollectionsCompletionLookup[] = [];
    for (const payload of payloads) {
      const { rows } = await this.db.query<CollectionsCompletionLookup>(
        `INSERT INTO collections_completion_lookup (
           building_name, project_dld_completion_date, latest_construction_progress
         ) VALUES (
           ${this.db.placeholder(1)}, ${this.db.placeholder(2)}, ${this.db.placeholder(3)}
         )
         ON CONFLICT (building_name)
         DO UPDATE SET
           project_dld_completion_date = EXCLUDED.project_dld_completion_date,
           latest_construction_progress = EXCLUDED.latest_construction_progress,
           updated_at = ${this.db.nowExpression()}
         RETURNING
           id::int,
           building_name AS "buildingName",
           project_dld_completion_date::text AS "projectDldCompletionDate",
           latest_construction_progress::float AS "latestConstructionProgress",
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [
          payload.buildingName,
          payload.projectDldCompletionDate ?? null,
          payload.latestConstructionProgress ?? null,
        ]
      );
      results.push(rows[0]);
    }
    return results;
  }

  async bulkSaveAgingLookups(
    payloads: SaveCollectionsAgingLookupPayload[]
  ): Promise<CollectionsAgingLookup[]> {
    const results: CollectionsAgingLookup[] = [];
    for (const payload of payloads) {
      const { rows } = await this.db.query<CollectionsAgingLookup>(
        `INSERT INTO collections_aging_lookup (
           location_code, bucket_0_29, bucket_30_59, bucket_60_89, bucket_90_179, bucket_180_365, bucket_365_plus
         ) VALUES (
           ${this.db.placeholder(1)}, ${this.db.placeholder(2)}, ${this.db.placeholder(3)}, ${this.db.placeholder(4)},
           ${this.db.placeholder(5)}, ${this.db.placeholder(6)}, ${this.db.placeholder(7)}
         )
         ON CONFLICT (location_code)
         DO UPDATE SET
           bucket_0_29 = EXCLUDED.bucket_0_29,
           bucket_30_59 = EXCLUDED.bucket_30_59,
           bucket_60_89 = EXCLUDED.bucket_60_89,
           bucket_90_179 = EXCLUDED.bucket_90_179,
           bucket_180_365 = EXCLUDED.bucket_180_365,
           bucket_365_plus = EXCLUDED.bucket_365_plus,
           updated_at = ${this.db.nowExpression()}
         RETURNING
           id::int,
           location_code AS "locationCode",
           bucket_0_29::float AS "bucket0To29",
           bucket_30_59::float AS "bucket30To59",
           bucket_60_89::float AS "bucket60To89",
           bucket_90_179::float AS "bucket90To179",
           bucket_180_365::float AS "bucket180To365",
           bucket_365_plus::float AS "bucket365Plus",
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [
          payload.locationCode,
          payload.bucket0To29 ?? 0,
          payload.bucket30To59 ?? 0,
          payload.bucket60To89 ?? 0,
          payload.bucket90To179 ?? 0,
          payload.bucket180To365 ?? 0,
          payload.bucket365Plus ?? 0,
        ]
      );
      results.push(rows[0]);
    }
    return results;
  }

  async getCompletionLookup(buildingName: string): Promise<CollectionsCompletionLookup | null> {
    const { rows } = await this.db.query<CollectionsCompletionLookup>(
      `SELECT
         id::int,
         building_name AS "buildingName",
         project_dld_completion_date::text AS "projectDldCompletionDate",
         latest_construction_progress::float AS "latestConstructionProgress",
         created_at AS "createdAt",
         updated_at AS "updatedAt"
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
         id::int,
         building_name AS "buildingName",
         project_dld_completion_date::text AS "projectDldCompletionDate",
         latest_construction_progress::float AS "latestConstructionProgress",
         created_at AS "createdAt",
         updated_at AS "updatedAt"
       FROM collections_completion_lookup
       WHERE building_name IN (${this.buildInClause(normalized)})`,
      normalized
    );

    return new Map(rows.map((row) => [row.buildingName, row]));
  }

  async getAgingLookup(locationCode: string): Promise<CollectionsAgingLookup | null> {
    const { rows } = await this.db.query<CollectionsAgingLookup>(
      `SELECT
         id::int,
         location_code AS "locationCode",
         bucket_0_29::float AS "bucket0To29",
         bucket_30_59::float AS "bucket30To59",
         bucket_60_89::float AS "bucket60To89",
         bucket_90_179::float AS "bucket90To179",
         bucket_180_365::float AS "bucket180To365",
         bucket_365_plus::float AS "bucket365Plus",
         created_at AS "createdAt",
         updated_at AS "updatedAt"
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
         id::int,
         location_code AS "locationCode",
         bucket_0_29::float AS "bucket0To29",
         bucket_30_59::float AS "bucket30To59",
         bucket_60_89::float AS "bucket60To89",
         bucket_90_179::float AS "bucket90To179",
         bucket_180_365::float AS "bucket180To365",
         bucket_365_plus::float AS "bucket365Plus",
         created_at AS "createdAt",
         updated_at AS "updatedAt"
       FROM collections_aging_lookup
       WHERE location_code IN (${this.buildInClause(normalized)})`,
      normalized
    );

    return new Map(rows.map((row) => [row.locationCode, row]));
  }
}
