import { useState, useMemo, useEffect, useCallback } from "react";
import DeyaarLogo from "../components/DeyaarLogo";
import WaterfallChart from "../components/WaterfallChart";
import { formatM, formatInt } from "../utils/formatters";
import { registerUser, fetchUsers, resetUserPassword } from "../api/auth.api";
import type { UserListItem } from "../api/auth.api";
import type { ProjectSummary, FeasibilityMetrics, UserRole } from "../types";

const AVAILABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "commercial", label: "Commercial" },
  { value: "sales", label: "Sales" },
  { value: "collections", label: "Collections" },
  { value: "finance", label: "Finance" },
  { value: "marketing", label: "Marketing" },
  { value: "business_development", label: "Business Development" },
  { value: "cfo", label: "CFO" },
];

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
  userRoles?: UserRole[];
  userName?: string;
  onLogout?: () => void;
  openAddUser?: boolean;
  onAddUserOpened?: () => void;
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
  userRoles,
  userName,
  onLogout,
  openAddUser,
  onAddUserOpened,
}: ProjectsPageProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", roles: ["commercial"] as UserRole[] });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserMsg, setAddUserMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [resetPwId, setResetPwId] = useState<number | null>(null);
  const [resetPwValue, setResetPwValue] = useState("");
  const [resetPwLoading, setResetPwLoading] = useState(false);
  const [resetPwMsg, setResetPwMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadUsers = useCallback(async () => {
    if (!userRoles?.includes("admin")) return;
    try {
      const list = await fetchUsers();
      setUsers(list);
    } catch { /* ignore */ }
  }, [userRoles]);

  useEffect(() => {
    if (showAddUser) loadUsers();
  }, [showAddUser, loadUsers]);

  useEffect(() => {
    if (openAddUser) {
      setShowAddUser(true);
      onAddUserOpened?.();
    }
  }, [openAddUser, onAddUserOpened]);

  const handleAddUser = async () => {
    if (!newUser.username.trim() || !newUser.password.trim()) {
      setAddUserMsg({ text: "Username and password are required", type: "error" });
      return;
    }
    setAddUserLoading(true);
    setAddUserMsg(null);
    try {
      const created = await registerUser(newUser.username.trim(), newUser.password, newUser.roles);
      setAddUserMsg({ text: `User "${created.username}" created with roles "${created.roles.join(", ")}"`, type: "success" });
      setNewUser({ username: "", password: "", roles: ["commercial"] });
      await loadUsers();
    } catch (err) {
      setAddUserMsg({ text: (err as Error).message, type: "error" });
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleResetPassword = async (userId: number) => {
    if (!resetPwValue.trim()) {
      setResetPwMsg({ text: "New password is required", type: "error" });
      return;
    }
    setResetPwLoading(true);
    setResetPwMsg(null);
    try {
      await resetUserPassword(userId, resetPwValue);
      setResetPwMsg({ text: "Password updated successfully", type: "success" });
      setResetPwValue("");
      setResetPwId(null);
    } catch (err) {
      setResetPwMsg({ text: (err as Error).message, type: "error" });
    } finally {
      setResetPwLoading(false);
    }
  };

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

  const topRevenueProjects = useMemo(() => {
    const ranked = projects
      .filter((project): project is ProjectWithMetrics & { metrics: FeasibilityMetrics } => Boolean(project.hasFeasibility && project.metrics))
      .sort((a, b) => (b.metrics.kpis.totalRevenue || 0) - (a.metrics.kpis.totalRevenue || 0))
      .slice(0, 5);

    const maxRevenue = ranked[0]?.metrics.kpis.totalRevenue || 0;

    return ranked.map((project) => {
      const revenue = project.metrics.kpis.totalRevenue || 0;
      return {
        id: project.id,
        name: project.name,
        revenue,
        widthPct: maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0,
        sharePct: portfolioMetrics.totalRevenue > 0 ? (revenue / portfolioMetrics.totalRevenue) * 100 : 0,
      };
    });
  }, [projects, portfolioMetrics.totalRevenue]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo"><DeyaarLogo size="sm" variant="beige" /></div>
          <div className="topbar-divider" />
          <div className="topbar-title">Deyaar Feasibility Portfolio</div>
        </div>
        <div className="topbar-actions">
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
          {(userRoles?.includes("admin") || userRoles?.includes("business_development")) && (
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
          )}
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
                <h3>Top Revenue Projects</h3>
                <span>Share of portfolio inflows</span>
              </div>
              <div className="card-body">
                {topRevenueProjects.length === 0 ? (
                  <div className="chart-empty-state">
                    No feasibility revenue available yet
                  </div>
                ) : (
                  <div className="portfolio-ranking">
                    {topRevenueProjects.map((project, idx) => (
                      <div key={project.id} className="portfolio-ranking-row">
                        <div className="portfolio-ranking-head">
                          <span className="portfolio-ranking-rank">{idx + 1}</span>
                          <span className="portfolio-ranking-name" title={project.name}>{project.name}</span>
                          <span className="portfolio-ranking-value">AED {formatM(project.revenue)}M</span>
                        </div>
                        <div className="portfolio-ranking-track">
                          <div
                            className="portfolio-ranking-fill"
                            style={{ width: `${project.widthPct}%` }}
                          />
                        </div>
                        <div className="portfolio-ranking-meta">
                          <span>{formatM(project.sharePct)}% of portfolio revenue</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  {userRoles?.includes("admin") && <div className="th">Action</div>}
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
                      {userRoles?.includes("admin") && (
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
                      )}
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

      {/* Admin User Management Modal */}
      {showAddUser && (
        <div className="um-overlay" onClick={() => { setShowAddUser(false); setAddUserMsg(null); setResetPwMsg(null); setResetPwId(null); }}>
          <div className="um-card" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="um-header">
              <div className="um-header-left">
                <div className="um-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                </div>
                <div>
                  <h3 className="um-title">User Management</h3>
                  <p className="um-subtitle">Create accounts and manage access</p>
                </div>
              </div>
              <button className="um-close" onClick={() => { setShowAddUser(false); setAddUserMsg(null); setResetPwMsg(null); setResetPwId(null); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* Add New User Section */}
            <div className="um-section">
              <div className="um-section-label">
                <span className="um-section-dot" />
                New User
              </div>

              {addUserMsg && (
                <div className={`um-msg ${addUserMsg.type}`}>
                  <span className="um-msg-icon">{addUserMsg.type === "success" ? "✓" : "!"}</span>
                  {addUserMsg.text}
                </div>
              )}

              <div className="um-form-grid">
                <label className="um-field">
                  <span className="um-field-label">Username</span>
                  <input
                    type="text"
                    className="um-input"
                    value={newUser.username}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
                    autoFocus
                    placeholder="e.g. john.doe"
                  />
                </label>

                <label className="um-field">
                  <span className="um-field-label">Password</span>
                  <input
                    type="password"
                    className="um-input"
                    value={newUser.password}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Min 6 characters"
                  />
                </label>
              </div>

              <label className="um-field">
                <span className="um-field-label">Department / Roles</span>
                <div className="um-roles-grid">
                  {AVAILABLE_ROLES.map((r) => {
                    const selected = newUser.roles.includes(r.value);
                    return (
                      <button
                        key={r.value}
                        type="button"
                        className={`um-role-chip ${selected ? "selected" : ""}`}
                        onClick={() => {
                          setNewUser((prev) => ({
                            ...prev,
                            roles: selected
                              ? prev.roles.filter((x) => x !== r.value)
                              : [...prev.roles, r.value],
                          }));
                        }}
                      >
                        {selected && <span className="um-role-check">✓</span>}
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </label>

              <div className="um-actions">
                <button
                  className="um-btn um-btn-cancel"
                  onClick={() => { setShowAddUser(false); setAddUserMsg(null); setResetPwMsg(null); setResetPwId(null); }}
                >
                  Cancel
                </button>
                <button
                  className="um-btn um-btn-submit"
                  onClick={handleAddUser}
                  disabled={addUserLoading}
                >
                  {addUserLoading ? (
                    <span className="um-btn-loading" />
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      Create User
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Existing Users Section */}
            <div className="um-section">
              <div className="um-section-label">
                <span className="um-section-dot" />
                Team Directory
                <span className="um-user-count">{users.length}</span>
              </div>

              {resetPwMsg && (
                <div className={`um-msg ${resetPwMsg.type}`}>
                  <span className="um-msg-icon">{resetPwMsg.type === "success" ? "✓" : "!"}</span>
                  {resetPwMsg.text}
                </div>
              )}

              <div className="um-user-list">
                {users.map((u) => (
                  <div key={u.id} className="um-user-row">
                    <div className="um-user-avatar">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="um-user-details">
                      <span className="um-user-name">{u.username}</span>
                      <div className="um-user-roles">
                        {u.roles.map((role) => (
                          <span key={role} className="um-user-role-tag">{role}</span>
                        ))}
                      </div>
                    </div>
                    {resetPwId === u.id ? (
                      <div className="um-reset-form">
                        <input
                          type="password"
                          className="um-input um-input-sm"
                          value={resetPwValue}
                          onChange={(e) => setResetPwValue(e.target.value)}
                          placeholder="New password"
                          onKeyDown={(e) => e.key === "Enter" && handleResetPassword(u.id)}
                          autoFocus
                        />
                        <button className="um-btn um-btn-submit um-btn-sm" onClick={() => handleResetPassword(u.id)} disabled={resetPwLoading}>
                          {resetPwLoading ? "..." : "Save"}
                        </button>
                        <button className="um-btn-icon-close" onClick={() => { setResetPwId(null); setResetPwValue(""); setResetPwMsg(null); }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                    ) : (
                      <button className="um-reset-btn" onClick={() => { setResetPwId(u.id); setResetPwValue(""); setResetPwMsg(null); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        Reset
                      </button>
                    )}
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="um-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" width="32" height="32" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    <span>No team members yet</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
