import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  CircleAlert,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CourseContextAssistant } from "../../components/assistant";
import { DeleteConfirmationDialog, LessonEditorDialog, ModuleEditorDialog } from "../../components/content-management/ContentDialogs";
import { QueryListSection } from "../../components/shared/QueryListSection";
import { Button, buttonVariants } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useCourse } from "../../hooks/useCourses";
import { useCreateLesson, useDeleteLesson, useLessons, useModule, useModules, useUpdateLesson, useUpdateModule } from "../../hooks/useModules";
import { getApiErrorMessage } from "../../lib/courses-api";
import { useAuth } from "../../hooks/useAuth";
import type { Lesson } from "../../lib/modules-api";

function ModuleLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading module"
      className="space-y-6 animate-pulse"
    >
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { courseId, moduleId } = useParams<{
    courseId: string;
    moduleId: string;
  }>();
  const courseQuery = useCourse(courseId);
  const moduleQuery = useModule(courseId, moduleId);
  const lessonsQuery = useLessons(moduleId);
  const modulesQuery = useModules(courseId, user?.role === "instructor");
  const [moduleEditorOpen, setModuleEditorOpen] = useState(false);
  const [lessonEditor, setLessonEditor] = useState<Lesson | null | undefined>(undefined);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const updateModuleMutation = useUpdateModule(courseId ?? "", moduleId ?? "");
  const createLessonMutation = useCreateLesson(moduleId ?? "");
  const updateLessonMutation = useUpdateLesson(moduleId ?? "", lessonEditor?.id ?? "");
  const deleteLessonMutation = useDeleteLesson(moduleId ?? "");
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
  const canManage = user?.role === "instructor" && user.id === course.instructorId;
  const closeLessonEditor = () => { setLessonEditor(undefined); createLessonMutation.reset(); updateLessonMutation.reset(); };

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
          <p className="text-sm text-muted-foreground">{course.title}</p>
          <h1 className="mt-1 break-words text-3xl font-bold tracking-tight">
            {module.title}
          </h1>
          </div>
          {canManage && <Button type="button" variant="outline" onClick={() => setModuleEditorOpen(true)}>Edit Module</Button>}
        </div>
      </div>

      <section aria-labelledby="lessons-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-3"><h2 id="lessons-heading" className="text-xl font-semibold">Lessons</h2>{canManage && <Button type="button" onClick={() => setLessonEditor(null)}>+ Add Lesson</Button>}</div>

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
                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                      <Link to={`/courses/${course.id}/modules/${module.id}/lessons/${lesson.id}`} className="flex min-w-0 items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                          {index + 1}
                        </span>
                        <span className="truncate font-medium">
                          {lesson.title}
                        </span>
                        <span className="text-sm text-muted-foreground">Open</span>
                        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                      {canManage && <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setLessonEditor(lesson)}>Edit</Button><Button type="button" variant="destructive" size="sm" onClick={() => setLessonToDelete(lesson)}>Delete</Button></div>}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </QueryListSection>
      </section>

      <CourseContextAssistant courseId={course.id} courseTitle={course.title} />
      <ModuleEditorDialog open={moduleEditorOpen} module={module} isSaving={updateModuleMutation.isPending} error={updateModuleMutation.error} onCancel={() => { setModuleEditorOpen(false); updateModuleMutation.reset(); }} onSave={(values) => updateModuleMutation.mutate(values, { onSuccess: () => setModuleEditorOpen(false) })} />
      <LessonEditorDialog open={lessonEditor !== undefined} lesson={lessonEditor ?? undefined} modules={modulesQuery.data ?? [module]} isSaving={createLessonMutation.isPending || updateLessonMutation.isPending} error={lessonEditor ? updateLessonMutation.error : createLessonMutation.error} onCancel={closeLessonEditor} onSave={(values) => { if (lessonEditor) updateLessonMutation.mutate(values, { onSuccess: (updated) => { closeLessonEditor(); if (updated.moduleId !== module.id) navigate(`/courses/${course.id}/modules/${updated.moduleId}/lessons/${updated.id}`); } }); else createLessonMutation.mutate(values, { onSuccess: closeLessonEditor }); }} />
      <DeleteConfirmationDialog open={Boolean(lessonToDelete)} entityName={lessonToDelete?.title ?? "lesson"} isDeleting={deleteLessonMutation.isPending} error={deleteLessonMutation.error} onCancel={() => { setLessonToDelete(null); deleteLessonMutation.reset(); }} onConfirm={() => { if (lessonToDelete) deleteLessonMutation.mutate(lessonToDelete.id, { onSuccess: () => setLessonToDelete(null) }); }} />
    </div>
  );
}
