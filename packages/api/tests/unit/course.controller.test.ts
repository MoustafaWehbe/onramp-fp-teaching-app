import type { NextFunction, Request, Response } from "express";
import { Course } from "@starter-kit/shared/db/models/Course";
import { Enrollment } from "@starter-kit/shared/db/models/Enrollment";
import { courseController } from "../../src/controllers/course.controller";

function responseMock() {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

describe("courseController authorization regressions", () => {
  afterEach(() => jest.restoreAllMocks());

  it("rejects course creation by a student", async () => {
    const create = jest.spyOn(Course, "create");
    const request = {
      body: { title: "Unauthorized course" },
      user: { userId: "student-1", role: "student" },
    } as unknown as Request;
    const response = responseMock();
    const next = jest.fn() as NextFunction;

    await courseController.createCourse(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(create).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("prevents an instructor from updating another instructor's course", async () => {
    const update = jest.fn();
    jest.spyOn(Course, "findByPk").mockResolvedValue({
      id: "course-1",
      instructorId: "instructor-2",
      update,
    } as unknown as Course);
    const request = {
      params: { id: "course-1" },
      body: { title: "Changed" },
      user: { userId: "instructor-1", role: "instructor" },
    } as unknown as Request;
    const response = responseMock();
    const next = jest.fn() as NextFunction;

    await courseController.updateCourse(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(update).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("limits a student's course list to their enrollments", async () => {
    jest
      .spyOn(Enrollment, "findAll")
      .mockResolvedValue([
        { courseId: "course-1" },
        { courseId: "course-2" },
      ] as Enrollment[]);
    const findCourses = jest.spyOn(Course, "findAll").mockResolvedValue([]);
    const request = {
      user: { userId: "student-1", role: "student" },
    } as unknown as Request;
    const response = responseMock();
    const next = jest.fn() as NextFunction;

    await courseController.getCourses(request, response, next);

    expect(Enrollment.findAll).toHaveBeenCalledWith({
      where: { studentId: "student-1" },
    });
    expect(findCourses).toHaveBeenCalledWith({
      where: { id: ["course-1", "course-2"] },
    });
    expect(response.json).toHaveBeenCalledWith({ data: [] });
    expect(next).not.toHaveBeenCalled();
  });
});
