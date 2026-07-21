import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { findMilestone } from "../../lib/platform-data";

type LinkType = "GitHub" | "Loom" | "Deployment" | "Other";
type LinkRow = { id: string; type: LinkType; url: string };

function detectType(url: string): LinkType {
  const normalized = url.toLowerCase();
  if (normalized.includes("github.com")) return "GitHub";
  if (normalized.includes("loom.com")) return "Loom";
  if (normalized.includes("vercel.app") || normalized.includes("netlify.app")) {
    return "Deployment";
  }
  return "Other";
}

export function SubmitMilestonePage() {
  const { milestoneId = "" } = useParams();
  const found = findMilestone(milestoneId);
  const milestone = found?.milestone ?? { title: "Milestone" };
  const module = found?.module;
  const [submitted, setSubmitted] = useState(false);
  const [rows, setRows] = useState<LinkRow[]>([
    { id: crypto.randomUUID(), type: "GitHub", url: "" },
  ]);

  function update(id: string, patch: Partial<LinkRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function updateUrl(id: string, url: string) {
    update(id, { url, type: url ? detectType(url) : "Other" });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!hasInvalid && rows.some((row) => row.url)) setSubmitted(true);
  }

  const hasInvalid = rows.some(
    (row) => row.url && !row.url.startsWith("https://"),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Submit milestone</p>
        <h1 className="text-2xl font-bold tracking-tight">{milestone.title}</h1>
      </div>
      {submitted && (
        <div className="flex items-center gap-2 rounded-md border border-status-graded bg-status-graded px-4 py-3 text-sm text-status-graded-foreground">
          <CheckCircle2 className="h-4 w-4" />
          Submission links saved in this preview.
        </div>
      )}
      <form onSubmit={submit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Your submission links</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add links to your code, demos, and any artifacts your reviewer
              should see.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.id} className="flex items-start gap-2">
                <select
                  value={row.type}
                  aria-label={`Link ${index + 1} type`}
                  onChange={(event) =>
                    update(row.id, { type: event.target.value as LinkType })
                  }
                  className="h-10 w-36 shrink-0 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option>GitHub</option>
                  <option>Loom</option>
                  <option>Deployment</option>
                  <option>Other</option>
                </select>
                <Input
                  placeholder="https://..."
                  aria-label={`Link ${index + 1} URL`}
                  value={row.url}
                  onChange={(event) => updateUrl(row.id, event.target.value)}
                  className="flex-1"
                />
                {rows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setRows((current) =>
                        current.filter((item) => item.id !== row.id),
                      )
                    }
                    aria-label="Remove link"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              type="button"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  { id: crypto.randomUUID(), type: "Other", url: "" },
                ])
              }
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add another link
            </Button>
            {hasInvalid && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  One or more links do not start with <code>https://</code>.
                </span>
              </div>
            )}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={hasInvalid || !rows.some((row) => row.url)}
              >
                Submit milestone
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Acceptance Criteria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-4 text-sm text-foreground/90">
                <li>Implementation matches the milestone brief</li>
                <li>Code is in a public GitHub repository</li>
                <li>Deployed and reachable via HTTPS</li>
                <li>Includes a short demo video walkthrough</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                This milestone depends on
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {(module?.lessons ?? []).map((lesson) => (
                  <li key={lesson.id} className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{lesson.title}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
