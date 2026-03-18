import type {
  CfoCostAggregateRow,
  CfoMonthlyAmountRow,
  CfoProjectRow,
} from "./cfo-dashboard.repository.js";
import { CfoDashboardRepository } from "./cfo-dashboard.repository.js";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
];

const APPROVAL_SEQUENCE = ["Launch Memo", "BoD", "EXCOM", "Investment Committee"] as const;

interface DashboardBudget {
  revenue: number | null;
  landCost: number | null;
  hardCost: number | null;
  softCost: number | null;
  statutory: number | null;
  contingency: number | null;
  devMgmt: number | null;
  cof: number | null;
  salesExp: number | null;
  marketing: number | null;
  totalCost: number | null;
  profit: number | null;
  marginPct: number | null;
  units: number | null;
  nsaTotal: number | null;
  gfa: number | null;
}

interface DashboardActuals {
  revenue: number | null;
  landCost: number | null;
  hardCost: number | null;
  softCost: number | null;
  statutory: number | null;
  contingency: number | null;
  devMgmt: number | null;
  cof: number | null;
  salesExp: number | null;
  marketing: number | null;
  totalCost: number | null;
  salesUnits: number | null;
  collections: number | null;
}

interface DashboardMonthlyRow {
  m: string;
  bSales: number;
  aSales: number | null;
  fSales: number;
  bColl: number;
  aColl: number | null;
  fColl: number;
}

interface DashboardProject {
  name: string;
  date: string;
  approval: string;
  budget: DashboardBudget;
  actuals: DashboardActuals;
  forecast: DashboardBudget;
  monthly: DashboardMonthlyRow[];
}

interface DashboardProjectMeta {
  projectId: number;
  source: {
    feasibility: "live" | "missing";
    sales: "live" | "missing";
    collections: "live" | "missing";
    costs: "live" | "missing";
    metadata: "live" | "missing";
  };
  gaps: string[];
}

export interface CfoDashboardResponse {
  projects: Record<string, DashboardProject>;
  projectMeta: Record<string, DashboardProjectMeta>;
  generatedAt: string;
}

function slugifyProjectKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function formatDashboardDate(dateText: string | null): string {
  const date = dateText ? new Date(dateText) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "TBD";
  }

  const month = date.toLocaleDateString("en-US", { month: "short" });
  const year = date.toLocaleDateString("en-US", { year: "2-digit" });
  return `${month} '${year}`;
}

function sumAmount(rows: CfoMonthlyAmountRow[], field: keyof CfoMonthlyAmountRow): number | null {
  const values = rows
    .map((row) => row[field] as number | null)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (values.length === 0) return null;
  return round3(values.reduce((total, value) => total + value, 0) / 1_000_000);
}

function allNull(values: Array<number | null>): boolean {
  return values.every((value) => value === null);
}

function toNullableMillions(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return round3(value / 1_000_000);
}

function buildLiveMonthly(
  salesRows: CfoMonthlyAmountRow[],
  collectionRows: CfoMonthlyAmountRow[]
): DashboardMonthlyRow[] {
  const firstSalesYear = salesRows[0]?.year ?? null;
  const firstCollectionYear = collectionRows[0]?.year ?? null;

  const salesByMonth = new Map<number, CfoMonthlyAmountRow>(
    salesRows
      .filter((row) => row.year === firstSalesYear)
      .slice(0, 8)
      .map((row) => [row.month, row])
  );
  const collectionsByMonth = new Map<number, CfoMonthlyAmountRow>(
    collectionRows
      .filter((row) => row.year === firstCollectionYear)
      .slice(0, 8)
      .map((row) => [row.month, row])
  );

  return MONTH_NAMES.map((monthLabel, index) => {
    const monthNumber = index + 1;
    const sales = salesByMonth.get(monthNumber);
    const collections = collectionsByMonth.get(monthNumber);

    return {
      m: monthLabel,
      bSales: toNullableMillions(sales?.budgetAmount) ?? 0,
      aSales: toNullableMillions(sales?.actualAmount),
      fSales: toNullableMillions(sales?.projectedAmount) ?? 0,
      bColl: toNullableMillions(collections?.budgetAmount) ?? 0,
      aColl: toNullableMillions(collections?.actualAmount),
      fColl: toNullableMillions(collections?.projectedAmount) ?? 0,
    };
  });
}

