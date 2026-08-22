import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { getApiErrorMessage } from "../../lib/courses-api";
import { generateLessonSummary } from "../../lib/lesson-resources-api";

export function LessonSummaryCard({
  moduleId,
  lessonId,
}: {
  moduleId: string;
  lessonId: string;
}) {
  const summary = useMutation({
    mutationFn: () => generateLessonSummary(moduleId, lessonId),
  });
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles aria-hidden="true" className="h-5 w-5 text-primary" /> AI
          Study Summary
        </CardTitle>
        <CardDescription>
          Generate a study summary from this lesson and its uploaded resources.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.isError && (
          <p role="alert" className="text-sm text-destructive">
            {getApiErrorMessage(summary.error)}
          </p>
        )}
        {summary.data && (
          <article className="prose prose-sm max-w-none rounded-md border bg-muted/20 p-4 dark:prose-invert">
            <ReactMarkdown>{summary.data.summary}</ReactMarkdown>
          </article>
        )}
        <Button
          type="button"
          onClick={() => summary.mutate()}
          disabled={summary.isPending}
        >
          {summary.isPending && (
            <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
          )}
          {summary.isPending
            ? "Generating…"
            : summary.data
              ? "Regenerate Summary"
              : "Generate Summary"}
        </Button>
      </CardContent>
    </Card>
  );
}
