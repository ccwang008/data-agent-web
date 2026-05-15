import { Check, Languages, ServerCog } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { useLocaleStore } from "@/stores/useLocaleStore";

const LOCALE_LABELS: Record<Locale, { title: string; description: string }> = {
  "zh-CN": {
    title: "中文",
    description: "简体中文界面",
  },
  "en-US": {
    title: "English",
    description: "English interface",
  },
};

export function PreferencesPage() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="saas-panel min-w-0 p-5">
        <div className="flex items-start gap-3 border-b border-border pb-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-primary/20 bg-accent text-primary">
            <Languages className="h-5 w-5" />
          </div>
          <div>
            <div className="eyebrow">{t("settings.preferences.language.eyebrow")}</div>
            <h2 className="mt-1 text-[18px] font-semibold text-foreground">
              {t("settings.preferences.language.title")}
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
              {t("settings.preferences.language.description")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {SUPPORTED_LOCALES.map((item) => {
            const selected = locale === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => setLocale(item)}
                className={cn(
                  "flex min-h-[92px] items-start justify-between gap-3 rounded-md border p-4 text-left transition-colors",
                  selected
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                <span>
                  <span className="block text-[15px] font-semibold text-foreground">
                    {LOCALE_LABELS[item].title}
                  </span>
                  <span className="mt-1 block text-[12px] text-muted-foreground">
                    {LOCALE_LABELS[item].description}
                  </span>
                </span>
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent",
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="saas-panel p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
            <ServerCog className="h-5 w-5" />
          </div>
          <div>
            <div className="eyebrow">{t("settings.preferences.mock.eyebrow")}</div>
            <h2 className="mt-1 text-[17px] font-semibold text-foreground">
              {t("status.mock")}
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
              {t("settings.preferences.mock.description")}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-700">
          {t("settings.preferences.mock.current")}
        </div>

        <Button type="button" variant="outline" size="sm" className="mt-4 w-full" disabled>
          {t("settings.preferences.mock.readonly")}
        </Button>
      </aside>
    </div>
  );
}
