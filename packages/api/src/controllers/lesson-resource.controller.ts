import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import { KnowledgeChunk } from "@starter-kit/shared/db/models/KnowledgeChunk";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";
import { LessonResource } from "@starter-kit/shared/db/models/LessonResource";
import { createError } from "../middleware/error-handler";
import { indexLessonResource } from "../services/ai/rag/lesson-resource-indexing.service";
import { generateLessonSummary } from "../services/ai/lesson-summary.service";
import {
  extractPdfText,
  validatePdfUpload,
} from "../services/pdf-extraction.service";

export const MAX_RESOURCES_PER_LESSON = 10;

function metadata(resource: LessonResource) {
  return {
    id: resource.id,
    lessonId: resource.lessonId,
    title: resource.title,
    originalFileName: resource.originalFileName,
    mimeType: resource.mimeType,
    sizeBytes: resource.sizeBytes,
    indexStatus: resource.indexStatus,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };
}

function safeFileName(value: string): string {
  return (
    path
      .basename(value)
      .replace(/[\r\n"\\]/gu, "_")
      .slice(0, 255) || "resource.pdf"
  );
}

function asciiFileName(value: string): string {
  const basename = safeFileName(value)
    .replace(/[^\x20-\x7E]/gu, "_")
    .replace(/^\.+/u, "")
    .slice(0, 255);
  return basename || "resource.pdf";
}

async function findScopedResource(req: Request, includeFile = false) {
  const model = includeFile ? LessonResource.scope("withFile") : LessonResource;
  return model.findOne({
    where: {
      id: req.params.resourceId as string,
      lessonId: req.params.lessonId as string,
    },
  });
}

export const lessonResourceController = {
  async enforceResourceLimit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const count = await LessonResource.count({
        where: { lessonId: req.params.lessonId as string },
      });
      if (count >= MAX_RESOURCES_PER_LESSON) {
        res
          .status(422)
          .json({ error: "A lesson can have at most 10 resources" });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resources = await LessonResource.findAll({
        where: { lessonId: req.params.lessonId as string },
        order: [["createdAt", "ASC"]],
      });
      res.json({ data: resources.map(metadata) });
    } catch (error) {
      next(error);
    }
  },

  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      validatePdfUpload(req.file);
      const file = req.file;
      const extractedText = await extractPdfText(file.buffer);
      const originalFileName = safeFileName(file.originalname);
      const suppliedTitle =
        typeof req.body.title === "string" ? req.body.title.trim() : "";
      const title = (suppliedTitle || path.parse(originalFileName).name).slice(
        0,
        255,
      );
      if (!title) throw createError("Resource title is required", 422);
      const sequelize = LessonResource.sequelize;
      if (!sequelize)
        throw new Error("LessonResource model is not initialized");
      const lessonId = req.params.lessonId as string;
      const resource = await sequelize.transaction(async (transaction) => {
        const lesson = await Lesson.findByPk(lessonId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!lesson) throw createError("Lesson not found", 404);
        const count = await LessonResource.count({
          where: { lessonId },
          transaction,
        });
        if (count >= MAX_RESOURCES_PER_LESSON) {
          throw createError("A lesson can have at most 10 resources", 422);
        }
        return LessonResource.create(
          {
            lessonId,
            title,
            originalFileName,
            mimeType: "application/pdf",
            sizeBytes: file.size,
            fileData: file.buffer,
            extractedText,
            indexStatus: "pending",
          },
          { transaction },
        );
      });
      try {
        await indexLessonResource(resource.id);
        await resource.update({ indexStatus: "ready" });
      } catch (error) {
        console.error("Lesson resource indexing failed", {
          resourceId: resource.id,
          error,
        });
        await resource.update({ indexStatus: "failed" });
      }
      res.status(201).json({ data: metadata(resource) });
    } catch (error) {
      next(error);
    }
  },

  async download(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const resource = await findScopedResource(req, true);
      if (!resource) {
        res.status(404).json({ error: "Resource not found" });
        return;
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${asciiFileName(resource.originalFileName)}"; filename*=UTF-8''${encodeURIComponent(safeFileName(resource.originalFileName))}`,
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.send(resource.fileData);
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resource = await findScopedResource(req);
      if (!resource) {
        res.status(404).json({ error: "Resource not found" });
        return;
      }
      const sequelize = LessonResource.sequelize;
      if (!sequelize)
        throw new Error("LessonResource model is not initialized");
      await sequelize.transaction(async (transaction) => {
        await KnowledgeChunk.destroy({
          where: { resourceId: resource.id },
          transaction,
        });
        await resource.destroy({ transaction });
      });
      res.json({ data: { message: "Resource deleted successfully" } });
    } catch (error) {
      next(error);
    }
  },

  async reindex(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const resource = await findScopedResource(req);
      if (!resource) {
        res.status(404).json({ error: "Resource not found" });
        return;
      }
      await resource.update({ indexStatus: "pending" });
      try {
        await indexLessonResource(resource.id);
        await resource.update({ indexStatus: "ready" });
      } catch (error) {
        console.error("Lesson resource reindexing failed", {
          resourceId: resource.id,
          error,
        });
        await resource.update({ indexStatus: "failed" });
        throw createError(
          "Resource AI indexing is temporarily unavailable",
          503,
        );
      }
      res.json({ data: metadata(resource) });
    } catch (error) {
      next(error);
    }
  },

  async summarize(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await generateLessonSummary(req.params.lessonId as string);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },
};
