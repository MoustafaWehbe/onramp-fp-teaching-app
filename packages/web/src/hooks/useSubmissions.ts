import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSubmission,
  getMyGrades,
  type SubmissionLinkInput,
} from "../lib/submissions-api";

export const submissionKeys = {
  all: ["submissions"] as const,
  grades: () => [...submissionKeys.all, "my-grades"] as const,
};

export function useCreateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      milestoneId,
      links,
    }: {
      milestoneId: string;
      links: SubmissionLinkInput[];
    }) => createSubmission(milestoneId, links),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: submissionKeys.grades() });
    },
  });
}

export function useMyGrades() {
  return useQuery({
    queryKey: submissionKeys.grades(),
    queryFn: getMyGrades,
  });
}
