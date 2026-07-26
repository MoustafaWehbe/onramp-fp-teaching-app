import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronRight,
  CheckCircle2,
  ExternalLink,
  Github,
  Play,
  Sparkles,
} from "lucide-react";
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
import { StatusBadge } from "../../components/shared/StatusBadge";
import { submissions } from "../../lib/platform-data";

function LinkIcon({ type }: { type: string }) {
  if (type === "GitHub") return <Github className="h-4 w-4" />;
  if (type === "Loom") return <Play className="h-4 w-4" />;
  return <ExternalLink className="h-4 w-4" />;
}

export function ReviewSubmissionPage() {
  const { submissionId } = useParams();
  const submission = submissions.find((item) => item.id === submissionId);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saved, setSaved] = useState(false);
  const parsedScore = Number(score);
  const canSave =
    score.trim() !== "" &&
    Number.isFinite(parsedScore) &&
    parsedScore >= 0 &&
    parsedScore <= 100 &&
    feedback.trim() !== "";

  function suggestFeedback() {
    setSaved(false);
    setFeedback(
      "Great work overall. The implementation meets the core requirements and the deployment is reachable. To strengthen this further, add unit tests around the state logic and document the setup steps in the README. The UI is clean—consider adding loading and empty states for a more polished feel.",
    );
  }

  function saveGrade() {
    if (canSave) {
      setSaved(true);
    }
  }

  if (!submission) {
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
          to="/instructor/submissions"
          className={buttonVariants({ variant: "outline", className: "mt-4" })}
        >
          Back to Submissions
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {submission.studentName} · {submission.studentEmail}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{submission.courseTitle}</span>
            <ChevronRight className="h-3 w-3" />
            <span>{submission.moduleTitle}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-foreground">
              {submission.milestoneTitle}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">
            {submission.milestoneTitle}
          </h1>
        </div>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-secondary p-4 text-sm text-foreground/90">
              {submission.instructions}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Acceptance Criteria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 rounded-md bg-secondary p-4 pl-8 text-sm">
              {submission.acceptanceCriteria.map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Submitted links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {submission.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                >
                  <LinkIcon type={link.type} />
                  <span className="font-medium">{link.type}</span>
                  <span className="max-w-[200px] truncate text-muted-foreground">
                    {link.url}
                  </span>
                </a>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {submission.submittedAt}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-20">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Grade this submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {saved && (
              <p className="flex items-center gap-2 rounded-md bg-status-graded p-3 text-sm text-status-graded-foreground">
                <CheckCircle2 className="h-4 w-4" /> Grade saved in this
                preview.
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
                onChange={(event) => {
                  setScore(event.target.value);
                  setSaved(false);
                }}
                placeholder="0–100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                rows={6}
                value={feedback}
                onChange={(event) => {
                  setFeedback(event.target.value);
                  setSaved(false);
                }}
                placeholder="Write your feedback here..."
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={suggestFeedback}
              className="w-full gap-2"
            >
              <Sparkles className="h-4 w-4" /> Suggest feedback with AI
            </Button>
            <Button
              className="w-full"
              disabled={!canSave}
              onClick={saveGrade}
            >
              Save grade
            </Button>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Current status
              </span>
              <StatusBadge status={saved ? "graded" : submission.status} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
