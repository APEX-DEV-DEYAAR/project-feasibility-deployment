import { useState, useEffect, useMemo } from "react";
import DeyaarLogo from "../components/DeyaarLogo";
import ExecutiveBridgeChart from "../components/ExecutiveBridgeChart";
import VarianceWaterfallChart from "../components/VarianceWaterfallChart";
import { fetchBudgetVsActuals } from "../api/cost-tracking.api";
import { fetchFeasibility } from "../api/feasibility.api";
import { applyOverrides } from "../utils/calculations";
import type { ProjectSummary, BudgetVsActualRow, FeasibilityRun } from "../types";
import { formatM } from "../utils/formatters";

type TabType = 'breakdown' | 'variance' | 'bridge';

interface BudgetVsActualsPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
  onLogout?: () => void;
  onRefresh?: () => void;
}

interface BudgetLineItemDef {
  lineItem: string;
  type: "cost" | "revenue" | "sales";
  team: BudgetVsActualRow["team"];
  getBudget: (metrics: FeasibilityRun["metrics"]) => number;
}

const TEAM_LABELS: Record<string, string> = {
  commercial: "Commercial",
  sales: "Sales",
  marketing: "Marketing",
  collections: "Collections",
  "sales-tracking": "Sales Performance",
  revenue: "Feasibility",
};

const TEAM_ICONS: Record<string, string> = {
  commercial: "🏗️",
  sales: "🤝",
  marketing: "📢",
  collections: "💰",
  "sales-tracking": "📈",
  revenue: "📊",
};

const FEASIBILITY_LINE_ITEMS: BudgetLineItemDef[] = [
  { lineItem: "Land", type: "cost", team: "revenue", getBudget: (m) => m.costs.land },
  { lineItem: "Development Management", type: "cost", team: "revenue", getBudget: (m) => m.costs.devMgmt },
  { lineItem: "Cost of Funds", type: "cost", team: "revenue", getBudget: (m) => m.costs.cof },
  { lineItem: "Hard Cost", type: "cost", team: "commercial", getBudget: (m) => m.costs.construction },
  { lineItem: "Soft Cost", type: "cost", team: "commercial", getBudget: (m) => m.costs.soft },
  { lineItem: "Statutory Cost", type: "cost", team: "commercial", getBudget: (m) => m.costs.statutory },
  { lineItem: "Contingency", type: "cost", team: "commercial", getBudget: (m) => m.costs.contingency },
  { lineItem: "Broker Cost", type: "cost", team: "sales", getBudget: () => 0 },
  { lineItem: "DLD Cost", type: "cost", team: "sales", getBudget: () => 0 },
  { lineItem: "Sales Incentives", type: "cost", team: "sales", getBudget: () => 0 },
  { lineItem: "Marketing", type: "cost", team: "marketing", getBudget: (m) => m.costs.marketing },
  { lineItem: "Collections", type: "revenue", team: "collections", getBudget: (m) => m.revenue.totalInflows ?? m.revenue.total ?? 0 },
];

function getSalesExpBudget(metrics: FeasibilityRun["metrics"]): number {
  return metrics.costs.salesExpense;
}

