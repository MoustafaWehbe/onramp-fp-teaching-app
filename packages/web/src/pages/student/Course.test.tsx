import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CoursePage } from "./Course";

describe("CoursePage", () => {
  it("exposes and updates each module's expanded state", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <CoursePage />
      </MemoryRouter>,
    );

    const firstModule = screen.getByRole("button", {
      name: /Frontend Basics/,
    });
    const secondModule = screen.getByRole("button", {
      name: /React Foundations/,
    });

    expect(firstModule).toHaveAttribute("aria-expanded", "true");
    expect(secondModule).toHaveAttribute("aria-expanded", "false");

    await user.click(firstModule);
    await user.click(secondModule);

    expect(firstModule).toHaveAttribute("aria-expanded", "false");
    expect(secondModule).toHaveAttribute("aria-expanded", "true");
  });
});
