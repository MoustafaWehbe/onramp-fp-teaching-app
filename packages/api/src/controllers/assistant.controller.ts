import { Request, Response } from "express";
import { z } from "zod";
import { askGeneralAssistant } from "../services/ai/general-assistant.service";
import { AIError, AIErrorCode } from "../services/ai/ai.errors";

const generalAssistantSchema = z.object({
  message: z.string().trim().min(1).max(1500),
});

export async function postGeneralAssistantMessage(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = generalAssistantSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request. 'message' must be a non-empty string up to 1500 characters.",
    });
    return;
  }

  try {
    const result = await askGeneralAssistant(parsed.data.message);

    res.status(200).json({
      data: {
        type: "message",
        answer: result.answer,
        sources: result.sources,
      },
    });
  } catch (error) {
    if (error instanceof AIError) {
      const status = error.code === AIErrorCode.NOT_CONFIGURED ? 503 : 502;

      res.status(status).json({
        error: "The assistant is temporarily unavailable. Please try again.",
      });
      return;
    }

    res.status(500).json({
      error: "The assistant is temporarily unavailable. Please try again.",
    });
  }
}
