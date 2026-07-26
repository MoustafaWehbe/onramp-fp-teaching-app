import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { courseKeys } from "../hooks/useCourses";
import { apiClient } from "../lib/api-client";
import {
  createTestQueryClient,
  renderWithProviders,
} from "../test/test-utils";
import {
  AuthProvider,
  useAuthContext,
  type AuthUser,
} from "./AuthProvider";

vi.mock("../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const getMock = vi.mocked(apiClient.get);
const postMock = vi.mocked(apiClient.post);

const currentUser: AuthUser = {
  id: "student-1",
  role: "student",
  name: "Sam Student",
  email: "student@example.com",
};

const nextUser: AuthUser = {
  id: "instructor-1",
  role: "instructor",
  name: "Ivy Instructor",
  email: "instructor@example.com",
};

function AuthProbe() {
  const { user, isLoading, login, logout } = useAuthContext();

  return (
    <>
      <output data-testid="auth-state">
        {isLoading ? "loading" : (user?.email ?? "anonymous")}
      </output>
      <button
        type="button"
        onClick={() => void login(nextUser.email, "Password1")}
      >
        Log in as next user
      </button>
      <button
        type="button"
        onClick={() => void logout().catch(() => undefined)}
      >
        Log out
      </button>
    </>
  );
}

function renderAuthProvider() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(courseKeys.list(), [{ id: "course-1" }]);
  queryClient.setQueryData(courseKeys.detail("course-1"), {
    id: "course-1",
  });

  const result = renderWithProviders(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
    { queryClient },
  );

  return { ...result, queryClient };
}

describe("AuthProvider course cache isolation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getMock.mockResolvedValue({ data: { data: currentUser } } as never);
  });

  it("removes cached course lists and details after a successful login", async () => {
    postMock.mockResolvedValueOnce({
      data: { data: { user: nextUser } },
    } as never);
    const { user, queryClient } = renderAuthProvider();

    expect(
      await screen.findByText(currentUser.email),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Log in as next user" }),
    );

    expect(await screen.findByText(nextUser.email)).toBeInTheDocument();
    expect(queryClient.getQueryData(courseKeys.list())).toBeUndefined();
    expect(
      queryClient.getQueryData(courseKeys.detail("course-1")),
    ).toBeUndefined();
  });

  it.each([
    ["successful", undefined],
    ["failed", new Error("Network unavailable")],
  ])(
    "removes cached courses after a %s logout",
    async (_scenario, logoutError) => {
      if (logoutError) {
        postMock.mockRejectedValueOnce(logoutError);
      } else {
        postMock.mockResolvedValueOnce({ data: {} } as never);
      }
      const { user, queryClient } = renderAuthProvider();

      expect(
        await screen.findByText(currentUser.email),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Log out" }));

      await waitFor(() =>
        expect(screen.getByTestId("auth-state")).toHaveTextContent("anonymous"),
      );
      expect(queryClient.getQueryData(courseKeys.list())).toBeUndefined();
      expect(
        queryClient.getQueryData(courseKeys.detail("course-1")),
      ).toBeUndefined();
    },
  );
});
