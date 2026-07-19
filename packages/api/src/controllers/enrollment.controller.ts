import type { Request, Response, NextFunction } from "express";
import { Enrollment } from "@starter-kit/shared/db/models/Enrollment";
import { Course } from "@starter-kit/shared/db/models/Course";

export const enrollmentController = {
  async enroll(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Only students can enroll
      if (req.user!.role !== "student") {
        res.status(403).json({ error: "Forbidden: Only students can enroll" });
        return;
      }

      const { enrollmentCode } = req.body;
      const studentId = req.user!.userId;

      // Find course by enrollment code
      const course = await Course.findOne({
        where: { enrollmentCode},
      });

      if (!course) {
        res.status(404).json({ error: "Invalid enrollment code or course not found" });
        return;
      }

      // Check if already enrolled
      const existing = await Enrollment.findOne({
        where: { studentId, courseId: course.id },
      });

      if (existing) {
        res.status(400).json({ error: "Already enrolled in this course" });
        return;
      }

      const enrollment = await Enrollment.create({
        studentId,
        courseId: course.id,
      });

      res.status(201).json({ data: enrollment });
    } catch (err) {
      next(err);
    }
  },
};
