import { Link } from "react-router-dom";
import { BookOpen, CircleAlert, Plus, RefreshCw } from "lucide-react";
import { InstructorContextAssistant } from "../../components/assistant";
import { EmptyState } from "../../components/shared/EmptyState";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useCourses } from "../../hooks/useCourses";
import { getApiErrorMessage } from "../../lib/courses-api";

function DashboardLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading instructor courses"
      className="grid gap-5 lg:grid-cols-2"
    >
      {[0, 1].map((item) => (
        <Card key={item} className="animate-pulse">
          <CardHeader className="space-y-3">
            <div className="h-5 w-2/3 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-10 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function InstructorDashboard() {
  const coursesQuery = useCourses();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Instructor Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your courses and review student milestone submissions.
          </p>
        </div>
        <Link to="/courses" className={buttonVariants()}>
          <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
          Create Course
        </Link>
      </div>

      <section
        aria-labelledby="instructor-courses-heading"
        className="space-y-4"
      >
        <h2 id="instructor-courses-heading" className="text-lg font-semibold">
          Courses you teach
        </h2>

        {coursesQuery.isPending ? (
          <DashboardLoading />
        ) : coursesQuery.isError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-6"
          >
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 text-destructive" />
              <div className="space-y-3">
                <div>
                  <p className="font-medium">Courses could not be loaded</p>
                  <p className="text-sm text-muted-foreground">
                    {getApiErrorMessage(coursesQuery.error)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void coursesQuery.refetch()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Retry
                </Button>
              </div>
            </div>
          </div>
        ) : coursesQuery.data.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-10 w-10" />}
            message="You have not created a course yet. Create one to start teaching."
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {coursesQuery.data.map((course) => (
              <Card key={course.id} className="border-border">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <Badge
                      variant={course.isPublished ? "default" : "secondary"}
                    >
                      {course.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  {course.description && (
                    <p className="text-sm text-muted-foreground">
                      {course.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    to={`/courses/${course.id}`}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    View Course
                  </Link>
                  <Link
                    to={`/instructor/submissions?courseId=${encodeURIComponent(course.id)}`}
                    className={buttonVariants()}
                  >
                    View Submissions
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <InstructorContextAssistant />
    </div>
  );
}
