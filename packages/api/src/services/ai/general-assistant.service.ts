import { platformPolicies, type PlatformPolicy } from "./general-policy.context";

export type AssistantSource = {
  type: "policy";
  id: string;
  title: string;
};

export type AssistantResponse = {
  type: "message";
  answer: string;
  sources?: AssistantSource[];
};

const COURSE_ASSISTANT_REDIRECT =
  "I do not have access to specific course or lesson details. Please ask the Course Assistant inside that course.";
const INSUFFICIENT_INFORMATION =
  "I do not have enough information to answer that question.";

function matchingPolicies(message: string): PlatformPolicy[] {
  const normalized = message.toLowerCase();
  return platformPolicies.filter((policy) =>
    policy.keywords.some((keyword) => normalized.includes(keyword)),
  );
}

function isCourseOrLessonRequest(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    /\b(lesson|module|curriculum|syllabus)\b/.test(normalized) ||
    /\b(?:my|this|specific|particular)\s+course\b/.test(normalized) ||
    /\b(?:course|lesson)\s+(?:content|material|details|outline|topic)\b/.test(
      normalized,
    )
  );
}

export class GeneralAssistantService {
  async respond(message: string): Promise<AssistantResponse> {
    if (isCourseOrLessonRequest(message)) {
      return { type: "message", answer: COURSE_ASSISTANT_REDIRECT };
    }

    const policies = matchingPolicies(message);
    if (!policies.length) {
      return { type: "message", answer: INSUFFICIENT_INFORMATION };
    }

    return {
      type: "message",
      answer: policies.map((policy) => policy.content).join("\n\n"),
      sources: policies.map(({ id, title }) => ({
        type: "policy" as const,
        id,
        title,
      })),
    };
  }
}

export const generalAssistantService = new GeneralAssistantService();
