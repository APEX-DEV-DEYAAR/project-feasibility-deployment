import type { BaseAdapter } from "../db/adapters/base.adapter.js";
import type {
  CollectionsInstallment,
  CollectionsInstallmentStatus,
  SaveCollectionsInstallmentPayload,
} from "../types/index.js";

const INSTALLMENT_SELECT = `SELECT
   id::int,
   project_id::int AS "projectId",
   customer_name AS "customerName",
   unit_ref AS "unitRef",
   building_name AS "buildingName",
   location_code AS "locationCode",
   installment_label AS "installmentLabel",
   due_date::text AS "dueDate",
   forecast_amount::float AS "forecastAmount",
   collected_amount::float AS "collectedAmount",
   GREATEST(forecast_amount - collected_amount, 0)::float AS "outstandingAmount",
   collection_date::text AS "collectionDate",
   status,
   probability_pct::float AS "probabilityPct",
   risk_category AS "riskCategory",
   exposure_bucket AS "exposureBucket",
   expected_forfeiture AS "expectedForfeiture",
   unit_forecast AS "unitForecast",
   over_due_pct::float AS "overDuePct",
   installments_over_due::int AS "installmentsOverDue",
   source_status AS "sourceStatus",
   payment_plan_name AS "paymentPlanName",
   property_type AS "propertyType",
   spa_signed_date::text AS "spaSignedDate",
   spa_sign_status AS "spaSignStatus",
   tsv_amount::float AS "tsvAmount",
   total_cleared::float AS "totalCleared",
   waived_amount::float AS "waivedAmount",
   total_over_due::float AS "totalOverDue",
   cleared_pct::float AS "clearedPct",
   paid_pct::float AS "paidPct",
   is_unit_over_due AS "isUnitOverDue",
   installments_over_due_bucket AS "installmentsOverDueBucket",
   over_due_pct_bucket AS "overDuePctBucket",
   registered_sale_type AS "registeredSaleType",
   latest_construction_progress::float AS "latestConstructionProgress",
   can_claim_total::float AS "canClaimTotal",
   can_claim_additional::float AS "canClaimAdditional",
   eligible_for_dld_termination AS "eligibleForDldTermination",
   project_completion_date::text AS "projectCompletionDate",
   notes,
   created_by AS "createdBy",
   created_at AS "createdAt",
   updated_at AS "updatedAt"`;

const UPSERT_COLUMNS = [
  "project_id",
  "customer_name",
  "unit_ref",
  "building_name",
  "location_code",
  "installment_label",
  "due_date",
  "forecast_amount",
  "collected_amount",
  "collection_date",
  "status",
  "probability_pct",
  "risk_category",
  "exposure_bucket",
  "expected_forfeiture",
  "unit_forecast",
  "over_due_pct",
  "installments_over_due",
  "source_status",
  "payment_plan_name",
  "property_type",
  "spa_signed_date",
  "spa_sign_status",
  "tsv_amount",
  "total_cleared",
  "waived_amount",
  "total_over_due",
  "cleared_pct",
  "paid_pct",
  "is_unit_over_due",
  "installments_over_due_bucket",
  "over_due_pct_bucket",
  "registered_sale_type",
  "latest_construction_progress",
  "can_claim_total",
  "can_claim_additional",
  "eligible_for_dld_termination",
  "project_completion_date",
  "notes",
  "created_by",
] as const;

export class CollectionsForecastRepository {
  constructor(private readonly db: BaseAdapter) {}

  async getInstallments(projectId: number): Promise<CollectionsInstallment[]> {
    const { rows } = await this.db.query<CollectionsInstallment>(
      `${INSTALLMENT_SELECT}
       FROM project_collections_installments
       WHERE project_id = ${this.db.placeholder(1)}
       ORDER BY due_date, unit_ref, installment_label`,
      [projectId]
    );
    return rows;
  }

