import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

export function getAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export async function chatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: Partial<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming>,
): Promise<string> {
  const client = getAIClient();
  const response = await client.chat.completions.create({
    model: options?.model ?? "gpt-4o-mini",
    messages,
    ...options,
  });
  return response.choices[0]?.message?.content ?? "";
}
