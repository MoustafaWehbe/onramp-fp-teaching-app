import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/test-utils";
import { courseAssistant, generalAssistant } from "./assistant-configs";
import { AssistantLauncher } from "./AssistantLauncher";
import { clearAssistantConversations } from "./conversation-store";
import type {
  AssistantMessage,
  AssistantResponse,
  AssistantSend,
} from "./types";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

const response: AssistantResponse = {
  type: "message",
  answer: "Open Grades to review your feedback.",
  sources: [{ type: "policy", id: "grades", title: "Grades" }],
};

function renderLauncher(
  onSend: AssistantSend = vi.fn().mockResolvedValue(response),
) {
  return renderWithProviders(
    <AssistantLauncher config={generalAssistant} onSend={onSend} />,
  );
}

async function openLauncher(
  user: ReturnType<typeof renderWithProviders>["user"],
) {
  await user.click(
    screen.getByRole("button", { name: "Open MentorLane Assistant" }),
  );
  return screen.getByRole("dialog", { name: "MentorLane Assistant" });
}

describe("AssistantLauncher", () => {
  beforeEach(() => {
    clearAssistantConversations();
    vi.restoreAllMocks();
  });

  it("renders an accessible floating launcher", () => {
    renderLauncher();

    const launcher = screen.getByRole("button", {
      name: "Open MentorLane Assistant",
    });
    expect(launcher).toHaveAttribute("aria-haspopup", "dialog");
    expect(launcher).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the assistant panel", async () => {
    const { user } = renderLauncher();

    const dialog = await openLauncher(user);

    expect(dialog).toBeInTheDocument();
  });

  it("minimizes the panel and restores the launcher", async () => {
    const { user } = renderLauncher();
    await openLauncher(user);

    await user.click(
      screen.getByRole("button", { name: "Minimize MentorLane Assistant" }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const launcher = screen.getByRole("button", {
      name: "Open MentorLane Assistant",
    });
    expect(launcher).toBeInTheDocument();
    expect(launcher).toHaveFocus();
  });

  it("shows the configured name, badge, and subtitle", async () => {
    const { user } = renderLauncher();
    const dialog = await openLauncher(user);

    expect(
      within(dialog).getByRole("heading", { name: "MentorLane Assistant" }),
    ).toBeInTheDocument();
    expect(within(dialog).getAllByText("GENERAL").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Platform Help")).toBeInTheDocument();
  });

  it("renders all suggested prompts", async () => {
    const { user } = renderLauncher();
    const dialog = await openLauncher(user);

    for (const prompt of generalAssistant.suggestedPrompts) {
      expect(
        within(dialog).getByRole("button", { name: prompt }),
      ).toBeInTheDocument();
    }
  });

  it("uses a suggested prompt as the outgoing message", async () => {
    const request = deferred<AssistantResponse>();
    const onSend = vi.fn(() => request.promise);
    const { user } = renderLauncher(onSend);
    await openLauncher(user);

    await user.click(
      screen.getByRole("button", { name: "How do submissions work?" }),
    );

    expect(onSend).toHaveBeenCalledWith(
      "How do submissions work?",
      [],
      expect.any(AbortSignal),
    );
    expect(screen.getByLabelText("User message")).toHaveTextContent(
      "How do submissions work?",
    );

    await act(async () => {
      request.resolve(response);
      await request.promise;
    });
  });

  it("shows a loading state and disables send controls while active", async () => {
    const request = deferred<AssistantResponse>();
    const { user } = renderLauncher(() => request.promise);
    await openLauncher(user);
    const input = screen.getByLabelText("Message MentorLane Assistant");

    await user.type(input, "Where are grades?");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Assistant is responding")).toHaveClass("sr-only");
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "How do submissions work?" }),
    ).toBeDisabled();

    await act(async () => {
      request.resolve(response);
      await request.promise;
    });
  });

  it("maps response.answer into an assistant message", async () => {
    const onSend = vi.fn().mockResolvedValue(response);
    const { user } = renderLauncher(onSend);
    await openLauncher(user);

    await user.type(
      screen.getByLabelText("Message MentorLane Assistant"),
      "Where are grades?",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));

    const assistantMessage = await screen.findByRole("group", {
      name: "Assistant message",
    });
    expect(assistantMessage).toHaveTextContent(response.answer);
    expect(assistantMessage).toHaveAttribute("aria-live", "polite");
  });

  it("renders source titles without inventing links", async () => {
    const { user } = renderLauncher();
    await openLauncher(user);

    await user.type(
      screen.getByLabelText("Message MentorLane Assistant"),
      "Where are grades?",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));

    const source = await screen.findByText("Grades");
    expect(source).toBeInTheDocument();
    expect(source.closest("a")).toBeNull();
    expect(screen.getByRole("region", { name: "Sources" })).toBeInTheDocument();
  });

  it("does not send empty or whitespace-only input", async () => {
    const onSend = vi.fn().mockResolvedValue(response);
    const { user } = renderLauncher(onSend);
    await openLauncher(user);
    const send = screen.getByRole("button", { name: "Send message" });
    const input = screen.getByLabelText("Message MentorLane Assistant");

    expect(send).toBeDisabled();
    await user.type(input, "   ");
    expect(send).toBeDisabled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("sends on Enter but preserves Shift+Enter keyboard behavior", async () => {
    const onSend = vi.fn().mockResolvedValue(response);
    const { user } = renderLauncher(onSend);
    await openLauncher(user);
    const input = screen.getByLabelText("Message MentorLane Assistant");

    await user.type(input, "First line");
    // fireEvent returns true when the key event is not prevented.
    expect(fireEvent.keyDown(input, { key: "Enter", shiftKey: true })).toBe(
      true,
    );
    expect(onSend).not.toHaveBeenCalled();
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false);

    expect(onSend).toHaveBeenCalledWith(
      "First line",
      [],
      expect.any(AbortSignal),
    );
    expect(await screen.findByText(response.answer)).toBeInTheDocument();
  });

  it("shows a retryable error when sending fails", async () => {
    const onSend = vi
      .fn()
      .mockRejectedValue(new Error("Assistant unavailable"));
    const { user } = renderLauncher(onSend);
    await openLauncher(user);

    await user.type(
      screen.getByLabelText("Message MentorLane Assistant"),
      "Help me",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Assistant unavailable",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("retries the failed request without duplicating the user message", async () => {
    const onSend = vi
      .fn()
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce(response);
    const { user } = renderLauncher(onSend);
    await openLauncher(user);

    await user.type(
      screen.getByLabelText("Message MentorLane Assistant"),
      "Help me",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await user.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByText(response.answer)).toBeInTheDocument();
    expect(onSend).toHaveBeenCalledTimes(2);
    expect(screen.getAllByLabelText("User message")).toHaveLength(1);
  });

  it("restores a conversation when the same assistant remounts", async () => {
    const { user, unmount } = renderLauncher();
    await openLauncher(user);
    await user.type(
      screen.getByLabelText("Message MentorLane Assistant"),
      "Remember this",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText(response.answer);
    unmount();

    renderLauncher();

    expect(screen.getByRole("dialog")).toHaveTextContent("Remember this");
    expect(screen.getByRole("dialog")).toHaveTextContent(response.answer);
  });

  it("aborts an in-flight request when the panel unmounts", async () => {
    let requestSignal: AbortSignal | undefined;
    const onSend = vi.fn(
      (
        _message: string,
        _history: AssistantMessage[],
        signal?: AbortSignal,
      ) => {
        requestSignal = signal;
        return new Promise<AssistantResponse>((_resolve, reject) => {
          signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        });
      },
    );
    const { user } = renderLauncher(onSend);
    await openLauncher(user);
    await user.type(
      screen.getByLabelText("Message MentorLane Assistant"),
      "Cancel this request",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(requestSignal?.aborted).toBe(false);
    await user.click(
      screen.getByRole("button", { name: "Minimize MentorLane Assistant" }),
    );

    await waitFor(() => expect(requestSignal?.aborted).toBe(true));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onSend).toHaveBeenCalledWith(
      "Cancel this request",
      [],
      requestSignal,
    );
  });

  it("keeps different course conversations separated", async () => {
    const courseOne = courseAssistant("course-1", "Shared title");
    const courseTwo = courseAssistant("course-2", "Shared title");
    const onSend = vi.fn().mockResolvedValue(response);
    const first = renderWithProviders(
      <AssistantLauncher config={courseOne} onSend={onSend} />,
    );
    await first.user.click(
      screen.getByRole("button", { name: "Open Course Assistant" }),
    );
    await first.user.type(
      screen.getByLabelText("Message Course Assistant"),
      "Course one question",
    );
    await first.user.click(
      screen.getByRole("button", { name: "Send message" }),
    );
    await screen.findByText(response.answer);
    first.unmount();

    const second = renderWithProviders(
      <AssistantLauncher config={courseTwo} onSend={onSend} />,
    );
    await second.user.click(
      screen.getByRole("button", { name: "Open Course Assistant" }),
    );

    expect(screen.queryByText("Course one question")).not.toBeInTheDocument();
    expect(
      screen.getByText("No messages yet — try one of these"),
    ).toBeInTheDocument();
  });

  it("closes the panel with Escape", async () => {
    const { user } = renderLauncher();
    await openLauncher(user);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open MentorLane Assistant" }),
    ).toHaveFocus();
  });
});
