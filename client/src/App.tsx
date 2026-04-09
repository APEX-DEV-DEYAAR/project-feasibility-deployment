import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchProjects,
  createProject,
  deleteProject,
  fetchFeasibility,
  saveDraft,
  freezeFeasibility,
  editFrozenFeasibility,
  fetchArchive,
  fetchPortfolio,
  saveOverrides as apiSaveOverrides,
} from "./api/feasibility.api";
import { logout as apiLogout } from "./api/auth.api";
import {
  calculateMetrics,
  emptyInputModel,
  emptyModel,
  hydrateModelFromRun,
  serializeModelForSave,
  applyOverrides,
} from "./utils/calculations";
import { useMobile } from "./hooks/useMobile";
import Toast from "./components/Toast";
import ProjectsPage from "./pages/ProjectsPage";
import LoginPage from "./pages/LoginPage";
import type { ClientModel, ProjectSummary, ArchivedRun, FeasibilityMetrics, AuthUser, UserRole, MetricOverride } from "./types";

const FeasibilityPage = lazy(() => import("./pages/FeasibilityPage"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
const CommercialTeamPage = lazy(() => import("./pages/CommercialTeamPage"));
const SalesTeamPage = lazy(() => import("./pages/SalesTeamPage"));
const MarketingTeamPage = lazy(() => import("./pages/MarketingTeamPage"));
const CollectionsTeamPage = lazy(() => import("./pages/CollectionsTeamPage"));
const CollectionsForecastPage = lazy(() => import("./pages/CollectionsForecastPage"));
const SalesTrackingPage = lazy(() => import("./pages/SalesTrackingPage"));
const BudgetVsActualsPage = lazy(() => import("./pages/BudgetVsActualsPage"));
const BudgetAnalysisPage = lazy(() => import("./pages/BudgetAnalysisPage"));

// Extended project type with metrics for the feasibility portfolio dashboard
interface ProjectWithMetrics extends ProjectSummary {
  metrics?: FeasibilityMetrics;
}

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

// ---- Role-based screen access ----
// admin sees everything, other roles see specific screens
const ROLE_SCREENS: Record<UserRole, Set<string>> = {
  admin: new Set(["projects", "feasibility", "portfolio", "commercial", "salesTracking", "sales", "marketing", "collections", "collectionsForecast", "budget"/*, "budgetAnalysis"*/]),
  commercial: new Set([ "commercial"]),
  sales: new Set(["sales", "salesTracking"]),
  collections: new Set(["collections"]),
  finance: new Set(["marketing","commercial"]),
  marketing : new Set(["marketing"]),
  cfo : new Set(["projects", "feasibility", "portfolio", "budget"/*, "budgetAnalysis"*/]),
  business_development : new Set(["projects", "feasibility"])
};

function canAccessSingle(role: UserRole, screen: string): boolean {
  return ROLE_SCREENS[role]?.has(screen) ?? false;
}

function canAccess(roles: UserRole[], screen: string): boolean {
  return roles.some((r) => canAccessSingle(r, screen));
}

const SCREEN_LABELS: Record<string, string> = {
  projects: "Portfolio",
  feasibility: "Feasibility",
  portfolio: "Portfolio Overview",
  commercial: "Commercial",
  sales: "Sales",
  salesTracking: "Sales Tracking",
  marketing: "Marketing",
  collections: "Collections",
  collectionsForecast: "Collections Forecast",
  budget: "Budget vs Actuals",
  budgetAnalysis: "Budget Analysis",
};

function SidebarIcon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    projects: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    commercial: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /><path d="M9 18v.01" />
      </svg>
    ),
    sales: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    salesTracking: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    marketing: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    collections: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    collectionsForecast: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
    budget: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    budgetAnalysis: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="11" y1="8" x2="11" y2="14" />
      </svg>
    ),
  };
  return icons[name] || null;
}

// ---- Restore session from localStorage ----
function loadSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old sessions that stored `role` (string) to `roles` (array)
      if (parsed && !parsed.roles && parsed.role) {
        parsed.roles = [parsed.role];
        delete parsed.role;
        localStorage.setItem("user", JSON.stringify(parsed));
      }
      return parsed as AuthUser;
    }
  } catch { /* ignore */ }
  return null;
}

