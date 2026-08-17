import { GoogleGenAI, type Interactions } from "@google/genai";
import { AIError, AIErrorCode } from "./ai.errors";
import type {
  AIMessage,
  GenerateTextOptions,
  GenerateTextResult,
} from "./ai.types";

export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

function toTextStep(message: AIMessage): Interactions.Step {
  return {
    type: message.role === "user" ? "user_input" : "model_output",
    content: [{ type: "text", text: message.content }],
  };
}

function buildInput(
  options: GenerateTextOptions,
): string | Interactions.Step[] {
  if (!options.history?.length) {
    return options.input;
  }

  const historySteps: Interactions.Step[] = [];
  for (const msg of options.history) {
    // If the message has preserved provider steps, replay them verbatim
    // (preserves thought steps with signatures for thinking-enabled models)
    if (msg.steps?.length) {
      historySteps.push(...msg.steps);
    } else {
      // Fall back to synthesizing a text-only step from content
      historySteps.push(toTextStep(msg));
    }
  }

  return [
    ...historySteps,
    toTextStep({ role: "user", content: options.input }),
  ];
}

export class GeminiService {
  private client: GoogleGenAI | null = null;
  private clientApiKey: string | null = null;

  private getClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      throw new AIError(AIErrorCode.NOT_CONFIGURED);
    }

    if (!this.client || this.clientApiKey !== apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey });
        this.clientApiKey = apiKey;
      } catch (cause) {
        throw new AIError(AIErrorCode.PROVIDER_ERROR, { cause });
      }
    }

    return this.client;
  }

  async generateText(
    options: GenerateTextOptions,
  ): Promise<GenerateTextResult> {
    const request = {
      model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
      input: buildInput(options),
      store: false,
      ...(options.systemInstruction !== undefined && {
        system_instruction: options.systemInstruction,
      }),
    } satisfies Interactions.CreateModelInteractionParamsNonStreaming;

    let interaction: Awaited<ReturnType<GoogleGenAI["interactions"]["create"]>>;

    try {
      interaction = await this.getClient().interactions.create(request);
    } catch (cause) {
      if (cause instanceof AIError) {
        throw cause;
      }

      throw new AIError(AIErrorCode.PROVIDER_ERROR, { cause });
    }

    const output = interaction.output_text?.trim();

    if (!output) {
      throw new AIError(AIErrorCode.INVALID_RESPONSE);
    }

    return {
      text: output,
      steps: interaction.steps ?? [],
    };
  }
}

export const geminiService = new GeminiService();
