import { Course } from "@starter-kit/shared/db/models/Course";
import type { NextFunction, Request, Response } from "express";
import { instructorAssistantController } from "../../src/controllers/instructor-assistant.controller";
import { answerInstructorQuestion } from "../../src/services/ai/instructor/instructor-assistant.service";

jest.mock(
  "../../src/services/ai/instructor/instructor-assistant.service",
  () => ({ answerInstructorQuestion: jest.fn() }),
);

const answerMock = jest.mocked(answerInstructorQuestion);
const responseContract = {
  type: "message" as const,
  answer: "There are two pending submissions.",
  sources: [],
};

function requestFor(role: "student" | "instructor", userId = `${role}-1`) {
  return {
    params: { courseId: "course-1" },
    body: {
      message: "How much grading is left?",
      history: [{ role: "user", content: "Earlier question" }],
    },
    user: { userId, role },
  } as unknown as Request;
}

function responseMock() {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

describe("instructorAssistantController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    answerMock.mockResolvedValue(responseContract);
  });

  afterEach(() => jest.restoreAllMocks());

  it("rejects a student before loading course data or invoking AI/tools", async () => {
    const findCourse = jest.spyOn(Course, "findByPk");
    const response = responseMock();

    await instructorAssistantController.ask(
      requestFor("student"),
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: "Forbidden" });
    expect(findCourse).not.toHaveBeenCalled();
    expect(answerMock).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "allows the owning instructor when course publication is %p",
    async (isPublished) => {
      const findCourse = jest.spyOn(Course, "findByPk").mockResolvedValue({
        id: "course-1",
        instructorId: "instructor-1",
        isPublished,
      } as Course);
      const response = responseMock();

      await instructorAssistantController.ask(
        requestFor("instructor"),
        response,
        jest.fn(),
      );

      expect(findCourse).toHaveBeenCalledWith("course-1", {
        attributes: ["id", "instructorId"],
      });
      expect(answerMock).toHaveBeenCalledWith({
        courseId: "course-1",
        instructorId: "instructor-1",
        message: "How much grading is left?",
        history: [{ role: "user", content: "Earlier question" }],
      });
      expect(findCourse.mock.invocationCallOrder[0]).toBeLessThan(
        answerMock.mock.invocationCallOrder[0]!,
      );
      expect(response.json).toHaveBeenCalledWith({ data: responseContract });
    },
  );

  it("rejects a different instructor before invoking AI/tools", async () => {
    jest.spyOn(Course, "findByPk").mockResolvedValue({
      id: "course-1",
      instructorId: "instructor-2",
    } as Course);
    const response = responseMock();

    await instructorAssistantController.ask(
      requestFor("instructor"),
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(answerMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown course without invoking AI/tools", async () => {
    jest.spyOn(Course, "findByPk").mockResolvedValue(null);
    const response = responseMock();

    await instructorAssistantController.ask(
      requestFor("instructor"),
      response,
      jest.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Course not found" });
    expect(answerMock).not.toHaveBeenCalled();
  });

  it("forwards safe assistant failures to the global error handler", async () => {
    jest.spyOn(Course, "findByPk").mockResolvedValue({
      id: "course-1",
      instructorId: "instructor-1",
    } as Course);
    const failure = Object.assign(new Error("Assistant unavailable"), {
      statusCode: 503,
      isOperational: true,
    });
    answerMock.mockRejectedValueOnce(failure);
    const next = jest.fn() as NextFunction;

    await instructorAssistantController.ask(
      requestFor("instructor"),
      responseMock(),
      next,
    );

    expect(next).toHaveBeenCalledWith(failure);
  });
});
