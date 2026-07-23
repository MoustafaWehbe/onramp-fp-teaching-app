import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/shared/EmptyState";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { submissions } from "../../lib/platform-data";

export function SubmissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and grade student milestone submissions.
        </p>
      </div>
      {submissions.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10" />}
          message="No submissions yet. Check back after students submit their work."
        />
      ) : (
        <Card className="border-border">
          <ul className="divide-y divide-border">
            {submissions.map((submission) => (
              <li key={submission.id}>
                <Link
                  to={`/instructor/submissions/${submission.id}/review`}
                  className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-accent/40"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {submission.milestoneTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {submission.studentName} · {submission.courseTitle}
                    </p>
                  </div>
                  <StatusBadge status={submission.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

