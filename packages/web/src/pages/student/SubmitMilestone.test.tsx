import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../lib/api-client";
import { renderWithProviders } from "../../test/test-utils";
import { SubmitMilestonePage } from "./SubmitMilestone";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const postMock = vi.mocked(apiClient.post);

function submissionResponse(
  links = [
    {
      id: "link-1",
      submissionId: "submission-1",
      type: "github",
      url: "https://github.com/student/project",
    },
  ],
) {
  return {
    data: {
      data: {
        id: "submission-1",
        milestoneId: "milestone-1",
        studentId: "student-1",
        status: "submitted",
        submittedAt: "2026-08-12T10:00:00.000Z",
        links,
      },
    },
  };
}

function renderSubmissionPage() {
  return renderWithProviders(
    <Routes>
      <Route
        path="/milestones/:milestoneId/submit"
        element={<SubmitMilestonePage />}
      />
    </Routes>,
    { initialEntries: ["/milestones/milestone-1/submit"] },
  );
}

describe("SubmitMilestonePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders the student form with an initial GitHub row", () => {
    renderSubmissionPage();

    expect(
      screen.getByRole("heading", { name: "Submit milestone" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Link 1 type" })).toHaveValue(
      "github",
    );
    expect(
      screen.getByRole("textbox", { name: "Link 1 URL" }),
    ).toBeInTheDocument();
  });

  it("adds and removes submission rows", async () => {
    const { user } = renderSubmissionPage();

    await user.click(screen.getByRole("button", { name: "Add another link" }));
    expect(
      screen.getByRole("textbox", { name: "Link 2 URL" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove link 2" }));
    expect(
      screen.queryByRole("textbox", { name: "Link 2 URL" }),
    ).not.toBeInTheDocument();
  });

  it("blocks an empty submission before calling the API", async () => {
    const { user } = renderSubmissionPage();

    await user.click(screen.getByRole("button", { name: "Submit milestone" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "At least one link is required.",
    );
    expect(postMock).not.toHaveBeenCalled();
  });

  it.each([
    ["github", "https://example.com/repository", "GitHub URL"],
    ["loom", "https://example.com/video", "Loom URL"],
    ["deployment", "ftp://example.com/app", "HTTP and HTTPS"],
    ["other", "javascript:alert(1)", "HTTP and HTTPS"],
    ["other", "data:text/html,unsafe", "HTTP and HTTPS"],
    ["other", "file:///tmp/unsafe", "HTTP and HTTPS"],
  ])("rejects an invalid %s link", async (type, url, message) => {
    const { user } = renderSubmissionPage();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Link 1 type" }),
      type,
    );
    await user.type(screen.getByRole("textbox", { name: "Link 1 URL" }), url);

    await user.click(screen.getByRole("button", { name: "Submit milestone" }));

    expect(screen.getByText(new RegExp(message))).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("sends valid links with lowercase types and omits empty rows", async () => {
    postMock.mockResolvedValueOnce(submissionResponse() as never);
    const { user } = renderSubmissionPage();
    await user.type(
      screen.getByRole("textbox", { name: "Link 1 URL" }),
      "https://github.com/student/project",
    );

    await user.click(screen.getByRole("button", { name: "Add another link" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Link 2 type" }),
      "loom",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Link 2 URL" }),
      "https://www.loom.com/share/demo",
    );

    await user.click(screen.getByRole("button", { name: "Add another link" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Link 3 type" }),
      "deployment",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Link 3 URL" }),
      "http://student-app.example.com",
    );

    await user.click(screen.getByRole("button", { name: "Add another link" }));
    await user.click(screen.getByRole("button", { name: "Submit milestone" }));

    expect(postMock).toHaveBeenCalledWith(
      "/milestones/milestone-1/submissions",
      {
        links: [
          {
            type: "github",
            url: "https://github.com/student/project",
          },
          { type: "loom", url: "https://www.loom.com/share/demo" },
          {
            type: "deployment",
            url: "http://student-app.example.com",
          },
        ],
      },
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Submission received successfully.",
    );
  });

  it("disables duplicate submission while the request is pending", async () => {
    let resolveRequest!: (value: ReturnType<typeof submissionResponse>) => void;
    postMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }) as never,
    );
    const { user } = renderSubmissionPage();
    await user.type(
      screen.getByRole("textbox", { name: "Link 1 URL" }),
      "https://github.com/student/project",
    );

    await user.click(screen.getByRole("button", { name: "Submit milestone" }));

    expect(
      screen.getByRole("button", { name: "Submitting..." }),
    ).toBeDisabled();
    expect(postMock).toHaveBeenCalledTimes(1);

    resolveRequest(submissionResponse());
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Submission received successfully.",
    );
  });

  it("shows a normalized API failure without claiming success", async () => {
    postMock.mockRejectedValueOnce({
      isAxiosError: true,
      message: "Request failed",
      response: { data: { error: "Milestone not found" } },
    });
    const { user } = renderSubmissionPage();
    await user.type(
      screen.getByRole("textbox", { name: "Link 1 URL" }),
      "https://github.com/student/project",
    );

    await user.click(screen.getByRole("button", { name: "Submit milestone" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Milestone not found",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("limits the form to the backend maximum of ten links", async () => {
    const { user } = renderSubmissionPage();

    for (let index = 1; index < 10; index += 1) {
      await user.click(
        screen.getByRole("button", { name: "Add another link" }),
      );
    }

    expect(screen.getAllByRole("textbox")).toHaveLength(10);
    expect(screen.getByText("10 of 10 links")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add another link" }),
    ).toBeDisabled();
  });
});
