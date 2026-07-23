import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SubmitMilestonePage } from "./SubmitMilestone";

describe("SubmitMilestonePage", () => {
  it("gives every dynamic submission control a distinct accessible name", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <SubmitMilestonePage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("combobox", { name: "Link 1 type" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Link 1 URL" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add another link" }));

    expect(
      screen.getByRole("combobox", { name: "Link 2 type" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Link 2 URL" }),
    ).toBeInTheDocument();
  });
});
