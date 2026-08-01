import { Router } from "express";
import { submissionController } from "../controllers/submission.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

router.post(
  "/:id/grade",
  authenticate,
  authorize("instructor"),
  submissionController.gradeSubmission,
);

router.get(
  "/my/grades",
  authenticate,
  authorize("student"),
  submissionController.getMyGrades,
);

export { router as gradingRouter };
