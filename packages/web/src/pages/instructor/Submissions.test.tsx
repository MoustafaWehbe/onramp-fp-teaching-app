import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAssistantConversations } from "../../components/assistant/conversation-store";
import { apiClient } from "../../lib/api-client";
import { ASSISTANT_REQUEST_TIMEOUT_MS } from "../../lib/assistant-api";
import { renderWithProviders } from "../../test/test-utils";
import { SubmissionsPage } from "./Submissions";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const getMock = vi.mocked(apiClient.get);
const postMock = vi.mocked(apiClient.post);

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
  title: "React Foundations",
  order: 1,
};
const milestone = {
  id: "milestone-1",
  moduleId: courseModule.id,
  title: "Interactive todo app",
  instructions: "Build and deploy a todo app.",
  acceptanceCriteria: "CRUD operations work.",
};
const pendingSubmission = {
  id: "submission-1",
  milestoneId: milestone.id,
  studentId: "student-1",
  student: {
    id: "student-1",
    name: "Nour Student",
    email: "nour@example.com",
  },
  status: "submitted",
  submittedAt: "2026-08-08T10:00:00.000Z",
  links: [
    {
      id: "link-1",
      url: "https://github.com/example/todo",
      type: "github",
    },
  ],
};
const gradedSubmission = {
  ...pendingSubmission,
  id: "submission-2",
  studentId: "student-2",
  student: {
    id: "student-2",
    name: "Graded Student",
    email: "graded@example.com",
  },
  status: "graded",
  score: 91,
};

function response(data: unknown) {
  return Promise.resolve({ data: { data } }) as never;
}

function mockHierarchy(submissions = [pendingSubmission, gradedSubmission]) {
  getMock.mockImplementation((url) => {
    if (url === "/courses") return response([course]);
    if (url === "/courses/course-1/modules") return response([courseModule]);
    if (url === "/modules/module-1/milestones") return response([milestone]);
    if (url === "/milestones/milestone-1/submissions") {
      return response(submissions);
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
}

function renderSubmissions() {
  return renderWithProviders(<SubmissionsPage />, {
    initialEntries: ["/instructor/submissions?courseId=course-1"],
  });
}

describe("SubmissionsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearAssistantConversations();
  });

  it("exposes course loading as a busy status", () => {
    getMock.mockReturnValue(new Promise(() => undefined) as never);

    renderSubmissions();

    expect(
      screen.getByRole("status", { name: "Loading instructor courses" }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("exposes submission loading as a busy status", async () => {
    getMock.mockImplementation((url) => {
      if (url === "/courses") return response([course]);
      return new Promise(() => undefined) as never;
    });

    renderSubmissions();

    expect(
      await screen.findByRole("status", {
        name: "Loading course submissions",
      }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("loads and flattens submissions from the real hierarchy endpoints", async () => {
    mockHierarchy([pendingSubmission]);

    renderSubmissions();

    expect(await screen.findByText(/Nour Student/)).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("/courses/course-1/modules");
    expect(getMock).toHaveBeenCalledWith("/modules/module-1/milestones");
    expect(getMock).toHaveBeenCalledWith("/milestones/milestone-1/submissions");
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Interactive todo app/i }),
    ).toHaveAttribute(
      "href",
      "/instructor/submissions/submission-1/review?courseId=course-1&moduleId=module-1&milestoneId=milestone-1",
    );
  });

  it("filters pending and graded submissions using backend status values", async () => {
    mockHierarchy();
    const { user } = renderSubmissions();

    await screen.findByText(/Nour Student/);
    await user.click(screen.getByRole("button", { name: "Pending (1)" }));
    expect(screen.getByText(/Nour Student/)).toBeInTheDocument();
    expect(screen.queryByText(/Graded Student/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Graded (1)" }));
    expect(screen.getByText(/Graded Student/)).toBeInTheDocument();
    expect(screen.queryByText(/Nour Student/)).not.toBeInTheDocument();
    expect(screen.getByText("Graded")).toBeInTheDocument();
    expect(screen.getByText(/Score 91\/100/)).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Submission filters" }),
    ).toBeInTheDocument();
  });

  it("shows an empty state for a selected filter", async () => {
    mockHierarchy([pendingSubmission]);
    const { user } = renderSubmissions();

    await screen.findByText(/Nour Student/);
    await user.click(screen.getByRole("button", { name: "Graded (0)" }));

    expect(screen.getByText("No graded submissions.")).toBeInTheDocument();
  });

  it("shows a hierarchy API error with retry", async () => {
    getMock.mockImplementation((url) => {
      if (url === "/courses") return response([course]);
      if (url === "/courses/course-1/modules") {
        return Promise.reject(new Error("Modules unavailable"));
      }
      return response([]);
    });

    renderSubmissions();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Modules unavailable",
    );
    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
  });

  it("uses the selected trusted course for the Instructor Assistant", async () => {
    mockHierarchy([pendingSubmission]);
    postMock.mockResolvedValueOnce({
      data: {
        data: {
          type: "message",
          answer: "One submission is pending.",
          sources: [],
        },
      },
    } as never);
    const { user } = renderSubmissions();

    await screen.findByText(/Nour Student/);
    await user.click(
      screen.getByRole("button", { name: "Open Instructor Assistant" }),
    );
    await user.type(
      screen.getByLabelText("Message Instructor Assistant"),
      "What needs grading?",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(
      await screen.findByText("One submission is pending."),
    ).toBeInTheDocument();
    expect(postMock).toHaveBeenCalledWith(
      "/courses/course-1/instructor-assistant",
      { message: "What needs grading?", history: [] },
      {
        signal: expect.any(AbortSignal),
        timeout: ASSISTANT_REQUEST_TIMEOUT_MS,
      },
    );
  });
});