export class CfoDashboardService {
  constructor(private readonly repository: CfoDashboardRepository) {}

  async getDashboard(): Promise<CfoDashboardResponse> {
    const [projects, collections, sales, costAggregates] = await Promise.all([
      this.repository.getProjects(),
      this.repository.getMonthlyCollections(),
      this.repository.getMonthlySales(),
      this.repository.getCostAggregates(),
    ]);

    const collectionsByProject = new Map<number, CfoMonthlyAmountRow[]>();
    const salesByProject = new Map<number, CfoMonthlyAmountRow[]>();
    const costsByProject = new Map<number, CfoCostAggregateRow[]>();

    for (const row of collections) {
      const bucket = collectionsByProject.get(row.projectId) ?? [];
      bucket.push(row);
      collectionsByProject.set(row.projectId, bucket);
    }

    for (const row of sales) {
      const bucket = salesByProject.get(row.projectId) ?? [];
      bucket.push(row);
      salesByProject.set(row.projectId, bucket);
    }

    for (const row of costAggregates) {
      const bucket = costsByProject.get(row.projectId) ?? [];
      bucket.push(row);
      costsByProject.set(row.projectId, bucket);
    }

    const response: CfoDashboardResponse = {
      projects: {},
      projectMeta: {},
      generatedAt: new Date().toISOString(),
    };

    for (const project of projects) {
      const key = slugifyProjectKey(project.projectName);
      const collectionRows = collectionsByProject.get(project.projectId) ?? [];
      const salesRows = salesByProject.get(project.projectId) ?? [];
      const costRows = costsByProject.get(project.projectId) ?? [];

      const budget: DashboardBudget = {
        revenue: project.budgetRevenue !== null ? round3(num(project.budgetRevenue)) : null,
        landCost: project.budgetLandCost !== null ? round3(num(project.budgetLandCost)) : null,
        hardCost: project.budgetHardCost !== null ? round3(num(project.budgetHardCost)) : null,
        softCost: project.budgetSoftCost !== null ? round3(num(project.budgetSoftCost)) : null,
        statutory: project.budgetStatutory !== null ? round3(num(project.budgetStatutory)) : null,
        contingency: project.budgetContingency !== null ? round3(num(project.budgetContingency)) : null,
        devMgmt: project.budgetDevMgmt !== null ? round3(num(project.budgetDevMgmt)) : null,
        cof: project.budgetCof !== null ? round3(num(project.budgetCof)) : null,
        salesExp: project.budgetSalesExp !== null ? round3(num(project.budgetSalesExp)) : null,
        marketing: project.budgetMarketing !== null ? round3(num(project.budgetMarketing)) : null,
        totalCost: project.budgetTotalCost !== null ? round3(num(project.budgetTotalCost)) : null,
        profit: project.budgetProfit !== null ? round3(num(project.budgetProfit)) : null,
        marginPct: project.budgetMarginPct !== null ? round3(num(project.budgetMarginPct)) : null,
        units: project.units !== null ? Math.round(num(project.units)) : null,
        nsaTotal: project.nsaTotal !== null ? round3(num(project.nsaTotal)) : null,
        gfa: project.gfa !== null ? round3(num(project.gfa)) : null,
      };

      const costActuals: Record<string, number | null> = {
        landCost: null,
        hardCost: null,
        softCost: null,
        statutory: null,
        contingency: null,
        devMgmt: null,
        cof: null,
        salesExp: null,
        marketing: null,
      };

      const costForecasts: Record<string, number | null> = {
        landCost: null,
        hardCost: null,
        softCost: null,
        statutory: null,
        contingency: null,
        devMgmt: null,
        cof: null,
        salesExp: null,
        marketing: null,
      };

      for (const row of costRows) {
        const actual = round3(num(row.actualAmount) / 1_000_000);
        const projected = round3(num(row.projectedAmount) / 1_000_000);
        switch (row.categoryCode) {
          case "hard_cost":
            costActuals.hardCost = actual;
            costForecasts.hardCost = projected;
            break;
          case "soft_cost":
            costActuals.softCost = actual;
            costForecasts.softCost = projected;
            break;
          case "statutory_cost":
            costActuals.statutory = actual;
            costForecasts.statutory = projected;
            break;
          case "contingency":
            costActuals.contingency = actual;
            costForecasts.contingency = projected;
            break;
          case "broker_cost":
          case "staff_discounts":
          case "dld_cost":
          case "sales_incentives":
            costActuals.salesExp = round3((costActuals.salesExp ?? 0) + actual);
            costForecasts.salesExp = round3((costForecasts.salesExp ?? 0) + projected);
            break;
          case "marketing":
            costActuals.marketing = actual;
            costForecasts.marketing = projected;
            break;
          default:
            break;
        }
      }

      const actualTotalCostValues = Object.values(costActuals).filter((value): value is number => value !== null);
      const projectedTotalCostValues = Object.values(costForecasts).filter((value): value is number => value !== null);

      const actuals: DashboardActuals = {
        revenue: sumAmount(salesRows, "actualAmount"),
        landCost: costActuals.landCost,
        hardCost: costActuals.hardCost,
        softCost: costActuals.softCost,
        statutory: costActuals.statutory,
        contingency: costActuals.contingency,
        devMgmt: costActuals.devMgmt,
        cof: costActuals.cof,
        salesExp: costActuals.salesExp,
        marketing: costActuals.marketing,
        totalCost: actualTotalCostValues.length > 0 ? round3(actualTotalCostValues.reduce((sum, value) => sum + value, 0)) : null,
        salesUnits: null,
        collections: sumAmount(collectionRows, "actualAmount"),
      };

      const forecastRevenue = sumAmount(salesRows, "projectedAmount");
      const forecastTotalCost = projectedTotalCostValues.length > 0
        ? round3(projectedTotalCostValues.reduce((sum, value) => sum + value, 0))
        : null;
      const forecastProfit = forecastRevenue !== null && forecastTotalCost !== null
        ? round3(forecastRevenue - forecastTotalCost)
        : null;
      const forecastMarginPct = forecastProfit !== null && forecastRevenue && forecastRevenue !== 0
        ? round3((forecastProfit / forecastRevenue) * 100)
        : null;

      const forecast: DashboardBudget = {
        revenue: forecastRevenue,
        landCost: costForecasts.landCost,
        hardCost: costForecasts.hardCost,
        softCost: costForecasts.softCost,
        statutory: costForecasts.statutory,
        contingency: costForecasts.contingency,
        devMgmt: costForecasts.devMgmt,
        cof: costForecasts.cof,
        salesExp: costForecasts.salesExp,
        marketing: costForecasts.marketing,
        totalCost: forecastTotalCost,
        profit: forecastProfit,
        marginPct: forecastMarginPct,
        units: budget.units,
        nsaTotal: budget.nsaTotal,
        gfa: budget.gfa,
      };

      const monthly = buildLiveMonthly(salesRows, collectionRows);

      const metadataIsLive = Boolean(project.frozenAt || project.runCreatedAt || project.projectCreatedAt);
      const gaps: string[] = [];
      if (!project.runId) gaps.push("No feasibility snapshot found for this project.");
      if (salesRows.length === 0) gaps.push("Sales tracking rows are missing; actual and forecast sales fields are blank.");
      gaps.push("Sales units sold are not stored in the database; sales velocity and average price per unit are unavailable.");
      if (collectionRows.length === 0) gaps.push("Collections rows are missing; collection trend fields are blank.");
      if (costRows.every((row) => num(row.actualAmount) === 0 && num(row.projectedAmount) === 0)) {
        gaps.push("Tracked monthly cost actuals/projected values are empty; cost actual and forecast fields are blank.");
      }
      gaps.push("Project approval metadata is not stored in Oracle; approval label is unavailable.");
      if (forecastRevenue === null) gaps.push("No separate forecast sales values exist in Oracle for this project.");
      if (forecastTotalCost === null) gaps.push("No separate forecast cost values exist in Oracle for this project.");

      const date = formatDashboardDate(project.frozenAt || project.runCreatedAt || project.projectCreatedAt);
      const approval = "N/A";

      response.projects[key] = {
        name: project.projectName,
        date,
        approval,
        budget,
        actuals,
        forecast,
        monthly,
      };

      response.projectMeta[key] = {
        projectId: project.projectId,
        source: {
          feasibility: project.runId ? "live" : "missing",
          sales: salesRows.length > 0 ? "live" : "missing",
          collections: collectionRows.length > 0 ? "live" : "missing",
          costs: costRows.length > 0 ? "live" : "missing",
          metadata: metadataIsLive ? "live" : "missing",
        },
        gaps,
      };
    }

    return response;
  }
}
