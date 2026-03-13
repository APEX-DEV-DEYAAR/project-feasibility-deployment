import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProjectController } from "../controllers/project.controller.js";
import { ProjectService } from "../services/project.service.js";
import type { ProjectRepository } from "../repositories/project.repository.js";
import type { Request, Response, NextFunction } from "express";

/**
 * Integration test: Controller → Service → in-memory Repository
 * Verifies the full request chain without auth or a real DB.
 */

function inMemoryRepo(): ProjectRepository {
  let projects: Array<{ id: number; name: string; createdAt: string }> = [];
  let nextId = 1;

  return {
    findAll: vi.fn(async () =>
      projects.map((p) => ({
        ...p,
        hasFeasibility: false,
        status: null,
        latestVersion: null,
        updatedAt: p.createdAt,
      }))
    ),
    findById: vi.fn(async (id: number) => projects.find((p) => p.id === id) ?? null),
    findByName: vi.fn(async (name: string) => projects.find((p) => p.name === name) ?? null),
    create: vi.fn(async (name: string) => {
      const project = { id: nextId++, name, createdAt: new Date().toISOString() };
      projects.push(project);
      return project;
    }),
    updateName: vi.fn(async (id: number, name: string) => {
      const p = projects.find((pr) => pr.id === id);
      if (p) p.name = name;
    }),
    delete: vi.fn(async (id: number) => {
      const idx = projects.findIndex((p) => p.id === id);
      if (idx === -1) return false;
      projects.splice(idx, 1);
      return true;
    }),
  } as unknown as ProjectRepository;
}

function mockReqRes(overrides: Partial<Request> = {}) {
  const req = { params: {}, body: {}, query: {}, ...overrides } as Request;
  const res = {
    statusCode: 200,
    _json: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this._json = data;
      return this;
    },
    end() {
      return this;
    },
  } as unknown as Response & { statusCode: number; _json: unknown };
  const next: NextFunction = vi.fn();
  return { req, res, next };
}

describe("Project controller → service → repo integration", () => {
  let controller: ReturnType<typeof createProjectController>;

  beforeEach(() => {
    const repo = inMemoryRepo();
    const service = new ProjectService(repo);
    controller = createProjectController(service);
  });

  it("full lifecycle: create → list → getById → delete", async () => {
    // Create
    const c = mockReqRes({ body: { name: "Tower A" } });
    await controller.create(c.req, c.res, c.next);
    expect(c.res.statusCode).toBe(201);
    expect((c.res._json as any).name).toBe("Tower A");
    const projectId = (c.res._json as any).id;

    // List
    const l = mockReqRes();
    await controller.list(l.req, l.res, l.next);
    expect(l.res.statusCode).toBe(200);
    expect(l.res._json).toHaveLength(1);

    // Get by ID
    const g = mockReqRes({ params: { id: String(projectId) } as any });
    await controller.getById(g.req, g.res, g.next);
    expect(g.res.statusCode).toBe(200);
    expect((g.res._json as any).name).toBe("Tower A");

    // Delete
    const d = mockReqRes({ params: { id: String(projectId) } as any });
    await controller.remove(d.req, d.res, d.next);
    expect(d.res.statusCode).toBe(204);

    // Verify empty list
    const l2 = mockReqRes();
    await controller.list(l2.req, l2.res, l2.next);
    expect(l2.res._json).toHaveLength(0);
  });

  it("getById calls next with error for non-existent project", async () => {
    const { req, res, next } = mockReqRes({ params: { id: "999" } as any });
    await controller.getById(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.message).toBe("Project not found");
    expect(err.statusCode).toBe(404);
  });

  it("create calls next with error for blank name", async () => {
    const { req, res, next } = mockReqRes({ body: { name: "   " } });
    await controller.create(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.message).toBe("Project name is required");
    expect(err.statusCode).toBe(400);
  });

  it("create calls next with error for duplicate name", async () => {
    // Create first
    const c1 = mockReqRes({ body: { name: "Dup" } });
    await controller.create(c1.req, c1.res, c1.next);
    expect(c1.res.statusCode).toBe(201);

    // Duplicate
    const c2 = mockReqRes({ body: { name: "Dup" } });
    await controller.create(c2.req, c2.res, c2.next);
    expect(c2.next).toHaveBeenCalledOnce();
    const err = (c2.next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.message).toContain("already exists");
  });

  it("delete calls next with error for non-existent project", async () => {
    const { req, res, next } = mockReqRes({ params: { id: "999" } as any });
    await controller.remove(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.statusCode).toBe(404);
  });
});
