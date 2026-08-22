import { Course } from "@starter-kit/shared/db/models/Course";
import { Enrollment } from "@starter-kit/shared/db/models/Enrollment";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";
import { Milestone } from "@starter-kit/shared/db/models/Milestone";
import { Module } from "@starter-kit/shared/db/models/Module";
import {
  canAccessCourseContent,
  loadLessonCourse,
  loadMilestoneCourse,
} from "../../src/services/course-content-access.service";

const publishedCourse = {
  id: "course-a",
  instructorId: "instructor-a",
  isPublished: true,
} as Course;
const draftCourse = {
  ...publishedCourse,
  id: "course-draft",
  isPublished: false,
} as Course;

describe("course content access", () => {
  afterEach(() => jest.restoreAllMocks());

  it("allows only the owning instructor, including for drafts", async () => {
    await expect(
      canAccessCourseContent(draftCourse, {
        userId: "instructor-a",
        role: "instructor",
      }),
    ).resolves.toBe(true);
    await expect(
      canAccessCourseContent(draftCourse, {
        userId: "instructor-b",
        role: "instructor",
      }),
    ).resolves.toBe(false);
  });

  it("allows an enrolled student to read a published course", async () => {
    jest
      .spyOn(Enrollment, "findOne")
      .mockResolvedValue({ id: "enrollment-a" } as Enrollment);

    await expect(
      canAccessCourseContent(publishedCourse, {
        userId: "student-a",
        role: "student",
      }),
    ).resolves.toBe(true);
  });

  it("denies non-enrolled students and students on unpublished courses", async () => {
    const findEnrollment = jest
      .spyOn(Enrollment, "findOne")
      .mockResolvedValue(null);
    await expect(
      canAccessCourseContent(publishedCourse, {
        userId: "student-b",
        role: "student",
      }),
    ).resolves.toBe(false);

    await expect(
      canAccessCourseContent(draftCourse, {
        userId: "student-a",
        role: "student",
      }),
    ).resolves.toBe(false);
    expect(findEnrollment).toHaveBeenCalledTimes(1);
  });

  it("never grants write access to a student", async () => {
    const findEnrollment = jest.spyOn(Enrollment, "findOne");
    await expect(
      canAccessCourseContent(
        publishedCourse,
        { userId: "student-a", role: "student" },
        true,
      ),
    ).resolves.toBe(false);
    expect(findEnrollment).not.toHaveBeenCalled();
  });

  it("validates lesson and milestone parent relationships before resolving a course", async () => {
    jest.spyOn(Lesson, "findOne").mockResolvedValue(null);
    jest.spyOn(Milestone, "findOne").mockResolvedValue(null);
    const findModule = jest.spyOn(Module, "findByPk");
    const findCourse = jest.spyOn(Course, "findByPk");

    await expect(loadLessonCourse("lesson-a", "module-b")).resolves.toBeNull();
    await expect(
      loadMilestoneCourse("milestone-a", "module-b"),
    ).resolves.toBeNull();
    expect(Lesson.findOne).toHaveBeenCalledWith({
      where: { id: "lesson-a", moduleId: "module-b" },
    });
    expect(Milestone.findOne).toHaveBeenCalledWith({
      where: { id: "milestone-a", moduleId: "module-b" },
    });
    expect(findModule).not.toHaveBeenCalled();
    expect(findCourse).not.toHaveBeenCalled();
  });
});
