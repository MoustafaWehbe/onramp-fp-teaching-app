import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../hooks/useAuth";
import { Register } from "./Register";

vi.mock("../../hooks/useAuth", () => ({ useAuth: vi.fn() }));

const registerUser = vi.fn();
const useAuthMock = vi.mocked(useAuth);

function renderRegister() {
  const user = userEvent.setup();
  render(
    <MemoryRouter
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Register />
    </MemoryRouter>,
  );
  return user;
}

async function completeRegistrationForm(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.type(screen.getByLabelText("Name"), name);
  await user.type(screen.getByLabelText("Email"), "alice@example.com");
  await user.type(screen.getByLabelText("Password"), "Password1");
}

describe("Register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerUser.mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register: registerUser,
      logout: vi.fn(),
    });
  });

  it("accepts a name with exactly 100 characters", async () => {
    const user = renderRegister();
    const name = "A".repeat(100);

    await completeRegistrationForm(user, name);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(registerUser).toHaveBeenCalledWith(
        "alice@example.com",
        "Password1",
        name,
      ),
    );
  });

  it("rejects a name longer than 100 characters before calling the API", async () => {
    const user = renderRegister();

    await completeRegistrationForm(user, "A".repeat(101));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("Name must be 100 characters or less"),
    ).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("toggles password visibility without changing the field value", async () => {
    const user = renderRegister();
    const password = screen.getByLabelText("Password");

    await user.type(password, "Password1");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("Password1");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveValue("Password1");
  });
});
