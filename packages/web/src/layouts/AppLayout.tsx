import { Outlet } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { Sidebar } from "../components/layout/Sidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="w-full max-w-6xl flex-1 p-6 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
