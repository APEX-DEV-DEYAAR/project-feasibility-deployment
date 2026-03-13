import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeasibilityService } from "./feasibility.service.js";

// ── Helpers ──

function makeMockRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    projectId: 10,
    version: null,
    status: "draft",
    payload: {
      projectName: "Tower A",
      input: { landArea: 50000 },
      partners: [{ name: "Deyaar", share: 100 }],
    },
    metrics: { kpis: { netProfit: 10 } },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    frozenAt: null,
    ...overrides,
  };
}

function makeMocks() {
  return {
    feasibilityRepo: {
      findAllWithMetrics: vi.fn(),
      findLatestByProjectId: vi.fn(),
      createDraft: vi.fn(),
      updateDraft: vi.fn(),
      getNextVersion: vi.fn(),
      freeze: vi.fn(),
      deleteByRunId: vi.fn(),
    },
    archiveRepo: {
      findByProjectId: vi.fn(),
      archiveRun: vi.fn(),
    },
    relationalRepo: {
      syncRun: vi.fn(),
      syncArchive: vi.fn(),
      deleteRun: vi.fn(),
    },
    projectRepo: {
      findById: vi.fn().mockResolvedValue({ id: 10, name: "Tower A" }),
      updateName: vi.fn(),
    },
    reportingRepo: {
      syncCurrent: vi.fn(),
      insertArchive: vi.fn(),
      deleteCurrent: vi.fn(),
    },
  };
}

function buildService(mocks: ReturnType<typeof makeMocks>) {
  return new FeasibilityService(
    mocks.feasibilityRepo as any,
    mocks.archiveRepo as any,
    mocks.relationalRepo as any,
    mocks.projectRepo as any,
    mocks.reportingRepo as any
  );
}

// ── Tests ──

