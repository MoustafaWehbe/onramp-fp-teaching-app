import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  mockCourseAssistant,
  sendGeneralAssistant,
  mockInstructorAssistant,
} from "./mock-send";
import { sendGeneralAssistantMessage } from "../../lib/assistant-api";

vi.mock("../../lib/assistant-api", () => ({
  sendGeneralAssistantMessage: vi.fn(),
}));

const mockSendGeneralAssistantMessage = vi.mocked(sendGeneralAssistantMessage);

describe("assistant send functions", () => {
  beforeEach(() => {
    mockSendGeneralAssistantMessage.mockReset();
  });

  it("sendGeneralAssistant calls the real API and normalizes the response", async () => {
    mockSendGeneralAssistantMessage.mockResolvedValue({
      type: "message",
      answer: "You can submit via GitHub.",
      sources: [{ type: "policy", id: "submission-rules", title: "Submission Rules" }],
    });

    const result = await sendGeneralAssistant("How do I submit?", []);

    expect(mockSendGeneralAssistantMessage).toHaveBeenCalledWith("How do I submit?");
    expect(result).toMatchObject({
      type: "message",
      answer: "You can submit via GitHub.",
      sources: [{ type: "policy", id: "submission-rules", title: "Submission Rules" }],
    });
  });

  it("sendGeneralAssistant defaults to an empty sources array when the API omits it", async () => {
    mockSendGeneralAssistantMessage.mockResolvedValue({
      type: "message",
      answer: "I do not have enough information.",
    });

    const result = await sendGeneralAssistant("Unrelated question", []);

    expect(result.sources).toEqual([]);
  });

  it("returns backend-compatible message responses for course and instructor mocks", async () => {
    const [course, instructor] = await Promise.all([
      mockCourseAssistant("Explain the lesson", []),
      mockInstructorAssistant("What needs review?", []),
    ]);

    expect(course).toMatchObject({
      type: "message",
      sources: [{ type: "lesson", title: "React Query Fundamentals" }],
    });
    expect(instructor).toMatchObject({ type: "message", sources: [] });
    expect(course).toHaveProperty("answer");
    expect(instructor).toHaveProperty("answer");
  });
});
