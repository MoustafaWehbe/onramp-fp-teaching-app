import { screen, waitFor, within } from "@testing-library/react";
import { useLocation, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../hooks/useAuth";
import { apiClient } from "../../lib/api-client";
import type { Course } from "../../lib/courses-api";
import { renderWithProviders } from "../../test/test-utils";
import { CoursesPage } from "./Courses";

vi.mock("../../hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const getMock = vi.mocked(apiClient.get);
const postMock = vi.mocked(apiClient.post);
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

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderCoursesPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/courses/:id" element={<LocationProbe />} />
    </Routes>,
    { initialEntries: ["/courses"] },
  );
}

describe("CoursesPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setAuthenticatedUser("student");
  });

  it("shows a loading state, then renders courses from the API", async () => {
    let resolveRequest!: (value: ReturnType<typeof response>) => void;
    getMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }) as never,
    );

    renderCoursesPage();

    expect(screen.getByLabelText("Loading courses")).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("/courses");

    resolveRequest(response([course]));

    expect(
      await screen.findByRole("heading", { name: course.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(course.description)).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: `View ${course.title}` }),
    ).toHaveAttribute("href", `/courses/${course.id}`);
  });

  it("shows an empty state and role-appropriate controls for a student", async () => {
    getMock.mockResolvedValueOnce(response([]) as never);

    renderCoursesPage();

    expect(
      await screen.findByText(/You are not enrolled in a course yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Join Course" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create Course" }),
    ).not.toBeInTheDocument();
  });

  it("lets a failed list request be retried", async () => {
    getMock
      .mockRejectedValueOnce(new Error("Course service is unavailable."))
      .mockResolvedValueOnce(response([course]) as never);

    const { user } = renderCoursesPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Course service is unavailable.",
    );

    await user.click(screen.getByRole("button", { name: "Try Again" }));

    expect(
      await screen.findByRole("heading", { name: course.title }),
    ).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it("allows an instructor to create a course and navigates to it", async () => {
    setAuthenticatedUser("instructor");
    getMock
      .mockResolvedValueOnce(response([]) as never)
      .mockResolvedValueOnce(response([course]) as never);
    postMock.mockResolvedValueOnce(response(course) as never);

    const { user } = renderCoursesPage();

    await screen.findByText(/You have not created a course yet/i);
    expect(
      screen.queryByRole("button", { name: "Join Course" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "Create Course" })[0],
    );
    const titleInput = screen.getByLabelText("Title");
    const descriptionInput = screen.getByLabelText("Description");
    const createForm = titleInput.closest("form");
    expect(createForm).not.toBeNull();

    await user.type(titleInput, `  ${course.title}  `);
    await user.type(descriptionInput, `  ${course.description}  `);
    await user.click(
      within(createForm as HTMLFormElement).getByRole("button", {
        name: "Create Course",
      }),
    );

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith("/courses", {
        title: course.title,
        description: course.description,
      }),
    );
    expect(await screen.findByTestId("location")).toHaveTextContent(
      `/courses/${course.id}`,
    );
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it("shows API validation details when course creation fails", async () => {
    setAuthenticatedUser("instructor");
    getMock.mockResolvedValueOnce(response([]) as never);
    postMock.mockRejectedValueOnce({
      isAxiosError: true,
      message: "Request failed with status code 422",
      response: {
        data: {
          error: "Validation failed",
          details: [{ field: "title", message: "Title is already in use" }],
        },
      },
    });

    const { user } = renderCoursesPage();

    await screen.findByText(/You have not created a course yet/i);
    await user.click(
      screen.getAllByRole("button", { name: "Create Course" })[0],
    );
    await user.type(screen.getByLabelText("Title"), course.title);
    const createForm = screen.getByLabelText("Title").closest("form");
    await user.click(
      within(createForm as HTMLFormElement).getByRole("button", {
        name: "Create Course",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Validation failed: title: Title is already in use",
    );
  });

  it("validates a whitespace-only course title before calling the API", async () => {
    setAuthenticatedUser("instructor");
    getMock.mockResolvedValueOnce(response([]) as never);

    const { user } = renderCoursesPage();

    await screen.findByText(/You have not created a course yet/i);
    await user.click(
      screen.getAllByRole("button", { name: "Create Course" })[0],
    );
    await user.type(screen.getByLabelText("Title"), "   ");
    const createForm = screen.getByLabelText("Title").closest("form");
    await user.click(
      within(createForm as HTMLFormElement).getByRole("button", {
        name: "Create Course",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a course title.",
    );
    expect(screen.getByLabelText("Title")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(postMock).not.toHaveBeenCalled();
  });

  it("lets a student enroll and refreshes the course list", async () => {
    getMock
      .mockResolvedValueOnce(response([]) as never)
      .mockResolvedValueOnce(response([course]) as never);
    postMock.mockResolvedValueOnce(
      response({ id: "enrollment-1", courseId: course.id }) as never,
    );

    const { user } = renderCoursesPage();

    await screen.findByText(/You are not enrolled in a course yet/i);
    const codeInput = screen.getByLabelText("Enrollment code");
    await user.type(codeInput, `  ${course.enrollmentCode}  `);
    await user.click(screen.getByRole("button", { name: "Join Course" }));

    expect(postMock).toHaveBeenCalledWith("/enrollments", {
      enrollmentCode: course.enrollmentCode,
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "You joined the course successfully.",
    );
    expect(codeInput).toHaveValue("");
    expect(
      await screen.findByRole("heading", { name: course.title }),
    ).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["invalid code", "Invalid enrollment code"],
    ["duplicate enrollment", "You are already enrolled in this course"],
  ])("shows the API error for %s", async (_scenario, message) => {
    getMock.mockResolvedValueOnce(response([]) as never);
    postMock.mockRejectedValueOnce({
      isAxiosError: true,
      message: "Request failed",
      response: { data: { error: message } },
    });

    const { user } = renderCoursesPage();

    await screen.findByText(/You are not enrolled in a course yet/i);
    await user.type(screen.getByLabelText("Enrollment code"), "BADCODE");
    await user.click(screen.getByRole("button", { name: "Join Course" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Enrollment code")).toHaveValue("BADCODE");
  });

  it("validates a whitespace-only enrollment code before calling the API", async () => {
    getMock.mockResolvedValueOnce(response([]) as never);

    const { user } = renderCoursesPage();

    await screen.findByText(/You are not enrolled in a course yet/i);
    await user.type(screen.getByLabelText("Enrollment code"), "   ");
    await user.click(screen.getByRole("button", { name: "Join Course" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter an enrollment code.",
    );
    expect(screen.getByLabelText("Enrollment code")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(postMock).not.toHaveBeenCalled();
  });
});
