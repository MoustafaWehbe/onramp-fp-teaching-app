import { apiClient } from "./api-client";
import type { Course } from "./courses-api";
import type { components, operations } from "./api-types";

type ApiModule = components["schemas"]["Module"];
type ApiMilestone = components["schemas"]["Milestone"];
type ApiSubmission = components["schemas"]["Submission"];
type ModulesResponse =
  operations["getModules"]["responses"][200]["content"]["application/json"];
type MilestonesResponse =
  operations["getMilestones"]["responses"][200]["content"]["application/json"];
type SubmissionsResponse =
  operations["getSubmissions"]["responses"][200]["content"]["application/json"];
type GradeSubmissionResponse =
  operations["gradeSubmission"]["responses"][200]["content"]["application/json"];

export type SubmissionStatus = "draft" | "submitted" | "graded";
export type SubmissionLinkType = "github" | "loom" | "deployment" | "other";

export interface Module {
  id: string;
  courseId: string;
  title: string;
  order: number;
}

export interface Milestone {
  id: string;
  moduleId: string;
  title: string;
  instructions: string;
  acceptanceCriteria: string;
}

export interface SubmissionLink {
  id?: string;
  url: string;
  type: SubmissionLinkType;
}

export interface SubmissionStudent {
  id: string;
  name: string;
  email: string;
}

export interface Submission {
  id: string;
  milestoneId: string;
  studentId: string;
  student: SubmissionStudent;
  status: SubmissionStatus;
  score?: number;
  feedback?: string;
  links: SubmissionLink[];
  submittedAt?: string;
  gradedAt?: string;
}

export interface InstructorSubmission extends Submission {
  courseId: string;
  courseTitle: string;
  moduleId: string;
  moduleTitle: string;
  milestoneTitle: string;
  instructions: string;
  acceptanceCriteria: string;
}

export interface GradeSubmissionInput {
  score: number;
  feedback: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireId(value: unknown, entity: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`The server returned ${entity} without an id.`);
  }

  return value;
}

function normalizeModule(value: unknown): Module {
  if (!isRecord(value)) {
    throw new Error("The server returned an invalid module response.");
  }

  const module = value as ApiModule;
  return {
    id: requireId(module.id, "a module"),
    courseId: typeof module.courseId === "string" ? module.courseId : "",
    title: module.title?.trim() || "Untitled module",
    order: typeof module.order === "number" ? module.order : 0,
  };
}

function normalizeMilestone(value: unknown): Milestone {
  if (!isRecord(value)) {
    throw new Error("The server returned an invalid milestone response.");
  }

  const milestone = value as ApiMilestone;
  return {
    id: requireId(milestone.id, "a milestone"),
    moduleId: typeof milestone.moduleId === "string" ? milestone.moduleId : "",
    title: milestone.title?.trim() || "Untitled milestone",
    instructions: milestone.instructions?.trim() || "No instructions provided.",
    acceptanceCriteria:
      milestone.acceptanceCriteria?.trim() ||
      "No acceptance criteria provided.",
  };
}

function normalizeLinkType(value: unknown): SubmissionLinkType {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  return normalized === "github" ||
    normalized === "loom" ||
    normalized === "deployment"
    ? normalized
    : "other";
}

function normalizeSubmissionLink(value: unknown): SubmissionLink {
  if (!isRecord(value) || typeof value.url !== "string" || !value.url.trim()) {
    throw new Error("The server returned an invalid submission link.");
  }

  return {
    id: typeof value.id === "string" ? value.id : undefined,
    url: value.url,
    type: normalizeLinkType(value.type),
  };
}

function normalizeStudent(
  value: unknown,
  studentId: string,
): SubmissionStudent {
  if (!isRecord(value)) {
    return { id: studentId, name: "Unknown student", email: "" };
  }

  return {
    id: typeof value.id === "string" ? value.id : studentId,
    name:
      typeof value.name === "string" && value.name.trim()
        ? value.name.trim()
        : "Unknown student",
    email: typeof value.email === "string" ? value.email : "",
  };
}

function normalizeSubmission(value: unknown): Submission {
  if (!isRecord(value)) {
    throw new Error("The server returned an invalid submission response.");
  }

  const submission = value as ApiSubmission;
  const id = requireId(submission.id, "a submission");
  const milestoneId = requireId(
    submission.milestoneId,
    "a submission milestone",
  );
  const studentId = requireId(submission.studentId, "a submission student");
  const status = submission.status;

  if (status !== "draft" && status !== "submitted" && status !== "graded") {
    throw new Error("The server returned a submission with an invalid status.");
  }

  return {
    id,
    milestoneId,
    studentId,
    student: normalizeStudent(submission.student, studentId),
    status,
    score: typeof submission.score === "number" ? submission.score : undefined,
    feedback:
      typeof submission.feedback === "string" ? submission.feedback : undefined,
    links: Array.isArray(submission.links)
      ? submission.links.map(normalizeSubmissionLink)
      : [],
    submittedAt:
      typeof submission.submittedAt === "string"
        ? submission.submittedAt
        : undefined,
    gradedAt:
      typeof submission.gradedAt === "string" ? submission.gradedAt : undefined,
  };
}

export async function getModules(courseId: string): Promise<Module[]> {
  const { data } = await apiClient.get<ModulesResponse>(
    `/courses/${encodeURIComponent(courseId)}/modules`,
  );

  if (!Array.isArray(data.data)) {
    throw new Error("The server returned an invalid modules response.");
  }

  return data.data.map(normalizeModule);
}

export async function getMilestones(moduleId: string): Promise<Milestone[]> {
  const { data } = await apiClient.get<MilestonesResponse>(
    `/modules/${encodeURIComponent(moduleId)}/milestones`,
  );

  if (!Array.isArray(data.data)) {
    throw new Error("The server returned an invalid milestones response.");
  }

  return data.data.map(normalizeMilestone);
}

export async function getSubmissions(
  milestoneId: string,
): Promise<Submission[]> {
  const { data } = await apiClient.get<SubmissionsResponse>(
    `/milestones/${encodeURIComponent(milestoneId)}/submissions`,
  );

  if (!Array.isArray(data.data)) {
    throw new Error("The server returned an invalid submissions response.");
  }

  return data.data.map(normalizeSubmission);
}

export async function getCourseSubmissions(
  course: Course,
): Promise<InstructorSubmission[]> {
  const modules = await getModules(course.id);
  const moduleGroups = await Promise.all(
    modules.map(async (module) => {
      const milestones = await getMilestones(module.id);
      const milestoneGroups = await Promise.all(
        milestones.map(async (milestone) => {
          const submissions = await getSubmissions(milestone.id);
          return submissions.map((submission) => ({
            ...submission,
            courseId: course.id,
            courseTitle: course.title,
            moduleId: module.id,
            moduleTitle: module.title,
            milestoneTitle: milestone.title,
            instructions: milestone.instructions,
            acceptanceCriteria: milestone.acceptanceCriteria,
          }));
        }),
      );

      return milestoneGroups.flat();
    }),
  );

  return moduleGroups.flat();
}

export async function gradeSubmission(
  submissionId: string,
  input: GradeSubmissionInput,
): Promise<Submission> {
  const { data } = await apiClient.post<GradeSubmissionResponse>(
    `/submissions/${encodeURIComponent(submissionId)}/grade`,
    input,
  );

  return normalizeSubmission(data.data);
}
