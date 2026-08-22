import type { Request, Response } from "express";
import { Course } from "@starter-kit/shared/db/models/Course";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";
import { Milestone } from "@starter-kit/shared/db/models/Milestone";
import { MilestoneLesson } from "@starter-kit/shared/db/models/MilestoneLesson";
import { Module } from "@starter-kit/shared/db/models/Module";
import { milestoneController } from "../../src/controllers/milestone.controller";
import { milestoneLessonController } from "../../src/controllers/milestoneLesson.controller";

function responseMock() {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

function instructorRequest(params: Record<string, string>, body = {}) {
  return {
    params,
    body,
    user: { role: "instructor", userId: "instructor-a" },
  } as unknown as Request;
}

function mockModuleCourse(
  moduleId: string,
  courseId: string,
  instructorId: string,
) {
  jest.spyOn(Module, "findByPk").mockResolvedValue({
    id: moduleId,
    courseId,
  } as Module);
  jest.spyOn(Course, "findByPk").mockResolvedValue({
    id: courseId,
    instructorId,
    isPublished: false,
  } as Course);
}

describe("milestone ownership and course boundaries", () => {
  afterEach(() => jest.restoreAllMocks());

  it("denies milestone creation in another instructor's course", async () => {
    mockModuleCourse("module-b", "course-b", "instructor-b");
    const create = jest.spyOn(Milestone, "create");
    const response = responseMock();

    await milestoneController.createMilestone(
      instructorRequest(
        { moduleId: "module-b" },
        { title: "Blocked milestone" },
      ),
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(create).not.toHaveBeenCalled();
  });

  it.each(["update", "delete"])(
    "denies milestone %s in another instructor's course",
    async (operation) => {
      const update = jest.fn();
      const destroy = jest.fn();
      jest.spyOn(Milestone, "findOne").mockResolvedValue({
        id: "milestone-b",
        moduleId: "module-b",
        update,
        destroy,
      } as unknown as Milestone);
      mockModuleCourse("module-b", "course-b", "instructor-b");
      const response = responseMock();
      const request = instructorRequest(
        { moduleId: "module-b", id: "milestone-b" },
        { title: "Blocked" },
      );

      if (operation === "update") {
        await milestoneController.updateMilestone(request, response, jest.fn());
      } else {
        await milestoneController.deleteMilestone(request, response, jest.fn());
      }

      expect(response.status).toHaveBeenCalledWith(403);
      expect(update).not.toHaveBeenCalled();
      expect(destroy).not.toHaveBeenCalled();
    },
  );

  it("rejects linking a lesson from a different course", async () => {
    jest
      .spyOn(Milestone, "findOne")
      .mockResolvedValue({
        id: "milestone-a",
        moduleId: "module-a",
      } as Milestone);
    jest
      .spyOn(Lesson, "findOne")
      .mockResolvedValue({ id: "lesson-b", moduleId: "module-b" } as Lesson);
    jest
      .spyOn(Module, "findByPk")
      .mockResolvedValueOnce({ id: "module-a", courseId: "course-a" } as Module)
      .mockResolvedValueOnce({
        id: "module-b",
        courseId: "course-b",
      } as Module);
    jest
      .spyOn(Course, "findByPk")
      .mockResolvedValueOnce({
        id: "course-a",
        instructorId: "instructor-a",
        isPublished: false,
      } as Course)
      .mockResolvedValueOnce({
        id: "course-b",
        instructorId: "instructor-b",
        isPublished: true,
      } as Course);
    const create = jest.spyOn(MilestoneLesson, "create");
    const response = responseMock();

    await milestoneLessonController.addLesson(
      instructorRequest(
        { milestoneId: "milestone-a" },
        { lessonId: "lesson-b" },
      ),
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "Lessons and milestones must belong to the same course",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("allows the owner to link a lesson from the same course", async () => {
    jest
      .spyOn(Milestone, "findOne")
      .mockResolvedValue({
        id: "milestone-a",
        moduleId: "module-a",
      } as Milestone);
    jest
      .spyOn(Lesson, "findOne")
      .mockResolvedValue({ id: "lesson-a", moduleId: "module-a" } as Lesson);
    jest
      .spyOn(Module, "findByPk")
      .mockResolvedValue({ id: "module-a", courseId: "course-a" } as Module);
    jest.spyOn(Course, "findByPk").mockResolvedValue({
      id: "course-a",
      instructorId: "instructor-a",
      isPublished: false,
    } as Course);
    jest.spyOn(MilestoneLesson, "findOne").mockResolvedValue(null);
    const link = { id: "link-a" } as MilestoneLesson;
    const create = jest
      .spyOn(MilestoneLesson, "create")
      .mockResolvedValue(link);
    const response = responseMock();

    await milestoneLessonController.addLesson(
      instructorRequest(
        { milestoneId: "milestone-a" },
        { lessonId: "lesson-a" },
      ),
      response,
      jest.fn(),
    );

    expect(create).toHaveBeenCalledWith({
      milestoneId: "milestone-a",
      lessonId: "lesson-a",
    });
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it("rejects unlinking a lesson from a different course", async () => {
    jest
      .spyOn(Milestone, "findOne")
      .mockResolvedValue({
        id: "milestone-a",
        moduleId: "module-a",
      } as Milestone);
    jest
      .spyOn(Lesson, "findOne")
      .mockResolvedValue({ id: "lesson-b", moduleId: "module-b" } as Lesson);
    jest
      .spyOn(Module, "findByPk")
      .mockResolvedValueOnce({ id: "module-a", courseId: "course-a" } as Module)
      .mockResolvedValueOnce({
        id: "module-b",
        courseId: "course-b",
      } as Module);
    jest
      .spyOn(Course, "findByPk")
      .mockResolvedValueOnce({
        id: "course-a",
        instructorId: "instructor-a",
        isPublished: false,
      } as Course)
      .mockResolvedValueOnce({
        id: "course-b",
        instructorId: "instructor-b",
        isPublished: true,
      } as Course);
    const findLink = jest.spyOn(MilestoneLesson, "findOne");
    const response = responseMock();

    await milestoneLessonController.removeLesson(
      instructorRequest({
        milestoneId: "milestone-a",
        lessonId: "lesson-b",
      }),
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(findLink).not.toHaveBeenCalled();
  });
});
