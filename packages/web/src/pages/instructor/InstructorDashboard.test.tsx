import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../lib/api-client";
import { renderWithProviders } from "../../test/test-utils";
import { InstructorDashboard } from "./InstructorDashboard";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const getMock = vi.mocked(apiClient.get);

const course = {
  id: "course-1",
  instructorId: "instructor-1",
  title: "Full Stack Bootcamp",
  description: "Build production-ready applications.",
  isPublished: true,
  enrollmentCode: "JOIN42",
};

function response(data: unknown) {
  return { data: { data } };
}

describe("InstructorDashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows loading before rendering the instructor's courses", async () => {
    let resolveRequest!: (value: ReturnType<typeof response>) => void;
    getMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }) as never,
    );

    renderWithProviders(<InstructorDashboard />);

    expect(
      screen.getByLabelText("Loading instructor courses"),
    ).toBeInTheDocument();
    resolveRequest(response([course]));

    expect(
      await screen.findByRole("heading", { name: course.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Submissions" }),
    ).toHaveAttribute("href", "/instructor/submissions?courseId=course-1");
    expect(screen.getByRole("link", { name: "View Course" })).toHaveAttribute(
      "href",
      "/courses/course-1",
    );
  });

  it("shows an empty state when the instructor has no courses", async () => {
    getMock.mockResolvedValueOnce(response([]) as never);

    renderWithProviders(<InstructorDashboard />);

    expect(
      await screen.findByText(/You have not created a course yet/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Course" })).toHaveAttribute(
      "href",
      "/courses",
    );
  });

  it("shows a retryable API error", async () => {
    getMock.mockRejectedValueOnce(new Error("Course service unavailable"));

    renderWithProviders(<InstructorDashboard />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Course service unavailable",
    );
    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
  });
});
