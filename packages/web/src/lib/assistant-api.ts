import { apiClient } from "./api-client";
import type { components, operations } from "./api-types";

type AssistantGeneralResponse =
  operations["askGeneralAssistant"]["responses"][200]["content"]["application/json"];

export type AssistantApiSource = components["schemas"]["AssistantSource"];
export type AssistantApiResponse = components["schemas"]["AssistantResponse"];

export async function sendGeneralAssistantMessage(
  message: string,
): Promise<AssistantApiResponse> {
  const { data } = await apiClient.post<AssistantGeneralResponse>(
    "/assistant/general",
    { message },
  );

  if (!data.data) {
    throw new Error("The server returned an invalid assistant response.");
  }

  return data.data;
}
