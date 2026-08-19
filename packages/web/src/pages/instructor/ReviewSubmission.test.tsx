import { act, screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAssistantConversations } from "../../components/assistant/conversation-store";
import { apiClient } from "../../lib/api-client";
import { ASSISTANT_REQUEST_TIMEOUT_MS } from "../../lib/assistant-api";
import { renderWithProviders } from "../../test/test-utils";
import { ReviewSubmissionPage } from "./ReviewSubmission";

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
const submission = {
  id: "submission-1",
  milestoneId: milestone.id,
  studentId: "student-1",
  student: {
    id: "student-1",
    name: "Nour Student",
    email: "nour@example.com",
  },
  status: "submitted",
  links: [
    {
      id: "link-1",
      url: "https://github.com/example/todo",
      type: "github",
    },
  ],
};

function response(data: unknown) {
  return Promise.resolve({ data: { data } }) as never;
}

function mockReviewHierarchy(submissions = [submission]) {
  getMock.mockImplementation((url) => {
    if (url === "/courses/course-1") return response(course);
    if (url === "/courses/course-1/modules") return response([courseModule]);
    if (url === "/modules/module-1/milestones") return response([milestone]);
    if (url === "/milestones/milestone-1/submissions") {
      return response(submissions);
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
}

function renderReview(
  submissionId = submission.id,
  search = "?courseId=course-1&moduleId=module-1&milestoneId=milestone-1",
) {
  return renderWithProviders(
    <Routes>
      <Route
        path="/instructor/submissions/:submissionId/review"
        element={<ReviewSubmissionPage />}
      />
    </Routes>,
    {
      initialEntries: [
        `/instructor/submissions/${submissionId}/review${search}`,
      ],
    },
  );
}

describe("ReviewSubmissionPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearAssistantConversations();
    mockReviewHierarchy();
  });

  it.each(["-1", "101"])("rejects the out-of-range score %s", async (score) => {
    const { user } = renderReview();

    await screen.findByText(/Nour Student/);
    await user.type(screen.getByLabelText("Score (out of 100)"), score);
    await user.type(screen.getByLabelText("Feedback"), "Needs review");

    expect(screen.getByRole("button", { name: "Save grade" })).toBeDisabled();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("sends the grade to the API and updates the submission to graded", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        data: {
          ...submission,
          status: "graded",
          score: 92,
          feedback: "Server-normalized feedback",
          gradedAt: "2026-08-09T12:00:00.000Z",
        },
      },
    } as never);
    const { user } = renderReview();

    await screen.findByText(/Nour Student/);
    await user.type(screen.getByLabelText("Score (out of 100)"), "85");
    await user.type(screen.getByLabelText("Feedback"), "Good implementation");
    await user.click(screen.getByRole("button", { name: "Save grade" }));

    expect(postMock).toHaveBeenCalledWith("/submissions/submission-1/grade", {
      score: 85,
      feedback: "Good implementation",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Grade saved successfully.",
    );
    expect(screen.getByText("Graded")).toBeInTheDocument();
    expect(screen.getByText("92/100")).toBeInTheDocument();
    expect(screen.getByLabelText("Feedback")).toHaveValue(
      "Server-normalized feedback",
    );
  });

  it("shows a meaningful grading API error", async () => {
    postMock.mockRejectedValueOnce({
      isAxiosError: true,
      message: "Request failed",
      response: { data: { error: "Unable to save grade" } },
    });
    const { user } = renderReview();

    await screen.findByText(/Nour Student/);
    await user.type(screen.getByLabelText("Score (out of 100)"), "85");
    await user.type(screen.getByLabelText("Feedback"), "Good implementation");
    await user.click(screen.getByRole("button", { name: "Save grade" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to save grade",
    );
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows a not-found state for an unknown submission", async () => {
    mockReviewHierarchy([]);

    renderReview("missing");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Submission not found",
    );
  });

  it("shows a not-found state when the review context is missing", () => {
    renderReview(submission.id, "");

    expect(screen.getByRole("alert")).toHaveTextContent("Submission not found");
    expect(getMock).not.toHaveBeenCalled();
  });

  it("keeps cached review data and draft values after a background refetch fails", async () => {
    const { user, queryClient } = renderReview();

    await screen.findByText(/Nour Student/);
    await user.type(screen.getByLabelText("Score (out of 100)"), "85");
    await user.type(screen.getByLabelText("Feedback"), "Draft feedback");
    getMock.mockRejectedValue(new Error("Background refresh failed"));

    await act(async () => {
      await queryClient.refetchQueries({ type: "active" });
    });

    expect(screen.getByText(/Nour Student/)).toBeInTheDocument();
    expect(screen.getByLabelText("Score (out of 100)")).toHaveValue(85);
    expect(screen.getByLabelText("Feedback")).toHaveValue("Draft feedback");
    expect(
      screen.queryByText("Submission could not be loaded"),
    ).not.toBeInTheDocument();
  });

  it("renders unsafe submitted URLs as text instead of links", async () => {
    const unsafeUrl = "javascript:alert(document.domain)";
    mockReviewHierarchy([
      {
        ...submission,
        links: [
          ...submission.links,
          { id: "link-2", type: "other", url: unsafeUrl },
        ],
      },
    ]);

    renderReview();

    const unsafeText = await screen.findByText(unsafeUrl);
    expect(unsafeText.closest("a")).toBeNull();
    expect(
      screen.getByRole("link", { name: /github.*github.com\/example\/todo/i }),
    ).toHaveAttribute("href", "https://github.com/example/todo");
  });

  it("associates validation messages with their grading controls", async () => {
    const { user } = renderReview();

    await screen.findByText(/Nour Student/);
    await user.type(screen.getByLabelText("Score (out of 100)"), "-1");
    await user.type(screen.getByLabelText("Feedback"), "   ");

    expect(screen.getByLabelText("Score (out of 100)")).toHaveAttribute(
      "aria-describedby",
      "score-error",
    );
    expect(screen.getByLabelText("Feedback")).toHaveAttribute(
      "aria-describedby",
      "feedback-error",
    );
    expect(document.getElementById("score-error")).toHaveTextContent(
      "Enter a score between 0 and 100.",
    );
    expect(document.getElementById("feedback-error")).toHaveTextContent(
      "Feedback is required.",
    );
  });

  it("exposes its loading skeleton as a busy status", () => {
    getMock.mockReturnValue(new Promise(() => undefined) as never);

    renderReview();

    expect(
      screen.getByRole("status", { name: "Loading submission review" }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("uses the course resolved by loaded review data for the Instructor Assistant", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        data: {
          type: "message",
          answer: "This milestone has one pending submission.",
          sources: [
            { type: "milestone", id: milestone.id, title: milestone.title },
          ],
        },
      },
    } as never);
    const { user } = renderReview();

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
      await screen.findByText("This milestone has one pending submission."),
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
