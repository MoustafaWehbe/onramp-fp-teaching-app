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

  it("calls Gemini and returns its answer when the message matches a known policy", async () => {
    mockGenerateText.mockResolvedValue({
      text: "You can submit via a GitHub link.",
      steps: [],
    });

    const result = await askGeneralAssistant("How do I submit my milestone?");

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(result.answer).toBe("You can submit via a GitHub link.");
  });

  it("scopes the system instruction to only the matched policy's content", async () => {
    mockGenerateText.mockResolvedValue({ text: "Answer", steps: [] });

    await askGeneralAssistant("How do I enroll in a course?");

    const call = mockGenerateText.mock.calls[0][0];
    expect(call.systemInstruction).toContain("Enrollment");
    expect(call.systemInstruction).not.toContain("Grades");
    expect(call.systemInstruction).not.toContain("Submission Rules");
  });

  it("attaches sources for every policy matched, not by scanning the answer", async () => {
    mockGenerateText.mockResolvedValue({
      text: "Here is how it works.",
      steps: [],
    });

    const result = await askGeneralAssistant("How do submissions get graded?");

    expect(result.sources.map((s) => s.id).sort()).toEqual(
      ["grades", "submission-rules"].sort(),
    );
  });

  it("does not call Gemini and returns the fallback when no policy matches", async () => {
    const result = await askGeneralAssistant("What's the weather today?");

    expect(mockGenerateText).not.toHaveBeenCalled();
    expect(result.sources).toEqual([]);
    expect(result.answer).toContain("I do not have enough information");
  });

  it("does not match unrelated words that merely contain a policy keyword", async () => {
    // Regression test for CodeRabbit finding: "upgrade" should not match "grade"
    const result = await askGeneralAssistant(
      "How do I upgrade my browser to the latest version?",
    );

    expect(mockGenerateText).not.toHaveBeenCalled();
    expect(result.sources).toEqual([]);
  });

  it("matches on whole words only, case-insensitively", async () => {
    mockGenerateText.mockResolvedValue({ text: "Answer", steps: [] });

    const result = await askGeneralAssistant("Can you tell me about GRADES?");

    expect(result.sources.map((s) => s.id)).toContain("grades");
  });

  it("propagates errors thrown by the Gemini service", async () => {
    mockGenerateText.mockRejectedValue(new Error("provider failure"));

    await expect(
      askGeneralAssistant("How do I submit my work?"),
    ).rejects.toThrow("provider failure");
  });
});
