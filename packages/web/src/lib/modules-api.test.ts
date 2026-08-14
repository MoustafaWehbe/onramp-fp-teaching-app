import { beforeEach, describe, expect, it, vi } from "vitest";
import { response } from "../test/test-utils";
import { apiClient } from "./api-client";
import { getLesson, getLessons, getModule, getModules } from "./modules-api";

vi.mock("./api-client", () => ({
  apiClient: { get: vi.fn() },
}));

const getMock = vi.mocked(apiClient.get);

describe("modules API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("encodes course IDs and orders normalized modules", async () => {
    getMock.mockReturnValueOnce(
      response([
        { id: "module-2", courseId: "course/id", title: "Second", order: 2 },
        { id: "module-1", courseId: "course/id", title: "First", order: 1 },
      ]),
    );

    const modules = await getModules("course/id");

    expect(getMock).toHaveBeenCalledWith("/courses/course%2Fid/modules");
    expect(modules.map((module) => module.id)).toEqual([
      "module-1",
      "module-2",
    ]);
  });

  it("loads one module using both refresh-safe identifiers", async () => {
    getMock.mockReturnValueOnce(
      response({
        id: "module/1",
        courseId: "course/1",
        title: "Frontend",
        order: 1,
      }),
    );

    await expect(getModule("course/1", "module/1")).resolves.toMatchObject({
      id: "module/1",
      courseId: "course/1",
    });
    expect(getMock).toHaveBeenCalledWith(
      "/courses/course%2F1/modules/module%2F1",
    );
  });

  it("orders lessons and normalizes nullable optional content", async () => {
    getMock.mockReturnValueOnce(
      response([
        {
          id: "lesson-2",
          moduleId: "module-1",
          title: "Second",
          content: null,
          videoUrl: null,
          starterCodeUrl: null,
          order: 2,
        },
        {
          id: "lesson-1",
          moduleId: "module-1",
          title: "First",
          content: "# First",
          videoUrl: "",
          starterCodeUrl: null,
          order: 1,
        },
      ]),
    );

    const lessons = await getLessons("module-1");

    expect(lessons.map((lesson) => lesson.id)).toEqual([
      "lesson-1",
      "lesson-2",
    ]);
    expect(lessons[1].content).toBe("");
    expect(lessons[0].videoUrl).toBeNull();
  });

  it("loads one lesson and rejects malformed responses", async () => {
    getMock
      .mockReturnValueOnce(
        response({
          id: "lesson-1",
          moduleId: "module-1",
          title: "Lesson",
          content: null,
          videoUrl: null,
          starterCodeUrl: null,
          order: 1,
        }),
      )
      .mockReturnValueOnce(response(null));

    await expect(getLesson("module-1", "lesson-1")).resolves.toMatchObject({
      id: "lesson-1",
      content: "",
    });
    await expect(getLesson("module-1", "missing")).rejects.toThrow(
      "invalid lesson response",
    );
  });
});
