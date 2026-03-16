import { NotFoundError, ValidationError } from "../../shared/errors/AppError.js";
import type { ProjectRepository } from "./project.repository.js";
import type { Project, ProjectSummary } from "../../shared/types/index.js";

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  async listProjects(): Promise<ProjectSummary[]> {
    return this.repository.findAll();
  }

  async getById(id: number): Promise<Project> {
    const project = await this.repository.findById(id);
    if (!project) throw new NotFoundError("Project not found");
    return project;
  }

  async create(name: string): Promise<Project> {
    const trimmed = name.trim();
    if (!trimmed) throw new ValidationError("Project name is required");

    const existing = await this.repository.findByName(trimmed);
    if (existing) throw new ValidationError(`Project "${trimmed}" already exists`);

    return this.repository.create(trimmed);
  }

  async delete(id: number): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundError("Project not found");
  }
}