  async saveInstallment(payload: SaveCollectionsInstallmentPayload): Promise<CollectionsInstallment> {
    const status = this.normalizeStatus(payload);
    const values = [
      payload.projectId,
      payload.customerName,
      payload.unitRef,
      payload.buildingName ?? null,
      payload.locationCode ?? null,
      payload.installmentLabel,
      payload.dueDate,
      payload.forecastAmount,
      payload.collectedAmount ?? 0,
      payload.collectionDate ?? null,
      status,
      payload.probabilityPct ?? 100,
      payload.riskCategory ?? null,
      payload.exposureBucket ?? null,
      payload.expectedForfeiture ?? null,
      payload.unitForecast ?? null,
      payload.overDuePct ?? null,
      payload.installmentsOverDue ?? null,
      payload.sourceStatus ?? null,
      payload.paymentPlanName ?? null,
      payload.propertyType ?? null,
      payload.spaSignedDate ?? null,
      payload.spaSignStatus ?? null,
      payload.tsvAmount ?? null,
      payload.totalCleared ?? null,
      payload.waivedAmount ?? null,
      payload.totalOverDue ?? null,
      payload.clearedPct ?? null,
      payload.paidPct ?? null,
      payload.isUnitOverDue ?? null,
      payload.installmentsOverDueBucket ?? null,
      payload.overDuePctBucket ?? null,
      payload.registeredSaleType ?? null,
      payload.latestConstructionProgress ?? null,
      payload.canClaimTotal ?? null,
      payload.canClaimAdditional ?? null,
      payload.eligibleForDldTermination ?? null,
      payload.projectCompletionDate ?? null,
      payload.notes ?? null,
      payload.createdBy ?? null,
    ];

    const placeholders = UPSERT_COLUMNS.map((_, index) => this.db.placeholder(index + 1)).join(", ");
    const updates = UPSERT_COLUMNS
      .filter((column) => column !== "project_id")
      .map((column) =>
        column === "created_by"
          ? `created_by = EXCLUDED.created_by`
          : `${column} = EXCLUDED.${column}`
      )
      .join(",\n         ");

    const { rows } = await this.db.query<CollectionsInstallment>(
      `INSERT INTO project_collections_installments (
         ${UPSERT_COLUMNS.join(", ")}
       ) VALUES (
         ${placeholders}
       )
       ON CONFLICT (project_id, unit_ref, installment_label, due_date)
       DO UPDATE SET
         ${updates},
         updated_at = ${this.db.nowExpression()}
       RETURNING
         ${INSTALLMENT_SELECT.replace(/^SELECT\s+/u, "")}`,
      values
    );

    return rows[0];
  }

  async bulkSaveInstallments(payloads: SaveCollectionsInstallmentPayload[]): Promise<CollectionsInstallment[]> {
    const results: CollectionsInstallment[] = [];
    for (const payload of payloads) {
      results.push(await this.saveInstallment(payload));
    }
    return results;
  }

  async getAllInstallments(): Promise<Array<CollectionsInstallment & { projectName: string }>> {
    const { rows } = await this.db.query<Array<CollectionsInstallment & { projectName: string }>[number]>(
      `SELECT
         pci.id::int,
         pci.project_id::int AS "projectId",
         p.name AS "projectName",
         pci.customer_name AS "customerName",
         pci.unit_ref AS "unitRef",
         pci.building_name AS "buildingName",
         pci.location_code AS "locationCode",
         pci.installment_label AS "installmentLabel",
         pci.due_date::text AS "dueDate",
         pci.forecast_amount::float AS "forecastAmount",
         pci.collected_amount::float AS "collectedAmount",
         GREATEST(pci.forecast_amount - pci.collected_amount, 0)::float AS "outstandingAmount",
         pci.collection_date::text AS "collectionDate",
         pci.status,
         pci.probability_pct::float AS "probabilityPct",
         pci.risk_category AS "riskCategory",
         pci.exposure_bucket AS "exposureBucket",
         pci.expected_forfeiture AS "expectedForfeiture",
         pci.unit_forecast AS "unitForecast",
         pci.over_due_pct::float AS "overDuePct",
         pci.installments_over_due::int AS "installmentsOverDue",
         pci.source_status AS "sourceStatus",
         pci.payment_plan_name AS "paymentPlanName",
         pci.property_type AS "propertyType",
         pci.spa_signed_date::text AS "spaSignedDate",
         pci.spa_sign_status AS "spaSignStatus",
         pci.tsv_amount::float AS "tsvAmount",
         pci.total_cleared::float AS "totalCleared",
         pci.waived_amount::float AS "waivedAmount",
         pci.total_over_due::float AS "totalOverDue",
         pci.cleared_pct::float AS "clearedPct",
         pci.paid_pct::float AS "paidPct",
         pci.is_unit_over_due AS "isUnitOverDue",
         pci.installments_over_due_bucket AS "installmentsOverDueBucket",
         pci.over_due_pct_bucket AS "overDuePctBucket",
         pci.registered_sale_type AS "registeredSaleType",
         pci.latest_construction_progress::float AS "latestConstructionProgress",
         pci.can_claim_total::float AS "canClaimTotal",
         pci.can_claim_additional::float AS "canClaimAdditional",
         pci.eligible_for_dld_termination AS "eligibleForDldTermination",
         pci.project_completion_date::text AS "projectCompletionDate",
         pci.notes,
         pci.created_by AS "createdBy",
         pci.created_at AS "createdAt",
         pci.updated_at AS "updatedAt"
       FROM project_collections_installments pci
       JOIN projects p ON p.id = pci.project_id
       ORDER BY p.name, pci.due_date, pci.unit_ref`
    );
    return rows as Array<CollectionsInstallment & { projectName: string }>;
  }

  private normalizeStatus(payload: SaveCollectionsInstallmentPayload): CollectionsInstallmentStatus {
    const forecast = payload.forecastAmount ?? 0;
    const collected = payload.collectedAmount ?? 0;
    const explicit = payload.status;

    if (explicit) {
      return explicit;
    }
    if (collected >= forecast && forecast > 0) {
      return "collected";
    }
    if (collected > 0) {
      return "partially_collected";
    }
    return "forecast";
  }
}
