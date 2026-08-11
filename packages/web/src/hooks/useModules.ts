import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLesson,
  getLessons,
  getModule,
  getModules,
  type Lesson,
  type Module,
} from "../lib/modules-api";

export const moduleKeys = {
  all: ["learning-content"] as const,
  modules: (courseId: string) =>
    [...moduleKeys.all, "courses", courseId, "modules"] as const,
  module: (courseId: string, moduleId: string) =>
    [...moduleKeys.modules(courseId), moduleId] as const,
  lessons: (moduleId: string) =>
    [...moduleKeys.all, "modules", moduleId, "lessons"] as const,
  lesson: (moduleId: string, lessonId: string) =>
    [...moduleKeys.lessons(moduleId), lessonId] as const,
};

const CONTENT_STALE_TIME = 60_000;

export function useModules(courseId: string | undefined) {
  return useQuery({
    queryKey: moduleKeys.modules(courseId ?? ""),
    queryFn: () => getModules(courseId as string),
    enabled: Boolean(courseId),
    staleTime: CONTENT_STALE_TIME,
  });
}

export function useModule(
  courseId: string | undefined,
  moduleId: string | undefined,
) {
  const queryClient = useQueryClient();
  const modulesKey = moduleKeys.modules(courseId ?? "");

  return useQuery({
    queryKey: moduleKeys.module(courseId ?? "", moduleId ?? ""),
    queryFn: () => getModule(courseId as string, moduleId as string),
    enabled: Boolean(courseId && moduleId),
    staleTime: CONTENT_STALE_TIME,
    initialData: () =>
      queryClient
        .getQueryData<Module[]>(modulesKey)
        ?.find((module) => module.id === moduleId),
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(modulesKey)?.dataUpdatedAt,
  });
}

export function useLessons(moduleId: string | undefined) {
  return useQuery({
    queryKey: moduleKeys.lessons(moduleId ?? ""),
    queryFn: () => getLessons(moduleId as string),
    enabled: Boolean(moduleId),
    staleTime: CONTENT_STALE_TIME,
  });
}

export function useLesson(
  moduleId: string | undefined,
  lessonId: string | undefined,
) {
  const queryClient = useQueryClient();
  const lessonsKey = moduleKeys.lessons(moduleId ?? "");

  return useQuery({
    queryKey: moduleKeys.lesson(moduleId ?? "", lessonId ?? ""),
    queryFn: () => getLesson(moduleId as string, lessonId as string),
    enabled: Boolean(moduleId && lessonId),
    staleTime: CONTENT_STALE_TIME,
    initialData: () =>
      queryClient
        .getQueryData<Lesson[]>(lessonsKey)
        ?.find((lesson) => lesson.id === lessonId),
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(lessonsKey)?.dataUpdatedAt,
  });
}
