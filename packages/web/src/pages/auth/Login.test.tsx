import { screen, waitFor } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../hooks/useAuth";
import { renderWithProviders } from "../../test/test-utils";
import { Login } from "./Login";

vi.mock("../../hooks/useAuth", () => ({ useAuth: vi.fn() }));

const login = vi.fn();
const useAuthMock = vi.mocked(useAuth);

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderLogin() {
  return renderWithProviders(
    <>
      <Login />
      <LocationProbe />
    </>,
    { initialEntries: ["/login"] },
  );
}

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    login.mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: false,
      login,
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("associates validation errors with their fields before calling the API", async () => {
    const { user } = renderLogin();

    await user.click(screen.getByRole("button", { name: "Log in" }));

    const emailError = await screen.findByText("Enter a valid email address");
    const passwordError = screen.getByText("Password is required");
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-describedby",
      emailError.id,
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "aria-describedby",
      passwordError.id,
    );
    expect(login).not.toHaveBeenCalled();
  });

  it("announces an authentication failure without navigating", async () => {
    login.mockRejectedValueOnce(new Error("Unauthorized"));
    const { user } = renderLogin();

    await user.type(screen.getByLabelText("Email"), "student@example.com");
    await user.type(screen.getByLabelText("Password"), "Password1");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password",
    );
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });

  it("navigates after a successful login", async () => {
    const { user } = renderLogin();

    await user.type(screen.getByLabelText("Email"), "student@example.com");
    await user.type(screen.getByLabelText("Password"), "Password1");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/dashboard"),
    );
  });
});