function formatActivity(isoDate: string | null): string {
  if (!isoDate) return "No activity";
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? "Just now" : `${diffMins} min ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Executive KPI Card Component
function KPICard({ 
  title, 
  budget, 
  actual, 
  projected,
  blended,
  variance,
  variancePct,
  type,
  icon
}: {
  title: string;
  budget: number;
  actual: number;
  projected: number;
  blended: number;
  variance: number;
  variancePct: number;
  type: "revenue" | "cost" | "profit";
  icon: string;
}) {
  const isPositive = variance >= 0;
  const isProfit = type === "profit";
  
  return (
    <div className={`exec-kpi-card ${type} ${isProfit ? (variance >= 0 ? 'positive' : 'negative') : ''}`}>
      <div className="exec-kpi-header">
        <span className="exec-kpi-icon">{icon}</span>
        <span className="exec-kpi-title">{title}</span>
      </div>
      <div className="exec-kpi-values">
        <div className="exec-kpi-main">
          <span className="exec-kpi-label">Blended</span>
          <span className="exec-kpi-value">{formatM(blended)}M</span>
        </div>
        <div className="exec-kpi-secondary">
          <div>
            <span className="exec-kpi-sublabel">Budget</span>
            <span className="exec-kpi-subvalue">{formatM(budget)}M</span>
          </div>
          <div className={`exec-kpi-variance ${isPositive ? 'positive' : 'negative'}`}>
            <span className="exec-kpi-variance-value">
              {variance >= 0 ? '+' : ''}{formatM(variance)}M
            </span>
            <span className="exec-kpi-variance-pct">
              {variancePct >= 0 ? '+' : ''}{variancePct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Variance Badge Component
function VarianceBadge({ value, type = "cost" }: { value: number; type?: "revenue" | "cost" }) {
  const isFavorable = value >= 0;
  const isNeutral = value === 0;
  
  if (isNeutral) {
    return <span className="variance-badge neutral">—</span>;
  }
  
  return (
    <span className={`variance-badge ${isFavorable ? 'favorable' : 'unfavorable'}`}>
      {isFavorable ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// Table Row Component
function TableRow({ 
  row, 
  isSubtotal = false, 
  isNetPosition = false,
  isRevenue = false 
}: { 
  row: BudgetVsActualRow & { variance?: number; variancePct?: number };
  isSubtotal?: boolean;
  isNetPosition?: boolean;
  isRevenue?: boolean;
}) {
  const varianceGood = isRevenue 
    ? (row.variance ?? 0) >= 0 
    : (row.variance ?? 0) <= 0;
  
  return (
    <tr className={`
      ${isSubtotal ? 'subtotal-row' : ''} 
      ${isNetPosition ? 'net-position-row' : ''} 
      ${!varianceGood && !isSubtotal ? 'attention' : ''}
      ${isRevenue ? 'revenue-row' : ''}
    `}>
      <td className="line-item-cell">
        {isSubtotal || isNetPosition ? <strong>{row.lineItem}</strong> : row.lineItem}
      </td>
      <td className="team-cell">
        {!isSubtotal && !isNetPosition && (
          <span className={`team-tag team-${row.team}`}>
            {TEAM_ICONS[row.team] || "•"} {TEAM_LABELS[row.team]}
          </span>
        )}
      </td>
      <td className="amount-cell budget">{formatM(row.budget)}</td>
      <td className="amount-cell actual">
        <span className="actual-indicator">●</span> {formatM(row.actual)}
      </td>
      <td className="amount-cell projected">
        <span className="projected-indicator">●</span> {formatM(row.projected)}
      </td>
      <td className="amount-cell blended">
        <strong>{formatM(row.blended)}</strong>
      </td>
      <td className={`amount-cell variance ${varianceGood ? 'positive' : 'negative'}`}>
        {formatM(row.variance ?? 0)}
      </td>
      <td className="pct-cell">
        <VarianceBadge 
          value={row.variancePct ?? 0} 
          type={isRevenue ? "revenue" : "cost"} 
        />
      </td>
    </tr>
  );
}

// Capsule Tab Component
function CapsuleTabs({ 
  activeTab, 
  onTabChange 
}: { 
  activeTab: TabType; 
  onTabChange: (tab: TabType) => void;
}) {
  const tabs: { id: TabType; label: string; icon: string; count?: number }[] = [
    { id: 'breakdown', label: 'Financial Breakdown', icon: '📊' },
    { id: 'variance', label: 'Variance Analysis', icon: '📈' },
    { id: 'bridge', label: 'Executive Bridge', icon: '🌉' },
  ];

  return (
    <div className="capsule-tabs-container">
      <div className="capsule-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`capsule-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BudgetVsActualsPage({ projects, onBack, onLogout, onRefresh }: BudgetVsActualsPageProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('breakdown');
  const [data, setData] = useState<BudgetVsActualRow[]>([]);
  const [teamActivity, setTeamActivity] = useState<Record<string, string | null>>({});
  const [feasibility, setFeasibility] = useState<FeasibilityRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  // Track a reload counter so we can force re-fetch after navigation
  const [reloadKey, setReloadKey] = useState(0);

  // Re-fetch when the projects list changes (e.g. after saving feasibility and navigating back)
  useEffect(() => {
    if (selectedProjectId) {
      setReloadKey((k) => k + 1);
    }
  }, [projects]);

  useEffect(() => {
    if (!selectedProjectId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [actualsResponse, feasData] = await Promise.all([
          fetchBudgetVsActuals(selectedProjectId),
          fetchFeasibility(selectedProjectId),
        ]);
        setData(actualsResponse.rows);
        setTeamActivity(actualsResponse.teamActivity);
        setFeasibility(feasData);
      } catch {
        setError("Failed to load budget vs actuals data");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [selectedProjectId, reloadKey]);

  // Apply overrides to feasibility metrics so Budget vs Actuals reflects overridden values
  const effectiveMetrics = useMemo(() => {
    if (!feasibility?.metrics) return null;
    return applyOverrides(feasibility.metrics, feasibility.overrides ?? []);
  }, [feasibility]);

  const mergedData = useMemo(() => {
    const trackedRows = new Map(data.map((row) => [row.lineItem, row]));

    const feasibilityRows: BudgetVsActualRow[] = FEASIBILITY_LINE_ITEMS.map((def) => {
      const row = trackedRows.get(def.lineItem);
      const blended = (row?.blended ?? 0) / 1e6;
      const actual = (row?.actual ?? 0) / 1e6;
      const projected = (row?.projected ?? 0) / 1e6;
      const budget = effectiveMetrics ? def.getBudget(effectiveMetrics) : 0;
      const isInflow = def.type === "revenue" || def.type === "sales";
      const variance = isInflow ? blended - budget : budget - blended;
      const variancePct = budget !== 0 ? (variance / budget) * 100 : 0;

      return {
        lineItem: def.lineItem,
        type: def.type,
        team: def.team,
        budget,
        actual,
        projected,
        blended,
        variance,
        variancePct,
      };
    });

    const extraTrackedRows: BudgetVsActualRow[] = data
      .filter((row) => !FEASIBILITY_LINE_ITEMS.some((def) => def.lineItem === row.lineItem))
      .map((row) => {
        const isInflow = row.type === "revenue" || row.type === "sales";
        const budget = row.budget / 1e6;
        const actual = row.actual / 1e6;
        const projected = row.projected / 1e6;
        const blended = row.blended / 1e6;
        const variance = isInflow ? blended - budget : budget - blended;
        const variancePct = budget !== 0 ? (variance / budget) * 100 : 0;
        return { ...row, budget, actual, projected, blended, variance, variancePct };
      });

    return [...feasibilityRows, ...extraTrackedRows];
  }, [data, effectiveMetrics]);

  const salesItems = mergedData.filter((row) => row.team === "sales" && row.type === "cost");
  const totalSalesActual = salesItems.reduce((sum, row) => sum + row.actual, 0);
  const totalSalesProjected = salesItems.reduce((sum, row) => sum + row.projected, 0);
  const totalSalesBlended = salesItems.reduce((sum, row) => sum + row.blended, 0);
  const totalSalesBudget = effectiveMetrics ? getSalesExpBudget(effectiveMetrics) : 0;
  const totalSalesVariance = totalSalesBudget - totalSalesBlended;

  // Sales performance (TSV) row from tracked data
  const salesPerfRows = mergedData.filter((row) => row.type === "sales");
  const salesPerfBudget = effectiveMetrics ? (effectiveMetrics.revenue.totalInflows ?? effectiveMetrics.revenue.total ?? 0) : 0;
  const salesPerfActual = salesPerfRows.reduce((sum, row) => sum + row.actual, 0);
  const salesPerfProjected = salesPerfRows.reduce((sum, row) => sum + row.projected, 0);/*salesPerfActual > salesPerfBudget ? 0.0 : salesPerfBudget - salesPerfActual; */
  const salesPerfBlended =  salesPerfRows.reduce((sum, row) => sum + row.blended, 0);/*salesPerfActual > salesPerfBudget ? salesPerfActual : salesPerfBudget*/
  const salesPerfVariance = salesPerfBlended - salesPerfBudget; /*salesPerfActual> salesPerfBudget ? salesPerfActual - salesPerfBudget : 0;*/
  const salesPerfVariancePct = salesPerfBudget !== 0 ? (salesPerfVariance / salesPerfBudget) * 100 : 0;
  const hasSalesPerf = salesPerfRows.length > 0 && (salesPerfActual > 0 || salesPerfProjected > 0);

  const costRows = mergedData.filter((row) => row.type === "cost" && row.team !== "sales");
  const revenueRows = mergedData.filter((row) => row.type === "revenue");

  const feasibilityOnlyCosts = costRows.filter((row) => row.team === "revenue");
  const commercialCosts = costRows.filter((row) => row.team === "commercial");
  const marketingCosts = costRows.filter((row) => row.team === "marketing");
  const cofRows = feasibilityOnlyCosts.filter((row) => row.lineItem === "Cost of Funds");
  const nonCofFeasibilityCosts = feasibilityOnlyCosts.filter((row) => row.lineItem !== "Cost of Funds");
  const operatingCostRows = [...nonCofFeasibilityCosts, ...commercialCosts, ...marketingCosts];

  // Combined Sales & Marketing row
  const totalMktBudget = marketingCosts.reduce((sum, row) => sum + row.budget, 0);
  const totalMktActual = marketingCosts.reduce((sum, row) => sum + row.actual, 0);
  const totalMktProjected = marketingCosts.reduce((sum, row) => sum + row.projected, 0);
  const totalMktBlended = marketingCosts.reduce((sum, row) => sum + row.blended, 0);

  const salesMktBudget = totalSalesBudget + totalMktBudget;
  const salesMktActual = totalSalesActual + totalMktActual;
  const salesMktProjected = totalSalesProjected + totalMktProjected;
  const salesMktBlended = totalSalesBlended + totalMktBlended;
  const salesMktVariance = salesMktBudget - salesMktBlended;

  const totalRevBudget = revenueRows.reduce((sum, row) => sum + row.budget, 0);
  const totalRevActual = revenueRows.reduce((sum, row) => sum + row.actual, 0);
  const totalRevProjected = revenueRows.reduce((sum, row) => sum + row.projected, 0);
  const totalRevBlended = revenueRows.reduce((sum, row) => sum + row.blended, 0);
  const totalRevVariance = totalRevBlended - totalRevBudget;

  const totalOperatingOutflowBudget =
    operatingCostRows.reduce((sum, row) => sum + row.budget, 0) + (totalSalesBudget > 0 ? totalSalesBudget : 0);
  const totalOperatingOutflowActual =
    operatingCostRows.reduce((sum, row) => sum + row.actual, 0) + (totalSalesBudget > 0 ? totalSalesActual : 0);
  const totalOperatingOutflowProjected =
    operatingCostRows.reduce((sum, row) => sum + row.projected, 0) + (totalSalesBudget > 0 ? totalSalesProjected : 0);
  const totalOperatingOutflowBlended =
    operatingCostRows.reduce((sum, row) => sum + row.blended, 0) + (totalSalesBudget > 0 ? totalSalesBlended : 0);
  const totalOperatingOutflowVariance = totalOperatingOutflowBudget - totalOperatingOutflowBlended;

  const totalCofBudget = cofRows.reduce((sum, row) => sum + row.budget, 0);
  const totalCofActual = cofRows.reduce((sum, row) => sum + row.actual, 0);
  const totalCofProjected = cofRows.reduce((sum, row) => sum + row.projected, 0);
  const totalCofBlended = cofRows.reduce((sum, row) => sum + row.blended, 0);
  const totalCofVariance = totalCofBudget - totalCofBlended;

  const totalOutflowBudget = totalOperatingOutflowBudget + totalCofBudget;
  const totalOutflowActual = totalOperatingOutflowActual + totalCofActual;
  const totalOutflowProjected = totalOperatingOutflowProjected + totalCofProjected;
  const totalOutflowBlended = totalOperatingOutflowBlended + totalCofBlended;
  const totalOutflowVariance = totalOutflowBudget - totalOutflowBlended;

  // Use Sales Performance (TSV) as revenue for profit calculations, not Collections
  const profitRevBudget = hasSalesPerf ? salesPerfBudget : totalRevBudget;
  const profitRevActual = hasSalesPerf ? salesPerfActual : totalRevActual;
  const profitRevProjected = hasSalesPerf ? salesPerfProjected : totalRevProjected;
  const profitRevBlended = hasSalesPerf ? salesPerfBlended : totalRevBlended;

  const grossProfitBudget = profitRevBudget - totalOperatingOutflowBudget;
  const grossProfitActual = profitRevActual - totalOperatingOutflowActual;
  const grossProfitProjected = profitRevProjected - totalOperatingOutflowProjected;
  const grossProfitBlended = profitRevBlended - totalOperatingOutflowBlended;
  const grossProfitVariance = grossProfitBlended - grossProfitBudget;

  const netProfitBudget = profitRevBudget - totalOutflowBudget;
  const netProfitActual = profitRevActual - totalOutflowActual;
  const netProfitProjected = profitRevProjected - totalOutflowProjected;
  const netProfitBlended = profitRevBlended - totalOutflowBlended;
  const netProfitVariance = netProfitBlended - netProfitBudget;

  const feasibilityLabel = feasibility ? `v${feasibility.version ?? 1} (${feasibility.status})` : "No feasibility";
  const noBudgetedData = costRows.length === 0 && revenueRows.length === 0 && totalSalesBudget === 0 && !hasSalesPerf;

  const executiveBridgeSteps = [
    ...(hasSalesPerf ? [
      { label: "Sales (TSV)", budgetChange: salesPerfBudget, blendedChange: salesPerfBlended, kind: "inflow" as const },
    ] : []),
    { label: "Collections", budgetChange: totalRevBudget, blendedChange: totalRevBlended, kind: "inflow" as const },
    { label: "Outflow Excl. COF", budgetChange: -totalOperatingOutflowBudget, blendedChange: -totalOperatingOutflowBlended, kind: "outflow" as const },
    { label: "COF", budgetChange: -totalCofBudget, blendedChange: -totalCofBlended, kind: "outflow" as const },
  ];

  const analystChartData = [
    ...(hasSalesPerf ? [{
      label: "Sales Performance (TSV)",
      team: "Sales Tracking",
      budget: salesPerfBudget,
      actual: salesPerfActual,
      projected: salesPerfProjected,
      kind: "inflow" as const,
    }] : []),
    ...revenueRows.map((row) => ({
      label: "Collections",
      team: "Collections",
      budget: hasSalesPerf ? salesPerfBlended : row.budget,
      actual: row.actual,
      projected: row.projected,
      kind: "inflow" as const,
    })),
    ...nonCofFeasibilityCosts.map((row) => ({
      label: row.lineItem,
      team: "Feasibility",
      budget: row.budget,
      actual: row.actual,
      projected: row.projected,
      kind: "outflow" as const,
    })),
    ...commercialCosts.map((row) => ({
      label: row.lineItem,
      team: "Commercial",
      budget: row.budget,
      actual: row.actual,
      projected: row.projected,
      kind: "outflow" as const,
    })),
    {
      label: "Sales & Marketing",
      team: "Sales & Marketing",
      budget: salesMktBudget,
      actual: salesMktActual,
      projected: salesMktProjected,
      kind: "outflow" as const,
    },
    ...cofRows.map((row) => ({
      label: row.lineItem,
      team: "Feasibility",
      budget: row.budget,
      actual: row.actual,
      projected: row.projected,
      kind: "outflow" as const,
    })),
    { label: "Gross Profit", team: "Profit", budget: grossProfitBudget, actual: grossProfitActual, projected: grossProfitProjected, kind: "profit" as const },
    { label: "Net Profit", team: "Profit", budget: netProfitBudget, actual: netProfitActual, projected: netProfitProjected, kind: "profit" as const },
  ];

  // Calculate variance percentages for KPI cards
  const revVariancePct = totalRevBudget !== 0 ? (totalRevVariance / totalRevBudget) * 100 : 0;
  const outflowVariancePct = totalOperatingOutflowBudget !== 0 ? (totalOperatingOutflowVariance / totalOperatingOutflowBudget) * 100 : 0;
  const netProfitVariancePct = netProfitBudget !== 0 ? (netProfitVariance / netProfitBudget) * 100 : 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo"><DeyaarLogo size="sm" variant="beige" /></div>
          <div className="topbar-divider" />
          <div className="topbar-title">Budget vs Actuals</div>
        </div>
        <div className="topbar-actions">
          {onLogout || onRefresh ? (
            <>
              {onRefresh && (
                <button className="btn btn-ghost btn-icon" onClick={onRefresh} title="Refresh">
                  <span style={{ fontSize: "16px" }}>&#x21bb;</span>
                </button>
              )}
              {onLogout && (
                <button className="btn btn-ghost" onClick={onLogout} title="Sign out" style={{ color: "#f87171" }}>
                  Sign Out
                </button>
              )}
            </>
          ) : (
            <button className="btn btn-ghost btn-back" onClick={onBack}><span className="back-arrow">←</span><span className="back-text"> Back to Portfolio</span></button>
          )}
        </div>
      </header>

      <main className="main-content bva-page">
        {/* Page Header */}
        <div className="bva-header">
          <div className="bva-header-left">
            <h1>Budget vs Actuals</h1>
            <p className="bva-subtitle">Executive performance dashboard — Compare budget forecasts with actual and projected outcomes</p>
          </div>
          <div className="bva-header-badges">
            <span className="badge brown">DEYAAR</span>
            <span className="badge beige">Since Inception</span>
          </div>
        </div>

        {/* Project Selector */}
        <div className="bva-controls">
          <div className="bva-control-group">
            <label>Select Project</label>
            <div className="bva-select-wrapper">
              <select
                className="bva-select"
                value={selectedProjectId || ""}
                onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value, 10) : null)}
              >
                <option value="">Choose a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <span className="bva-select-icon">▼</span>
            </div>
          </div>
          
          {selectedProjectId && feasibility && (
            <div className="bva-feasibility-badge">
              <span className="feasibility-icon">📊</span>
              <div>
                <span className="feasibility-label">Budget Source</span>
                <span className="feasibility-value">Feasibility {feasibilityLabel}</span>
              </div>
            </div>
          )}
        </div>

        {/* Team Activity Bar */}
        {selectedProjectId && !loading && Object.keys(teamActivity).length > 0 && (
          <div className="bva-activity-bar">
            <span className="activity-title">Last Team Activity</span>
            <div className="activity-items">
              {["commercial", "sales", "sales-tracking", "marketing", "collections"].map((team) => (
                <div key={team} className={`activity-item ${teamActivity[team] ? 'active' : ''}`}>
                  <span className={`activity-dot team-${team}`}></span>
                  <span className="activity-team">{TEAM_LABELS[team]}</span>
                  <span className="activity-time">{formatActivity(teamActivity[team])}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}

        {!selectedProjectId ? (
          <div className="bva-empty-state">
            <div className="bva-empty-icon">📊</div>
            <h3>Select a Project</h3>
            <p>Choose a project from the dropdown above to view budget vs actuals analysis</p>
          </div>
        ) : loading ? (
          <div className="bva-loading">
            <div className="bva-spinner"></div>
            <span>Loading financial data...</span>
          </div>
        ) : noBudgetedData ? (
          <div className="bva-empty-state">
            <div className="bva-empty-icon">📝</div>
            <h3>No Budget Data</h3>
            <p>No budget or actual data found for this project. Please set up feasibility study and enter team data first.</p>
          </div>
        ) : (
          <>
            {/* Executive KPI Cards */}
            <div className="bva-kpi-section">
              <div className="bva-kpi-grid">
                {hasSalesPerf && (
                  <KPICard
                    title="Gross Sales"
                    budget={salesPerfBudget}
                    actual={salesPerfActual}
                    projected={salesPerfProjected}
                    blended={salesPerfProjected === 0 && salesPerfBudget > salesPerfActual ? salesPerfBudget : salesPerfBlended}
                    variance={salesPerfProjected === 0 && salesPerfBudget > salesPerfActual ? 0 : salesPerfVariance}
                    variancePct={salesPerfProjected === 0 && salesPerfBudget > salesPerfActual ? 0 : salesPerfVariancePct}
                    type="revenue"
                    icon="📈"
                  />
                )}
                {/* <KPICard
                  title="Collections"
                  budget={totalRevBudget}
                  actual={totalRevActual}
                  projected={totalRevProjected}
                  variance={totalRevVariance}
                  variancePct={revVariancePct}
                  type="revenue"
                  icon="💰"
                /> */}
                <KPICard
                  title="Operating Costs"
                  budget={totalOperatingOutflowBudget}
                  actual={totalOperatingOutflowActual}
                  projected={totalOperatingOutflowProjected}
                  blended={totalOperatingOutflowBlended}
                  variance={totalOperatingOutflowVariance}
                  variancePct={outflowVariancePct}
                  type="cost"
                  icon="📉"
                />
                <KPICard
                  title="Net Profit"
                  budget={netProfitBudget}
                  actual={netProfitActual  }
                  projected={netProfitProjected}
                  blended={salesPerfProjected === 0 && salesPerfBudget > salesPerfActual ? salesPerfBudget - totalOutflowBlended : netProfitBlended}
                  variance={salesPerfProjected === 0 && salesPerfBudget > salesPerfActual ? (salesPerfBudget - totalOutflowBlended) - netProfitBudget : netProfitVariance}
                  variancePct={salesPerfProjected === 0 && salesPerfBudget > salesPerfActual ? (netProfitBudget !== 0 ? (((salesPerfBudget - totalOutflowBlended) - netProfitBudget) / netProfitBudget) * 100 : 0) : netProfitVariancePct}
                  type="profit"
                  icon="📊"
                />
              </div>
            </div>

            {/* Capsule Tabs Navigation */}
            <CapsuleTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab Content */}
            <div className="bva-tab-content">
              {activeTab === 'breakdown' && (
                <div className="bva-table-panel full-width">
                  <div className="bva-panel-header">
                    <h3>Financial Breakdown</h3>
                    <span className="bva-panel-subtitle">All figures in AED Millions</span>
                  </div>
                  
                  <div className="bva-table-wrapper">
                    <table className="bva-table">
                      <thead>
                        <tr>
                          <th className="col-item">Line Item</th>
                          <th className="col-team">Team</th>
                          <th className="col-amount">Budget<span className="col-unit">AED M</span></th>
                          <th className="col-amount">Actual<span className="col-unit">AED M</span></th>
                          <th className="col-amount">Projected<span className="col-unit">AED M</span></th>
                          <th className="col-amount">Blended<span className="col-unit">AED M</span></th>
                          <th className="col-variance">Variance<span className="col-unit">AED M</span></th>
                          <th className="col-pct">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Revenue Budget (from feasibility) */}
                        {effectiveMetrics && (
                          <>
                            <tr className="section-header">
                              <td colSpan={8}>
                                <span className="section-icon">📊</span> Revenue Budget (Feasibility)
                              </td>
                            </tr>
                            <tr className="revenue-row">
                              <td className="line-item-cell">Gross Residential Revenue</td>
                              <td className="team-cell">
                                <span className="team-tag team-revenue">📊 Feasibility</span>
                              </td>
                              <td className="amount-cell budget">{formatM(effectiveMetrics.revenue.totalInflows ?? effectiveMetrics.revenue.total ?? 0)}</td>
                              <td className="amount-cell actual" colSpan={4} style={{ textAlign: "center", color: "#9ca3af", fontStyle: "italic" }}>
                                Budget baseline from feasibility study
                              </td>
                              <td className="pct-cell"></td>
                            </tr>
                          </>
                        )}

                        {/* Sales Performance Section */}
                        {hasSalesPerf && (
                          <>
                            <tr className="section-header">
                              <td colSpan={8}>
                                <span className="section-icon">📈</span> Sales Performance (TSV)
                              </td>
                            </tr>
                            {salesPerfRows.map((row, idx) => (
                              <TableRow key={`sales-${idx}`} row={{
                                ...row,
                                budget: salesPerfBudget,
                                variance: salesPerfVariance,
                                variancePct: salesPerfVariancePct,
                              }} isRevenue />
                            ))}
                            <tr className="subtotal-row">
                              <td className="line-item-cell"><strong>Total Sales</strong></td>
                              <td className="team-cell"></td>
                              <td className="amount-cell budget"><strong>{formatM(salesPerfBudget)}</strong></td>
                              <td className="amount-cell actual"><strong>{formatM(salesPerfActual)}</strong></td>
                              <td className="amount-cell projected"><strong>{formatM(salesPerfProjected)/*formatM(salesPerfActual>salesPerfBudget? 0.0 :salesPerfBudget - salesPerfActual)*/}</strong></td>
                              <td className="amount-cell blended"><strong>{formatM(salesPerfBlended)/*salesPerfActual > salesPerfBudget ? formatM(salesPerfActual) : formatM(salesPerfBudget)*/}</strong></td>
                              <td className={`amount-cell variance ${salesPerfVariance >= 0 ? 'positive' : 'negative'}`}>
                                <strong>{formatM(salesPerfVariance)}</strong>
                              </td>
                              <td className="pct-cell">
                                <VarianceBadge value={salesPerfVariancePct} type="revenue" />
                              </td>
                            </tr>
                          </>
                        )}

                        {/* Collections Section */}
                        {revenueRows.length > 0 && (
                          <>
                            <tr className="section-header">
                              <td colSpan={8}>
                                <span className="section-icon">💰</span> Collections (Cash In)
                              </td>
                            </tr>
                            {revenueRows.map((row, idx) => (
                              <TableRow key={`rev-${idx}`} row={{
                                ...row,
                                budget: hasSalesPerf ? salesPerfBlended : row.budget,
                                variance: hasSalesPerf ? row.blended - salesPerfBlended : row.variance,
                                variancePct: hasSalesPerf && salesPerfBlended !== 0
                                  ? ((row.blended - salesPerfBlended) / salesPerfBlended) * 100
                                  : row.variancePct,
                              }} isRevenue />
                            ))}
                            <tr className="subtotal-row">
                              <td className="line-item-cell"><strong>Total Collections</strong></td>
                              <td className="team-cell"></td>
                              <td className="amount-cell budget"><strong>{formatM(hasSalesPerf ? salesPerfBlended : totalRevBudget)}</strong></td>
                              <td className="amount-cell actual"><strong>{formatM(totalRevActual)}</strong></td>
                              <td className="amount-cell projected"><strong>{formatM(totalRevProjected)}</strong></td>
                              <td className="amount-cell blended"><strong>{formatM(totalRevBlended)}</strong></td>
                              <td className={`amount-cell variance ${totalRevVariance >= 0 ? 'positive' : 'negative'}`}>
                                <strong>{formatM(totalRevVariance)}</strong>
                              </td>
                              <td className="pct-cell">
                                <VarianceBadge value={revVariancePct} type="revenue" />
                              </td>
                            </tr>
                          </>
                        )}

                        {/* Operating Costs Section */}
                        <tr className="section-header cost">
                          <td colSpan={8}>
                            <span className="section-icon">📉</span> Operating Costs
                          </td>
                        </tr>
                        
                        {nonCofFeasibilityCosts.map((row, idx) => (
                          <tr key={`feas-${idx}`} className="feasibility-row">
                            <td className="line-item-cell">{row.lineItem}</td>
                            <td className="team-cell">
                              <span className="team-tag team-revenue">📊 Feasibility</span>
                            </td>
                            <td className="amount-cell budget">{formatM(row.budget)}</td>
                            <td className="amount-cell actual">{formatM(row.actual)}</td>
                            <td className="amount-cell projected">{formatM(row.projected)}</td>
                            <td className="amount-cell blended">{formatM(row.blended)}</td>
                            <td className={`amount-cell variance ${(row.variance ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                              {formatM(row.variance ?? 0)}
                            </td>
                            <td className="pct-cell">
                              <VarianceBadge value={row.variancePct ?? 0} type="cost" />
                            </td>
                          </tr>
                        ))}

                        {commercialCosts.map((row, idx) => (
                          <tr key={`comm-${idx}`} className={(row.variance ?? 0) < 0 ? 'attention' : ''}>
                            <td className="line-item-cell">{row.lineItem}</td>
                            <td className="team-cell">
                              <span className="team-tag team-commercial">🏗️ Commercial</span>
                            </td>
                            <td className="amount-cell budget">{formatM(row.budget)}</td>
                            <td className="amount-cell actual">{formatM(row.actual)}</td>
                            <td className="amount-cell projected">{formatM(row.projected)}</td>
                            <td className="amount-cell blended">{formatM(row.blended)}</td>
                            <td className={`amount-cell variance ${(row.variance ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                              {formatM(row.variance ?? 0)}
                            </td>
                            <td className="pct-cell">
                              <VarianceBadge value={row.variancePct ?? 0} type="cost" />
                            </td>
                          </tr>
                        ))}

                        <tr className="sales-expense-row">
                          <td className="line-item-cell"><strong>Sales & Marketing</strong></td>
                          <td className="team-cell">
                            <span className="team-tag team-sales">🤝 Sales & Marketing</span>
                          </td>
                          <td className="amount-cell budget"><strong>{formatM(salesMktBudget)}</strong></td>
                          <td className="amount-cell actual"><strong>{formatM(salesMktActual)}</strong></td>
                          <td className="amount-cell projected"><strong>{formatM(salesMktProjected)}</strong></td>
                          <td className="amount-cell blended"><strong>{formatM(salesMktBlended)}</strong></td>
                          <td className={`amount-cell variance ${salesMktVariance >= 0 ? 'positive' : 'negative'}`}>
                            <strong>{formatM(salesMktVariance)}</strong>
                          </td>
                          <td className="pct-cell">
                            <VarianceBadge
                              value={salesMktBudget !== 0 ? (salesMktVariance / salesMktBudget) * 100 : 0}
                              type="cost"
                            />
                          </td>
                        </tr>

                        <tr className="subtotal-row">
                          <td className="line-item-cell"><strong>Total Operating Costs</strong></td>
                          <td className="team-cell"></td>
                          <td className="amount-cell budget"><strong>{formatM(totalOperatingOutflowBudget)}</strong></td>
                          <td className="amount-cell actual"><strong>{formatM(totalOperatingOutflowActual)}</strong></td>
                          <td className="amount-cell projected"><strong>{formatM(totalOperatingOutflowProjected)}</strong></td>
                          <td className="amount-cell blended"><strong>{formatM(totalOperatingOutflowBlended)}</strong></td>
                          <td className={`amount-cell variance ${totalOperatingOutflowVariance >= 0 ? 'positive' : 'negative'}`}>
                            <strong>{formatM(totalOperatingOutflowVariance)}</strong>
                          </td>
                          <td className="pct-cell">
                            <VarianceBadge 
                              value={totalOperatingOutflowBudget !== 0 ? (totalOperatingOutflowVariance / totalOperatingOutflowBudget) * 100 : 0} 
                              type="cost" 
                            />
                          </td>
                        </tr>

                        <tr className="net-position-row gross">
                          <td className="line-item-cell"><strong>Gross Profit</strong></td>
                          <td className="team-cell"></td>
                          <td className="amount-cell"><strong>{formatM(grossProfitBudget)}</strong></td>
                          <td className="amount-cell"><strong>{formatM(grossProfitActual)}</strong></td>
                          <td className="amount-cell"><strong>{formatM(grossProfitProjected)}</strong></td>
                          <td className="amount-cell"><strong>{formatM(grossProfitBlended)}</strong></td>
                          <td className={`amount-cell variance ${grossProfitVariance >= 0 ? 'positive' : 'negative'}`}>
                            <strong>{formatM(grossProfitVariance)}</strong>
                          </td>
                          <td className="pct-cell">
                            <VarianceBadge
                              value={grossProfitBudget !== 0 ? (grossProfitVariance / grossProfitBudget) * 100 : 0}
                              type="revenue"
                            />
                          </td>
                        </tr>

                        {/* COF Section */}
                        {cofRows.length > 0 && (
                          <>
                            <tr className="section-header cof">
                              <td colSpan={8}>
                                <span className="section-icon">🏦</span> Cost of Funds
                              </td>
                            </tr>
                            {cofRows.map((row, idx) => (
                              <tr key={`cof-${idx}`} className="cof-row">
                                <td className="line-item-cell">{row.lineItem}</td>
                                <td className="team-cell">
                                  <span className="team-tag team-revenue">📊 Feasibility</span>
                                </td>
                                <td className="amount-cell budget">{formatM(row.budget)}</td>
                                <td className="amount-cell actual">{formatM(row.actual)}</td>
                                <td className="amount-cell projected">{formatM(row.projected)}</td>
                                <td className="amount-cell blended">{formatM(row.blended)}</td>
                                <td className={`amount-cell variance ${(row.variance ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                                  {formatM(row.variance ?? 0)}
                                </td>
                                <td className="pct-cell">
                                  <VarianceBadge value={row.variancePct ?? 0} type="cost" />
                                </td>
                              </tr>
                            ))}
                            <tr className="subtotal-row cof">
                              <td className="line-item-cell"><strong>Total COF</strong></td>
                              <td className="team-cell"></td>
                              <td className="amount-cell budget"><strong>{formatM(totalCofBudget)}</strong></td>
                              <td className="amount-cell actual"><strong>{formatM(totalCofActual)}</strong></td>
                              <td className="amount-cell projected"><strong>{formatM(totalCofProjected)}</strong></td>
                              <td className="amount-cell blended"><strong>{formatM(totalCofBlended)}</strong></td>
                              <td className={`amount-cell variance ${totalCofVariance >= 0 ? 'positive' : 'negative'}`}>
                                <strong>{formatM(totalCofVariance)}</strong>
                              </td>
                              <td className="pct-cell">
                                <VarianceBadge 
                                  value={totalCofBudget !== 0 ? (totalCofVariance / totalCofBudget) * 100 : 0} 
                                  type="cost" 
                                />
                              </td>
                            </tr>
                          </>
                        )}

                        {/* Net Position Section */}
                        <tr className="section-header profit">
                          <td colSpan={8}>
                            <span className="section-icon">📈</span> Profitability
                          </td>
                        </tr>

                        <tr className="net-position-row net">
                          <td className="line-item-cell"><strong>Net Profit</strong></td>
                          <td className="team-cell"></td>
                          <td className="amount-cell"><strong>{formatM(netProfitBudget)}</strong></td>
                          <td className="amount-cell"><strong>{formatM(netProfitActual)}</strong></td>
                          <td className="amount-cell"><strong>{formatM(netProfitProjected)}</strong></td>
                          <td className="amount-cell"><strong>{formatM(netProfitBlended)}</strong></td>
                          <td className={`amount-cell variance ${netProfitVariance >= 0 ? 'positive' : 'negative'}`}>
                            <strong>{formatM(netProfitVariance)}</strong>
                          </td>
                          <td className="pct-cell">
                            <VarianceBadge 
                              value={netProfitBudget !== 0 ? (netProfitVariance / netProfitBudget) * 100 : 0} 
                              type="revenue" 
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Legend */}
                  <div className="bva-legend">
                    <div className="legend-item">
                      <span className="legend-dot actual"></span>
                      <span>Actual</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot projected"></span>
                      <span>Projected</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot blended"></span>
                      <span>Blended</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot favorable"></span>
                      <span>Favorable Variance</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot unfavorable"></span>
                      <span>Unfavorable Variance</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'variance' && (
                <div className="bva-chart-fullwidth">
                  <VarianceWaterfallChart
                    title="Variance Analysis"
                    subtitle="Budget vs Blended (Actual + Projected)"
                    data={analystChartData}
                  />
                </div>
              )}

              {activeTab === 'bridge' && (
                <div className="bva-chart-fullwidth">
                  <ExecutiveBridgeChart
                    title="Executive Bridge"
                    subtitle="From Inflow to Net Profit"
                    steps={executiveBridgeSteps}
                    budgetTotal={netProfitBudget}
                    blendedTotal={netProfitBlended}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
