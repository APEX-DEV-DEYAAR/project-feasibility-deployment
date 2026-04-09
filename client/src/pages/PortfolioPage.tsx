import { useEffect, useState } from "react";
import { fetchPortfolio } from "../api/feasibility.api";
import DeyaarLogo from "../components/DeyaarLogo";
import { formatM, formatInt } from "../utils/formatters";
import type { FeasibilityRun } from "../types";

interface PortfolioPageProps {
  onBack: () => void;
  onOpenProject: (id: number, name: string) => void;
}

export default function PortfolioPage({ onBack, onOpenProject }: PortfolioPageProps) {
  const [runs, setRuns] = useState<FeasibilityRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPortfolio()
      .then(setRuns)
      .finally(() => setLoading(false));
  }, []);

  // Totals
  const totals = runs.reduce(
    (acc, r) => {
      const m = r.metrics;
      acc.units += m.kpis.totalUnits;
      acc.revenue += m.revenue.totalInflows;
      acc.cost += m.costs.total;
      acc.profit += m.profitability.netProfit;
      acc.cashProfit += m.profitability.cashProfit;
      return acc;
    },
    { units: 0, revenue: 0, cost: 0, profit: 0, cashProfit: 0 }
  );
  const totalMargin = totals.revenue ? (totals.profit / totals.revenue) * 100 : 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">
            <DeyaarLogo size="sm" variant="beige" />
          </div>
          <div className="topbar-divider" />
          <div className="topbar-title">Deyaar Feasibility Portfolio</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost btn-icon" onClick={onBack} title="Refresh">
            <span style={{ fontSize: "16px" }}>&#x21bb;</span>
          </button>
        </div>
      </header>

      <main className="main-content projects-content">
        <div className="projects-header">
          <h1>Deyaar Feasibility Portfolio</h1>
          <div className="project-meta-row">
            <span className="status-badge version-badge">DEYAAR</span>
            <span className="status-badge date-badge">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* KPI Summary */}
        <section className="metrics-section primary-metrics">
          <div className="section-label">Feasibility Portfolio Summary</div>
          <div className="metrics-grid four-cols">
            <div className="metric-tile primary">
              <div className="tile-icon">%</div>
              <div className="tile-content">
                <span className="tile-label">Feasibility Margin</span>
                <span className="tile-value">{formatM(totalMargin)}%</span>
                <span className="tile-sublabel">{runs.length} project(s)</span>
              </div>
            </div>
            <div className="metric-tile">
              <div className="tile-icon revenue">&darr;</div>
              <div className="tile-content">
                <span className="tile-label">Total Revenue</span>
                <span className="tile-value">AED {formatM(totals.revenue)}M</span>
                <span className="tile-sublabel">{formatInt(totals.units)} total units</span>
              </div>
            </div>
            <div className="metric-tile">
              <div className="tile-icon cost">&uarr;</div>
              <div className="tile-content">
                <span className="tile-label">Total Cost</span>
                <span className="tile-value">AED {formatM(totals.cost)}M</span>
                <span className="tile-sublabel">All projects combined</span>
              </div>
            </div>
            <div className="metric-tile profit">
              <div className="tile-icon profit">&check;</div>
              <div className="tile-content">
                <span className="tile-label">Total Net Profit</span>
                <span className="tile-value">AED {formatM(totals.profit)}M</span>
                <span className="tile-sublabel">Cash: AED {formatM(totals.cashProfit)}M</span>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="tables-section">
          <div className="data-table-block">
            <div className="table-header">
              <h4>Project Comparison</h4>
              <span>Revenue, cost and profit by project</span>
            </div>
            <div className="table-container">
              <div className="tcard">
                <div className="thead portfolio-thead">
                  <div className="th">Project</div>
                  <div className="th">Status</div>
                  <div className="th">Units</div>
                  <div className="th">Total Revenue</div>
                  <div className="th">Total Cost</div>
                  <div className="th">Net Profit</div>
                  <div className="th">Margin</div>
                  <div className="th">Cash Profit</div>
                </div>
                {loading ? (
                  <div className="trow" style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                    Loading...
                  </div>
                ) : runs.length === 0 ? (
                  <div className="trow" style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                    No projects with feasibility data
                  </div>
                ) : (
                  <>
                    {runs.map((run) => {
                      const m = run.metrics;
                      const name = (run.payload as { projectName?: string }).projectName || `Project ${run.projectId}`;
                      return (
                        <div key={run.id} className="trow portfolio-trow">
                          <div className="td">
                            <button
                              className="project-link"
                              onClick={() => onOpenProject(Number(run.projectId), name)}
                            >
                              {name}
                            </button>
                          </div>
                          <div className="td">
                            <span className={`status-tag ${run.status === "frozen" ? "status-frozen" : "status-draft"}`}>
                              {run.status === "frozen" ? "FROZEN" : "DRAFT"}
                            </span>
                          </div>
                          <div className="td">{formatInt(m.kpis.totalUnits)}</div>
                          <div className="td">AED {formatM(m.revenue.totalInflows)}M</div>
                          <div className="td">AED {formatM(m.costs.total)}M</div>
                          <div className="td portfolio-profit">AED {formatM(m.profitability.netProfit)}M</div>
                          <div className="td">{formatM(m.profitability.marginPct)}%</div>
                          <div className="td">AED {formatM(m.profitability.cashProfit)}M</div>
                        </div>
                      );
                    })}
                    <div className="trow portfolio-trow portfolio-total">
                      <div className="td"><strong>TOTAL</strong></div>
                      <div className="td"></div>
                      <div className="td"><strong>{formatInt(totals.units)}</strong></div>
                      <div className="td"><strong>AED {formatM(totals.revenue)}M</strong></div>
                      <div className="td"><strong>AED {formatM(totals.cost)}M</strong></div>
                      <div className="td portfolio-profit"><strong>AED {formatM(totals.profit)}M</strong></div>
                      <div className="td"><strong>{formatM(totalMargin)}%</strong></div>
                      <div className="td"><strong>AED {formatM(totals.cashProfit)}M</strong></div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Revenue Breakdown - projects as rows */}
        <section className="tables-section">
          <div className="data-table-block">
            <div className="table-header">
              <h4>Revenue Breakdown (AED Mn)</h4>
              <span>Inflows by project</span>
            </div>
            <div className="table-container" style={{ overflowX: "auto" }}>
              <div className="tcard">
                <div className="trow pivot-thead">
                  <div className="td pivot-label"><strong>Project</strong></div>
                  {REVENUE_COLS.map((c) => <div key={c.key} className="td pivot-val"><strong>{c.label}</strong></div>)}
                </div>
                {runs.map((run) => {
                  const m = run.metrics;
                  const name = (run.payload as { projectName?: string }).projectName || `Project ${run.projectId}`;
                  return (
                    <div key={run.id} className="trow pivot-row">
                      <div className="td pivot-label">
                        <button className="project-link" onClick={() => onOpenProject(Number(run.projectId), name)}>{name}</button>
                      </div>
                      <div className="td pivot-val">{formatM(m.revenue.grossResi)}</div>
                      <div className="td pivot-val deduction">({formatM(m.revenue.cofOnSales)})</div>
                      <div className="td pivot-val">{formatM(m.revenue.netResi)}</div>
                      <div className="td pivot-val">{formatM(m.revenue.retail)}</div>
                      <div className="td pivot-val">{formatM(m.revenue.carParkIncome)}</div>
                      <div className="td pivot-val pivot-total">{formatM(m.revenue.totalInflows)}</div>
                    </div>
                  );
                })}
                <PivotTotalRow runs={runs} cols={REVENUE_COLS} />
              </div>
            </div>
          </div>
        </section>

        {/* Cost Breakdown - projects as rows */}
        <section className="tables-section">
          <div className="data-table-block">
            <div className="table-header">
              <h4>Cost Breakdown (AED Mn)</h4>
              <span>Outflows by project</span>
            </div>
            <div className="table-container" style={{ overflowX: "auto" }}>
              <div className="tcard">
                <div className="trow pivot-thead">
                  <div className="td pivot-label"><strong>Project</strong></div>
                  {COST_COLS.map((c) => <div key={c.key} className="td pivot-val"><strong>{c.label}</strong></div>)}
                </div>
                {runs.map((run) => {
                  const m = run.metrics;
                  const name = (run.payload as { projectName?: string }).projectName || `Project ${run.projectId}`;
                  return (
                    <div key={run.id} className="trow pivot-row">
                      <div className="td pivot-label">
                        <button className="project-link" onClick={() => onOpenProject(Number(run.projectId), name)}>{name}</button>
                      </div>
                      <div className="td pivot-val">{formatM(m.costs.land)}</div>
                      <div className="td pivot-val">{formatM(m.costs.construction)}</div>
                      <div className="td pivot-val">{formatM(m.costs.soft)}</div>
                      <div className="td pivot-val">{formatM(m.costs.statutory)}</div>
                      <div className="td pivot-val">{formatM(m.costs.contingency)}</div>
                      <div className="td pivot-val">{formatM(m.costs.cof)}</div>
                      <div className="td pivot-val">{formatM(m.costs.salesExpense)}</div>
                      <div className="td pivot-val">{formatM(m.costs.marketing)}</div>
                      <div className="td pivot-val pivot-total">{formatM(m.costs.total)}</div>
                    </div>
                  );
                })}
                <PivotTotalRow runs={runs} cols={COST_COLS} />
              </div>
            </div>
          </div>
        </section>

        {/* Profitability - projects as rows */}
        <section className="tables-section">
          <div className="data-table-block">
            <div className="table-header">
              <h4>Profitability (AED Mn)</h4>
              <span>Profit and margins by project</span>
            </div>
            <div className="table-container" style={{ overflowX: "auto" }}>
              <div className="tcard">
                <div className="trow pivot-thead">
                  <div className="td pivot-label"><strong>Project</strong></div>
                  {PROFIT_COLS.map((c) => <div key={c.key} className="td pivot-val"><strong>{c.label}</strong></div>)}
                </div>
                {runs.map((run) => {
                  const m = run.metrics;
                  const name = (run.payload as { projectName?: string }).projectName || `Project ${run.projectId}`;
                  return (
                    <div key={run.id} className="trow pivot-row">
                      <div className="td pivot-label">
                        <button className="project-link" onClick={() => onOpenProject(Number(run.projectId), name)}>{name}</button>
                      </div>
                      <div className="td pivot-val">{formatM(m.revenue.totalInflows)}</div>
                      <div className="td pivot-val">{formatM(m.costs.total)}</div>
                      <div className="td pivot-val pivot-profit">{formatM(m.profitability.netProfit)}</div>
                      <div className="td pivot-val">{formatM(m.profitability.marginPct)}%</div>
                      <div className="td pivot-val pivot-profit">{formatM(m.profitability.cashProfit)}</div>
                      <div className="td pivot-val">{formatM(m.profitability.cashMarginPct)}%</div>
                    </div>
                  );
                })}
                <PivotTotalRow runs={runs} cols={PROFIT_COLS} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="status-bar">
        <div className="status-left">
          <span className="status-dot" />
          <span>{loading ? "Loading feasibility portfolio..." : `${runs.length} project(s)`}</span>
        </div>
        <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </footer>
    </div>
  );
}

