import { Router } from "express";
import { lessonController } from "../controllers/lesson.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router({ mergeParams: true });

router.get("/", authenticate, lessonController.getLessons);
router.post("/", authenticate, authorize("instructor"), lessonController.createLesson);
router.get("/:id", authenticate, lessonController.getLesson);
router.put("/:id", authenticate, authorize("instructor"), lessonController.updateLesson);
router.delete("/:id", authenticate, authorize("instructor"), lessonController.deleteLesson);

export { router as lessonRouter };
