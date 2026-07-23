import axios from "axios";
import { apiClient } from "./api-client";
import type { components, operations } from "./api-types";

type ApiCourse = components["schemas"]["Course"];
type CoursesResponse =
  operations["getCourses"]["responses"][200]["content"]["application/json"];
type CourseResponse =
  operations["getCourse"]["responses"][200]["content"]["application/json"];
type CreateCourseResponse =
  operations["createCourse"]["responses"][201]["content"]["application/json"];
type EnrollmentResponse =
  operations["enroll"]["responses"][201]["content"]["application/json"];

/**
 * A UI-safe Course built from the generated OpenAPI schema.
 *
 * OpenAPI currently marks response properties as optional, but course links and
 * headings cannot work without an id and title. API responses are normalized at
 * the boundary so consumers do not have to repeat optional-field fallbacks.
 */
export type Course = Omit<
  ApiCourse,
  "id" | "title" | "description" | "isPublished"
> & {
  id: string;
  title: string;
  description: string;
  isPublished: boolean;
};

export type CreateCourseInput = components["schemas"]["CreateCourseBody"];
export type Enrollment = components["schemas"]["Enrollment"];
export type EnrollInput = components["schemas"]["EnrollBody"];

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeCourse(course: ApiCourse): Course {
  if (typeof course.id !== "string" || course.id.length === 0) {
    throw new Error("The server returned a course without an id.");
  }

  return {
    ...course,
    id: course.id,
    title: course.title ?? "Untitled course",
    description: course.description ?? "",
    isPublished: course.isPublished ?? false,
  };
}

function requireCourse(value: unknown): Course {
  if (!isRecord(value)) {
    throw new Error("The server returned an invalid course response.");
  }

  return normalizeCourse(value as ApiCourse);
}

function extractValidationMessages(payload: Record<string, unknown>): string[] {
  const candidates = Array.isArray(payload.errors)
    ? payload.errors
    : Array.isArray(payload.details)
      ? payload.details
      : [];

  return candidates.flatMap((item) => {
    if (typeof item === "string" && item.trim()) {
      return [item.trim()];
    }

    if (!isRecord(item) || typeof item.message !== "string") {
      return [];
    }

    const message = item.message.trim();
    if (!message) return [];

    const field = typeof item.field === "string" ? item.field.trim() : "";
    return [field ? `${field}: ${message}` : message];
  });
}

function extractPayloadMessage(payload: unknown): string | undefined {
  if (typeof payload === "string") {
    return payload.trim() || undefined;
  }

  if (!isRecord(payload)) return undefined;

  const validationMessages = extractValidationMessages(payload);
  const errorMessage =
    typeof payload.error === "string" ? payload.error.trim() : "";

  if (validationMessages.length > 0) {
    const details = validationMessages.join(", ");
    return errorMessage ? `${errorMessage}: ${details}` : details;
  }

  if (errorMessage) return errorMessage;

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }

  if (isRecord(payload.error)) {
    const nestedError = extractPayloadMessage(payload.error);
    if (nestedError) return nestedError;
  }

  if (isRecord(payload.data)) {
    return extractPayloadMessage(payload.data);
  }

  return undefined;
}

/** Return a useful user-facing message for Axios, validation, and local errors. */
export function getApiErrorMessage(
  error: unknown,
  fallback = DEFAULT_ERROR_MESSAGE,
): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = extractPayloadMessage(error.response?.data);
    if (responseMessage) return responseMessage;

    if (!error.response) {
      return "Unable to reach the server. Check your connection and try again.";
    }

    return error.message || fallback;
  }

  const payloadMessage = extractPayloadMessage(error);
  if (payloadMessage) return payloadMessage;

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

export async function getCourses(): Promise<Course[]> {
  const { data } = await apiClient.get<CoursesResponse>("/courses");

  if (!Array.isArray(data.data)) {
    throw new Error("The server returned an invalid courses response.");
  }

  return data.data.map(requireCourse);
}

export async function getCourse(courseId: string): Promise<Course> {
  const { data } = await apiClient.get<CourseResponse>(
    `/courses/${encodeURIComponent(courseId)}`,
  );

  return requireCourse(data.data);
}

export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const { data } = await apiClient.post<CreateCourseResponse>(
    "/courses",
    input,
  );
  return requireCourse(data.data);
}

export async function enrollInCourse(input: EnrollInput): Promise<Enrollment> {
  const { data } = await apiClient.post<EnrollmentResponse>(
    "/enrollments",
    input,
  );

  if (!isRecord(data.data)) {
    throw new Error("The server returned an invalid enrollment response.");
  }

  return data.data as Enrollment;
}
