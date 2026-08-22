import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateLessonSummary } from "../../lib/lesson-resources-api";
import { renderWithProviders } from "../../test/test-utils";
import { LessonSummaryCard } from "./LessonSummaryCard";

vi.mock("../../lib/lesson-resources-api", () => ({
  generateLessonSummary: vi.fn(),
}));
const generateMock = vi.mocked(generateLessonSummary);
const result = {
  type: "summary" as const,
  lessonId: "lesson-1",
  summary: "# Lesson Overview\n\nUse **React Query**.",
  sources: [{ type: "lesson" as const, id: "lesson-1", title: "Intro" }],
};

describe("LessonSummaryCard", () => {
  beforeEach(() => vi.resetAllMocks());

  it("starts idle, shows loading, renders Markdown, and regenerates", async () => {
    let resolve!: (value: typeof result) => void;
    generateMock
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      )
      .mockResolvedValueOnce(result);
    const view = renderWithProviders(
      <LessonSummaryCard moduleId="module-1" lessonId="lesson-1" />,
    );
    await view.user.click(
      screen.getByRole("button", { name: "Generate Summary" }),
    );
    expect(screen.getByRole("button", { name: "Generating…" })).toBeDisabled();
    resolve(result);
    expect(
      await screen.findByRole("heading", { name: "Lesson Overview" }),
    ).toBeInTheDocument();
    expect(screen.getByText("React Query")).toHaveStyle({ fontWeight: "bold" });
    await view.user.click(
      screen.getByRole("button", { name: "Regenerate Summary" }),
    );
    expect(generateMock).toHaveBeenCalledTimes(2);
  });

  it("shows a safe retryable error", async () => {
    generateMock
      .mockRejectedValueOnce(new Error("Summary unavailable"))
      .mockResolvedValueOnce(result);
    const view = renderWithProviders(
      <LessonSummaryCard moduleId="module-1" lessonId="lesson-1" />,
    );
    await view.user.click(
      screen.getByRole("button", { name: "Generate Summary" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Summary unavailable",
    );
    await view.user.click(
      screen.getByRole("button", { name: "Generate Summary" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Lesson Overview" }),
    ).toBeInTheDocument();
  });
});
