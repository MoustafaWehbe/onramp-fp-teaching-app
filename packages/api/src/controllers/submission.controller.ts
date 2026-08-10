import type { Request, Response, NextFunction } from "express";
import { Submission } from "@starter-kit/shared/db/models/Submission";
import { SubmissionLink } from "@starter-kit/shared/db/models/SubmissionLink";
import { Enrollment } from "@starter-kit/shared/db/models/Enrollment";
import { Milestone } from "@starter-kit/shared/db/models/Milestone";

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

      let submissions;

      if (role === "instructor") {
        submissions = await Submission.findAll({
          where: { milestoneId },
          include: [{ model: SubmissionLink, as: "links" }],
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

      const milestone = await Milestone.findByPk(milestoneId);

      if (!milestone) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }

      const submission = await Submission.create({
        milestoneId,
        studentId,
        status: "submitted",
        submittedAt: new Date(),
      });

      const submissionLinks = await SubmissionLink.bulkCreate(
        links.map((link: { url: string; type: string }) => ({
          submissionId: submission.id,
          url: link.url,
          type: link.type,
        })),
      );

      res.status(201).json({
        data: {
          ...submission.toJSON(),
          links: submissionLinks,
        },
      });
    } catch (err) {
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

      if (score < 0 || score > 100) {
        res.status(400).json({
          error: "Score must be between 0 and 100",
        });
        return;
      }

      const submission = await Submission.findByPk(id);

      if (!submission) {
        res.status(404).json({ error: "Submission not found" });
        return;
      }

      await submission.update({
        score,
        feedback,
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
        include: [{ model: SubmissionLink, as: "links" }],
      });

      res.json({ data: submissions });
    } catch (err) {
      next(err);
    }
  },
};
