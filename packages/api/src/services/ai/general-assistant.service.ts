import { geminiService } from "./gemini.service";
import { platformPolicies, formatPolicyContext } from "./general-policy.context";

const SYSTEM_INSTRUCTION = `You are MentorLane Assistant.

Answer only general questions about how the platform works.

Use only the approved platform-policy context provided below.

You do not have access to:
- private courses
- lesson content
- grades
- submissions
- student private information
- instructor analytics

If the user asks about a specific course or lesson, tell them to use the Course Assistant inside that course.

If the answer is not supported by the policies, say that you do not have enough information.

Platform policies:
${formatPolicyContext()}`;

export interface AssistantSource {
  type: "policy" | "lesson" | "milestone";
  id?: string;
  title: string;
}

export interface GeneralAssistantResult {
  answer: string;
  sources: AssistantSource[];
}

const SOURCE_KEYWORDS: Record<string, string[]> = {
  enrollment: ["enroll", "enrollment code"],
  "submission-rules": ["github", "loom", "vercel", "milestone", "draft", "submitted", "graded"],
  grades: ["grade", "gradebook", "feedback", "score"],
  roles: ["instructor", "student role", "enroll in courses"],
};

export async function askGeneralAssistant(
  message: string,
): Promise<GeneralAssistantResult> {
  const result = await geminiService.generateText({
    input: message,
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const lowerAnswer = result.text.toLowerCase();

  const sources: AssistantSource[] = platformPolicies
    .filter((p) =>
      (SOURCE_KEYWORDS[p.id] ?? []).some((kw) => lowerAnswer.includes(kw)),
    )
    .map((p) => ({ type: "policy" as const, id: p.id, title: p.title }));

  return { answer: result.text, sources };
}
