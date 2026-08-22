import type { JwtPayload } from "@starter-kit/shared/auth";
import { Course } from "@starter-kit/shared/db/models/Course";
import { Enrollment } from "@starter-kit/shared/db/models/Enrollment";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";
import { Milestone } from "@starter-kit/shared/db/models/Milestone";
import { Module } from "@starter-kit/shared/db/models/Module";

export type CourseContentPrincipal = Pick<JwtPayload, "userId" | "role">;

export interface ModuleCourseContext {
  module: Module;
  course: Course;
}

export interface LessonCourseContext extends ModuleCourseContext {
  lesson: Lesson;
}

export interface MilestoneCourseContext extends ModuleCourseContext {
  milestone: Milestone;
}

export function ownsCourse(
  course: Pick<Course, "instructorId">,
  principal: CourseContentPrincipal,
): boolean {
  return (
    principal.role === "instructor" && course.instructorId === principal.userId
  );
}

export async function canAccessCourseContent(
  course: Pick<Course, "id" | "instructorId" | "isPublished">,
  principal: CourseContentPrincipal,
  write = false,
): Promise<boolean> {
  if (principal.role === "instructor") return ownsCourse(course, principal);
  if (write || !course.isPublished) return false;

  const enrollment = await Enrollment.findOne({
    where: { courseId: course.id, studentId: principal.userId },
    attributes: ["id"],
  });
  return Boolean(enrollment);
}

export async function loadModuleCourse(
  moduleId: string,
  expectedCourseId?: string,
): Promise<ModuleCourseContext | null> {
  const module = expectedCourseId
    ? await Module.findOne({
        where: { id: moduleId, courseId: expectedCourseId },
      })
    : await Module.findByPk(moduleId);
  if (!module) return null;

  const course = await Course.findByPk(module.courseId);
  if (!course) return null;
  return { module, course };
}

export async function loadLessonCourse(
  lessonId: string,
  expectedModuleId?: string,
): Promise<LessonCourseContext | null> {
  const lesson = await Lesson.findOne({
    where: expectedModuleId
      ? { id: lessonId, moduleId: expectedModuleId }
      : { id: lessonId },
  });
  if (!lesson) return null;

  const context = await loadModuleCourse(lesson.moduleId);
  if (!context) return null;
  return { lesson, ...context };
}

export async function loadMilestoneCourse(
  milestoneId: string,
  expectedModuleId?: string,
): Promise<MilestoneCourseContext | null> {
  const milestone = await Milestone.findOne({
    where: expectedModuleId
      ? { id: milestoneId, moduleId: expectedModuleId }
      : { id: milestoneId },
  });
  if (!milestone) return null;

  const context = await loadModuleCourse(milestone.moduleId);
  if (!context) return null;
  return { milestone, ...context };
}
