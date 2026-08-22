import xss from "xss";
import type { Request, Response, NextFunction } from "express";
import { UniqueConstraintError } from "sequelize";
import { Submission } from "@starter-kit/shared/db/models/Submission";
import { SubmissionLink } from "@starter-kit/shared/db/models/SubmissionLink";
import { Milestone } from "@starter-kit/shared/db/models/Milestone";
import { Module } from "@starter-kit/shared/db/models/Module";
import { Course } from "@starter-kit/shared/db/models/Course";
import { User } from "@starter-kit/shared/db/models/User";
import {
  canAccessCourseContent,
  loadMilestoneCourse,
} from "../services/course-content-access.service";

const URL_PATTERNS: Record<string, RegExp> = {
  github: /^https?:\/\/(?:www\.)?github\.com\/.+/,
  loom: /^https?:\/\/(?:www\.)?loom\.com\/.+/,
  deployment: /^https?:\/\/.+/,
  other: /^https?:\/\/.+/,
};

function validateUrl(url: string, type: string): boolean {
  const pattern = URL_PATTERNS[type] || URL_PATTERNS.other;
  return pattern.test(url);
}

function getParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function ownedModuleInclude(instructorId: string) {
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

export const submissionController = {
  async getSubmissions(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const milestoneId = getParam(req.params.milestoneId);
      const userId = req.user!.userId;
      const role = req.user!.role;
      const milestoneContext = await loadMilestoneCourse(milestoneId);
      if (!milestoneContext) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }
      if (!(await canAccessCourseContent(milestoneContext.course, req.user!))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      let submissions;

      if (role === "instructor") {
        submissions = await Submission.findAll({
          where: { milestoneId },
          include: [
            { model: SubmissionLink, as: "links" },
            {
              model: User,
              as: "student",
              attributes: ["id", "name", "email"],
            },
          ],
        });
      } else {
        submissions = await Submission.findAll({
          where: { milestoneId, studentId: userId },
          include: [{ model: SubmissionLink, as: "links" }],
        });
      }

      res.json({ data: submissions });
    } catch (err) {
      next(err);
    }
  },

  async createSubmission(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const milestoneId = getParam(req.params.milestoneId);
      const studentId = req.user!.userId;
      const { links } = req.body;

      if (!links || links.length === 0) {
        res.status(400).json({ error: "At least one link is required" });
        return;
      }

      if (links.length > 10) {
        res.status(400).json({ error: "Maximum 10 links allowed" });
        return;
      }

      for (const link of links) {
        if (!validateUrl(link.url, link.type)) {
          res.status(400).json({
            error: `Invalid URL for type ${link.type}: ${link.url}`,
          });
          return;
        }
      }

      const milestoneContext = await loadMilestoneCourse(milestoneId);
      if (!milestoneContext) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }
      if (!(await canAccessCourseContent(milestoneContext.course, req.user!))) {
        res.status(403).json({ error: "Course enrollment required" });
        return;
      }

      const existingSubmission = await Submission.findOne({
        where: { milestoneId, studentId },
        attributes: ["id"],
      });
      if (existingSubmission) {
        res.status(409).json({
          error: "You have already submitted work for this milestone",
        });
        return;
      }

      const sequelize = Submission.sequelize;
      if (!sequelize) {
        throw new Error("Submission model is not initialized");
      }

      const { submission, submissionLinks } = await sequelize.transaction(
        async (transaction) => {
          const createdSubmission = await Submission.create(
            {
              milestoneId,
              studentId,
              status: "submitted",
              submittedAt: new Date(),
            },
            { transaction },
          );

          const createdLinks = await SubmissionLink.bulkCreate(
            links.map((link: { url: string; type: string }) => ({
              submissionId: createdSubmission.id,
              url: xss(link.url),
              type: link.type,
            })),
            { transaction },
          );

          return {
            submission: createdSubmission,
            submissionLinks: createdLinks,
          };
        },
      );

      res.status(201).json({
        data: {
          ...submission.toJSON(),
          links: submissionLinks,
        },
      });
    } catch (err) {
      if (
        err instanceof UniqueConstraintError ||
        (err instanceof Error && err.name === "SequelizeUniqueConstraintError")
      ) {
        res.status(409).json({
          error: "You have already submitted work for this milestone",
        });
        return;
      }
      next(err);
    }
  },

  async gradeSubmission(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const gradedBy = req.user!.userId;
      const { score, feedback } = req.body;

      if (
        typeof score !== "number" ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > 100
      ) {
        res.status(400).json({
          error: "Score must be between 0 and 100",
        });
        return;
      }

      const submission = await Submission.findOne({
        where: { id },
        include: [
          {
            model: Milestone,
            as: "milestone",
            attributes: ["id", "title"],
            required: true,
            include: ownedModuleInclude(gradedBy),
          },
        ],
      });

      if (!submission) {
        res.status(404).json({ error: "Submission not found" });
        return;
      }

      await submission.update({
        score,
        feedback: feedback ? xss(feedback) : undefined,
        gradedBy,
        status: "graded",
        gradedAt: new Date(),
      });

      res.json({ data: submission });
    } catch (err) {
      next(err);
    }
  },

  async getMyGrades(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const studentId = req.user!.userId;

      const submissions = await Submission.findAll({
        where: { studentId, status: "graded" },
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

      res.json({ data: submissions });
    } catch (err) {
      next(err);
    }
  },
};
