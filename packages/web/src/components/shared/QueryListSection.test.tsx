import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/test-utils";
import { QueryListSection } from "./QueryListSection";

const baseProps = {
  data: undefined,
  isPending: false,
  isError: false,
  isFetching: false,
  error: null,
  loadingLabel: "Loading records",
  errorTitle: "Records could not be loaded",
  emptyIcon: <span aria-hidden="true">empty</span>,
  emptyMessage: "No records yet.",
  onRetry: vi.fn(),
  children: (items: readonly string[]) => <p>{items.join(", ")}</p>,
};

describe("QueryListSection", () => {
  it("exposes loading as an accessible busy status", () => {
    renderWithProviders(<QueryListSection {...baseProps} isPending />);

    expect(
      screen.getByRole("status", { name: "Loading records" }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("renders a legitimate empty result without presenting an error", () => {
    renderWithProviders(<QueryListSection {...baseProps} data={[]} />);

    expect(screen.getByText("No records yet.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("invokes the query retry callback from its error state", async () => {
    const onRetry = vi.fn();
    const { user } = renderWithProviders(
      <QueryListSection
        {...baseProps}
        isError
        error={new Error("Service unavailable")}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Service unavailable");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
