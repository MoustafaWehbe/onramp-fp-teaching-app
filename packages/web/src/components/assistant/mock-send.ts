import type {
  AssistantMessage,
  AssistantResponse,
  AssistantSource,
} from "./types";
import { sendGeneralAssistantMessage } from "../../lib/assistant-api";

const MOCK_DELAY_MS = 500;

async function uiMockResponse(
  answer: string,
  sources: AssistantSource[],
): Promise<AssistantResponse> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

  return {
    type: "message",
    answer,
    sources,
  };
}

export async function sendGeneralAssistant(
  message: string,
  _history: AssistantMessage[],
): Promise<AssistantResponse> {
  const result = await sendGeneralAssistantMessage(message);

  const sources: AssistantSource[] = (result.sources ?? [])
    .filter(
      (s): s is { type: "policy" | "lesson" | "milestone"; id?: string; title: string } =>
        s.type !== undefined && s.title !== undefined,
    )
    .map((s) => ({ type: s.type, id: s.id, title: s.title }));

  return {
    type: "message",
    answer: result.answer ?? "",
    sources,
  };
}

// UI-only mocks. Replace these functions with API calls when assistant endpoints exist.
export function mockCourseAssistant(
  _message: string,
  _history: AssistantMessage[],
): Promise<AssistantResponse> {
  return uiMockResponse(
    "Query invalidation marks matching cached queries as stale so they can be refetched. This preview uses a local UI mock.",
    [
      {
        type: "lesson",
        id: "mock-lesson",
        title: "React Query Fundamentals",
      },
    ],
  );
}

export function mockInstructorAssistant(
  _message: string,
  _history: AssistantMessage[],
): Promise<AssistantResponse> {
  return uiMockResponse(
    "Instructor summaries will appear here after the assistant API is connected. This preview does not calculate real course analytics.",
    [],
  );
}
