import { Router } from "express";
import { enrollmentController } from "../controllers/enrollment.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

router.post("/", authenticate, authorize("student"), enrollmentController.enroll);

export { router as enrollmentRouter };
