import { signAccessToken } from "@starter-kit/shared/auth";
import type { Request, Response } from "express";
import request from "supertest";
import { app } from "../../app";
import { instructorAssistantController } from "../../src/controllers/instructor-assistant.controller";

jest.mock("../../src/controllers/instructor-assistant.controller", () => ({
  instructorAssistantController: {
    ask: jest.fn((_req: Request, res: Response) => {
      res.json({
        data: { type: "message", answer: "Answer", sources: [] },
      });
    }),
  },
}));

const askMock = jest.mocked(instructorAssistantController.ask);
const courseId = "00000000-0000-4000-8000-000000000100";

function instructorCookie(): string {
  return `accessToken=${signAccessToken({
    userId: "00000000-0000-4000-8000-000000000200",
    email: "instructor@example.com",
    role: "instructor",
    sessionId: "00000000-0000-4000-8000-000000000300",
  })}`;
}

describe("POST /api/courses/:courseId/instructor-assistant", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects unauthenticated requests", async () => {
    const response = await request(app)
      .post(`/api/courses/${courseId}/instructor-assistant`)
      .send({ message: "Question?" });

    expect(response.status).toBe(401);
    expect(askMock).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { message: "   " },
    { message: "Question?", courseId },
    { message: "Question?", instructorId: "attacker" },
    { message: "Question?", userId: "attacker" },
    {
      message: "Question?",
      history: Array.from({ length: 9 }, () => ({
        role: "user",
        content: "Earlier",
      })),
    },
  ])("rejects malformed or identity-bearing request bodies", async (body) => {
    const response = await request(app)
      .post(`/api/courses/${courseId}/instructor-assistant`)
      .set("Cookie", instructorCookie())
      .send(body);

    expect(response.status).toBe(422);
    expect(askMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed course id", async () => {
    const response = await request(app)
      .post("/api/courses/not-a-uuid/instructor-assistant")
      .set("Cookie", instructorCookie())
      .send({ message: "Question?" });

    expect(response.status).toBe(422);
    expect(askMock).not.toHaveBeenCalled();
  });

  it("trims a valid bounded request before controller work", async () => {
    const response = await request(app)
      .post(`/api/courses/${courseId}/instructor-assistant`)
      .set("Cookie", instructorCookie())
      .send({
        message: "  Question?  ",
        history: [{ role: "assistant", content: "  Earlier answer  " }],
      });

    expect(response.status).toBe(200);
    expect(askMock).toHaveBeenCalledTimes(1);
    expect(askMock.mock.calls[0]?.[0].body).toEqual({
      message: "Question?",
      history: [{ role: "assistant", content: "Earlier answer" }],
    });
  });
});
