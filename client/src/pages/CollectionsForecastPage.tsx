import { useEffect, useMemo, useState } from "react";
import DeyaarLogo from "../components/DeyaarLogo";
import CollectionsAgingChart from "../components/CollectionsAgingChart";
import CfoCashflowChart from "../components/CfoCashflowChart";
import RiskDistributionChart from "../components/RiskDistributionChart";
import ExposureBucketChart from "../components/ExposureBucketChart";
import TopOverdueTable from "../components/TopOverdueTable";
import PropertyTypeBreakdownChart from "../components/PropertyTypeBreakdown";
import WeeklyTrendChart from "../components/WeeklyTrendChart";
import {
  fetchCollectionsForecastDashboard,
  fetchCollectionsForecastInstallments,
  fetchCollectionsForecastPortfolioDashboard,
} from "../api/collections-forecast.api";
import type {
  CollectionsForecastDashboard,
  CollectionsInstallment,
  CollectionsPortfolioDashboard,
  ProjectSummary,
} from "../types";
import { formatNumber } from "../utils/formatters";

interface CollectionsForecastPageProps {
  projects: ProjectSummary[];
  onBack: () => void;
  onLogout?: () => void;
  onRefresh?: () => void;
  onNavigateToCollections?: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const RISK_COLORS: Record<string, { bg: string; color: string }> = {
  Low: { bg: "#E8F5E9", color: "#2E7D32" },
  Medium: { bg: "#FFF3E0", color: "#E65100" },
  High: { bg: "#FDECEA", color: "#B71C1C" },
};

export default function CollectionsForecastPage({ projects, onBack, onLogout, onRefresh, onNavigateToCollections }: CollectionsForecastPageProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [rows, setRows] = useState<CollectionsInstallment[]>([]);
  const [dashboard, setDashboard] = useState<CollectionsForecastDashboard | null>(null);
  const [portfolioDashboard, setPortfolioDashboard] = useState<CollectionsPortfolioDashboard | null>(null);
  const [asOf, setAsOf] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  useEffect(() => {
    setLoading(true);
    fetchCollectionsForecastPortfolioDashboard(asOf)
      .then(setPortfolioDashboard)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [asOf]);

  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchCollectionsForecastInstallments(selectedProjectId),
      fetchCollectionsForecastDashboard(selectedProjectId, asOf),
    ])
      .then(([installments, dashboardData]) => {
        setRows(installments);
        setDashboard(dashboardData);
      })
      .catch(() => setError("Failed to load collections forecast data"))
      .finally(() => setLoading(false));
  }, [selectedProjectId, asOf]);

  // Derive CFO-specific computed values
  const atRiskAmount = useMemo(() => {
    const highRisk = dashboard?.riskDistribution?.find((r) => r.risk === "High");
    return highRisk?.amount ?? 0;
  }, [dashboard]);

  const dldEligibleCount = dashboard?.dldTerminationSummary?.eligibleCount ?? 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo"><DeyaarLogo size="sm" variant="beige" /></div>
          <div className="topbar-divider" />
          <div className="topbar-title">CFO Collections Dashboard</div>
        </div>
        <div className="topbar-actions">
          {onLogout || onRefresh ? (
            <>
              {onNavigateToCollections && (
                <button className="btn btn-ghost" onClick={onNavigateToCollections}>
                  Collections Tracking
                </button>
              )}
              {onRefresh && (
                <button className="btn btn-ghost btn-icon" onClick={onRefresh} disabled={loading} title="Refresh">
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
            <button className="btn btn-ghost btn-back" onClick={onBack}><span className="back-arrow">&larr;</span><span className="back-text"> Back to Portfolio</span></button>
          )}
        </div>
      </header>

      <main className="main-content commercial-team-page collections-forecast-page">
        <div className="dashboard-header">
          <div>
            <h1>Collections Forecast &amp; Aging</h1>
            <div className="dashboard-meta">
              <span className="badge brown">DEYAAR</span>
              <span className="badge beige">CFO Dashboard</span>
              {selectedProject && <span className="badge orange">{selectedProject.name}</span>}
            </div>
          </div>
        </div>

        <div className="commercial-controls">
          <div className="control-group">
            <label>Project</label>
            <select
              className="select-field"
              value={selectedProjectId || ""}
              onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">All Projects (Portfolio View)</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label>As Of Date</label>
            <input className="select-field" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </div>
        </div>

        {error && <div className="alert alert-error"><span>!</span> {error}</div>}

        {loading ? (
          <div className="loading-state">Loading collections forecast...</div>
        ) : !selectedProjectId ? (
          /* ========== PORTFOLIO VIEW ========== */
          <>
            {portfolioDashboard && (
              <>
                {/* Portfolio KPI Cards */}
                <section className="cfo-section">
                  <h2 className="cfo-section-title">Portfolio Executive Summary</h2>
                  <div className="collections-summary-grid cfo-kpi-grid">
                    <div className="metric-tile primary">
                      <div className="tile-content">
                        <span className="tile-label">Total Forecast</span>
                        <span className="tile-value">AED {formatNumber(portfolioDashboard.summary.totalForecast)}</span>
                      </div>
                    </div>
                    <div className="metric-tile">
                      <div className="tile-content">
                        <span className="tile-label">Total Collected</span>
                        <span className="tile-value">AED {formatNumber(portfolioDashboard.summary.totalCollected)}</span>
                      </div>
                    </div>
                    <div className="metric-tile">
                      <div className="tile-content">
                        <span className="tile-label">Outstanding</span>
                        <span className="tile-value">AED {formatNumber(portfolioDashboard.summary.totalOutstanding)}</span>
                      </div>
                    </div>
                    <div className="metric-tile profit">
                      <div className="tile-content">
                        <span className="tile-label">Overdue</span>
                        <span className="tile-value">AED {formatNumber(portfolioDashboard.summary.overdueOutstanding)}</span>
                      </div>
                    </div>
                    <div className="metric-tile">
                      <div className="tile-content">
                        <span className="tile-label">Weighted Outstanding</span>
                        <span className="tile-value">AED {formatNumber(portfolioDashboard.summary.weightedOutstanding)}</span>
                      </div>
                    </div>
                    <div className="metric-tile">
                      <div className="tile-content">
                        <span className="tile-label">Efficiency</span>
                        <span className="tile-value">{portfolioDashboard.summary.collectionEfficiencyPct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="metric-tile">
                      <div className="tile-content">
                        <span className="tile-label">Projects</span>
                        <span className="tile-value">{portfolioDashboard.summary.projects}</span>
                      </div>
                    </div>
                    <div className="metric-tile">
                      <div className="tile-content">
                        <span className="tile-label">Avg Probability</span>
                        <span className="tile-value">{portfolioDashboard.summary.averageProbabilityPct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Portfolio Project Breakdown Table */}
                {portfolioDashboard.projects.length > 0 && (
                  <section className="cfo-section">
                    <h2 className="cfo-section-title">Project Breakdown</h2>
                    <div className="collections-chart-card">
                      <div className="cfo-overdue-table-wrapper">
                        <table className="cfo-overdue-table cfo-portfolio-table">
                          <thead>
                            <tr>
                              <th>Project</th>
                              <th className="text-right">Units</th>
                              <th className="text-right">Forecast (AED)</th>
                              <th className="text-right">Collected (AED)</th>
                              <th className="text-right">Outstanding (AED)</th>
                              <th className="text-right">Overdue (AED)</th>
                              <th className="text-right">Efficiency</th>
                              <th className="text-right">Avg Prob.</th>
                              <th>Risk</th>
                            </tr>
                          </thead>
                          <tbody>
                            {portfolioDashboard.projects.map((proj) => {
                              const riskStyle = RISK_COLORS[proj.dominantRisk] ?? RISK_COLORS.Low;
                              return (
                                <tr
                                  key={proj.projectId}
                                  className="cfo-portfolio-row"
                                  onClick={() => setSelectedProjectId(proj.projectId)}
                                >
                                  <td className="cfo-cell-customer">{proj.projectName}</td>
                                  <td className="text-right">{proj.unitCount}</td>
                                  <td className="text-right">{formatNumber(proj.totalForecast)}</td>
                                  <td className="text-right">{formatNumber(proj.totalCollected)}</td>
                                  <td className="text-right cfo-cell-amount">{formatNumber(proj.totalOutstanding)}</td>
                                  <td className="text-right cfo-cell-overdue">{formatNumber(proj.overdueOutstanding)}</td>
                                  <td className="text-right">{proj.efficiencyPct.toFixed(1)}%</td>
                                  <td className="text-right">{proj.averageProbabilityPct.toFixed(1)}%</td>
                                  <td>
                                    <span className="cfo-risk-badge" style={{ background: riskStyle.bg, color: riskStyle.color }}>
                                      {proj.dominantRisk}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                )}

                {portfolioDashboard.projects.length === 0 && (
                  <div className="empty-state-card">
                    <div className="empty-icon">&#128176;</div>
                    <p>No collections forecast data yet</p>
                    <span>Data will appear once installments are populated from the backend</span>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* ========== PROJECT VIEW ========== */
          <>
            {/* Section 1: CFO Executive Summary KPIs */}
            <section className="cfo-section">
              <h2 className="cfo-section-title">Executive Summary</h2>
              <div className="collections-summary-grid cfo-kpi-grid">
                <div className="metric-tile primary">
                  <div className="tile-content">
                    <span className="tile-label">Total Forecast</span>
                    <span className="tile-value">AED {formatNumber(dashboard?.summary.totalForecast ?? 0)}</span>
                  </div>
                </div>
                <div className="metric-tile">
                  <div className="tile-content">
                    <span className="tile-label">Total Collected</span>
                    <span className="tile-value">AED {formatNumber(dashboard?.summary.totalCollected ?? 0)}</span>
                  </div>
                </div>
                <div className="metric-tile">
                  <div className="tile-content">
                    <span className="tile-label">Outstanding</span>
                    <span className="tile-value">AED {formatNumber(dashboard?.summary.totalOutstanding ?? 0)}</span>
                  </div>
                </div>
                <div className="metric-tile profit">
                  <div className="tile-content">
                    <span className="tile-label">Overdue</span>
                    <span className="tile-value">AED {formatNumber(dashboard?.summary.overdueOutstanding ?? 0)}</span>
                  </div>
                </div>
                <div className="metric-tile">
                  <div className="tile-content">
                    <span className="tile-label">Next 90 Days</span>
                    <span className="tile-value">AED {formatNumber(dashboard?.summary.dueNextNinetyDays ?? 0)}</span>
                  </div>
                </div>
                <div className="metric-tile">
                  <div className="tile-content">
                    <span className="tile-label">Efficiency</span>
                    <span className="tile-value">{(dashboard?.summary.collectionEfficiencyPct ?? 0).toFixed(1)}%</span>
                  </div>
                </div>
                <div className={`metric-tile ${dashboard?.dsoMetrics?.trend === "improving" ? "cfo-trend-good" : dashboard?.dsoMetrics?.trend === "worsening" ? "cfo-trend-bad" : ""}`}>
                  <div className="tile-content">
                    <span className="tile-label">
                      DSO (30d)
                      {dashboard?.dsoMetrics?.trend === "improving" && <span className="cfo-trend-arrow good"> &#9660;</span>}
                      {dashboard?.dsoMetrics?.trend === "worsening" && <span className="cfo-trend-arrow bad"> &#9650;</span>}
                    </span>
                    <span className="tile-value">{dashboard?.dsoMetrics?.currentDso?.toFixed(0) ?? "N/A"}</span>
                  </div>
                </div>
                <div className="metric-tile cfo-tile-atrisk">
                  <div className="tile-content">
                    <span className="tile-label">At-Risk (High)</span>
                    <span className="tile-value">AED {formatNumber(atRiskAmount)}</span>
                  </div>
                </div>
                <div className="metric-tile">
                  <div className="tile-content">
                    <span className="tile-label">DLD Eligible</span>
                    <span className="tile-value">{dldEligibleCount} units</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Risk & Exposure */}
            <section className="cfo-section">
              <h2 className="cfo-section-title">Risk &amp; Exposure Analysis</h2>
              <div className="collections-dashboard-grid">
                <RiskDistributionChart data={dashboard?.riskDistribution ?? []} />
                <ExposureBucketChart data={dashboard?.exposureDistribution ?? []} />
              </div>
            </section>

            {/* Section 3: Performance (aging + cashflow) */}
            <section className="cfo-section">
              <h2 className="cfo-section-title">Collections Performance</h2>
              <div className="collections-dashboard-grid">
                <CollectionsAgingChart data={dashboard?.aging ?? []} />
                <CfoCashflowChart data={dashboard?.cashflow ?? []} />
              </div>
            </section>

            {/* Section 4: Weekly Trend + Property Type */}
            <section className="cfo-section">
              <h2 className="cfo-section-title">Trend &amp; Segmentation</h2>
              <div className="collections-dashboard-grid">
                <WeeklyTrendChart data={dashboard?.weeklyTrend ?? []} />
                <PropertyTypeBreakdownChart data={dashboard?.collectionsByPropertyType ?? []} />
              </div>
            </section>

            {/* Section 5: DLD Termination + Top Overdue */}
            <section className="cfo-section">
              <h2 className="cfo-section-title">Critical Exposure</h2>
              {dashboard?.dldTerminationSummary && (
                <div className="cfo-dld-strip">
                  <div className="cfo-dld-item">
                    <span className="cfo-dld-label">DLD Termination Eligible</span>
                    <span className="cfo-dld-value cfo-dld-eligible">
                      {dashboard.dldTerminationSummary.eligibleCount} units &middot; AED {formatNumber(dashboard.dldTerminationSummary.eligibleAmount)}
                    </span>
                  </div>
                  <div className="cfo-dld-item">
                    <span className="cfo-dld-label">Court Cases</span>
                    <span className="cfo-dld-value cfo-dld-court">
                      {dashboard.dldTerminationSummary.courtCount} units &middot; AED {formatNumber(dashboard.dldTerminationSummary.courtAmount)}
                    </span>
                  </div>
                  <div className="cfo-dld-item">
                    <span className="cfo-dld-label">Not Eligible</span>
                    <span className="cfo-dld-value">{dashboard.dldTerminationSummary.notEligibleCount} units</span>
                  </div>
                </div>
              )}
              <TopOverdueTable data={dashboard?.topOverdueUnits ?? []} />
            </section>

            {/* Section 6: Installment Register (read-only) */}
            {rows.length > 0 && (
              <section className="cfo-section">
                <div className="cost-entry-container">
                  <div className="cost-entry-header">
                    <h3>{selectedProject?.name} - Installment Register</h3>
                    <div className="collections-status-strip">
                      {(dashboard?.statusBreakdown ?? []).map((item) => (
                        <span key={item.status} className={`collections-status-pill status-${item.status}`}>
                          {item.status.replace(/_/g, " ")}: {item.count}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="cost-grid-wrapper">
                    <table className="cost-entry-table collections-forecast-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Unit</th>
                          <th>Installment</th>
                          <th>Due Date</th>
                          <th>Forecast (AED)</th>
                          <th>Collected (AED)</th>
                          <th>Status</th>
                          <th>Risk</th>
                          <th>Probability %</th>
                          <th>Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, index) => {
                          const riskStyle = RISK_COLORS[row.riskCategory ?? "Low"] ?? RISK_COLORS.Low;
                          return (
                            <tr key={`${row.id}-${index}`}>
                              <td>{row.customerName || "-"}</td>
                              <td className="cfo-cell-unit">{row.unitRef}</td>
                              <td>{row.installmentLabel}</td>
                              <td>{row.dueDate}</td>
                              <td className="text-right">{formatNumber(row.forecastAmount)}</td>
                              <td className="text-right">{formatNumber(row.collectedAmount)}</td>
                              <td>
                                <span className={`collections-status-pill status-${row.status}`}>
                                  {row.status.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td>
                                <span className="cfo-risk-badge" style={{ background: riskStyle.bg, color: riskStyle.color }}>
                                  {row.riskCategory ?? "Low"}
                                </span>
                              </td>
                              <td className="text-right">{row.probabilityPct}%</td>
                              <td className="text-right collections-outstanding-cell">AED {formatNumber(row.outstandingAmount)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
