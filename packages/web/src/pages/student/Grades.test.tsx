import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../lib/api-client";
import { renderWithProviders } from "../../test/test-utils";
import { GradesPage } from "./Grades";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const getMock = vi.mocked(apiClient.get);

const grade = {
  id: "submission-1",
  milestoneId: "milestone-1",
  studentId: "student-1",
  status: "graded",
  score: 94,
  feedback: "Helpful <strong>feedback</strong>",
  submittedAt: "2026-08-10T10:00:00.000Z",
  gradedAt: "2026-08-11T12:30:00.000Z",
  milestone: {
    id: "milestone-1",
    title: "Build a portfolio",
    module: {
      id: "module-1",
      title: "Frontend foundations",
      course: { id: "course-1", title: "Full Stack Bootcamp" },
    },
  },
  links: [
    {
      id: "link-1",
      submissionId: "submission-1",
      type: "github",
      url: "https://github.com/student/portfolio",
    },
    {
      id: "link-2",
      submissionId: "submission-1",
      type: "other",
      url: "javascript:alert(1)",
    },
  ],
};

function response(data: unknown) {
  return { data: { data } } as never;
}

describe("GradesPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("exposes a loading state while grades are requested", () => {
    getMock.mockReturnValue(new Promise(() => undefined) as never);

    renderWithProviders(<GradesPage />);

    expect(
      screen.getByRole("status", { name: "Loading grades" }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("shows the gradebook empty state for an empty API response", async () => {
    getMock.mockResolvedValueOnce(response([]));

    renderWithProviders(<GradesPage />);

    expect(await screen.findByText(/No grades yet/i)).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("/submissions/my/grades");
  });

  it("shows a retryable error instead of mock grades", async () => {
    getMock
      .mockRejectedValueOnce(new Error("Grade service unavailable"))
      .mockResolvedValueOnce(response([]));
    const { user } = renderWithProviders(<GradesPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load grades.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Grade service unavailable",
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/No grades yet/i)).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it("renders real score, feedback, context, status, and dates", async () => {
    getMock.mockResolvedValueOnce(response([grade]));

    const { container } = renderWithProviders(<GradesPage />);

    expect(
      await screen.findByRole("heading", { name: "Build a portfolio" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Full Stack Bootcamp · Frontend foundations"),
    ).toBeInTheDocument();
    expect(screen.getByText("94/100")).toBeInTheDocument();
    expect(screen.getByText("Graded")).toBeInTheDocument();
    expect(
      screen.getByText("Helpful <strong>feedback</strong>"),
    ).toBeInTheDocument();
    expect(container.querySelector("strong")).toBeNull();
    expect(screen.getByText("Submitted:").parentElement).toHaveTextContent(
      "Aug 10, 2026",
    );
    expect(screen.getByText("Graded:").parentElement).toHaveTextContent(
      "Aug 11, 2026",
    );
  });

  it("links safe HTTP submissions and renders unsafe legacy URLs as text", async () => {
    getMock.mockResolvedValueOnce(response([grade]));

    renderWithProviders(<GradesPage />);

    const safeLink = await screen.findByRole("link", {
      name: /GitHub.*github.com\/student\/portfolio/i,
    });
    expect(safeLink).toHaveAttribute(
      "href",
      "https://github.com/student/portfolio",
    );
    expect(safeLink).toHaveAttribute("target", "_blank");
    expect(safeLink).toHaveAttribute("rel", "noreferrer");

    const unsafeText = screen.getByText("javascript:alert(1)");
    expect(unsafeText.closest("a")).toBeNull();
  });

  it("handles boundary scores, empty feedback, multiple grades, and long content", async () => {
    const longFeedback = "Detailed feedback ".repeat(80);
    getMock.mockResolvedValueOnce(
      response([
        { ...grade, id: "zero", score: 0, feedback: "   ", links: [] },
        {
          ...grade,
          id: "perfect",
          score: 100,
          feedback: longFeedback,
          links: [
            {
              id: "long-link",
              submissionId: "perfect",
              type: "deployment",
              url: `https://example.com/${"very-long-path/".repeat(30)}`,
            },
          ],
        },
      ]),
    );

    renderWithProviders(<GradesPage />);

    expect(await screen.findByText("0/100")).toBeInTheDocument();
    expect(screen.getByText("100/100")).toBeInTheDocument();
    expect(screen.getByText("No feedback was provided.")).toBeInTheDocument();
    expect(screen.getByText(longFeedback.trim())).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { name: "Build a portfolio" }),
    ).toHaveLength(2);
  });
});
