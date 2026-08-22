import type { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "@starter-kit/shared/auth";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";
import { Module } from "@starter-kit/shared/db/models/Module";
import { KnowledgeChunk } from "@starter-kit/shared/db/models/KnowledgeChunk";
import {
  canAccessCourseContent,
  loadLessonCourse,
  loadModuleCourse,
} from "../services/course-content-access.service";

async function requireModuleAccess(
  moduleId: string,
  user: JwtPayload,
  res: Response,
  write = false,
): Promise<Module | undefined> {
  const context = await loadModuleCourse(moduleId);
  if (!context) {
    res.status(404).json({ error: "Module not found" });
    return undefined;
  }
  if (!(await canAccessCourseContent(context.course, user, write))) {
    res.status(403).json({ error: "Forbidden" });
    return undefined;
  }
  return context.module;
}

export const lessonController = {
  async getLessons(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const module = await requireModuleAccess(
        req.params.moduleId as string,
        req.user!,
        res,
      );
      if (!module) return;
      const lessons = await Lesson.findAll({
        where: { moduleId: module.id },
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
      const context = await loadLessonCourse(
        req.params.id as string,
        req.params.moduleId as string,
      );
      if (!context) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }
      if (!(await canAccessCourseContent(context.course, req.user!))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      res.json({ data: context.lesson });
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
      const module = await requireModuleAccess(
        req.params.moduleId as string,
        req.user!,
        res,
        true,
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
      const context = await loadLessonCourse(
        req.params.id as string,
        req.params.moduleId as string,
      );
      if (!context) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }
      if (!(await canAccessCourseContent(context.course, req.user!, true))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const { lesson, module: sourceModule } = context;

      const requestedModuleId =
        typeof req.body.moduleId === "string"
          ? req.body.moduleId
          : lesson.moduleId;
      const destinationModule = await Module.findByPk(requestedModuleId);
      if (!destinationModule) {
        res.status(404).json({ error: "Destination module not found" });
        return;
      }
      if (destinationModule.courseId !== sourceModule.courseId) {
        res
          .status(403)
          .json({ error: "Lessons can only move within their course" });
        return;
      }
      const sequelize = Lesson.sequelize;
      if (!sequelize) throw new Error("Lesson model is not initialized");
      await sequelize.transaction(async (transaction) => {
        await lesson.update(
          {
            title: req.body.title,
            content: req.body.content,
            videoUrl: req.body.videoUrl,
            starterCodeUrl: req.body.starterCodeUrl,
            order: req.body.order,
            moduleId: destinationModule.id,
          },
          { transaction },
        );
        if (destinationModule.id !== sourceModule.id) {
          await KnowledgeChunk.update(
            { moduleId: destinationModule.id },
            { where: { lessonId: lesson.id }, transaction },
          );
        }
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
      const context = await loadLessonCourse(
        req.params.id as string,
        req.params.moduleId as string,
      );
      if (!context) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }
      if (!(await canAccessCourseContent(context.course, req.user!, true))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      await context.lesson.destroy();
      res.json({ data: { message: "Lesson deleted successfully" } });
    } catch (err) {
      next(err);
    }
  },
};
