import type { BaseAdapter } from "../../shared/db/adapters/base.adapter.js";
import type {
  ArchivedRun,
  FeasibilityReportingPartner,
  FeasibilityRun,
  NormalizedPayload,
  FeasibilityMetrics,
} from "../../shared/types/index.js";

interface SnapshotRecord {
  projectName: string;
  input: NormalizedPayload["input"];
  metrics: FeasibilityMetrics;
}

const CURRENT_COLS = [
  "run_id", "project_id", "version", "status", "created_at", "updated_at", "frozen_at",
  "project_name",
  "land_area", "land_cost", "gfa", "nsa_resi", "nsa_retail", "bua_resi", "bua_retail", "units_resi", "units_retail",
  "resi_psf", "retail_psf", "cc_psf", "soft_pct", "stat_pct", "cont_pct", "dev_mgmt_pct", "cof_pct", "sales_exp_pct", "mkt_pct",
  "area_land_area", "area_gfa", "area_nsa_resi", "area_nsa_retail", "area_nsa_total", "area_bua_resi", "area_bua_retail", "area_bua_total",
  "area_units_resi", "area_units_retail", "area_units_total", "area_efficiency_pct",
  "revenue_resi", "revenue_retail", "revenue_total",
  "cost_land_resi", "cost_land_retail", "cost_land", "cost_cc_resi", "cost_cc_retail", "cost_construction", "cost_soft_resi", "cost_soft_retail", "cost_soft",
  "cost_stat_resi", "cost_stat_retail", "cost_statutory", "cost_cont_resi", "cost_cont_retail", "cost_contingency",
  "cost_dev_resi", "cost_dev_retail", "cost_dev_mgmt", "cost_cof_resi", "cost_cof_retail", "cost_cof",
  "cost_se_resi", "cost_se_retail", "cost_sales_expense", "cost_mk_resi", "cost_mk_retail", "cost_marketing",
  "cost_resi", "cost_retail", "cost_total",
  "profit_np_resi", "profit_np_retail", "profit_net_profit", "profit_margin_resi", "profit_margin_retail", "profit_margin_pct",
  "kpi_total_revenue", "kpi_total_cost", "kpi_net_profit", "kpi_margin_pct", "kpi_total_units",
] as const;

const ARCHIVE_COLS = [
  "archive_id", "original_run_id", "project_id", "version", "frozen_at", "archived_at",
  "project_name",
  "land_area", "land_cost", "gfa", "nsa_resi", "nsa_retail", "bua_resi", "bua_retail", "units_resi", "units_retail",
  "resi_psf", "retail_psf", "cc_psf", "soft_pct", "stat_pct", "cont_pct", "dev_mgmt_pct", "cof_pct", "sales_exp_pct", "mkt_pct",
  "area_land_area", "area_gfa", "area_nsa_resi", "area_nsa_retail", "area_nsa_total", "area_bua_resi", "area_bua_retail", "area_bua_total",
  "area_units_resi", "area_units_retail", "area_units_total", "area_efficiency_pct",
  "revenue_resi", "revenue_retail", "revenue_total",
  "cost_land_resi", "cost_land_retail", "cost_land", "cost_cc_resi", "cost_cc_retail", "cost_construction", "cost_soft_resi", "cost_soft_retail", "cost_soft",
  "cost_stat_resi", "cost_stat_retail", "cost_statutory", "cost_cont_resi", "cost_cont_retail", "cost_contingency",
  "cost_dev_resi", "cost_dev_retail", "cost_dev_mgmt", "cost_cof_resi", "cost_cof_retail", "cost_cof",
  "cost_se_resi", "cost_se_retail", "cost_sales_expense", "cost_mk_resi", "cost_mk_retail", "cost_marketing",
  "cost_resi", "cost_retail", "cost_total",
  "profit_np_resi", "profit_np_retail", "profit_net_profit", "profit_margin_resi", "profit_margin_retail", "profit_margin_pct",
  "kpi_total_revenue", "kpi_total_cost", "kpi_net_profit", "kpi_margin_pct", "kpi_total_units",
] as const;

export class ReportingRepository {
  constructor(private readonly db: BaseAdapter) {}

  async backfill(): Promise<void> {
    const currentRuns = await this.db.query<FeasibilityRun>(
      `SELECT id, project_id AS "projectId", version, status,
              payload, metrics,
              created_at AS "createdAt", updated_at AS "updatedAt", frozen_at AS "frozenAt"
       FROM feasibility_runs`
    );

    for (const run of currentRuns.rows) {
      await this.syncCurrent(run);
    }

    const archivedRuns = await this.db.query<ArchivedRun>(
      `SELECT id, original_run_id AS "originalRunId", project_id AS "projectId",
              version, payload, metrics, frozen_at AS "frozenAt", archived_at AS "archivedAt"
       FROM feasibility_archive`
    );

    for (const archive of archivedRuns.rows) {
      await this.insertArchive(archive);
    }
  }

