import { Badge } from "../ui/badge";
import type { SubmissionStatus } from "../../lib/submissions-api";
import { cn } from "../../lib/utils";

const statusStyles: Record<
  SubmissionStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-status-draft text-status-draft-foreground",
  },
  submitted: {
    label: "Submitted",
    className: "bg-status-submitted text-status-submitted-foreground",
  },
  graded: {
    label: "Graded",
    className: "bg-status-graded text-status-graded-foreground",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: SubmissionStatus;
  className?: string;
}) {
  const style = statusStyles[status];
  return (
    <Badge
      className={cn(
        "border-transparent font-medium hover:opacity-90",
        style.className,
        className,
      )}
    >
      {style.label}
    </Badge>
  );
}
