import type { Request, Response } from "express";
import { assistantController } from "../../src/controllers/assistant.controller";
import { generalAssistantService } from "../../src/services/ai/general-assistant.service";

function createResponse() {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
}

describe("assistantController.general", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns a successful assistant response", async () => {
    jest.spyOn(generalAssistantService, "respond").mockResolvedValue({
      type: "message",
      answer: "Use the Grades page.",
    });
    const res = createResponse();

    await assistantController.general(
      { body: { message: "Where are my grades?" } } as Request,
      res,
      jest.fn(),
    );

    expect(res.json).toHaveBeenCalledWith({
      data: { type: "message", answer: "Use the Grades page." },
    });
  });

  it("hides provider failures behind a safe response", async () => {
    jest
      .spyOn(generalAssistantService, "respond")
      .mockRejectedValue(new Error("provider secret details"));
    const res = createResponse();

    await assistantController.general(
      { body: { message: "Where are my grades?" } } as Request,
      res,
      jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: "The assistant is temporarily unavailable. Please try again.",
    });
  });
});
