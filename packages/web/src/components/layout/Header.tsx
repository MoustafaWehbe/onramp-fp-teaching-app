import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const profilePath =
    user?.role === "instructor" ? "/instructor/profile" : "/profile";

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // AuthProvider clears the local session even when the API request fails.
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      <Link
        to="/"
        className="text-base font-bold tracking-tight text-foreground"
      >
        Bootcamp<span className="text-primary">.</span>
      </Link>
      <div className="flex items-center gap-3">
        <Link
          to={profilePath}
          className="hidden text-sm text-muted-foreground transition-colors hover:text-primary sm:inline"
        >
          {user?.name}
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
