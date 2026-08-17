import type { AIMessage, GeminiService } from "./index";
import { AIError, AIErrorCode, geminiService } from "./index";
import { createError } from "../../middleware/error-handler";
import { indexCourse } from "./rag/course-ingestion.service";
import {
  semanticSearchCourse,
  type CourseSemanticSearchResult,
} from "./rag/course-retrieval.service";
import {
  buildBoundedCourseGroundingSources,
  buildCourseGroundingPrompt,
  COURSE_ASSISTANT_SYSTEM_INSTRUCTION,
  INSUFFICIENT_COURSE_EVIDENCE_ANSWER,
  validateAnswerCitations,
} from "./rag/grounding-prompt";
import { loadCourseRagConfig, type CourseRagConfig } from "./rag/rag-config";

export const MAX_COURSE_ASSISTANT_HISTORY_MESSAGES = 8;
export const MAX_COURSE_ASSISTANT_HISTORY_CONTENT = 1_500;

export interface CourseAssistantSource {
  type: "lesson";
  id?: string;
  title: string;
}

export interface CourseAssistantResponse {
  type: "message";
  answer: string;
  sources: CourseAssistantSource[];
}

export interface AnswerCourseQuestionOptions {
  courseId: string;
  message: string;
  history?: readonly AIMessage[];
}

export interface CourseAssistantDependencies {
  index?: (courseId: string) => Promise<unknown>;
  search?: (options: {
    courseId: string;
    query: string;
    limit: number;
  }) => Promise<CourseSemanticSearchResult[]>;
  generateText?: GeminiService["generateText"];
  ragConfig?: CourseRagConfig;
}

function boundedHistory(history: readonly AIMessage[] = []): AIMessage[] {
  return history
    .slice(-MAX_COURSE_ASSISTANT_HISTORY_MESSAGES)
    .flatMap((message) => {
      const content = message.content
        .trim()
        .slice(0, MAX_COURSE_ASSISTANT_HISTORY_CONTENT);
      return content ? [{ role: message.role, content }] : [];
    });
}

function frontendSources(
  citationNumbers: readonly number[],
  sources: ReturnType<typeof buildBoundedCourseGroundingSources>,
): CourseAssistantSource[] {
  const seenLessons = new Set<string>();
  const result: CourseAssistantSource[] = [];

  for (const number of citationNumbers) {
    const source = sources[number - 1];
    if (!source || source.sourceType !== "lesson" || !source.lessonId) continue;
    if (seenLessons.has(source.lessonId)) continue;
    seenLessons.add(source.lessonId);
    result.push({
      type: "lesson",
      id: source.lessonId,
      title: source.sourceTitle,
    });
  }

  return result;
}

function safeConfig(
  dependencies: CourseAssistantDependencies,
): CourseRagConfig {
  try {
    return dependencies.ragConfig ?? loadCourseRagConfig();
  } catch {
    throw createError(
      "Course assistant retrieval is not configured correctly",
      503,
    );
  }
}

export async function answerCourseQuestion(
  options: AnswerCourseQuestionOptions,
  dependencies: CourseAssistantDependencies = {},
): Promise<CourseAssistantResponse> {
  const config = safeConfig(dependencies);

  let results: CourseSemanticSearchResult[];
  try {
    await (dependencies.index ?? indexCourse)(options.courseId);
    results = await (dependencies.search ?? semanticSearchCourse)({
      courseId: options.courseId,
      query: options.message,
      limit: config.retrievalLimit,
    });
  } catch {
    throw createError(
      "Course material retrieval is temporarily unavailable",
      503,
    );
  }

  const groundingSources = buildBoundedCourseGroundingSources(results, config);
  if (groundingSources.length === 0) {
    return {
      type: "message",
      answer: INSUFFICIENT_COURSE_EVIDENCE_ANSWER,
      sources: [],
    };
  }

  let generated: Awaited<ReturnType<GeminiService["generateText"]>>;
  try {
    const generate =
      dependencies.generateText ??
      geminiService.generateText.bind(geminiService);
    generated = await generate({
      input: buildCourseGroundingPrompt(options.message, groundingSources),
      systemInstruction: COURSE_ASSISTANT_SYSTEM_INSTRUCTION,
      history: boundedHistory(options.history),
    });
  } catch (error) {
    if (error instanceof AIError && error.code === AIErrorCode.NOT_CONFIGURED) {
      throw createError("Course assistant is not configured", 503);
    }
    throw createError("Course assistant could not generate an answer", 502);
  }

  const validated = validateAnswerCitations(
    generated.text,
    groundingSources.length,
  );
  if (!validated.answer || validated.citationNumbers.length === 0) {
    throw createError("Course assistant returned an invalid answer", 502);
  }

  return {
    type: "message",
    answer: validated.answer,
    sources: frontendSources(validated.citationNumbers, groundingSources),
  };
}
