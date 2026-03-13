// ---------- Auth ----------

export type UserRole = "admin" | "sales" | "collections" | "commercial" | "finance" | "marketing" | "cfo";

export interface AuthUser {
  userId: number;
  username: string;
  role: UserRole;
}

export interface LoginResponse {
  user: AuthUser;
}

// ---------- Client-side Model (form state, string values) ----------

export interface ClientInputModel {
  [key: string]: string;
}

export interface ClientPartner {
  name: string;
  share: string;
}

export interface ClientModel {
  runId: number | null;
  projectId: number | null;
  projectName: string;
  input: ClientInputModel;
  partners: ClientPartner[];
  version: number | null;
  status: FeasibilityStatus;
}

// ---------- API Response Types ----------

export type FeasibilityStatus = "draft" | "frozen";

export interface ProjectSummary {
  id: number;
  name: string;
  latestVersion: number | null;
  status: FeasibilityStatus | null;
  hasFeasibility: boolean;
  updatedAt: string;
  metrics?: FeasibilityMetrics; // Optional metrics for CFO dashboard
}

export interface Project {
  id: number;
  name: string;
  createdAt: string;
}

export interface FeasibilityRun {
  id: number;
  projectId: number;
  version: number | null;
  status: FeasibilityStatus;
  payload: {
    projectName: string;
    input: Record<string, number | null>;
    partners: { name: string; share: number | null }[];
  };
  metrics: FeasibilityMetrics;
  createdAt: string;
  updatedAt: string;
  frozenAt: string | null;
}

export interface ArchivedRun {
  id: number;
  originalRunId: number;
  projectId: number;
  version: number;
  payload: {
    projectName: string;
    input: Record<string, number | null>;
    partners: { name: string; share: number | null }[];
  };
  metrics: FeasibilityMetrics;
  frozenAt: string | null;
  archivedAt: string;
}

// ---------- Metrics (computed from model) ----------

export interface AreaMetrics {
  landArea: number;
  gfa: number;
  nsaResi: number;
  nsaRetail: number;
  nsaTotal: number;
  buaResi: number;
  buaRetail: number;
  buaTotal: number;
  unitsResi: number;
  unitsRetail: number;
  unitsTotal: number;
  efficiencyPct: number;
}

export interface RevenueMetrics {
  grossResi: number;
  cofOnSales: number;
  netResi: number;
  retail: number;
  carParkIncome: number;
  totalInflows: number;
  resi: number;
  total: number;
}

export interface CostMetrics {
  landResi: number;
  landRetail: number;
  land: number;
  ccResi: number;
  ccRetail: number;
  construction: number;
  softResi: number;
  softRetail: number;
  soft: number;
  statResi: number;
  statRetail: number;
  statutory: number;
  contResi: number;
  contRetail: number;
  contingency: number;
  devResi: number;
  devRetail: number;
  devMgmt: number;
  cofResi: number;
  cofRetail: number;
  cof: number;
  seResi: number;
  seRetail: number;
  salesExpense: number;
  mkResi: number;
  mkRetail: number;
  marketing: number;
  costResi: number;
  costRetail: number;
  total: number;
}

export interface ProfitabilityMetrics {
  npResi: number;
  npRetail: number;
  netProfit: number;
  marginResi: number;
  marginRetail: number;
  marginPct: number;
  cashProfit: number;
  cashMarginPct: number;
}

export interface PartnerProfit {
  name: string;
  share: number;
  profitShare: number;
}

export interface KpiMetrics {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  marginPct: number;
  totalUnits: number;
}

export interface FeasibilityMetrics {
  area: AreaMetrics;
  revenue: RevenueMetrics;
  costs: CostMetrics;
  profitability: ProfitabilityMetrics;
  partnerProfit: PartnerProfit[];
  kpis: KpiMetrics;
}

export interface FieldDef {
  key: string;
  label: string;
  prefix?: string;
  suffix?: string;
}

export interface FieldGroup {
  title: string;
  icon: string;
  fields: FieldDef[];
}

// ---------- Cost Tracking ----------

export type TeamCode = "commercial" | "sales" | "marketing" | "collections";

export interface CostCategory {
  id: number;
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  team: TeamCode;
}

export interface ProjectMonthlyCost {
  id: number;
  projectId: number;
  categoryId: number;
  year: number;
  month: number;
  actualAmount: number | null;
  projectedAmount: number | null;
  budgetAmount: number | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  categoryName?: string;
  categoryCode?: string;
  projectName?: string;
}

export interface MonthlyCostEntry {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  actualAmount: number | null;
  projectedAmount: number | null;
  budgetAmount: number | null;
  notes: string | null;
}

export interface MonthlyCostRow {
  year: number;
  month: number;
  monthName: string;
  categories: MonthlyCostEntry[];
}

export interface CostSummaryItem {
  projectId: number;
  projectName: string;
  year: number;
  month: number;
  totalActual: number | null;
  totalProjected: number;
  totalBudget: number | null;
  blendedTotal: number;
  categoriesWithActual: number;
  totalCategories: number;
}

export interface CostAnnualSummaryItem {
  projectId: number;
  projectName: string;
  year: number;
  categoryCode: string;
  categoryName: string;
  categoryTeam: TeamCode;
  annualActual: number | null;
  annualProjected: number;
  annualBudget: number | null;
  ytdActual: number | null;
  ytdProjected: number;
  monthsWithActual: number;
}

