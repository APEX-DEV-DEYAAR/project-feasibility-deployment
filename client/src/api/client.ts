const BASE_URL = import.meta.env.VITE_API_URL || "/api";

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, { credentials: "include" });
    return res.ok;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...options.headers,
      },
      ...options,
    });

    if (response.status === 401) {
      // Attempt silent refresh (deduplicated)
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = attemptRefresh().finally(() => { isRefreshing = false; });
      }

      const refreshed = await refreshPromise;
      if (refreshed) {
        // Retry the original request once
        clearTimeout(timeoutId);
        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), 30_000);
        try {
          const retry = await fetch(`${BASE_URL}${path}`, {
            credentials: "include",
            signal: retryController.signal,
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
              ...options.headers,
            },
            ...options,
          });
          if (retry.ok) {
            if (retry.status === 204) return undefined as T;
            return retry.json() as Promise<T>;
          }
        } finally {
          clearTimeout(retryTimeout);
        }
      }

      // Refresh failed or retry failed — force logout
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:logout"));
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error((body as { message?: string }).message || `Request failed: ${response.status}`);
    }

    // 204 No Content
    if (response.status === 204) return undefined as T;

    return response.json() as Promise<T>;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  del: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};
