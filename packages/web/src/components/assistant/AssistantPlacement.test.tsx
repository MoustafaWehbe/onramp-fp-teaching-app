import { screen, waitFor } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../hooks/useAuth";
import { AppLayout, hasSpecializedAssistant } from "../../layouts/AppLayout";
import { apiClient } from "../../lib/api-client";
import { ASSISTANT_REQUEST_TIMEOUT_MS } from "../../lib/assistant-api";
import { AppRoutes } from "../../routes";
import { renderWithProviders } from "../../test/test-utils";
import { clearAssistantConversations } from "./conversation-store";
import {
  CourseContextAssistant,
  InstructorContextAssistant,
} from "./ContextualAssistants";

vi.mock("../../hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const useAuthMock = vi.mocked(useAuth);
const getMock = vi.mocked(apiClient.get);
const postMock = vi.mocked(apiClient.post);

function setUser(role: "student" | "instructor") {
  useAuthMock.mockReturnValue({
    user: {
      id: `${role}-1`,
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

function renderInLayout(path: string, element: React.ReactNode) {
  return renderWithProviders(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="*" element={element} />
      </Route>
    </Routes>,
    { initialEntries: [path] },
  );
}

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

describe("assistant placement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearAssistantConversations();
    getMock.mockResolvedValue({ data: { data: [] } } as never);
  });

  it("recognizes routes that own a specialized assistant", () => {
    expect(hasSpecializedAssistant("/courses/course-1")).toBe(true);
    expect(hasSpecializedAssistant("/courses/course-1/modules/module-1")).toBe(
      true,
    );
    expect(hasSpecializedAssistant("/instructor/dashboard")).toBe(true);
    expect(
      hasSpecializedAssistant("/instructor/submissions/submission-1/review"),
    ).toBe(true);
    expect(hasSpecializedAssistant("/courses")).toBe(false);
    expect(hasSpecializedAssistant("/settings")).toBe(false);
  });

  it("shows the General assistant on other authenticated pages", () => {
    setUser("student");

    renderInLayout("/settings", <p>Settings content</p>);

    expect(
      screen.getByRole("button", { name: "Open MentorLane Assistant" }),
    ).toBeInTheDocument();
  });

  it("shows exactly one Course assistant in a student course context", async () => {
    setUser("student");
    const { user } = renderInLayout(
      "/courses/course-1/modules/module-1",
      <CourseContextAssistant
        courseId="course-1"
        courseTitle="Full Stack Bootcamp"
      />,
    );

    const launchers = screen.getAllByRole("button", {
      name: /Open .*Assistant/,
    });
    expect(launchers).toHaveLength(1);
    expect(launchers[0]).toHaveAccessibleName("Open Course Assistant");
    expect(
      screen.queryByRole("button", { name: "Open MentorLane Assistant" }),
    ).not.toBeInTheDocument();

    await user.click(launchers[0]);
    expect(screen.getByRole("dialog")).toHaveTextContent("Full Stack Bootcamp");
  });

  it("uses the Instructor identity when an instructor views a course", async () => {
    setUser("instructor");
    const { user } = renderInLayout(
      "/courses/course-1",
      <CourseContextAssistant
        courseId="course-1"
        courseTitle="Full Stack Bootcamp"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Open Instructor Assistant" }),
    );

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Managing: Full Stack Bootcamp",
    );
    expect(screen.queryByText("COURSE")).not.toBeInTheDocument();
  });

  it("uses the real Instructor Assistant endpoint and renders milestone sources", async () => {
    setUser("instructor");
    postMock.mockResolvedValueOnce({
      data: {
        data: {
          type: "message",
          answer: "Two submissions are waiting for grading.",
          sources: [
            {
              type: "milestone",
              id: "milestone-1",
              title: "Authentication",
            },
          ],
        },
      },
    } as never);
    const { user } = renderInLayout(
      "/courses/course-1",
      <CourseContextAssistant
        courseId="course-1"
        courseTitle="Full Stack Bootcamp"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Open Instructor Assistant" }),
    );
    await user.type(
      screen.getByLabelText("Message Instructor Assistant"),
      "What needs grading?",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(
      await screen.findByText("Two submissions are waiting for grading."),
    ).toBeInTheDocument();
    expect(screen.getByText("Authentication")).toBeInTheDocument();
    expect(postMock).toHaveBeenCalledWith(
      "/courses/course-1/instructor-assistant",
      { message: "What needs grading?", history: [] },
    );
  });

  it("uses the real Course Assistant endpoint and renders lesson sources", async () => {
    setUser("student");
    postMock.mockResolvedValueOnce({
      data: {
        data: {
          type: "message",
          answer: "Invalidation marks matching queries as stale [1].",
          sources: [
            {
              type: "lesson",
              id: "lesson-1",
              title: "React Query Fundamentals",
            },
          ],
        },
      },
    } as never);
    const { user } = renderInLayout(
      "/courses/course-1",
      <CourseContextAssistant
        courseId="course-1"
        courseTitle="Full Stack Bootcamp"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Open Course Assistant" }),
    );
    await user.type(
      screen.getByLabelText("Message Course Assistant"),
      "What is invalidation?",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(
      await screen.findByText(
        "Invalidation marks matching queries as stale [1].",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("React Query Fundamentals")).toBeInTheDocument();
    expect(postMock).toHaveBeenCalledWith(
      "/courses/course-1/assistant",
      {
        message: "What is invalidation?",
        history: [],
      },
      {
        signal: expect.any(AbortSignal),
        timeout: ASSISTANT_REQUEST_TIMEOUT_MS,
      },
    );
  });

  it("keeps API failures retryable through the existing panel", async () => {
    setUser("student");
    postMock
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce({
        data: {
          data: {
            type: "message",
            answer: "Recovered answer [1].",
            sources: [],
          },
        },
      } as never);
    const { user } = renderInLayout(
      "/courses/course-1",
      <CourseContextAssistant courseId="course-1" courseTitle="Course" />,
    );

    await user.click(
      screen.getByRole("button", { name: "Open Course Assistant" }),
    );
    await user.type(screen.getByLabelText("Message Course Assistant"), "Help");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await user.click(await screen.findByRole("button", { name: "Retry" }));

    expect(
      await screen.findByText("Recovered answer [1]."),
    ).toBeInTheDocument();
    expect(postMock).toHaveBeenCalledTimes(2);
  });

  it("does not make an invalid instructor request without a dashboard course context", () => {
    setUser("instructor");
    renderInLayout("/instructor/dashboard", <InstructorContextAssistant />);

    expect(
      screen.queryByRole("button", { name: /Open .*Assistant/ }),
    ).not.toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("does not give a student the Instructor assistant", async () => {
    setUser("student");

    renderWithProviders(
      <>
        <AppRoutes />
        <LocationProbe />
      </>,
      { initialEntries: ["/instructor/dashboard"] },
    );

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/courses"),
    );
    expect(
      screen.queryByRole("button", { name: "Open Instructor Assistant" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open MentorLane Assistant" }),
    ).toBeInTheDocument();
  });
});
