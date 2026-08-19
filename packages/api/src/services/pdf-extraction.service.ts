import { PDFParse } from "pdf-parse";
import { createError } from "../middleware/error-handler";

export const MAX_PDF_BYTES = 5 * 1024 * 1024;

export function validatePdfUpload(
  file?: Express.Multer.File,
): asserts file is Express.Multer.File {
  if (!file) throw createError("A PDF file is required", 422);
  if (file.size > MAX_PDF_BYTES)
    throw createError("PDF files must be 5 MiB or smaller", 422);
  if (file.mimetype.toLowerCase() !== "application/pdf") {
    throw createError("Only PDF files are supported", 422);
  }
  if (!file.originalname.toLowerCase().endsWith(".pdf")) {
    throw createError("The uploaded file must have a .pdf extension", 422);
  }
  if (file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw createError("The uploaded file is not a valid PDF", 422);
  }
}

export function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n?/gu, "\n")
    .replace(/[ \t]+\n/gu, "\n")
    .trim();
}

interface PdfTextParser {
  getText(): Promise<{ text?: string }>;
  destroy(): Promise<void>;
}

export async function extractPdfText(
  buffer: Buffer,
  createParser: (data: Buffer) => PdfTextParser = (data) =>
    new PDFParse({ data }),
): Promise<string> {
  const parser = createParser(buffer);
  try {
    const result = await parser.getText();
    const text = normalizeExtractedText(result.text ?? "");
    if (!text.replace(/\s/gu, "")) {
      throw createError(
        "This PDF has no extractable text. Scanned PDFs without text are not supported yet.",
        422,
      );
    }
    return text;
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) throw error;
    throw createError("The PDF could not be read", 422);
  } finally {
    await parser.destroy();
  }
}
