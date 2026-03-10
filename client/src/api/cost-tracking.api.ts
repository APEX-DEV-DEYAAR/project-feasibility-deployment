import { apiClient } from "./client";
import type {
  CostCategory,
  MonthlyCostRow,
  ProjectMonthlyCost,
  CostSummaryItem,
  CostAnnualSummaryItem,
  SaveMonthlyCostPayload,
  TeamCode,
  MonthlyCollectionsRow,
  SaveMonthlyCollectionsPayload,
  BudgetVsActualsResponse,
} from "../types";

// ---- Categories ----
export function fetchCostCategories(team?: TeamCode): Promise<CostCategory[]> {
  const query = team ? `?team=${encodeURIComponent(team)}` : "";
  return apiClient.get<CostCategory[]>(`/categories${query}`);
}

// ---- Monthly Costs ----
export function fetchMonthlyCosts(projectId: number, year?: number, team?: TeamCode): Promise<MonthlyCostRow[]> {
  const params = new URLSearchParams();
  if (typeof year === "number") params.set("year", String(year));
  if (team) params.set("team", team);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiClient.get<MonthlyCostRow[]>(`/projects/${encodeURIComponent(projectId)}/costs${query}`);
}

export function fetchAllMonthlyCosts(year: number): Promise<ProjectMonthlyCost[]> {
  return apiClient.get<ProjectMonthlyCost[]>(`/costs?year=${encodeURIComponent(year)}`);
}

export function saveMonthlyCost(payload: SaveMonthlyCostPayload): Promise<ProjectMonthlyCost> {
  return apiClient.post<ProjectMonthlyCost>("/costs", payload);
}

export function bulkSaveMonthlyCosts(
  costs: SaveMonthlyCostPayload[]
): Promise<ProjectMonthlyCost[]> {
  return apiClient.post<ProjectMonthlyCost[]>("/costs/bulk", { costs });
}

export function deleteMonthlyCost(
  projectId: number,
  categoryId: number,
  year: number,
  month: number
): Promise<void> {
  return apiClient.del(
    `/projects/${encodeURIComponent(projectId)}/costs/${encodeURIComponent(categoryId)}/${encodeURIComponent(year)}/${encodeURIComponent(month)}`
  );
}

// ---- Summaries ----
export function fetchCostSummary(projectId: number, year?: number): Promise<CostSummaryItem[]> {
  const query = typeof year === "number" ? `?year=${encodeURIComponent(year)}` : "";
  return apiClient.get<CostSummaryItem[]>(`/projects/${encodeURIComponent(projectId)}/cost-summary${query}`);
}

export function fetchAnnualSummary(projectId: number, year?: number): Promise<CostAnnualSummaryItem[]> {
  const query = typeof year === "number" ? `?year=${encodeURIComponent(year)}` : "";
  return apiClient.get<CostAnnualSummaryItem[]>(`/projects/${encodeURIComponent(projectId)}/annual-summary${query}`);
}

// ---- Initialization ----
export function initializeYear(
  projectId: number,
  year: number,
  defaultProjectedAmount: number = 0,
  createdBy?: string
): Promise<ProjectMonthlyCost[]> {
  return apiClient.post<ProjectMonthlyCost[]>(`/projects/${encodeURIComponent(projectId)}/costs/initialize`, {
    year,
    defaultProjectedAmount,
    createdBy,
  });
}

export function copyFromPreviousYear(
  projectId: number,
  sourceYear: number,
  targetYear: number,
  createdBy?: string
): Promise<ProjectMonthlyCost[]> {
  return apiClient.post<ProjectMonthlyCost[]>(`/projects/${encodeURIComponent(projectId)}/costs/copy-year`, {
    sourceYear,
    targetYear,
    createdBy,
  });
}

// ---- Clear Project Data ----
export function clearProjectCostData(
  projectId: number,
  team?: TeamCode
): Promise<{ message: string; deletedCount: number }> {
  const query = team ? `?team=${encodeURIComponent(team)}` : "";
  return apiClient.del<{ message: string; deletedCount: number }>(
    `/projects/${encodeURIComponent(projectId)}/costs/clear${query}`
  );
}

// ---- Collections ----
export function fetchMonthlyCollections(projectId: number, year?: number): Promise<MonthlyCollectionsRow[]> {
  const query = typeof year === "number" ? `?year=${encodeURIComponent(year)}` : "";
  return apiClient.get<MonthlyCollectionsRow[]>(`/projects/${encodeURIComponent(projectId)}/collections${query}`);
}

export function bulkSaveMonthlyCollections(
  collections: SaveMonthlyCollectionsPayload[]
): Promise<MonthlyCollectionsRow[]> {
  return apiClient.post<MonthlyCollectionsRow[]>("/collections/bulk", { collections });
}

export function clearProjectCollections(projectId: number): Promise<{ message: string; deletedCount: number }> {
  return apiClient.del<{ message: string; deletedCount: number }>(
    `/projects/${encodeURIComponent(projectId)}/collections/clear`
  );
}

// ---- Budget vs Actuals ----
export function fetchBudgetVsActuals(projectId: number, year: number): Promise<BudgetVsActualsResponse> {
  return apiClient.get<BudgetVsActualsResponse>(
    `/projects/${encodeURIComponent(projectId)}/budget-vs-actuals?year=${encodeURIComponent(year)}`
  );
}
