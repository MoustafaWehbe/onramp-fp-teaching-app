import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../hooks/useAuth";
import { apiClient } from "../../lib/api-client";
import { renderWithProviders, response } from "../../test/test-utils";
import { LessonDetails } from "./LessonDetails";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));
vi.mock("../../hooks/useAuth", () => ({ useAuth: vi.fn() }));

const getMock = vi.mocked(apiClient.get);
const useAuthMock = vi.mocked(useAuth);
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
const lesson = {
  id: "lesson-1",
  moduleId: courseModule.id,
  title: "React components",
  content: [
    "# Build a component",
    "",
    "Use **props** to make components reusable.",
    "",
    "- Create a component",
    "- Pass a prop",
    "",
    "Read the [React guide](https://react.dev/learn).",
    "",
    "```tsx",
    "export function Greeting() {",
    "  return <h1>Hello</h1>;",
    "}",
    "```",
  ].join("\n"),
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  starterCodeUrl: "https://github.com/example/react-starter",
  order: 1,
};

function mockLessonPage(lessonData: unknown = lesson) {
  getMock.mockImplementation((url) => {
    if (url === "/courses/course-1") return response(course);
    if (url === "/courses/course-1/modules/module-1") {
      return response(courseModule);
    }
    if (url === "/modules/module-1/lessons/lesson-1") {
      return response(lessonData);
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
}

function renderLesson() {
  return renderWithProviders(
    <Routes>
      <Route
        path="/courses/:courseId/modules/:moduleId/lessons/:lessonId"
        element={<LessonDetails />}
      />
    </Routes>,
    {
      initialEntries: ["/courses/course-1/modules/module-1/lessons/lesson-1"],
    },
  );
}

describe("LessonDetails", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAuthMock.mockReturnValue({
      user: {
        id: "student-1",
        role: "student",
        name: "Sam Student",
        email: "student@example.com",
      },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    mockLessonPage();
  });

  it("loads the actual lesson and renders Markdown safely", async () => {
    renderLesson();

    expect(
      await screen.findByRole("heading", { name: lesson.title, level: 1 }),
    ).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("/modules/module-1/lessons/lesson-1");
    expect(
      screen.getByRole("heading", { name: "Build a component" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Create a component")).toBeInTheDocument();
    expect(screen.getByText(/export function Greeting/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "React guide" })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(screen.getByRole("link", { name: "React guide" })).toHaveAttribute(
      "rel",
      "noreferrer",
    );
  });

  it("shows a safe YouTube embed and starter-code link when available", async () => {
    renderLesson();

    const video = await screen.findByTitle(`${lesson.title} video`);
    expect(video).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    const starterLink = screen.getByRole("link", {
      name: /Open Starter Code/i,
    });
    expect(starterLink).toHaveAttribute("href", lesson.starterCodeUrl);
    expect(starterLink).toHaveAttribute("target", "_blank");
    expect(starterLink).toHaveAttribute("rel", "noreferrer");
  });

  it("omits optional media sections when URLs are absent", async () => {
    mockLessonPage({ ...lesson, videoUrl: null, starterCodeUrl: null });

    renderLesson();

    await screen.findByRole("heading", { name: lesson.title, level: 1 });
    expect(
      screen.queryByRole("heading", { name: "Video" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Open Starter Code/i }),
    ).not.toBeInTheDocument();
  });

  it("uses an external link instead of embedding an unsupported video provider", async () => {
    mockLessonPage({
      ...lesson,
      videoUrl: "https://videos.example.com/watch/1",
    });

    renderLesson();

    const watchLink = await screen.findByRole("link", { name: /Watch Video/i });
    expect(watchLink).toHaveAttribute(
      "href",
      "https://videos.example.com/watch/1",
    );
    expect(watchLink).toHaveAttribute("target", "_blank");
    expect(
      screen.queryByTitle(`${lesson.title} video`),
    ).not.toBeInTheDocument();
  });

  it("does not render unsafe video URLs", async () => {
    mockLessonPage({
      ...lesson,
      videoUrl: "javascript:alert(1)",
      starterCodeUrl: null,
    });

    renderLesson();

    await screen.findByRole("heading", { name: lesson.title, level: 1 });
    expect(
      screen.queryByRole("link", { name: /Watch Video/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTitle(`${lesson.title} video`),
    ).not.toBeInTheDocument();
  });

  it("rejects protocol-relative links in lesson Markdown", async () => {
    mockLessonPage({
      ...lesson,
      content: "Read the [unsafe guide](//evil.example/path).",
      videoUrl: null,
      starterCodeUrl: null,
    });

    renderLesson();

    await screen.findByRole("heading", { name: lesson.title, level: 1 });
    expect(screen.getByText("unsafe guide")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "unsafe guide" }),
    ).not.toBeInTheDocument();
  });

  it("shows a sensible not-found response for an unknown lesson", async () => {
    getMock.mockImplementation((url) => {
      if (url === "/courses/course-1") return response(course);
      if (url === "/courses/course-1/modules/module-1") {
        return response(courseModule);
      }
      if (url === "/modules/module-1/lessons/lesson-1") {
        return Promise.reject({
          isAxiosError: true,
          message: "Request failed with status code 404",
          response: { data: { error: "Lesson not found" } },
        });
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    renderLesson();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Lesson not found",
    );
    expect(
      screen.getByRole("link", { name: "Back to Module" }),
    ).toHaveAttribute("href", "/courses/course-1/modules/module-1");
  });
});
