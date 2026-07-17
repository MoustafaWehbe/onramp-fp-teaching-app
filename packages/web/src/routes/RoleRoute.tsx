import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../providers/AuthProvider";

export function RoleRoute({
  allow,
  redirectTo,
}: {
  allow: UserRole;
  redirectTo: string;
}) {
  const { user } = useAuth();
  return user?.role === allow ? (
    <Outlet />
  ) : (
    <Navigate to={redirectTo} replace />
  );
}
