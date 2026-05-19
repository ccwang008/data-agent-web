import { Outlet } from "react-router-dom";

import { useUIStore } from "@/stores/useUIStore";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  const sidebarHidden = useUIStore((s) => s.sidebarHidden);
  const topbarHidden = useUIStore((s) => s.topbarHidden);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {!sidebarHidden && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!topbarHidden && <TopBar />}
        <main className="relative flex-1 overflow-hidden bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
