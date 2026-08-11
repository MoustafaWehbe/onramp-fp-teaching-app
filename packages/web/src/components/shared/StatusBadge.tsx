import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

export type Status = "draft" | "submitted" | "graded";

const statusStyles: Record<Status, { label: string; className: string }> = {
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
  label,
}: {
  status: Status;
  className?: string;
  label?: string;
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
      {label ?? style.label}
    </Badge>
  );
}
