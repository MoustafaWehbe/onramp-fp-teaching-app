import { GraduationCap } from "lucide-react";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/shared/EmptyState";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { recentActivity } from "../../lib/platform-data";

export function GradesPage() {
  const graded = recentActivity.filter((activity) => activity.status === "graded");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Grades</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scores and feedback from your graded milestones.
        </p>
      </div>
      {graded.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-10 w-10" />}
          message="No grades yet. Once your instructor reviews a submission, it will appear here."
        />
      ) : (
        <Card className="border-border">
          <ul className="divide-y divide-border">
            {graded.map((grade) => (
              <li
                key={grade.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <p className="text-sm font-medium">{grade.milestoneTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {grade.when} · Score {grade.score}/100
                  </p>
                </div>
                <StatusBadge status={grade.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

