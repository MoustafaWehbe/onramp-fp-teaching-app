export type AIRole = "user" | "assistant";

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface GenerateTextOptions {
  input: string;
  systemInstruction?: string;
  history?: readonly AIMessage[];
}
