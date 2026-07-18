import { Router } from "express";
import { authRouter } from "./auth.routes";
import { courseRouter } from "./course.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/courses", courseRouter);

export { router };
