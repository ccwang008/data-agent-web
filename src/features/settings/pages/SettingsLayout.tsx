import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Flag, ListTree, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface SettingsNavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

const SETTINGS_NAV: SettingsNavItem[] = [
  { to: "/settings/menu", labelKey: "settings.nav.menu", icon: ListTree },
  { to: "/settings/preferences", labelKey: "settings.nav.preferences", icon: SlidersHorizontal },
  { to: "/settings/users", labelKey: "settings.nav.users", icon: Users },
  { to: "/settings/permissions", labelKey: "settings.nav.permissions", icon: ShieldCheck },
  { to: "/settings/audit", labelKey: "settings.nav.audit", icon: ShieldCheck },
  { to: "/settings/flags", labelKey: "settings.nav.flags", icon: Flag },
];

export function SettingsLayout() {
  const { t } = useTranslation();

  return (
    <section className="page-shell flex flex-col gap-4 animate-fade-in">
      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <span className="eyebrow">{t("settings.eyebrow")}</span>
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-foreground">
              {t("settings.title")}
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {t("settings.subtitle")}
            </p>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="saas-panel flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
          {SETTINGS_NAV.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-accent text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            );
          })}
        </nav>

        <Outlet />
      </div>
    </section>
  );
}
