import type { Request, Response, NextFunction } from "express";
import { Module } from "@starter-kit/shared/db/models/Module";
import { Course } from "@starter-kit/shared/db/models/Course";
import type { JwtPayload } from "@starter-kit/shared/auth";
import {
  canAccessCourseContent,
  loadModuleCourse,
} from "../services/course-content-access.service";

async function requireCourseAccess(
  courseId: string,
  user: JwtPayload,
  res: Response,
  write = false,
): Promise<Course | undefined> {
  const course = await Course.findByPk(courseId);
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return undefined;
  }
  if (!(await canAccessCourseContent(course, user, write))) {
    res.status(403).json({ error: "Forbidden" });
    return undefined;
  }
  return course;
}

export const moduleController = {
  async getModules(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const course = await requireCourseAccess(
        req.params.courseId as string,
        req.user!,
        res,
      );
      if (!course) return;
      const modules = await Module.findAll({
        where: { courseId: course.id },
        order: [["order", "ASC"]],
      });
      res.json({ data: modules });
    } catch (err) {
      next(err);
    }
  },

  async getModule(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const context = await loadModuleCourse(
        req.params.id as string,
        req.params.courseId as string,
      );
      if (!context) {
        res.status(404).json({ error: "Module not found" });
        return;
      }
      if (!(await canAccessCourseContent(context.course, req.user!))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      res.json({ data: context.module });
    } catch (err) {
      next(err);
    }
  },

  async createModule(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const course = await requireCourseAccess(
        req.params.courseId as string,
        req.user!,
        res,
        true,
      );
      if (!course) return;

      const module = await Module.create({
        courseId: course.id,
        title: req.body.title,
        order: req.body.order ?? 0,
      });
      res.status(201).json({ data: module });
    } catch (err) {
      next(err);
    }
  },

  async updateModule(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const context = await loadModuleCourse(
        req.params.id as string,
        req.params.courseId as string,
      );
      if (!context) {
        res.status(404).json({ error: "Module not found" });
        return;
      }
      if (!(await canAccessCourseContent(context.course, req.user!, true))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      await context.module.update({
        title: req.body.title,
        order: req.body.order,
      });
      res.json({ data: context.module });
    } catch (err) {
      next(err);
    }
  },

  async deleteModule(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const context = await loadModuleCourse(
        req.params.id as string,
        req.params.courseId as string,
      );
      if (!context) {
        res.status(404).json({ error: "Module not found" });
        return;
      }
      if (!(await canAccessCourseContent(context.course, req.user!, true))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      await context.module.destroy();
      res.json({ data: { message: "Module deleted successfully" } });
    } catch (err) {
      next(err);
    }
  },
};
