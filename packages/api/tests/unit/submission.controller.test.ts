import type { NextFunction, Request, Response } from "express";
import { Submission } from "@starter-kit/shared/db/models/Submission";
import { SubmissionLink } from "@starter-kit/shared/db/models/SubmissionLink";
import { User } from "@starter-kit/shared/db/models/User";
import { submissionController } from "../../src/controllers/submission.controller";

function requestFor(role: "instructor" | "student") {
  return {
    params: { milestoneId: "milestone-1" },
    user: { userId: `${role}-1`, role },
  } as unknown as Request;
}

function responseMock() {
  return { json: jest.fn() } as unknown as Response;
}

describe("submissionController.getSubmissions", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("includes only safe student fields for instructor responses", async () => {
    const findAll = jest.spyOn(Submission, "findAll").mockResolvedValue([]);
    const response = responseMock();
    const next = jest.fn() as NextFunction;

    await submissionController.getSubmissions(
      requestFor("instructor"),
      response,
      next,
    );

    expect(findAll).toHaveBeenCalledWith({
      where: { milestoneId: "milestone-1" },
      include: [
        { model: SubmissionLink, as: "links" },
        {
          model: User,
          as: "student",
          attributes: ["id", "name", "email"],
        },
      ],
    });
    expect(response.json).toHaveBeenCalledWith({ data: [] });
    expect(next).not.toHaveBeenCalled();
  });

  it("preserves the student-only privacy filter without student association data", async () => {
    const findAll = jest.spyOn(Submission, "findAll").mockResolvedValue([]);
    const response = responseMock();
    const next = jest.fn() as NextFunction;

    await submissionController.getSubmissions(
      requestFor("student"),
      response,
      next,
    );

    expect(findAll).toHaveBeenCalledWith({
      where: { milestoneId: "milestone-1", studentId: "student-1" },
      include: [{ model: SubmissionLink, as: "links" }],
    });
    expect(next).not.toHaveBeenCalled();
  });
});
