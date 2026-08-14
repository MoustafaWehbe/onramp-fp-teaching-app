import type { NextFunction, Request, Response } from "express";
import { authorize } from "../../src/middleware/authorize";

function responseMock() {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

describe("authorize", () => {
  it("rejects an unauthenticated request", () => {
    const response = responseMock();
    const next = jest.fn() as NextFunction;

    authorize("student")({} as Request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ["student", "instructor"],
    ["instructor", "student"],
  ] as const)("rejects a %s from a %s-only action", (actual, allowed) => {
    const request = {
      user: { userId: `${actual}-1`, role: actual },
    } as unknown as Request;
    const response = responseMock();
    const next = jest.fn() as NextFunction;

    authorize(allowed)(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "Insufficient permissions",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows a matching role", () => {
    const request = {
      user: { userId: "student-1", role: "student" },
    } as unknown as Request;
    const response = responseMock();
    const next = jest.fn() as NextFunction;

    authorize("student")(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
  });
});
