import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useCreateSubmission } from "../../hooks/useSubmissions";
import { getApiErrorMessage } from "../../lib/courses-api";
import {
  validateSubmissionUrl,
  type SubmissionLinkType,
} from "../../lib/submissions-api";

const MAX_LINKS = 10;
const LINK_TYPES: Array<{ value: SubmissionLinkType; label: string }> = [
  { value: "github", label: "GitHub" },
  { value: "loom", label: "Loom" },
  { value: "deployment", label: "Deployment" },
  { value: "other", label: "Other" },
];

interface LinkRow {
  id: string;
  type: SubmissionLinkType;
  url: string;
}

function newLink(type: SubmissionLinkType = "other"): LinkRow {
  return { id: crypto.randomUUID(), type, url: "" };
}

export function SubmitMilestonePage() {
  const { milestoneId = "" } = useParams();
  const createMutation = useCreateSubmission();
  const [showValidation, setShowValidation] = useState(false);
  const [rows, setRows] = useState<LinkRow[]>([newLink("github")]);

  const completedRows = rows.filter((row) => row.url.trim() !== "");
  const rowErrors = new Map(
    completedRows.flatMap((row) => {
      const error = validateSubmissionUrl(row.type, row.url);
      return error ? [[row.id, error] as const] : [];
    }),
  );
  const noLinksError = showValidation && completedRows.length === 0;

  function updateRow(id: string, patch: Partial<LinkRow>) {
    createMutation.reset();
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function removeRow(id: string) {
    createMutation.reset();
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowValidation(true);

    if (!milestoneId || completedRows.length === 0 || rowErrors.size > 0) {
      return;
    }

    try {
      await createMutation.mutateAsync({
        milestoneId,
        links: completedRows.map((row) => ({
          type: row.type,
          url: row.url.trim(),
        })),
      });
    } catch {
      // The mutation error is rendered beside the form.
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Student submission</p>
        <h1 className="text-2xl font-bold tracking-tight">Submit milestone</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the links your instructor needs to review your work.
        </p>
      </div>

      {!milestoneId && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          A milestone is required before work can be submitted.
        </div>
      )}

      {createMutation.isSuccess && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-status-graded bg-status-graded px-4 py-3 text-sm text-status-graded-foreground"
        >
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          Submission received successfully.
        </div>
      )}

      <form onSubmit={submit} noValidate>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Your submission links</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add GitHub code, Loom demos, deployments, or other supporting
              artifacts. Empty rows are ignored.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.map((row, index) => {
              const error = showValidation ? rowErrors.get(row.id) : undefined;
              const errorId = `submission-link-${row.id}-error`;

              return (
                <div key={row.id} className="space-y-1.5">
                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
                    <select
                      value={row.type}
                      aria-label={`Link ${index + 1} type`}
                      disabled={createMutation.isPending}
                      onChange={(event) =>
                        updateRow(row.id, {
                          type: event.target.value as SubmissionLinkType,
                        })
                      }
                      className="h-10 w-full shrink-0 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:w-40"
                    >
                      {LINK_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="https://..."
                      aria-label={`Link ${index + 1} URL`}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? errorId : undefined}
                      value={row.url}
                      disabled={createMutation.isPending}
                      onChange={(event) =>
                        updateRow(row.id, { url: event.target.value })
                      }
                      className="flex-1"
                    />
                    {rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={createMutation.isPending}
                        onClick={() => removeRow(row.id)}
                        aria-label={`Remove link ${index + 1}`}
                      >
                        <Trash2
                          aria-hidden="true"
                          className="h-4 w-4 text-muted-foreground"
                        />
                      </Button>
                    )}
                  </div>
                  {error && (
                    <p id={errorId} className="text-xs text-destructive">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                type="button"
                disabled={rows.length >= MAX_LINKS || createMutation.isPending}
                onClick={() => {
                  createMutation.reset();
                  setRows((current) => [...current, newLink()]);
                }}
                className="gap-2"
              >
                <Plus aria-hidden="true" className="h-4 w-4" /> Add another link
              </Button>
              <span className="text-xs text-muted-foreground">
                {rows.length} of {MAX_LINKS} links
              </span>
            </div>

            {noLinksError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span>At least one link is required.</span>
              </div>
            )}

            {createMutation.isError && (
              <div
                role="alert"
                className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {getApiErrorMessage(
                  createMutation.error,
                  "Unable to submit. Please try again.",
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={!milestoneId || createMutation.isPending}
            >
              {createMutation.isPending ? "Submitting..." : "Submit milestone"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