describe("FeasibilityService", () => {
  let mocks: ReturnType<typeof makeMocks>;
  let service: FeasibilityService;

  beforeEach(() => {
    mocks = makeMocks();
    service = buildService(mocks);
  });

  // ── getPortfolio ──

  describe("getPortfolio", () => {
    it("delegates to feasibilityRepo.findAllWithMetrics", async () => {
      const runs = [makeMockRun()];
      mocks.feasibilityRepo.findAllWithMetrics.mockResolvedValue(runs);

      const result = await service.getPortfolio();
      expect(result).toEqual(runs);
    });
  });

  // ── getLatest ──

  describe("getLatest", () => {
    it("returns latest run for an existing project", async () => {
      const run = makeMockRun();
      mocks.feasibilityRepo.findLatestByProjectId.mockResolvedValue(run);

      const result = await service.getLatest(10);
      expect(result).toEqual(run);
    });

    it("throws if project does not exist", async () => {
      mocks.projectRepo.findById.mockResolvedValue(null);
      await expect(service.getLatest(999)).rejects.toThrow("Project not found");
    });
  });

  // ── saveDraft ──

  describe("saveDraft", () => {
    const validBody = {
      projectName: "Tower A",
      input: { landArea: 50000, gfa: 100000, nsaResi: 40000, buaResi: 50000, unitsResi: 100, resiPsf: 1000, ccPsf: 300 },
      partners: [{ name: "Deyaar", share: 100 }],
    };

    it("creates a new draft when no existing run", async () => {
      mocks.feasibilityRepo.findLatestByProjectId.mockResolvedValue(null);
      const created = makeMockRun();
      mocks.feasibilityRepo.createDraft.mockResolvedValue(created);

      const result = await service.saveDraft(10, validBody);

      expect(mocks.feasibilityRepo.createDraft).toHaveBeenCalledOnce();
      expect(mocks.reportingRepo.syncCurrent).toHaveBeenCalledWith(created);
      expect(mocks.relationalRepo.syncRun).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it("updates an existing draft", async () => {
      const existing = makeMockRun({ status: "draft" });
      mocks.feasibilityRepo.findLatestByProjectId.mockResolvedValue(existing);
      const updated = makeMockRun({ id: 1 });
      mocks.feasibilityRepo.updateDraft.mockResolvedValue(updated);

      const result = await service.saveDraft(10, validBody);

      expect(mocks.feasibilityRepo.updateDraft).toHaveBeenCalledOnce();
      expect(result).toEqual(updated);
    });

    it("syncs project name to projects table", async () => {
      mocks.feasibilityRepo.findLatestByProjectId.mockResolvedValue(null);
      mocks.feasibilityRepo.createDraft.mockResolvedValue(makeMockRun());

      await service.saveDraft(10, validBody);

      expect(mocks.projectRepo.updateName).toHaveBeenCalledWith(10, "Tower A");
    });

    it("throws 409 when trying to save over a frozen run", async () => {
      mocks.feasibilityRepo.findLatestByProjectId.mockResolvedValue(
        makeMockRun({ status: "frozen" })
      );

      await expect(service.saveDraft(10, validBody)).rejects.toThrow(
        "Cannot save: feasibility is frozen"
      );
    });

    it("throws ValidationError for missing projectName", async () => {
      await expect(
        service.saveDraft(10, { input: {}, partners: [] })
      ).rejects.toThrow("projectName is required");
    });

    it("throws NotFoundError for non-existent project", async () => {
      mocks.projectRepo.findById.mockResolvedValue(null);
      await expect(service.saveDraft(999, validBody)).rejects.toThrow(
        "Project not found"
      );
    });
  });

  // ── freeze ──

  describe("freeze", () => {
    it("freezes a draft run", async () => {
      mocks.feasibilityRepo.findLatestByProjectId.mockResolvedValue(
        makeMockRun({ status: "draft" })
      );
      mocks.feasibilityRepo.getNextVersion.mockResolvedValue(1);
      const frozen = makeMockRun({ status: "frozen", version: 1 });
      mocks.feasibilityRepo.freeze.mockResolvedValue(frozen);

      const result = await service.freeze(10);

      expect(result.status).toBe("frozen");
      expect(mocks.reportingRepo.syncCurrent).toHaveBeenCalledWith(frozen);
    });

    it("throws when no feasibility exists", async () => {
      mocks.feasibilityRepo.findLatestByProjectId.mockResolvedValue(null);
      await expect(service.freeze(10)).rejects.toThrow("No feasibility to freeze");
    });

    it("throws when already frozen", async () => {
      mocks.feasibilityRepo.findLatestByProjectId.mockResolvedValue(
        makeMockRun({ status: "frozen" })
      );
      await expect(service.freeze(10)).rejects.toThrow("already frozen");
    });
  });

  // ── editFrozen ──

  describe("editFrozen", () => {
    it("archives the frozen version and creates a new draft", async () => {
      const frozen = makeMockRun({ status: "frozen", version: 1 });
      mocks.feasibilityRepo.findLatestByProjectId.mockResolvedValue(frozen);
      mocks.archiveRepo.archiveRun.mockResolvedValue({ ...frozen, archivedAt: new Date().toISOString() });
      const newDraft = makeMockRun({ id: 2, status: "draft", version: null });
      mocks.feasibilityRepo.createDraft.mockResolvedValue(newDraft);

      const result = await service.editFrozen(10);

      expect(mocks.archiveRepo.archiveRun).toHaveBeenCalledWith(frozen);
      expect(mocks.feasibilityRepo.deleteByRunId).toHaveBeenCalledWith(frozen.id);
      expect(mocks.feasibilityRepo.createDraft).toHaveBeenCalledOnce();
      expect(result.status).toBe("draft");
    });

    it("throws when no feasibility exists", async () => {
      mocks.feasibilityRepo.findLatestByProjectId.mockResolvedValue(null);
      await expect(service.editFrozen(10)).rejects.toThrow("No feasibility to edit");
    });

    it("throws when already in draft", async () => {
      mocks.feasibilityRepo.findLatestByProjectId.mockResolvedValue(
        makeMockRun({ status: "draft" })
      );
      await expect(service.editFrozen(10)).rejects.toThrow("already in draft");
    });
  });

  // ── getArchive ──

  describe("getArchive", () => {
    it("returns archived runs for a project", async () => {
      const archives = [{ id: 1, version: 1 }];
      mocks.archiveRepo.findByProjectId.mockResolvedValue(archives);

      const result = await service.getArchive(10);
      expect(result).toEqual(archives);
    });
  });
});
