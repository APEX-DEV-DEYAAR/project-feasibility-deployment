import { CostTrackingRepository } from "../repositories/cost-tracking.repository.js";
import { CollectionsRepository } from "../repositories/revenue.repository.js";
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
} from "../types/index.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export class CostTrackingService {
  constructor(
    private readonly repo: CostTrackingRepository,
    private readonly collectionsRepo?: CollectionsRepository
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

  async getBudgetVsActuals(projectId: number, year: number): Promise<BudgetVsActualsResponse> {
    const costs = await this.repo.getMonthlyCosts(projectId, year);
    const categories = await this.repo.getCategories();

    const rows: BudgetVsActualRow[] = [];

    // Group costs by category
    // Blended = per month: use actual if present, else projected
    for (const cat of categories) {
      const catCosts = costs.filter(c => c.categoryId === cat.id);
      const budget = catCosts.reduce((s, c) => s + (c.budgetAmount ?? 0), 0);
      const actual = catCosts.reduce((s, c) => s + (c.actualAmount ?? 0), 0);
      const projected = catCosts.reduce((s, c) => s + (c.projectedAmount ?? 0), 0);
      const blended = catCosts.reduce((s, c) => {
        return s + (c.actualAmount != null && c.actualAmount !== 0
          ? c.actualAmount
          : (c.projectedAmount ?? 0));
      }, 0);
      const variance = budget - blended;
      const variancePct = budget !== 0 ? (variance / budget) * 100 : 0;

      rows.push({
        lineItem: cat.name,
        type: "cost",
        team: cat.team,
        budget,
        actual,
        projected,
        blended,
        variance,
        variancePct,
      });
    }

    // Collections team
    if (this.collectionsRepo) {
      const collectionsData = await this.collectionsRepo.getMonthlyCollections(projectId, year);
      const revBudget = collectionsData.reduce((s, r) => s + (r.budgetAmount ?? 0), 0);
      const revActual = collectionsData.reduce((s, r) => s + (r.actualAmount ?? 0), 0);
      const revProjected = collectionsData.reduce((s, r) => s + (r.projectedAmount ?? 0), 0);
      const revBlended = collectionsData.reduce((s, r) => {
        return s + (r.actualAmount != null && r.actualAmount !== 0
          ? r.actualAmount
          : (r.projectedAmount ?? 0));
      }, 0);
      const revVariance = revBlended - revBudget; // Collections: blended > budget = good
      const revVariancePct = revBudget !== 0 ? (revVariance / revBudget) * 100 : 0;

      rows.push({
        lineItem: "Gross Residential Sales",
        type: "revenue",
        team: "collections",
        budget: revBudget,
        actual: revActual,
        projected: revProjected,
        blended: revBlended,
        variance: revVariance,
        variancePct: revVariancePct,
      });
    }

    // Fetch team last activity timestamps
    const teamActivity = await this.repo.getTeamLastActivity(projectId, year);

    return { rows, teamActivity };
  }
}
