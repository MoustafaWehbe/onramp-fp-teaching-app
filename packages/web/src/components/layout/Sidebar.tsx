import { NavLink } from "react-router-dom";
import { BookOpen, GraduationCap, Inbox, User } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";

export function Sidebar() {
  const { user } = useAuth();
  const isInstructor = user?.role === "instructor";
  const navItems = isInstructor
    ? [
        { to: "/courses", label: "My Courses", icon: BookOpen },
        { to: "/instructor/submissions", label: "Submissions", icon: Inbox },
        { to: "/instructor/profile", label: "My Profile", icon: User },
      ]
    : [
        { to: "/courses", label: "My Courses", icon: BookOpen },
        { to: "/grades", label: "My Grades", icon: GraduationCap },
        { to: "/profile", label: "My Profile", icon: User },
      ];

  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar md:static md:z-auto md:min-h-[calc(100vh-3.5rem)] md:w-60 md:shrink-0 md:border-r md:border-t-0">
      <div className="hidden px-6 pb-3 pt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground md:block">
        {isInstructor ? "Instructor" : "Student"}
      </div>
      <nav
        aria-label="Primary navigation"
        className="grid grid-cols-3 gap-1 p-2 md:block md:space-y-1 md:p-3 md:pt-0"
      >
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-md px-2 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:flex-row md:gap-3 md:border-l-2 md:px-3 md:text-sm",
                isActive
                  ? "bg-accent text-primary md:border-primary"
                  : "text-sidebar-foreground hover:bg-accent/60 md:border-transparent",
              )
            }
          >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
