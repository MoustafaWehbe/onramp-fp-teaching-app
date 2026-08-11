import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  CircleAlert,
  RefreshCw,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { QueryListSection } from "../../components/shared/QueryListSection";
import { Button, buttonVariants } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useCourse } from "../../hooks/useCourses";
import { useLessons, useModule } from "../../hooks/useModules";
import { getApiErrorMessage } from "../../lib/courses-api";

function ModuleLoading() {
  return (
    <div aria-label="Loading module" className="space-y-6 animate-pulse">
      <div className="h-5 w-48 rounded bg-muted" />
      <div className="h-8 w-2/3 rounded bg-muted" />
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-20 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

export function ModuleDetails() {
  const { courseId, moduleId } = useParams<{
    courseId: string;
    moduleId: string;
  }>();
  const courseQuery = useCourse(courseId);
  const moduleQuery = useModule(courseId, moduleId);
  const lessonsQuery = useLessons(moduleId);
  const backToCourse = courseId ? `/courses/${courseId}` : "/courses";

  if (!courseId || !moduleId) {
    return (
      <div role="alert" className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Invalid module</h1>
        <p className="text-sm text-muted-foreground">
          This module link is missing required identifiers.
        </p>
        <Link to="/courses" className={buttonVariants({ variant: "outline" })}>
          Back to Courses
        </Link>
      </div>
    );
  }

  if (courseQuery.isPending || moduleQuery.isPending) {
    return <ModuleLoading />;
  }

  const pageError = courseQuery.error ?? moduleQuery.error;
  if (pageError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
      >
        <CircleAlert className="mb-3 h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold">Module could not be loaded</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {getApiErrorMessage(pageError)}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            to={backToCourse}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to Course
          </Link>
          <Button
            type="button"
            onClick={() => {
              void courseQuery.refetch();
              void moduleQuery.refetch();
            }}
            disabled={courseQuery.isFetching || moduleQuery.isFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!courseQuery.data || !moduleQuery.data) {
    return (
      <div role="alert" className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Module not found</h1>
        <Link
          to={backToCourse}
          className={buttonVariants({ variant: "outline" })}
        >
          Back to Course
        </Link>
      </div>
    );
  }

  const course = courseQuery.data;
  const module = moduleQuery.data;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          to={backToCourse}
          className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {course.title}
        </Link>
        <div>
          <p className="text-sm text-muted-foreground">{course.title}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {module.title}
          </h1>
        </div>
      </div>

      <section aria-labelledby="lessons-heading" className="space-y-4">
        <h2 id="lessons-heading" className="text-xl font-semibold">
          Lessons
        </h2>

        <QueryListSection
          data={lessonsQuery.data}
          isPending={lessonsQuery.isPending}
          isError={lessonsQuery.isError}
          isFetching={lessonsQuery.isFetching}
          error={lessonsQuery.error}
          loadingLabel="Loading module lessons"
          errorTitle="Lessons could not be loaded"
          emptyIcon={<BookOpen className="h-10 w-10" />}
          emptyMessage="No lessons yet. Learning content will appear here when it is added."
          onRetry={() => void lessonsQuery.refetch()}
        >
          {(lessons) => (
            <Card className="border-border">
              <ol className="divide-y divide-border">
                {lessons.map((lesson, index) => (
                  <li key={lesson.id}>
                    <Link
                      to={`/courses/${course.id}/modules/${module.id}/lessons/${lesson.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                          {index + 1}
                        </span>
                        <span className="truncate font-medium">
                          {lesson.title}
                        </span>
                      </div>
                      <ChevronRight
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                      />
                    </Link>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </QueryListSection>
      </section>
    </div>
  );
}
