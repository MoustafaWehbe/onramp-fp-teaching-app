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
type InstructorAssistantRequest =
  operations["askInstructorAssistant"]["requestBody"]["content"]["application/json"];
type InstructorAssistantApiResponse =
  operations["askInstructorAssistant"]["responses"][200]["content"]["application/json"];

export const MAX_ASSISTANT_HISTORY_MESSAGES = 8;
export const MAX_ASSISTANT_HISTORY_CONTENT = 1_500;
export const ASSISTANT_REQUEST_TIMEOUT_MS = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireSource(
  value: unknown,
  allowedTypes: readonly AssistantSource["type"][],
): AssistantSource {
  if (
    !isRecord(value) ||
    (value.type !== "lesson" && value.type !== "milestone") ||
    !allowedTypes.includes(value.type) ||
    typeof value.title !== "string" ||
    value.title.trim() === "" ||
    (value.id !== undefined && typeof value.id !== "string")
  ) {
    throw new Error("The server returned an invalid assistant source.");
  }

  return {
    type: value.type,
    ...(value.id !== undefined && { id: value.id }),
    title: value.title,
  };
}

function requireAssistantResponse(
  value: unknown,
  allowedSourceTypes: readonly AssistantSource["type"][],
): AssistantResponse {
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
    sources: value.sources.map((source) =>
      requireSource(source, allowedSourceTypes),
    ),
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

  return requireAssistantResponse(response.data, ["lesson"]);
}

export async function sendInstructorAssistantMessage(
  courseId: string,
  message: string,
  history: readonly AssistantMessage[],
): Promise<AssistantResponse> {
  const body: InstructorAssistantRequest = {
    message,
    history: boundedHistory(history),
  };

  let response: InstructorAssistantApiResponse;
  try {
    ({ data: response } = await apiClient.post<InstructorAssistantApiResponse>(
      `/courses/${encodeURIComponent(courseId)}/instructor-assistant`,
      body,
    ));
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        "The Instructor Assistant is unavailable. Please try again.",
      ),
    );
  }

  return requireAssistantResponse(response.data, ["lesson", "milestone"]);
}