export default function App() {
  // Auth state
  const [authUser, setAuthUser] = useState<AuthUser | null>(loadSession());

  const handleLogin = useCallback((user: AuthUser) => {
    localStorage.setItem("user", JSON.stringify(user));
    setAuthUser(user);
  }, []);

  const handleLogout = useCallback(async () => {
    await apiLogout();
    localStorage.removeItem("user");
    setAuthUser(null);
  }, []);

  // Listen for forced logout from the API client (401)
  useEffect(() => {
    const onForceLogout = () => handleLogout();
    window.addEventListener("auth:logout", onForceLogout);
    return () => window.removeEventListener("auth:logout", onForceLogout);
  }, [handleLogout]);

  // If not authenticated, show login
  if (!authUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <AuthenticatedApp user={authUser} onLogout={handleLogout} />
  );
}

// ---- The main app, shown only when logged in ----

// Determine the landing screen for a user's roles — first allowed screen wins
function getDefaultScreen(roles: UserRole[]): "projects" | "feasibility" | "portfolio" | "commercial" | "sales" | "salesTracking" | "marketing" | "collections" | "collectionsForecast" | "budget" | "budgetAnalysis" {
  const screens = ["projects", "commercial", "sales", "marketing", "collections", "collectionsForecast", "budget"] as const;
  for (const s of screens) {
    if (canAccess(roles, s)) return s;
  }
  return "projects";
}

function AuthenticatedApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [screen, setScreen] = useState<"projects" | "feasibility" | "portfolio" | "commercial" | "sales" | "salesTracking" | "marketing" | "collections" | "collectionsForecast" | "budget" | "budgetAnalysis">(getDefaultScreen(user.roles));
  const [projects, setProjects] = useState<ProjectWithMetrics[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [model, setModel] = useState<ClientModel>(emptyModel());
  const [archive, setArchive] = useState<ArchivedRun[]>([]);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeSection, setActiveSection] = useState("Project");
  const [pendingAddUser, setPendingAddUser] = useState(false);

  const mobile = useMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Build the list of sidebar nav items the user can access
  const sidebarItems = useMemo(() => {
    const order: (typeof screen)[] = ["projects", "commercial", "sales", "salesTracking", "marketing", "collections", "collectionsForecast", "budget"];
    return order.filter((s) => canAccess(user.roles, s));
  }, [user.roles]);

  function getNavButtons(currentScreen: string) {
    if (canAccess(user.roles, "projects")) return undefined; // user has "Back to Portfolio"
    const buttons = Object.entries(SCREEN_LABELS)
      .filter(([s]) => s !== currentScreen && canAccess(user.roles, s))
      .map(([s, label]) => ({ label, onClick: () => setScreen(s as typeof screen) }));
    return buttons.length > 0 ? buttons : undefined;
  }

  // Guard: if the current screen is not allowed for this role, redirect to default
  useEffect(() => {
    if (!canAccess(user.roles, screen)) {
      setScreen(getDefaultScreen(user.roles));
    }
  }, [screen, user.roles]);

  const metrics = useMemo(() => calculateMetrics(model), [model]);
  const displayMetrics = useMemo(
    () => applyOverrides(metrics, model.overrides || []),
    [metrics, model.overrides]
  );
  const shareTotal = useMemo(
    () => model.partners.reduce((sum, p) => sum + (Number(p.share) || 0), 0),
    [model.partners]
  );
  const shareValid = Math.abs(shareTotal - 100) < 0.01;
  const isFrozen = model.status === "frozen";

  const addToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };
  const removeToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // ---- Projects ----

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchProjects();
      const enrichedProjects = await enrichProjectsWithMetrics(data);
      setProjects(enrichedProjects);
      setStatus(`Loaded ${data.length} project(s)`);
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const enrichProjectsWithMetrics = async (projects: ProjectSummary[]): Promise<ProjectWithMetrics[]> => {
    const portfolioRuns = await fetchPortfolio();
    const runMap = new Map(portfolioRuns.map((run) => [Number(run.projectId), run]));

    return projects.map((project) => {
      const run = runMap.get(project.id);
      if (run) {
        return { ...project, metrics: run.metrics };
      }
      return project;
    });
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const openProject = async (projectId: number, projectName: string) => {
    if (!canAccess(user.roles, "feasibility")) return;
    setLoading(true);
    try {
      const run = await fetchFeasibility(projectId);
      if (run) {
        setModel(
          hydrateModelFromRun({
            runId: Number(run.id),
            projectId,
            projectName,
            version: run.version,
            status: run.status,
            payload: run.payload as unknown as Record<string, unknown>,
            overrides: run.overrides,
          })
        );
      } else {
        setModel(emptyModel(projectName, projectId));
      }

      const arch = await fetchArchive(projectId);
      setArchive(arch);

      setScreen("feasibility");
      setStatus(`Opened ${projectName}`);
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const openNewProject = async () => {
    if (!canAccess(user.roles, "feasibility")) return;
    const name = newProjectName.trim();
    if (!name) {
      setStatus("Enter a project name to continue");
      addToast("Enter a project name to continue", "error");
      return;
    }
    setLoading(true);
    try {
      const project = await createProject(name);
      setModel(emptyModel(project.name, project.id));
      setArchive([]);
      setScreen("feasibility");
      setNewProjectName("");
      setStatus(`New project: ${project.name}`);
      addToast(`New project created: ${project.name}`);
    } catch (error) {
      setStatus((error as Error).message);
      addToast((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: number, projectName: string) => {
    setLoading(true);
    try {
      await deleteProject(projectId);
      addToast(`Deleted project: ${projectName}`);
      await loadProjects();
    } catch (error) {
      setStatus((error as Error).message);
      addToast((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ---- Feasibility ----

  const onInputChange = (key: string, value: string) => {
    if (isFrozen) return;
    setModel((prev) => ({ ...prev, input: { ...prev.input, [key]: value } }));
  };

  const onPartnerChange = (index: number, key: string, value: string) => {
    if (isFrozen) return;
    setModel((prev) => ({
      ...prev,
      partners: prev.partners.map((p, i) => (i === index ? { ...p, [key]: value } : p)),
    }));
  };

  const addPartner = () => {
    if (isFrozen) return;
    const remaining = Math.max(0, 100 - shareTotal);
    setModel((prev) => ({
      ...prev,
      partners: [...prev.partners, { name: `Partner ${prev.partners.length + 1}`, share: String(remaining) }],
    }));
  };

  const removePartner = (index: number) => {
    if (isFrozen || model.partners.length <= 1) return;
    setModel((prev) => ({ ...prev, partners: prev.partners.filter((_, i) => i !== index) }));
  };

  const resetFields = () => {
    if (isFrozen) return;
    setModel((prev) => ({ ...prev, input: emptyInputModel(), partners: [{ name: "", share: "" }] }));
    setStatus("Input fields cleared");
    addToast("Fields reset to defaults", "success");
  };

  const save = async () => {
    if (!model.projectId) return;
    setLoading(true);
    try {
      const payload = serializeModelForSave(model);
      if (!(payload.projectName as string)) throw new Error("Project name is required");
      const run = await saveDraft(model.projectId, payload);
      setModel((prev) => ({ ...prev, runId: run.id, version: run.version, status: run.status }));
      setStatus(run.version ? `Saved draft for v${run.version}` : "Saved draft");
      addToast(run.version ? `Saved draft for v${run.version}` : "Saved draft");
    } catch (error) {
      setStatus((error as Error).message);
      addToast((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const freeze = async () => {
    if (!model.projectId) return;
    setLoading(true);
    try {
      const run = await freezeFeasibility(model.projectId);
      setModel((prev) => ({ ...prev, runId: run.id, version: run.version, status: "frozen" }));
      setStatus(`Frozen v${run.version}`);
      addToast(`Feasibility v${run.version} frozen`);
    } catch (error) {
      setStatus((error as Error).message);
      addToast((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const editFrozen = async () => {
    if (!model.projectId) return;
    setLoading(true);
    try {
      const run = await editFrozenFeasibility(model.projectId);
      setModel(
        hydrateModelFromRun({
          runId: Number(run.id),
          projectId: model.projectId,
          projectName: model.projectName,
          version: run.version,
          status: run.status,
          payload: run.payload as unknown as Record<string, unknown>,
          overrides: run.overrides,
        })
      );
      const arch = await fetchArchive(model.projectId);
      setArchive(arch);
      setStatus("Editing a new draft from the latest frozen feasibility");
      addToast("Latest frozen version archived; draft reopened");
    } catch (error) {
      setStatus((error as Error).message);
      addToast((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOverride = useCallback(async (override: MetricOverride) => {
    const newOverrides = [
      ...(model.overrides || []).filter((o) => o.metricKey !== override.metricKey),
      override,
    ];
    setModel((prev) => ({ ...prev, overrides: newOverrides }));
    if (model.projectId) {
      try {
        await apiSaveOverrides(model.projectId, newOverrides);
        addToast("Override saved");
      } catch (error) {
        addToast((error as Error).message, "error");
      }
    }
  }, [model.projectId, model.overrides]);

  const handleRemoveOverride = useCallback(async (metricKey: string) => {
    const newOverrides = (model.overrides || []).filter((o) => o.metricKey !== metricKey);
    setModel((prev) => ({ ...prev, overrides: newOverrides }));
    if (model.projectId) {
      try {
        await apiSaveOverrides(model.projectId, newOverrides);
        addToast("Override removed");
      } catch (error) {
        addToast((error as Error).message, "error");
      }
    }
  }, [model.projectId, model.overrides]);

  const backToProjects = async () => {
    setScreen(getDefaultScreen(user.roles));
    setArchive([]);
    mobile.closeSidebar();
    await loadProjects();
  };

  const showSidebar = sidebarItems.length > 1;

  const sidebarNav = (
    <nav className="sidebar-nav">
      {sidebarItems.map((s) => (
        <button
          key={s}
          className={`sidebar-nav-item ${screen === s ? "active" : ""}`}
          onClick={() => { setScreen(s); setMobileSidebarOpen(false); }}
        >
          <span className="sidebar-nav-icon"><SidebarIcon name={s} /></span>
          <span className="sidebar-nav-label">{SCREEN_LABELS[s] || s}</span>
        </button>
      ))}
    </nav>
  );

  const pageContent = (
    <>
      {screen === "projects" ? (
        <ProjectsPage
          projects={projects}
          newProjectName={newProjectName}
          setNewProjectName={setNewProjectName}
          loading={loading}
          status={status}
          onRefresh={loadProjects}
          onOpenProject={openProject}
          onOpenNewProject={openNewProject}
          onDeleteProject={handleDeleteProject}
          onNewProjectNameChange={setNewProjectName}
          userRoles={user.roles}
          userName={user.username}
          onLogout={onLogout}
          openAddUser={pendingAddUser}
          onAddUserOpened={() => setPendingAddUser(false)}
        />
      ) : (
        <Suspense fallback={<div className="loading-state">Loading screen...</div>}>
          {screen === "portfolio" ? (
            <PortfolioPage
              onBack={backToProjects}
              onOpenProject={openProject}
            />
          ) : screen === "commercial" ? (
            <CommercialTeamPage
              projects={projects}
              onBack={backToProjects}
              onLogout={!canAccess(user.roles, "projects") ? onLogout : undefined}
              onRefresh={!canAccess(user.roles, "projects") ? loadProjects : undefined}
            />
          ) : screen === "sales" ? (
            <SalesTeamPage
              projects={projects}
              onBack={backToProjects}
              onLogout={!canAccess(user.roles, "projects") ? onLogout : undefined}
              onRefresh={!canAccess(user.roles, "projects") ? loadProjects : undefined}
            />
          ) : screen === "marketing" ? (
            <MarketingTeamPage
              projects={projects}
              onBack={backToProjects}
              onLogout={!canAccess(user.roles, "projects") ? onLogout : undefined}
              onRefresh={!canAccess(user.roles, "projects") ? loadProjects : undefined}
            />
          ) : screen === "collections" ? (
            <CollectionsTeamPage
              projects={projects}
              onBack={backToProjects}
              onLogout={!canAccess(user.roles, "projects") ? onLogout : undefined}
              onRefresh={!canAccess(user.roles, "projects") ? loadProjects : undefined}
            />
          ) : screen === "collectionsForecast" ? (
            <CollectionsForecastPage
              projects={projects}
              onBack={backToProjects}
              onLogout={!canAccess(user.roles, "projects") ? onLogout : undefined}
              onRefresh={!canAccess(user.roles, "projects") ? loadProjects : undefined}
              onNavigateToCollections={canAccess(user.roles, "collections") ? () => setScreen("collections") : undefined}
            />
          ) : screen === "salesTracking" ? (
            <SalesTrackingPage
              projects={projects}
              onBack={backToProjects}
              onLogout={!canAccess(user.roles, "projects") ? onLogout : undefined}
              onRefresh={!canAccess(user.roles, "projects") ? loadProjects : undefined}
              onNavigateToSales={canAccess(user.roles, "sales") ? () => setScreen("sales") : undefined}
            />
          ) : screen === "budgetAnalysis" ? (
            <BudgetAnalysisPage
              projects={projects}
              onBack={backToProjects}
              onLogout={!canAccess(user.roles, "projects") ? onLogout : undefined}
              onRefresh={!canAccess(user.roles, "projects") ? loadProjects : undefined}
            />
          ) : screen === "budget" ? (
            <BudgetVsActualsPage
              projects={projects}
              onBack={backToProjects}
              onLogout={!canAccess(user.roles, "projects") ? onLogout : undefined}
              onRefresh={!canAccess(user.roles, "projects") ? loadProjects : undefined}
            />
          ) : (
            <FeasibilityPage
              model={model}
              metrics={metrics}
              displayMetrics={displayMetrics}
              overrides={model.overrides || []}
              onSaveOverride={handleSaveOverride}
              onRemoveOverride={handleRemoveOverride}
              shareTotal={shareTotal}
              shareValid={shareValid}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              loading={loading}
              status={status}
              archive={archive}
              isMobile={mobile.isMobile}
              sidebarOpen={mobile.sidebarOpen}
              onOpenSidebar={mobile.openSidebar}
              onCloseSidebar={mobile.closeSidebar}
              onInputChange={onInputChange}
              onPartnerChange={onPartnerChange}
              onAddPartner={addPartner}
              onRemovePartner={removePartner}
              onSetProjectName={(v) => { if (!isFrozen) setModel((prev) => ({ ...prev, projectName: v })); }}
              onBack={backToProjects}
              onReset={resetFields}
              onSave={save}
              onFreeze={freeze}
              onEditFrozen={editFrozen}
              readOnly={!user.roles.includes("admin") && !user.roles.includes("business_development")}
            />
          )}
        </Suspense>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar - fixed, starts below the topbar */}
      {showSidebar && !mobile.isMobile && (
        <aside className="global-sidebar">
          <div className="sidebar-section-label">Navigation</div>
          {sidebarNav}
          <div className="sidebar-spacer" />
          <div className="sidebar-divider" />
          <div className="sidebar-footer">
            {user.roles.includes("admin") && (
              <button className="sidebar-nav-item" onClick={() => { setScreen("projects"); setPendingAddUser(true); }}>
                <span className="sidebar-nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                </span>
                <span className="sidebar-nav-label">Add User</span>
              </button>
            )}
            {user.username && (
              <span className="sidebar-user">{user.username}</span>
            )}
            <button className="sidebar-nav-item sidebar-signout" onClick={onLogout}>
              <span className="sidebar-nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <span className="sidebar-nav-label">Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      {/* Mobile sidebar overlay */}
      {showSidebar && mobile.isMobile && mobileSidebarOpen && (
        <div className="global-sidebar-overlay" onClick={() => setMobileSidebarOpen(false)}>
          <aside className="global-sidebar-mobile" onClick={(e) => e.stopPropagation()}>
            {user.username && (
              <div className="sidebar-user" style={{ padding: "16px 14px 4px" }}>{user.username}</div>
            )}
            <div className="sidebar-divider" />
            {sidebarNav}
            <div className="sidebar-spacer" />
            <div className="sidebar-divider" />
            {user.roles.includes("admin") && (
              <button className="sidebar-nav-item" onClick={() => { setScreen("projects"); setPendingAddUser(true); setMobileSidebarOpen(false); }}>
                <span className="sidebar-nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                </span>
                <span className="sidebar-nav-label">Add User</span>
              </button>
            )}
            <button className="sidebar-nav-item sidebar-signout" onClick={onLogout}>
              <span className="sidebar-nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <span className="sidebar-nav-label">Sign Out</span>
            </button>
          </aside>
        </div>
      )}

      <div className={`app-content ${showSidebar && !mobile.isMobile ? 'has-global-sidebar' : ''}`}>
        {/* Mobile hamburger bar */}
        {showSidebar && mobile.isMobile && (
          <header className="topbar">
            <div className="topbar-brand">
              <button className="btn btn-ghost btn-icon mobile-hamburger" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} title="Menu">
                {mobileSidebarOpen ? "\u2715" : "\u2630"}
              </button>
              <div className="topbar-divider" />
              <div className="topbar-title">{SCREEN_LABELS[screen] || "Deyaar"}</div>
            </div>
          </header>
        )}

        {pageContent}
      </div>

      <div className={`loading-overlay ${loading ? "active" : ""}`}>
        <div className="spinner" />
      </div>

      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </>
  );
}
