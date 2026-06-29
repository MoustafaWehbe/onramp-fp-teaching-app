import { Navigate, Outlet } from "react-router-dom";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { useAuth } from "../hooks/useAuth";

type RoleProtectedRouteProps = {
  allowedRoles: string[];
};

export function RoleProtectedRoute({ allowedRoles }: RoleProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
