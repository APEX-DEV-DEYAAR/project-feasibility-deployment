import { logger } from "../../shared/logger.js";
import type { BaseAdapter } from "../../shared/db/adapters/base.adapter.js";
import type {
  ArchivedRun,
  FeasibilityMetrics,
  FeasibilityRun,
  NormalizedPayload,
  Partner,
} from "../../shared/types/index.js";

interface RunSnapshot {
  payload: NormalizedPayload;
  metrics: FeasibilityMetrics;
}

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function projectNameOrFallback(value: string | null | undefined): string {
  const name = typeof value === "string" ? value.trim() : "";
  return name || "Untitled Project";
}

const RUN_INPUT_COLS = [
  "run_id", "project_name", "land_area", "land_cost", "land_psf", "gfa", "nsa_resi", "nsa_retail",
  "bua_resi", "bua_retail", "units_resi", "units_retail", "resi_psf", "retail_psf", "car_park_income",
  "cof_on_sales_pct", "cc_psf", "soft_pct", "stat_pct", "cont_pct", "dev_mgmt_pct", "cof_pct",
  "sales_exp_pct", "mkt_pct",
] as const;

const RUN_METRIC_COLS = [
  "run_id", "area_land_area", "area_gfa", "area_nsa_resi", "area_nsa_retail", "area_nsa_total",
  "area_bua_resi", "area_bua_retail", "area_bua_total", "area_units_resi", "area_units_retail",
  "area_units_total", "area_efficiency_pct", "revenue_gross_resi", "revenue_cof_on_sales",
  "revenue_net_resi", "revenue_retail", "revenue_car_park_income", "revenue_total_inflows",
  "revenue_resi", "revenue_total", "cost_land_resi", "cost_land_retail", "cost_land",
  "cost_cc_resi", "cost_cc_retail", "cost_construction", "cost_soft_resi", "cost_soft_retail",
  "cost_soft", "cost_stat_resi", "cost_stat_retail", "cost_statutory", "cost_cont_resi",
  "cost_cont_retail", "cost_contingency", "cost_dev_resi", "cost_dev_retail", "cost_dev_mgmt",
  "cost_cof_resi", "cost_cof_retail", "cost_cof", "cost_se_resi", "cost_se_retail",
  "cost_sales_expense", "cost_mk_resi", "cost_mk_retail", "cost_marketing", "cost_resi",
  "cost_retail", "cost_total", "profit_np_resi", "profit_np_retail", "profit_net_profit",
  "profit_margin_resi", "profit_margin_retail", "profit_margin_pct", "profit_cash_profit",
  "profit_cash_margin_pct", "kpi_total_revenue", "kpi_total_cost", "kpi_net_profit",
  "kpi_margin_pct", "kpi_total_units",
] as const;

const ARCHIVE_INPUT_COLS = [
  "archive_id", "original_run_id", "project_name",
  "land_area", "land_cost", "land_psf", "gfa", "nsa_resi", "nsa_retail",
  "bua_resi", "bua_retail", "units_resi", "units_retail", "resi_psf", "retail_psf",
  "car_park_income", "cof_on_sales_pct", "cc_psf", "soft_pct", "stat_pct", "cont_pct", "dev_mgmt_pct",
  "cof_pct", "sales_exp_pct", "mkt_pct",
] as const;

