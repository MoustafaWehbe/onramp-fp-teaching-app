import type { Request, Response, NextFunction } from "express";
import { Course } from "@starter-kit/shared/db/models/Course";
import { randomBytes } from "crypto";

export const courseController = {
  async getCourses(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;

      let courses;
      if (role === "instructor") {
        courses = await Course.findAll({
          where: { instructorId: userId },
        });
      } else {
        // students see enrolled courses — will be updated when enrollment is added
        courses = await Course.findAll();
      }

      res.json({ data: courses });
    } catch (err) {
      next(err);
    }
  },

  async getCourse(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const course = await Course.findByPk(req.params.id as string);
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }
      res.json({ data: course });
    } catch (err) {
      next(err);
    }
  },

  async createCourse(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const instructorId = req.user!.userId;
      const enrollmentCode = randomBytes(4).toString("hex").toUpperCase();

      const course = await Course.create({
        ...req.body,
        instructorId,
        enrollmentCode,
      });

      res.status(201).json({ data: course });
    } catch (err) {
      next(err);
    }
  },

  async updateCourse(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const course = await Course.findByPk(req.params.id as string);
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }

      if (course.instructorId !== req.user!.userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await course.update(req.body);
      res.json({ data: course });
    } catch (err) {
      next(err);
    }
  },

  async deleteCourse(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const course = await Course.findByPk(req.params.id as string);
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }

      if (course.instructorId !== req.user!.userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await course.destroy();
      res.json({ data: { message: "Course deleted successfully" } });
    } catch (err) {
      next(err);
    }
  },
};
