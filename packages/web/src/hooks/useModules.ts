import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  getLesson,
  getLessons,
  getModule,
  getModules,
  updateLesson,
  updateModule,
  type CreateLessonInput,
  type CreateModuleInput,
  type Lesson,
  type Module,
  type UpdateLessonInput,
  type UpdateModuleInput,
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

export function useModules(courseId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: moduleKeys.modules(courseId ?? ""),
    queryFn: () => getModules(courseId as string),
    enabled: Boolean(courseId) && enabled,
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

export function useCreateModule(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateModuleInput) => createModule(courseId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: moduleKeys.modules(courseId) });
    },
  });
}

export function useUpdateModule(courseId: string, moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateModuleInput) => updateModule(courseId, moduleId, input),
    onSuccess: (module) => {
      queryClient.setQueryData(moduleKeys.module(courseId, module.id), module);
      void queryClient.invalidateQueries({ queryKey: moduleKeys.modules(courseId) });
    },
  });
}

export function useDeleteModule(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (moduleId: string) => deleteModule(courseId, moduleId),
    onSuccess: (_result, moduleId) => {
      queryClient.removeQueries({ queryKey: moduleKeys.module(courseId, moduleId) });
      void queryClient.invalidateQueries({ queryKey: moduleKeys.modules(courseId) });
    },
  });
}

export function useCreateLesson(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLessonInput) => createLesson(moduleId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: moduleKeys.lessons(moduleId) });
    },
  });
}

export function useUpdateLesson(moduleId: string, lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLessonInput) => updateLesson(moduleId, lessonId, input),
    onSuccess: (lesson) => {
      queryClient.setQueryData(moduleKeys.lesson(lesson.moduleId, lesson.id), lesson);
      void queryClient.invalidateQueries({ queryKey: moduleKeys.lessons(moduleId) });
      if (lesson.moduleId !== moduleId) {
        void queryClient.invalidateQueries({ queryKey: moduleKeys.lessons(lesson.moduleId) });
        queryClient.removeQueries({ queryKey: moduleKeys.lesson(moduleId, lesson.id) });
      }
    },
  });
}

export function useDeleteLesson(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => deleteLesson(moduleId, lessonId),
    onSuccess: (_result, lessonId) => {
      queryClient.removeQueries({ queryKey: moduleKeys.lesson(moduleId, lessonId) });
      void queryClient.invalidateQueries({ queryKey: moduleKeys.lessons(moduleId) });
    },
  });
}