const ARCHIVE_METRIC_COLS = [
  "archive_id", "area_land_area", "area_gfa", "area_nsa_resi", "area_nsa_retail", "area_nsa_total",
  "area_bua_resi", "area_bua_retail", "area_bua_total", "area_units_resi", "area_units_retail",
  "area_units_total", "area_efficiency_pct", "revenue_gross_resi", "revenue_cof_on_sales",
  "revenue_net_resi", "revenue_retail", "revenue_car_park_income", "revenue_total_inflows",
  "revenue_resi", "revenue_total", "cost_land_resi", "cost_land_retail", "cost_land",
  "cost_cc_resi", "cost_cc_retail", "cost_construction", "cost_soft_resi", "cost_soft_retail",
  "cost_soft", "cost_stat_resi", "cost_stat_retail", "cost_statutory", "cost_cont_resi",
  "cost_cont_retail", "cost_contingency", "cost_dev_resi", "cost_dev_retail", "cost_dev_mgmt",
  "cost_cof_resi", "cost_cof_retail", "cost_cof", "cost_se_resi", "cost_se_retail",
  "cost_sales_expense", "cost_mk_resi", "cost_mk_retail", "cost_marketing", "cost_resi",
  "cost_retail", "cost_total", "profit_np_resi", "profit_np_retail", "profit_net_profit",
  "profit_margin_resi", "profit_margin_retail", "profit_margin_pct", "profit_cash_profit",
  "profit_cash_margin_pct", "kpi_total_revenue", "kpi_total_cost", "kpi_net_profit",
  "kpi_margin_pct", "kpi_total_units",
] as const;

export class FeasibilityRelationalRepository {
  constructor(private readonly db: BaseAdapter) {}

  async backfillFromJson(): Promise<void> {
    const currentRuns = await this.db.query<FeasibilityRun>(
      `SELECT
         id,
         project_id AS "projectId",
         version,
         status,
         payload,
         metrics,
         created_at AS "createdAt",
         updated_at AS "updatedAt",
         frozen_at AS "frozenAt"
       FROM feasibility_runs`
    );

    for (const run of currentRuns.rows) {
      try {
        await this.syncRun(run);
      } catch (err) {
        logger.warn({ runId: run.id, err: (err as Error).message }, "Backfill: skipped run");
      }
    }

    const archivedRuns = await this.db.query<ArchivedRun>(
      `SELECT
         id,
         original_run_id AS "originalRunId",
         project_id AS "projectId",
         version,
         payload,
         metrics,
         frozen_at AS "frozenAt",
         archived_at AS "archivedAt"
       FROM feasibility_archive`
    );

    for (const archive of archivedRuns.rows) {
      try {
        await this.syncArchive(archive);
      } catch (err) {
        logger.warn({ archiveId: archive.id, err: (err as Error).message }, "Backfill: skipped archive");
      }
    }
  }

  async syncRun(run: FeasibilityRun): Promise<void> {
    const snapshot = this.buildSnapshot(run.payload, run.metrics);

    const inputCols = [...RUN_INPUT_COLS];
    const inputUpdateCols = inputCols.filter((c) => c !== "run_id");
    const inputSql = this.db.upsert("feasibility_run_inputs", ["run_id"], inputCols, inputUpdateCols, 1);
    await this.db.query(inputSql, [run.id, ...this.inputValues(snapshot.payload)]);

    const metricCols = [...RUN_METRIC_COLS];
    const metricUpdateCols = metricCols.filter((c) => c !== "run_id");
    const metricSql = this.db.upsert("feasibility_run_metrics", ["run_id"], metricCols, metricUpdateCols, 1);
    await this.db.query(metricSql, [run.id, ...this.metricValues(snapshot.metrics)]);

    await this.replaceRunPartners(run.id, snapshot.payload.partners, snapshot.metrics);
  }

  async deleteRun(runId: number): Promise<void> {
    await this.db.query(
      `DELETE FROM feasibility_run_partners WHERE run_id = ${this.db.placeholder(1)}`,
      [runId]
    );
    await this.db.query(
      `DELETE FROM feasibility_run_metrics WHERE run_id = ${this.db.placeholder(1)}`,
      [runId]
    );
    await this.db.query(
      `DELETE FROM feasibility_run_inputs WHERE run_id = ${this.db.placeholder(1)}`,
      [runId]
    );
  }

