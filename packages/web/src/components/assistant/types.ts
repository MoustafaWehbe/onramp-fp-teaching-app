import type { LucideIcon } from "lucide-react";

export type AssistantSource = {
  type: "policy" | "lesson" | "milestone";
  id?: string;
  title: string;
};

export type AssistantResponse = {
  type: "message";
  answer: string;
  sources?: AssistantSource[];
};

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AssistantSource[];
};

export type AssistantConfig = {
  id: string;
  name: string;
  badge: "GENERAL" | "COURSE" | "INSTRUCTOR";
  subtitle: string;
  description: string;
  icon: LucideIcon;
  suggestedPrompts: string[];
};

export type AssistantSend = (
  message: string,
  history: AssistantMessage[],
) => Promise<AssistantResponse>;
