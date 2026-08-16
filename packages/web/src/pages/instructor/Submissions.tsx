import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleAlert, Inbox, RefreshCw } from "lucide-react";
import { InstructorContextAssistant } from "../../components/assistant";
import { EmptyState } from "../../components/shared/EmptyState";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useCourses } from "../../hooks/useCourses";
import { useInstructorSubmissions } from "../../hooks/useInstructor";
import { getApiErrorMessage } from "../../lib/courses-api";
import type {
  InstructorSubmission,
  SubmissionStatus,
} from "../../lib/instructor-api";

type SubmissionFilter = "all" | "pending" | "graded";

function statusLabel(status: SubmissionStatus) {
  return status === "submitted" ? "Pending" : undefined;
}

function formatSubmittedAt(value: string | undefined) {
  if (!value) return "Submission date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Submission date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function reviewUrl(submission: InstructorSubmission) {
  const params = new URLSearchParams({
    courseId: submission.courseId,
    moduleId: submission.moduleId,
    milestoneId: submission.milestoneId,
  });
  return `/instructor/submissions/${submission.id}/review?${params.toString()}`;
}

export function SubmissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<SubmissionFilter>("all");
  const coursesQuery = useCourses();
  const selectedCourseId = searchParams.get("courseId") ?? "";
  const selectedCourse = coursesQuery.data?.find(
    (course) => course.id === selectedCourseId,
  );
  const submissionsQuery = useInstructorSubmissions(selectedCourse);
  const submissions = submissionsQuery.data ?? [];

  const counts = useMemo(
    () => ({
      all: submissions.length,
      pending: submissions.filter((item) => item.status === "submitted").length,
      graded: submissions.filter((item) => item.status === "graded").length,
    }),
    [submissions],
  );
  const filteredSubmissions = useMemo(
    () =>
      submissions.filter((submission) => {
        if (filter === "pending") return submission.status === "submitted";
        if (filter === "graded") return submission.status === "graded";
        return true;
      }),
    [filter, submissions],
  );

  function selectCourse(courseId: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (courseId) nextParams.set("courseId", courseId);
    else nextParams.delete("courseId");
    setSearchParams(nextParams);
    setFilter("all");
  }

  const filterEmptyMessage =
    filter === "pending"
      ? "No pending submissions."
      : filter === "graded"
        ? "No graded submissions."
        : "No submissions yet. Check back after students submit their work.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and grade student milestone submissions.
        </p>
      </div>

      {coursesQuery.isPending ? (
        <div
          role="status"
          aria-busy="true"
          aria-label="Loading instructor courses"
          className="h-10 animate-pulse rounded bg-muted"
        />
      ) : coursesQuery.isError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-5"
        >
          <p className="font-medium">Courses could not be loaded</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {getApiErrorMessage(coursesQuery.error)}
          </p>
          <Button
            className="mt-3"
            variant="outline"
            size="sm"
            onClick={() => void coursesQuery.refetch()}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      ) : coursesQuery.data.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10" />}
          message="Create a course before reviewing submissions."
        />
      ) : (
        <>
          <div className="max-w-md space-y-2">
            <label htmlFor="submission-course" className="text-sm font-medium">
              Course
            </label>
            <select
              id="submission-course"
              value={selectedCourseId}
              onChange={(event) => selectCourse(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select a course</option>
              {coursesQuery.data.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {!selectedCourseId ? (
            <EmptyState
              icon={<Inbox className="h-10 w-10" />}
              message="Select a course to load its milestone submissions."
            />
          ) : !selectedCourse ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-5"
            >
              <p className="font-medium">Course not found</p>
              <p className="text-sm text-muted-foreground">
                Choose one of your courses from the list above.
              </p>
            </div>
          ) : submissionsQuery.isPending ? (
            <div
              role="status"
              aria-busy="true"
              aria-label="Loading course submissions"
              className="space-y-3"
            >
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : submissionsQuery.isError ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-5"
            >
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium">Submissions could not be loaded</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {getApiErrorMessage(submissionsQuery.error)}
                  </p>
                  <Button
                    className="mt-3"
                    variant="outline"
                    size="sm"
                    onClick={() => void submissionsQuery.refetch()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Retry
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div
                role="group"
                className="flex flex-wrap gap-2"
                aria-label="Submission filters"
              >
                {(["all", "pending", "graded"] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={filter === value ? "default" : "outline"}
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {value[0].toUpperCase() + value.slice(1)} ({counts[value]})
                  </Button>
                ))}
              </div>

              {filteredSubmissions.length === 0 ? (
                <EmptyState
                  icon={<Inbox className="h-10 w-10" />}
                  message={filterEmptyMessage}
                />
              ) : (
                <Card className="border-border">
                  <ul className="divide-y divide-border">
                    {filteredSubmissions.map((submission) => (
                      <li key={submission.id}>
                        <Link
                          to={reviewUrl(submission)}
                          className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">
                              {submission.milestoneTitle}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {submission.student.name} ·{" "}
                              {submission.moduleTitle}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatSubmittedAt(submission.submittedAt)}
                              {submission.status === "graded" &&
                              submission.score !== undefined
                                ? ` · Score ${submission.score}/100`
                                : ""}
                            </p>
                          </div>
                          <StatusBadge
                            status={submission.status}
                            label={statusLabel(submission.status)}
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          )}
        </>
      )}

      <InstructorContextAssistant
        courseId={selectedCourse?.id}
        courseTitle={selectedCourse?.title}
      />
    </div>
  );
}
