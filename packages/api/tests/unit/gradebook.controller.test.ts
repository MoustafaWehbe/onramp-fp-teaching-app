import type { NextFunction, Request, Response } from "express";
import { Course } from "@starter-kit/shared/db/models/Course";
import { Milestone } from "@starter-kit/shared/db/models/Milestone";
import { Module } from "@starter-kit/shared/db/models/Module";
import { Submission } from "@starter-kit/shared/db/models/Submission";
import { SubmissionLink } from "@starter-kit/shared/db/models/SubmissionLink";
import { submissionController } from "../../src/controllers/submission.controller";

function responseMock() {
  return { json: jest.fn() } as unknown as Response;
}

describe("submissionController.getMyGrades", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns only the authenticated student's graded submissions with safe learning context", async () => {
    const submissions = [{ id: "submission-1" }] as Submission[];
    const findAll = jest
      .spyOn(Submission, "findAll")
      .mockResolvedValue(submissions);
    const request = {
      user: { userId: "student-1", role: "student" },
    } as unknown as Request;
    const response = responseMock();
    const next = jest.fn() as NextFunction;

    await submissionController.getMyGrades(request, response, next);

    expect(findAll).toHaveBeenCalledWith({
      where: { studentId: "student-1", status: "graded" },
      include: [
        { model: SubmissionLink, as: "links" },
        {
          model: Milestone,
          as: "milestone",
          attributes: ["id", "title"],
          include: [
            {
              model: Module,
              as: "module",
              attributes: ["id", "title"],
              include: [
                {
                  model: Course,
                  as: "course",
                  attributes: ["id", "title"],
                },
              ],
            },
          ],
        },
      ],
      order: [["gradedAt", "DESC"]],
    });
    expect(response.json).toHaveBeenCalledWith({ data: submissions });
    expect(next).not.toHaveBeenCalled();
  });

  it("passes database errors to the error middleware", async () => {
    const databaseError = new Error("database unavailable");
    jest.spyOn(Submission, "findAll").mockRejectedValue(databaseError);
    const request = {
      user: { userId: "student-1", role: "student" },
    } as unknown as Request;
    const response = responseMock();
    const next = jest.fn() as NextFunction;

    await submissionController.getMyGrades(request, response, next);

    expect(response.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(databaseError);
  });
});
