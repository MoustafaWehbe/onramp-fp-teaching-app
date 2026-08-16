import type { AssistantMessage } from "./types";

const conversations = new Map<string, AssistantMessage[]>();
const openAssistants = new Set<string>();

export function getConversation(
  assistantId: string,
  fallback: AssistantMessage[] = [],
): AssistantMessage[] {
  return conversations.get(assistantId) ?? fallback;
}

export function setConversation(
  assistantId: string,
  messages: AssistantMessage[],
): void {
  conversations.set(assistantId, messages);
}

export function isAssistantOpen(assistantId: string): boolean {
  return openAssistants.has(assistantId);
}

export function setAssistantOpen(assistantId: string, open: boolean): void {
  if (open) openAssistants.add(assistantId);
  else openAssistants.delete(assistantId);
}

export function clearAssistantConversations(): void {
  conversations.clear();
  openAssistants.clear();
}
