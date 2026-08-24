import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  sidebarExpandedKeys: string[];
  sidebarHidden: boolean;
  topbarHidden: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setSidebarHidden: (v: boolean) => void;
  setTopbarHidden: (v: boolean) => void;
  toggleExpandKey: (key: string) => void;
  setExpandKey: (key: string, expanded: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarExpandedKeys: [],
      sidebarHidden: false,
      topbarHidden: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setSidebarHidden: (v) => set({ sidebarHidden: v }),
      setTopbarHidden: (v) => set({ topbarHidden: v }),
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
