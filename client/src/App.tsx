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
} from "./api/feasibility.api";
import { logout as apiLogout } from "./api/auth.api";
import {
  calculateMetrics,
  emptyInputModel,
  emptyModel,
  hydrateModelFromRun,
  serializeModelForSave,
} from "./utils/calculations";
import { useMobile } from "./hooks/useMobile";
import Toast from "./components/Toast";
import ProjectsPage from "./pages/ProjectsPage";
import LoginPage from "./pages/LoginPage";
import type { ClientModel, ProjectSummary, ArchivedRun, FeasibilityMetrics, AuthUser, UserRole } from "./types";

const FeasibilityPage = lazy(() => import("./pages/FeasibilityPage"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
const CommercialTeamPage = lazy(() => import("./pages/CommercialTeamPage"));
const SalesTeamPage = lazy(() => import("./pages/SalesTeamPage"));
const MarketingTeamPage = lazy(() => import("./pages/MarketingTeamPage"));
const CollectionsTeamPage = lazy(() => import("./pages/CollectionsTeamPage"));
const CollectionsForecastPage = lazy(() => import("./pages/CollectionsForecastPage"));
const BudgetVsActualsPage = lazy(() => import("./pages/BudgetVsActualsPage"));

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
  admin: new Set(["projects", "feasibility", "portfolio", "commercial", "sales", "marketing", "collections", "collectionsForecast", "budget"]),
  commercial: new Set(["projects", "feasibility", "portfolio", "commercial", "budget"]),
  sales: new Set(["sales"]),
  collections: new Set(["collections", "collectionsForecast"]),
  finance: new Set(["projects", "feasibility", "portfolio", "budget"]),
  marketing : new Set(["marketing"]),
  cfo : new Set(["projects", "feasibility", "portfolio", "commercial", "sales", "marketing", "collections", "collectionsForecast", "budget"])
};

function canAccess(role: UserRole, screen: string): boolean {
  return ROLE_SCREENS[role]?.has(screen) ?? false;
}

// ---- Restore session from localStorage ----
function loadSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      return JSON.parse(raw) as AuthUser;
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

// Determine the landing screen for a role — first allowed screen wins
function getDefaultScreen(role: UserRole): "projects" | "feasibility" | "portfolio" | "commercial" | "sales" | "marketing" | "collections" | "collectionsForecast" | "budget" {
  const allowed = ROLE_SCREENS[role];
  if (allowed.has("projects")) return "projects";
  if (allowed.has("sales")) return "sales";
  if (allowed.has("marketing")) return "marketing";
  if (allowed.has("collections")) return "collections";
  if (allowed.has("collectionsForecast")) return "collectionsForecast";
  if (allowed.has("budget")) return "budget";
  return "projects";
}

function AuthenticatedApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [screen, setScreen] = useState<"projects" | "feasibility" | "portfolio" | "commercial" | "sales" | "marketing" | "collections" | "collectionsForecast" | "budget">(getDefaultScreen(user.role));
  const [projects, setProjects] = useState<ProjectWithMetrics[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [model, setModel] = useState<ClientModel>(emptyModel());
  const [archive, setArchive] = useState<ArchivedRun[]>([]);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeSection, setActiveSection] = useState("Project");

  const mobile = useMobile();

  const metrics = useMemo(() => calculateMetrics(model), [model]);
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

  const backToProjects = async () => {
    setScreen(getDefaultScreen(user.role));
    setArchive([]);
    mobile.closeSidebar();
    await loadProjects();
  };

  return (
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
          onNavigateToCommercial={canAccess(user.role, "commercial") ? () => setScreen("commercial") : undefined}
          onNavigateToSales={canAccess(user.role, "sales") ? () => setScreen("sales") : undefined}
          onNavigateToMarketing={canAccess(user.role, "marketing") ? () => setScreen("marketing") : undefined}
          onNavigateToCollections={canAccess(user.role, "collections") ? () => setScreen("collections") : undefined}
          onNavigateToCollectionsForecast={canAccess(user.role, "collectionsForecast") ? () => setScreen("collectionsForecast") : undefined}
          onNavigateToBudget={canAccess(user.role, "budget") ? () => setScreen("budget") : undefined}
          userRole={user.role}
          userName={user.username}
          onLogout={onLogout}
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
            />
          ) : screen === "sales" ? (
            <SalesTeamPage
              projects={projects}
              onBack={backToProjects}
              onLogout={!canAccess(user.role, "projects") ? onLogout : undefined}
              onRefresh={!canAccess(user.role, "projects") ? loadProjects : undefined}
            />
          ) : screen === "marketing" ? (
            <MarketingTeamPage
              projects={projects}
              onBack={backToProjects}
              onLogout={!canAccess(user.role, "projects") ? onLogout : undefined}
              onRefresh={!canAccess(user.role, "projects") ? loadProjects : undefined}
            />
          ) : screen === "collections" ? (
            <CollectionsTeamPage
              projects={projects}
              onBack={backToProjects}
              onLogout={!canAccess(user.role, "projects") ? onLogout : undefined}
              onRefresh={!canAccess(user.role, "projects") ? loadProjects : undefined}
              onNavigateToForecast={canAccess(user.role, "collectionsForecast") ? () => setScreen("collectionsForecast") : undefined}
            />
          ) : screen === "collectionsForecast" ? (
            <CollectionsForecastPage
              projects={projects}
              onBack={backToProjects}
              onLogout={!canAccess(user.role, "projects") ? onLogout : undefined}
              onRefresh={!canAccess(user.role, "projects") ? loadProjects : undefined}
              onNavigateToCollections={canAccess(user.role, "collections") ? () => setScreen("collections") : undefined}
            />
          ) : screen === "budget" ? (
            <BudgetVsActualsPage
              projects={projects}
              onBack={backToProjects}
              onLogout={!canAccess(user.role, "projects") ? onLogout : undefined}
              onRefresh={!canAccess(user.role, "projects") ? loadProjects : undefined}
            />
          ) : (
            <FeasibilityPage
              model={model}
              metrics={metrics}
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
            />
          )}
        </Suspense>
      )}

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
