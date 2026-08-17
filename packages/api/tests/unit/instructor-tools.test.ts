import type { InstructorAnalyticsRepository } from "../../src/services/ai/instructor/instructor-tool.repository";
import {
  executeInstructorTool,
  INSTRUCTOR_FUNCTION_TOOLS,
  MAX_MISSING_SUBMISSIONS,
  MAX_PENDING_SUBMISSIONS,
  validateInstructorToolInvocation,
} from "../../src/services/ai/instructor/instructor-tools";
import {
  INSTRUCTOR_TOOL_NAMES,
  InstructorToolErrorCode,
  type InstructorToolContext,
} from "../../src/services/ai/instructor/instructor-tool.types";
import type { CourseSemanticSearchResult } from "../../src/services/ai/rag/course-retrieval.service";

const courseId = "00000000-0000-4000-8000-000000000001";
const otherCourseId = "00000000-0000-4000-8000-000000000002";
const instructorId = "00000000-0000-4000-8000-000000000003";
const milestoneId = "00000000-0000-4000-8000-000000000004";
const context: InstructorToolContext = { courseId, instructorId };

function overview() {
  return {
    courseId,
    title: "Secure Web Apps",
    state: "draft" as const,
    enrolledStudents: 3,
    modules: 2,
    lessons: 4,
    milestones: 2,
    submissions: 5,
  };
}

function repositoryFixture(
  overrides: Partial<InstructorAnalyticsRepository> = {},
) {
  return {
    getCourseOverview: jest.fn(async () => overview()),
    listPendingMilestones: jest.fn(async () => []),
    listPendingSubmissions: jest.fn(async () => []),
    listMilestoneStats: jest.fn(async () => []),
    findMilestone: jest.fn(async () => ({ id: milestoneId, title: "Auth" })),
    listMissingSubmissions: jest.fn(async () => ({ total: 0, rows: [] })),
    ...overrides,
  } as InstructorAnalyticsRepository;
}

function invocation(name: string, args: unknown = {}) {
  return validateInstructorToolInvocation(name, args);
}

function searchResult(
  overrides: Partial<CourseSemanticSearchResult> = {},
): CourseSemanticSearchResult {
  return {
    chunkId: "chunk-1",
    courseId,
    moduleId: "module-1",
    lessonId: "lesson-1",
    sourceType: "lesson",
    sourceTitle: "Authentication",
    chunkIndex: 0,
    excerpt: "Refresh tokens should be rotated.",
    similarity: 0.91,
    ...overrides,
  };
}

const ragConfig = {
  retrievalLimit: 6,
  minimumSimilarity: 0.75,
  maximumSourceCharacters: 1_500,
  maximumContextCharacters: 8_000,
};

