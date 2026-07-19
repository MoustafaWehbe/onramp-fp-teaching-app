import { Router } from "express";
import { courseController } from "../controllers/course.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/", authenticate, courseController.getCourses);
router.post("/", authenticate, courseController.createCourse);
router.get("/:id", authenticate, courseController.getCourse);
router.put("/:id", authenticate, courseController.updateCourse);
router.delete("/:id", authenticate, courseController.deleteCourse);

export { router as courseRouter };
