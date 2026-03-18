import { AppError, NotFoundError, ValidationError } from "../../shared/errors/AppError.js";
import { normalizePayload, calculateMetrics } from "../../shared/utils/calculations.js";
import type { FeasibilityRepository } from "./feasibility.repository.js";
import type { ArchiveRepository } from "./archive.repository.js";
import type { FeasibilityRelationalRepository } from "./feasibility-relational.repository.js";
import type { ProjectRepository } from "../project/project.repository.js";
import type { ReportingRepository } from "./reporting.repository.js";
import type { OverridesRepository } from "./overrides.repository.js";
import type { FeasibilityRun, ArchivedRun, MetricOverride } from "../../shared/types/index.js";

export class FeasibilityService {
  constructor(
    private readonly feasibilityRepo: FeasibilityRepository,
    private readonly archiveRepo: ArchiveRepository,
    private readonly relationalRepo: FeasibilityRelationalRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly reportingRepo: ReportingRepository,
    private readonly overridesRepo: OverridesRepository
  ) {}

  async getPortfolio(): Promise<FeasibilityRun[]> {
    return this.feasibilityRepo.findAllWithMetrics();
  }

  async getLatest(projectId: number): Promise<FeasibilityRun | null> {
    await this.ensureProjectExists(projectId);
    const run = await this.feasibilityRepo.findLatestByProjectId(projectId);
    if (run) {
      run.overrides = await this.safeGetRunOverrides(run.id);
    }
    return run;
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

    // Sync project name back to the projects table
    if (payload.projectName) {
      await this.projectRepo.updateName(projectId, payload.projectName as string);
    }

    const latest = await this.feasibilityRepo.findLatestByProjectId(projectId);

    let run: FeasibilityRun;
    if (!latest) {
      run = await this.feasibilityRepo.createDraft(projectId, payload, metrics);
    } else if (latest.status === "frozen") {
      throw new AppError("Cannot save: feasibility is frozen. Use edit to create a new version.", 409);
    } else {
      run = await this.feasibilityRepo.updateDraft(latest.id, payload, metrics);
    }

    // Save overrides if provided
    const rawOverrides = Array.isArray(body.overrides) ? body.overrides : [];
    const normalizedOverrides = this.normalizeOverrides(rawOverrides);
    await this.overridesRepo.saveForRun(run.id, normalizedOverrides);
    run.overrides = normalizedOverrides;

    await this.reportingRepo.syncCurrent(run);
    await this.relationalRepo.syncRun(run);
    return run;
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

    // Load overrides from the frozen run before archiving
    const frozenOverrides = await this.safeGetRunOverrides(latest.id);

    // Archive the frozen version
    const archived = await this.archiveRepo.archiveRun(latest);
    await this.reportingRepo.insertArchive(archived);
    await this.relationalRepo.syncArchive(archived);

    // Copy overrides from run to archive
    await this.overridesRepo.copyRunToArchive(latest.id, archived.id);

    // Delete the frozen run (CASCADE will remove run overrides)
    await this.feasibilityRepo.deleteByRunId(latest.id);
    await this.reportingRepo.deleteCurrent(latest.id);
    await this.relationalRepo.deleteRun(latest.id);

    // Create a new unversioned draft from the latest frozen data.
    const payload = latest.payload;
    const metrics = latest.metrics;
    const created = await this.feasibilityRepo.createDraft(projectId, payload, metrics);
    await this.reportingRepo.syncCurrent(created);
    await this.relationalRepo.syncRun(created);

    // Carry overrides to the new draft
    if (frozenOverrides.length > 0) {
      await this.overridesRepo.saveForRun(created.id, frozenOverrides);
    }
    created.overrides = frozenOverrides;

    return created;
  }

  async getArchive(projectId: number): Promise<ArchivedRun[]> {
    await this.ensureProjectExists(projectId);
    const runs = await this.archiveRepo.findByProjectId(projectId);
    for (const run of runs) {
      run.overrides = await this.safeGetArchiveOverrides(run.id);
    }
    return runs;
  }

  async saveOverrides(projectId: number, overrides: MetricOverride[]): Promise<MetricOverride[]> {
    await this.ensureProjectExists(projectId);
    const latest = await this.feasibilityRepo.findLatestByProjectId(projectId);
    if (!latest) throw new NotFoundError("No feasibility run found");
    if (latest.status === "frozen") throw new AppError("Cannot modify overrides on a frozen feasibility", 409);
    const normalizedOverrides = this.normalizeOverrides(overrides);
    await this.overridesRepo.saveForRun(latest.id, normalizedOverrides);
    return normalizedOverrides;
  }

  private normalizeOverrides(overrides: unknown[]): MetricOverride[] {
    return overrides.map((override, index) => {
      if (!override || typeof override !== "object") {
        throw new ValidationError(`Override at index ${index} is invalid`);
      }

      const candidate = override as Partial<MetricOverride>;
      if (!candidate.metricKey || typeof candidate.metricKey !== "string") {
        throw new ValidationError(`Override at index ${index} is missing a metricKey`);
      }

      if (!Number.isFinite(candidate.originalValue) || !Number.isFinite(candidate.overrideValue)) {
        throw new ValidationError(`Override "${candidate.metricKey}" must include numeric values`);
      }

      const justification =
        typeof candidate.justification === "string" ? candidate.justification.trim() : "";
      if (!justification) {
        throw new ValidationError(`Override "${candidate.metricKey}" requires a justification`);
      }

      return {
        metricKey: candidate.metricKey,
        originalValue: Number(candidate.originalValue),
        overrideValue: Number(candidate.overrideValue),
        justification,
      };
    });
  }

  private async safeGetRunOverrides(runId: number): Promise<MetricOverride[]> {
    try {
      return await this.overridesRepo.findByRunId(runId);
    } catch {
      return [];
    }
  }

  private async safeGetArchiveOverrides(archiveId: number): Promise<MetricOverride[]> {
    try {
      return await this.overridesRepo.findByArchiveId(archiveId);
    } catch {
      return [];
    }
  }

  private async ensureProjectExists(projectId: number): Promise<void> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");
  }
}
