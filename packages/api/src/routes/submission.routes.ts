import { Router } from "express";
import { submissionController } from "../controllers/submission.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router({ mergeParams: true });

router.get(
  "/",
  authenticate,
  submissionController.getSubmissions,
);

router.post(
  "/",
  authenticate,
  authorize("student"),
  submissionController.createSubmission,
);

export { router as submissionRouter };
