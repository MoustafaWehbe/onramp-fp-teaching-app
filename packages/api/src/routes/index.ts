import { Router } from "express";
import { authRouter } from "./auth.routes";
import { courseRouter } from "./course.routes";
import { enrollmentRouter } from "./enrollment.routes";
import { milestoneRouter } from "./milestone.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/courses", courseRouter);
router.use("/enrollments", enrollmentRouter);
router.use("/modules/:moduleId/milestones", milestoneRouter);

export { router };
