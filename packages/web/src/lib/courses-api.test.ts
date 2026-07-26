import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import { createCourse, getCourses } from "./courses-api";

vi.mock("./api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const getMock = vi.mocked(apiClient.get);
const postMock = vi.mocked(apiClient.post);

describe("courses API response validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns a friendly error for a malformed course in a list", async () => {
    getMock.mockResolvedValueOnce({ data: { data: [null] } } as never);

    await expect(getCourses()).rejects.toThrow(
      "The server returned an invalid course response.",
    );
  });

  it("returns the same friendly error for a malformed create response", async () => {
    postMock.mockResolvedValueOnce({ data: { data: null } } as never);

    await expect(
      createCourse({ title: "Full Stack Bootcamp" }),
    ).rejects.toThrow("The server returned an invalid course response.");
  });

  it("keeps valid course normalization unchanged", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: [{ id: "course-1", title: "Full Stack Bootcamp" }],
      },
    } as never);

    await expect(getCourses()).resolves.toEqual([
      {
        id: "course-1",
        title: "Full Stack Bootcamp",
        description: "",
        isPublished: false,
      },
    ]);
  });
});
