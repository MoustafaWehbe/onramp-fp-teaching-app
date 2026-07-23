import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, CircleAlert, Plus, RefreshCw, UserPlus } from "lucide-react";
import { EmptyState } from "../../components/shared/EmptyState";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  useCourses,
  useCreateCourse,
  useEnrollInCourse,
} from "../../hooks/useCourses";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../lib/courses-api";

function CoursesLoading() {
  return (
    <div
      aria-label="Loading courses"
      className="grid grid-cols-1 gap-5 lg:grid-cols-2"
    >
      {[0, 1, 2, 3].map((item) => (
        <Card key={item} className="animate-pulse border-border">
          <CardHeader>
            <div className="h-5 w-2/3 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-10 w-full rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const coursesQuery = useCourses();
  const createCourse = useCreateCourse();
  const enroll = useEnrollInCourse();
  const isInstructor = user?.role === "instructor";
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [enrollmentSuccess, setEnrollmentSuccess] = useState("");
  const [createValidationError, setCreateValidationError] = useState("");
  const [enrollmentValidationError, setEnrollmentValidationError] =
    useState("");

  async function handleCreateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createCourse.reset();
    setCreateValidationError("");

    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setCreateValidationError("Enter a course title.");
      return;
    }

    try {
      const course = await createCourse.mutateAsync({
        title: normalizedTitle,
        description: description.trim() || undefined,
      });

      setTitle("");
      setDescription("");
      setShowCreateForm(false);
      navigate(`/courses/${course.id}`);
    } catch {
      // React Query exposes the API error below the form.
    }
  }

  async function handleEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    enroll.reset();
    setEnrollmentSuccess("");
    setEnrollmentValidationError("");

    const normalizedCode = enrollmentCode.trim().toUpperCase();
    if (!normalizedCode) {
      setEnrollmentValidationError("Enter an enrollment code.");
      return;
    }

    try {
      await enroll.mutateAsync({ enrollmentCode: normalizedCode });
      setEnrollmentCode("");
      setEnrollmentSuccess("You joined the course successfully.");
    } catch {
      // React Query exposes the API error below the form.
    }
  }

  function toggleCreateForm() {
    createCourse.reset();
    setCreateValidationError("");
    setTitle("");
    setDescription("");
    setShowCreateForm((current) => !current);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isInstructor
              ? "Create and manage the courses you teach."
              : "Open an enrolled course or join one with an enrollment code."}
          </p>
        </div>
        {isInstructor && (
          <Button type="button" onClick={toggleCreateForm}>
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Button>
        )}
      </div>

      {isInstructor && showCreateForm && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Create a course</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add the course basics now. Modules and lessons can be added later.
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={handleCreateCourse}
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="course-title">Title</Label>
                <Input
                  id="course-title"
                  name="title"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setCreateValidationError("");
                  }}
                  placeholder="Full Stack Bootcamp"
                  required
                  aria-invalid={Boolean(
                    createValidationError || createCourse.isError,
                  )}
                  aria-describedby={
                    createValidationError || createCourse.isError
                      ? "create-course-error"
                      : undefined
                  }
                  disabled={createCourse.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-description">Description</Label>
                <Textarea
                  id="course-description"
                  name="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What will students learn?"
                  disabled={createCourse.isPending}
                />
              </div>
              {(createValidationError || createCourse.isError) && (
                <p
                  id="create-course-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {createValidationError ||
                    getApiErrorMessage(
                      createCourse.error,
                      "The course could not be created.",
                    )}
                </p>
              )}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleCreateForm}
                  disabled={createCourse.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createCourse.isPending}>
                  {createCourse.isPending ? "Creating..." : "Create Course"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!isInstructor && (
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-accent p-2 text-primary">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Join a course</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter the code your instructor shared with you.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={handleEnrollment}
              noValidate
            >
              <div className="w-full space-y-2">
                <Label htmlFor="enrollment-code">Enrollment code</Label>
                <Input
                  id="enrollment-code"
                  name="enrollmentCode"
                  value={enrollmentCode}
                  onChange={(event) => {
                    setEnrollmentCode(event.target.value);
                    setEnrollmentValidationError("");
                  }}
                  placeholder="ABC123"
                  autoComplete="off"
                  required
                  aria-invalid={Boolean(
                    enrollmentValidationError || enroll.isError,
                  )}
                  aria-describedby={
                    enrollmentValidationError || enroll.isError
                      ? "enrollment-error"
                      : undefined
                  }
                  disabled={enroll.isPending}
                />
              </div>
              <Button type="submit" disabled={enroll.isPending}>
                {enroll.isPending ? "Joining..." : "Join Course"}
              </Button>
            </form>
            {(enrollmentValidationError || enroll.isError) && (
              <p
                id="enrollment-error"
                role="alert"
                className="mt-3 text-sm text-destructive"
              >
                {enrollmentValidationError ||
                  getApiErrorMessage(
                    enroll.error,
                    "The course could not be joined.",
                  )}
              </p>
            )}
            {enrollmentSuccess && (
              <p
                role="status"
                className="mt-3 text-sm font-medium text-emerald-700"
              >
                {enrollmentSuccess}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="course-list-heading" className="space-y-4">
        <h2 id="course-list-heading" className="text-lg font-semibold">
          {isInstructor ? "Courses you teach" : "Courses you are enrolled in"}
        </h2>

        {coursesQuery.isPending ? (
          <CoursesLoading />
        ) : coursesQuery.isError ? (
          <div
            role="alert"
            className="flex flex-col items-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center"
          >
            <CircleAlert className="mb-3 h-9 w-9 text-destructive" />
            <h3 className="font-semibold">Courses could not be loaded</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {getApiErrorMessage(coursesQuery.error)}
            </p>
            <Button
              className="mt-4"
              type="button"
              variant="outline"
              onClick={() => coursesQuery.refetch()}
              disabled={coursesQuery.isFetching}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {coursesQuery.isFetching ? "Retrying..." : "Try Again"}
            </Button>
          </div>
        ) : coursesQuery.data.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-10 w-10" />}
            message={
              isInstructor
                ? "You have not created a course yet. Create one to get started."
                : "You are not enrolled in a course yet. Use an enrollment code to join one."
            }
            actionLabel={isInstructor ? "Create Course" : undefined}
            onAction={isInstructor ? toggleCreateForm : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {coursesQuery.data.map((course) => (
              <Card
                key={course.id}
                className="flex flex-col border-border transition-shadow hover:shadow-md"
              >
                <CardHeader className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg leading-snug">
                      {course.title}
                    </CardTitle>
                    <Badge
                      variant={course.isPublished ? "secondary" : "outline"}
                    >
                      {course.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {course.description || "No description provided."}
                  </p>
                </CardHeader>
                <CardContent>
                  <Link
                    to={`/courses/${course.id}`}
                    aria-label={`View ${course.title}`}
                    className={buttonVariants({ className: "w-full" })}
                  >
                    View Course
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
