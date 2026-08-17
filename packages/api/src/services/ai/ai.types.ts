import type { Interactions } from "@google/genai";

export type AIRole = "user" | "assistant";

export interface AIMessage {
  role: AIRole;
  content: string;
  /**
   * Raw provider steps associated with this message (for stateless history replay).
   * When present, these steps (including any thought steps with signatures) will be
   * replayed verbatim instead of synthesizing a text-only step from `content`.
   */
  steps?: readonly Interactions.Step[];
}

export interface GenerateTextOptions {
  input: string;
  systemInstruction?: string;
  history?: readonly AIMessage[];
}

export interface GenerateTextResult {
  /**
   * The trimmed output text from the model.
   */
  text: string;
  /**
   * The full set of provider-returned steps for this turn.
   * Store these on the resulting AIMessage to enable correct replay
   * of reasoning/thought steps (with signatures) in subsequent turns.
   */
  steps: readonly Interactions.Step[];
}
