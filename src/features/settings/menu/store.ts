import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  cloneMenuConfig,
  createDefaultMenuConfig,
  loadMenuConfigFromPublic,
  normalizeMenuConfig,
  type MenuConfig,
} from "./registry";

const PERSIST_KEY = "data-agent.menu";

interface MenuStoreState {
  config: MenuConfig;
  draft: MenuConfig | null;
  hydratedFromFile: boolean;
  beginEdit: () => void;
  setDraft: (config: MenuConfig) => void;
  commitDraft: () => void;
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
      commitDraft: () =>
        set((s) => {
          if (!s.draft) return s;

          return {
            config: {
              ...normalizeMenuConfig(cloneMenuConfig(s.draft)),
              updatedAt: new Date().toISOString(),
            },
            draft: null,
          };
        }),
      discardDraft: () => set({ draft: null }),
      resetToDefault: async () => {
        const fileConfig = await loadMenuConfigFromPublic();
        set({
          config: { ...fileConfig, updatedAt: new Date().toISOString() },
          draft: null,
        });
      },
      hydrateFromFile: async () => {
        if (get().hydratedFromFile) return;
        if (hasUserPersistedConfig()) {
          set({ hydratedFromFile: true });
          return;
        }
        const fileConfig = await loadMenuConfigFromPublic();
        set({
          config: fileConfig,
          draft: null,
          hydratedFromFile: true,
        });
      },
    }),
    {
      name: PERSIST_KEY,
      version: 2,
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
