import { GeneralAssistantService } from "../../src/services/ai/general-assistant.service";
import type { GeminiService } from "../../src/services/ai/gemini.service";

describe("GeneralAssistantService", () => {
  const generateText = jest.fn();
  const service = new GeneralAssistantService({
    generateText,
  } as unknown as GeminiService);

  beforeEach(() => {
    generateText.mockReset();
    generateText.mockResolvedValue({ text: "Use the Grades page.", steps: [] });
  });

  it("uses matching approved policy and returns it as a source", async () => {
    const response = await service.respond("Where can I see my grades?");

    expect(response).toEqual({
      type: "message",
      answer: "Use the Grades page.",
      sources: [{ type: "policy", id: "grades", title: "Grades" }],
    });
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.stringContaining("Grades page"),
        systemInstruction: expect.stringContaining("approved platform-policy context"),
      }),
    );
  });

  it("does not provide unapproved policy context for unsupported questions", async () => {
    const response = await service.respond("What is the next React lesson?");

    expect(response.sources).toBeUndefined();
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.stringContaining("No approved policy supports this question."),
      }),
    );
  });
});