  async syncArchive(archive: ArchivedRun): Promise<void> {
    const snapshot = this.buildSnapshot(archive.payload, archive.metrics);

    const inputCols = [...ARCHIVE_INPUT_COLS];
    const inputUpdateCols = inputCols.filter((c) => c !== "archive_id");
    const inputSql = this.db.upsert("feasibility_archive_inputs", ["archive_id"], inputCols, inputUpdateCols, 1);
    await this.db.query(inputSql, [archive.id, archive.originalRunId, ...this.inputValues(snapshot.payload)]);

    const metricCols = [...ARCHIVE_METRIC_COLS];
    const metricUpdateCols = metricCols.filter((c) => c !== "archive_id");
    const metricSql = this.db.upsert("feasibility_archive_metrics", ["archive_id"], metricCols, metricUpdateCols, 1);
    await this.db.query(metricSql, [archive.id, ...this.metricValues(snapshot.metrics)]);

    await this.replaceArchivePartners(archive.id, snapshot.payload.partners, snapshot.metrics);
  }

  private async replaceRunPartners(runId: number, partners: Partner[], metrics: FeasibilityMetrics): Promise<void> {
    await this.db.query(
      `DELETE FROM feasibility_run_partners WHERE run_id = ${this.db.placeholder(1)}`,
      [runId]
    );
    await this.insertPartners("feasibility_run_partners", "run_id", runId, partners, metrics);
  }

  private async replaceArchivePartners(archiveId: number, partners: Partner[], metrics: FeasibilityMetrics): Promise<void> {
    await this.db.query(
      `DELETE FROM feasibility_archive_partners WHERE archive_id = ${this.db.placeholder(1)}`,
      [archiveId]
    );
    await this.insertPartners("feasibility_archive_partners", "archive_id", archiveId, partners, metrics);
  }

  private static readonly ALLOWED_PARTNER_TABLES = new Set([
    "feasibility_run_partners",
    "feasibility_archive_partners",
  ]);
  private static readonly ALLOWED_OWNER_COLUMNS = new Set(["run_id", "archive_id"]);

  private async insertPartners(
    tableName: "feasibility_run_partners" | "feasibility_archive_partners",
    ownerColumn: "run_id" | "archive_id",
    ownerId: number,
    partners: Partner[],
    metrics: FeasibilityMetrics
  ): Promise<void> {
    if (!FeasibilityRelationalRepository.ALLOWED_PARTNER_TABLES.has(tableName)) {
      throw new Error(`Invalid table: ${tableName}`);
    }
    if (!FeasibilityRelationalRepository.ALLOWED_OWNER_COLUMNS.has(ownerColumn)) {
      throw new Error(`Invalid column: ${ownerColumn}`);
    }

    const profitShareByName = new Map(
      (metrics.jvShares ?? []).map((partner) => [partner.name, partner.profitShare])
    );

    const cols = [ownerColumn, "partner_order", "partner_name", "share_pct", "profit_share"];
    const updateCols = ["partner_name", "share_pct", "profit_share"];

    for (let index = 0; index < partners.length; index += 1) {
      const partner = partners[index];
      const sql = this.db.upsert(tableName, [ownerColumn, "partner_order"], cols, updateCols, 1);
      await this.db.query(sql, [
        ownerId,
        index + 1,
        partner.name,
        partner.share,
        profitShareByName.get(partner.name) ?? 0,
      ]);
    }
  }

