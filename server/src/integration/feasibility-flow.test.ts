import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFeasibilityController } from "../features/feasibility/feasibility.controller.js";
import { FeasibilityService } from "../features/feasibility/feasibility.service.js";
import type { Request, Response, NextFunction } from "express";

/**
 * Integration test: Feasibility Controller → Service → mock repositories
 * Tests the save → freeze → edit-frozen lifecycle.
 */

const VALID_BODY = {
  projectName: "Tower A",
  input: {
    landArea: 50000, landCost: 100, landPsf: 0, gfa: 200000,
    nsaResi: 80000, nsaRetail: 20000, buaResi: 100000, buaRetail: 25000,
    unitsResi: 200, unitsRetail: 10, resiPsf: 1500, retailPsf: 2000,
    carParkIncome: 5, cofOnSalesPct: 2, ccPsf: 400,
    softPct: 10, statPct: 5, contPct: 3, devMgmtPct: 2,
    cofPct: 3, salesExpPct: 4, mktPct: 1.5,
  },
  partners: [{ name: "Deyaar", share: 100 }],
};

function makeMockRepos() {
  // In-memory feasibility store
  let runs: any[] = [];
  let archives: any[] = [];
  let nextRunId = 1;
  let nextArchiveId = 1;

  return {
    feasibilityRepo: {
      findAllWithMetrics: vi.fn(async () => runs),
      findLatestByProjectId: vi.fn(async (pid: number) =>
        runs.filter((r) => r.projectId === pid).sort((a, b) => b.id - a.id)[0] ?? null
      ),
      createDraft: vi.fn(async (pid: number, payload: any, metrics: any) => {
        const run = { id: nextRunId++, projectId: pid, version: null, status: "draft", payload, metrics, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), frozenAt: null };
        runs.push(run);
        return run;
      }),
      updateDraft: vi.fn(async (runId: number, payload: any, metrics: any) => {
        const run = runs.find((r) => r.id === runId);
        if (run) { run.payload = payload; run.metrics = metrics; run.updatedAt = new Date().toISOString(); }
        return run;
      }),
      getNextVersion: vi.fn(async () => {
        const maxVersion = runs.reduce((max, r) => Math.max(max, r.version ?? 0), 0);
        return maxVersion + 1;
      }),
      freeze: vi.fn(async (runId: number, version: number) => {
        const run = runs.find((r) => r.id === runId);
        if (run) { run.status = "frozen"; run.version = version; run.frozenAt = new Date().toISOString(); }
        return run;
      }),
      deleteByRunId: vi.fn(async (runId: number) => {
        runs = runs.filter((r) => r.id !== runId);
      }),
    },
    archiveRepo: {
      findByProjectId: vi.fn(async (pid: number) => archives.filter((a) => a.projectId === pid)),
      archiveRun: vi.fn(async (run: any) => {
        const archived = { id: nextArchiveId++, originalRunId: run.id, projectId: run.projectId, version: run.version, payload: run.payload, metrics: run.metrics, frozenAt: run.frozenAt, archivedAt: new Date().toISOString() };
        archives.push(archived);
        return archived;
      }),
    },
    relationalRepo: {
      syncRun: vi.fn(),
      syncArchive: vi.fn(),
      deleteRun: vi.fn(),
    },
    projectRepo: {
      findById: vi.fn(async () => ({ id: 10, name: "Tower A", createdAt: new Date().toISOString() })),
      updateName: vi.fn(),
    },
    reportingRepo: {
      syncCurrent: vi.fn(),
      insertArchive: vi.fn(),
      deleteCurrent: vi.fn(),
    },
  };
}

function mockReqRes(overrides: Partial<Request> = {}) {
  const req = { params: {}, body: {}, query: {}, ...overrides } as Request;
  const res: { statusCode: number; _json: unknown; status(code: number): typeof res; json(data: unknown): typeof res; end(): typeof res } = {
    statusCode: 200,
    _json: null as unknown,
    status(code: number) { res.statusCode = code; return res; },
    json(data: unknown) { res._json = data; return res; },
    end() { return res; },
  };
  const next: NextFunction = vi.fn();
  return { req, res: res as unknown as Response & { statusCode: number; _json: unknown }, next };
}

