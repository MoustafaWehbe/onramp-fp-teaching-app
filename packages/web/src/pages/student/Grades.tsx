import {
  CircleAlert,
  ExternalLink,
  GraduationCap,
  RefreshCw,
} from "lucide-react";
import { EmptyState } from "../../components/shared/EmptyState";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useMyGrades } from "../../hooks/useSubmissions";
import { getApiErrorMessage } from "../../lib/courses-api";
import {
  getSafeHttpUrl,
  type SubmissionLink,
  type SubmissionLinkType,
} from "../../lib/submissions-api";

function formatDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function linkTypeLabel(type: SubmissionLinkType) {
  if (type === "github") return "GitHub";
  if (type === "loom") return "Loom";
  if (type === "deployment") return "Deployment";
  return "Other";
}

function GradeLink({ link }: { link: SubmissionLink }) {
  const href = getSafeHttpUrl(link.url);
  const content = (
    <>
      <span className="font-medium">{linkTypeLabel(link.type)}</span>
      <span className="max-w-[55vw] truncate text-muted-foreground sm:max-w-[240px]">
        {link.url}
      </span>
    </>
  );
  const className =
    "inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs";

  if (!href) return <span className={className}>{content}</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${className} transition-colors hover:bg-accent`}
    >
      {content}
      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
    </a>
  );
}

function GradesLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading grades"
      className="space-y-4"
    >
      {[0, 1].map((item) => (
        <div key={item} className="h-48 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

export function GradesPage() {
  const gradesQuery = useMyGrades();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Grades</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scores and feedback from your graded milestones.
        </p>
      </div>

      {gradesQuery.isPending ? (
        <GradesLoading />
      ) : gradesQuery.isError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-6"
        >
          <div className="flex items-start gap-3">
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 text-destructive"
            />
            <div>
              <p className="font-medium">Unable to load grades.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {getApiErrorMessage(gradesQuery.error)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void gradesQuery.refetch()}
              >
                <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      ) : gradesQuery.data.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-10 w-10" />}
          message="No grades yet. Once your instructor reviews a submission, it will appear here."
        />
      ) : (
        <div className="space-y-4">
          {gradesQuery.data.map((grade) => {
            const submittedAt = formatDate(grade.submittedAt);
            const gradedAt = formatDate(grade.gradedAt);
            const module = grade.milestone?.module;
            const course = module?.course;

            return (
              <Card key={grade.id} className="border-border">
                <CardHeader className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      {(course || module) && (
                        <p className="text-xs text-muted-foreground">
                          {[course?.title, module?.title]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      <CardTitle className="mt-1 text-lg">
                        {grade.milestone?.title ?? "Graded milestone"}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-semibold">
                        {grade.score === undefined
                          ? "Score unavailable"
                          : `${grade.score}/100`}
                      </p>
                      <StatusBadge status={grade.status} />
                    </div>
                  </div>
                  {(submittedAt || gradedAt) && (
                    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      {submittedAt && (
                        <div className="flex gap-1">
                          <dt>Submitted:</dt>
                          <dd>{submittedAt}</dd>
                        </div>
                      )}
                      {gradedAt && (
                        <div className="flex gap-1">
                          <dt>Graded:</dt>
                          <dd>{gradedAt}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h2 className="text-sm font-medium">Instructor feedback</h2>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {grade.feedback?.trim() || "No feedback was provided."}
                    </p>
                  </div>
                  {grade.links.length > 0 && (
                    <div>
                      <h2 className="text-sm font-medium">Submitted links</h2>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {grade.links.map((link) => (
                          <GradeLink key={link.id ?? link.url} link={link} />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
