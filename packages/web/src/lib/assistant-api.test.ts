import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./api-client";
import { sendGeneralAssistantMessage } from "./assistant-api";

vi.mock("./api-client", () => ({
  apiClient: { post: vi.fn() },
}));

const mockPost = vi.mocked(apiClient.post);

describe("sendGeneralAssistantMessage", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("posts the message to /assistant/general", async () => {
    mockPost.mockResolvedValue({
      data: {
        data: {
          type: "message",
          answer: "You can submit via GitHub.",
          sources: [],
        },
      },
    });

    await sendGeneralAssistantMessage("How do I submit?");

    expect(mockPost).toHaveBeenCalledWith("/assistant/general", {
      message: "How do I submit?",
    });
  });

  it("returns the unwrapped data payload", async () => {
    mockPost.mockResolvedValue({
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
    mockPost.mockResolvedValue({ data: {} });

    await expect(sendGeneralAssistantMessage("test")).rejects.toThrow(
      "The server returned an invalid assistant response.",
    );
  });

  it("propagates network/axios errors to the caller", async () => {
    mockPost.mockRejectedValue(new Error("Network Error"));

    await expect(sendGeneralAssistantMessage("test")).rejects.toThrow(
      "Network Error",
    );
  });
});
