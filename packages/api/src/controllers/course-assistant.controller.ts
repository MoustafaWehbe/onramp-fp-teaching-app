import { Course } from "@starter-kit/shared/db/models/Course";
import { Enrollment } from "@starter-kit/shared/db/models/Enrollment";
import type { NextFunction, Request, Response } from "express";
import { answerCourseQuestion } from "../services/ai/course-assistant.service";

export const courseAssistantController = {
  async ask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courseId = req.params.courseId as string;
      const user = req.user!;
      const course = await Course.findByPk(courseId, {
        attributes: ["id", "instructorId"],
      });
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }

      if (user.role === "instructor") {
        if (course.instructorId !== user.userId) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
      } else {
        const enrollment = await Enrollment.findOne({
          where: { courseId, studentId: user.userId },
          attributes: ["id"],
        });
        if (!enrollment) {
          res.status(403).json({ error: "Course enrollment required" });
          return;
        }
      }

      const response = await answerCourseQuestion({
        courseId,
        message: req.body.message,
        history: req.body.history,
      });
      res.json({ data: response });
    } catch (error) {
      next(error);
    }
  },
};
