import { z } from "zod";
import {
  MAX_COURSE_ASSISTANT_HISTORY_CONTENT,
  MAX_COURSE_ASSISTANT_HISTORY_MESSAGES,
} from "../services/ai/course-assistant.service";

export const MAX_COURSE_ASSISTANT_MESSAGE_LENGTH = 1_500;

const historyMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(MAX_COURSE_ASSISTANT_HISTORY_CONTENT),
  })
  .strict();

export const courseAssistantParamsSchema = z
  .object({ courseId: z.string().uuid() })
  .strict();

export const courseAssistantBodySchema = z
  .object({
    message: z
      .string({ required_error: "message is required" })
      .trim()
      .min(1, "message must not be empty")
      .max(
        MAX_COURSE_ASSISTANT_MESSAGE_LENGTH,
        `message must not exceed ${MAX_COURSE_ASSISTANT_MESSAGE_LENGTH} characters`,
      ),
    history: z
      .array(historyMessageSchema)
      .max(MAX_COURSE_ASSISTANT_HISTORY_MESSAGES)
      .optional()
      .default([]),
  })
  .strict();