  private buildSnapshot(payload: NormalizedPayload, metrics: FeasibilityMetrics): RunSnapshot {
    return {
      payload: {
        projectName: projectNameOrFallback(payload?.projectName),
        input: {
          landArea: payload?.input?.landArea ?? null,
          landCost: payload?.input?.landCost ?? null,
          landPsf: payload?.input?.landPsf ?? null,
          gfa: payload?.input?.gfa ?? null,
          nsaResi: payload?.input?.nsaResi ?? null,
          nsaRetail: payload?.input?.nsaRetail ?? null,
          buaResi: payload?.input?.buaResi ?? null,
          buaRetail: payload?.input?.buaRetail ?? null,
          unitsResi: payload?.input?.unitsResi ?? null,
          unitsRetail: payload?.input?.unitsRetail ?? null,
          resiPsf: payload?.input?.resiPsf ?? null,
          retailPsf: payload?.input?.retailPsf ?? null,
          carParkIncome: payload?.input?.carParkIncome ?? null,
          cofOnSalesPct: payload?.input?.cofOnSalesPct ?? null,
          ccPsf: payload?.input?.ccPsf ?? null,
          softPct: payload?.input?.softPct ?? null,
          statPct: payload?.input?.statPct ?? null,
          contPct: payload?.input?.contPct ?? null,
          devMgmtPct: payload?.input?.devMgmtPct ?? null,
          cofPct: payload?.input?.cofPct ?? null,
          salesExpPct: payload?.input?.salesExpPct ?? null,
          mktPct: payload?.input?.mktPct ?? null,
        },
        partners: Array.isArray(payload?.partners) ? payload.partners : [],
      },
      metrics: {
        area: {
          landArea: num(metrics?.area?.landArea),
          gfa: num(metrics?.area?.gfa),
          nsaResi: num(metrics?.area?.nsaResi),
          nsaRetail: num(metrics?.area?.nsaRetail),
          nsaTotal: num(metrics?.area?.nsaTotal),
          buaResi: num(metrics?.area?.buaResi),
          buaRetail: num(metrics?.area?.buaRetail),
          buaTotal: num(metrics?.area?.buaTotal),
          unitsResi: num(metrics?.area?.unitsResi),
          unitsRetail: num(metrics?.area?.unitsRetail),
          unitsTotal: num(metrics?.area?.unitsTotal),
          efficiencyPct: num(metrics?.area?.efficiencyPct),
        },
        revenue: {
          grossResi: num(metrics?.revenue?.grossResi),
          cofOnSales: num(metrics?.revenue?.cofOnSales),
          netResi: num(metrics?.revenue?.netResi),
          retail: num(metrics?.revenue?.retail),
          carParkIncome: num(metrics?.revenue?.carParkIncome),
          totalInflows: num(metrics?.revenue?.totalInflows),
          resi: num(metrics?.revenue?.resi),
          total: num(metrics?.revenue?.total),
        },
        costs: {
          landResi: num(metrics?.costs?.landResi),
          landRetail: num(metrics?.costs?.landRetail),
          land: num(metrics?.costs?.land),
          ccResi: num(metrics?.costs?.ccResi),
          ccRetail: num(metrics?.costs?.ccRetail),
          construction: num(metrics?.costs?.construction),
          softResi: num(metrics?.costs?.softResi),
          softRetail: num(metrics?.costs?.softRetail),
          soft: num(metrics?.costs?.soft),
          statResi: num(metrics?.costs?.statResi),
          statRetail: num(metrics?.costs?.statRetail),
          statutory: num(metrics?.costs?.statutory),
          contResi: num(metrics?.costs?.contResi),
          contRetail: num(metrics?.costs?.contRetail),
          contingency: num(metrics?.costs?.contingency),
          devResi: num(metrics?.costs?.devResi),
          devRetail: num(metrics?.costs?.devRetail),
          devMgmt: num(metrics?.costs?.devMgmt),
          cofResi: num(metrics?.costs?.cofResi),
          cofRetail: num(metrics?.costs?.cofRetail),
          cof: num(metrics?.costs?.cof),
          seResi: num(metrics?.costs?.seResi),
          seRetail: num(metrics?.costs?.seRetail),
          salesExpense: num(metrics?.costs?.salesExpense),
          mkResi: num(metrics?.costs?.mkResi),
          mkRetail: num(metrics?.costs?.mkRetail),
          marketing: num(metrics?.costs?.marketing),
          costResi: num(metrics?.costs?.costResi),
          costRetail: num(metrics?.costs?.costRetail),
          total: num(metrics?.costs?.total),
        },
        profitability: {
          npResi: num(metrics?.profitability?.npResi),
          npRetail: num(metrics?.profitability?.npRetail),
          netProfit: num(metrics?.profitability?.netProfit),
          marginResi: num(metrics?.profitability?.marginResi),
          marginRetail: num(metrics?.profitability?.marginRetail),
          marginPct: num(metrics?.profitability?.marginPct),
          cashProfit: num(metrics?.profitability?.cashProfit),
          cashMarginPct: num(metrics?.profitability?.cashMarginPct),
        },
        jvShares: Array.isArray(metrics?.jvShares) ? metrics.jvShares : [],
        kpis: {
          totalRevenue: num(metrics?.kpis?.totalRevenue),
          totalCost: num(metrics?.kpis?.totalCost),
          netProfit: num(metrics?.kpis?.netProfit),
          marginPct: num(metrics?.kpis?.marginPct),
          totalUnits: num(metrics?.kpis?.totalUnits),
        },
      },
    };
  }