// Column definitions for pivot tables
interface ColDef {
  key: string;
  label: string;
  extract: (m: FeasibilityRun["metrics"]) => number;
  pct?: boolean;
}

const REVENUE_COLS: ColDef[] = [
  { key: "grossResi", label: "Gross Sales", extract: (m) => m.revenue.grossResi },
  { key: "cofOnSales", label: "CoF on Sales", extract: (m) => m.revenue.cofOnSales },
  { key: "netResi", label: "Net Resi", extract: (m) => m.revenue.netResi },
  { key: "retail", label: "Retail", extract: (m) => m.revenue.retail },
  { key: "carPark", label: "Car Park", extract: (m) => m.revenue.carParkIncome },
  { key: "total", label: "Total Inflows", extract: (m) => m.revenue.totalInflows },
];

const COST_COLS: ColDef[] = [
  { key: "land", label: "Land", extract: (m) => m.costs.land },
  { key: "cc", label: "Hard Cost", extract: (m) => m.costs.construction },
  { key: "soft", label: "Soft", extract: (m) => m.costs.soft },
  { key: "stat", label: "Statutory", extract: (m) => m.costs.statutory },
  { key: "cont", label: "Contingency", extract: (m) => m.costs.contingency },
  { key: "cof", label: "COF", extract: (m) => m.costs.cof },
  { key: "se", label: "Sales Exp", extract: (m) => m.costs.salesExpense },
  { key: "mk", label: "Marketing", extract: (m) => m.costs.marketing },
  { key: "total", label: "Total Costs", extract: (m) => m.costs.total },
];

const PROFIT_COLS: ColDef[] = [
  { key: "rev", label: "Revenue", extract: (m) => m.revenue.totalInflows },
  { key: "cost", label: "Cost", extract: (m) => m.costs.total },
  { key: "np", label: "Net Profit", extract: (m) => m.profitability.netProfit },
  { key: "margin", label: "Margin", extract: (m) => m.profitability.marginPct, pct: true },
  { key: "cp", label: "Cash Profit", extract: (m) => m.profitability.cashProfit },
  { key: "cm", label: "Cash Margin", extract: (m) => m.profitability.cashMarginPct, pct: true },
];

function PivotTotalRow({ runs, cols }: { runs: FeasibilityRun[]; cols: ColDef[] }) {
  return (
    <div className="trow pivot-row pivot-total-row">
      <div className="td pivot-label"><strong>TOTAL</strong></div>
      {cols.map((col) => {
        const sum = runs.reduce((acc, r) => acc + col.extract(r.metrics), 0);
        const val = col.pct ? (runs.length ? sum / runs.length : 0) : sum;
        return (
          <div key={col.key} className="td pivot-val">
            <strong>{formatM(val)}{col.pct ? "%" : ""}</strong>
          </div>
        );
      })}
    </div>
  );
}
