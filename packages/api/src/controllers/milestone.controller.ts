import type { Request, Response, NextFunction } from "express";
import { Milestone } from "@starter-kit/shared/db/models/Milestone";
import {
  canAccessCourseContent,
  loadMilestoneCourse,
  loadModuleCourse,
} from "../services/course-content-access.service";

function getParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const milestoneController = {
  async getMilestones(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const moduleId = getParam(req.params.moduleId);
      const context = await loadModuleCourse(moduleId);
      if (!context) {
        res.status(404).json({ error: "Module not found" });
        return;
      }
      if (!(await canAccessCourseContent(context.course, req.user!))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const milestones = await Milestone.findAll({
        where: { moduleId: context.module.id },
      });

      res.json({ data: milestones });
    } catch (err) {
      next(err);
    }
  },

  async getMilestone(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const moduleId = getParam(req.params.moduleId);

      const context = await loadMilestoneCourse(id, moduleId);
      if (!context) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }
      if (!(await canAccessCourseContent(context.course, req.user!))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      res.json({ data: context.milestone });
    } catch (err) {
      next(err);
    }
  },

  async createMilestone(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const moduleId = getParam(req.params.moduleId);
      const context = await loadModuleCourse(moduleId);
      if (!context) {
        res.status(404).json({ error: "Module not found" });
        return;
      }
      if (!(await canAccessCourseContent(context.course, req.user!, true))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const milestone = await Milestone.create({
        moduleId: context.module.id,
        title: req.body.title,
        instructions: req.body.instructions,
        acceptanceCriteria: req.body.acceptanceCriteria,
      });

      res.status(201).json({ data: milestone });
    } catch (err) {
      next(err);
    }
  },

  async updateMilestone(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const moduleId = getParam(req.params.moduleId);

      const context = await loadMilestoneCourse(id, moduleId);
      if (!context) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }
      if (!(await canAccessCourseContent(context.course, req.user!, true))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await context.milestone.update({
        title: req.body.title,
        instructions: req.body.instructions,
        acceptanceCriteria: req.body.acceptanceCriteria,
      });

      res.json({ data: context.milestone });
    } catch (err) {
      next(err);
    }
  },

  async deleteMilestone(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const moduleId = getParam(req.params.moduleId);

      const context = await loadMilestoneCourse(id, moduleId);
      if (!context) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }
      if (!(await canAccessCourseContent(context.course, req.user!, true))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await context.milestone.destroy();

      res.json({
        data: { message: "Milestone deleted successfully" },
      });
    } catch (err) {
      next(err);
    }
  },
};
