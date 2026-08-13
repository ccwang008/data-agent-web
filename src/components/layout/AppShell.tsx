import { Outlet, useLocation } from "react-router-dom";

import { useUIStore } from "@/stores/useUIStore";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  const sidebarHidden = useUIStore((s) => s.sidebarHidden);
  const topbarHidden = useUIStore((s) => s.topbarHidden);
  const location = useLocation();
  const isCompanyLanding = location.pathname === "/" || location.pathname === "/solutions";

  return (
    <div className="flex min-h-screen w-screen bg-background text-foreground">
      {!isCompanyLanding && !sidebarHidden && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        {!isCompanyLanding && !topbarHidden && <TopBar />}
        <main className="flex-1 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
