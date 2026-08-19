import type { Request, Response } from "express";
import { postGeneralAssistantMessage } from "../../src/controllers/assistant.controller";
import { askGeneralAssistant } from "../../src/services/ai/general-assistant.service";
import { AIError, AIErrorCode } from "../../src/services/ai/ai.errors";

jest.mock("../../src/services/ai/general-assistant.service", () => ({
  askGeneralAssistant: jest.fn(),
}));

const mockAskGeneralAssistant = jest.mocked(askGeneralAssistant);

function buildRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function buildReq(body: unknown): Request {
  return { body } as Request;
}

describe("postGeneralAssistantMessage", () => {
  beforeEach(() => {
    mockAskGeneralAssistant.mockReset();
  });

  it("returns 400 when message is missing", async () => {
    const req = buildReq({});
    const res = buildRes();

    await postGeneralAssistantMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockAskGeneralAssistant).not.toHaveBeenCalled();
  });

  it("returns 400 when message is an empty string", async () => {
    const req = buildReq({ message: "" });
    const res = buildRes();

    await postGeneralAssistantMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockAskGeneralAssistant).not.toHaveBeenCalled();
  });

  it("returns 400 when message exceeds 1500 characters", async () => {
    const req = buildReq({ message: "a".repeat(1501) });
    const res = buildRes();

    await postGeneralAssistantMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockAskGeneralAssistant).not.toHaveBeenCalled();
  });

  it("returns 200 with the answer and sources on success", async () => {
    mockAskGeneralAssistant.mockResolvedValue({
      answer: "You can submit via GitHub.",
      sources: [{ type: "policy", id: "submission-rules", title: "Submission Rules" }],
    });

    const req = buildReq({ message: "How do I submit?" });
    const res = buildRes();

    await postGeneralAssistantMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        type: "message",
        answer: "You can submit via GitHub.",
        sources: [{ type: "policy", id: "submission-rules", title: "Submission Rules" }],
      },
    });
  });

  it("returns 503 when the AI service is not configured", async () => {
    mockAskGeneralAssistant.mockRejectedValue(
      new AIError(AIErrorCode.NOT_CONFIGURED),
    );

    const req = buildReq({ message: "test" });
    const res = buildRes();

    await postGeneralAssistantMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
  });

  it("returns 502 on provider failure without leaking details", async () => {
    mockAskGeneralAssistant.mockRejectedValue(
      new AIError(AIErrorCode.PROVIDER_ERROR, { cause: new Error("secret prompt leaked") }),
    );

    const req = buildReq({ message: "test" });
    const res = buildRes();

    await postGeneralAssistantMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(502);
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(JSON.stringify(jsonArg)).not.toContain("secret prompt");
  });

  it("returns 500 on unexpected non-AIError failures", async () => {
    mockAskGeneralAssistant.mockRejectedValue(new Error("unexpected"));

    const req = buildReq({ message: "test" });
    const res = buildRes();

    await postGeneralAssistantMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
