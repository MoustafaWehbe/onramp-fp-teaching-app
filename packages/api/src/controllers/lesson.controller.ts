import type { Request, Response, NextFunction } from "express";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";

export const lessonController = {
  async getLessons(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const lessons = await Lesson.findAll({
        where: { moduleId: req.params.moduleId as string },
        order: [["order", "ASC"]],
      });
      res.json({ data: lessons });
    } catch (err) {
      next(err);
    }
  },

  async getLesson(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const lesson = await Lesson.findOne({
        where: { id: req.params.id, moduleId: req.params.moduleId as string },
      });
      if (!lesson) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }
      res.json({ data: lesson });
    } catch (err) {
      next(err);
    }
  },

  async createLesson(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const lesson = await Lesson.create({
        moduleId: req.params.moduleId as string,
        title: req.body.title,
        content: req.body.content ?? null,
        videoUrl: req.body.videoUrl ?? null,
        starterCodeUrl: req.body.starterCodeUrl ?? null,
        order: req.body.order ?? 0,
      });
      res.status(201).json({ data: lesson });
    } catch (err) {
      next(err);
    }
  },

  async updateLesson(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const lesson = await Lesson.findOne({
        where: { id: req.params.id, moduleId: req.params.moduleId as string },
      });
      if (!lesson) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }
      await lesson.update({
        title: req.body.title,
        content: req.body.content,
        videoUrl: req.body.videoUrl,
        starterCodeUrl: req.body.starterCodeUrl,
        order: req.body.order,
      });
      res.json({ data: lesson });
    } catch (err) {
      next(err);
    }
  },

  async deleteLesson(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const lesson = await Lesson.findOne({
        where: { id: req.params.id, moduleId: req.params.moduleId as string },
      });
      if (!lesson) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }
      await lesson.destroy();
      res.json({ data: { message: "Lesson deleted successfully" } });
    } catch (err) {
      next(err);
    }
  },
};
