import { geminiService, type GeminiService } from "./gemini.service";
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

const SYSTEM_INSTRUCTION = `You are MentorLane Assistant. Answer only general questions about how the platform works.

Use only the approved platform-policy context supplied with the request. You do not have access to private courses, lesson content, grades, submissions, student private information, or instructor analytics.

If asked about a particular course, lesson, or private student/instructor data, explain that the Course Assistant inside that course is the right place to ask. If the answer is not supported by the supplied policies, say that you do not have enough information. Never invent platform rules.`;

function matchingPolicies(message: string): PlatformPolicy[] {
  const normalized = message.toLowerCase();
  return platformPolicies.filter((policy) =>
    policy.keywords.some((keyword) => normalized.includes(keyword)),
  );
}

function buildPolicyContext(policies: PlatformPolicy[]): string {
  if (!policies.length) return "No approved policy supports this question.";

  return policies
    .map((policy) => `- ${policy.title}: ${policy.content}`)
    .join("\n");
}

export class GeneralAssistantService {
  constructor(private readonly ai: GeminiService = geminiService) {}

  async respond(message: string): Promise<AssistantResponse> {
    const policies = matchingPolicies(message);
    const result = await this.ai.generateText({
      input: `Approved platform-policy context:\n${buildPolicyContext(policies)}\n\nUser question: ${message}`,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    return {
      type: "message",
      answer: result.text,
      ...(policies.length > 0 && {
        sources: policies.map(({ id, title }) => ({
          type: "policy" as const,
          id,
          title,
        })),
      }),
    };
  }
}

export const generalAssistantService = new GeneralAssistantService();
