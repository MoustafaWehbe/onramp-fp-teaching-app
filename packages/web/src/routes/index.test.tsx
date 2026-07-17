import { screen, waitFor } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "../lib/api-client";
import { renderWithProviders } from "../test/test-utils";
import { AppRoutes } from "./index";

vi.mock("../hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const getMock = vi.mocked(apiClient.get);
const useAuthMock = vi.mocked(useAuth);

function setAuthenticatedUser(role: "student" | "instructor") {
  useAuthMock.mockReturnValue({
    user: {
      id: `${role}-1`,
      role,
      name: role === "student" ? "Sam Student" : "Ivy Instructor",
      email: `${role}@example.com`,
    },
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });
}

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

describe("course route compatibility", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getMock.mockResolvedValue({ data: { data: [] } } as never);
  });

  it("redirects the old student dashboard URL to the shared courses page", async () => {
    setAuthenticatedUser("student");

    renderWithProviders(
      <>
        <AppRoutes />
        <LocationProbe />
      </>,
      { initialEntries: ["/dashboard"] },
    );

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/courses"),
    );
    expect(
      await screen.findByRole("heading", { name: "My Courses" }),
    ).toBeInTheDocument();
  });

  it("redirects the old instructor courses URL to the shared courses page", async () => {
    setAuthenticatedUser("instructor");

    renderWithProviders(
      <>
        <AppRoutes />
        <LocationProbe />
      </>,
      { initialEntries: ["/instructor/courses"] },
    );

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/courses"),
    );
    expect(
      await screen.findByRole("heading", { name: "My Courses" }),
    ).toBeInTheDocument();
  });
});
