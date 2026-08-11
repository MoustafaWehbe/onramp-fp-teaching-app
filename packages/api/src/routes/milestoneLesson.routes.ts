import { Router } from "express";
import { milestoneLessonController } from "../controllers/milestoneLesson.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router({ mergeParams: true });

router.get("/", authenticate, milestoneLessonController.getLessons);
router.post("/", authenticate, authorize("instructor"), milestoneLessonController.addLesson);
router.delete("/:lessonId", authenticate, authorize("instructor"), milestoneLessonController.removeLesson);

export { router as milestoneLessonRouter };
