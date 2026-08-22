import {
  extractPdfText,
  normalizeExtractedText,
  validatePdfUpload,
} from "../../src/services/pdf-extraction.service";

function file(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    fieldname: "file",
    originalname: "notes.pdf",
    encoding: "7bit",
    mimetype: "application/pdf",
    size: 9,
    buffer: Buffer.from("%PDF-test"),
    stream: undefined as never,
    destination: "",
    filename: "",
    path: "",
    ...overrides,
  };
}

describe("PDF upload validation", () => {
  it("requires a file and enforces size, MIME, extension, and PDF magic", () => {
    expect(() => validatePdfUpload()).toThrow("required");
    expect(() =>
      validatePdfUpload(file({ size: 5 * 1024 * 1024 + 1 })),
    ).toThrow("5 MiB");
    expect(() => validatePdfUpload(file({ mimetype: "text/plain" }))).toThrow(
      "Only PDF",
    );
    expect(() =>
      validatePdfUpload(file({ originalname: "notes.txt" })),
    ).toThrow(".pdf");
    expect(() =>
      validatePdfUpload(file({ buffer: Buffer.from("not pdf") })),
    ).toThrow("valid PDF");
    expect(() => validatePdfUpload(file())).not.toThrow();
  });

  it("normalizes CRLF and outer whitespace", () => {
    expect(normalizeExtractedText("  first\r\nsecond \r\n\r\n  ")).toBe(
      "first\nsecond",
    );
  });

  it("rejects PDFs without extractable text and always destroys the parser", async () => {
    const destroy = jest.fn(async () => undefined);
    await expect(
      extractPdfText(Buffer.from("%PDF-test"), () => ({
        getText: jest.fn(async () => ({ text: " \n\t " })),
        destroy,
      })),
    ).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringContaining("no extractable text"),
    });
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
