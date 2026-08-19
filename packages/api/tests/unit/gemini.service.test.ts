import { GoogleGenAI, type Interactions } from "@google/genai";
import {
  AIError,
  AIErrorCode,
  DEFAULT_GEMINI_MODEL,
  GeminiService,
} from "../../src/services/ai";

jest.mock("@google/genai");

const MockGoogleGenAI = jest.mocked(GoogleGenAI);
const createInteractionMock = jest.fn();

function getLastRequest(): Interactions.CreateModelInteractionParamsNonStreaming {
  const request = createInteractionMock.mock.calls.at(-1)?.[0];

  if (!request) {
    throw new Error("Expected Gemini interaction request");
  }

  return request as Interactions.CreateModelInteractionParamsNonStreaming;
}

describe("GeminiService", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;

  beforeEach(() => {
    jest.clearAllMocks();
    createInteractionMock.mockReset();
    process.env.GEMINI_API_KEY = "test-gemini-key";
    delete process.env.GEMINI_MODEL;

    MockGoogleGenAI.mockImplementation(
      () =>
        ({
          interactions: { create: createInteractionMock },
        }) as unknown as GoogleGenAI,
    );
  });

  afterAll(() => {
    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalApiKey;
    }

    if (originalModel === undefined) {
      delete process.env.GEMINI_MODEL;
    } else {
      process.env.GEMINI_MODEL = originalModel;
    }
  });

  it("throws AI_NOT_CONFIGURED only when generation is requested", async () => {
    delete process.env.GEMINI_API_KEY;
    const service = new GeminiService();

    await expect(
      service.generateText({ input: "Hello" }),
    ).rejects.toMatchObject({
      name: "AIError",
      code: AIErrorCode.NOT_CONFIGURED,
      message: "AI service is not configured.",
    });
    expect(MockGoogleGenAI).not.toHaveBeenCalled();
  });

  it("returns trimmed text and steps from a valid interaction", async () => {
    const mockSteps: Interactions.Step[] = [
      { type: "user_input", content: [{ type: "text", text: "Say hello" }] },
      {
        type: "model_output",
        content: [{ type: "text", text: "Hello there" }],
      },
    ];
    createInteractionMock.mockResolvedValue({
      output_text: "  Hello there  ",
      steps: mockSteps,
    });

    await expect(
      new GeminiService().generateText({ input: "Say hello" }),
    ).resolves.toEqual({
      text: "Hello there",
      steps: mockSteps,
    });
  });

  it("passes the system instruction to the interaction", async () => {
    createInteractionMock.mockResolvedValue({ output_text: "Answer" });

    await new GeminiService().generateText({
      input: "Question",
      systemInstruction: "Answer as a teaching assistant.",
    });

    expect(getLastRequest()).toMatchObject({
      system_instruction: "Answer as a teaching assistant.",
    });
  });

  it("uses the configured model", async () => {
    process.env.GEMINI_MODEL = "gemini-test-model";
    createInteractionMock.mockResolvedValue({ output_text: "Answer" });

    await new GeminiService().generateText({ input: "Question" });

    expect(getLastRequest().model).toBe("gemini-test-model");
  });

  it("uses Gemini 3.6 Flash by default and disables provider storage", async () => {
    createInteractionMock.mockResolvedValue({ output_text: "Answer" });

    await new GeminiService().generateText({ input: "Question" });

    expect(getLastRequest()).toMatchObject({
      model: DEFAULT_GEMINI_MODEL,
      input: "Question",
      store: false,
    });
  });

  it("translates application history into stateless interaction steps", async () => {
    createInteractionMock.mockResolvedValue({
      output_text: "Three",
      steps: [],
    });

    await new GeminiService().generateText({
      input: "How many now?",
      history: [
        { role: "user", content: "I have two courses." },
        { role: "assistant", content: "You have two courses." },
      ],
    });

    expect(getLastRequest().input).toEqual([
      {
        type: "user_input",
        content: [{ type: "text", text: "I have two courses." }],
      },
      {
        type: "model_output",
        content: [{ type: "text", text: "You have two courses." }],
      },
      {
        type: "user_input",
        content: [{ type: "text", text: "How many now?" }],
      },
    ]);
  });

  it("preserves and replays original provider steps (including thought steps with signatures)", async () => {
    const thoughtStepWithSignature: Interactions.ThoughtStep = {
      type: "thought",
      signature: "opaque-signature-abc123",
      summary: [{ type: "text", text: "Let me think about this..." }],
    };

    const preservedSteps: Interactions.Step[] = [
      thoughtStepWithSignature,
      {
        type: "model_output",
        content: [{ type: "text", text: "You have two courses." }],
      },
    ];

    createInteractionMock.mockResolvedValue({
      output_text: "Three",
      steps: [],
    });

    await new GeminiService().generateText({
      input: "How many now?",
      history: [
        { role: "user", content: "I have two courses." },
        {
          role: "assistant",
          content: "You have two courses.",
          steps: preservedSteps,
        },
      ],
    });

    const sentInput = getLastRequest().input as Interactions.Step[];
    expect(sentInput).toEqual([
      {
        type: "user_input",
        content: [{ type: "text", text: "I have two courses." }],
      },
      // The preserved steps should be replayed exactly as-is
      thoughtStepWithSignature,
      {
        type: "model_output",
        content: [{ type: "text", text: "You have two courses." }],
      },
      {
        type: "user_input",
        content: [{ type: "text", text: "How many now?" }],
      },
    ]);

    // Verify the thought step with signature is present and unchanged
    expect(sentInput[1]).toEqual(thoughtStepWithSignature);
    expect((sentInput[1] as Interactions.ThoughtStep).signature).toBe(
      "opaque-signature-abc123",
    );
  });

  it("returns provider steps unchanged so they can be stored for next turn", async () => {
    const thoughtStep: Interactions.ThoughtStep = {
      type: "thought",
      signature: "provider-signature-xyz",
      summary: [{ type: "text", text: "Analyzing the question..." }],
    };

    const outputStep: Interactions.ModelOutputStep = {
      type: "model_output",
      content: [{ type: "text", text: "The answer is 42." }],
    };

    const providerReturnedSteps: Interactions.Step[] = [
      thoughtStep,
      outputStep,
    ];

    createInteractionMock.mockResolvedValue({
      output_text: "The answer is 42.",
      steps: providerReturnedSteps,
    });

    const result = await new GeminiService().generateText({
      input: "What is the answer?",
    });

    expect(result.steps).toEqual(providerReturnedSteps);
    expect(result.steps).toHaveLength(2);
    expect((result.steps[0] as Interactions.ThoughtStep).signature).toBe(
      "provider-signature-xyz",
    );
  });

  it("uses stateless Interactions function calling through the existing client", async () => {
    const functionCall: Interactions.FunctionCallStep = {
      type: "function_call",
      id: "call-1",
      name: "get_course_overview",
      arguments: {},
    };
    createInteractionMock.mockResolvedValue({
      steps: [functionCall],
    });
    const tools: Interactions.Function[] = [
      {
        type: "function",
        name: "get_course_overview",
        description: "Read the authorized course overview.",
        parameters: { type: "object", properties: {} },
      },
    ];

    await expect(
      new GeminiService().generateToolInteraction({
        input: "Give me an overview",
        systemInstruction: "Use read-only tools.",
        tools,
      }),
    ).resolves.toEqual({
      steps: [functionCall],
      functionCalls: [functionCall],
    });
    expect(getLastRequest()).toMatchObject({
      input: "Give me an overview",
      store: false,
      system_instruction: "Use read-only tools.",
      tools,
    });
  });

  it("replays the complete application-managed function transcript verbatim", async () => {
    const transcript: Interactions.Step[] = [
      {
        type: "user_input",
        content: [{ type: "text", text: "How many are pending?" }],
      },
      {
        type: "function_call",
        id: "call-1",
        name: "get_pending_grading",
        arguments: {},
      },
      {
        type: "function_result",
        call_id: "call-1",
        name: "get_pending_grading",
        result: [{ type: "text", text: '{"totalPending":2}' }],
      },
    ];
    createInteractionMock.mockResolvedValue({
      output_text: "  Two submissions are pending.  ",
      steps: [
        {
          type: "model_output",
          content: [{ type: "text", text: "Two submissions are pending." }],
        },
      ],
    });

    const result = await new GeminiService().generateToolInteraction({
      input: transcript,
      systemInstruction: "Use read-only tools.",
      tools: [],
    });

    expect(getLastRequest()).toMatchObject({ input: transcript, store: false });
    expect(result.text).toBe("Two submissions are pending.");
    expect(result.functionCalls).toEqual([]);
  });

  it("normalizes provider failures without leaking their message", async () => {
    const providerError = new Error("provider details and secret prompt");
    createInteractionMock.mockRejectedValue(providerError);

    try {
      await new GeminiService().generateText({ input: "Question" });
      throw new Error("Expected generateText to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(AIError);
      expect(error).toMatchObject({
        code: AIErrorCode.PROVIDER_ERROR,
        message: "AI provider request failed.",
        cause: providerError,
      });
      expect((error as Error).message).not.toContain("secret prompt");
    }
  });

  it.each([undefined, "", "   "])(
    "rejects invalid provider output %p",
    async (outputText) => {
      createInteractionMock.mockResolvedValue({ output_text: outputText });

      await expect(
        new GeminiService().generateText({ input: "Question" }),
      ).rejects.toMatchObject({
        code: AIErrorCode.INVALID_RESPONSE,
        message: "AI provider returned an invalid response.",
      });
    },
  );

  it("reuses its lazily created client", async () => {
    createInteractionMock.mockResolvedValue({ output_text: "Answer" });
    const service = new GeminiService();

    await service.generateText({ input: "First" });
    await service.generateText({ input: "Second" });

    expect(MockGoogleGenAI).toHaveBeenCalledTimes(1);
    expect(MockGoogleGenAI).toHaveBeenCalledWith({
      apiKey: "test-gemini-key",
    });
  });
});
