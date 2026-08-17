import {
  ArrowLeft,
  ChevronRight,
  CircleAlert,
  Code2,
  ExternalLink,
  Play,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Link, useParams } from "react-router-dom";
import { CourseContextAssistant } from "../../components/assistant";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useCourse } from "../../hooks/useCourses";
import { useLesson, useModule } from "../../hooks/useModules";
import { getApiErrorMessage } from "../../lib/courses-api";
import { cn } from "../../lib/utils";

function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function youtubeEmbedUrl(value: string): string | null {
  const safeUrl = safeHttpUrl(value);
  if (!safeUrl) return null;

  const url = new URL(safeUrl);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else {
      const [kind, id] = url.pathname.split("/").filter(Boolean);
      if (kind === "embed" || kind === "shorts") videoId = id ?? null;
    }
  }

  if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

function markdownHref(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("#")) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return safeHttpUrl(value) ?? undefined;
}

const markdownComponents: Components = {
  h1: ({ className, ...props }) => (
    <h1
      className={cn("mb-4 mt-8 text-2xl font-bold first:mt-0", className)}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn("mb-3 mt-7 text-xl font-semibold first:mt-0", className)}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn("mb-2 mt-6 text-lg font-semibold first:mt-0", className)}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn("my-4 leading-7 first:mt-0 last:mb-0", className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("my-4 list-disc space-y-2 pl-6", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn("my-4 list-decimal space-y-2 pl-6", className)}
      {...props}
    />
  ),
  a: ({ href, className, children, ...props }) => {
    const safeHref = markdownHref(href);
    const external = Boolean(safeHref && /^https?:\/\//i.test(safeHref));

    if (!safeHref) return <span>{children}</span>;

    return (
      <a
        {...props}
        href={safeHref}
        className={cn(
          "font-medium text-primary underline underline-offset-4",
          className,
        )}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "my-5 overflow-x-auto rounded-lg bg-secondary p-4 text-sm [&>code]:bg-transparent [&>code]:p-0",
        className,
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }) => (
    <code
      className={cn(
        "rounded bg-secondary px-1.5 py-0.5 font-mono text-sm",
        className,
      )}
      {...props}
    />
  ),
};

function LessonLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading lesson"
      className="space-y-6 animate-pulse"
    >
      <div className="h-5 w-56 rounded bg-muted" />
      <div className="h-8 w-2/3 rounded bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}

export function LessonDetails() {
  const { courseId, moduleId, lessonId } = useParams<{
    courseId: string;
    moduleId: string;
    lessonId: string;
  }>();
  const courseQuery = useCourse(courseId);
  const moduleQuery = useModule(courseId, moduleId);
  const lessonQuery = useLesson(moduleId, lessonId);
  const backToModule =
    courseId && moduleId
      ? `/courses/${courseId}/modules/${moduleId}`
      : "/courses";

  if (!courseId || !moduleId || !lessonId) {
    return (
      <div role="alert" className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Invalid lesson</h1>
        <p className="text-sm text-muted-foreground">
          This lesson link is missing required identifiers.
        </p>
        <Link to="/courses" className={buttonVariants({ variant: "outline" })}>
          Back to Courses
        </Link>
      </div>
    );
  }

  if (courseQuery.isPending || moduleQuery.isPending || lessonQuery.isPending) {
    return <LessonLoading />;
  }

  const pageError = courseQuery.error ?? moduleQuery.error ?? lessonQuery.error;
  if (pageError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
      >
        <CircleAlert className="mb-3 h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold">Lesson could not be loaded</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {getApiErrorMessage(pageError)}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            to={backToModule}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to Module
          </Link>
          <Button
            type="button"
            onClick={() => {
              void courseQuery.refetch();
              void moduleQuery.refetch();
              void lessonQuery.refetch();
            }}
            disabled={
              courseQuery.isFetching ||
              moduleQuery.isFetching ||
              lessonQuery.isFetching
            }
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!courseQuery.data || !moduleQuery.data || !lessonQuery.data) {
    return (
      <div role="alert" className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Lesson not found</h1>
        <Link
          to={backToModule}
          className={buttonVariants({ variant: "outline" })}
        >
          Back to Module
        </Link>
      </div>
    );
  }

  const course = courseQuery.data;
  const module = moduleQuery.data;
  const lesson = lessonQuery.data;
  const embedUrl = lesson.videoUrl ? youtubeEmbedUrl(lesson.videoUrl) : null;
  const externalVideoUrl = lesson.videoUrl
    ? safeHttpUrl(lesson.videoUrl)
    : null;
  const starterCodeUrl = safeHttpUrl(lesson.starterCodeUrl);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          to={backToModule}
          className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {module.title}
        </Link>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Link to={`/courses/${course.id}`} className="hover:text-primary">
            {course.title}
          </Link>
          <ChevronRight aria-hidden="true" className="h-3 w-3" />
          <Link to={backToModule} className="hover:text-primary">
            {module.title}
          </Link>
          <ChevronRight aria-hidden="true" className="h-3 w-3" />
          <span className="font-medium text-foreground">{lesson.title}</span>
        </div>
        <h1 className="break-words text-3xl font-bold tracking-tight">
          {lesson.title}
        </h1>
      </div>

      {lesson.videoUrl && externalVideoUrl && (
        <Card className="overflow-hidden border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Play aria-hidden="true" className="h-5 w-5" /> Video
            </CardTitle>
          </CardHeader>
          <CardContent>
            {embedUrl ? (
              <div className="aspect-video overflow-hidden rounded-lg bg-black">
                <iframe
                  src={embedUrl}
                  title={`${lesson.title} video`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <a
                href={externalVideoUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                Watch Video
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Lesson content</CardTitle>
        </CardHeader>
        <CardContent>
          {lesson.content.trim() ? (
            <article className="max-w-none text-foreground/90">
              <ReactMarkdown components={markdownComponents}>
                {lesson.content}
              </ReactMarkdown>
            </article>
          ) : (
            <p className="text-sm text-muted-foreground">
              No written content has been added to this lesson yet.
            </p>
          )}
        </CardContent>
      </Card>

      {starterCodeUrl && (
        <Card className="border-primary/20 bg-accent/30">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <Code2 aria-hidden="true" className="h-5 w-5" /> Starter code
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Open the starter project in a new tab and follow the lesson.
              </p>
            </div>
            <a
              href={starterCodeUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants()}
            >
              Open Starter Code
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      )}

      <CourseContextAssistant courseId={course.id} courseTitle={course.title} />
    </div>
  );
}
