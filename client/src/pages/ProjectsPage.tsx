import { useState, useMemo } from "react";
import DeyaarLogo from "../components/DeyaarLogo";
import WaterfallChart from "../components/WaterfallChart";
import DonutChart from "../components/DonutChart";
import { formatM, formatInt } from "../utils/formatters";
import type { ProjectSummary, FeasibilityMetrics } from "../types";

// Extended project type with metrics for the feasibility portfolio view
interface ProjectWithMetrics extends ProjectSummary {
  metrics?: FeasibilityMetrics;
}

interface ProjectsPageProps {
  projects: ProjectWithMetrics[];
  newProjectName: string;
  setNewProjectName: (name: string) => void;
  loading: boolean;
  status: string;
  onRefresh: () => void;
  onOpenProject: (id: number, name: string) => void;
  onOpenNewProject: () => void;
  onDeleteProject: (id: number, name: string) => void;
  onNewProjectNameChange?: (name: string) => void;
  onNavigateToCommercial?: () => void;
  onNavigateToSales?: () => void;
  onNavigateToMarketing?: () => void;
  onNavigateToCollections?: () => void;
  onNavigateToCollectionsForecast?: () => void;
  onNavigateToBudget?: () => void;
}

export default function ProjectsPage({
  projects,
  newProjectName,
  setNewProjectName,
  loading,
  status,
  onRefresh,
  onOpenProject,
  onOpenNewProject,
  onDeleteProject,
  onNewProjectNameChange,
  onNavigateToCommercial,
  onNavigateToSales,
  onNavigateToMarketing,
  onNavigateToCollections,
  onNavigateToCollectionsForecast,
  onNavigateToBudget,
}: ProjectsPageProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Calculate feasibility portfolio-level metrics
  const portfolioMetrics = useMemo(() => {
    const projectsWithData = projects.filter(p => p.hasFeasibility && p.metrics);
    
    const totalRevenue = projectsWithData.reduce((sum, p) => 
      sum + (p.metrics?.kpis.totalRevenue || 0), 0);
    
    const totalCost = projectsWithData.reduce((sum, p) => 
      sum + (p.metrics?.kpis.totalCost || 0), 0);
    
    const netProfit = projectsWithData.reduce((sum, p) => 
      sum + (p.metrics?.kpis.netProfit || 0), 0);
    
    const totalUnits = projectsWithData.reduce((sum, p) => 
      sum + (p.metrics?.kpis.totalUnits || 0), 0);
    
    const portfolioMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    const avgMargin = projectsWithData.length > 0
      ? projectsWithData.reduce((sum, p) => sum + (p.metrics?.kpis.marginPct || 0), 0) / projectsWithData.length
      : 0;

    return {
      totalProjects: projects.length,
      projectsWithData: projectsWithData.length,
      totalRevenue,
      totalCost,
      netProfit,
      portfolioMargin,
      avgMargin,
      totalUnits,
    };
  }, [projects]);

  const getStatusBadge = (project: ProjectWithMetrics) => {
    if (!project.hasFeasibility) {
      return { text: "NEW", className: "status-new" };
    }
    if (project.status === "frozen") {
      return { text: "FROZEN", className: "status-frozen" };
    }
    return { text: "DRAFT", className: "status-draft" };
  };

  return (
    <div className="app">
      {/* Top Navigation */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">
            <DeyaarLogo size="sm" variant="beige" />
          </div>
          <div className="topbar-divider" />
          <div className="topbar-title">Deyaar Feasibility Portfolio</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={onNavigateToCommercial} title="Commercial Team Cost Tracking">
            Commercial
          </button>
          <button className="btn btn-ghost" onClick={onNavigateToSales} title="Sales Team Portal">
            Sales
          </button>
          <button className="btn btn-ghost" onClick={onNavigateToMarketing} title="Marketing Team Portal">
            Marketing
          </button>
          <button className="btn btn-ghost" onClick={onNavigateToCollections} title="Collections Team Portal">
            Collections
          </button>
          <button className="btn btn-ghost" onClick={onNavigateToCollectionsForecast} title="Collections Forecast System">
            Collections Forecast
          </button>
          <button className="btn btn-ghost" onClick={onNavigateToBudget} title="Budget vs Actuals">
            Budget vs Actuals
          </button>
          <span className="topbar-tag">Feasibility Portfolio</span>
          <button className="btn btn-ghost btn-icon" onClick={onRefresh} disabled={loading} title="Refresh">
            ↻
          </button>
        </div>
      </header>

      <main className="main-content cfo-dashboard">
        {/* Page Header */}
        <div className="dashboard-header">
          <div>
            <h1>Deyaar Feasibility Portfolio</h1>
            <div className="dashboard-meta">
              <span className="badge brown">DEYAAR</span>
              <span className="badge beige">Feasibility Summary</span>
            </div>
          </div>
          <div className="dashboard-header-actions">
            <input
              type="text"
              className="input-field project-name-input"
              placeholder="Enter new project name"
              value={newProjectName}
              onChange={(e) => onNewProjectNameChange?.(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => e.key === "Enter" && onOpenNewProject()}
            />
            <button
              className="btn btn-terra"
              onClick={onOpenNewProject}
              disabled={loading || !newProjectName.trim()}
            >
              + New Project
            </button>
          </div>
        </div>

        {/* PORTFOLIO SUMMARY - Key Metrics */}
        <section className="portfolio-summary">
          <div className="section-label">Feasibility Portfolio Overview</div>
          <div className="metrics-grid six-cols">
            <div className="metric-tile primary">
              <div className="tile-icon">%</div>
              <div className="tile-content">
                <span className="tile-label">Feasibility Margin</span>
                <span className="tile-value">{formatM(portfolioMetrics.portfolioMargin)}%</span>
                <span className="tile-sublabel">Avg: {formatM(portfolioMetrics.avgMargin)}%</span>
              </div>
            </div>
            
            <div className="metric-tile">
              <div className="tile-icon revenue">↓</div>
              <div className="tile-content">
                <span className="tile-label">Total Revenue</span>
                <span className="tile-value">AED {formatM(portfolioMetrics.totalRevenue)}M</span>
                <span className="tile-sublabel">{portfolioMetrics.projectsWithData} projects</span>
              </div>
            </div>
            
            <div className="metric-tile">
              <div className="tile-icon cost">↑</div>
              <div className="tile-content">
                <span className="tile-label">Total Cost</span>
                <span className="tile-value">AED {formatM(portfolioMetrics.totalCost)}M</span>
                <span className="tile-sublabel">Development costs</span>
              </div>
            </div>
            
            <div className="metric-tile profit">
              <div className="tile-icon profit">✓</div>
              <div className="tile-content">
                <span className="tile-label">Net Profit</span>
                <span className="tile-value">AED {formatM(portfolioMetrics.netProfit)}M</span>
                <span className="tile-sublabel">Feasibility portfolio total</span>
              </div>
            </div>

            <div className="metric-tile">
              <div className="tile-icon">⌂</div>
              <div className="tile-content">
                <span className="tile-label">Total Units</span>
                <span className="tile-value">{formatInt(portfolioMetrics.totalUnits)}</span>
                <span className="tile-sublabel">Across feasibility portfolio</span>
              </div>
            </div>

            <div className="metric-tile">
              <div className="tile-icon">📁</div>
              <div className="tile-content">
                <span className="tile-label">Projects</span>
                <span className="tile-value">{portfolioMetrics.totalProjects}</span>
                <span className="tile-sublabel">{portfolioMetrics.projectsWithData} with data</span>
              </div>
            </div>
          </div>
        </section>

        {/* PORTFOLIO VISUALIZATION */}
        <section className="portfolio-visuals">
          <div className="section-label">Feasibility Portfolio Analysis</div>
          <div className="dashboard-grid">
            <div className="dashboard-card wide">
              <div className="card-header">
                <h3>Feasibility Financial Flow</h3>
                <span>Revenue → Cost → Profit</span>
              </div>
              <div className="card-body">
                <WaterfallChart
                  revenue={portfolioMetrics.totalRevenue}
                  cost={portfolioMetrics.totalCost}
                  profit={portfolioMetrics.netProfit}
                />
              </div>
            </div>
            
            <div className="dashboard-card">
              <div className="card-header">
                <h3>Project Status</h3>
                <span>Distribution by phase</span>
              </div>
              <div className="card-body">
                <div className="status-distribution">
                  {(() => {
                    const newCount = projects.filter(p => !p.hasFeasibility).length;
                    const draftCount = projects.filter(p => p.hasFeasibility && p.status === "draft").length;
                    const frozenCount = projects.filter(p => p.status === "frozen").length;
                    const total = projects.length || 1;
                    
                    return (
                      <>
                        <div className="status-bar-item">
                          <div className="status-bar-track">
                            <div className="status-bar-fill new" style={{ width: `${(newCount / total) * 100}%` }} />
                          </div>
                          <div className="status-bar-label">
                            <span>New</span>
                            <strong>{newCount}</strong>
                          </div>
                        </div>
                        <div className="status-bar-item">
                          <div className="status-bar-track">
                            <div className="status-bar-fill draft" style={{ width: `${(draftCount / total) * 100}%` }} />
                          </div>
                          <div className="status-bar-label">
                            <span>Draft</span>
                            <strong>{draftCount}</strong>
                          </div>
                        </div>
                        <div className="status-bar-item">
                          <div className="status-bar-track">
                            <div className="status-bar-fill frozen" style={{ width: `${(frozenCount / total) * 100}%` }} />
                          </div>
                          <div className="status-bar-label">
                            <span>Frozen</span>
                            <strong>{frozenCount}</strong>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-header">
                <h3>Top Performers</h3>
                <span>By profit margin</span>
              </div>
              <div className="card-body">
                <div className="top-performers">
                  {projects
                    .filter(p => p.hasFeasibility && p.metrics)
                    .sort((a, b) => (b.metrics?.kpis.marginPct || 0) - (a.metrics?.kpis.marginPct || 0))
                    .slice(0, 5)
                    .map((project, idx) => (
                      <div key={project.id} className="performer-row">
                        <span className="performer-rank">{idx + 1}</span>
                        <span className="performer-name">{project.name}</span>
                        <span className="performer-margin">{formatM(project.metrics?.kpis.marginPct || 0)}%</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROJECTS TABLE */}
        <section className="projects-portfolio">
          <div className="section-header-row">
            <div>
              <h2>Feasibility Portfolio Projects</h2>
              <span>Detailed financial breakdown by project</span>
            </div>
            <div className="portfolio-totals">
              <span>Total: AED {formatM(portfolioMetrics.totalRevenue)}M Revenue</span>
            </div>
          </div>
          
          {projects.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon">📂</div>
              <p>No projects in the feasibility portfolio</p>
              <span>Create a new project to begin your feasibility analysis</span>
            </div>
          ) : (
            <div className="projects-table-container">
              <div className="tcard">
                <div className="thead thead-cfo">
                  <div className="th">Project Name</div>
                  <div className="th">Status</div>
                  <div className="th">Revenue (AED)</div>
                  <div className="th">Cost (AED)</div>
                  <div className="th">Profit (AED)</div>
                  <div className="th">Margin</div>
                  <div className="th">Units</div>
                  <div className="th">Action</div>
                </div>
                {projects.map((project) => {
                  const statusBadge = getStatusBadge(project);
                  const metrics = project.metrics?.kpis;
                  return (
                    <div key={project.id} className="trow trow-cfo">
                      <div className="td project-name-cell">
                        <button
                          className="project-link"
                          onClick={() => onOpenProject(project.id, project.name)}
                          disabled={loading}
                        >
                          {project.name}
                        </button>
                      </div>
                      <div className="td">
                        <span className={`status-tag ${statusBadge.className}`}>
                          {statusBadge.text}
                        </span>
                      </div>
                      <div className="td revenue-cell">
                        {metrics ? `AED ${formatM(metrics.totalRevenue)}M` : "—"}
                      </div>
                      <div className="td cost-cell">
                        {metrics ? `AED ${formatM(metrics.totalCost)}M` : "—"}
                      </div>
                      <div className={`td profit-cell ${metrics && metrics.netProfit < 0 ? 'negative' : ''}`}>
                        {metrics ? `AED ${formatM(metrics.netProfit)}M` : "—"}
                      </div>
                      <div className="td margin-cell">
                        {metrics ? (
                          <span className={metrics.marginPct >= 0 ? 'positive' : 'negative'}>
                            {formatM(metrics.marginPct)}%
                          </span>
                        ) : "—"}
                      </div>
                      <div className="td units-cell">
                        {metrics ? formatInt(metrics.totalUnits) : "—"}
                      </div>
                      <div className="td action-cell">
                        {confirmDeleteId === project.id ? (
                          <div className="delete-confirm-inline">
                            <button
                              className="btn-confirm-yes"
                              onClick={() => {
                                onDeleteProject(project.id, project.name);
                                setConfirmDeleteId(null);
                              }}
                              disabled={loading}
                            >
                              ✓
                            </button>
                            <button
                              className="btn-confirm-no"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-delete-sm"
                            onClick={() => setConfirmDeleteId(project.id)}
                            disabled={loading}
                            title="Delete project"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="status-bar">
        <div className="status-left">
          <span className="status-dot" />
          <span>{status}</span>
        </div>
        <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </footer>
    </div>
  );
}