describe("Instructor Assistant tool boundary", () => {
  it("declares exactly the five requested read-only tools without identity arguments", () => {
    expect(INSTRUCTOR_FUNCTION_TOOLS.map((tool) => tool.name)).toEqual(
      INSTRUCTOR_TOOL_NAMES,
    );
    expect(JSON.stringify(INSTRUCTOR_FUNCTION_TOOLS)).not.toMatch(
      /courseId|instructorId|userId|gradeSubmission|publishCourse/u,
    );
  });

  it.each([
    ["unknown_tool", {}],
    ["toString", {}],
    ["search_course_content", {}],
    ["search_course_content", { query: "auth", courseId: otherCourseId }],
    ["get_course_overview", { instructorId: "attacker" }],
    ["get_pending_grading", { userId: "attacker" }],
    ["get_missing_submissions", { milestoneId: "not-a-uuid" }],
  ])("rejects unsupported or malformed %s arguments", (name, args) => {
    expect(() => validateInstructorToolInvocation(name, args)).toThrow(
      expect.objectContaining({
        code:
          name === "unknown_tool" || name === "toString"
            ? InstructorToolErrorCode.UNKNOWN_TOOL
            : InstructorToolErrorCode.INVALID_ARGUMENTS,
      }),
    );
  });

  it("reuses course indexing and semantic retrieval with the server course", async () => {
    const index = jest.fn(async () => undefined);
    const search = jest.fn(async () => [
      searchResult(),
      searchResult({ chunkId: "chunk-2", chunkIndex: 1 }),
      searchResult({
        chunkId: "cross-course",
        courseId: otherCourseId,
        lessonId: "other-lesson",
      }),
    ]);

    const result = await executeInstructorTool(
      invocation("search_course_content", { query: "refresh tokens" }),
      context,
      { index, search, ragConfig },
    );

    expect(index).toHaveBeenCalledWith(courseId);
    expect(search).toHaveBeenCalledWith({
      courseId,
      query: "refresh tokens",
      limit: 6,
    });
    expect(result.data).toMatchObject({
      query: "refresh tokens",
      insufficientEvidence: false,
      matches: [
        expect.objectContaining({ lessonId: "lesson-1", similarity: 0.91 }),
        expect.objectContaining({ lessonId: "lesson-1", similarity: 0.91 }),
      ],
    });
    expect(JSON.stringify(result)).not.toContain("other-lesson");
    expect(result.sources).toEqual([
      { type: "lesson", id: "lesson-1", title: "Authentication" },
    ]);
  });

  it("handles insufficient course content without a second provider", async () => {
    const index = jest.fn(async () => undefined);
    const search = jest.fn(async () => [searchResult({ similarity: 0.2 })]);

    const result = await executeInstructorTool(
      invocation("search_course_content", { query: "CSRF" }),
      context,
      { index, search, ragConfig },
    );

    expect(result).toEqual({
      data: {
        query: "CSRF",
        matches: [],
        insufficientEvidence: true,
      },
      sources: [],
    });
  });

  it("returns deterministic course overview counts", async () => {
    const repository = repositoryFixture();

    await expect(
      executeInstructorTool(invocation("get_course_overview"), context, {
        repository,
      }),
    ).resolves.toEqual({ data: overview(), sources: [] });
    expect(repository.getCourseOverview).toHaveBeenCalledWith(context);
  });

  it("counts only repository-defined submitted work as pending grading and bounds the list", async () => {
    const rows = Array.from(
      { length: MAX_PENDING_SUBMISSIONS + 1 },
      (_value, index) => ({
        submissionId: `submission-${index}`,
        studentId: `student-${index}`,
        studentName: `Student ${index}`,
        milestoneId,
        milestoneTitle: "Authentication",
        submittedAt: null,
      }),
    );
    const repository = repositoryFixture({
      listPendingMilestones: jest.fn(async () => [
        { milestoneId, milestoneTitle: "Authentication", pendingCount: 26 },
      ]),
      listPendingSubmissions: jest.fn(async () => rows),
    });

    const result = await executeInstructorTool(
      invocation("get_pending_grading"),
      context,
      { repository },
    );

    expect(result.data).toMatchObject({
      totalPending: 26,
      submissionsTruncated: true,
    });
    expect(
      "submissions" in result.data && result.data.submissions,
    ).toHaveLength(MAX_PENDING_SUBMISSIONS);
    expect(result.sources).toEqual([
      { type: "milestone", id: milestoneId, title: "Authentication" },
    ]);
  });

  it("distinguishes draft, submitted, graded, pending, and missing statistics", async () => {
    const repository = repositoryFixture({
      listMilestoneStats: jest.fn(async () => [
        {
          milestoneId,
          milestoneTitle: "Authentication",
          enrolledStudents: 3,
          draftSubmissions: 1,
          submittedSubmissions: 1,
          gradedSubmissions: 1,
          missingStudents: 1,
        },
        {
          milestoneId: "00000000-0000-4000-8000-000000000005",
          milestoneTitle: "Deployment",
          enrolledStudents: 3,
          draftSubmissions: 0,
          submittedSubmissions: 2,
          gradedSubmissions: 0,
          missingStudents: 1,
        },
      ]),
    });

    const result = await executeInstructorTool(
      invocation("get_submission_stats"),
      context,
      { repository },
    );

    expect(result.data).toMatchObject({
      enrolledStudents: 3,
      totalMilestones: 2,
      draftSubmissions: 1,
      submittedSubmissions: 3,
      gradedSubmissions: 1,
      pendingGrading: 3,
      missingSubmissions: 2,
    });
  });

  it("rejects a milestone outside the authorized course before listing students", async () => {
    const repository = repositoryFixture({
      findMilestone: jest.fn(async () => null),
    });

    await expect(
      executeInstructorTool(
        invocation("get_missing_submissions", { milestoneId }),
        context,
        { repository },
      ),
    ).rejects.toMatchObject({
      code: InstructorToolErrorCode.INVALID_MILESTONE,
    });
    expect(repository.findMilestone).toHaveBeenCalledWith(context, milestoneId);
    expect(repository.listMissingSubmissions).not.toHaveBeenCalled();
  });

  it("returns bounded missing enrolled-student pairs and an exact total", async () => {
    const rows = Array.from(
      { length: MAX_MISSING_SUBMISSIONS },
      (_, index) => ({
        studentId: `student-${index}`,
        studentName: `Student ${index}`,
        milestoneId,
        milestoneTitle: "Authentication",
      }),
    );
    const repository = repositoryFixture({
      listMissingSubmissions: jest.fn(async () => ({ total: 120, rows })),
    });

    const result = await executeInstructorTool(
      invocation("get_missing_submissions", { milestoneId }),
      context,
      { repository },
    );

    expect(result.data).toMatchObject({
      milestoneId,
      totalMissing: 120,
      truncated: true,
    });
    expect("missing" in result.data && result.data.missing).toHaveLength(100);
    expect(repository.listMissingSubmissions).toHaveBeenCalledWith(
      context,
      milestoneId,
      MAX_MISSING_SUBMISSIONS,
    );
  });

  it("returns sensible zeros for an empty course", async () => {
    const repository = repositoryFixture({
      getCourseOverview: jest.fn(async () => ({
        ...overview(),
        enrolledStudents: 0,
        modules: 0,
        lessons: 0,
        milestones: 0,
        submissions: 0,
      })),
    });

    await expect(
      executeInstructorTool(invocation("get_submission_stats"), context, {
        repository,
      }),
    ).resolves.toMatchObject({
      data: {
        enrolledStudents: 0,
        totalMilestones: 0,
        draftSubmissions: 0,
        submittedSubmissions: 0,
        gradedSubmissions: 0,
        pendingGrading: 0,
        missingSubmissions: 0,
        byMilestone: [],
      },
    });
  });
});
