import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../hooks/useAuth";
import { apiClient } from "../../lib/api-client";
import type { Course } from "../../lib/courses-api";
import { renderWithProviders, response } from "../../test/test-utils";
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
const modules = [
  {
    id: "module-2",
    courseId: course.id,
    title: "Backend APIs",
    order: 2,
  },
  {
    id: "module-1",
    courseId: course.id,
    title: "Frontend Foundations",
    order: 1,
  },
];

function mockCoursePage(moduleData: unknown = modules) {
  getMock.mockImplementation((url) => {
    if (url === `/courses/${course.id}`) return response(course);
    if (url === `/courses/${course.id}/modules`) return response(moduleData);
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
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
    mockCoursePage();
  });

  it("loads modules from the API and renders ordered module cards", async () => {
    renderCourseDetail();

    expect(
      await screen.findByRole("heading", { name: course.title }),
    ).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith(`/courses/${course.id}/modules`);

    const moduleSection = screen.getByRole("region", { name: "Modules" });
    const moduleLinks = within(moduleSection).getAllByRole("link", {
      name: "Open Module",
    });
    expect(moduleLinks).toHaveLength(2);
    expect(moduleLinks[0]).toHaveAttribute(
      "href",
      "/courses/course-1/modules/module-1",
    );
    expect(moduleLinks[1]).toHaveAttribute(
      "href",
      "/courses/course-1/modules/module-2",
    );
    expect(screen.getByText("Frontend Foundations")).toBeInTheDocument();
    expect(screen.getByText("Backend APIs")).toBeInTheDocument();
  });

  it("shows the module empty state", async () => {
    mockCoursePage([]);

    renderCourseDetail();

    expect(
      await screen.findByText(
        /No modules yet\. Course content will appear here/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows a module API failure and retries it", async () => {
    let moduleRequests = 0;
    getMock.mockImplementation((url) => {
      if (url === `/courses/${course.id}`) return response(course);
      if (url === `/courses/${course.id}/modules`) {
        moduleRequests += 1;
        return moduleRequests === 1
          ? Promise.reject(new Error("Modules unavailable"))
          : response(modules);
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    const { user } = renderCourseDetail();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Modules unavailable",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Frontend Foundations")).toBeInTheDocument();
    expect(moduleRequests).toBe(2);
  });

  it("shows the enrollment code to the course-owning instructor", async () => {
    setAuthenticatedUser("instructor", course.instructorId);

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

    renderCourseDetail();

    await screen.findByRole("heading", { name: course.title });
    expect(screen.queryByText(course.enrollmentCode!)).not.toBeInTheDocument();
  });

  it("shows a request error and retries the course request", async () => {
    let courseRequests = 0;
    getMock.mockImplementation((url) => {
      if (url === `/courses/${course.id}`) {
        courseRequests += 1;
        return courseRequests === 1
          ? Promise.reject({
              isAxiosError: true,
              message: "Request failed with status code 404",
              response: { data: { error: "Course not found" } },
            })
          : response(course);
      }
      if (url === `/courses/${course.id}/modules`) return response([]);
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    const { user } = renderCourseDetail();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Course not found",
    );
    await user.click(screen.getByRole("button", { name: "Try Again" }));

    expect(
      await screen.findByRole("heading", { name: course.title }),
    ).toBeInTheDocument();
    expect(courseRequests).toBe(2);
  });
});
