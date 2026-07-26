import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../hooks/useAuth";
import { Header } from "./Header";

vi.mock("../../hooks/useAuth", () => ({ useAuth: vi.fn() }));

const useAuthMock = vi.mocked(useAuth);

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderHeader(logout: () => Promise<void>) {
  useAuthMock.mockReturnValue({
    user: {
      id: "student-1",
      email: "student@example.com",
      name: "Sam Student",
      role: "student",
    },
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout,
  });

  const user = userEvent.setup();
  render(
    <MemoryRouter
      initialEntries={["/courses"]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Header />
      <LocationProbe />
    </MemoryRouter>,
  );
  return user;
}

describe("Header", () => {
  beforeEach(() => vi.clearAllMocks());

  it("navigates to login after a successful logout", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const user = renderHeader(logout);

    await user.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/login"),
    );
    expect(logout).toHaveBeenCalledOnce();
  });

  it("still navigates to login when logout fails", async () => {
    const logout = vi.fn().mockRejectedValue(new Error("Network unavailable"));
    const user = renderHeader(logout);

    await user.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/login"),
    );
    expect(logout).toHaveBeenCalledOnce();
  });
});
