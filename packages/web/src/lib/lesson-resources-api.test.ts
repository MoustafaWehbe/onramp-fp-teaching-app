import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import { uploadLessonResource } from "./lesson-resources-api";

vi.mock("./api-client", () => ({ apiClient: { post: vi.fn() } }));

describe("lesson resources API", () => {
  beforeEach(() => vi.resetAllMocks());

  it("uploads the PDF and optional title as FormData", async () => {
    const file = new File(["%PDF-test"], "notes.pdf", {
      type: "application/pdf",
    });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { data: { id: "resource-1" } },
    });
    await uploadLessonResource("module-1", "lesson-1", file, "Study Notes");
    const [url, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(url).toBe("/modules/module-1/lessons/lesson-1/resources");
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("file")).toBe(file);
    expect((body as FormData).get("title")).toBe("Study Notes");
  });
});
