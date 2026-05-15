import { create } from "zustand";
import { persist } from "zustand/middleware";

import i18n, { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      setLocale: (l) => {
        void i18n.changeLanguage(l);
        document.documentElement.lang = l;
        set({ locale: l });
      },
    }),
    {
      name: "data-agent.locale",
      onRehydrateStorage: () => (state) => {
        const locale = state?.locale ?? DEFAULT_LOCALE;
        void i18n.changeLanguage(locale);
        document.documentElement.lang = locale;
      },
    },
  ),
);
