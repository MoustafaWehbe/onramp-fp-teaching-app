import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../hooks/useAuth";
import { StudentProfilePage } from "./Profile";

vi.mock("../../hooks/useAuth", () => ({ useAuth: vi.fn() }));

const useAuthMock = vi.mocked(useAuth);

describe("StudentProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: {
        id: "student-1",
        role: "student",
        name: "Sam Student",
        email: "student@example.com",
      },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("shows certificate metadata without advertising an unavailable PDF", () => {
    render(<StudentProfilePage />);

    expect(screen.getByText("Frontend Basics")).toBeInTheDocument();
    expect(screen.getByText("ID: BC-FE-2026-0142")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /pdf/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /pdf/i })).not.toBeInTheDocument();
  });
});
