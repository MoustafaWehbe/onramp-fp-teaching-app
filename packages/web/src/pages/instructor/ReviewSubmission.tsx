import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Github,
  Play,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useCourse } from "../../hooks/useCourses";
import {
  useGradeSubmission,
  useMilestoneSubmissions,
  useMilestones,
  useModules,
} from "../../hooks/useInstructor";
import { getApiErrorMessage } from "../../lib/courses-api";
import type {
  SubmissionLink,
  SubmissionLinkType,
} from "../../lib/instructor-api";

function LinkIcon({ type }: { type: SubmissionLinkType }) {
  if (type === "github")
    return <Github aria-hidden="true" className="h-4 w-4" />;
  if (type === "loom") return <Play aria-hidden="true" className="h-4 w-4" />;
  return <ExternalLink aria-hidden="true" className="h-4 w-4" />;
}

function linkTypeLabel(type: SubmissionLinkType) {
  if (type === "github") return "GitHub";
  if (type === "loom") return "Loom";
  if (type === "deployment") return "Deployment";
  return "Other";
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function SubmittedLink({ link }: { link: SubmissionLink }) {
  const href = safeHttpUrl(link.url);
  const content = (
    <>
      <LinkIcon type={link.type} />
      <span className="font-medium">{linkTypeLabel(link.type)}</span>
      <span className="max-w-[50vw] truncate text-muted-foreground sm:max-w-[200px]">
        {link.url}
      </span>
    </>
  );
  const className =
    "inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm";

  if (!href) {
    return <span className={className}>{content}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${className} transition-colors hover:bg-accent`}
    >
      {content}
    </a>
  );
}

function SubmissionNotFound({ backTo }: { backTo: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-dashed border-border px-6 py-12 text-center"
    >
      <h1 className="text-xl font-semibold">Submission not found</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        This submission may have been removed, or the review link is invalid.
      </p>
      <Link
        to={backTo}
        className={buttonVariants({ variant: "outline", className: "mt-4" })}
      >
        Back to Submissions
      </Link>
    </div>
  );
}

export function ReviewSubmissionPage() {
  const { submissionId } = useParams();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId") ?? undefined;
  const moduleId = searchParams.get("moduleId") ?? undefined;
  const milestoneId = searchParams.get("milestoneId") ?? undefined;
  const backTo = courseId
    ? `/instructor/submissions?courseId=${encodeURIComponent(courseId)}`
    : "/instructor/submissions";

  const courseQuery = useCourse(courseId);
  const modulesQuery = useModules(courseId);
  const milestonesQuery = useMilestones(moduleId);
  const submissionsQuery = useMilestoneSubmissions(milestoneId);
  const gradeMutation = useGradeSubmission();
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");

  const module = modulesQuery.data?.find((item) => item.id === moduleId);
  const milestone = milestonesQuery.data?.find(
    (item) => item.id === milestoneId,
  );
  const submission = submissionsQuery.data?.find(
    (item) => item.id === submissionId,
  );

  useEffect(() => {
    if (!submission) return;
    setScore(submission.score === undefined ? "" : String(submission.score));
    setFeedback(submission.feedback ?? "");
  }, [submission]);

  const parsedScore = Number(score);
  const scoreIsValid =
    score.trim() !== "" &&
    Number.isFinite(parsedScore) &&
    parsedScore >= 0 &&
    parsedScore <= 100;
  const feedbackIsValid = feedback.trim() !== "";
  const canSave = scoreIsValid && feedbackIsValid && !gradeMutation.isPending;

  async function saveGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || !submission || !courseId || !milestoneId) return;

    try {
      await gradeMutation.mutateAsync({
        submissionId: submission.id,
        courseId,
        milestoneId,
        score: parsedScore,
        feedback: feedback.trim(),
      });
    } catch {
      // The mutation error is rendered beside the form.
    }
  }

  const contextMissing =
    !submissionId || !courseId || !moduleId || !milestoneId;
  if (contextMissing) return <SubmissionNotFound backTo={backTo} />;

  const isLoading =
    courseQuery.isPending ||
    modulesQuery.isPending ||
    milestonesQuery.isPending ||
    submissionsQuery.isPending;
  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading submission review"
        className="space-y-4"
      >
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const queryError =
    courseQuery.error ??
    modulesQuery.error ??
    milestonesQuery.error ??
    submissionsQuery.error;
  const hasCachedData = Boolean(
    courseQuery.data &&
    modulesQuery.data &&
    milestonesQuery.data &&
    submissionsQuery.data,
  );
  if (queryError && !hasCachedData) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/5 p-6"
      >
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 h-5 w-5 text-destructive" />
          <div>
            <h1 className="font-semibold">Submission could not be loaded</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {getApiErrorMessage(queryError)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                void courseQuery.refetch();
                void modulesQuery.refetch();
                void milestonesQuery.refetch();
                void submissionsQuery.refetch();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!courseQuery.data || !module || !milestone || !submission) {
    return <SubmissionNotFound backTo={backTo} />;
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <Link
            to={backTo}
            className="text-sm font-medium text-primary hover:underline"
          >
            Back to submissions
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            {submission.student.name}
            {submission.student.email ? ` · ${submission.student.email}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{courseQuery.data.title}</span>
            <ChevronRight aria-hidden="true" className="h-3 w-3" />
            <span>{module.title}</span>
            <ChevronRight aria-hidden="true" className="h-3 w-3" />
            <span className="font-medium text-foreground">
              {milestone.title}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">
            {milestone.title}
          </h1>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap rounded-md bg-secondary p-4 text-sm text-foreground/90">
              {milestone.instructions}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Acceptance Criteria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap rounded-md bg-secondary p-4 text-sm">
              {milestone.acceptanceCriteria}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Submitted links
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submission.links.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No submitted links were returned.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {submission.links.map((link) => (
                  <SubmittedLink key={link.id ?? link.url} link={link} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-20">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Grade this submission</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveGrade} noValidate>
              {gradeMutation.isSuccess && (
                <p
                  role="status"
                  className="flex items-center gap-2 rounded-md bg-status-graded p-3 text-sm text-status-graded-foreground"
                >
                  <CheckCircle2 className="h-4 w-4" /> Grade saved successfully.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="score">Score (out of 100)</Label>
                <Input
                  id="score"
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  disabled={gradeMutation.isPending}
                  aria-invalid={score.trim() !== "" && !scoreIsValid}
                  aria-describedby={
                    score.trim() !== "" && !scoreIsValid
                      ? "score-error"
                      : undefined
                  }
                  onChange={(event) => {
                    setScore(event.target.value);
                    gradeMutation.reset();
                  }}
                  placeholder="0–100"
                />
                {score.trim() !== "" && !scoreIsValid && (
                  <p id="score-error" className="text-xs text-destructive">
                    Enter a score between 0 and 100.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  rows={6}
                  value={feedback}
                  disabled={gradeMutation.isPending}
                  aria-invalid={feedback.length > 0 && !feedbackIsValid}
                  aria-describedby={
                    feedback.length > 0 && !feedbackIsValid
                      ? "feedback-error"
                      : undefined
                  }
                  onChange={(event) => {
                    setFeedback(event.target.value);
                    gradeMutation.reset();
                  }}
                  placeholder="Write your feedback here..."
                />
                {feedback.length > 0 && !feedbackIsValid && (
                  <p id="feedback-error" className="text-xs text-destructive">
                    Feedback is required.
                  </p>
                )}
              </div>
              {gradeMutation.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {getApiErrorMessage(
                    gradeMutation.error,
                    "The grade could not be saved.",
                  )}
                </p>
              )}
              <Button className="w-full" type="submit" disabled={!canSave}>
                {gradeMutation.isPending ? "Saving grade..." : "Save grade"}
              </Button>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  Current status
                </span>
                <StatusBadge
                  status={submission.status}
                  label={
                    submission.status === "submitted" ? "Pending" : undefined
                  }
                />
              </div>
              {submission.status === "graded" &&
                submission.score !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    Saved score:{" "}
                    <span className="font-semibold text-foreground">
                      {submission.score}/100
                    </span>
                  </p>
                )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
