import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../lib/api-client";
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
const module = {
  id: "module-1",
  courseId: course.id,
  title: "React Foundations",
  order: 1,
};
const milestone = {
  id: "milestone-1",
  moduleId: module.id,
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
    if (url === "/courses/course-1/modules") return response([module]);
    if (url === "/modules/module-1/milestones") return response([milestone]);
    if (url === "/milestones/milestone-1/submissions") {
      return response(submissions);
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
}

function renderReview(submissionId = submission.id) {
  return renderWithProviders(
    <Routes>
      <Route
        path="/instructor/submissions/:submissionId/review"
        element={<ReviewSubmissionPage />}
      />
    </Routes>,
    {
      initialEntries: [
        `/instructor/submissions/${submissionId}/review?courseId=course-1&moduleId=module-1&milestoneId=milestone-1`,
      ],
    },
  );
}

describe("ReviewSubmissionPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
          score: 85,
          feedback: "Good implementation",
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
    expect(screen.getByText("85/100")).toBeInTheDocument();
    expect(screen.getByLabelText("Feedback")).toHaveValue(
      "Good implementation",
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
});
