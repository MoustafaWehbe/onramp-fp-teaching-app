import { Router } from "express";
import { enrollmentController } from "../controllers/enrollment.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.post("/", authenticate, enrollmentController.enroll);

export { router as enrollmentRouter };
