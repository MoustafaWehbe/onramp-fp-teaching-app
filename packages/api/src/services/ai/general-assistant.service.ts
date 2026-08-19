import { geminiService } from "./gemini.service";
import { platformPolicies, type PlatformPolicy } from "./general-policy.context";

export interface AssistantSource {
  type: "policy" | "lesson" | "milestone";
  id?: string;
  title: string;
}

export interface GeneralAssistantResult {
  answer: string;
  sources: AssistantSource[];
}

const NO_INFO_ANSWER =
  "I do not have enough information to answer that. I can help with enrollment, submissions, grades, and account roles. For course or lesson questions, please use the Course Assistant inside that course.";

const POLICY_KEYWORDS: Record<string, string[]> = {
  enrollment: ["enroll", "enrollment", "join a course", "enrollment code"],
  "submission-rules": ["submit", "submission", "github", "loom", "vercel", "milestone", "deploy"],
  grades: ["grade", "grading", "gradebook", "feedback", "score"],
  roles: ["instructor", "student", "role", "account", "permission"],
};

function matchesWholeWord(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escaped}`, "i"); // boundary at start only, so "grade" also matches "grades"/"graded"
  return pattern.test(text);
}

function selectRelevantPolicies(message: string): PlatformPolicy[] {
  return platformPolicies.filter((policy) =>
    (POLICY_KEYWORDS[policy.id] ?? []).some((keyword) =>
      matchesWholeWord(message, keyword),
    ),
  );
}

function buildSystemInstruction(relevantPolicies: PlatformPolicy[]): string {
  const scopedContext = relevantPolicies
    .map((p) => `[${p.title}]\n${p.content}`)
    .join("\n\n");

  return `You are MentorLane Assistant.

Answer only using the platform-policy context provided below. Do not add information beyond it.

You do not have access to private courses, lesson content, grades, submissions, student private information, or instructor analytics.

If the user asks about a specific course or lesson, tell them to use the Course Assistant inside that course.

Platform policies:
${scopedContext}`;
}

export async function askGeneralAssistant(
  message: string,
): Promise<GeneralAssistantResult> {
  const relevantPolicies = selectRelevantPolicies(message);

  if (relevantPolicies.length === 0) {
    return { answer: NO_INFO_ANSWER, sources: [] };
  }

  const result = await geminiService.generateText({
    input: message,
    systemInstruction: buildSystemInstruction(relevantPolicies),
  });

  const sources: AssistantSource[] = relevantPolicies.map((p) => ({
    type: "policy" as const,
    id: p.id,
    title: p.title,
  }));

  return { answer: result.text, sources };
}
