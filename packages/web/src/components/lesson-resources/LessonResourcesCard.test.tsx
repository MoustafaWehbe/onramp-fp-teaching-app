import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/test-utils";
import {
  deleteLessonResource,
  listLessonResources,
  reindexLessonResource,
  uploadLessonResource,
} from "../../lib/lesson-resources-api";
import { LessonResourcesCard } from "./LessonResourcesCard";

vi.mock("../../lib/lesson-resources-api", async () => {
  const actual = await vi.importActual<
    typeof import("../../lib/lesson-resources-api")
  >("../../lib/lesson-resources-api");
  return {
    ...actual,
    listLessonResources: vi.fn(),
    uploadLessonResource: vi.fn(),
    deleteLessonResource: vi.fn(),
    reindexLessonResource: vi.fn(),
  };
});

const listMock = vi.mocked(listLessonResources);
const uploadMock = vi.mocked(uploadLessonResource);
const deleteMock = vi.mocked(deleteLessonResource);
const reindexMock = vi.mocked(reindexLessonResource);
const resource = {
  id: "resource-1",
  lessonId: "lesson-1",
  title: "Lecture Notes",
  originalFileName: "lecture.pdf",
  mimeType: "application/pdf" as const,
  sizeBytes: 2048,
  indexStatus: "failed" as const,
  createdAt: "2026-08-20T00:00:00Z",
  updatedAt: "2026-08-20T00:00:00Z",
};

describe("LessonResourcesCard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    listMock.mockResolvedValue([resource]);
    uploadMock.mockResolvedValue({ ...resource, indexStatus: "ready" });
    deleteMock.mockResolvedValue();
    reindexMock.mockResolvedValue({ ...resource, indexStatus: "ready" });
  });

  it("renders resources and an authenticated open link without student mutation controls", async () => {
    renderWithProviders(
      <LessonResourcesCard
        moduleId="module-1"
        lessonId="lesson-1"
        canManage={false}
      />,
    );
    expect(await screen.findByText("Lecture Notes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open PDF/ })).toHaveAttribute(
      "href",
      "/api/modules/module-1/lessons/lesson-1/resources/resource-1/download",
    );
    expect(
      screen.queryByRole("button", { name: /Upload PDF/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Delete/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Retry AI Indexing/ }),
    ).not.toBeInTheDocument();
  });

  it("lets an instructor upload and refresh the list", async () => {
    const view = renderWithProviders(
      <LessonResourcesCard moduleId="module-1" lessonId="lesson-1" canManage />,
    );
    await screen.findByText("Lecture Notes");
    await view.user.type(
      screen.getByLabelText("Optional title"),
      "Extra Notes",
    );
    const file = new File(["%PDF-test"], "notes.pdf", {
      type: "application/pdf",
    });
    await view.user.upload(screen.getByLabelText(/PDF file/), file);
    fireEvent.submit(
      screen.getByRole("button", { name: "Upload PDF" }).closest("form")!,
    );
    await waitFor(() =>
      expect(uploadMock).toHaveBeenCalledWith(
        "module-1",
        "lesson-1",
        file,
        "Extra Notes",
      ),
    );
    expect(screen.getByLabelText(/PDF file/)).toHaveValue("");
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("shows failed indexing and allows retry and delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const view = renderWithProviders(
      <LessonResourcesCard moduleId="module-1" lessonId="lesson-1" canManage />,
    );
    expect(await screen.findByText(/AI indexing failed/)).toBeInTheDocument();
    await view.user.click(
      screen.getByRole("button", { name: /Retry AI Indexing/ }),
    );
    await waitFor(() =>
      expect(reindexMock).toHaveBeenCalledWith(
        "module-1",
        "lesson-1",
        "resource-1",
      ),
    );
    await view.user.click(
      screen.getByRole("button", { name: "Delete Lecture Notes" }),
    );
    await waitFor(() =>
      expect(deleteMock).toHaveBeenCalledWith(
        "module-1",
        "lesson-1",
        "resource-1",
      ),
    );
  });

  it("offers a safe retry after list failure", async () => {
    listMock
      .mockRejectedValueOnce(new Error("temporarily unavailable"))
      .mockResolvedValueOnce([]);
    const view = renderWithProviders(
      <LessonResourcesCard
        moduleId="module-1"
        lessonId="lesson-1"
        canManage={false}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "temporarily unavailable",
    );
    await view.user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/No PDF resources/)).toBeInTheDocument();
  });
});
