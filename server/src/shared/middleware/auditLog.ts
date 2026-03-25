import type { Request, Response, NextFunction } from "express";
import type { AuditLogRepository } from "./audit-log.repository.js";
import { logger } from "../logger.js";

/** Fields that must never appear in audit log body snapshots. */
const SENSITIVE_KEYS = new Set([
  "password", "passwordHash", "password_hash",
  "token", "secret", "jwt", "authorization",
  "creditCard", "ssn", "oraclePassword", "walletPassword",
]);

/** Strip sensitive fields and truncate to a reasonable size. */
function sanitizeBody(body: unknown): string | null {
  if (body == null || typeof body !== "object") return null;

  const cleaned: Record<string, unknown> = {};
  const source = body as Record<string, unknown>;

  for (const [key, value] of Object.entries(source)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      cleaned[key] = "[REDACTED]";
    } else if (Array.isArray(value)) {
      cleaned[key] = `[Array(${value.length})]`;
    } else {
      cleaned[key] = value;
    }
  }

  const json = JSON.stringify(cleaned);
  // Cap at 2KB to avoid bloating the audit table
  return json.length > 2048 ? json.slice(0, 2045) + "..." : json;
}

/** Extract resource type and ID from the request path. */
function extractResource(path: string, method: string): { resourceType: string | null; resourceId: string | null; action: string | null } {
  // Patterns: /api/projects/:id, /api/projects/:id/feasibility, /api/projects/:id/costs, etc.
  const projectMatch = path.match(/\/projects\/(\d+)/);
  const resourceId = projectMatch?.[1] ?? null;

  // Determine resource type from path segment after projectId (or the root resource)
  let resourceType: string | null = null;
  let action: string | null = null;

  if (path.includes("/feasibility")) {
    resourceType = "feasibility";
    if (path.includes("/freeze")) action = "freeze";
    else if (path.includes("/edit")) action = "edit";
    else if (path.includes("/overrides")) action = "save_overrides";
    else if (method === "PUT") action = "save_draft";
  } else if (path.includes("/costs")) {
    resourceType = "cost";
    if (path.includes("/clear")) action = "clear";
    else if (path.includes("/initialize")) action = "initialize";
    else if (path.includes("/copy-year")) action = "copy_year";
    else if (path.includes("/bulk")) action = "bulk_save";
    else if (method === "DELETE") action = "delete";
    else if (method === "POST") action = "save";
  } else if (path.includes("/collections-forecast")) {
    resourceType = "collections_forecast";
    if (path.includes("/installments/bulk")) action = "bulk_save_installments";
    else if (path.includes("/lookups/completion")) action = "bulk_save_completion_lookups";
    else if (path.includes("/lookups/aging")) action = "bulk_save_aging_lookups";
  } else if (path.includes("/collections")) {
    resourceType = "collections";
    if (path.includes("/clear")) action = "clear";
    else if (path.includes("/bulk")) action = "bulk_save";
    else if (method === "DELETE") action = "delete";
    else if (method === "POST") action = "save";
  } else if (path.includes("/sales")) {
    resourceType = "sales";
    if (path.includes("/clear")) action = "clear";
    else if (path.includes("/bulk")) action = "bulk_save";
    else if (method === "DELETE") action = "delete";
    else if (method === "POST") action = "save";
  } else if (path.includes("/projects")) {
    resourceType = "project";
    if (method === "POST") action = "create";
    else if (method === "DELETE") action = "delete";
  } else if (path.includes("/auth")) {
    resourceType = "auth";
    if (path.includes("/register")) action = "register";
    else if (path.includes("/password")) action = "reset_password";
  }

  return { resourceType, resourceId, action };
}

/**
 * Audit logging middleware.
 * Persists state-changing requests (POST, PUT, DELETE) to the audit_log table
 * with resource context and sanitized request bodies.
 */
export function createAuditLog(auditRepo: AuditLogRepository) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
      const start = Date.now();
      const { resourceType, resourceId, action } = extractResource(req.originalUrl, req.method);
      const bodySnapshot = sanitizeBody(req.body);

      res.on("finish", () => {
        const entry = {
          username: req.user?.username ?? "anonymous",
          role: req.user?.roles?.join(",") ?? "unknown",
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Date.now() - start,
          resourceType,
          resourceId,
          action,
          bodySnapshot,
        };
        auditRepo.insert(entry).catch((err) => {
          // Fallback: log to structured logger if DB write fails
          logger.warn({ ...entry, err: (err as Error).message }, "Audit log DB write failed");
        });
      });
    }
    next();
  };
}

// Re-export for backward compatibility during wiring
export { createAuditLog as auditLog };
