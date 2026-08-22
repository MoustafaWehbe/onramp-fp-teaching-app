import type { Request, Response, NextFunction } from "express";
import { Course } from "@starter-kit/shared/db/models/Course";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";
import { Module } from "@starter-kit/shared/db/models/Module";
import {
  canAccessCourseContent,
  loadLessonCourse,
  ownsCourse,
} from "../services/course-content-access.service";

export interface LessonAccessContext {
  lesson: Lesson;
  module: Module;
  course: Course;
  canWrite: boolean;
}

declare global {
  namespace Express {
    interface Request {
      lessonAccess?: LessonAccessContext;
    }
  }
}

export function requireLessonAccess(write = false) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const moduleId = req.params.moduleId as string;
      const lessonId = req.params.lessonId as string;
      const context = await loadLessonCourse(lessonId, moduleId);
      if (!context) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }
      if (!(await canAccessCourseContent(context.course, user, write))) {
        res
          .status(403)
          .json({ error: "You do not have access to this lesson" });
        return;
      }

      req.lessonAccess = {
        lesson: context.lesson,
        module: context.module,
        course: context.course,
        canWrite: ownsCourse(context.course, user),
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
