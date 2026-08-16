import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../lib/api-client";
import { renderWithProviders, response } from "../../test/test-utils";
import { ModuleDetails } from "./ModuleDetails";

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
};
const courseModule = {
  id: "module-1",
  courseId: course.id,
  title: "Frontend Foundations",
  order: 1,
};
const lessons = [
  {
    id: "lesson-2",
    moduleId: courseModule.id,
    title: "State management",
    content: "State content",
    videoUrl: null,
    starterCodeUrl: null,
    order: 2,
  },
  {
    id: "lesson-1",
    moduleId: courseModule.id,
    title: "React components",
    content: "Component content",
    videoUrl: null,
    starterCodeUrl: null,
    order: 1,
  },
];

function mockModulePage(lessonData: unknown = lessons) {
  getMock.mockImplementation((url) => {
    if (url === "/courses/course-1") return response(course);
    if (url === "/courses/course-1/modules/module-1") {
      return response(courseModule);
    }
    if (url === "/modules/module-1/lessons") return response(lessonData);
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
}

function renderModule() {
  return renderWithProviders(
    <Routes>
      <Route
        path="/courses/:courseId/modules/:moduleId"
        element={<ModuleDetails />}
      />
    </Routes>,
    { initialEntries: ["/courses/course-1/modules/module-1"] },
  );
}

describe("ModuleDetails", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockModulePage();
  });

  it("exposes the page loading skeleton as a busy status", () => {
    getMock.mockReturnValue(new Promise(() => undefined) as never);

    renderModule();

    expect(
      screen.getByRole("status", { name: "Loading module" }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("loads lessons, orders them, and creates refresh-safe lesson links", async () => {
    renderModule();

    expect(
      await screen.findByRole("heading", { name: courseModule.title }),
    ).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("/modules/module-1/lessons");

    const lessonsSection = screen.getByRole("region", { name: "Lessons" });
    const lessonLinks = within(lessonsSection).getAllByRole("link");
    expect(lessonLinks[0]).toHaveTextContent("React components");
    expect(lessonLinks[0]).toHaveAttribute(
      "href",
      "/courses/course-1/modules/module-1/lessons/lesson-1",
    );
    expect(lessonLinks[1]).toHaveTextContent("State management");
  });

  it("shows an empty state when the module has no lessons", async () => {
    mockModulePage([]);

    renderModule();

    expect(await screen.findByText(/No lessons yet/i)).toBeInTheDocument();
  });

  it("shows a lesson API error and retries it", async () => {
    let lessonRequests = 0;
    getMock.mockImplementation((url) => {
      if (url === "/courses/course-1") return response(course);
      if (url === "/courses/course-1/modules/module-1") {
        return response(courseModule);
      }
      if (url === "/modules/module-1/lessons") {
        lessonRequests += 1;
        return lessonRequests === 1
          ? Promise.reject(new Error("Lessons unavailable"))
          : response(lessons);
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    const { user } = renderModule();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Lessons unavailable",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("React components")).toBeInTheDocument();
    expect(lessonRequests).toBe(2);
  });

  it("shows a sensible not-found response for an unknown module", async () => {
    getMock.mockImplementation((url) => {
      if (url === "/courses/course-1") return response(course);
      if (url === "/courses/course-1/modules/module-1") {
        return Promise.reject({
          isAxiosError: true,
          message: "Request failed with status code 404",
          response: { data: { error: "Module not found" } },
        });
      }
      if (url === "/modules/module-1/lessons") return response([]);
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    renderModule();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Module not found",
    );
    expect(
      screen.getByRole("link", { name: "Back to Course" }),
    ).toHaveAttribute("href", "/courses/course-1");
  });
});
