import { Router } from "express";
import { authRouter } from "./auth.routes";
import { courseRouter } from "./course.routes";
import { enrollmentRouter } from "./enrollment.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/courses", courseRouter);
router.use("/enrollments", enrollmentRouter);

export { router };
