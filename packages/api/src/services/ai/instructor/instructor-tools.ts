import type { Interactions } from "@google/genai";
import { z } from "zod";
import { indexCourse } from "../rag/course-ingestion.service";
import {
  semanticSearchCourse,
  type CourseSemanticSearchResult,
} from "../rag/course-retrieval.service";
import { buildBoundedCourseGroundingSources } from "../rag/grounding-prompt";
import { loadCourseRagConfig, type CourseRagConfig } from "../rag/rag-config";
import {
  createInstructorAnalyticsRepository,
  type InstructorAnalyticsRepository,
} from "./instructor-tool.repository";
import {
  InstructorToolError,
  InstructorToolErrorCode,
  type InstructorAssistantSource,
  type InstructorToolContext,
  type InstructorToolExecutionResult,
  type InstructorToolName,
  type ValidatedInstructorToolInvocation,
} from "./instructor-tool.types";

export const MAX_PENDING_SUBMISSIONS = 25;
export const MAX_MISSING_SUBMISSIONS = 100;

export const INSTRUCTOR_FUNCTION_TOOLS: readonly Interactions.Function[] = [
  {
    type: "function",
    name: "search_course_content",
    description:
      "Search the authorized course's lesson content for what the instructor taught, wrote, explained, or mentioned.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: {
          type: "string",
          description: "The course-content question or concept to search for.",
        },
      },
      required: ["query"],
    },
  },
  {
    type: "function",
    name: "get_course_overview",
    description:
      "Get a read-only overview of the authorized course and its current content, enrollment, and submission counts.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    type: "function",
    name: "get_pending_grading",
    description:
      "Count and list submitted course work that is currently waiting to be graded.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    type: "function",
    name: "get_submission_stats",
    description:
      "Get deterministic draft, submitted, graded, pending-grading, and missing-submission statistics for the authorized course.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    type: "function",
    name: "get_missing_submissions",
    description:
      "List enrolled students who have no submitted or graded submission, optionally for one milestone in the authorized course.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        milestoneId: {
          type: "string",
          format: "uuid",
          description:
            "Optional milestone ID. It must belong to the authorized course.",
        },
      },
    },
  },
];

const emptyArgumentsSchema = z.object({}).strict();
const argumentSchemas = {
  search_course_content: z
    .object({ query: z.string().trim().min(1).max(1_500) })
    .strict(),
  get_course_overview: emptyArgumentsSchema,
  get_pending_grading: emptyArgumentsSchema,
  get_submission_stats: emptyArgumentsSchema,
  get_missing_submissions: z
    .object({ milestoneId: z.string().uuid().optional() })
    .strict(),
} satisfies Record<InstructorToolName, z.ZodTypeAny>;

export interface InstructorToolDependencies {
  repository?: InstructorAnalyticsRepository;
  index?: (courseId: string) => Promise<unknown>;
  search?: (options: {
    courseId: string;
    query: string;
    limit: number;
  }) => Promise<CourseSemanticSearchResult[]>;
  ragConfig?: CourseRagConfig;
}

function invalidArguments(cause?: unknown): InstructorToolError {
  return new InstructorToolError(InstructorToolErrorCode.INVALID_ARGUMENTS, {
    cause,
  });
}

export function validateInstructorToolInvocation(
  name: unknown,
  rawArguments: unknown,
): ValidatedInstructorToolInvocation {
  if (
    typeof name !== "string" ||
    !Object.prototype.hasOwnProperty.call(argumentSchemas, name)
  ) {
    throw new InstructorToolError(InstructorToolErrorCode.UNKNOWN_TOOL);
  }

  const toolName = name as InstructorToolName;
  const parsed = argumentSchemas[toolName].safeParse(rawArguments ?? {});
  if (!parsed.success) throw invalidArguments(parsed.error);

  return {
    name: toolName,
    arguments: parsed.data,
  } as ValidatedInstructorToolInvocation;
}

function milestoneSources(
  values: readonly { milestoneId: string; milestoneTitle: string }[],
): InstructorAssistantSource[] {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    if (seen.has(value.milestoneId)) return [];
    seen.add(value.milestoneId);
    return [
      {
        type: "milestone" as const,
        id: value.milestoneId,
        title: value.milestoneTitle,
      },
    ];
  });
}

function repository(
  dependencies: InstructorToolDependencies,
): InstructorAnalyticsRepository {
  return dependencies.repository ?? createInstructorAnalyticsRepository();
}

