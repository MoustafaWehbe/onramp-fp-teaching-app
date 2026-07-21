import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ReviewSubmissionPage } from "./ReviewSubmission";

function renderReviewSubmission() {
  const user = userEvent.setup();
  render(
    <MemoryRouter
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <ReviewSubmissionPage />
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
});
