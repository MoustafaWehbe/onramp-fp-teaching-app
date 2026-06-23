import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renders with the correct role", () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("applies size classes correctly", () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    expect(screen.getByRole("status")).toHaveClass("h-4", "w-4");

    rerender(<LoadingSpinner size="lg" />);
    expect(screen.getByRole("status")).toHaveClass("h-12", "w-12");
  });
});
