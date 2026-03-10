import { useState, useEffect, useMemo } from "react";
import DeyaarLogo from "../components/DeyaarLogo";
import ExecutiveBridgeChart from "../components/ExecutiveBridgeChart";
import VarianceWaterfallChart from "../components/VarianceWaterfallChart";
import { fetchBudgetVsActuals } from "../api/cost-tracking.api";
import { fetchFeasibility } from "../api/feasibility.api";
import type { ProjectSummary, BudgetVsActualRow, FeasibilityRun } from "../types";
import { formatM } from "../utils/formatters";

type TabType = 'breakdown' | 'variance' | 'bridge';

interface BudgetVsActualsPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
}

interface BudgetLineItemDef {
  lineItem: string;
  type: "cost" | "revenue";
  team: BudgetVsActualRow["team"];
  getBudget: (metrics: FeasibilityRun["metrics"]) => number;
}

const TEAM_LABELS: Record<string, string> = {
  commercial: "Commercial",
  sales: "Sales",
  marketing: "Marketing",
  collections: "Collections",
  revenue: "Feasibility",
};

const TEAM_ICONS: Record<string, string> = {
  commercial: "🏗️",
  sales: "🤝",
  marketing: "📢",
  collections: "💰",
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
  { lineItem: "Gross Residential Sales", type: "revenue", team: "collections", getBudget: (m) => m.revenue.totalInflows ?? m.revenue.total ?? 0 },
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
  variance, 
  variancePct, 
  type,
  icon 
}: { 
  title: string; 
  budget: number; 
  actual: number; 
  projected: number;
  variance: number; 
  variancePct: number;
  type: "revenue" | "cost" | "profit";
  icon: string;
}) {
  const isPositive = type === "revenue" ? variance >= 0 : variance <= 0;
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
          <span className="exec-kpi-value">{formatM(actual + projected)}M</span>
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
  const isFavorable = type === "revenue" ? value >= 0 : value <= 0;
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

export default function BudgetVsActualsPage({ projects, onBack }: BudgetVsActualsPageProps) {
  const currentYear = new Date().getFullYear();
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

  useEffect(() => {
    if (!selectedProjectId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [actualsResponse, feasData] = await Promise.all([
          fetchBudgetVsActuals(selectedProjectId, currentYear),
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
  }, [selectedProjectId, currentYear]);

  const mergedData = useMemo(() => {
    const trackedRows = new Map(data.map((row) => [row.lineItem, row]));

    const feasibilityRows: BudgetVsActualRow[] = FEASIBILITY_LINE_ITEMS.map((def) => {
      const row = trackedRows.get(def.lineItem);
      const blended = (row?.blended ?? 0) / 1e6;
      const actual = (row?.actual ?? 0) / 1e6;
      const projected = (row?.projected ?? 0) / 1e6;
      const budget = feasibility?.metrics ? def.getBudget(feasibility.metrics) : 0;
      const variance = def.type === "revenue" ? blended - budget : budget - blended;
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
      .map((row) => ({
        ...row,
        budget: 0,
        actual: row.actual / 1e6,
        projected: row.projected / 1e6,
        blended: row.blended / 1e6,
        variance: row.type === "revenue" ? row.blended / 1e6 : -(row.blended / 1e6),
        variancePct: 0,
      }));

    return [...feasibilityRows, ...extraTrackedRows];
  }, [data, feasibility]);

  const salesItems = mergedData.filter((row) => row.team === "sales" && row.type === "cost");
  const totalSalesActual = salesItems.reduce((sum, row) => sum + row.actual, 0);
  const totalSalesProjected = salesItems.reduce((sum, row) => sum + row.projected, 0);
  const totalSalesBlended = salesItems.reduce((sum, row) => sum + row.blended, 0);
  const totalSalesBudget = feasibility?.metrics ? getSalesExpBudget(feasibility.metrics) : 0;
  const totalSalesVariance = totalSalesBudget - totalSalesBlended;

  const costRows = mergedData.filter((row) => row.type === "cost" && row.team !== "sales" && row.budget > 0);
  const revenueRows = mergedData.filter((row) => row.type === "revenue" && row.budget > 0);

  const feasibilityOnlyCosts = costRows.filter((row) => row.team === "revenue");
  const commercialCosts = costRows.filter((row) => row.team === "commercial");
  const marketingCosts = costRows.filter((row) => row.team === "marketing");
  const cofRows = feasibilityOnlyCosts.filter((row) => row.lineItem === "Cost of Funds");
  const nonCofFeasibilityCosts = feasibilityOnlyCosts.filter((row) => row.lineItem !== "Cost of Funds");
  const operatingCostRows = [...nonCofFeasibilityCosts, ...commercialCosts, ...marketingCosts];

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

  const grossProfitBudget = totalRevBudget - totalOperatingOutflowBudget;
  const grossProfitActual = totalRevActual - totalOperatingOutflowActual;
  const grossProfitProjected = totalRevProjected - totalOperatingOutflowProjected;
  const grossProfitBlended = totalRevBlended - totalOperatingOutflowBlended;
  const grossProfitVariance = grossProfitBlended - grossProfitBudget;

  const netProfitBudget = totalRevBudget - totalOutflowBudget;
  const netProfitActual = totalRevActual - totalOutflowActual;
  const netProfitProjected = totalRevProjected - totalOutflowProjected;
  const netProfitBlended = totalRevBlended - totalOutflowBlended;
  const netProfitVariance = netProfitBlended - netProfitBudget;

  const feasibilityLabel = feasibility ? `v${feasibility.version ?? 1} (${feasibility.status})` : "No feasibility";
  const noBudgetedData = costRows.length === 0 && revenueRows.length === 0 && totalSalesBudget === 0;

  const executiveBridgeSteps = [
    { label: "Inflow", budgetChange: totalRevBudget, blendedChange: totalRevBlended, kind: "inflow" as const },
    { label: "Outflow Excl. COF", budgetChange: -totalOperatingOutflowBudget, blendedChange: -totalOperatingOutflowBlended, kind: "outflow" as const },
    { label: "COF", budgetChange: -totalCofBudget, blendedChange: -totalCofBlended, kind: "outflow" as const },
  ];

  const analystChartData = [
    ...revenueRows.map((row) => ({
      label: row.lineItem,
      team: "Collections",
      budget: row.budget,
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
    ...(totalSalesBudget > 0 ? [{
      label: "Sales Expenses",
      team: "Sales",
      budget: totalSalesBudget,
      actual: totalSalesActual,
      projected: totalSalesProjected,
      kind: "outflow" as const,
    }] : []),
    ...marketingCosts.map((row) => ({
      label: row.lineItem,
      team: "Marketing",
      budget: row.budget,
      actual: row.actual,
      projected: row.projected,
      kind: "outflow" as const,
    })),
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
          <button className="btn btn-ghost" onClick={onBack}>← Back to Portfolio</button>
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
            <span className="badge beige">FY{currentYear}</span>
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
              {["commercial", "sales", "marketing", "collections"].map((team) => (
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
                <KPICard
                  title="Total Revenue"
                  budget={totalRevBudget}
                  actual={totalRevActual}
                  projected={totalRevProjected}
                  variance={totalRevVariance}
                  variancePct={revVariancePct}
                  type="revenue"
                  icon="💰"
                />
                <KPICard
                  title="Operating Costs"
                  budget={totalOperatingOutflowBudget}
                  actual={totalOperatingOutflowActual}
                  projected={totalOperatingOutflowProjected}
                  variance={totalOperatingOutflowVariance}
                  variancePct={outflowVariancePct}
                  type="cost"
                  icon="📉"
                />
                <KPICard
                  title="Net Profit"
                  budget={netProfitBudget}
                  actual={netProfitActual}
                  projected={netProfitProjected}
                  variance={netProfitVariance}
                  variancePct={netProfitVariancePct}
                  type="profit"
                  icon="📈"
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
                        {/* Revenue Section */}
                        {revenueRows.length > 0 && (
                          <>
                            <tr className="section-header">
                              <td colSpan={8}>
                                <span className="section-icon">💰</span> Revenue / Inflow
                              </td>
                            </tr>
                            {revenueRows.map((row, idx) => (
                              <TableRow key={`rev-${idx}`} row={row} isRevenue />
                            ))}
                            <tr className="subtotal-row">
                              <td className="line-item-cell"><strong>Total Inflow</strong></td>
                              <td className="team-cell"></td>
                              <td className="amount-cell budget"><strong>{formatM(totalRevBudget)}</strong></td>
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

                        {totalSalesBudget > 0 && (
                          <tr className="sales-expense-row">
                            <td className="line-item-cell"><strong>Sales Expenses</strong></td>
                            <td className="team-cell">
                              <span className="team-tag team-sales">🤝 Sales</span>
                            </td>
                            <td className="amount-cell budget"><strong>{formatM(totalSalesBudget)}</strong></td>
                            <td className="amount-cell actual"><strong>{formatM(totalSalesActual)}</strong></td>
                            <td className="amount-cell projected"><strong>{formatM(totalSalesProjected)}</strong></td>
                            <td className="amount-cell blended"><strong>{formatM(totalSalesBlended)}</strong></td>
                            <td className={`amount-cell variance ${totalSalesVariance >= 0 ? 'positive' : 'negative'}`}>
                              <strong>{formatM(totalSalesVariance)}</strong>
                            </td>
                            <td className="pct-cell">
                              <VarianceBadge 
                                value={totalSalesBudget !== 0 ? (totalSalesVariance / totalSalesBudget) * 100 : 0} 
                                type="cost" 
                              />
                            </td>
                          </tr>
                        )}

                        {marketingCosts.map((row, idx) => (
                          <tr key={`mkt-${idx}`} className={(row.variance ?? 0) < 0 ? 'attention' : ''}>
                            <td className="line-item-cell">{row.lineItem}</td>
                            <td className="team-cell">
                              <span className="team-tag team-marketing">📢 Marketing</span>
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
