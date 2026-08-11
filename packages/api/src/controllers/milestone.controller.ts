import type { Request, Response, NextFunction } from "express";
import { Milestone } from "@starter-kit/shared/db/models/Milestone";

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

      const milestones = await Milestone.findAll({
        where: { moduleId },
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

      const milestone = await Milestone.findOne({
        where: {
          id,
          moduleId,
        },
      });
      if (!milestone) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }

      res.json({ data: milestone });
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

      const milestone = await Milestone.create({
        moduleId,
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

      const milestone = await Milestone.findOne({
        where: {
          id,
          moduleId,
        },
      });
      if (!milestone) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }

      await milestone.update({
        title: req.body.title,
        instructions: req.body.instructions,
        acceptanceCriteria: req.body.acceptanceCriteria,
      });

      res.json({ data: milestone });
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

      const milestone = await Milestone.findOne({
        where: {
          id,
          moduleId,
        },
      });
      if (!milestone) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }

      await milestone.destroy();

      res.json({
        data: { message: "Milestone deleted successfully" },
      });
    } catch (err) {
      next(err);
    }
  },
};
