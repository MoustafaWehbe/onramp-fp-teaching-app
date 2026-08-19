import { Router } from "express";
import { postGeneralAssistantMessage } from "../controllers/assistant.controller";
import { assistantRateLimiter } from "../middleware/rate-limiter";
import { authenticate } from "../middleware/authenticate";

const assistantRouter = Router();

assistantRouter.post(
  "/general",
  authenticate,
  assistantRateLimiter,
  postGeneralAssistantMessage,
);

export { assistantRouter };
