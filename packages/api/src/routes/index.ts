import { Router } from "express";
import { authRouter } from "./auth.routes";
import { courseRouter } from "./course.routes";
import { enrollmentRouter } from "./enrollment.routes";
import { milestoneRouter } from "./milestone.routes";
import { submissionRouter } from "./submission.routes";
import { gradingRouter } from "./grading.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/courses", courseRouter);
router.use("/enrollments", enrollmentRouter);
router.use("/modules/:moduleId/milestones", milestoneRouter);
router.use("/milestones/:milestoneId/submissions", submissionRouter);
router.use("/submissions", gradingRouter);

export { router };
