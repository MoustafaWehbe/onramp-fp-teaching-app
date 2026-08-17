import { Router } from "express";
import { courseController } from "../controllers/course.controller";
import { authenticate } from "../middleware/authenticate";
import { courseAssistantController } from "../controllers/course-assistant.controller";
import { assistantRateLimiter } from "../middleware/rate-limiter";
import { validate } from "../middleware/validate";
import {
  courseAssistantBodySchema,
  courseAssistantParamsSchema,
} from "../schemas/course-assistant.schemas";

const router = Router();

router.get("/", authenticate, courseController.getCourses);
router.post("/", authenticate, courseController.createCourse);
router.post(
  "/:courseId/assistant",
  authenticate,
  assistantRateLimiter,
  validate(courseAssistantParamsSchema, "params"),
  validate(courseAssistantBodySchema),
  courseAssistantController.ask,
);
router.get("/:id", authenticate, courseController.getCourse);
router.put("/:id", authenticate, courseController.updateCourse);
router.delete("/:id", authenticate, courseController.deleteCourse);

export { router as courseRouter };