describe("Feasibility controller → service integration", () => {
  let controller: ReturnType<typeof createFeasibilityController>;
  let mocks: ReturnType<typeof makeMockRepos>;

  beforeEach(() => {
    mocks = makeMockRepos();
    const service = new FeasibilityService(
      mocks.feasibilityRepo as any,
      mocks.archiveRepo as any,
      mocks.relationalRepo as any,
      mocks.projectRepo as any,
      mocks.reportingRepo as any,
      { findByRunId: vi.fn().mockResolvedValue([]), saveForRun: vi.fn(), findByArchiveId: vi.fn().mockResolvedValue([]), saveForArchive: vi.fn(), copyRunToArchive: vi.fn(), deleteForRun: vi.fn() } as any,
    );
    controller = createFeasibilityController(service);
  });

  it("save → freeze → editFrozen lifecycle", async () => {
    // 1) Save draft
    const s = mockReqRes({ params: { id: "10" } as any, body: VALID_BODY });
    await controller.saveDraft(s.req, s.res, s.next);
    expect(s.res.statusCode).toBe(200);
    expect((s.res._json as any).status).toBe("draft");
    expect(s.next).not.toHaveBeenCalled();

    // Project name synced
    expect(mocks.projectRepo.updateName).toHaveBeenCalledWith(10, "Tower A");

    // 2) Freeze
    const f = mockReqRes({ params: { id: "10" } as any });
    await controller.freeze(f.req, f.res, f.next);
    expect(f.res.statusCode).toBe(200);
    expect((f.res._json as any).status).toBe("frozen");
    expect((f.res._json as any).version).toBe(1);

    // 3) Edit frozen → archives old version, creates new draft
    const e = mockReqRes({ params: { id: "10" } as any });
    await controller.editFrozen(e.req, e.res, e.next);
    expect(e.res.statusCode).toBe(200);
    expect((e.res._json as any).status).toBe("draft");
    expect(mocks.archiveRepo.archiveRun).toHaveBeenCalledOnce();

    // 4) Archive should have 1 entry
    const a = mockReqRes({ params: { id: "10" } as any });
    await controller.getArchive(a.req, a.res, a.next);
    expect(a.res._json).toHaveLength(1);
    expect((a.res._json as any[])[0].version).toBe(1);
  });

  it("saveDraft updates existing draft instead of creating new one", async () => {
    // First save
    const s1 = mockReqRes({ params: { id: "10" } as any, body: VALID_BODY });
    await controller.saveDraft(s1.req, s1.res, s1.next);
    expect(mocks.feasibilityRepo.createDraft).toHaveBeenCalledOnce();

    // Second save — should update, not create
    const s2 = mockReqRes({ params: { id: "10" } as any, body: { ...VALID_BODY, projectName: "Tower B" } });
    await controller.saveDraft(s2.req, s2.res, s2.next);
    expect(mocks.feasibilityRepo.updateDraft).toHaveBeenCalledOnce();
    expect(mocks.feasibilityRepo.createDraft).toHaveBeenCalledOnce(); // still only 1 create
  });

  it("saveDraft on frozen run calls next with 409 error", async () => {
    // Save + freeze
    const s = mockReqRes({ params: { id: "10" } as any, body: VALID_BODY });
    await controller.saveDraft(s.req, s.res, s.next);
    const f = mockReqRes({ params: { id: "10" } as any });
    await controller.freeze(f.req, f.res, f.next);

    // Try saving over frozen
    const s2 = mockReqRes({ params: { id: "10" } as any, body: VALID_BODY });
    await controller.saveDraft(s2.req, s2.res, s2.next);
    expect(s2.next).toHaveBeenCalledOnce();
    const err = (s2.next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.statusCode).toBe(409);
  });

  it("freeze on empty project calls next with 404", async () => {
    const f = mockReqRes({ params: { id: "10" } as any });
    await controller.freeze(f.req, f.res, f.next);
    expect(f.next).toHaveBeenCalledOnce();
    const err = (f.next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.statusCode).toBe(404);
  });

  it("editFrozen on draft calls next with 409", async () => {
    // Save a draft
    const s = mockReqRes({ params: { id: "10" } as any, body: VALID_BODY });
    await controller.saveDraft(s.req, s.res, s.next);

    // Try editing (it's a draft, not frozen)
    const e = mockReqRes({ params: { id: "10" } as any });
    await controller.editFrozen(e.req, e.res, e.next);
    expect(e.next).toHaveBeenCalledOnce();
    const err = (e.next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.statusCode).toBe(409);
  });

  it("saveDraft computes and stores metrics", async () => {
    const s = mockReqRes({ params: { id: "10" } as any, body: VALID_BODY });
    await controller.saveDraft(s.req, s.res, s.next);

    const result = s.res._json as any;
    expect(result.metrics).toBeDefined();
    expect(result.metrics.kpis.totalRevenue).toBeGreaterThan(0);
    expect(result.metrics.kpis.totalCost).toBeGreaterThan(0);
    expect(result.metrics.revenue.grossResi).toBeCloseTo(120, 1); // 80000 × 1500 / 1e6
  });
});
