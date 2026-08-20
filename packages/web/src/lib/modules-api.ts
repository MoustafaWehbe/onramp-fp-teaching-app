import { apiClient } from "./api-client";
import type { components, operations } from "./api-types";

type ApiModule = components["schemas"]["Module"];
type ApiLesson = components["schemas"]["Lesson"];
type ModulesResponse =
  operations["getModules"]["responses"][200]["content"]["application/json"];
type ModuleResponse =
  operations["getModule"]["responses"][200]["content"]["application/json"];
type LessonsResponse =
  operations["getLessons"]["responses"][200]["content"]["application/json"];
type LessonResponse =
  operations["getLesson"]["responses"][200]["content"]["application/json"];
type CreateModuleResponse =
  operations["createModule"]["responses"][201]["content"]["application/json"];
type UpdateModuleResponse =
  operations["updateModule"]["responses"][200]["content"]["application/json"];
type CreateLessonResponse =
  operations["createLesson"]["responses"][201]["content"]["application/json"];
type UpdateLessonResponse =
  operations["updateLesson"]["responses"][200]["content"]["application/json"];

export type CreateModuleInput =
  operations["createModule"]["requestBody"]["content"]["application/json"];
export type UpdateModuleInput =
  operations["updateModule"]["requestBody"]["content"]["application/json"];
export type CreateLessonInput =
  operations["createLesson"]["requestBody"]["content"]["application/json"];
export type UpdateLessonInput =
  operations["updateLesson"]["requestBody"]["content"]["application/json"];

export interface Module {
  id: string;
  courseId: string;
  title: string;
  order: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  videoUrl: string | null;
  starterCodeUrl: string | null;
  order: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireString(value: unknown, entity: string, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`The server returned ${entity} without a ${field}.`);
  }

  return value.trim();
}

function normalizeOrder(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeOptionalUrl(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeModule(value: unknown): Module {
  if (!isRecord(value)) {
    throw new Error("The server returned an invalid module response.");
  }

  const module = value as ApiModule;
  return {
    id: requireString(module.id, "a module", "id"),
    courseId: requireString(module.courseId, "a module", "course id"),
    title: requireString(module.title, "a module", "title"),
    order: normalizeOrder(module.order),
  };
}

function normalizeLesson(value: unknown): Lesson {
  if (!isRecord(value)) {
    throw new Error("The server returned an invalid lesson response.");
  }

  const lesson = value as ApiLesson;
  return {
    id: requireString(lesson.id, "a lesson", "id"),
    moduleId: requireString(lesson.moduleId, "a lesson", "module id"),
    title: requireString(lesson.title, "a lesson", "title"),
    content: typeof lesson.content === "string" ? lesson.content : "",
    videoUrl: normalizeOptionalUrl(lesson.videoUrl),
    starterCodeUrl: normalizeOptionalUrl(lesson.starterCodeUrl),
    order: normalizeOrder(lesson.order),
  };
}

function byOrderThenTitle<T extends { order: number; title: string }>(
  left: T,
  right: T,
): number {
  return left.order - right.order || left.title.localeCompare(right.title);
}

export async function getModules(courseId: string): Promise<Module[]> {
  const { data } = await apiClient.get<ModulesResponse>(
    `/courses/${encodeURIComponent(courseId)}/modules`,
  );

  if (!Array.isArray(data.data)) {
    throw new Error("The server returned an invalid modules response.");
  }

  return data.data.map(normalizeModule).sort(byOrderThenTitle);
}

export async function getModule(
  courseId: string,
  moduleId: string,
): Promise<Module> {
  const { data } = await apiClient.get<ModuleResponse>(
    `/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}`,
  );

  return normalizeModule(data.data);
}

export async function getLessons(moduleId: string): Promise<Lesson[]> {
  const { data } = await apiClient.get<LessonsResponse>(
    `/modules/${encodeURIComponent(moduleId)}/lessons`,
  );

  if (!Array.isArray(data.data)) {
    throw new Error("The server returned an invalid lessons response.");
  }

  return data.data.map(normalizeLesson).sort(byOrderThenTitle);
}

export async function getLesson(
  moduleId: string,
  lessonId: string,
): Promise<Lesson> {
  const { data } = await apiClient.get<LessonResponse>(
    `/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}`,
  );

  return normalizeLesson(data.data);
}

export async function createModule(
  courseId: string,
  input: CreateModuleInput,
): Promise<Module> {
  const { data } = await apiClient.post<CreateModuleResponse>(
    `/courses/${encodeURIComponent(courseId)}/modules`,
    input,
  );
  return normalizeModule(data.data);
}

export async function updateModule(
  courseId: string,
  moduleId: string,
  input: UpdateModuleInput,
): Promise<Module> {
  const { data } = await apiClient.put<UpdateModuleResponse>(
    `/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}`,
    input,
  );
  return normalizeModule(data.data);
}

export async function deleteModule(
  courseId: string,
  moduleId: string,
): Promise<void> {
  await apiClient.delete(
    `/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}`,
  );
}

export async function createLesson(
  moduleId: string,
  input: CreateLessonInput,
): Promise<Lesson> {
  const { data } = await apiClient.post<CreateLessonResponse>(
    `/modules/${encodeURIComponent(moduleId)}/lessons`,
    input,
  );
  return normalizeLesson(data.data);
}

export async function updateLesson(
  moduleId: string,
  lessonId: string,
  input: UpdateLessonInput,
): Promise<Lesson> {
  const { data } = await apiClient.put<UpdateLessonResponse>(
    `/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}`,
    input,
  );
  return normalizeLesson(data.data);
}

export async function deleteLesson(
  moduleId: string,
  lessonId: string,
): Promise<void> {
  await apiClient.delete(
    `/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}`,
  );
}
