import { CostTrackingRepository } from "./cost-tracking.repository.js";
import { CollectionsRepository } from "../collections/revenue.repository.js";
import type { SalesRepository } from "../sales-tracking/sales.repository.js";
import type { ProjectActualsRepository } from "../project-actuals/project-actuals.repository.js";
import type {
  CostCategory,
  ProjectMonthlyCost,
  MonthlyCostRow,
  MonthlyCostEntry,
  CostSummaryItem,
  CostAnnualSummaryItem,
  SaveMonthlyCostPayload,
  TeamCode,
  BudgetVsActualRow,
  BudgetVsActualsResponse,
  BvaCostAggregate,
} from "../../shared/types/index.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export class CostTrackingService {
  constructor(
    private readonly repo: CostTrackingRepository,
    private readonly collectionsRepo?: CollectionsRepository,
    private readonly salesRepo?: SalesRepository,
    private readonly projectActualsRepo?: ProjectActualsRepository
  ) {}

  // ---- Categories ----

  async getCategories(team?: TeamCode): Promise<CostCategory[]> {
    return this.repo.getCategories(team);
  }

  // ---- Monthly Costs ----

  async getMonthlyCosts(projectId: number, year?: number, team?: TeamCode): Promise<MonthlyCostRow[]> {
    const costs = await this.repo.getMonthlyCosts(projectId, year, team);
    const categories = await this.getCategories(team);

    // Group by year + month
    const monthMap = new Map<string, MonthlyCostRow>();

    for (const cost of costs) {
      const key = `${cost.year}-${cost.month}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, {
          year: cost.year,
          month: cost.month,
          monthName: MONTH_NAMES[cost.month - 1],
          categories: [],
        });
      }

      const row = monthMap.get(key)!;
      row.categories.push({
        categoryId: cost.categoryId,
        categoryCode: cost.categoryCode ?? "",
        categoryName: cost.categoryName ?? "",
        actualAmount: cost.actualAmount,
        projectedAmount: cost.projectedAmount,
        budgetAmount: cost.budgetAmount,
        notes: cost.notes,
      });
    }

    // Ensure all 12 months exist for the requested year or for each year with saved data.
    const yearsToFill =
      typeof year === "number"
        ? [year]
        : Array.from(new Set(costs.map((cost) => cost.year))).sort((a, b) => a - b);

    for (const fillYear of yearsToFill) {
      for (let month = 1; month <= 12; month++) {
        const key = `${fillYear}-${month}`;
        if (!monthMap.has(key)) {
          monthMap.set(key, {
            year: fillYear,
            month,
            monthName: MONTH_NAMES[month - 1],
            categories: categories.map(c => ({
              categoryId: c.id,
              categoryCode: c.code,
              categoryName: c.name,
              actualAmount: null,
              projectedAmount: 0,
              budgetAmount: null,
              notes: null,
            })),
          });
        }
      }
    }

    for (const row of monthMap.values()) {
      const existingByCategory = new Map(row.categories.map((entry) => [entry.categoryId, entry]));
      row.categories = categories.map((category) => {
        const existing = existingByCategory.get(category.id);
        if (existing) {
          return existing;
        }

        return {
          categoryId: category.id,
          categoryCode: category.code,
          categoryName: category.name,
          actualAmount: null,
          projectedAmount: 0,
          budgetAmount: null,
          notes: null,
        };
      });
    }

    return Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }

  async getMonthlyCostsForAllProjects(year: number): Promise<ProjectMonthlyCost[]> {
    return this.repo.getMonthlyCostsForAllProjects(year);
  }

  async saveMonthlyCost(payload: SaveMonthlyCostPayload): Promise<ProjectMonthlyCost> {
    return this.repo.saveMonthlyCost(payload);
  }

  async bulkSaveMonthlyCosts(
    payloads: SaveMonthlyCostPayload[]
  ): Promise<ProjectMonthlyCost[]> {
    return this.repo.bulkSaveMonthlyCosts(payloads);
  }

  async deleteMonthlyCost(
    projectId: number,
    categoryId: number,
    year: number,
    month: number
  ): Promise<boolean> {
    return this.repo.deleteMonthlyCost(projectId, categoryId, year, month);
  }

  // ---- Summaries ----

  async getCostSummary(projectId: number, year?: number): Promise<CostSummaryItem[]> {
    return this.repo.getCostSummary(projectId, year);
  }

  async getAnnualSummary(projectId: number, year?: number): Promise<CostAnnualSummaryItem[]> {
    return this.repo.getAnnualSummary(projectId, year);
  }

  // ---- Initialization ----

  async initializeYear(
    projectId: number,
    year: number,
    defaultProjectedAmount: number = 0,
    createdBy?: string,
    team?: TeamCode
  ): Promise<ProjectMonthlyCost[]> {
    return this.repo.initializeYear(projectId, year, defaultProjectedAmount, createdBy, team);
  }

  // ---- Copy from previous year ----

  async copyFromPreviousYear(
    projectId: number,
    sourceYear: number,
    targetYear: number,
    createdBy?: string
  ): Promise<ProjectMonthlyCost[]> {
    const sourceCosts = await this.repo.getMonthlyCosts(projectId, sourceYear);

    const payloads: SaveMonthlyCostPayload[] = sourceCosts.map(cost => ({
      projectId,
      categoryId: cost.categoryId,
      year: targetYear,
      month: cost.month,
      actualAmount: null, // Reset actuals for new year
      projectedAmount: cost.projectedAmount,
      budgetAmount: cost.budgetAmount,
      notes: `Copied from ${sourceYear}`,
      createdBy,
    }));

    return this.repo.bulkSaveMonthlyCosts(payloads);
  }

  // ---- Clear Data ----

  async clearProjectData(projectId: number, team?: TeamCode): Promise<number> {
    if (team === "collections") {
      return this.collectionsRepo
        ? this.collectionsRepo.clearProjectCollections(projectId)
        : 0;
    }

    return this.repo.clearProjectData(projectId, team);
  }

  // ---- Budget vs Actuals ----

  async getBudgetVsActuals(projectId: number): Promise<BudgetVsActualsResponse> {
    // Run cost, revenue, and sales aggregation in parallel
    // Sales table may not exist yet (migration pending), so catch gracefully
    const safeSalesAggregate = this.salesRepo
      ? this.salesRepo.getBvaSalesAggregate(projectId).catch(() => null)
      : Promise.resolve(null);

    const [costAggregates, revenueAggregate, salesAggregate, projectActuals] = await Promise.all([
      this.repo.getBvaCostAggregates(projectId),
      this.collectionsRepo?.getBvaRevenueAggregate(projectId) ?? null,
      safeSalesAggregate,
      this.projectActualsRepo?.findByProject(projectId) ?? [],
    ]);

    // Build a lookup of project-level actuals (e.g. Land)
    const actualsMap = new Map(projectActuals.map((a) => [a.lineItem, a.actualAmount]));

    const rows: BudgetVsActualRow[] = [];

    // Build team activity from the same aggregated data — no extra DB call
    const teamActivity: Record<string, string | null> = {
      commercial: null,
      sales: null,
      marketing: null,
      collections: null,
      "sales-tracking": null,
    };

    // Cost rows — already aggregated by category in SQL
    for (const agg of costAggregates) {
      const variance = agg.budget - agg.blended;
      const variancePct = agg.budget !== 0 ? (variance / agg.budget) * 100 : 0;

      rows.push({
        lineItem: agg.categoryName,
        type: "cost",
        team: agg.team,
        budget: agg.budget,
        actual: agg.actual,
        projected: agg.projected,
        blended: agg.blended,
        variance,
        variancePct,
      });

      // Track latest activity per team
      if (agg.lastActivity) {
        const current = teamActivity[agg.team];
        if (!current || agg.lastActivity > current) {
          teamActivity[agg.team] = agg.lastActivity;
        }
      }
    }

    // Sales performance row (TSV actual vs projected)
    if (salesAggregate) {
      const salesVariance = salesAggregate.blended - salesAggregate.budget;
      const salesVariancePct = salesAggregate.budget !== 0
        ? (salesVariance / salesAggregate.budget) * 100
        : 0;

      rows.push({
        lineItem: "Sales Performance (TSV)",
        type: "sales",
        team: "sales-tracking",
        budget: salesAggregate.budget,
        actual: salesAggregate.actual,
        projected: salesAggregate.projected,
        blended: salesAggregate.blended,
        variance: salesVariance,
        variancePct: salesVariancePct,
      });

      teamActivity["sales-tracking"] = salesAggregate.lastActivity;
    }

    // Collections row
    if (revenueAggregate) {
      const revVariance = revenueAggregate.blended - revenueAggregate.budget;
      const revVariancePct = revenueAggregate.budget !== 0
        ? (revVariance / revenueAggregate.budget) * 100
        : 0;

      rows.push({
        lineItem: "Collections",
        type: "revenue",
        team: "collections",
        budget: revenueAggregate.budget,
        actual: revenueAggregate.actual,
        projected: revenueAggregate.projected,
        blended: revenueAggregate.blended,
        variance: revVariance,
        variancePct: revVariancePct,
      });

      teamActivity.collections = revenueAggregate.lastActivity;
    }

    // Inject project-level actuals (e.g. Land) as tracked rows
    // so the frontend can merge them with feasibility budget values
    for (const [lineItem, actualAmount] of actualsMap) {
      const existing = rows.find((r) => r.lineItem === lineItem);
      if (existing) {
        existing.actual = actualAmount;
        existing.blended = actualAmount;
      } else {
        rows.push({
          lineItem,
          type: "cost",
          team: "revenue",
          budget: 0,
          actual: actualAmount,
          projected: 0,
          blended: actualAmount,
          variance: -actualAmount,
          variancePct: 0,
        });
      }
    }

    return { rows, teamActivity };
  }
}
