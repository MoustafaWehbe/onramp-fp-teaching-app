import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { getApiErrorMessage } from "../../lib/courses-api";
import {
  deleteLessonResource,
  lessonResourceDownloadUrl,
  listLessonResources,
  reindexLessonResource,
  uploadLessonResource,
} from "../../lib/lesson-resources-api";

export const lessonResourceKeys = {
  lesson: (moduleId: string, lessonId: string) =>
    ["learning-content", "lesson-resources", moduleId, lessonId] as const,
};

function fileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function LessonResourcesCard({
  moduleId,
  lessonId,
  canManage,
}: {
  moduleId: string;
  lessonId: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const key = lessonResourceKeys.lesson(moduleId, lessonId);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resources = useQuery({
    queryKey: key,
    queryFn: () => listLessonResources(moduleId, lessonId),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const upload = useMutation({
    mutationFn: () => uploadLessonResource(moduleId, lessonId, file!, title),
    onSuccess: async () => {
      setTitle("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteLessonResource(moduleId, lessonId, id),
    onSuccess: refresh,
  });
  const reindex = useMutation({
    mutationFn: (id: string) => reindexLessonResource(moduleId, lessonId, id),
    onSuccess: refresh,
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (file && !upload.isPending) upload.mutate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Resources</CardTitle>
        <CardDescription>
          PDF readings and reference material for this lesson.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {resources.isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading resources…
          </p>
        )}
        {resources.isError && (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>{getApiErrorMessage(resources.error)}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void resources.refetch()}
            >
              Try again
            </Button>
          </div>
        )}
        {resources.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No PDF resources have been added yet.
          </p>
        )}
        {resources.data && resources.data.length > 0 && (
          <ul className="divide-y rounded-md border">
            {resources.data.map((resource) => (
              <li
                key={resource.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <FileText aria-hidden="true" className="h-4 w-4" />
                    {resource.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fileSize(resource.sizeBytes)}
                    {canManage &&
                      ` · ${resource.indexStatus === "ready" ? "Ready for AI" : resource.indexStatus === "failed" ? "AI indexing failed" : "Preparing for AI"}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
                    href={lessonResourceDownloadUrl(
                      moduleId,
                      lessonId,
                      resource.id,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download aria-hidden="true" className="mr-2 h-4 w-4" />{" "}
                    Open PDF
                  </a>
                  {canManage && resource.indexStatus === "failed" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => reindex.mutate(resource.id)}
                      disabled={reindex.isPending}
                    >
                      <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />{" "}
                      Retry AI Indexing
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm(`Delete ${resource.title}?`))
                          remove.mutate(resource.id);
                      }}
                      disabled={remove.isPending}
                      aria-label={`Delete ${resource.title}`}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {(upload.error || remove.error || reindex.error) && (
          <p role="alert" className="text-sm text-destructive">
            {getApiErrorMessage(upload.error ?? remove.error ?? reindex.error)}
          </p>
        )}
        {canManage && (
          <form
            className="space-y-3 rounded-md border bg-muted/30 p-4"
            onSubmit={submit}
          >
            <div>
              <Label htmlFor="resource-title">Optional title</Label>
              <Input
                id="resource-title"
                value={title}
                maxLength={255}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="resource-file">PDF file (maximum 5 MB)</Label>
              <Input
                id="resource-file"
                type="file"
                accept="application/pdf,.pdf"
                required
                ref={fileInputRef}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="submit" disabled={!file || upload.isPending}>
              {upload.isPending ? (
                <Loader2
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : (
                <Upload aria-hidden="true" className="mr-2 h-4 w-4" />
              )}
              {upload.isPending ? "Uploading…" : "Upload PDF"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
