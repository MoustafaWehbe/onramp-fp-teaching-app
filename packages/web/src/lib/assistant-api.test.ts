import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssistantMessage } from "../components/assistant/types";
import { apiClient } from "./api-client";
import {
  MAX_ASSISTANT_HISTORY_MESSAGES,
  sendCourseAssistantMessage,
  sendInstructorAssistantMessage,
} from "./assistant-api";

vi.mock("./api-client", () => ({
  apiClient: { post: vi.fn() },
}));

const postMock = vi.mocked(apiClient.post);
const response = {
  data: {
    data: {
      type: "message",
      answer: "Invalidation marks matching queries as stale [1].",
      sources: [
        {
          type: "lesson",
          id: "00000000-0000-4000-8000-000000000001",
          title: "React Query Fundamentals",
        },
      ],
    },
  },
};

describe("Course Assistant API", () => {
  beforeEach(() => vi.resetAllMocks());

  it("calls the course-scoped endpoint and returns the UI contract", async () => {
    postMock.mockResolvedValueOnce(response as never);

    await expect(
      sendCourseAssistantMessage("course/id", "What is invalidation?", []),
    ).resolves.toEqual(response.data.data);
    expect(postMock).toHaveBeenCalledWith("/courses/course%2Fid/assistant", {
      message: "What is invalidation?",
      history: [],
    });
  });

  it("sends only bounded recent text history", async () => {
    postMock.mockResolvedValueOnce(response as never);
    const history: AssistantMessage[] = Array.from(
      { length: 12 },
      (_value, index) => ({
        id: `message-${index}`,
        role: index % 2 === 0 ? "user" : "assistant",
        content: ` content-${index} `,
        sources: [{ type: "policy", title: "Not sent" }],
      }),
    );

    await sendCourseAssistantMessage("course-1", "Question?", history);

    const requestBody = postMock.mock.calls[0]?.[1];
    if (
      typeof requestBody !== "object" ||
      requestBody === null ||
      !("history" in requestBody) ||
      !Array.isArray(requestBody.history)
    ) {
      throw new Error("Expected the assistant request to include history");
    }

    const sentHistory = requestBody.history;
    expect(sentHistory).toHaveLength(MAX_ASSISTANT_HISTORY_MESSAGES);
    expect(sentHistory[0]).toEqual({ role: "user", content: "content-4" });
    expect(sentHistory.at(-1)).toEqual({
      role: "assistant",
      content: "content-11",
    });
    expect(JSON.stringify(sentHistory)).not.toContain("Not sent");
    expect(JSON.stringify(sentHistory)).not.toContain("message-11");
  });

  it("rejects malformed assistant responses at the API boundary", async () => {
    postMock.mockResolvedValueOnce({
      data: { data: { type: "message", answer: "Answer", sources: [null] } },
    } as never);

    await expect(
      sendCourseAssistantMessage("course-1", "Question?", []),
    ).rejects.toThrow("The server returned an invalid assistant source.");
  });

  it("surfaces safe backend errors to the retryable assistant UI", async () => {
    postMock.mockRejectedValueOnce(
      new AxiosError(
        "Request failed",
        "ERR_BAD_RESPONSE",
        undefined,
        undefined,
        {
          data: { error: "Course enrollment required" },
          status: 403,
          statusText: "Forbidden",
          headers: {},
          config: { headers: {} } as never,
        },
      ),
    );

    await expect(
      sendCourseAssistantMessage("course-1", "Question?", []),
    ).rejects.toThrow("Course enrollment required");
  });
});

describe("Instructor Assistant API", () => {
  beforeEach(() => vi.resetAllMocks());

  it("calls the real course-scoped instructor endpoint and accepts lesson and milestone sources", async () => {
    const instructorResponse = {
      data: {
        data: {
          type: "message",
          answer: "Two submissions are pending for Authentication.",
          sources: [
            {
              type: "milestone",
              id: "00000000-0000-4000-8000-000000000010",
              title: "Authentication",
            },
            {
              type: "lesson",
              id: "00000000-0000-4000-8000-000000000011",
              title: "JWT Refresh Tokens",
            },
          ],
        },
      },
    };
    postMock.mockResolvedValueOnce(instructorResponse as never);

    await expect(
      sendInstructorAssistantMessage("course/id", "What needs grading?", []),
    ).resolves.toEqual(instructorResponse.data.data);
    expect(postMock).toHaveBeenCalledWith(
      "/courses/course%2Fid/instructor-assistant",
      { message: "What needs grading?", history: [] },
    );
  });

  it("rejects unsupported source types at the client boundary", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        data: {
          type: "message",
          answer: "Answer",
          sources: [{ type: "policy", title: "Hidden policy" }],
        },
      },
    } as never);

    await expect(
      sendInstructorAssistantMessage("course-1", "Question?", []),
    ).rejects.toThrow("The server returned an invalid assistant source.");
  });
});
