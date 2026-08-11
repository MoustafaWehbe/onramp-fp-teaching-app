import type { Request, Response, NextFunction } from "express";
import { MilestoneLesson } from "@starter-kit/shared/db/models/MilestoneLesson";
import { Milestone } from "@starter-kit/shared/db/models/Milestone";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";

function getParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const milestoneLessonController = {
  async getLessons(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const milestoneId = getParam(req.params.milestoneId);

      const milestone = await Milestone.findByPk(milestoneId, {
        include: [{ model: Lesson, as: "lessons" }],
      });

      if (!milestone) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }

      res.json({ data: (milestone as any).lessons });
    } catch (err) {
      next(err);
    }
  },

  async addLesson(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const milestoneId = getParam(req.params.milestoneId);
      const { lessonId } = req.body;

      if (!lessonId) {
        res.status(400).json({ error: "lessonId is required" });
        return;
      }

      const milestone = await Milestone.findByPk(milestoneId);

      if (!milestone) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }

      const lesson = await Lesson.findByPk(lessonId as string);

      if (!lesson) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }

      const existing = await MilestoneLesson.findOne({
        where: { milestoneId, lessonId },
      });

      if (existing) {
        res.status(400).json({
          error: "Lesson already linked to this milestone",
        });
        return;
      }

      const milestoneLesson = await MilestoneLesson.create({
        milestoneId,
        lessonId,
      });

      res.status(201).json({ data: milestoneLesson });
    } catch (err) {
      next(err);
    }
  },

  async removeLesson(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const milestoneId = getParam(req.params.milestoneId);
      const lessonId = getParam(req.params.lessonId);

      const milestoneLesson = await MilestoneLesson.findOne({
        where: { milestoneId, lessonId },
      });

      if (!milestoneLesson) {
        res.status(404).json({
          error: "Lesson not linked to this milestone",
        });
        return;
      }

      await milestoneLesson.destroy();

      res.json({
        data: { message: "Lesson removed from milestone" },
      });
    } catch (err) {
      next(err);
    }
  },
};