async function searchCourseContent(
  query: string,
  context: InstructorToolContext,
  dependencies: InstructorToolDependencies,
): Promise<InstructorToolExecutionResult> {
  const config = dependencies.ragConfig ?? loadCourseRagConfig();
  await (dependencies.index ?? indexCourse)(context.courseId);
  const rawResults = await (dependencies.search ?? semanticSearchCourse)({
    courseId: context.courseId,
    query,
    limit: config.retrievalLimit,
  });
  const results = buildBoundedCourseGroundingSources(
    rawResults.filter((result) => result.courseId === context.courseId),
    config,
  ).filter(
    (result): result is typeof result & { lessonId: string } =>
      result.sourceType === "lesson" && Boolean(result.lessonId),
  );

  const sources = results.reduce<InstructorAssistantSource[]>(
    (items, result) => {
      if (items.some((item) => item.id === result.lessonId)) return items;
      items.push({
        type: "lesson",
        id: result.lessonId,
        title: result.sourceTitle,
      });
      return items;
    },
    [],
  );

  return {
    data: {
      query,
      matches: results.map((result) => ({
        lessonId: result.lessonId,
        lessonTitle: result.sourceTitle,
        excerpt: result.excerpt,
        similarity: result.similarity,
      })),
      insufficientEvidence: results.length === 0,
    },
    sources,
  };
}

async function executeValidatedInstructorTool(
  invocation: ValidatedInstructorToolInvocation,
  context: InstructorToolContext,
  dependencies: InstructorToolDependencies,
): Promise<InstructorToolExecutionResult> {
  if (invocation.name === "search_course_content") {
    return searchCourseContent(
      invocation.arguments.query,
      context,
      dependencies,
    );
  }

  const analytics = repository(dependencies);
  if (invocation.name === "get_course_overview") {
    const overview = await analytics.getCourseOverview(context);
    if (!overview) {
      throw new InstructorToolError(InstructorToolErrorCode.EXECUTION_FAILED);
    }
    return { data: overview, sources: [] };
  }

  if (invocation.name === "get_pending_grading") {
    const [byMilestone, rows] = await Promise.all([
      analytics.listPendingMilestones(context),
      analytics.listPendingSubmissions(context, MAX_PENDING_SUBMISSIONS + 1),
    ]);
    return {
      data: {
        totalPending: byMilestone.reduce(
          (total, item) => total + item.pendingCount,
          0,
        ),
        byMilestone,
        submissions: rows.slice(0, MAX_PENDING_SUBMISSIONS),
        submissionsTruncated: rows.length > MAX_PENDING_SUBMISSIONS,
      },
      sources: milestoneSources(byMilestone),
    };
  }

  if (invocation.name === "get_submission_stats") {
    const [overview, byMilestone] = await Promise.all([
      analytics.getCourseOverview(context),
      analytics.listMilestoneStats(context),
    ]);
    if (!overview) {
      throw new InstructorToolError(InstructorToolErrorCode.EXECUTION_FAILED);
    }
    const draftSubmissions = byMilestone.reduce(
      (total, item) => total + item.draftSubmissions,
      0,
    );
    const submittedSubmissions = byMilestone.reduce(
      (total, item) => total + item.submittedSubmissions,
      0,
    );
    const gradedSubmissions = byMilestone.reduce(
      (total, item) => total + item.gradedSubmissions,
      0,
    );
    const missingSubmissions = byMilestone.reduce(
      (total, item) => total + item.missingStudents,
      0,
    );

    return {
      data: {
        enrolledStudents: overview.enrolledStudents,
        totalMilestones: overview.milestones,
        draftSubmissions,
        submittedSubmissions,
        gradedSubmissions,
        pendingGrading: submittedSubmissions,
        missingSubmissions,
        byMilestone,
      },
      sources: milestoneSources(byMilestone),
    };
  }

  const { milestoneId } = invocation.arguments;
  if (milestoneId) {
    const milestone = await analytics.findMilestone(context, milestoneId);
    if (!milestone) {
      throw new InstructorToolError(InstructorToolErrorCode.INVALID_MILESTONE);
    }
  }
  const result = await analytics.listMissingSubmissions(
    context,
    milestoneId,
    MAX_MISSING_SUBMISSIONS,
  );
  return {
    data: {
      ...(milestoneId && { milestoneId }),
      totalMissing: result.total,
      missing: result.rows,
      truncated: result.total > result.rows.length,
    },
    sources: milestoneSources(result.rows),
  };
}

export async function executeInstructorTool(
  invocation: ValidatedInstructorToolInvocation,
  context: InstructorToolContext,
  dependencies: InstructorToolDependencies = {},
): Promise<InstructorToolExecutionResult> {
  try {
    return await executeValidatedInstructorTool(
      invocation,
      Object.freeze({ ...context }),
      dependencies,
    );
  } catch (error) {
    if (error instanceof InstructorToolError) throw error;
    throw new InstructorToolError(InstructorToolErrorCode.EXECUTION_FAILED, {
      cause: error,
    });
  }
}
