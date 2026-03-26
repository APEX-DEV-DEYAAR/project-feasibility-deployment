import { useState, useEffect, useMemo } from "react";
import DeyaarLogo from "../components/DeyaarLogo";
import { fetchBudgetVsActuals } from "../api/cost-tracking.api";
import { fetchFeasibility } from "../api/feasibility.api";
import { applyOverrides } from "../utils/calculations";
import { formatM, formatInt } from "../utils/formatters";
import type { ProjectSummary, BudgetVsActualRow, FeasibilityRun, FeasibilityMetrics } from "../types";

interface BudgetAnalysisPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
  onLogout?: () => void;
  onRefresh?: () => void;
}

interface BudgetLineItemDef {
  lineItem: string;
  type: "cost" | "revenue" | "sales";
  team: BudgetVsActualRow["team"];
  getBudget: (metrics: FeasibilityMetrics) => number;
}

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

export default function BudgetAnalysisPage({ projects, onBack, onLogout, onRefresh }: BudgetAnalysisPageProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [data, setData] = useState<BudgetVsActualRow[]>([]);
  const [feasibility, setFeasibility] = useState<FeasibilityRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  useEffect(() => {
    if (selectedProjectId) setReloadKey((k) => k + 1);
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
        setFeasibility(feasData);
      } catch {
        setError("Failed to load budget analysis data");
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [selectedProjectId, reloadKey]);

  const effectiveMetrics = useMemo(() => {
    if (!feasibility?.metrics) return null;
    return applyOverrides(feasibility.metrics, feasibility.overrides ?? []);
  }, [feasibility]);

  // Merge feasibility budgets with tracked actuals
  const mergedData = useMemo(() => {
    const trackedRows = new Map(data.map((row) => [row.lineItem, row]));
    return FEASIBILITY_LINE_ITEMS.map((def) => {
      const row = trackedRows.get(def.lineItem);
      const actual = (row?.actual ?? 0) / 1e6;
      const projected = (row?.projected ?? 0) / 1e6;
      const blended = (row?.blended ?? 0) / 1e6;
      const budget = effectiveMetrics ? def.getBudget(effectiveMetrics) : 0;
      const isInflow = def.type === "revenue" || def.type === "sales";
      const variance = isInflow ? blended - budget : budget - blended;
      const variancePct = budget !== 0 ? (variance / budget) * 100 : 0;
      return { lineItem: def.lineItem, type: def.type, team: def.team, budget, actual, projected, blended, variance, variancePct };
    });
  }, [data, effectiveMetrics]);

  const costRows = mergedData.filter((r) => r.type === "cost" && r.budget > 0);
  const revenueRows = mergedData.filter((r) => r.type === "revenue" && r.budget > 0);

  const totalRevBudget = revenueRows.reduce((s, r) => s + r.budget, 0);
  const totalRevBlended = revenueRows.reduce((s, r) => s + r.blended, 0);
  const totalCostBudget = costRows.reduce((s, r) => s + r.budget, 0);
  const totalCostBlended = costRows.reduce((s, r) => s + r.blended, 0);
  const netProfitBudget = totalRevBudget - totalCostBudget;
  const netProfitBlended = totalRevBlended - totalCostBlended;
  const netProfitVariance = netProfitBlended - netProfitBudget;

  const feasibilityLabel = feasibility
    ? `v${feasibility.version ?? 1} (${feasibility.status})`
    : "No feasibility";

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo"><DeyaarLogo size="sm" variant="beige" /></div>
          <div className="topbar-divider" />
          <div className="topbar-title">Budget Analysis</div>
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
            <button className="btn btn-ghost btn-back" onClick={onBack}>
              <span className="back-arrow">&larr;</span>
              <span className="back-text"> Back to Portfolio</span>
            </button>
          )}
        </div>
      </header>

      <main className="main-content bva-page">
        <div className="bva-header">
          <div className="bva-header-left">
          <h1>Budget Analysis</h1>
            <p className="bva-subtitle">Feasibility overview and actual budget performance</p>
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
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <span className="bva-select-icon">&#x25BC;</span>
            </div>
          </div>
          {selectedProjectId && feasibility && (
            <div className="bva-feasibility-badge">
              <span className="feasibility-icon">&#x1F4CA;</span>
              <div>
                <span className="feasibility-label">Budget Source</span>
                <span className="feasibility-value">Feasibility {feasibilityLabel}</span>
              </div>
            </div>
          )}
        </div>

        {error && <div className="alert alert-error"><span>&#x26A0;</span> {error}</div>}

        {!selectedProjectId ? (
          <div className="bva-empty-state">
            <div className="bva-empty-icon">&#x1F4CA;</div>
            <h3>Select a Project</h3>
            <p>Choose a project from the dropdown above to view budget analysis</p>
          </div>
        ) : loading ? (
          <div className="bva-loading">
            <div className="bva-spinner"></div>
            <span>Loading budget analysis...</span>
          </div>
        ) : !effectiveMetrics ? (
          <div className="bva-empty-state">
            <div className="bva-empty-icon">&#x1F4DD;</div>
            <h3>No Feasibility Data</h3>
            <p>No feasibility study found for this project. Please set up a feasibility study first.</p>
          </div>
        ) : (
          <>
            {/* ── FEASIBILITY OVERVIEW ── */}
            <section className="metrics-section primary-metrics">
              <div className="section-label">Feasibility Overview &mdash; {selectedProject?.name}</div>
              <div className="metrics-grid four-cols">
                <div className="metric-tile primary">
                  <div className="tile-icon">%</div>
                  <div className="tile-content">
                    <span className="tile-label">Feasibility Margin</span>
                    <span className="tile-value">{formatM(effectiveMetrics.profitability.marginPct)}%</span>
                    <span className="tile-sublabel">{formatInt(effectiveMetrics.kpis.totalUnits)} units</span>
                  </div>
                </div>
                <div className="metric-tile">
                  <div className="tile-icon revenue">&darr;</div>
                  <div className="tile-content">
                    <span className="tile-label">Total Revenue</span>
                    <span className="tile-value">AED {formatM(effectiveMetrics.revenue.totalInflows)}M</span>
                    <span className="tile-sublabel">Net Resi: AED {formatM(effectiveMetrics.revenue.netResi)}M</span>
                  </div>
                </div>
                <div className="metric-tile">
                  <div className="tile-icon cost">&uarr;</div>
                  <div className="tile-content">
                    <span className="tile-label">Total Cost</span>
                    <span className="tile-value">AED {formatM(effectiveMetrics.costs.total)}M</span>
                    <span className="tile-sublabel">Incl. COF: AED {formatM(effectiveMetrics.costs.cof)}M</span>
                  </div>
                </div>
                <div className="metric-tile profit">
                  <div className="tile-icon profit">&check;</div>
                  <div className="tile-content">
                    <span className="tile-label">Net Profit</span>
                    <span className="tile-value">AED {formatM(effectiveMetrics.profitability.netProfit)}M</span>
                    <span className="tile-sublabel">Cash: AED {formatM(effectiveMetrics.profitability.cashProfit)}M</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ── ACTUAL BUDGETS ── */}
            <section className="metrics-section primary-metrics" style={{ marginTop: "32px" }}>
              <div className="section-label">Actual Budgets &mdash; {selectedProject?.name}</div>
              <div className="metrics-grid four-cols">
                <div className="metric-tile">
                  <div className="tile-icon revenue">&darr;</div>
                  <div className="tile-content">
                    <span className="tile-label">Collections (Blended)</span>
                    <span className="tile-value">AED {formatM(totalRevBlended)}M</span>
                    <span className="tile-sublabel">Budget: AED {formatM(totalRevBudget)}M</span>
                  </div>
                </div>
                <div className="metric-tile">
                  <div className="tile-icon cost">&uarr;</div>
                  <div className="tile-content">
                    <span className="tile-label">Total Costs (Blended)</span>
                    <span className="tile-value">AED {formatM(totalCostBlended)}M</span>
                    <span className="tile-sublabel">Budget: AED {formatM(totalCostBudget)}M</span>
                  </div>
                </div>
                <div className="metric-tile profit">
                  <div className="tile-icon profit">&check;</div>
                  <div className="tile-content">
                    <span className="tile-label">Net Profit (Blended)</span>
                    <span className="tile-value">AED {formatM(netProfitBlended)}M</span>
                    <span className="tile-sublabel">Budget: AED {formatM(netProfitBudget)}M</span>
                  </div>
                </div>
                <div className={`metric-tile ${netProfitVariance >= 0 ? "profit" : ""}`}>
                  <div className="tile-icon">{netProfitVariance >= 0 ? "+" : "-"}</div>
                  <div className="tile-content">
                    <span className="tile-label">Variance</span>
                    <span className="tile-value">AED {formatM(Math.abs(netProfitVariance))}M</span>
                    <span className="tile-sublabel">
                      {netProfitBudget !== 0
                        ? `${(netProfitVariance / netProfitBudget * 100).toFixed(1)}%`
                        : "N/A"
                      } {netProfitVariance >= 0 ? "Favorable" : "Unfavorable"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ── VISUAL DASHBOARD ── */}
            <section className="dashboard-section" style={{ marginTop: "32px" }}>
              <div className="section-label">Visual Dashboard</div>
              <div className="dashboard-grid no-jv">
                <div className="dashboard-card wide">
                  <div className="card-header">
                    <h3>Financial Waterfall</h3>
                    <span>Budget vs Actuals &mdash; Revenue, Cost, Profit</span>
                  </div>
                  <div className="card-body">
                    {(() => {
                      const budgetProfit = effectiveMetrics.kpis.totalRevenue - effectiveMetrics.kpis.totalCost;
                      const actualProfit = netProfitBlended;
                      const groups = [
                        { label: "Revenue", budget: effectiveMetrics.kpis.totalRevenue, actual: totalRevBlended },
                        { label: "Cost", budget: effectiveMetrics.kpis.totalCost, actual: totalCostBlended },
                        { label: budgetProfit >= 0 && actualProfit >= 0 ? "Profit" : "Profit / Loss", budget: budgetProfit, actual: actualProfit },
                      ];
                      const max = Math.max(
                        ...groups.map((g) => Math.max(Math.abs(g.budget), Math.abs(g.actual))),
                        1
                      ) * 1.12;

                      const barColor = (label: string, value: number) => {
                        if (label === "Revenue") return "linear-gradient(180deg, #FF9800, #F57C00)";
                        if (label === "Cost") return "linear-gradient(180deg, #EF5350, #C62828)";
                        return value >= 0
                          ? "linear-gradient(180deg, #66BB6A, #2E7D32)"
                          : "linear-gradient(180deg, #c65a4b, #8f2d23)";
                      };

                      return (
                        <div className="waterfall" style={{ gap: "24px" }}>
                          {groups.map((g) => (
                            <div key={g.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 1 0", height: "100%" }}>
                              <div style={{ display: "flex", gap: "6px", marginBottom: "8px", fontSize: "10px", fontWeight: 700, color: "var(--espresso)", whiteSpace: "nowrap" }}>
                                <span>{formatM(g.budget)}M</span>
                                <span style={{ color: "var(--brown-mid)" }}>|</span>
                                <span>{formatM(g.actual)}M</span>
                              </div>
                              <div style={{ display: "flex", gap: "6px", alignItems: "flex-end", flex: 1, width: "100%", justifyContent: "center" }}>
                                <div style={{
                                  width: "28px",
                                  borderRadius: "4px 4px 0 0",
                                  background: barColor(g.label, g.budget),
                                  height: `${(Math.abs(g.budget) / max) * 100}%`,
                                  minHeight: "4px",
                                  opacity: 0.55,
                                  transition: "height 0.6s cubic-bezier(.34,1.4,.64,1)",
                                }} />
                                <div style={{
                                  width: "28px",
                                  borderRadius: "4px 4px 0 0",
                                  background: barColor(g.label, g.actual),
                                  height: `${(Math.abs(g.actual) / max) * 100}%`,
                                  minHeight: "4px",
                                  transition: "height 0.6s cubic-bezier(.34,1.4,.64,1)",
                                }} />
                              </div>
                              <div style={{ marginTop: "6px", fontSize: "10px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--brown-mid)" }}>{g.label}</div>
                              <div style={{ display: "flex", gap: "10px", marginTop: "4px", fontSize: "9px", color: "var(--brown-mid)" }}>
                                <span style={{ opacity: 0.55 }}>Budget</span>
                                <span>Actuals</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="dashboard-card">
                  <div className="card-header">
                    <h3>Cost Structure</h3>
                    <span>Budget vs Actual by category</span>
                  </div>
                  <div className="card-body">
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div style={{ flex: 1, fontSize: "11px", fontWeight: 600, color: "var(--brown-mid)" }}>Category</div>
                        <div style={{ width: "70px", textAlign: "right", fontSize: "11px", fontWeight: 600, color: "var(--brown-mid)" }}>Budget</div>
                        <div style={{ width: "70px", textAlign: "right", fontSize: "11px", fontWeight: 600, color: "var(--brown-mid)" }}>Actuals</div>
                      </div>
                      {(() => {
                        const costMap = new Map(costRows.map((r) => [r.lineItem, r]));
                        const items = [
                          { name: "Land Cost", budget: effectiveMetrics.costs.land, lineItem: "Land" },
                          { name: "Hard Cost", budget: effectiveMetrics.costs.construction, lineItem: "Hard Cost" },
                          { name: "Sales Expenses", budget: effectiveMetrics.costs.salesExpense, lineItem: null },
                          { name: "Dev. Mgmt Fee", budget: effectiveMetrics.costs.devMgmt, lineItem: "Development Management" },
                          { name: "Statutory Cost", budget: effectiveMetrics.costs.statutory, lineItem: "Statutory Cost" },
                          { name: "Contingency", budget: effectiveMetrics.costs.contingency, lineItem: "Contingency" },
                          { name: "Soft Costs", budget: effectiveMetrics.costs.soft, lineItem: "Soft Cost" },
                          { name: "Marketing", budget: effectiveMetrics.costs.marketing, lineItem: "Marketing" },
                          { name: "COF incl. Guarantee", budget: effectiveMetrics.costs.cof, lineItem: "Cost of Funds" },
                        ].filter((i) => i.budget > 0);

                        return items.map((item, i) => {
                          const tracked = item.lineItem ? costMap.get(item.lineItem) : null;
                          const blended = tracked?.blended ?? 0;
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center" }}>
                              <div style={{ flex: 1, fontSize: "11px", color: "var(--brown-mid)" }}>{item.name}</div>
                              <div style={{ width: "70px", textAlign: "right", fontSize: "11px", fontWeight: 700, color: "var(--espresso)" }}>{formatM(item.budget)}</div>
                              <div style={{ width: "70px", textAlign: "right", fontSize: "11px", fontWeight: 700, color: "var(--espresso)" }}>{formatM(blended)}</div>
                            </div>
                          );
                        });
                      })()}
                      <div style={{ display: "flex", alignItems: "center", borderTop: "1px solid rgba(201,169,110,0.3)", paddingTop: "10px" }}>
                        <div style={{ flex: 1, fontSize: "11px", fontWeight: 700, color: "var(--espresso)" }}>Total</div>
                        <div style={{ width: "70px", textAlign: "right", fontSize: "11px", fontWeight: 700, color: "var(--espresso)" }}>{formatM(effectiveMetrics.costs.total)}</div>
                        <div style={{ width: "70px", textAlign: "right", fontSize: "11px", fontWeight: 700, color: "var(--espresso)" }}>{formatM(totalCostBlended)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="status-bar">
        <div className="status-left">
          <span className="status-dot" />
          <span>
            {loading
              ? "Loading budget analysis..."
              : selectedProject
                ? `Budget Analysis \u2014 ${selectedProject.name}`
                : "Select a project"}
          </span>
        </div>
        <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </footer>
    </div>
  );
}
