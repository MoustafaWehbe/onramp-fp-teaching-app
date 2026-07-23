import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../hooks/useAuth";
import { apiClient } from "../../lib/api-client";
import type { Course } from "../../lib/courses-api";
import { renderWithProviders } from "../../test/test-utils";
import { CourseDetailPage } from "./CourseDetail";

vi.mock("../../hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const getMock = vi.mocked(apiClient.get);
const useAuthMock = vi.mocked(useAuth);

const course: Course = {
  id: "course-1",
  instructorId: "instructor-1",
  title: "Full Stack Bootcamp",
  description: "Build production-ready web applications.",
  enrollmentCode: "JOIN42",
  isPublished: true,
};

function response(data: unknown) {
  return { data: { data } };
}

function setAuthenticatedUser(
  role: "student" | "instructor",
  id = `${role}-1`,
) {
  useAuthMock.mockReturnValue({
    user: {
      id,
      role,
      name: role === "student" ? "Sam Student" : "Ivy Instructor",
      email: `${role}@example.com`,
    },
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });
}

function renderCourseDetail(path = `/courses/${course.id}`) {
  return renderWithProviders(
    <Routes>
      <Route path="/courses/:id" element={<CourseDetailPage />} />
    </Routes>,
    { initialEntries: [path] },
  );
}

describe("CourseDetailPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setAuthenticatedUser("student");
  });

  it("loads the route course and renders its details and module empty state", async () => {
    let resolveRequest!: (value: ReturnType<typeof response>) => void;
    getMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }) as never,
    );

    renderCourseDetail();

    expect(screen.getByLabelText("Loading course")).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith(`/courses/${course.id}`);

    resolveRequest(response(course));

    expect(
      await screen.findByRole("heading", { name: course.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(course.description)).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(
      screen.getByText(/No modules yet\. Course content will appear here/i),
    ).toBeInTheDocument();
  });

  it("shows the enrollment code to the course-owning instructor", async () => {
    setAuthenticatedUser("instructor", course.instructorId);
    getMock.mockResolvedValueOnce(response(course) as never);

    renderCourseDetail();

    expect(await screen.findByText(course.enrollmentCode!)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Enrollment code" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["a student", "student" as const, "student-1"],
    ["a different instructor", "instructor" as const, "instructor-2"],
  ])("hides the enrollment code from %s", async (_label, role, id) => {
    setAuthenticatedUser(role, id);
    getMock.mockResolvedValueOnce(response(course) as never);

    renderCourseDetail();

    await screen.findByRole("heading", { name: course.title });
    expect(screen.queryByText(course.enrollmentCode!)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Enrollment code" }),
    ).not.toBeInTheDocument();
  });

  it("shows a request error and retries the course request", async () => {
    getMock
      .mockRejectedValueOnce({
        isAxiosError: true,
        message: "Request failed with status code 404",
        response: { data: { error: "Course not found" } },
      })
      .mockResolvedValueOnce(response(course) as never);

    const { user } = renderCourseDetail();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Course not found",
    );
    await user.click(screen.getByRole("button", { name: "Try Again" }));

    expect(
      await screen.findByRole("heading", { name: course.title }),
    ).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(2);
  });
});