  private inputValues(payload: NormalizedPayload): unknown[] {
    const input = payload.input;
    return [
      payload.projectName,
      input.landArea,
      input.landCost,
      input.landPsf,
      input.gfa,
      input.nsaResi,
      input.nsaRetail,
      input.buaResi,
      input.buaRetail,
      input.unitsResi,
      input.unitsRetail,
      input.resiPsf,
      input.retailPsf,
      input.carParkIncome,
      input.cofOnSalesPct,
      input.ccPsf,
      input.softPct,
      input.statPct,
      input.contPct,
      input.devMgmtPct,
      input.cofPct,
      input.salesExpPct,
      input.mktPct,
    ];
  }

  private metricValues(metrics: FeasibilityMetrics): unknown[] {
    return [
      metrics.area.landArea,
      metrics.area.gfa,
      metrics.area.nsaResi,
      metrics.area.nsaRetail,
      metrics.area.nsaTotal,
      metrics.area.buaResi,
      metrics.area.buaRetail,
      metrics.area.buaTotal,
      metrics.area.unitsResi,
      metrics.area.unitsRetail,
      metrics.area.unitsTotal,
      metrics.area.efficiencyPct,
      metrics.revenue.grossResi,
      metrics.revenue.cofOnSales,
      metrics.revenue.netResi,
      metrics.revenue.retail,
      metrics.revenue.carParkIncome,
      metrics.revenue.totalInflows,
      metrics.revenue.resi,
      metrics.revenue.total,
      metrics.costs.landResi,
      metrics.costs.landRetail,
      metrics.costs.land,
      metrics.costs.ccResi,
      metrics.costs.ccRetail,
      metrics.costs.construction,
      metrics.costs.softResi,
      metrics.costs.softRetail,
      metrics.costs.soft,
      metrics.costs.statResi,
      metrics.costs.statRetail,
      metrics.costs.statutory,
      metrics.costs.contResi,
      metrics.costs.contRetail,
      metrics.costs.contingency,
      metrics.costs.devResi,
      metrics.costs.devRetail,
      metrics.costs.devMgmt,
      metrics.costs.cofResi,
      metrics.costs.cofRetail,
      metrics.costs.cof,
      metrics.costs.seResi,
      metrics.costs.seRetail,
      metrics.costs.salesExpense,
      metrics.costs.mkResi,
      metrics.costs.mkRetail,
      metrics.costs.marketing,
      metrics.costs.costResi,
      metrics.costs.costRetail,
      metrics.costs.total,
      metrics.profitability.npResi,
      metrics.profitability.npRetail,
      metrics.profitability.netProfit,
      metrics.profitability.marginResi,
      metrics.profitability.marginRetail,
      metrics.profitability.marginPct,
      metrics.profitability.cashProfit,
      metrics.profitability.cashMarginPct,
      metrics.kpis.totalRevenue,
      metrics.kpis.totalCost,
      metrics.kpis.netProfit,
      metrics.kpis.marginPct,
      metrics.kpis.totalUnits,
    ];
  }
}
