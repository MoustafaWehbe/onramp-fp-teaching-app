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

  it("redirects a student away from an instructor-only route", async () => {
    setAuthenticatedUser("student");

    renderWithProviders(
      <>
        <AppRoutes />
        <LocationProbe />
      </>,
      { initialEntries: ["/instructor/profile"] },
    );

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/courses"),
    );
  });

  it("redirects an instructor away from a student-only route", async () => {
    setAuthenticatedUser("instructor");

    renderWithProviders(
      <>
        <AppRoutes />
        <LocationProbe />
      </>,
      { initialEntries: ["/grades"] },
    );

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/courses"),
    );
  });

  it("allows a student to access the real gradebook route", async () => {
    setAuthenticatedUser("student");

    renderWithProviders(
      <>
        <AppRoutes />
        <LocationProbe />
      </>,
      { initialEntries: ["/grades"] },
    );

    expect(
      await screen.findByRole("heading", { name: "My Grades" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/grades");
  });

  it("allows a student to access a milestone submission route", () => {
    setAuthenticatedUser("student");

    renderWithProviders(
      <>
        <AppRoutes />
        <LocationProbe />
      </>,
      { initialEntries: ["/milestones/milestone-1/submit"] },
    );

    expect(
      screen.getByRole("heading", { name: "Submit milestone" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/milestones/milestone-1/submit",
    );
  });

  it("redirects an instructor away from milestone submission", async () => {
    setAuthenticatedUser("instructor");

    renderWithProviders(
      <>
        <AppRoutes />
        <LocationProbe />
      </>,
      { initialEntries: ["/milestones/milestone-1/submit"] },
    );

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/courses"),
    );
  });

  it("redirects a student away from instructor submission review", async () => {
    setAuthenticatedUser("student");

    renderWithProviders(
      <>
        <AppRoutes />
        <LocationProbe />
      </>,
      { initialEntries: ["/instructor/submissions/submission-1/review"] },
    );

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/courses"),
    );
  });

  it("does not preserve the obsolete generic submissions placeholder", () => {
    setAuthenticatedUser("student");

    renderWithProviders(<AppRoutes />, {
      initialEntries: ["/submissions"],
    });

    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });
});
