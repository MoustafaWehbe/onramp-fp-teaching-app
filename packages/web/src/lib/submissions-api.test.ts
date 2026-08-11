import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import { getMyGrades, getSafeHttpUrl } from "./submissions-api";

vi.mock("./api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const getMock = vi.mocked(apiClient.get);

describe("submission API safeguards", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns canonical HTTP URLs and rejects unsupported protocols", () => {
    expect(getSafeHttpUrl(" \thttps://example.com/portfolio \n")).toBe(
      "https://example.com/portfolio",
    );
    expect(getSafeHttpUrl("javascript:alert(1)")).toBeNull();
  });

  it("keeps valid grades when another record is malformed", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: "submission-1",
            milestoneId: "milestone-1",
            studentId: "student-1",
            status: "graded",
            score: 92,
            links: [],
          },
          null,
        ],
      },
    } as never);

    const grades = await getMyGrades();

    expect(grades).toHaveLength(1);
    expect(grades[0]).toMatchObject({ id: "submission-1", score: 92 });
    expect(getMock).toHaveBeenCalledWith("/submissions/my/grades");
  });

  it("rejects a non-array grades response", async () => {
    getMock.mockResolvedValueOnce({ data: { data: null } } as never);

    await expect(getMyGrades()).rejects.toThrow(
      "The server returned an invalid grades response.",
    );
  });
});
