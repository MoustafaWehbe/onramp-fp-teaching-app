import { Router } from "express";
import { lessonController } from "../controllers/lesson.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { lessonResourceController } from "../controllers/lesson-resource.controller";
import { requireLessonAccess } from "../middleware/lesson-resource-access";
import { createError } from "../middleware/error-handler";
import { MAX_PDF_BYTES } from "../services/pdf-extraction.service";

const router = Router({ mergeParams: true });
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES, files: 1 },
}).single("file");

function parsePdfUpload(req: Request, res: Response, next: NextFunction): void {
  pdfUpload(req, res, (error) => {
    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      next(createError("PDF files must be 5 MiB or smaller", 422));
      return;
    }
    if (error) {
      next(createError("The PDF upload could not be processed", 422));
      return;
    }
    next();
  });
}

router.get(
  "/:lessonId/resources",
  authenticate,
  requireLessonAccess(),
  lessonResourceController.list,
);
router.post(
  "/:lessonId/resources",
  authenticate,
  requireLessonAccess(true),
  lessonResourceController.enforceResourceLimit,
  parsePdfUpload,
  lessonResourceController.upload,
);
router.get(
  "/:lessonId/resources/:resourceId/download",
  authenticate,
  requireLessonAccess(),
  lessonResourceController.download,
);
router.delete(
  "/:lessonId/resources/:resourceId",
  authenticate,
  requireLessonAccess(true),
  lessonResourceController.remove,
);
router.post(
  "/:lessonId/resources/:resourceId/reindex",
  authenticate,
  requireLessonAccess(true),
  lessonResourceController.reindex,
);
router.post(
  "/:lessonId/summary",
  authenticate,
  requireLessonAccess(),
  lessonResourceController.summarize,
);

router.get("/", authenticate, lessonController.getLessons);
router.post(
  "/",
  authenticate,
  authorize("instructor"),
  lessonController.createLesson,
);
router.get("/:id", authenticate, lessonController.getLesson);
router.put(
  "/:id",
  authenticate,
  authorize("instructor"),
  lessonController.updateLesson,
);
router.delete(
  "/:id",
  authenticate,
  authorize("instructor"),
  lessonController.deleteLesson,
);

export { router as lessonRouter };