  async syncCurrent(run: FeasibilityRun): Promise<void> {
    const snapshot = this.buildSnapshot(run.payload, run.metrics);
    const params = [
      run.id,
      run.projectId,
      run.version,
      run.status,
      run.createdAt,
      run.updatedAt,
      run.frozenAt,
      ...this.snapshotValues(snapshot),
    ];

    const cols = [...CURRENT_COLS];
    const updateCols = cols.filter((c) => c !== "run_id");
    const sql = this.db.upsert("feasibility_reporting_current", ["run_id"], cols, updateCols, 1);
    await this.db.query(sql, params);

    await this.replaceCurrentPartners(run.id, this.extractPartners(run.metrics));
  }

  async deleteCurrent(runId: number): Promise<void> {
    await this.db.query(
      `DELETE FROM feasibility_reporting_current WHERE run_id = ${this.db.placeholder(1)}`,
      [runId]
    );
  }

  async insertArchive(archive: ArchivedRun): Promise<void> {
    const snapshot = this.buildSnapshot(archive.payload, archive.metrics);
    const params = [
      archive.id,
      archive.originalRunId,
      archive.projectId,
      archive.version,
      archive.frozenAt,
      archive.archivedAt,
      ...this.snapshotValues(snapshot),
    ];

    const cols = [...ARCHIVE_COLS];
    const sql = this.db.upsertOrIgnore("feasibility_reporting_archive", ["archive_id"], cols, 1);
    await this.db.query(sql, params);

    await this.replaceArchivePartners(archive.id, this.extractPartners(archive.metrics));
  }

  private async replaceCurrentPartners(runId: number, partners: FeasibilityReportingPartner[]): Promise<void> {
    await this.db.query(
      `DELETE FROM feasibility_reporting_current_partners WHERE run_id = ${this.db.placeholder(1)}`,
      [runId]
    );
    await this.insertPartners("feasibility_reporting_current_partners", "run_id", runId, partners);
  }

  private async replaceArchivePartners(archiveId: number, partners: FeasibilityReportingPartner[]): Promise<void> {
    await this.db.query(
      `DELETE FROM feasibility_reporting_archive_partners WHERE archive_id = ${this.db.placeholder(1)}`,
      [archiveId]
    );
    await this.insertPartners("feasibility_reporting_archive_partners", "archive_id", archiveId, partners);
  }

  private static readonly ALLOWED_PARTNER_TABLES = new Set([
    "feasibility_reporting_current_partners",
    "feasibility_reporting_archive_partners",
  ]);
  private static readonly ALLOWED_OWNER_COLUMNS = new Set(["run_id", "archive_id"]);

  private async insertPartners(
    tableName: "feasibility_reporting_current_partners" | "feasibility_reporting_archive_partners",
    ownerColumn: "run_id" | "archive_id",
    ownerId: number,
    partners: FeasibilityReportingPartner[]
  ): Promise<void> {
    if (!ReportingRepository.ALLOWED_PARTNER_TABLES.has(tableName)) {
      throw new Error(`Invalid table: ${tableName}`);
    }
    if (!ReportingRepository.ALLOWED_OWNER_COLUMNS.has(ownerColumn)) {
      throw new Error(`Invalid column: ${ownerColumn}`);
    }

    for (let index = 0; index < partners.length; index += 1) {
      const partner = partners[index];
      await this.db.query(
        `INSERT INTO ${tableName} (${ownerColumn}, partner_order, partner_name, share_pct, profit_share)
         VALUES (${this.db.placeholder(1)}, ${this.db.placeholder(2)}, ${this.db.placeholder(3)}, ${this.db.placeholder(4)}, ${this.db.placeholder(5)})`,
        [ownerId, index + 1, partner.name, partner.share, partner.profitShare]
      );
    }
  }

  private buildSnapshot(payload: NormalizedPayload, metrics: FeasibilityMetrics): SnapshotRecord {
    return {
      projectName: payload.projectName,
      input: payload.input,
      metrics,
    };
  }

  private extractPartners(metrics: FeasibilityMetrics): FeasibilityReportingPartner[] {
    const partners = "jvShares" in metrics ? metrics.jvShares : [];
    return partners.map((partner) => ({
      name: partner.name,
      share: partner.share,
      profitShare: partner.profitShare,
    }));
  }

  private snapshotValues(snapshot: SnapshotRecord): unknown[] {
    const { input, metrics, projectName } = snapshot;
    return [
      projectName,
      input.landArea,
      input.landCost,
      input.gfa,
      input.nsaResi,
      input.nsaRetail,
      input.buaResi,
      input.buaRetail,
      input.unitsResi,
      input.unitsRetail,
      input.resiPsf,
      input.retailPsf,
      input.ccPsf,
      input.softPct,
      input.statPct,
      input.contPct,
      input.devMgmtPct,
      input.cofPct,
      input.salesExpPct,
      input.mktPct,
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
      metrics.revenue.resi,
      metrics.revenue.retail,
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
      metrics.kpis.totalRevenue,
      metrics.kpis.totalCost,
      metrics.kpis.netProfit,
      metrics.kpis.marginPct,
      metrics.kpis.totalUnits,
    ];
  }
}
