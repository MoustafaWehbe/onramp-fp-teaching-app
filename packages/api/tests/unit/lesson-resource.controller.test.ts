import type { NextFunction, Request, Response } from "express";
import { LessonResource } from "@starter-kit/shared/db/models/LessonResource";
import { lessonResourceController } from "../../src/controllers/lesson-resource.controller";
import { indexLessonResource } from "../../src/services/ai/rag/lesson-resource-indexing.service";
import { extractPdfText } from "../../src/services/pdf-extraction.service";

jest.mock("../../src/services/ai/rag/lesson-resource-indexing.service", () => ({
  indexLessonResource: jest.fn(),
}));
jest.mock("../../src/services/pdf-extraction.service", () => ({
  ...jest.requireActual("../../src/services/pdf-extraction.service"),
  extractPdfText: jest.fn(),
}));

const indexMock = jest.mocked(indexLessonResource);
const extractMock = jest.mocked(extractPdfText);
function response() {
  const result = {
    status: jest.fn(),
    json: jest.fn(),
    setHeader: jest.fn(),
    send: jest.fn(),
  };
  result.status.mockReturnValue(result);
  return result as unknown as Response;
}
function req(overrides: Partial<Request> = {}) {
  return {
    params: {
      moduleId: "module-1",
      lessonId: "lesson-1",
      resourceId: "resource-1",
    },
    body: {},
    ...overrides,
  } as Request;
}
function resource(overrides: Partial<LessonResource> = {}) {
  const value = {
    id: "resource-1",
    lessonId: "lesson-1",
    title: "Lecture",
    originalFileName: "lecture.pdf",
    mimeType: "application/pdf",
    sizeBytes: 9,
    fileData: Buffer.from("%PDF-test"),
    extractedText: "PDF text",
    indexStatus: "pending",
    createdAt: new Date("2026-08-20T00:00:00Z"),
    updatedAt: new Date("2026-08-20T00:00:00Z"),
    update: jest.fn(async function (this: any, changes: object) {
      Object.assign(this, changes);
      return this;
    }),
    destroy: jest.fn(),
    ...overrides,
  };
  return value as unknown as LessonResource;
}

describe("lesson resource controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    extractMock.mockResolvedValue("PDF text");
    indexMock.mockResolvedValue({} as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it("returns metadata without file bytes or extracted text", async () => {
    jest.spyOn(LessonResource, "findAll").mockResolvedValue([resource()]);
    const res = response();
    await lessonResourceController.list(req(), res, jest.fn());
    const payload = (res.json as jest.Mock).mock.calls[0]![0];
    expect(payload.data[0]).toMatchObject({
      id: "resource-1",
      title: "Lecture",
      indexStatus: "pending",
    });
    expect(payload.data[0]).not.toHaveProperty("fileData");
    expect(payload.data[0]).not.toHaveProperty("extractedText");
  });

  it("enforces the ten-resource limit before upload parsing", async () => {
    jest.spyOn(LessonResource, "count").mockResolvedValue(10);
    const res = response();
    const next = jest.fn();
    await lessonResourceController.enforceResourceLimit(req(), res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it("keeps a valid uploaded PDF and marks failed when indexing is unavailable", async () => {
    const stored = resource();
    jest.spyOn(LessonResource, "create").mockResolvedValue(stored);
    indexMock.mockRejectedValueOnce(new Error("embedding unavailable"));
    const file = {
      fieldname: "file",
      originalname: "lecture.pdf",
      mimetype: "application/pdf",
      size: 9,
      buffer: Buffer.from("%PDF-test"),
    } as Express.Multer.File;
    const res = response();
    await lessonResourceController.upload(
      req({ file, body: { title: "Lecture" } } as Partial<Request>),
      res,
      jest.fn(),
    );
    expect(LessonResource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        lessonId: "lesson-1",
        fileData: file.buffer,
        extractedText: "PDF text",
      }),
    );
    expect(stored.update).toHaveBeenCalledWith({ indexStatus: "failed" });
    expect(res.status).toHaveBeenCalledWith(201);
    expect((res.json as jest.Mock).mock.calls[0]![0].data.indexStatus).toBe(
      "failed",
    );
  });

  it("rejects a resource ID that does not belong to the requested lesson", async () => {
    const findOne = jest
      .spyOn(LessonResource, "findOne")
      .mockResolvedValue(null);
    const res = response();
    await lessonResourceController.reindex(req(), res, jest.fn());
    expect(findOne).toHaveBeenCalledWith({
      where: { id: "resource-1", lessonId: "lesson-1" },
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(indexMock).not.toHaveBeenCalled();
  });

  it("streams authorized PDF bytes with a safe inline filename", async () => {
    jest
      .spyOn(LessonResource, "scope")
      .mockReturnValue({
        findOne: jest.fn(async () =>
          resource({
            originalFileName: '../bad"name.pdf',
          } as Partial<LessonResource>),
        ),
      } as never);
    const res = response();
    await lessonResourceController.download(req(), res, jest.fn());
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/pdf",
    );
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="bad_name.pdf"; filename*=UTF-8\'\'bad_name.pdf');
    expect(res.send).toHaveBeenCalledWith(Buffer.from("%PDF-test"));
  });

  it("uses an ASCII fallback and RFC 6266 Unicode filename", async () => {
    jest.spyOn(LessonResource, "scope").mockReturnValue({ findOne: jest.fn(async () => resource({ originalFileName: "講義.pdf" } as Partial<LessonResource>)) } as never);
    const res = response();
    await lessonResourceController.download(req(), res, jest.fn());
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", expect.stringMatching(/^inline; filename="__\.pdf"; filename\*=UTF-8''%E8%AC%9B%E7%BE%A9\.pdf$/u));
    expect(res.send).toHaveBeenCalled();
  });
});
