import { apiClient } from "./api-client";
import type { components, operations } from "./api-types";

export type LessonResource = components["schemas"]["LessonResource"];
export type LessonSummary = components["schemas"]["LessonSummary"];
type ResourceListResponse =
  operations["listLessonResources"]["responses"][200]["content"]["application/json"];
type ResourceUploadResponse =
  operations["uploadLessonResource"]["responses"][201]["content"]["application/json"];
type ResourceReindexResponse =
  operations["reindexLessonResource"]["responses"][200]["content"]["application/json"];
type SummaryResponse =
  operations["generateLessonSummary"]["responses"][200]["content"]["application/json"];

function segment(value: string): string {
  return encodeURIComponent(value);
}

function base(moduleId: string, lessonId: string): string {
  return `/modules/${segment(moduleId)}/lessons/${segment(lessonId)}`;
}

export async function listLessonResources(
  moduleId: string,
  lessonId: string,
): Promise<LessonResource[]> {
  const { data } = await apiClient.get<ResourceListResponse>(
    `${base(moduleId, lessonId)}/resources`,
  );
  if (!Array.isArray(data.data))
    throw new Error("The server returned an invalid resource list.");
  return data.data;
}

export async function uploadLessonResource(
  moduleId: string,
  lessonId: string,
  file: File,
  title?: string,
): Promise<LessonResource> {
  const body = new FormData();
  body.append("file", file);
  if (title?.trim()) body.append("title", title.trim());
  const { data } = await apiClient.post<ResourceUploadResponse>(
    `${base(moduleId, lessonId)}/resources`,
    body,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.data;
}

export async function deleteLessonResource(
  moduleId: string,
  lessonId: string,
  resourceId: string,
): Promise<void> {
  await apiClient.delete(
    `${base(moduleId, lessonId)}/resources/${segment(resourceId)}`,
  );
}

export async function reindexLessonResource(
  moduleId: string,
  lessonId: string,
  resourceId: string,
): Promise<LessonResource> {
  const { data } = await apiClient.post<ResourceReindexResponse>(
    `${base(moduleId, lessonId)}/resources/${segment(resourceId)}/reindex`,
  );
  return data.data!;
}

export function lessonResourceDownloadUrl(
  moduleId: string,
  lessonId: string,
  resourceId: string,
): string {
  return `/api${base(moduleId, lessonId)}/resources/${segment(resourceId)}/download`;
}

export async function generateLessonSummary(
  moduleId: string,
  lessonId: string,
): Promise<LessonSummary> {
  const { data } = await apiClient.post<SummaryResponse>(
    `${base(moduleId, lessonId)}/summary`,
  );
  return data.data!;
}
