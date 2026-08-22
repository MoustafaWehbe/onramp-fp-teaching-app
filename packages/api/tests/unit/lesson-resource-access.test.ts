import type { NextFunction, Request, Response } from "express";
import { Course } from "@starter-kit/shared/db/models/Course";
import { Enrollment } from "@starter-kit/shared/db/models/Enrollment";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";
import { Module } from "@starter-kit/shared/db/models/Module";
import { requireLessonAccess } from "../../src/middleware/lesson-resource-access";

function request(role: "student" | "instructor", userId = `${role}-1`) {
  return {
    params: { moduleId: "module-1", lessonId: "lesson-1" },
    user: { role, userId },
  } as unknown as Request;
}
function response() {
  const result = { status: jest.fn(), json: jest.fn() };
  result.status.mockReturnValue(result);
  return result as unknown as Response;
}
function models(isPublished = true) {
  jest
    .spyOn(Lesson, "findOne")
    .mockResolvedValue({ id: "lesson-1", moduleId: "module-1" } as Lesson);
  jest
    .spyOn(Module, "findByPk")
    .mockResolvedValue({ id: "module-1", courseId: "course-1" } as Module);
  jest
    .spyOn(Course, "findByPk")
    .mockResolvedValue({
      id: "course-1",
      instructorId: "instructor-1",
      isPublished,
    } as Course);
}

describe("strict lesson resource access", () => {
  afterEach(() => jest.restoreAllMocks());

  it("rejects an unauthenticated request before database work", async () => {
    const findLesson = jest.spyOn(Lesson, "findOne");
    const res = response();
    await requireLessonAccess()({ params: {} } as Request, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(findLesson).not.toHaveBeenCalled();
  });

  it("allows an enrolled student to read a published lesson", async () => {
    models(true);
    jest
      .spyOn(Enrollment, "findOne")
      .mockResolvedValue({ id: "enrollment-1" } as Enrollment);
    const req = request("student");
    const next = jest.fn() as NextFunction;
    await requireLessonAccess()(req, response(), next);
    expect(next).toHaveBeenCalledWith();
    expect(req.lessonAccess?.course.id).toBe("course-1");
  });

  it.each([
    ["unenrolled", true, null],
    ["unpublished", false, { id: "enrollment-1" }],
  ])(
    "rejects a student when the course is %s",
    async (_label, published, enrollment) => {
      models(published as boolean);
      jest
        .spyOn(Enrollment, "findOne")
        .mockResolvedValue(enrollment as Enrollment | null);
      const res = response();
      const next = jest.fn();
      await requireLessonAccess()(request("student"), res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    },
  );

  it("allows the owner to read and write a draft lesson", async () => {
    models(false);
    const req = request("instructor");
    const next = jest.fn();
    await requireLessonAccess(true)(req, response(), next);
    expect(next).toHaveBeenCalledWith();
    expect(req.lessonAccess?.canWrite).toBe(true);
  });

  it("denies students and other instructors from write operations", async () => {
    models(true);
    const studentResponse = response();
    await requireLessonAccess(true)(
      request("student"),
      studentResponse,
      jest.fn(),
    );
    expect(studentResponse.status).toHaveBeenCalledWith(403);

    const instructorResponse = response();
    await requireLessonAccess(true)(
      request("instructor", "instructor-2"),
      instructorResponse,
      jest.fn(),
    );
    expect(instructorResponse.status).toHaveBeenCalledWith(403);
  });

  it("returns not found for a mismatched module and lesson", async () => {
    jest.spyOn(Lesson, "findOne").mockResolvedValue(null);
    const res = response();
    await requireLessonAccess()(request("student"), res, jest.fn());
    expect(Lesson.findOne).toHaveBeenCalledWith({
      where: { id: "lesson-1", moduleId: "module-1" },
    });
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
