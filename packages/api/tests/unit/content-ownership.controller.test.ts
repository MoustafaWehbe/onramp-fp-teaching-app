import type { NextFunction, Request, Response } from "express";
import { Course } from "@starter-kit/shared/db/models/Course";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";
import { Module } from "@starter-kit/shared/db/models/Module";
import { KnowledgeChunk } from "@starter-kit/shared/db/models/KnowledgeChunk";
import { lessonController } from "../../src/controllers/lesson.controller";
import { moduleController } from "../../src/controllers/module.controller";

function responseMock() {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

function request(
  params: Record<string, string>,
  body: Record<string, unknown> = {},
  userId = "instructor-1",
) {
  return { params, body, user: { userId, role: "instructor" } } as unknown as Request;
}

const ownerCourse = { id: "course-1", instructorId: "instructor-1" } as Course;
const otherCourse = { id: "course-2", instructorId: "instructor-2" } as Course;
const ownerModule = { id: "module-1", courseId: "course-1" } as Module;
const secondOwnerModule = { id: "module-2", courseId: "course-1" } as Module;

describe("module and lesson ownership", () => {
  beforeEach(() => {
    Object.defineProperty(Lesson, "sequelize", {
      configurable: true,
      value: { transaction: async (callback: (transaction: object) => Promise<void>) => callback({ id: "transaction-1" }) },
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(["student-1", "instructor-2"])("rejects module creation by %s", async (userId) => {
    jest.spyOn(Course, "findByPk").mockResolvedValue(ownerCourse);
    const create = jest.spyOn(Module, "create");
    const response = responseMock();
    await moduleController.createModule(request({ courseId: "course-1" }, { title: "New module" }, userId), response, jest.fn() as NextFunction);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(create).not.toHaveBeenCalled();
  });

  it("allows the owner to create, update, and delete a module", async () => {
    const create = jest.spyOn(Module, "create").mockResolvedValue({ id: "module-3" } as Module);
    jest.spyOn(Course, "findByPk").mockResolvedValue(ownerCourse);
    await moduleController.createModule(request({ courseId: "course-1" }, { title: "New module", order: 2 }), responseMock(), jest.fn() as NextFunction);
    expect(create).toHaveBeenCalledWith({ courseId: "course-1", title: "New module", order: 2 });

    const update = jest.fn();
    const destroy = jest.fn();
    jest.spyOn(Module, "findOne").mockResolvedValue({ ...ownerModule, update, destroy } as unknown as Module);
    await moduleController.updateModule(request({ courseId: "course-1", id: "module-1" }, { title: "Updated", order: 3 }), responseMock(), jest.fn() as NextFunction);
    await moduleController.deleteModule(request({ courseId: "course-1", id: "module-1" }), responseMock(), jest.fn() as NextFunction);
    expect(update).toHaveBeenCalledWith({ title: "Updated", order: 3 });
    expect(destroy).toHaveBeenCalled();
  });

  it.each(["student-1", "instructor-2"])("rejects lesson creation by %s", async (userId) => {
    jest.spyOn(Module, "findByPk").mockResolvedValue(ownerModule);
    jest.spyOn(Course, "findByPk").mockResolvedValue(ownerCourse);
    const create = jest.spyOn(Lesson, "create");
    const response = responseMock();
    await lessonController.createLesson(request({ moduleId: "module-1" }, { title: "New lesson" }, userId), response, jest.fn() as NextFunction);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects lesson creation in another instructor's module", async () => {
    jest.spyOn(Module, "findByPk").mockResolvedValue({ id: "module-3", courseId: "course-2" } as Module);
    jest.spyOn(Course, "findByPk").mockResolvedValue(otherCourse);
    const response = responseMock();
    await lessonController.createLesson(request({ moduleId: "module-3" }, { title: "Blocked" }), response, jest.fn() as NextFunction);
    expect(response.status).toHaveBeenCalledWith(403);
  });

  it("allows an owner to update and delete a lesson", async () => {
    const update = jest.fn();
    const destroy = jest.fn();
    jest.spyOn(Lesson, "findOne").mockResolvedValue({ id: "lesson-1", moduleId: "module-1", update, destroy } as unknown as Lesson);
    jest.spyOn(Module, "findByPk").mockResolvedValue(ownerModule);
    jest.spyOn(Course, "findByPk").mockResolvedValue(ownerCourse);
    await lessonController.updateLesson(request({ moduleId: "module-1", id: "lesson-1" }, { title: "Updated", content: "", videoUrl: null, starterCodeUrl: null, order: 2 }), responseMock(), jest.fn() as NextFunction);
    await lessonController.deleteLesson(request({ moduleId: "module-1", id: "lesson-1" }), responseMock(), jest.fn() as NextFunction);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ title: "Updated", moduleId: "module-1" }), { transaction: { id: "transaction-1" } });
    expect(destroy).toHaveBeenCalled();
  });

  it("moves a lesson within the owner's course and reassigns indexed chunks", async () => {
    const update = jest.fn();
    jest.spyOn(Lesson, "findOne").mockResolvedValue({ id: "lesson-1", moduleId: "module-1", update } as unknown as Lesson);
    jest.spyOn(Module, "findByPk").mockResolvedValueOnce(ownerModule).mockResolvedValueOnce(secondOwnerModule);
    jest.spyOn(Course, "findByPk").mockResolvedValue(ownerCourse);
    const updateChunks = jest.spyOn(KnowledgeChunk, "update").mockResolvedValue([1]);
    await lessonController.updateLesson(request({ moduleId: "module-1", id: "lesson-1" }, { title: "Moved", content: "", videoUrl: null, starterCodeUrl: null, order: 1, moduleId: "module-2" }), responseMock(), jest.fn() as NextFunction);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ moduleId: "module-2" }), { transaction: { id: "transaction-1" } });
    expect(updateChunks).toHaveBeenCalledWith({ moduleId: "module-2" }, { where: { lessonId: "lesson-1" }, transaction: { id: "transaction-1" } });
  });

  it("rolls back the lesson move when chunk metadata cannot be updated", async () => {
    const update = jest.fn();
    let rolledBack = false;
    Object.defineProperty(Lesson, "sequelize", {
      configurable: true,
      value: { transaction: async (callback: (transaction: object) => Promise<void>) => {
        try { await callback({ id: "transaction-rollback" }); } catch (error) { rolledBack = true; throw error; }
      } },
    });
    jest.spyOn(Lesson, "findOne").mockResolvedValue({ id: "lesson-1", moduleId: "module-1", update } as unknown as Lesson);
    jest.spyOn(Module, "findByPk").mockResolvedValueOnce(ownerModule).mockResolvedValueOnce(secondOwnerModule);
    jest.spyOn(Course, "findByPk").mockResolvedValue(ownerCourse);
    jest.spyOn(KnowledgeChunk, "update").mockRejectedValue(new Error("chunk update failed"));
    const next = jest.fn();
    await lessonController.updateLesson(request({ moduleId: "module-1", id: "lesson-1" }, { title: "Moved", moduleId: "module-2" }), responseMock(), next as NextFunction);
    expect(rolledBack).toBe(true);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "chunk update failed" }));
  });

  it("rejects a lesson move to a module in another course before mutation", async () => {
    const update = jest.fn();
    jest.spyOn(Lesson, "findOne").mockResolvedValue({ id: "lesson-1", moduleId: "module-1", update } as unknown as Lesson);
    jest.spyOn(Module, "findByPk").mockResolvedValueOnce(ownerModule).mockResolvedValueOnce({ id: "module-3", courseId: "course-2" } as Module);
    jest.spyOn(Course, "findByPk").mockResolvedValue(ownerCourse);
    const response = responseMock();
    await lessonController.updateLesson(request({ moduleId: "module-1", id: "lesson-1" }, { title: "Blocked", moduleId: "module-3" }), response, jest.fn() as NextFunction);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a lesson move when the destination module does not exist", async () => {
    const update = jest.fn();
    jest.spyOn(Lesson, "findOne").mockResolvedValue({ id: "lesson-1", moduleId: "module-1", update } as unknown as Lesson);
    jest.spyOn(Module, "findByPk").mockResolvedValueOnce(ownerModule).mockResolvedValueOnce(null);
    jest.spyOn(Course, "findByPk").mockResolvedValue(ownerCourse);
    const response = responseMock();
    await lessonController.updateLesson(request({ moduleId: "module-1", id: "lesson-1" }, { title: "Blocked", moduleId: "missing-module" }), response, jest.fn() as NextFunction);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Destination module not found" });
    expect(update).not.toHaveBeenCalled();
  });
});
