import { AppError, NotFoundError, ValidationError } from "../errors/AppError.js";
import { normalizePayload, calculateMetrics } from "../utils/calculations.js";
import type { FeasibilityRepository } from "../repositories/feasibility.repository.js";
import type { ArchiveRepository } from "../repositories/archive.repository.js";
import type { FeasibilityRelationalRepository } from "../repositories/feasibility-relational.repository.js";
import type { ProjectRepository } from "../repositories/project.repository.js";
import type { ReportingRepository } from "../repositories/reporting.repository.js";
import type { FeasibilityRun, ArchivedRun } from "../types/index.js";

export class FeasibilityService {
  constructor(
    private readonly feasibilityRepo: FeasibilityRepository,
    private readonly archiveRepo: ArchiveRepository,
    private readonly relationalRepo: FeasibilityRelationalRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly reportingRepo: ReportingRepository
  ) {}

  async getPortfolio(): Promise<FeasibilityRun[]> {
    return this.feasibilityRepo.findAllWithMetrics();
  }

  async getLatest(projectId: number): Promise<FeasibilityRun | null> {
    await this.ensureProjectExists(projectId);
    return this.feasibilityRepo.findLatestByProjectId(projectId);
  }

  async saveDraft(projectId: number, body: Record<string, unknown>): Promise<FeasibilityRun> {
    await this.ensureProjectExists(projectId);

    let payload;
    try {
      payload = normalizePayload(body);
    } catch (err) {
      throw new ValidationError((err as Error).message);
    }
    const metrics = calculateMetrics(payload as unknown as Record<string, unknown>);

    const latest = await this.feasibilityRepo.findLatestByProjectId(projectId);

    if (!latest) {
      const created = await this.feasibilityRepo.createDraft(projectId, payload, metrics);
      await this.reportingRepo.syncCurrent(created);
      await this.relationalRepo.syncRun(created);
      return created;
    }

    if (latest.status === "frozen") {
      throw new AppError("Cannot save: feasibility is frozen. Use edit to create a new version.", 409);
    }

    const updated = await this.feasibilityRepo.updateDraft(latest.id, payload, metrics);
    await this.reportingRepo.syncCurrent(updated);
    await this.relationalRepo.syncRun(updated);
    return updated;
  }

  async freeze(projectId: number): Promise<FeasibilityRun> {
    await this.ensureProjectExists(projectId);

    const latest = await this.feasibilityRepo.findLatestByProjectId(projectId);
    if (!latest) throw new NotFoundError("No feasibility to freeze");
    if (latest.status === "frozen") throw new AppError("Feasibility is already frozen", 409);

    const nextVersion = await this.feasibilityRepo.getNextVersion(projectId);
    const frozen = await this.feasibilityRepo.freeze(latest.id, nextVersion);
    if (!frozen) throw new AppError("Failed to freeze feasibility", 500);
    await this.reportingRepo.syncCurrent(frozen);
    await this.relationalRepo.syncRun(frozen);
    return frozen;
  }

  async editFrozen(projectId: number): Promise<FeasibilityRun> {
    await this.ensureProjectExists(projectId);

    const latest = await this.feasibilityRepo.findLatestByProjectId(projectId);
    if (!latest) throw new NotFoundError("No feasibility to edit");
    if (latest.status === "draft") throw new AppError("Feasibility is already in draft", 409);

    // Archive the frozen version
    const archived = await this.archiveRepo.archiveRun(latest);
    await this.reportingRepo.insertArchive(archived);
    await this.relationalRepo.syncArchive(archived);

    // Delete the frozen run
    await this.feasibilityRepo.deleteByRunId(latest.id);
    await this.reportingRepo.deleteCurrent(latest.id);
    await this.relationalRepo.deleteRun(latest.id);

    // Create a new unversioned draft from the latest frozen data.
    const payload = latest.payload;
    const metrics = latest.metrics;
    const created = await this.feasibilityRepo.createDraft(projectId, payload, metrics);
    await this.reportingRepo.syncCurrent(created);
    await this.relationalRepo.syncRun(created);
    return created;
  }

  async getArchive(projectId: number): Promise<ArchivedRun[]> {
    await this.ensureProjectExists(projectId);
    return this.archiveRepo.findByProjectId(projectId);
  }

  private async ensureProjectExists(projectId: number): Promise<void> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");
  }
}
