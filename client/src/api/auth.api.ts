import { apiClient } from "./client";
import type { AuthUser, LoginResponse, UserRole } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || "Login failed");
  }

  return response.json() as Promise<LoginResponse>;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
  } catch { /* best-effort */ }
}

export async function registerUser(
  username: string,
  password: string,
  role: UserRole,
): Promise<AuthUser> {
  return apiClient.post<AuthUser>("/auth/register", { username, password, role });
}

export interface UserListItem {
  id: number;
  username: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export async function fetchUsers(): Promise<UserListItem[]> {
  return apiClient.get<UserListItem[]>("/auth/users");
}

export async function resetUserPassword(userId: number, password: string): Promise<void> {
  await apiClient.put<{ message: string }>(`/auth/users/${userId}/password`, { password });
}
