import type { Request, Response, NextFunction } from "express";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";
import { Module } from "@starter-kit/shared/db/models/Module";
import { Course } from "@starter-kit/shared/db/models/Course";
import { KnowledgeChunk } from "@starter-kit/shared/db/models/KnowledgeChunk";

async function requireOwnedModule(
  moduleId: string,
  instructorId: string,
  res: Response,
): Promise<Module | undefined> {
  const module = await Module.findByPk(moduleId);
  if (!module) {
    res.status(404).json({ error: "Module not found" });
    return undefined;
  }
  const course = await Course.findByPk(module.courseId);
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return undefined;
  }
  if (course.instructorId !== instructorId) {
    res.status(403).json({ error: "Forbidden" });
    return undefined;
  }
  return module;
}

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
      const module = await requireOwnedModule(
        req.params.moduleId as string,
        req.user!.userId,
        res,
      );
      if (!module) return;

      const lesson = await Lesson.create({
        moduleId: module.id,
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
      const sourceModule = await requireOwnedModule(
        lesson.moduleId,
        req.user!.userId,
        res,
      );
      if (!sourceModule) return;

      const requestedModuleId =
        typeof req.body.moduleId === "string" ? req.body.moduleId : lesson.moduleId;
      const destinationModule = await Module.findByPk(requestedModuleId);
      if (!destinationModule) {
        res.status(404).json({ error: "Destination module not found" });
        return;
      }
      if (destinationModule.courseId !== sourceModule.courseId) {
        res.status(403).json({ error: "Lessons can only move within their course" });
        return;
      }
      await lesson.update({
        title: req.body.title,
        content: req.body.content,
        videoUrl: req.body.videoUrl,
        starterCodeUrl: req.body.starterCodeUrl,
        order: req.body.order,
        moduleId: destinationModule.id,
      });
      if (destinationModule.id !== sourceModule.id) {
        await KnowledgeChunk.update(
          { moduleId: destinationModule.id },
          { where: { lessonId: lesson.id } },
        );
      }
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
      const module = await requireOwnedModule(
        lesson.moduleId,
        req.user!.userId,
        res,
      );
      if (!module) return;
      await lesson.destroy();
      res.json({ data: { message: "Lesson deleted successfully" } });
    } catch (err) {
      next(err);
    }
  },
};
