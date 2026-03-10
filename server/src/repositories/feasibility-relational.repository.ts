import type { BaseAdapter } from "../db/adapters/base.adapter.js";
import type {
  ArchivedRun,
  FeasibilityMetrics,
  FeasibilityRun,
  NormalizedPayload,
  Partner,
} from "../types/index.js";

interface RunSnapshot {
  payload: NormalizedPayload;
  metrics: FeasibilityMetrics;
}

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

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
      await this.syncRun(run);
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
      await this.syncArchive(archive);
    }
  }

  async syncRun(run: FeasibilityRun): Promise<void> {
    const snapshot = this.buildSnapshot(run.payload, run.metrics);

    await this.db.query(
      `INSERT INTO feasibility_run_inputs (
         run_id, project_name, land_area, land_cost, land_psf, gfa, nsa_resi, nsa_retail,
         bua_resi, bua_retail, units_resi, units_retail, resi_psf, retail_psf, car_park_income,
         cof_on_sales_pct, cc_psf, soft_pct, stat_pct, cont_pct, dev_mgmt_pct, cof_pct,
         sales_exp_pct, mkt_pct
       ) VALUES (
         ${this.db.placeholder(1)}, ${this.paramList(2, 24)}
       )
       ON CONFLICT (run_id) DO UPDATE SET
         project_name = EXCLUDED.project_name,
         land_area = EXCLUDED.land_area,
         land_cost = EXCLUDED.land_cost,
         land_psf = EXCLUDED.land_psf,
         gfa = EXCLUDED.gfa,
         nsa_resi = EXCLUDED.nsa_resi,
         nsa_retail = EXCLUDED.nsa_retail,
         bua_resi = EXCLUDED.bua_resi,
         bua_retail = EXCLUDED.bua_retail,
         units_resi = EXCLUDED.units_resi,
         units_retail = EXCLUDED.units_retail,
         resi_psf = EXCLUDED.resi_psf,
         retail_psf = EXCLUDED.retail_psf,
         car_park_income = EXCLUDED.car_park_income,
         cof_on_sales_pct = EXCLUDED.cof_on_sales_pct,
         cc_psf = EXCLUDED.cc_psf,
         soft_pct = EXCLUDED.soft_pct,
         stat_pct = EXCLUDED.stat_pct,
         cont_pct = EXCLUDED.cont_pct,
         dev_mgmt_pct = EXCLUDED.dev_mgmt_pct,
         cof_pct = EXCLUDED.cof_pct,
         sales_exp_pct = EXCLUDED.sales_exp_pct,
         mkt_pct = EXCLUDED.mkt_pct`,
      [run.id, ...this.inputValues(snapshot.payload)]
    );

    await this.db.query(
      `INSERT INTO feasibility_run_metrics (
         run_id, area_land_area, area_gfa, area_nsa_resi, area_nsa_retail, area_nsa_total,
         area_bua_resi, area_bua_retail, area_bua_total, area_units_resi, area_units_retail,
         area_units_total, area_efficiency_pct, revenue_gross_resi, revenue_cof_on_sales,
         revenue_net_resi, revenue_retail, revenue_car_park_income, revenue_total_inflows,
         revenue_resi, revenue_total, cost_land_resi, cost_land_retail, cost_land,
         cost_cc_resi, cost_cc_retail, cost_construction, cost_soft_resi, cost_soft_retail,
         cost_soft, cost_stat_resi, cost_stat_retail, cost_statutory, cost_cont_resi,
         cost_cont_retail, cost_contingency, cost_dev_resi, cost_dev_retail, cost_dev_mgmt,
         cost_cof_resi, cost_cof_retail, cost_cof, cost_se_resi, cost_se_retail,
         cost_sales_expense, cost_mk_resi, cost_mk_retail, cost_marketing, cost_resi,
         cost_retail, cost_total, profit_np_resi, profit_np_retail, profit_net_profit,
         profit_margin_resi, profit_margin_retail, profit_margin_pct, profit_cash_profit,
         profit_cash_margin_pct, kpi_total_revenue, kpi_total_cost, kpi_net_profit,
         kpi_margin_pct, kpi_total_units
       ) VALUES (
         ${this.db.placeholder(1)}, ${this.paramList(2, 64)}
       )
       ON CONFLICT (run_id) DO UPDATE SET
         area_land_area = EXCLUDED.area_land_area,
         area_gfa = EXCLUDED.area_gfa,
         area_nsa_resi = EXCLUDED.area_nsa_resi,
         area_nsa_retail = EXCLUDED.area_nsa_retail,
         area_nsa_total = EXCLUDED.area_nsa_total,
         area_bua_resi = EXCLUDED.area_bua_resi,
         area_bua_retail = EXCLUDED.area_bua_retail,
         area_bua_total = EXCLUDED.area_bua_total,
         area_units_resi = EXCLUDED.area_units_resi,
         area_units_retail = EXCLUDED.area_units_retail,
         area_units_total = EXCLUDED.area_units_total,
         area_efficiency_pct = EXCLUDED.area_efficiency_pct,
         revenue_gross_resi = EXCLUDED.revenue_gross_resi,
         revenue_cof_on_sales = EXCLUDED.revenue_cof_on_sales,
         revenue_net_resi = EXCLUDED.revenue_net_resi,
         revenue_retail = EXCLUDED.revenue_retail,
         revenue_car_park_income = EXCLUDED.revenue_car_park_income,
         revenue_total_inflows = EXCLUDED.revenue_total_inflows,
         revenue_resi = EXCLUDED.revenue_resi,
         revenue_total = EXCLUDED.revenue_total,
         cost_land_resi = EXCLUDED.cost_land_resi,
         cost_land_retail = EXCLUDED.cost_land_retail,
         cost_land = EXCLUDED.cost_land,
         cost_cc_resi = EXCLUDED.cost_cc_resi,
         cost_cc_retail = EXCLUDED.cost_cc_retail,
         cost_construction = EXCLUDED.cost_construction,
         cost_soft_resi = EXCLUDED.cost_soft_resi,
         cost_soft_retail = EXCLUDED.cost_soft_retail,
         cost_soft = EXCLUDED.cost_soft,
         cost_stat_resi = EXCLUDED.cost_stat_resi,
         cost_stat_retail = EXCLUDED.cost_stat_retail,
         cost_statutory = EXCLUDED.cost_statutory,
         cost_cont_resi = EXCLUDED.cost_cont_resi,
         cost_cont_retail = EXCLUDED.cost_cont_retail,
         cost_contingency = EXCLUDED.cost_contingency,
         cost_dev_resi = EXCLUDED.cost_dev_resi,
         cost_dev_retail = EXCLUDED.cost_dev_retail,
         cost_dev_mgmt = EXCLUDED.cost_dev_mgmt,
         cost_cof_resi = EXCLUDED.cost_cof_resi,
         cost_cof_retail = EXCLUDED.cost_cof_retail,
         cost_cof = EXCLUDED.cost_cof,
         cost_se_resi = EXCLUDED.cost_se_resi,
         cost_se_retail = EXCLUDED.cost_se_retail,
         cost_sales_expense = EXCLUDED.cost_sales_expense,
         cost_mk_resi = EXCLUDED.cost_mk_resi,
         cost_mk_retail = EXCLUDED.cost_mk_retail,
         cost_marketing = EXCLUDED.cost_marketing,
         cost_resi = EXCLUDED.cost_resi,
         cost_retail = EXCLUDED.cost_retail,
         cost_total = EXCLUDED.cost_total,
         profit_np_resi = EXCLUDED.profit_np_resi,
         profit_np_retail = EXCLUDED.profit_np_retail,
         profit_net_profit = EXCLUDED.profit_net_profit,
         profit_margin_resi = EXCLUDED.profit_margin_resi,
         profit_margin_retail = EXCLUDED.profit_margin_retail,
         profit_margin_pct = EXCLUDED.profit_margin_pct,
         profit_cash_profit = EXCLUDED.profit_cash_profit,
         profit_cash_margin_pct = EXCLUDED.profit_cash_margin_pct,
         kpi_total_revenue = EXCLUDED.kpi_total_revenue,
         kpi_total_cost = EXCLUDED.kpi_total_cost,
         kpi_net_profit = EXCLUDED.kpi_net_profit,
         kpi_margin_pct = EXCLUDED.kpi_margin_pct,
         kpi_total_units = EXCLUDED.kpi_total_units`,
      [run.id, ...this.metricValues(snapshot.metrics)]
    );

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

    await this.db.query(
      `INSERT INTO feasibility_archive_inputs (
         archive_id, original_run_id, project_name, land_area, land_cost, land_psf, gfa, nsa_resi,
         nsa_retail, bua_resi, bua_retail, units_resi, units_retail, resi_psf, retail_psf,
         car_park_income, cof_on_sales_pct, cc_psf, soft_pct, stat_pct, cont_pct, dev_mgmt_pct,
         cof_pct, sales_exp_pct, mkt_pct
       ) VALUES (
         ${this.db.placeholder(1)}, ${this.db.placeholder(2)}, ${this.paramList(3, 25)}
       )
       ON CONFLICT (archive_id) DO UPDATE SET
         original_run_id = EXCLUDED.original_run_id,
         project_name = EXCLUDED.project_name,
         land_area = EXCLUDED.land_area,
         land_cost = EXCLUDED.land_cost,
         land_psf = EXCLUDED.land_psf,
         gfa = EXCLUDED.gfa,
         nsa_resi = EXCLUDED.nsa_resi,
         nsa_retail = EXCLUDED.nsa_retail,
         bua_resi = EXCLUDED.bua_resi,
         bua_retail = EXCLUDED.bua_retail,
         units_resi = EXCLUDED.units_resi,
         units_retail = EXCLUDED.units_retail,
         resi_psf = EXCLUDED.resi_psf,
         retail_psf = EXCLUDED.retail_psf,
         car_park_income = EXCLUDED.car_park_income,
         cof_on_sales_pct = EXCLUDED.cof_on_sales_pct,
         cc_psf = EXCLUDED.cc_psf,
         soft_pct = EXCLUDED.soft_pct,
         stat_pct = EXCLUDED.stat_pct,
         cont_pct = EXCLUDED.cont_pct,
         dev_mgmt_pct = EXCLUDED.dev_mgmt_pct,
         cof_pct = EXCLUDED.cof_pct,
         sales_exp_pct = EXCLUDED.sales_exp_pct,
         mkt_pct = EXCLUDED.mkt_pct`,
      [archive.id, archive.originalRunId, ...this.inputValues(snapshot.payload)]
    );

    await this.db.query(
      `INSERT INTO feasibility_archive_metrics (
         archive_id, area_land_area, area_gfa, area_nsa_resi, area_nsa_retail, area_nsa_total,
         area_bua_resi, area_bua_retail, area_bua_total, area_units_resi, area_units_retail,
         area_units_total, area_efficiency_pct, revenue_gross_resi, revenue_cof_on_sales,
         revenue_net_resi, revenue_retail, revenue_car_park_income, revenue_total_inflows,
         revenue_resi, revenue_total, cost_land_resi, cost_land_retail, cost_land,
         cost_cc_resi, cost_cc_retail, cost_construction, cost_soft_resi, cost_soft_retail,
         cost_soft, cost_stat_resi, cost_stat_retail, cost_statutory, cost_cont_resi,
         cost_cont_retail, cost_contingency, cost_dev_resi, cost_dev_retail, cost_dev_mgmt,
         cost_cof_resi, cost_cof_retail, cost_cof, cost_se_resi, cost_se_retail,
         cost_sales_expense, cost_mk_resi, cost_mk_retail, cost_marketing, cost_resi,
         cost_retail, cost_total, profit_np_resi, profit_np_retail, profit_net_profit,
         profit_margin_resi, profit_margin_retail, profit_margin_pct, profit_cash_profit,
         profit_cash_margin_pct, kpi_total_revenue, kpi_total_cost, kpi_net_profit,
         kpi_margin_pct, kpi_total_units
       ) VALUES (
         ${this.db.placeholder(1)}, ${this.paramList(2, 64)}
       )
       ON CONFLICT (archive_id) DO UPDATE SET
         area_land_area = EXCLUDED.area_land_area,
         area_gfa = EXCLUDED.area_gfa,
         area_nsa_resi = EXCLUDED.area_nsa_resi,
         area_nsa_retail = EXCLUDED.area_nsa_retail,
         area_nsa_total = EXCLUDED.area_nsa_total,
         area_bua_resi = EXCLUDED.area_bua_resi,
         area_bua_retail = EXCLUDED.area_bua_retail,
         area_bua_total = EXCLUDED.area_bua_total,
         area_units_resi = EXCLUDED.area_units_resi,
         area_units_retail = EXCLUDED.area_units_retail,
         area_units_total = EXCLUDED.area_units_total,
         area_efficiency_pct = EXCLUDED.area_efficiency_pct,
         revenue_gross_resi = EXCLUDED.revenue_gross_resi,
         revenue_cof_on_sales = EXCLUDED.revenue_cof_on_sales,
         revenue_net_resi = EXCLUDED.revenue_net_resi,
         revenue_retail = EXCLUDED.revenue_retail,
         revenue_car_park_income = EXCLUDED.revenue_car_park_income,
         revenue_total_inflows = EXCLUDED.revenue_total_inflows,
         revenue_resi = EXCLUDED.revenue_resi,
         revenue_total = EXCLUDED.revenue_total,
         cost_land_resi = EXCLUDED.cost_land_resi,
         cost_land_retail = EXCLUDED.cost_land_retail,
         cost_land = EXCLUDED.cost_land,
         cost_cc_resi = EXCLUDED.cost_cc_resi,
         cost_cc_retail = EXCLUDED.cost_cc_retail,
         cost_construction = EXCLUDED.cost_construction,
         cost_soft_resi = EXCLUDED.cost_soft_resi,
         cost_soft_retail = EXCLUDED.cost_soft_retail,
         cost_soft = EXCLUDED.cost_soft,
         cost_stat_resi = EXCLUDED.cost_stat_resi,
         cost_stat_retail = EXCLUDED.cost_stat_retail,
         cost_statutory = EXCLUDED.cost_statutory,
         cost_cont_resi = EXCLUDED.cost_cont_resi,
         cost_cont_retail = EXCLUDED.cost_cont_retail,
         cost_contingency = EXCLUDED.cost_contingency,
         cost_dev_resi = EXCLUDED.cost_dev_resi,
         cost_dev_retail = EXCLUDED.cost_dev_retail,
         cost_dev_mgmt = EXCLUDED.cost_dev_mgmt,
         cost_cof_resi = EXCLUDED.cost_cof_resi,
         cost_cof_retail = EXCLUDED.cost_cof_retail,
         cost_cof = EXCLUDED.cost_cof,
         cost_se_resi = EXCLUDED.cost_se_resi,
         cost_se_retail = EXCLUDED.cost_se_retail,
         cost_sales_expense = EXCLUDED.cost_sales_expense,
         cost_mk_resi = EXCLUDED.cost_mk_resi,
         cost_mk_retail = EXCLUDED.cost_mk_retail,
         cost_marketing = EXCLUDED.cost_marketing,
         cost_resi = EXCLUDED.cost_resi,
         cost_retail = EXCLUDED.cost_retail,
         cost_total = EXCLUDED.cost_total,
         profit_np_resi = EXCLUDED.profit_np_resi,
         profit_np_retail = EXCLUDED.profit_np_retail,
         profit_net_profit = EXCLUDED.profit_net_profit,
         profit_margin_resi = EXCLUDED.profit_margin_resi,
         profit_margin_retail = EXCLUDED.profit_margin_retail,
         profit_margin_pct = EXCLUDED.profit_margin_pct,
         profit_cash_profit = EXCLUDED.profit_cash_profit,
         profit_cash_margin_pct = EXCLUDED.profit_cash_margin_pct,
         kpi_total_revenue = EXCLUDED.kpi_total_revenue,
         kpi_total_cost = EXCLUDED.kpi_total_cost,
         kpi_net_profit = EXCLUDED.kpi_net_profit,
         kpi_margin_pct = EXCLUDED.kpi_margin_pct,
         kpi_total_units = EXCLUDED.kpi_total_units`,
      [archive.id, ...this.metricValues(snapshot.metrics)]
    );

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

  private async insertPartners(
    tableName: "feasibility_run_partners" | "feasibility_archive_partners",
    ownerColumn: "run_id" | "archive_id",
    ownerId: number,
    partners: Partner[],
    metrics: FeasibilityMetrics
  ): Promise<void> {
    const profitShareByName = new Map(
      (metrics.jvShares ?? []).map((partner) => [partner.name, partner.profitShare])
    );

    for (let index = 0; index < partners.length; index += 1) {
      const partner = partners[index];
      await this.db.query(
        `INSERT INTO ${tableName} (${ownerColumn}, partner_order, partner_name, share_pct, profit_share)
         VALUES (${this.db.placeholder(1)}, ${this.db.placeholder(2)}, ${this.db.placeholder(3)}, ${this.db.placeholder(4)}, ${this.db.placeholder(5)})`,
        [
          ownerId,
          index + 1,
          partner.name,
          partner.share,
          profitShareByName.get(partner.name) ?? 0,
        ]
      );
    }
  }

  private buildSnapshot(payload: NormalizedPayload, metrics: FeasibilityMetrics): RunSnapshot {
    return {
      payload: {
        projectName: payload?.projectName ?? "",
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

  private paramList(start: number, end: number): string {
    return Array.from({ length: end - start + 1 }, (_, index) => this.db.placeholder(start + index)).join(", ");
  }
}
