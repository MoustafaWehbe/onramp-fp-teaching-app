import type { NextFunction, Request, Response } from "express";
import { Course } from "@starter-kit/shared/db/models/Course";
import { Enrollment } from "@starter-kit/shared/db/models/Enrollment";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";
import { Milestone } from "@starter-kit/shared/db/models/Milestone";
import { Module } from "@starter-kit/shared/db/models/Module";
import { lessonController } from "../../src/controllers/lesson.controller";
import { milestoneController } from "../../src/controllers/milestone.controller";
import { milestoneLessonController } from "../../src/controllers/milestoneLesson.controller";
import { moduleController } from "../../src/controllers/module.controller";

function responseMock() {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

function user(role: "instructor" | "student", userId: string) {
  return { role, userId };
}

function course(instructorId = "instructor-a", isPublished = true) {
  return {
    id: "course-a",
    instructorId,
    isPublished,
  } as Course;
}

describe("direct course-content read authorization", () => {
  afterEach(() => jest.restoreAllMocks());

  it("denies another instructor a direct module read", async () => {
    jest
      .spyOn(Module, "findOne")
      .mockResolvedValue({ id: "module-a", courseId: "course-a" } as Module);
    jest.spyOn(Course, "findByPk").mockResolvedValue(course());
    const response = responseMock();

    await moduleController.getModule(
      {
        params: { courseId: "course-a", id: "module-a" },
        user: user("instructor", "instructor-b"),
      } as unknown as Request,
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.anything() }),
    );
  });

  it("allows an enrolled student to read a published lesson by its direct ID", async () => {
    const lesson = { id: "lesson-a", moduleId: "module-a" } as Lesson;
    jest.spyOn(Lesson, "findOne").mockResolvedValue(lesson);
    jest
      .spyOn(Module, "findByPk")
      .mockResolvedValue({ id: "module-a", courseId: "course-a" } as Module);
    jest.spyOn(Course, "findByPk").mockResolvedValue(course());
    jest
      .spyOn(Enrollment, "findOne")
      .mockResolvedValue({ id: "enrollment-a" } as Enrollment);
    const response = responseMock();

    await lessonController.getLesson(
      {
        params: { moduleId: "module-a", id: "lesson-a" },
        user: user("student", "student-a"),
      } as unknown as Request,
      response,
      jest.fn(),
    );

    expect(response.json).toHaveBeenCalledWith({ data: lesson });
  });

  it.each([
    ["non-enrolled", true, null],
    ["unpublished", false, { id: "enrollment-a" }],
  ])(
    "denies a student a %s milestone direct read",
    async (_label, published, enrollment) => {
      jest
        .spyOn(Milestone, "findOne")
        .mockResolvedValue({
          id: "milestone-a",
          moduleId: "module-a",
        } as Milestone);
      jest
        .spyOn(Module, "findByPk")
        .mockResolvedValue({ id: "module-a", courseId: "course-a" } as Module);
      jest
        .spyOn(Course, "findByPk")
        .mockResolvedValue(course("instructor-a", published as boolean));
      jest
        .spyOn(Enrollment, "findOne")
        .mockResolvedValue(enrollment as Enrollment | null);
      const response = responseMock();

      await milestoneController.getMilestone(
        {
          params: { moduleId: "module-a", id: "milestone-a" },
          user: user("student", "student-a"),
        } as unknown as Request,
        response,
        jest.fn(),
      );

      expect(response.status).toHaveBeenCalledWith(403);
    },
  );

  it("rejects a mismatched milestone parent without trusting the route module ID", async () => {
    const findCourse = jest.spyOn(Course, "findByPk");
    jest.spyOn(Milestone, "findOne").mockResolvedValue(null);
    const response = responseMock();

    await milestoneController.getMilestone(
      {
        params: { moduleId: "module-b", id: "milestone-a" },
        user: user("instructor", "instructor-a"),
      } as unknown as Request,
      response,
      jest.fn(),
    );

    expect(Milestone.findOne).toHaveBeenCalledWith({
      where: { id: "milestone-a", moduleId: "module-b" },
    });
    expect(response.status).toHaveBeenCalledWith(404);
    expect(findCourse).not.toHaveBeenCalled();
  });

  it("denies another instructor before loading milestone-linked lessons", async () => {
    jest
      .spyOn(Milestone, "findOne")
      .mockResolvedValue({
        id: "milestone-a",
        moduleId: "module-a",
      } as Milestone);
    jest
      .spyOn(Module, "findByPk")
      .mockResolvedValue({ id: "module-a", courseId: "course-a" } as Module);
    jest.spyOn(Course, "findByPk").mockResolvedValue(course());
    const includeQuery = jest.spyOn(Milestone, "findByPk");
    const response = responseMock();

    await milestoneLessonController.getLessons(
      {
        params: { milestoneId: "milestone-a" },
        user: user("instructor", "instructor-b"),
      } as unknown as Request,
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(includeQuery).not.toHaveBeenCalled();
  });
});
