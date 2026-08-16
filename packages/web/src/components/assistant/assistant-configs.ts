import { BookOpen, Briefcase, Sparkles } from "lucide-react";
import type { AssistantConfig } from "./types";

export const generalAssistant: AssistantConfig = {
  id: "general",
  name: "MentorLane Assistant",
  badge: "GENERAL",
  subtitle: "Platform Help",
  description:
    "Ask about enrollment, submissions, grades, account roles, and how the platform works.",
  icon: Sparkles,
  suggestedPrompts: [
    "How do submissions work?",
    "How do I enroll in a course?",
    "Where can I see my grades?",
  ],
};

export function courseAssistant(
  courseId: string,
  courseTitle: string,
): AssistantConfig {
  return {
    id: `course:${courseId}`,
    name: "Course Assistant",
    badge: "COURSE",
    subtitle: courseTitle,
    description:
      "Ask questions about course material currently available to you.",
    icon: BookOpen,
    suggestedPrompts: [
      "Explain the latest lesson.",
      "What should I review?",
      "What are the main ideas so far?",
    ],
  };
}

export function instructorAssistant(
  courseId?: string,
  courseTitle?: string,
): AssistantConfig {
  return {
    id: courseId ? `instructor:${courseId}` : "instructor:workspace",
    name: "Instructor Assistant",
    badge: "INSTRUCTOR",
    subtitle:
      courseId && courseTitle
        ? `Managing: ${courseTitle}`
        : "Instructor Workspace",
    description:
      "Ask about grading, submissions, deadlines, and course activity.",
    icon: Briefcase,
    suggestedPrompts: [
      "How much grading do I have left?",
      "Who has not submitted?",
      "What is due next?",
      "Give me a course overview.",
    ],
  };
}
