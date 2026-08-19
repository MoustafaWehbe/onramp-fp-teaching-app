import type { Request, Response } from "express";
import request from "supertest";
import { signAccessToken } from "@starter-kit/shared/auth";
import { courseAssistantController } from "../../src/controllers/course-assistant.controller";
import { app } from "../../app";

jest.mock("../../src/controllers/course-assistant.controller", () => ({
  courseAssistantController: {
    ask: jest.fn((_req: Request, res: Response) => {
      res.json({
        data: { type: "message", answer: "Answer [1].", sources: [] },
      });
    }),
  },
}));

const askMock = jest.mocked(courseAssistantController.ask);
const courseId = "00000000-0000-4000-8000-000000000100";

function studentCookie(): string {
  return `accessToken=${signAccessToken({
    userId: "00000000-0000-4000-8000-000000000200",
    email: "student@example.com",
    role: "student",
    sessionId: "00000000-0000-4000-8000-000000000300",
  })}`;
}

describe("POST /api/courses/:courseId/assistant", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects unauthenticated requests", async () => {
    const response = await request(app)
      .post(`/api/courses/${courseId}/assistant`)
      .send({ message: "Question?" });

    expect(response.status).toBe(401);
    expect(askMock).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { message: 42 },
    { message: "   " },
    { message: "x".repeat(1_501) },
    { message: "Question?", extra: true },
    {
      message: "Question?",
      history: Array.from({ length: 9 }, () => ({
        role: "user",
        content: "Earlier",
      })),
    },
    {
      message: "Question?",
      history: [{ role: "user", content: "Earlier", id: "client-id" }],
    },
  ])(
    "rejects malformed request bodies before controller work",
    async (body) => {
      const response = await request(app)
        .post(`/api/courses/${courseId}/assistant`)
        .set("Cookie", studentCookie())
        .send(body);

      expect(response.status).toBe(422);
      expect(response.body.error).toBe("Validation failed");
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String),
          }),
        ]),
      );
      expect(askMock).not.toHaveBeenCalled();
    },
  );

  it("rejects a malformed course id", async () => {
    const response = await request(app)
      .post("/api/courses/not-a-uuid/assistant")
      .set("Cookie", studentCookie())
      .send({ message: "Question?" });

    expect(response.status).toBe(422);
    expect(askMock).not.toHaveBeenCalled();
  });

  it("trims a valid request and reaches the secured controller", async () => {
    const response = await request(app)
      .post(`/api/courses/${courseId}/assistant`)
      .set("Cookie", studentCookie())
      .send({
        message: "  Question?  ",
        history: [{ role: "assistant", content: "  Earlier answer  " }],
      });

    expect(response.status).toBe(200);
    expect(askMock).toHaveBeenCalledTimes(1);
    const controllerRequest = askMock.mock.calls[0]?.[0];
    expect(controllerRequest?.body).toEqual({
      message: "Question?",
      history: [{ role: "assistant", content: "Earlier answer" }],
    });
  });
});
