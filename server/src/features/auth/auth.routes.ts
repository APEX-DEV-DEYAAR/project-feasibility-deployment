import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { AuthService } from "./auth.service.js";
import { authMiddleware, requireRole } from "./auth.middleware.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per window per IP
  message: { message: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

export function authRoutes(authService: AuthService): Router {
  const router = Router();

  // POST /api/auth/login
  router.post("/auth/login", loginLimiter, async (req, res, next) => {
    try {
      const { username, password } = req.body as { username: string; password: string };
      if (!username || !password) {
        res.status(400).json({ message: "Username and password are required" });
        return;
      }
      const result = await authService.login(username, password);

      // Set JWT as httpOnly cookie
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("token", result.token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "strict", // "none" required while frontend/backend are cross-origin; move to "strict" once same-domain
        maxAge: 30 * 60 * 1000, // 30 minutes, matching JWT expiry
        path: "/",
      });

      // Only send user info in response body (no token)
      res.json({ user: result.user });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/auth/logout — clear auth cookie
  router.post("/auth/logout", (_req, res) => {
    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "strict",
      path: "/",
    });
    res.json({ message: "Logged out" });
  });

  // GET /api/auth/me — returns current user from token
  router.get("/auth/me", authMiddleware(authService), (req, res) => {
    res.json(req.user);
  });

  // POST /api/auth/register — admin-only: create new users
  router.post(
    "/auth/register",
    authMiddleware(authService),
    requireRole("admin"),
    async (req, res, next) => {
      try {
        const { username, password, roles } = req.body as {
          username: string;
          password: string;
          roles: string | string[];
        };
        if (!username || !password) {
          res.status(400).json({ message: "Username and password are required" });
          return;
        }
        const validRoles = ["admin", "sales", "collections", "commercial", "finance", "marketing", "cfo", "business_development"];
        const roleList = Array.isArray(roles) ? roles : (roles || "commercial").split(",").map((r: string) => r.trim());
        const validated = roleList.filter((r: string) => validRoles.includes(r));
        const rolesStr = validated.length > 0 ? validated.join(",") : "commercial";
        const user = await authService.register(username, password, rolesStr);
        res.status(201).json(user);
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/auth/users — admin-only: list all users
  router.get(
    "/auth/users",
    authMiddleware(authService),
    requireRole("admin"),
    async (_req, res, next) => {
      try {
        const users = await authService.listUsers();
        res.json(users);
      } catch (error) {
        next(error);
      }
    }
  );

  // PUT /api/auth/users/:id/password — admin-only: reset a user's password
  router.put(
    "/auth/users/:id/password",
    authMiddleware(authService),
    requireRole("admin"),
    async (req, res, next) => {
      try {
        const userId = Number(req.params.id);
        const { password } = req.body as { password: string };
        if (!password) {
          res.status(400).json({ message: "New password is required" });
          return;
        }
        await authService.changePassword(userId, password);
        res.json({ message: "Password updated" });
      } catch (error) {
        next(error);
      }
    }
  );

  // PUT /api/auth/users/:id/roles — admin-only: update a user's roles
  router.put(
    "/auth/users/:id/roles",
    authMiddleware(authService),
    requireRole("admin"),
    async (req, res, next) => {
      try {
        const userId = Number(req.params.id);
        const { roles } = req.body as { roles: string | string[] };
        const validRoles = ["admin", "sales", "collections", "commercial", "finance", "marketing", "cfo", "business_development"];
        const roleList = Array.isArray(roles) ? roles : (roles || "").split(",").map((r: string) => r.trim());
        const validated = roleList.filter((r: string) => validRoles.includes(r));
        if (validated.length === 0) {
          res.status(400).json({ message: "At least one valid role is required" });
          return;
        }
        await authService.updateUserRoles(userId, validated.join(","));
        res.json({ message: "Roles updated" });
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /api/auth/users/:id — admin-only: delete a user
  router.delete(
    "/auth/users/:id",
    authMiddleware(authService),
    requireRole("admin"),
    async (req, res, next) => {
      try {
        const userId = Number(req.params.id);
        await authService.deleteUser(userId);
        res.json({ message: "User deleted" });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
