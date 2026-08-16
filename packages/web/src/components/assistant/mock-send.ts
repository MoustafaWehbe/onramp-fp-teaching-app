import type {
  AssistantMessage,
  AssistantResponse,
  AssistantSource,
} from "./types";

const MOCK_DELAY_MS = 500;

async function uiMockResponse(
  answer: string,
  sources: AssistantSource[],
): Promise<AssistantResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, MOCK_DELAY_MS));

  return {
    type: "message",
    answer,
    sources,
  };
}

// UI-only mocks. Replace these functions with API calls when assistant endpoints exist.
export function mockGeneralAssistant(
  _message: string,
  _history: AssistantMessage[],
): Promise<AssistantResponse> {
  return uiMockResponse(
    "Students can view graded submissions and feedback from the Grades page. This preview uses a local UI mock.",
    [{ type: "policy", id: "grades", title: "Grades" }],
  );
}

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
