import { apiClient } from "./client";
import type { ProjectSummary, Project, FeasibilityRun, ArchivedRun } from "../types";

// Projects
export function fetchProjects(): Promise<ProjectSummary[]> {
  return apiClient.get<ProjectSummary[]>("/projects");
}

export function createProject(name: string): Promise<Project> {
  return apiClient.post<Project>("/projects", { name });
}

export function deleteProject(id: number): Promise<void> {
  return apiClient.del(`/projects/${id}`);
}

// Feasibility portfolio
export function fetchPortfolio(): Promise<FeasibilityRun[]> {
  return apiClient.get<FeasibilityRun[]>("/portfolio");
}

// Feasibility
export function fetchFeasibility(projectId: number): Promise<FeasibilityRun | null> {
  return apiClient.get<FeasibilityRun | null>(`/projects/${projectId}/feasibility`);
}

export function saveDraft(projectId: number, payload: unknown): Promise<FeasibilityRun> {
  return apiClient.put<FeasibilityRun>(`/projects/${projectId}/feasibility`, payload);
}

export function freezeFeasibility(projectId: number): Promise<FeasibilityRun> {
  return apiClient.post<FeasibilityRun>(`/projects/${projectId}/feasibility/freeze`, {});
}

export function editFrozenFeasibility(projectId: number): Promise<FeasibilityRun> {
  return apiClient.post<FeasibilityRun>(`/projects/${projectId}/feasibility/edit`, {});
}

// Archive
export function fetchArchive(projectId: number): Promise<ArchivedRun[]> {
  return apiClient.get<ArchivedRun[]>(`/projects/${projectId}/feasibility/archive`);
}
