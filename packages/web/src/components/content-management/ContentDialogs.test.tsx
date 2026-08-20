import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/test-utils";
import { CourseEditorDialog, LessonEditorDialog } from "./ContentDialogs";

const course = { id: "course-1", instructorId: "instructor-1", title: "Course", description: "", isPublished: false };
const modules = [{ id: "module-1", courseId: "course-1", title: "Module one", order: 1 }];

describe("content management dialogs", () => {
  it("moves focus into the dialog, closes on Escape, and restores the trigger focus", async () => {
    const onCancel = vi.fn();
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const view = renderWithProviders(<CourseEditorDialog open course={course} isSaving={false} error={null} onCancel={onCancel} onSave={vi.fn()} />);
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement | null);
    await view.user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("does not reset a lesson draft when module options arrive", async () => {
    const view = renderWithProviders(<LessonEditorDialog open modules={modules} isSaving={false} error={null} onCancel={vi.fn()} onSave={vi.fn()} />);
    await view.user.type(screen.getByLabelText("Title"), "Draft lesson");
    view.rerender(<LessonEditorDialog open modules={[...modules, { id: "module-2", courseId: "course-1", title: "Module two", order: 2 }]} isSaving={false} error={null} onCancel={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByLabelText("Title")).toHaveValue("Draft lesson");
  });
});
