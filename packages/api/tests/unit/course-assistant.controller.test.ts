import type { NextFunction, Request, Response } from "express";
import { Course } from "@starter-kit/shared/db/models/Course";
import { Enrollment } from "@starter-kit/shared/db/models/Enrollment";
import { answerCourseQuestion } from "../../src/services/ai/course-assistant.service";
import { courseAssistantController } from "../../src/controllers/course-assistant.controller";

jest.mock("../../src/services/ai/course-assistant.service", () => ({
  answerCourseQuestion: jest.fn(),
}));

const answerMock = jest.mocked(answerCourseQuestion);
const responseContract = {
  type: "message" as const,
  answer: "Grounded answer [1].",
  sources: [{ type: "lesson" as const, id: "lesson-1", title: "Lesson 1" }],
};

function requestFor(role: "student" | "instructor") {
  return {
    params: { courseId: "course-1" },
    body: {
      message: "Question?",
      history: [{ role: "user", content: "Earlier question" }],
    },
    user: { userId: `${role}-1`, role },
  } as unknown as Request;
}

function responseMock() {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

describe("courseAssistantController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    answerMock.mockResolvedValue(responseContract);
  });

  afterEach(() => jest.restoreAllMocks());

  it("allows an enrolled student to use a published course assistant", async () => {
    const findCourse = jest.spyOn(Course, "findByPk").mockResolvedValue({
      id: "course-1",
      instructorId: "instructor-1",
      isPublished: true,
    } as Course);
    jest
      .spyOn(Enrollment, "findOne")
      .mockResolvedValue({ id: "enrollment-1" } as Enrollment);
    const response = responseMock();
    const next = jest.fn() as NextFunction;

    await courseAssistantController.ask(requestFor("student"), response, next);

    expect(findCourse).toHaveBeenCalledWith("course-1", {
      attributes: ["id", "instructorId", "isPublished"],
    });
    expect(Enrollment.findOne).toHaveBeenCalledWith({
      where: { courseId: "course-1", studentId: "student-1" },
      attributes: ["id"],
    });
    expect(answerMock).toHaveBeenCalledWith({
      courseId: "course-1",
      message: "Question?",
      history: [{ role: "user", content: "Earlier question" }],
    });
    expect(
      (Enrollment.findOne as jest.Mock).mock.invocationCallOrder[0],
    ).toBeLessThan(answerMock.mock.invocationCallOrder[0]!);
    expect(response.json).toHaveBeenCalledWith({ data: responseContract });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an enrolled student from an unpublished course before indexing, retrieval, or Gemini", async () => {
    jest.spyOn(Course, "findByPk").mockResolvedValue({
      id: "course-1",
      instructorId: "instructor-1",
      isPublished: false,
    } as Course);
    const findEnrollment = jest
      .spyOn(Enrollment, "findOne")
      .mockResolvedValue({ id: "enrollment-1" } as Enrollment);
    const response = responseMock();

    await courseAssistantController.ask(
      requestFor("student"),
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: "Forbidden" });
    expect(findEnrollment).not.toHaveBeenCalled();
    expect(answerMock).not.toHaveBeenCalled();
  });

  it("rejects a non-enrolled student before retrieval", async () => {
    jest.spyOn(Course, "findByPk").mockResolvedValue({
      id: "course-1",
      instructorId: "instructor-1",
      isPublished: true,
    } as Course);
    jest.spyOn(Enrollment, "findOne").mockResolvedValue(null);
    const response = responseMock();

    await courseAssistantController.ask(
      requestFor("student"),
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "Course enrollment required",
    });
    expect(answerMock).not.toHaveBeenCalled();
  });

  it("allows the course-owning instructor for an unpublished course", async () => {
    const findEnrollment = jest.spyOn(Enrollment, "findOne");
    jest.spyOn(Course, "findByPk").mockResolvedValue({
      id: "course-1",
      instructorId: "instructor-1",
      isPublished: false,
    } as Course);
    const response = responseMock();

    await courseAssistantController.ask(
      requestFor("instructor"),
      response,
      jest.fn(),
    );

    expect(answerMock).toHaveBeenCalledTimes(1);
    expect(findEnrollment).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({ data: responseContract });
  });

  it("rejects a different instructor from an unpublished course", async () => {
    const findEnrollment = jest.spyOn(Enrollment, "findOne");
    jest.spyOn(Course, "findByPk").mockResolvedValue({
      id: "course-1",
      instructorId: "instructor-2",
      isPublished: false,
    } as Course);
    const response = responseMock();

    await courseAssistantController.ask(
      requestFor("instructor"),
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: "Forbidden" });
    expect(findEnrollment).not.toHaveBeenCalled();
    expect(answerMock).not.toHaveBeenCalled();
  });

  it("returns 404 without enrollment or retrieval for an unknown course", async () => {
    const findEnrollment = jest.spyOn(Enrollment, "findOne");
    jest.spyOn(Course, "findByPk").mockResolvedValue(null);
    const response = responseMock();

    await courseAssistantController.ask(
      requestFor("student"),
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(findEnrollment).not.toHaveBeenCalled();
    expect(answerMock).not.toHaveBeenCalled();
  });

  it("forwards safe service failures to the global error handler", async () => {
    jest.spyOn(Course, "findByPk").mockResolvedValue({
      id: "course-1",
      instructorId: "instructor-1",
      isPublished: true,
    } as Course);
    jest
      .spyOn(Enrollment, "findOne")
      .mockResolvedValue({ id: "enrollment-1" } as Enrollment);
    const failure = Object.assign(new Error("Assistant unavailable"), {
      statusCode: 503,
      isOperational: true,
    });
    answerMock.mockRejectedValueOnce(failure);
    const next = jest.fn() as NextFunction;

    await courseAssistantController.ask(
      requestFor("student"),
      responseMock(),
      next,
    );

    expect(next).toHaveBeenCalledWith(failure);
  });
});
