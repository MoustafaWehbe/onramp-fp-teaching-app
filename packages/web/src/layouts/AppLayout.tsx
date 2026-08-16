import { Outlet, useLocation } from "react-router-dom";
import { GeneralAssistantLauncher } from "../components/assistant";
import { Header } from "../components/layout/Header";
import { Sidebar } from "../components/layout/Sidebar";

export function hasSpecializedAssistant(pathname: string): boolean {
  const isCourseContext = /^\/courses\/[^/]+(?:\/|$)/.test(pathname);
  const isInstructorContext =
    pathname === "/instructor/dashboard" ||
    /^\/instructor\/submissions(?:\/|$)/.test(pathname);

  return isCourseContext || isInstructorContext;
}

export function AppLayout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="w-full max-w-6xl flex-1 p-6 pb-24 md:p-10">
          <Outlet />
        </main>
      </div>
      {!hasSpecializedAssistant(pathname) && <GeneralAssistantLauncher />}
    </div>
  );
}
