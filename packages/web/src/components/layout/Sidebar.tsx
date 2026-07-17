import { NavLink } from "react-router-dom";
import { BookOpen, GraduationCap, Inbox, User } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";

export function Sidebar() {
  const { user } = useAuth();
  const isInstructor = user?.role === "instructor";
  const navItems = isInstructor
    ? [
        { to: "/instructor/courses", label: "My Courses", icon: BookOpen },
        { to: "/instructor/submissions", label: "Submissions", icon: Inbox },
        { to: "/instructor/profile", label: "My Profile", icon: User },
      ]
    : [
        { to: "/dashboard", label: "My Courses", icon: BookOpen },
        { to: "/grades", label: "My Grades", icon: GraduationCap },
        { to: "/profile", label: "My Profile", icon: User },
      ];

  return (
    <aside className="hidden min-h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
      <div className="px-6 pb-3 pt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {isInstructor ? "Instructor" : "Student"}
      </div>
      <nav className="space-y-1 p-3 pt-0">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-accent text-primary"
                  : "border-transparent text-sidebar-foreground hover:bg-accent/60",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
