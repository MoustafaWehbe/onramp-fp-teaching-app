export const INSTRUCTOR_TOOL_NAMES = [
  "search_course_content",
  "get_course_overview",
  "get_pending_grading",
  "get_submission_stats",
  "get_missing_submissions",
] as const;

export type InstructorToolName = (typeof INSTRUCTOR_TOOL_NAMES)[number];

export interface InstructorToolContext {
  readonly courseId: string;
  readonly instructorId: string;
}

export interface InstructorAssistantSource {
  type: "lesson" | "milestone";
  id: string;
  title: string;
}

export interface CourseContentMatch {
  lessonId: string;
  lessonTitle: string;
  excerpt: string;
  similarity: number;
}

export interface CourseContentSearchResult {
  query: string;
  matches: CourseContentMatch[];
  insufficientEvidence: boolean;
}

export interface CourseOverviewResult {
  courseId: string;
  title: string;
  state: "published" | "draft";
  enrolledStudents: number;
  modules: number;
  lessons: number;
  milestones: number;
  submissions: number;
}

export interface PendingMilestoneCount {
  milestoneId: string;
  milestoneTitle: string;
  pendingCount: number;
}

export interface PendingSubmissionItem {
  submissionId: string;
  studentId: string;
  studentName: string;
  milestoneId: string;
  milestoneTitle: string;
  submittedAt: string | null;
}

export interface PendingGradingResult {
  totalPending: number;
  byMilestone: PendingMilestoneCount[];
  submissions: PendingSubmissionItem[];
  submissionsTruncated: boolean;
}

export interface MilestoneSubmissionStats {
  milestoneId: string;
  milestoneTitle: string;
  enrolledStudents: number;
  draftSubmissions: number;
  submittedSubmissions: number;
  gradedSubmissions: number;
  missingStudents: number;
}

export interface SubmissionStatsResult {
  enrolledStudents: number;
  totalMilestones: number;
  draftSubmissions: number;
  submittedSubmissions: number;
  gradedSubmissions: number;
  pendingGrading: number;
  missingSubmissions: number;
  byMilestone: MilestoneSubmissionStats[];
}

export interface MissingSubmissionItem {
  studentId: string;
  studentName: string;
  milestoneId: string;
  milestoneTitle: string;
}

export interface MissingSubmissionsResult {
  milestoneId?: string;
  totalMissing: number;
  missing: MissingSubmissionItem[];
  truncated: boolean;
}

export type InstructorToolData =
  | CourseContentSearchResult
  | CourseOverviewResult
  | PendingGradingResult
  | SubmissionStatsResult
  | MissingSubmissionsResult;

export interface InstructorToolExecutionResult {
  data: InstructorToolData;
  sources: InstructorAssistantSource[];
}

export type ValidatedInstructorToolInvocation =
  | {
      name: "search_course_content";
      arguments: { query: string };
    }
  | { name: "get_course_overview"; arguments: Record<string, never> }
  | { name: "get_pending_grading"; arguments: Record<string, never> }
  | { name: "get_submission_stats"; arguments: Record<string, never> }
  | {
      name: "get_missing_submissions";
      arguments: { milestoneId?: string };
    };

export const InstructorToolErrorCode = {
  UNKNOWN_TOOL: "UNKNOWN_TOOL",
  INVALID_ARGUMENTS: "INVALID_ARGUMENTS",
  INVALID_MILESTONE: "INVALID_MILESTONE",
  EXECUTION_FAILED: "EXECUTION_FAILED",
} as const;

export type InstructorToolErrorCode =
  (typeof InstructorToolErrorCode)[keyof typeof InstructorToolErrorCode];

export class InstructorToolError extends Error {
  readonly code: InstructorToolErrorCode;

  constructor(code: InstructorToolErrorCode, options?: ErrorOptions) {
    super("Instructor assistant tool execution failed.", options);
    this.name = "InstructorToolError";
    this.code = code;
  }
}
