import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Course } from "../lib/courses-api";
import {
  getCourseSubmissions,
  getMilestones,
  getModules,
  getSubmissions,
  gradeSubmission,
  type GradeSubmissionInput,
  type InstructorSubmission,
  type Submission,
} from "../lib/instructor-api";

export const instructorKeys = {
  all: ["instructor"] as const,
  modules: (courseId: string) =>
    [...instructorKeys.all, "courses", courseId, "modules"] as const,
  milestones: (moduleId: string) =>
    [...instructorKeys.all, "modules", moduleId, "milestones"] as const,
  milestoneSubmissions: (milestoneId: string) =>
    [...instructorKeys.all, "milestones", milestoneId, "submissions"] as const,
  courseSubmissions: (courseId: string) =>
    [...instructorKeys.all, "courses", courseId, "submissions"] as const,
};

export function useModules(courseId: string | undefined) {
  return useQuery({
    queryKey: instructorKeys.modules(courseId ?? ""),
    queryFn: () => getModules(courseId as string),
    enabled: Boolean(courseId),
  });
}

export function useMilestones(moduleId: string | undefined) {
  return useQuery({
    queryKey: instructorKeys.milestones(moduleId ?? ""),
    queryFn: () => getMilestones(moduleId as string),
    enabled: Boolean(moduleId),
  });
}

export function useMilestoneSubmissions(milestoneId: string | undefined) {
  return useQuery({
    queryKey: instructorKeys.milestoneSubmissions(milestoneId ?? ""),
    queryFn: () => getSubmissions(milestoneId as string),
    enabled: Boolean(milestoneId),
  });
}

export function useInstructorSubmissions(course: Course | undefined) {
  return useQuery({
    queryKey: instructorKeys.courseSubmissions(course?.id ?? ""),
    queryFn: () => getCourseSubmissions(course as Course),
    enabled: Boolean(course),
  });
}

export interface GradeSubmissionVariables extends GradeSubmissionInput {
  submissionId: string;
  courseId: string;
  milestoneId: string;
}

function applyGrade<T extends Submission>(
  submission: T,
  graded: Submission,
  variables: GradeSubmissionVariables,
): T {
  if (submission.id !== variables.submissionId) return submission;

  return {
    ...submission,
    ...graded,
    student: submission.student,
    links: submission.links,
    status: "graded",
    score: variables.score,
    feedback: variables.feedback,
  };
}

export function useGradeSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId, score, feedback }: GradeSubmissionVariables) =>
      gradeSubmission(submissionId, { score, feedback }),
    onSuccess: (graded, variables) => {
      queryClient.setQueryData<Submission[]>(
        instructorKeys.milestoneSubmissions(variables.milestoneId),
        (current) =>
          current?.map((submission) =>
            applyGrade(submission, graded, variables),
          ),
      );
      queryClient.setQueryData<InstructorSubmission[]>(
        instructorKeys.courseSubmissions(variables.courseId),
        (current) =>
          current?.map((submission) =>
            applyGrade(submission, graded, variables),
          ),
      );
    },
  });
}
