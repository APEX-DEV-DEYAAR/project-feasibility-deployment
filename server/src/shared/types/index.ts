export interface AppConfig {
  port: number;
  jwtSecret: string;
  allowedOrigins: string[];
  db: {
    type: string;
    url: string | undefined;
    oracle?: {
      user: string;
      password: string;
      connectString: string;
      walletDir: string;
      walletPassword: string;
    };
  };
}

// ---------- Auth ----------

export type UserRole = "admin" | "sales" | "collections" | "commercial" | "finance" | "marketing" | "business_development" | "cfo";

export interface AppUser {
  id: number;
  username: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  userId: number;
  username: string;
  role: UserRole;
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

// ---------- Project ----------

export interface Project {
  id: number;
  name: string;
  createdAt: string;
}

export interface ProjectSummary {
  id: number;
  name: string;
  latestVersion: number | null;
  status: FeasibilityStatus | null;
  hasFeasibility: boolean;
  updatedAt: string;
}

// ---------- Feasibility ----------

export type FeasibilityStatus = "draft" | "frozen";

export interface FeasibilityInput {
  landArea: number | null;
  landCost: number | null;
  landPsf: number | null;
  gfa: number | null;
  nsaResi: number | null;
  nsaRetail: number | null;
  buaResi: number | null;
  buaRetail: number | null;
  unitsResi: number | null;
  unitsRetail: number | null;
  resiPsf: number | null;
  retailPsf: number | null;
  carParkIncome: number | null;
  cofOnSalesPct: number | null;
  ccPsf: number | null;
  softPct: number | null;
  statPct: number | null;
  contPct: number | null;
  devMgmtPct: number | null;
  cofPct: number | null;
  salesExpPct: number | null;
  mktPct: number | null;
}

export interface Partner {
  name: string;
  share: number | null;
}

export interface NormalizedPayload {
  projectName: string;
  input: FeasibilityInput;
  partners: Partner[];
}

export interface JvShare {
  name: string;
  share: number;
  profitShare: number;
}

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
  jvShares: JvShare[];
  kpis: KpiMetrics;
}

export interface MetricOverride {
  metricKey: string;
  originalValue: number;
  overrideValue: number;
  justification: string;
}

export interface FeasibilityRun {
  id: number;
  projectId: number;
  version: number | null;
  status: FeasibilityStatus;
  payload: NormalizedPayload;
  metrics: FeasibilityMetrics;
  overrides?: MetricOverride[];
  createdAt: string;
  updatedAt: string;
  frozenAt: string | null;
}

// ---------- Archive ----------

export interface ArchivedRun {
  id: number;
  originalRunId: number;
  projectId: number;
  version: number;
  payload: NormalizedPayload;
  metrics: FeasibilityMetrics;
  overrides?: MetricOverride[];
  frozenAt: string | null;
  archivedAt: string;
}

export interface FeasibilityReportingPartner {
  name: string;
  share: number;
  profitShare: number;
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
  // Joined fields
  categoryName?: string;
  categoryCode?: string;
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
  totalProjected: number | null;
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
  annualProjected: number | null;
  annualBudget: number | null;
  ytdActual: number | null;
  ytdProjected: number | null;
  monthsWithActual: number;
}

export interface SaveMonthlyCostPayload {
  projectId: number;
  categoryId: number;
  year: number;
  month: number;
  actualAmount?: number | null;
  projectedAmount: number | null;
  budgetAmount?: number | null;
  notes?: string;
  createdBy?: string;
}

export interface BulkSaveMonthlyCostsPayload {
  costs: SaveMonthlyCostPayload[];
}

// ---------- Collections Tracking ----------

export interface ProjectMonthlyCollections {
  id: number;
  projectId: number;
  year: number;
  month: number;
  budgetAmount: number | null;
  actualAmount: number | null;
  projectedAmount: number | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

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

// ---------- Sales Tracking ----------

export interface ProjectMonthlySales {
  id: number;
  projectId: number;
  year: number;
  month: number;
  budgetAmount: number | null;
  actualAmount: number | null;
  projectedAmount: number | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlySalesRow {
  year: number;
  month: number;
  monthName: string;
  budgetAmount: number | null;
  actualAmount: number | null;
  projectedAmount: number | null;
  notes: string | null;
}

export interface SaveMonthlySalesPayload {
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

export interface BvaCostAggregate {
  categoryId: number;
  categoryName: string;
  categoryCode: string;
  team: TeamCode;
  budget: number;
  actual: number;
  projected: number;
  blended: number;
  lastActivity: string | null;
}

export interface BvaRevenueAggregate {
  budget: number;
  actual: number;
  projected: number;
  blended: number;
  lastActivity: string | null;
}

export interface BvaSalesAggregate {
  budget: number;
  actual: number;
  projected: number;
  blended: number;
  lastActivity: string | null;
}

export interface BudgetVsActualRow {
  lineItem: string;
  type: "cost" | "revenue" | "sales";
  team: TeamCode | "revenue" | "sales-tracking";
  budget: number;
  actual: number;
  projected: number;
  blended: number;       // actual if present per month, else projected
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

export interface SaveCollectionsInstallmentPayload {
  id?: number | null;
  projectId: number;
  customerName: string;
  unitRef: string;
  buildingName?: string;
  locationCode?: string;
  installmentLabel: string;
  dueDate: string;
  forecastAmount: number;
  collectedAmount?: number;
  collectionDate?: string | null;
  status?: CollectionsInstallmentStatus;
  probabilityPct?: number;
  riskCategory?: string;
  exposureBucket?: string;
  expectedForfeiture?: string;
  unitForecast?: string;
  overDuePct?: number | null;
  installmentsOverDue?: number | null;
  sourceStatus?: string;
  paymentPlanName?: string;
  propertyType?: string;
  spaSignedDate?: string | null;
  spaSignStatus?: string;
  tsvAmount?: number | null;
  totalCleared?: number | null;
  waivedAmount?: number | null;
  totalOverDue?: number | null;
  clearedPct?: number | null;
  paidPct?: number | null;
  isUnitOverDue?: string;
  installmentsOverDueBucket?: string;
  overDuePctBucket?: string;
  registeredSaleType?: string;
  latestConstructionProgress?: number | null;
  canClaimTotal?: number | null;
  canClaimAdditional?: number | null;
  eligibleForDldTermination?: string;
  projectCompletionDate?: string | null;
  notes?: string;
  createdBy?: string;
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

export interface CollectionsCompletionLookup {
  id: number;
  buildingName: string;
  projectDldCompletionDate: string | null;
  latestConstructionProgress: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveCollectionsCompletionLookupPayload {
  buildingName: string;
  projectDldCompletionDate?: string | null;
  latestConstructionProgress?: number | null;
}

export interface CollectionsAgingLookup {
  id: number;
  locationCode: string;
  bucket0To29: number;
  bucket30To59: number;
  bucket60To89: number;
  bucket90To179: number;
  bucket180To365: number;
  bucket365Plus: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveCollectionsAgingLookupPayload {
  locationCode: string;
  bucket0To29?: number;
  bucket30To59?: number;
  bucket60To89?: number;
  bucket90To179?: number;
  bucket180To365?: number;
  bucket365Plus?: number;
}
