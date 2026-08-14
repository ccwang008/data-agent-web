import { create } from "zustand";
import { persist } from "zustand/middleware";

import { readSqliteState, writeSqliteState } from "@/lib/sqlite-client";

import {
  cloneMenuConfig,
  createDefaultMenuConfig,
  loadMenuConfigFromPublic,
  normalizeMenuConfig,
  type MenuConfig,
} from "./registry";

const PERSIST_KEY = "data-agent.menu";
const MENU_SQLITE_SCOPE = "data-agent.settings.menu";

interface MenuStoreState {
  config: MenuConfig;
  draft: MenuConfig | null;
  hydratedFromFile: boolean;
  beginEdit: () => void;
  setDraft: (config: MenuConfig) => void;
  commitDraft: () => Promise<void>;
  discardDraft: () => void;
  resetToDefault: () => Promise<void>;
  hydrateFromFile: () => Promise<void>;
}

function hasUserPersistedConfig() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PERSIST_KEY) !== null;
  } catch {
    return false;
  }
}

export const useMenuStore = create<MenuStoreState>()(
  persist(
    (set, get) => ({
      config: createDefaultMenuConfig(),
      draft: null,
      hydratedFromFile: false,
      beginEdit: () =>
        set((s) => ({
          draft: s.draft ?? cloneMenuConfig(normalizeMenuConfig(s.config)),
        })),
      setDraft: (config) => set({ draft: config }),
      commitDraft: async () => {
        const draft = get().draft;
        if (!draft) return;

        const nextConfig = {
          ...normalizeMenuConfig(cloneMenuConfig(draft)),
          updatedAt: new Date().toISOString(),
        };
        await writeSqliteState(MENU_SQLITE_SCOPE, nextConfig);
        set({ config: nextConfig, draft: null });
      },
      discardDraft: () => set({ draft: null }),
      resetToDefault: async () => {
        const fileConfig = await loadMenuConfigFromPublic();
        const nextConfig = { ...fileConfig, updatedAt: new Date().toISOString() };
        await writeSqliteState(MENU_SQLITE_SCOPE, nextConfig);
        set({
          config: nextConfig,
          draft: null,
        });
      },
      hydrateFromFile: async () => {
        if (get().hydratedFromFile) return;

        try {
          const storedConfig = await readSqliteState<MenuConfig>(MENU_SQLITE_SCOPE);
          if (storedConfig && Array.isArray(storedConfig.root)) {
            set({
              config: normalizeMenuConfig(storedConfig),
              draft: null,
              hydratedFromFile: true,
            });
            return;
          }
        } catch {
          // Fall back to the browser cache or public defaults when the dev API is unavailable.
        }

        if (hasUserPersistedConfig()) {
          set({ hydratedFromFile: true });
          try {
            await writeSqliteState(
              MENU_SQLITE_SCOPE,
              normalizeMenuConfig(cloneMenuConfig(get().config)),
            );
          } catch {
            // Keep the legacy browser cache as a fallback until SQLite is available.
          }
          return;
        }
        const fileConfig = await loadMenuConfigFromPublic();
        set({
          config: fileConfig,
          draft: null,
          hydratedFromFile: true,
        });

        try {
          await writeSqliteState(MENU_SQLITE_SCOPE, fileConfig);
        } catch {
          // The public config remains a valid fallback until SQLite is available.
        }
      },
    }),
    {
      name: PERSIST_KEY,
      version: 7,
      partialize: (s) => ({ config: s.config }),
      migrate: (persistedState) => {
        const state = persistedState as Partial<MenuStoreState> | undefined;
        const config = state?.config;

        return {
          ...state,
          config: config ? normalizeMenuConfig(config) : createDefaultMenuConfig(),
          draft: null,
        };
      },
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<MenuStoreState> | undefined;
        const config = state?.config;

        return {
          ...currentState,
          ...state,
          config: config ? normalizeMenuConfig(config) : currentState.config,
          draft: null,
        };
      },
    },
  ),
);
