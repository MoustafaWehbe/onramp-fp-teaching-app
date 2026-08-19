import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssistantMessage } from "../components/assistant/types";
import { apiClient } from "./api-client";
import {
  ASSISTANT_REQUEST_TIMEOUT_MS,
  MAX_ASSISTANT_HISTORY_MESSAGES,
  sendCourseAssistantMessage,
  sendGeneralAssistantMessage,
} from "./assistant-api";

vi.mock("./api-client", () => ({
  apiClient: { post: vi.fn() },
}));

const postMock = vi.mocked(apiClient.post);

describe("sendGeneralAssistantMessage", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it("posts the message to /assistant/general", async () => {
    postMock.mockResolvedValue({
      data: {
        data: {
          type: "message",
          answer: "You can submit via GitHub.",
          sources: [],
        },
      },
    });

    await sendGeneralAssistantMessage("How do I submit?");

    expect(postMock).toHaveBeenCalledWith("/assistant/general", {
      message: "How do I submit?",
    });
  });

  it("returns the unwrapped data payload", async () => {
    postMock.mockResolvedValue({
      data: {
        data: {
          type: "message",
          answer: "Answer text",
          sources: [{ type: "policy", id: "grades", title: "Grades" }],
        },
      },
    });

    const result = await sendGeneralAssistantMessage("Where are my grades?");

    expect(result).toEqual({
      type: "message",
      answer: "Answer text",
      sources: [{ type: "policy", id: "grades", title: "Grades" }],
    });
  });

  it("throws when the server returns no data payload", async () => {
    postMock.mockResolvedValue({ data: {} });

    await expect(sendGeneralAssistantMessage("test")).rejects.toThrow(
      "The server returned an invalid assistant response.",
    );
  });

  it("propagates network/axios errors to the caller", async () => {
    postMock.mockRejectedValue(new Error("Network Error"));

    await expect(sendGeneralAssistantMessage("test")).rejects.toThrow(
      "Network Error",
    );
  });
});

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
    expect(postMock).toHaveBeenCalledWith(
      "/courses/course%2Fid/assistant",
      {
        message: "What is invalidation?",
        history: [],
      },
      { signal: undefined, timeout: ASSISTANT_REQUEST_TIMEOUT_MS },
    );
  });

  it("passes cancellation and a bounded timeout to the API client", async () => {
    postMock.mockResolvedValueOnce(response as never);
    const controller = new AbortController();

    await sendCourseAssistantMessage(
      "course-1",
      "Question?",
      [],
      controller.signal,
    );

    expect(postMock).toHaveBeenCalledWith(
      "/courses/course-1/assistant",
      { message: "Question?", history: [] },
      {
        signal: controller.signal,
        timeout: ASSISTANT_REQUEST_TIMEOUT_MS,
      },
    );
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
