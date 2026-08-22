import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { courseKeys } from "../hooks/useCourses";
import { instructorKeys } from "../hooks/useInstructor";
import { moduleKeys } from "../hooks/useModules";
import { submissionKeys } from "../hooks/useSubmissions";
import { apiClient } from "../lib/api-client";
import { clearAssistantConversations } from "../components/assistant/conversation-store";

export type UserRole = "instructor" | "student";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function clearUserScopedQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: courseKeys.all });
  queryClient.removeQueries({ queryKey: instructorKeys.all });
  queryClient.removeQueries({ queryKey: moduleKeys.all });
  queryClient.removeQueries({ queryKey: submissionKeys.all });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount — access token cookie is sent automatically
  useEffect(() => {
    apiClient
      .get<{ data: AuthUser }>("/auth/me")
      .then(({ data }) => {
        clearAssistantConversations();
        setUser(data.data);
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const { data } = await apiClient.post<{
      data: { user: AuthUser };
    }>("/auth/login", { email, password });
    clearUserScopedQueries(queryClient);
    clearAssistantConversations();
    setUser(data.data.user);
  }

  async function register(
    email: string,
    password: string,
    name: string,
  ): Promise<void> {
    await apiClient.post("/auth/register", { email, password, name });
  }

  async function logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      clearUserScopedQueries(queryClient);
      clearAssistantConversations();
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuthContext must be used within <AuthProvider>");
  return ctx;
}
