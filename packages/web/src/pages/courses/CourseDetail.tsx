import { ArrowLeft, CircleAlert, Layers3, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../components/shared/EmptyState";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useCourse } from "../../hooks/useCourses";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../lib/courses-api";

function CourseDetailLoading() {
  return (
    <div aria-label="Loading course" className="space-y-6 animate-pulse">
      <div className="h-8 w-2/3 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-4/5 rounded bg-muted" />
      <div className="h-40 rounded-lg bg-muted" />
    </div>
  );
}

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const courseQuery = useCourse(id);

  if (!id) {
    return (
      <div role="alert" className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Invalid course</h1>
        <p className="text-sm text-muted-foreground">
          This course link is missing an identifier.
        </p>
        <Link to="/courses" className={buttonVariants({ variant: "outline" })}>
          Back to Courses
        </Link>
      </div>
    );
  }

  if (courseQuery.isPending) {
    return <CourseDetailLoading />;
  }

  if (courseQuery.isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
      >
        <CircleAlert className="mb-3 h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold">Course could not be loaded</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {getApiErrorMessage(courseQuery.error)}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/courses"
            className={buttonVariants({ variant: "outline" })}
          >
            Back to Courses
          </Link>
          <Button
            type="button"
            onClick={() => courseQuery.refetch()}
            disabled={courseQuery.isFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {courseQuery.isFetching ? "Retrying..." : "Try Again"}
          </Button>
        </div>
      </div>
    );
  }

  const course = courseQuery.data;
  const canSeeEnrollmentCode =
    user?.role === "instructor" && user.id === course.instructorId;

  return (
    <div className="space-y-8">
      <Link
        to="/courses"
        className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Courses
      </Link>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
          <Badge variant={course.isPublished ? "secondary" : "outline"}>
            {course.isPublished ? "Published" : "Draft"}
          </Badge>
        </div>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          {course.description ||
            "No description has been added to this course."}
        </p>
      </div>

      {canSeeEnrollmentCode && course.enrollmentCode && (
        <Card className="border-primary/20 bg-accent/30">
          <CardHeader>
            <CardTitle className="text-lg">Enrollment code</CardTitle>
            <p className="text-sm text-muted-foreground">
              Share this code only with students who should join your course.
            </p>
          </CardHeader>
          <CardContent>
            <code className="inline-block rounded-md border bg-background px-4 py-2 font-mono text-lg font-semibold tracking-widest">
              {course.enrollmentCode}
            </code>
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="modules-heading" className="space-y-4">
        <h2 id="modules-heading" className="text-xl font-semibold">
          Modules
        </h2>
        <EmptyState
          icon={<Layers3 className="h-10 w-10" />}
          message="No modules yet. Course content will appear here when the instructor adds it."
        />
      </section>
    </div>
  );
}
