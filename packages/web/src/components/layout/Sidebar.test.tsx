import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../hooks/useAuth";
import { Sidebar } from "./Sidebar";

vi.mock("../../hooks/useAuth", () => ({ useAuth: vi.fn() }));

const useAuthMock = vi.mocked(useAuth);

function renderSidebar(role: "student" | "instructor") {
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

  render(
    <MemoryRouter
      initialEntries={["/courses"]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Sidebar />
    </MemoryRouter>,
  );

  return screen.getByRole("navigation", { name: "Primary navigation" });
}

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes the student primary navigation at every viewport size", () => {
    const navigation = renderSidebar("student");

    expect(
      within(navigation).getByRole("link", { name: "My Courses" }),
    ).toBeInTheDocument();
    expect(
      within(navigation).getByRole("link", { name: "My Grades" }),
    ).toHaveAttribute("href", "/grades");
    expect(
      within(navigation).getByRole("link", { name: "My Profile" }),
    ).toHaveAttribute("href", "/profile");
  });

  it("exposes the instructor primary navigation at every viewport size", () => {
    const navigation = renderSidebar("instructor");

    expect(
      within(navigation).getByRole("link", { name: "My Courses" }),
    ).toBeInTheDocument();
    expect(
      within(navigation).getByRole("link", { name: "Submissions" }),
    ).toHaveAttribute("href", "/instructor/submissions");
    expect(
      within(navigation).getByRole("link", { name: "My Profile" }),
    ).toHaveAttribute("href", "/instructor/profile");
  });
});
