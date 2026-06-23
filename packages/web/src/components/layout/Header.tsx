import { LogOut, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-end border-b bg-card px-6 gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span>{user?.name}</span>
      </div>
      <button
        onClick={logout}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </header>
  );
}
