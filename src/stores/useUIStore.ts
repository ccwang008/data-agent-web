import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  sidebarExpandedKeys: string[];
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleExpandKey: (key: string) => void;
  setExpandKey: (key: string, expanded: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarExpandedKeys: ["kg"],
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleExpandKey: (key) =>
        set((s) => ({
          sidebarExpandedKeys: s.sidebarExpandedKeys.includes(key)
            ? s.sidebarExpandedKeys.filter((k) => k !== key)
            : [...s.sidebarExpandedKeys, key],
        })),
      setExpandKey: (key, expanded) =>
        set((s) => ({
          sidebarExpandedKeys: expanded
            ? [...new Set([...s.sidebarExpandedKeys, key])]
            : s.sidebarExpandedKeys.filter((k) => k !== key),
        })),
    }),
    { name: "data-agent.ui" },
  ),
);
