import { CircleAlert, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { getApiErrorMessage } from "../../lib/courses-api";
import { Button } from "../ui/button";
import { EmptyState } from "./EmptyState";

interface QueryListSectionProps<T> {
  data: readonly T[] | undefined;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  error: unknown;
  loadingLabel: string;
  loadingCount?: number;
  errorTitle: string;
  emptyIcon: ReactNode;
  emptyMessage: string;
  onRetry: () => void;
  children: (items: readonly T[]) => ReactNode;
}

export function QueryListSection<T>({
  data,
  isPending,
  isError,
  isFetching,
  error,
  loadingLabel,
  loadingCount = 3,
  errorTitle,
  emptyIcon,
  emptyMessage,
  onRetry,
  children,
}: QueryListSectionProps<T>) {
  if (isPending) {
    return (
      <div aria-label={loadingLabel} className="space-y-3">
        {Array.from({ length: loadingCount }, (_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/5 p-5"
      >
        <div className="flex items-start gap-3">
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 text-destructive"
          />
          <div>
            <p className="font-medium">{errorTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {getApiErrorMessage(error)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onRetry}
              disabled={isFetching}
            >
              <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
              {isFetching ? "Retrying..." : "Retry"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const items = data ?? [];
  if (items.length === 0) {
    return <EmptyState icon={emptyIcon} message={emptyMessage} />;
  }

  return <>{children(items)}</>;
}
