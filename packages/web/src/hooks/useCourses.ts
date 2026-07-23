import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCourse,
  enrollInCourse,
  getCourse,
  getCourses,
  type CreateCourseInput,
  type EnrollInput,
} from "../lib/courses-api";

export const courseKeys = {
  all: ["courses"] as const,
  lists: () => [...courseKeys.all, "list"] as const,
  list: () => [...courseKeys.lists()] as const,
  details: () => [...courseKeys.all, "detail"] as const,
  detail: (courseId: string) => [...courseKeys.details(), courseId] as const,
};

export function useCourses() {
  return useQuery({
    queryKey: courseKeys.list(),
    queryFn: getCourses,
  });
}

export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: courseKeys.detail(courseId ?? ""),
    queryFn: () => getCourse(courseId as string),
    enabled: Boolean(courseId),
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCourseInput) => createCourse(input),
    onSuccess: (course) => {
      queryClient.setQueryData(courseKeys.detail(course.id), course);
      void queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
    },
  });
}

export function useEnrollInCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EnrollInput) => enrollInCourse(input),
    onSuccess: (enrollment) => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.lists() });

      if (enrollment.courseId) {
        void queryClient.invalidateQueries({
          queryKey: courseKeys.detail(enrollment.courseId),
        });
      }
    },
  });
}
