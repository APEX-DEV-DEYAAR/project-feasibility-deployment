import { useState, useMemo, useEffect, useCallback } from "react";
import DeyaarLogo from "../components/DeyaarLogo";
import WaterfallChart from "../components/WaterfallChart";
import DonutChart from "../components/DonutChart";
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
  onNavigateToCommercial?: () => void;
  onNavigateToSales?: () => void;
  onNavigateToMarketing?: () => void;
  onNavigateToCollections?: () => void;
  onNavigateToCollectionsForecast?: () => void;
  onNavigateToBudget?: () => void;
  userRole?: UserRole;
  userName?: string;
  onLogout?: () => void;
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
  userRole,
  userName,
  onLogout,
}: ProjectsPageProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "commercial" as UserRole });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserMsg, setAddUserMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [resetPwId, setResetPwId] = useState<number | null>(null);
  const [resetPwValue, setResetPwValue] = useState("");
  const [resetPwLoading, setResetPwLoading] = useState(false);
  const [resetPwMsg, setResetPwMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadUsers = useCallback(async () => {
    if (userRole !== "admin") return;
    try {
      const list = await fetchUsers();
      setUsers(list);
    } catch { /* ignore */ }
  }, [userRole]);

  useEffect(() => {
    if (showAddUser) loadUsers();
  }, [showAddUser, loadUsers]);

  const handleAddUser = async () => {
    if (!newUser.username.trim() || !newUser.password.trim()) {
      setAddUserMsg({ text: "Username and password are required", type: "error" });
      return;
    }
    setAddUserLoading(true);
    setAddUserMsg(null);
    try {
      const created = await registerUser(newUser.username.trim(), newUser.password, newUser.role);
      setAddUserMsg({ text: `User "${created.username}" created with role "${created.role}"`, type: "success" });
      setNewUser({ username: "", password: "", role: "commercial" });
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
          {onNavigateToCommercial && (
            <button className="btn btn-ghost" onClick={onNavigateToCommercial} title="Commercial Team Cost Tracking">
              Commercial
            </button>
          )}
          {onNavigateToSales && (
            <button className="btn btn-ghost" onClick={onNavigateToSales} title="Sales Team Portal">
              Sales
            </button>
          )}
          {onNavigateToMarketing && (
            <button className="btn btn-ghost" onClick={onNavigateToMarketing} title="Marketing Team Portal">
              Marketing
            </button>
          )}
          {onNavigateToCollections && (
            <button className="btn btn-ghost" onClick={onNavigateToCollections} title="Collections Team Portal">
              Collections
            </button>
          )}
          {onNavigateToCollectionsForecast && (
            <button className="btn btn-ghost" onClick={onNavigateToCollectionsForecast} title="Collections Forecast System">
              Collections Forecast
            </button>
          )}
          {onNavigateToBudget && (
            <button className="btn btn-ghost" onClick={onNavigateToBudget} title="Budget vs Actuals">
              Budget vs Actuals
            </button>
          )}
          <span className="topbar-tag">Feasibility Portfolio</span>
          {userName && (
            <span className="topbar-tag" style={{ textTransform: "capitalize" }}>{userName}{userRole ? ` (${userRole})` : ""}</span>
          )}
          {userRole === "admin" && (
            <button className="btn btn-ghost" onClick={() => setShowAddUser(true)} title="Add User">
              + Add User
            </button>
          )}
          <button className="btn btn-ghost btn-icon" onClick={onRefresh} disabled={loading} title="Refresh">
            ↻
          </button>
          {onLogout && (
            <button className="btn btn-ghost" onClick={onLogout} title="Sign out" style={{ color: "#f87171" }}>
              Sign Out
            </button>
          )}
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

      {/* Admin User Management Modal */}
      {showAddUser && (
        <div style={modalStyles.overlay} onClick={() => { setShowAddUser(false); setAddUserMsg(null); setResetPwMsg(null); setResetPwId(null); }}>
          <div style={modalStyles.card} onClick={(e) => e.stopPropagation()}>
            <div style={modalStyles.header}>
              <h3 style={modalStyles.title}>User Management</h3>
              <button style={modalStyles.closeBtn} onClick={() => { setShowAddUser(false); setAddUserMsg(null); setResetPwMsg(null); setResetPwId(null); }}>
                ✕
              </button>
            </div>

            {/* --- Add New User Section --- */}
            <div style={modalStyles.sectionLabel}>Add New User</div>

            {addUserMsg && (
              <div style={{
                ...modalStyles.msg,
                background: addUserMsg.type === "success" ? "#0f291a" : "#451a22",
                color: addUserMsg.type === "success" ? "#86efac" : "#fca5a5",
                border: `1px solid ${addUserMsg.type === "success" ? "#166534" : "#7f1d1d"}`,
              }}>
                {addUserMsg.text}
              </div>
            )}

            <label style={modalStyles.label}>
              Username
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
                style={modalStyles.input}
                autoFocus
                placeholder="Enter username"
              />
            </label>

            <label style={modalStyles.label}>
              Password
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                style={modalStyles.input}
                placeholder="Enter password"
              />
            </label>

            <label style={modalStyles.label}>
              Department / Role
              <select
                value={newUser.role}
                onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                style={modalStyles.input}
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>

            <div style={modalStyles.actions}>
              <button
                style={modalStyles.cancelBtn}
                onClick={() => { setShowAddUser(false); setAddUserMsg(null); setResetPwMsg(null); setResetPwId(null); }}
              >
                Cancel
              </button>
              <button
                style={modalStyles.submitBtn}
                onClick={handleAddUser}
                disabled={addUserLoading}
              >
                {addUserLoading ? "Creating..." : "Create User"}
              </button>
            </div>

            {/* --- Existing Users Section --- */}
            <div style={{ ...modalStyles.divider }} />
            <div style={modalStyles.sectionLabel}>Existing Users</div>

            {resetPwMsg && (
              <div style={{
                ...modalStyles.msg,
                background: resetPwMsg.type === "success" ? "#0f291a" : "#451a22",
                color: resetPwMsg.type === "success" ? "#86efac" : "#fca5a5",
                border: `1px solid ${resetPwMsg.type === "success" ? "#166534" : "#7f1d1d"}`,
              }}>
                {resetPwMsg.text}
              </div>
            )}

            <div style={modalStyles.userList}>
              {users.map((u) => (
                <div key={u.id} style={modalStyles.userRow}>
                  <div style={modalStyles.userInfo}>
                    <span style={modalStyles.userName}>{u.username}</span>
                    <span style={modalStyles.userRole}>{u.role}</span>
                  </div>
                  {resetPwId === u.id ? (
                    <div style={modalStyles.resetForm}>
                      <input
                        type="password"
                        value={resetPwValue}
                        onChange={(e) => setResetPwValue(e.target.value)}
                        style={{ ...modalStyles.input, padding: "6px 10px", fontSize: "13px", flex: 1 }}
                        placeholder="New password"
                        onKeyDown={(e) => e.key === "Enter" && handleResetPassword(u.id)}
                      />
                      <button
                        style={{ ...modalStyles.submitBtn, padding: "6px 12px", fontSize: "12px" }}
                        onClick={() => handleResetPassword(u.id)}
                        disabled={resetPwLoading}
                      >
                        {resetPwLoading ? "..." : "Save"}
                      </button>
                      <button
                        style={{ ...modalStyles.cancelBtn, padding: "6px 10px", fontSize: "12px" }}
                        onClick={() => { setResetPwId(null); setResetPwValue(""); setResetPwMsg(null); }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      style={modalStyles.resetBtn}
                      onClick={() => { setResetPwId(u.id); setResetPwValue(""); setResetPwMsg(null); }}
                    >
                      Reset Password
                    </button>
                  )}
                </div>
              ))}
              {users.length === 0 && (
                <div style={{ color: "#64748b", fontSize: "13px", textAlign: "center" as const, padding: "12px" }}>
                  No users found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  card: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "28px 32px",
    width: "100%",
    maxWidth: "500px",
    maxHeight: "90vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: "#f1f5f9",
    fontSize: "18px",
    fontWeight: 700,
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "18px",
    cursor: "pointer",
    padding: "4px 8px",
  },
  msg: {
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
  },
  label: {
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: 500,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  input: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#f1f5f9",
    fontSize: "14px",
    outline: "none",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "8px",
  },
  cancelBtn: {
    background: "transparent",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 20px",
    color: "#94a3b8",
    fontSize: "14px",
    cursor: "pointer",
  },
  submitBtn: {
    background: "#3b82f6",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  divider: {
    height: "1px",
    background: "#334155",
    margin: "4px 0",
  },
  sectionLabel: {
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  userList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#0f172a",
    borderRadius: "8px",
    padding: "10px 14px",
    gap: "10px",
    flexWrap: "wrap" as const,
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  userName: {
    color: "#f1f5f9",
    fontSize: "14px",
    fontWeight: 500,
  },
  userRole: {
    color: "#64748b",
    fontSize: "12px",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "4px",
    padding: "2px 8px",
    textTransform: "capitalize" as const,
  },
  resetBtn: {
    background: "transparent",
    border: "1px solid #334155",
    borderRadius: "6px",
    padding: "5px 12px",
    color: "#94a3b8",
    fontSize: "12px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  resetForm: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flex: 1,
    minWidth: "200px",
  },
};
