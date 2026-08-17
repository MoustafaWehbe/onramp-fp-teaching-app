import type { NextFunction, Request, Response } from "express";
import { generalAssistantService } from "../services/ai/general-assistant.service";

export const assistantController = {
  async general(
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> {
    try {
      const data = await generalAssistantService.respond(req.body.message);
      res.json({ data });
    } catch {
      // Provider details must never be returned to the client.
      res.status(503).json({
        error: "The assistant is temporarily unavailable. Please try again.",
      });
    }
  },
};
