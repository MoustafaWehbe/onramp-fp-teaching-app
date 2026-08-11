import { apiClient } from "./api-client";
import type { components, operations } from "./api-types";

type ApiSubmission = components["schemas"]["Submission"];
type CreateSubmissionResponse =
  operations["createSubmission"]["responses"][201]["content"]["application/json"];
type MyGradesResponse =
  operations["getMyGrades"]["responses"][200]["content"]["application/json"];

export type SubmissionStatus = "draft" | "submitted" | "graded";
export type SubmissionLinkType = "github" | "loom" | "deployment" | "other";
export type SubmissionLinkInput = components["schemas"]["SubmissionLinkBody"];

export interface SubmissionLink {
  id?: string;
  type: SubmissionLinkType;
  url: string;
}

export interface SubmissionContext {
  id: string;
  title: string;
  module?: {
    id: string;
    title: string;
    course?: {
      id: string;
      title: string;
    };
  };
}

export interface StudentSubmission {
  id: string;
  milestoneId: string;
  studentId: string;
  status: SubmissionStatus;
  score?: number;
  feedback?: string;
  links: SubmissionLink[];
  submittedAt?: string;
  gradedAt?: string;
  milestone?: SubmissionContext;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`The server returned a submission without ${field}.`);
  }
  return value;
}

function normalizeLinkType(value: unknown): SubmissionLinkType {
  if (
    value === "github" ||
    value === "loom" ||
    value === "deployment" ||
    value === "other"
  ) {
    return value;
  }
  throw new Error("The server returned an invalid submission link type.");
}

function normalizeLink(value: unknown): SubmissionLink {
  if (!isRecord(value)) {
    throw new Error("The server returned an invalid submission link.");
  }

  return {
    id: typeof value.id === "string" ? value.id : undefined,
    type: normalizeLinkType(value.type),
    url: requireString(value.url, "a link URL"),
  };
}

function normalizeContext(value: unknown): SubmissionContext | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    throw new Error("The server returned invalid milestone context.");
  }

  let module: SubmissionContext["module"];
  if (value.module !== undefined && value.module !== null) {
    if (!isRecord(value.module)) {
      throw new Error("The server returned invalid module context.");
    }

    let course: NonNullable<SubmissionContext["module"]>["course"];
    if (value.module.course !== undefined && value.module.course !== null) {
      if (!isRecord(value.module.course)) {
        throw new Error("The server returned invalid course context.");
      }
      course = {
        id: requireString(value.module.course.id, "a course id"),
        title: requireString(value.module.course.title, "a course title"),
      };
    }

    module = {
      id: requireString(value.module.id, "a module id"),
      title: requireString(value.module.title, "a module title"),
      course,
    };
  }

  return {
    id: requireString(value.id, "a milestone id"),
    title: requireString(value.title, "a milestone title"),
    module,
  };
}

function normalizeSubmission(value: unknown): StudentSubmission {
  if (!isRecord(value)) {
    throw new Error("The server returned an invalid submission response.");
  }

  const status = value.status;
  if (status !== "draft" && status !== "submitted" && status !== "graded") {
    throw new Error("The server returned a submission with an invalid status.");
  }

  return {
    id: requireString(value.id, "an id"),
    milestoneId: requireString(value.milestoneId, "a milestone id"),
    studentId: requireString(value.studentId, "a student id"),
    status,
    score:
      typeof value.score === "number" && Number.isFinite(value.score)
        ? value.score
        : undefined,
    feedback: typeof value.feedback === "string" ? value.feedback : undefined,
    links: Array.isArray(value.links) ? value.links.map(normalizeLink) : [],
    submittedAt:
      typeof value.submittedAt === "string" ? value.submittedAt : undefined,
    gradedAt: typeof value.gradedAt === "string" ? value.gradedAt : undefined,
    milestone: normalizeContext(value.milestone),
  };
}

export function getSafeHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? value
      : null;
  } catch {
    return null;
  }
}

export function validateSubmissionUrl(
  type: SubmissionLinkType,
  value: string,
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a URL.";

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "Enter a valid URL.";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Only HTTP and HTTPS links are allowed.";
  }

  const hostname = parsed.hostname.toLowerCase();
  const hasPath = parsed.pathname !== "/" && parsed.pathname.length > 1;
  if (
    type === "github" &&
    ((hostname !== "github.com" && hostname !== "www.github.com") || !hasPath)
  ) {
    return "Enter a GitHub URL from github.com.";
  }

  if (
    type === "loom" &&
    ((hostname !== "loom.com" && hostname !== "www.loom.com") || !hasPath)
  ) {
    return "Enter a Loom URL from loom.com.";
  }

  return undefined;
}

export async function createSubmission(
  milestoneId: string,
  links: SubmissionLinkInput[],
): Promise<StudentSubmission> {
  const { data } = await apiClient.post<CreateSubmissionResponse>(
    `/milestones/${encodeURIComponent(milestoneId)}/submissions`,
    { links },
  );

  return normalizeSubmission(data.data);
}

export async function getMyGrades(): Promise<StudentSubmission[]> {
  const { data } = await apiClient.get<MyGradesResponse>(
    "/submissions/my/grades",
  );

  if (!Array.isArray(data.data)) {
    throw new Error("The server returned an invalid grades response.");
  }

  return data.data.map(normalizeSubmission);
}
