import type { Request, Response, NextFunction } from "express";
import type { ProjectService } from "../services/project.service.js";

export function createProjectController(service: ProjectService) {
  return {
    async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const projects = await service.listProjects();
        res.json(projects);
      } catch (err) {
        next(err);
      }
    },

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const project = await service.getById(Number(req.params.id));
        res.json(project);
      } catch (err) {
        next(err);
      }
    },

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const project = await service.create(req.body.name);
        res.status(201).json(project);
      } catch (err) {
        next(err);
      }
    },

    async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        await service.delete(Number(req.params.id));
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    },
  };
}
