import { Course } from "@starter-kit/shared/db/models/Course";
import type { NextFunction, Request, Response } from "express";
import { answerInstructorQuestion } from "../services/ai/instructor/instructor-assistant.service";

export const instructorAssistantController = {
  async ask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      if (user.role !== "instructor") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const courseId = req.params.courseId as string;
      const course = await Course.findByPk(courseId, {
        attributes: ["id", "instructorId"],
      });
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }
      if (course.instructorId !== user.userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const response = await answerInstructorQuestion({
        courseId: course.id,
        instructorId: user.userId,
        message: req.body.message,
        history: req.body.history,
      });
      res.json({ data: response });
    } catch (error) {
      next(error);
    }
  },
};
