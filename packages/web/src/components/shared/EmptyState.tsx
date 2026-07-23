import type { ReactNode } from "react";
import { Button } from "../ui/button";

interface EmptyStateProps {
  icon: ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <div className="mb-3 h-10 w-10 text-muted-foreground">{icon}</div>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {actionLabel && (
        <Button className="mt-4" onClick={onAction} variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

