import { apiClient } from "./api-client";
import type { operations } from "./api-types";
import { getApiErrorMessage } from "./courses-api";
import type {
  AssistantMessage,
  AssistantResponse,
  AssistantSource,
} from "../components/assistant/types";

type CourseAssistantRequest =
  operations["askCourseAssistant"]["requestBody"]["content"]["application/json"];
type CourseAssistantApiResponse =
  operations["askCourseAssistant"]["responses"][200]["content"]["application/json"];

export const MAX_ASSISTANT_HISTORY_MESSAGES = 8;
export const MAX_ASSISTANT_HISTORY_CONTENT = 1_500;
export const ASSISTANT_REQUEST_TIMEOUT_MS = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireSource(value: unknown): AssistantSource {
  if (
    !isRecord(value) ||
    value.type !== "lesson" ||
    typeof value.title !== "string" ||
    value.title.trim() === "" ||
    (value.id !== undefined && typeof value.id !== "string")
  ) {
    throw new Error("The server returned an invalid assistant source.");
  }

  return {
    type: "lesson",
    ...(value.id !== undefined && { id: value.id }),
    title: value.title,
  };
}

function requireAssistantResponse(value: unknown): AssistantResponse {
  if (
    !isRecord(value) ||
    value.type !== "message" ||
    typeof value.answer !== "string" ||
    value.answer.trim() === "" ||
    !Array.isArray(value.sources)
  ) {
    throw new Error("The server returned an invalid assistant response.");
  }

  return {
    type: "message",
    answer: value.answer,
    sources: value.sources.map(requireSource),
  };
}

function boundedHistory(history: readonly AssistantMessage[]) {
  return history.slice(-MAX_ASSISTANT_HISTORY_MESSAGES).flatMap((item) => {
    const content = item.content.trim().slice(0, MAX_ASSISTANT_HISTORY_CONTENT);
    return content ? [{ role: item.role, content }] : [];
  });
}

export async function sendCourseAssistantMessage(
  courseId: string,
  message: string,
  history: readonly AssistantMessage[],
  signal?: AbortSignal,
): Promise<AssistantResponse> {
  const body: CourseAssistantRequest = {
    message,
    history: boundedHistory(history),
  };

  let response: CourseAssistantApiResponse;
  try {
    ({ data: response } = await apiClient.post<CourseAssistantApiResponse>(
      `/courses/${encodeURIComponent(courseId)}/assistant`,
      body,
      { signal, timeout: ASSISTANT_REQUEST_TIMEOUT_MS },
    ));
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        "The Course Assistant is unavailable. Please try again.",
      ),
    );
  }

  return requireAssistantResponse(response.data);
}
