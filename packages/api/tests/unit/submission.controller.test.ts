import type { NextFunction, Request, Response } from "express";
import type { Transaction } from "sequelize";
import { Course } from "@starter-kit/shared/db/models/Course";
import { Milestone } from "@starter-kit/shared/db/models/Milestone";
import { Module } from "@starter-kit/shared/db/models/Module";
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
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

function ownedModuleInclude(instructorId = "instructor-1") {
  return [
    {
      model: Module,
      as: "module",
      required: true,
      include: [
        {
          model: Course,
          as: "course",
          required: true,
          where: { instructorId },
          attributes: [],
        },
      ],
    },
  ];
}

describe("submissionController", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(Submission, "sequelize");
  });

  describe("getSubmissions", () => {
    it("checks course ownership and includes only safe student fields for instructors", async () => {
      const findMilestone = jest
        .spyOn(Milestone, "findOne")
        .mockResolvedValue({ id: "milestone-1" } as Milestone);
      const findAll = jest.spyOn(Submission, "findAll").mockResolvedValue([]);
      const response = responseMock();
      const next = jest.fn() as NextFunction;

      await submissionController.getSubmissions(
        requestFor("instructor"),
        response,
        next,
      );

      expect(findMilestone).toHaveBeenCalledWith({
        where: { id: "milestone-1" },
        attributes: ["id"],
        include: ownedModuleInclude(),
      });
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

    it("rejects an instructor who does not own the milestone course", async () => {
      jest.spyOn(Milestone, "findOne").mockResolvedValue(null);
      const findAll = jest.spyOn(Submission, "findAll");
      const response = responseMock();
      const next = jest.fn() as NextFunction;

      await submissionController.getSubmissions(
        requestFor("instructor"),
        response,
        next,
      );

      expect(response.status).toHaveBeenCalledWith(403);
      expect(response.json).toHaveBeenCalledWith({ error: "Forbidden" });
      expect(findAll).not.toHaveBeenCalled();
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

  describe("createSubmission", () => {
    const links = [{ type: "github", url: "https://github.com/team/repo" }];

    function createRequest() {
      return {
        params: { milestoneId: "milestone-1" },
        user: { userId: "student-1", role: "student" },
        body: { links },
      } as unknown as Request;
    }

    function mockManagedTransaction() {
      const transaction = { id: "transaction-1" } as unknown as Transaction;
      const commit = jest.fn();
      const rollback = jest.fn();
      const run = jest.fn(
        async (callback: (transaction: Transaction) => Promise<unknown>) => {
          try {
            const result = await callback(transaction);
            commit();
            return result;
          } catch (error) {
            rollback();
            throw error;
          }
        },
      );
      Object.defineProperty(Submission, "sequelize", {
        configurable: true,
        value: { transaction: run },
      });
      return { transaction, run, commit, rollback };
    }

    it("commits the submission and links in one managed transaction", async () => {
      jest
        .spyOn(Milestone, "findByPk")
        .mockResolvedValue({ id: "milestone-1" } as Milestone);
      const managed = mockManagedTransaction();
      const submission = {
        id: "submission-1",
        toJSON: () => ({ id: "submission-1" }),
      } as unknown as Submission;
      const createdLinks = [
        { submissionId: "submission-1", ...links[0] },
      ] as SubmissionLink[];
      const create = jest
        .spyOn(Submission, "create")
        .mockResolvedValue(submission);
      const bulkCreate = jest
        .spyOn(SubmissionLink, "bulkCreate")
        .mockResolvedValue(createdLinks);
      const response = responseMock();
      const next = jest.fn() as NextFunction;

      await submissionController.createSubmission(
        createRequest(),
        response,
        next,
      );

      expect(managed.run).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          milestoneId: "milestone-1",
          studentId: "student-1",
          status: "submitted",
        }),
        { transaction: managed.transaction },
      );
      expect(bulkCreate).toHaveBeenCalledWith(
        [
          {
            submissionId: "submission-1",
            type: "github",
            url: "https://github.com/team/repo",
          },
        ],
        { transaction: managed.transaction },
      );
      expect(managed.commit).toHaveBeenCalledTimes(1);
      expect(managed.rollback).not.toHaveBeenCalled();
      expect(response.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();
    });

    it("rolls back when creating submission links fails", async () => {
      jest
        .spyOn(Milestone, "findByPk")
        .mockResolvedValue({ id: "milestone-1" } as Milestone);
      const managed = mockManagedTransaction();
      const submission = {
        id: "submission-1",
        toJSON: () => ({ id: "submission-1" }),
      } as unknown as Submission;
      jest.spyOn(Submission, "create").mockResolvedValue(submission);
      const databaseError = new Error("link insert failed");
      jest.spyOn(SubmissionLink, "bulkCreate").mockRejectedValue(databaseError);
      const response = responseMock();
      const next = jest.fn() as NextFunction;

      await submissionController.createSubmission(
        createRequest(),
        response,
        next,
      );

      expect(managed.rollback).toHaveBeenCalledTimes(1);
      expect(managed.commit).not.toHaveBeenCalled();
      expect(response.status).not.toHaveBeenCalledWith(201);
      expect(next).toHaveBeenCalledWith(databaseError);
    });
  });

  describe("gradeSubmission", () => {
    function gradeRequest(score: unknown) {
      return {
        params: { id: "submission-1" },
        user: { userId: "instructor-1", role: "instructor" },
        body: { score, feedback: "Good work" },
      } as unknown as Request;
    }

    it.each([undefined, null, "50", Number.NaN, Infinity, -1, 101])(
      "rejects the invalid score %p",
      async (score) => {
        const findOne = jest.spyOn(Submission, "findOne");
        const response = responseMock();
        const next = jest.fn() as NextFunction;

        await submissionController.gradeSubmission(
          gradeRequest(score),
          response,
          next,
        );

        expect(response.status).toHaveBeenCalledWith(400);
        expect(findOne).not.toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
      },
    );

    it("rejects grading when the submission is outside the instructor's courses", async () => {
      const findOne = jest.spyOn(Submission, "findOne").mockResolvedValue(null);
      const response = responseMock();
      const next = jest.fn() as NextFunction;

      await submissionController.gradeSubmission(
        gradeRequest(85),
        response,
        next,
      );

      expect(findOne).toHaveBeenCalledWith({
        where: { id: "submission-1" },
        include: [
          {
            model: Milestone,
            as: "milestone",
            required: true,
            include: ownedModuleInclude(),
          },
        ],
      });
      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        error: "Submission not found",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
