import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ReviewSubmissionPage } from "./ReviewSubmission";

function renderReviewSubmission(submissionId = "s1") {
  const user = userEvent.setup();
  render(
    <MemoryRouter
      initialEntries={[
        `/instructor/submissions/${submissionId}/review`,
      ]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route
          path="/instructor/submissions/:submissionId/review"
          element={<ReviewSubmissionPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
  return user;
}

async function saveGrade(user: ReturnType<typeof userEvent.setup>) {
  await user.clear(screen.getByLabelText("Score (out of 100)"));
  await user.type(screen.getByLabelText("Score (out of 100)"), "85");
  await user.clear(screen.getByLabelText("Feedback"));
  await user.type(screen.getByLabelText("Feedback"), "Strong submission");
  await user.click(screen.getByRole("button", { name: "Save grade" }));

  expect(screen.getByText("Grade saved in this preview.")).toBeInTheDocument();
  expect(screen.getByText("Graded")).toBeInTheDocument();
}

function expectUnsaved() {
  expect(
    screen.queryByText("Grade saved in this preview."),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Submitted")).toBeInTheDocument();
}

describe("ReviewSubmissionPage", () => {
  it("invalidates the saved grade when the score changes", async () => {
    const user = renderReviewSubmission();
    await saveGrade(user);

    await user.type(screen.getByLabelText("Score (out of 100)"), "0");

    expectUnsaved();
  });

  it("invalidates the saved grade when feedback changes manually", async () => {
    const user = renderReviewSubmission();
    await saveGrade(user);

    await user.type(screen.getByLabelText("Feedback"), "!");

    expectUnsaved();
  });

  it("invalidates the saved grade when AI suggests new feedback", async () => {
    const user = renderReviewSubmission();
    await saveGrade(user);

    await user.click(
      screen.getByRole("button", { name: "Suggest feedback with AI" }),
    );

    expectUnsaved();
  });

  it("shows a not-found state for an unknown submission id", () => {
    renderReviewSubmission("missing");

    expect(screen.getByRole("alert")).toHaveTextContent("Submission not found");
    expect(
      screen.getByRole("link", { name: "Back to Submissions" }),
    ).toHaveAttribute("href", "/instructor/submissions");
    expect(
      screen.queryByRole("heading", { name: "Grade this submission" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Lina Haddad")).not.toBeInTheDocument();
  });

  it.each(["0", "100"])(
    "accepts the inclusive score boundary %s",
    async (score) => {
      const user = renderReviewSubmission();

      await user.type(screen.getByLabelText("Score (out of 100)"), score);
      await user.type(screen.getByLabelText("Feedback"), "Meets expectations");

      const saveButton = screen.getByRole("button", { name: "Save grade" });
      expect(saveButton).toBeEnabled();
      await user.click(saveButton);
      expect(
        screen.getByText("Grade saved in this preview."),
      ).toBeInTheDocument();
    },
  );

  it.each(["-1", "101"])(
    "rejects the out-of-range score %s",
    async (score) => {
      const user = renderReviewSubmission();

      await user.type(screen.getByLabelText("Score (out of 100)"), score);
      await user.type(screen.getByLabelText("Feedback"), "Needs review");

      expect(
        screen.getByRole("button", { name: "Save grade" }),
      ).toBeDisabled();
    },
  );

  it("rejects whitespace-only feedback", async () => {
    const user = renderReviewSubmission();

    await user.type(screen.getByLabelText("Score (out of 100)"), "85");
    await user.type(screen.getByLabelText("Feedback"), "   ");

    expect(
      screen.getByRole("button", { name: "Save grade" }),
    ).toBeDisabled();
  });
});
