import type { Request, Response, NextFunction } from "express";
import { Milestone } from "@starter-kit/shared/db/models/Milestone";

export const milestoneController = {
  async getMilestones(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const milestones = await Milestone.findAll({
        where: { moduleId: req.params.moduleId },
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
      const milestone = await Milestone.findByPk(req.params.id as string);
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
      const milestone = await Milestone.create({
        moduleId: req.params.moduleId,
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
      const milestone = await Milestone.findByPk(req.params.id as string);
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
      const milestone = await Milestone.findByPk(req.params.id as string);
      if (!milestone) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }
      await milestone.destroy();
      res.json({ data: { message: "Milestone deleted successfully" } });
    } catch (err) {
      next(err);
    }
  },
};