export interface SaveMonthlyCostPayload {
  projectId: number;
  categoryId: number;
  year: number;
  month: number;
  actualAmount?: number | null;
  projectedAmount?: number | null;
  budgetAmount?: number | null;
  notes?: string;
  createdBy?: string;
}

// ---------- Collections Tracking ----------

export interface MonthlyCollectionsRow {
  year: number;
  month: number;
  monthName: string;
  budgetAmount: number | null;
  actualAmount: number | null;
  projectedAmount: number | null;
  notes: string | null;
}

export interface SaveMonthlyCollectionsPayload {
  projectId: number;
  year: number;
  month: number;
  budgetAmount?: number | null;
  actualAmount?: number | null;
  projectedAmount?: number | null;
  notes?: string;
  createdBy?: string;
}

// ---------- Budget vs Actuals ----------

export interface BudgetVsActualRow {
  lineItem: string;
  type: "cost" | "revenue";
  team: TeamCode | "revenue";
  budget: number;
  actual: number;
  projected: number;
  blended: number;
  variance: number;
  variancePct: number;
}

export interface BudgetVsActualsResponse {
  rows: BudgetVsActualRow[];
  teamActivity: Record<string, string | null>;
}

// ---------- Collections Forecast ----------

export type CollectionsInstallmentStatus =
  | "forecast"
  | "partially_collected"
  | "collected"
  | "overdue";

export interface CollectionsInstallment {
  id: number;
  projectId: number;
  customerName: string;
  unitRef: string;
  buildingName: string | null;
  locationCode: string | null;
  installmentLabel: string;
  dueDate: string;
  forecastAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  collectionDate: string | null;
  status: CollectionsInstallmentStatus;
  probabilityPct: number;
  riskCategory: string | null;
  exposureBucket: string | null;
  expectedForfeiture: string | null;
  unitForecast: string | null;
  overDuePct: number | null;
  installmentsOverDue: number | null;
  sourceStatus: string | null;
  paymentPlanName: string | null;
  propertyType: string | null;
  spaSignedDate: string | null;
  spaSignStatus: string | null;
  tsvAmount: number | null;
  totalCleared: number | null;
  waivedAmount: number | null;
  totalOverDue: number | null;
  clearedPct: number | null;
  paidPct: number | null;
  isUnitOverDue: string | null;
  installmentsOverDueBucket: string | null;
  overDuePctBucket: string | null;
  registeredSaleType: string | null;
  latestConstructionProgress: number | null;
  canClaimTotal: number | null;
  canClaimAdditional: number | null;
  eligibleForDldTermination: string | null;
  projectCompletionDate: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionsForecastSummary {
  totalForecast: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueOutstanding: number;
  dueNextNinetyDays: number;
  collectionEfficiencyPct: number;
}

export interface CollectionsAgingBucket {
  bucket: string;
  amount: number;
  count: number;
}

export interface CollectionsCashflowPoint {
  month: string;
  scheduled: number;
  weightedForecast: number;
  actualCollections: number;
}

export interface CollectionsStatusPoint {
  status: CollectionsInstallmentStatus;
  count: number;
  amount: number;
}

export interface CollectionsRiskDistributionPoint {
  risk: "Low" | "Medium" | "High";
  count: number;
  amount: number;
}

export interface CollectionsExposureDistributionPoint {
  bucket: string;
  count: number;
  amount: number;
}

export interface CollectionsTopOverdueUnit {
  customerName: string;
  unitRef: string;
  buildingName: string | null;
  outstandingAmount: number;
  overDuePct: number | null;
  riskCategory: string | null;
  dueDate: string;
  installmentsOverDue: number | null;
}

export interface CollectionsDsoMetrics {
  currentDso: number;
  previous30Dso: number;
  trend: "improving" | "worsening" | "stable";
}

export interface CollectionsPropertyTypeBreakdown {
  type: string;
  forecast: number;
  collected: number;
  outstanding: number;
  count: number;
}

export interface CollectionsDldTerminationSummary {
  eligibleCount: number;
  eligibleAmount: number;
  courtCount: number;
  courtAmount: number;
  notEligibleCount: number;
}

export interface CollectionsWeeklyTrendPoint {
  weekLabel: string;
  collectedAmount: number;
  forecastDue: number;
  efficiencyPct: number;
}

export interface CollectionsForecastDashboard {
  summary: CollectionsForecastSummary;
  aging: CollectionsAgingBucket[];
  cashflow: CollectionsCashflowPoint[];
  statusBreakdown: CollectionsStatusPoint[];
  riskDistribution: CollectionsRiskDistributionPoint[];
  exposureDistribution: CollectionsExposureDistributionPoint[];
  topOverdueUnits: CollectionsTopOverdueUnit[];
  dsoMetrics: CollectionsDsoMetrics;
  collectionsByPropertyType: CollectionsPropertyTypeBreakdown[];
  dldTerminationSummary: CollectionsDldTerminationSummary;
  weeklyTrend: CollectionsWeeklyTrendPoint[];
}

export interface CollectionsPortfolioProject {
  projectId: number;
  projectName: string;
  totalForecast: number;
  totalCollected: number;
  totalOutstanding: number;
  weightedOutstanding: number;
  overdueOutstanding: number;
  averageProbabilityPct: number;
  dominantRisk: "Low" | "Medium" | "High";
  efficiencyPct: number;
  unitCount: number;
}

export interface CollectionsPortfolioDashboard {
  summary: CollectionsForecastSummary & {
    projects: number;
    weightedOutstanding: number;
    averageProbabilityPct: number;
  };
  projects: CollectionsPortfolioProject[];
}
