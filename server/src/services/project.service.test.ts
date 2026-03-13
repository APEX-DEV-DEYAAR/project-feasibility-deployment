import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectService } from "./project.service.js";
import type { ProjectRepository } from "../repositories/project.repository.js";

function mockRepo(): ProjectRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByName: vi.fn(),
    create: vi.fn(),
    updateName: vi.fn(),
    delete: vi.fn(),
  } as unknown as ProjectRepository;
}

describe("ProjectService", () => {
  let repo: ReturnType<typeof mockRepo>;
  let service: ProjectService;

  beforeEach(() => {
    repo = mockRepo();
    service = new ProjectService(repo);
  });

  // ── listProjects ──

  it("returns all projects from the repository", async () => {
    const projects = [{ id: 1, name: "A" }];
    (repo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(projects);

    const result = await service.listProjects();
    expect(result).toEqual(projects);
    expect(repo.findAll).toHaveBeenCalledOnce();
  });

  // ── getById ──

  it("returns a project when found", async () => {
    const project = { id: 1, name: "Tower A" };
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(project);

    const result = await service.getById(1);
    expect(result).toEqual(project);
  });

  it("throws NotFoundError when project does not exist", async () => {
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(service.getById(999)).rejects.toThrow("Project not found");
  });

  // ── create ──

  it("creates a project with trimmed name", async () => {
    (repo.findByName as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (repo.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, name: "Tower B" });

    const result = await service.create("  Tower B  ");
    expect(repo.create).toHaveBeenCalledWith("Tower B");
    expect(result.name).toBe("Tower B");
  });

  it("throws ValidationError when name is empty", async () => {
    await expect(service.create("")).rejects.toThrow("Project name is required");
    await expect(service.create("   ")).rejects.toThrow("Project name is required");
  });

  it("throws ValidationError when name already exists", async () => {
    (repo.findByName as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, name: "Dup" });

    await expect(service.create("Dup")).rejects.toThrow('Project "Dup" already exists');
  });

  // ── delete ──

  it("deletes a project successfully", async () => {
    (repo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await expect(service.delete(1)).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith(1);
  });

  it("throws NotFoundError when deleting non-existent project", async () => {
    (repo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await expect(service.delete(999)).rejects.toThrow("Project not found");
  });
});
