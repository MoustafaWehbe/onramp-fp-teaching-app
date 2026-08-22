import type { Request, Response, NextFunction } from "express";
import { Course } from "@starter-kit/shared/db/models/Course";
import { Enrollment } from "@starter-kit/shared/db/models/Enrollment";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";
import { Module } from "@starter-kit/shared/db/models/Module";

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
      const lesson = await Lesson.findOne({
        where: { id: lessonId, moduleId },
      });
      if (!lesson) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }

      const module = await Module.findByPk(moduleId);
      if (!module) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }
      const course = await Course.findByPk(module.courseId);
      if (!course) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }

      const ownsCourse =
        user.role === "instructor" && course.instructorId === user.userId;
      if (write) {
        if (!ownsCourse) {
          res
            .status(403)
            .json({ error: "You do not have access to this lesson" });
          return;
        }
      } else if (user.role === "instructor") {
        if (!ownsCourse) {
          res
            .status(403)
            .json({ error: "You do not have access to this lesson" });
          return;
        }
      } else {
        const enrollment = course.isPublished
          ? await Enrollment.findOne({
              where: { courseId: course.id, studentId: user.userId },
              attributes: ["id"],
            })
          : null;
        if (!course.isPublished || !enrollment) {
          res
            .status(403)
            .json({ error: "You do not have access to this lesson" });
          return;
        }
      }

      req.lessonAccess = { lesson, module, course, canWrite: ownsCourse };
      next();
    } catch (error) {
      next(error);
    }
  };
}
