import { apiClient } from "./client";
import type {
  CollectionsForecastDashboard,
  CollectionsInstallment,
  CollectionsPortfolioDashboard,
} from "../types";

export function fetchCollectionsForecastInstallments(projectId: number): Promise<CollectionsInstallment[]> {
  return apiClient.get<CollectionsInstallment[]>(
    `/projects/${encodeURIComponent(projectId)}/collections-forecast/installments`
  );
}

export function fetchCollectionsForecastDashboard(
  projectId: number,
  asOf?: string
): Promise<CollectionsForecastDashboard> {
  const query = asOf ? `?asOf=${encodeURIComponent(asOf)}` : "";
  return apiClient.get<CollectionsForecastDashboard>(
    `/projects/${encodeURIComponent(projectId)}/collections-forecast/dashboard${query}`
  );
}

export function fetchCollectionsForecastPortfolioDashboard(asOf?: string): Promise<CollectionsPortfolioDashboard> {
  const query = asOf ? `?asOf=${encodeURIComponent(asOf)}` : "";
  return apiClient.get<CollectionsPortfolioDashboard>(`/collections-forecast/portfolio-dashboard${query}`);
}
