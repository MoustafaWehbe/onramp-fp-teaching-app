import { Router } from "express";
import { authRouter } from "./auth.routes";
import { courseRouter } from "./course.routes";
import { enrollmentRouter } from "./enrollment.routes";
import { milestoneRouter } from "./milestone.routes";
import { milestoneLessonRouter } from "./milestoneLesson.routes";
import { submissionRouter } from "./submission.routes";
import { gradingRouter } from "./grading.routes";
import { moduleRouter } from "./module.routes";
import { lessonRouter } from "./lesson.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/courses", courseRouter);
router.use("/enrollments", enrollmentRouter);
router.use("/courses/:courseId/modules", moduleRouter);
router.use("/modules/:moduleId/lessons", lessonRouter);
router.use("/modules/:moduleId/milestones", milestoneRouter);
router.use("/milestones/:milestoneId/lessons", milestoneLessonRouter);
router.use("/milestones/:milestoneId/submissions", submissionRouter);
router.use("/submissions", gradingRouter);

export { router };
