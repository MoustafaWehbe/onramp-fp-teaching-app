import { geminiService } from "../../src/services/ai/gemini.service";
import { askGeneralAssistant } from "../../src/services/ai/general-assistant.service";

jest.mock("../../src/services/ai/gemini.service", () => ({
  geminiService: { generateText: jest.fn() },
}));

const mockGenerateText = jest.mocked(geminiService.generateText);

describe("askGeneralAssistant", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  it("returns the answer text from Gemini", async () => {
    mockGenerateText.mockResolvedValue({
      text: "You can submit via a GitHub link.",
      steps: [],
    });

    const result = await askGeneralAssistant("How do I submit?");

    expect(result.answer).toBe("You can submit via a GitHub link.");
  });

  it("passes the user message as input to Gemini", async () => {
    mockGenerateText.mockResolvedValue({ text: "Answer", steps: [] });

    await askGeneralAssistant("How do I enroll?");

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ input: "How do I enroll?" }),
    );
  });

  it("includes a system instruction that restricts scope to platform policies", async () => {
    mockGenerateText.mockResolvedValue({ text: "Answer", steps: [] });

    await askGeneralAssistant("test");

    const call = mockGenerateText.mock.calls[0][0];
    expect(call.systemInstruction).toContain("MentorLane Assistant");
    expect(call.systemInstruction).toContain("Course Assistant");
  });

  it("attaches matching policy sources based on answer keywords", async () => {
    mockGenerateText.mockResolvedValue({
      text: "Use a GitHub or Vercel link for your milestone.",
      steps: [],
    });

    const result = await askGeneralAssistant("How do I submit?");

    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "submission-rules" }),
      ]),
    );
  });

  it("returns no sources when the answer matches no policy keywords", async () => {
    mockGenerateText.mockResolvedValue({
      text: "I do not have enough information to answer that.",
      steps: [],
    });

    const result = await askGeneralAssistant("Unrelated question");

    expect(result.sources).toEqual([]);
  });

  it("propagates errors thrown by the Gemini service", async () => {
    const error = new Error("provider failure");
    mockGenerateText.mockRejectedValue(error);

    await expect(askGeneralAssistant("test")).rejects.toThrow(
      "provider failure",
    );
  });
});
