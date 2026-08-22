import type { Request, Response, NextFunction } from "express";
import { Module } from "@starter-kit/shared/db/models/Module";
import { Course } from "@starter-kit/shared/db/models/Course";

async function requireOwnedCourse(
  courseId: string,
  instructorId: string,
  res: Response,
): Promise<Course | undefined> {
  const course = await Course.findByPk(courseId);
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return undefined;
  }
  if (course.instructorId !== instructorId) {
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
      const modules = await Module.findAll({
        where: { courseId: req.params.courseId as string },
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
      const module = await Module.findOne({
        where: { id: req.params.id, courseId: req.params.courseId as string },
      });
      if (!module) {
        res.status(404).json({ error: "Module not found" });
        return;
      }
      res.json({ data: module });
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
      const course = await requireOwnedCourse(
        req.params.courseId as string,
        req.user!.userId,
        res,
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
      const module = await Module.findOne({
        where: { id: req.params.id, courseId: req.params.courseId as string },
      });
      if (!module) {
        res.status(404).json({ error: "Module not found" });
        return;
      }
      const course = await requireOwnedCourse(
        module.courseId,
        req.user!.userId,
        res,
      );
      if (!course) return;
      await module.update({
        title: req.body.title,
        order: req.body.order,
      });
      res.json({ data: module });
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
      const module = await Module.findOne({
        where: { id: req.params.id, courseId: req.params.courseId as string },
      });
      if (!module) {
        res.status(404).json({ error: "Module not found" });
        return;
      }
      const course = await requireOwnedCourse(
        module.courseId,
        req.user!.userId,
        res,
      );
      if (!course) return;
      await module.destroy();
      res.json({ data: { message: "Module deleted successfully" } });
    } catch (err) {
      next(err);
    }
  },
};
