import { Router } from "express";
import { assistantController } from "../controllers/assistant.controller";
import { authenticate } from "../middleware/authenticate";
import { assistantRateLimiter } from "../middleware/rate-limiter";
import { validate } from "../middleware/validate";
import { assistantMessageSchema } from "../schemas/assistant.schemas";

const router = Router();

router.post(
  "/general",
  authenticate,
  assistantRateLimiter,
  validate(assistantMessageSchema),
  assistantController.general,
);

export { router as assistantRouter };
