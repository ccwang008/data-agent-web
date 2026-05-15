import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FolderTree,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { useUIStore } from "@/stores/useUIStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BUILTIN_MENU,
  resolveMenuLabel,
  type MenuNode,
} from "@/features/settings/menu/registry";
import { useMenuStore } from "@/features/settings/menu/store";

export function Sidebar() {
  const { t, i18n } = useTranslation();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const menuConfig = useMenuStore((s) => s.config);
  const locale = normalizeLocale(i18n.resolvedLanguage || i18n.language);

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r border-border bg-card",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-[64px]" : "w-[244px]",
      )}
    >
      <div className="flex h-14 items-center gap-3 border-b border-border px-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary font-mono text-[11px] font-bold text-primary-foreground shadow-sm shadow-primary/20">
          DA
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-col leading-tight animate-fade-in">
            <span className="truncate text-[14px] font-semibold text-foreground">
              {t("app.name")}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">{t("app.tagline")}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4 scrollbar-thin">
        <ul className="flex flex-col gap-1">
          {menuConfig.root.filter((node) => node.visible).map((node) => (
            <li key={node.id}>
              <SidebarNode node={node} collapsed={collapsed} locale={locale} />
            </li>
          ))}
        </ul>
      </nav>

      <button
        type="button"
        onClick={toggle}
        aria-label={t("actions.toggleSidebar")}
        className={cn(
          "mx-2.5 mb-3 flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface text-muted-foreground shadow-sm transition-colors",
          "hover:border-primary/20 hover:bg-accent hover:text-primary",
        )}
      >
        {collapsed ? (
          <ChevronsRight className="h-3.5 w-3.5" />
        ) : (
          <>
            <ChevronsLeft className="h-3.5 w-3.5" />
            <span className="text-[12px] font-medium">{t("actions.toggleSidebar")}</span>
          </>
        )}
      </button>
    </aside>
  );
}

function SidebarNode({
  node,
  collapsed,
  locale,
  compact = false,
}: {
  node: MenuNode;
  collapsed: boolean;
  locale: Locale;
  compact?: boolean;
}) {
  const entry = node.builtinRouteKey ? BUILTIN_MENU[node.builtinRouteKey] : undefined;
  const children = visibleChildren(node);
  const to = entry?.to;
  const shouldRenderGroup = children.length > 0 || !to;

  if (shouldRenderGroup) {
    return (
      <GroupNavItem
        node={node}
        childrenNodes={children}
        collapsed={collapsed}
        locale={locale}
        compact={compact}
      />
    );
  }

  return (
    <LeafNavItem
      node={node}
      to={to}
      collapsed={collapsed}
      locale={locale}
      compact={compact}
    />
  );
}

function GroupNavItem({
  node,
  childrenNodes,
  collapsed,
  locale,
  compact,
}: {
  node: MenuNode;
  childrenNodes: MenuNode[];
  collapsed: boolean;
  locale: Locale;
  compact: boolean;
}) {
  const location = useLocation();
  const expanded = useUIStore((s) => s.sidebarExpandedKeys.includes(node.id));
  const toggle = useUIStore((s) => s.toggleExpandKey);
  const entry = node.builtinRouteKey ? BUILTIN_MENU[node.builtinRouteKey] : undefined;
  const Icon = entry?.icon ?? FolderTree;
  const label = resolveMenuLabel(node, locale);
  const isGroupActive = isNodeActive(node, location.pathname);

  const trigger = (
    <button
      type="button"
      onClick={() => toggle(node.id)}
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors",
        compact ? "h-8" : "h-9",
        isGroupActive
          ? "bg-accent text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {isGroupActive && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-primary"
        />
      )}
      <Icon className={cn("h-4 w-4 shrink-0", isGroupActive && "text-primary")} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">{label}</span>
          {entry?.status === "todo" && (
            <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">todo</span>
          )}
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      {trigger}
      {expanded && (
        <ul className="mt-1 ml-4 flex flex-col gap-1 border-l border-border/80 pl-3.5">
          {childrenNodes.map((child) => (
            <li key={child.id}>
              <SidebarNode node={child} collapsed={false} locale={locale} compact />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LeafNavItem({
  node,
  to,
  collapsed,
  locale,
  compact = false,
}: {
  node: MenuNode;
  to: string;
  collapsed: boolean;
  locale: Locale;
  compact?: boolean;
}) {
  const entry = node.builtinRouteKey ? BUILTIN_MENU[node.builtinRouteKey] : undefined;
  const Icon = entry?.icon ?? FolderTree;
  const label = resolveMenuLabel(node, locale);

  const content = (
    <NavLink
      to={to}
      end={!entry?.matchPrefix}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-2 rounded px-2 text-[13px] transition-colors",
          compact ? "h-8 rounded-md" : "h-9 rounded-md px-2.5",
          isActive
            ? "bg-accent text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r bg-primary",
                compact ? "h-4" : "h-5",
              )}
            />
          )}
          <Icon
            className={cn(
              "shrink-0",
              compact ? "h-3.5 w-3.5" : "h-4 w-4",
              isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
            )}
          />
          {!collapsed && (
            <span className="flex flex-1 items-center justify-between gap-1.5 truncate">
              <span className="truncate">{label}</span>
              {entry?.status === "todo" && !compact && (
                <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                  todo
                </span>
              )}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  if (!collapsed) return content;

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function visibleChildren(node: MenuNode) {
  return (node.children ?? []).filter((child) => child.visible);
}

function isNodeActive(node: MenuNode, pathname: string): boolean {
  const entry = node.builtinRouteKey ? BUILTIN_MENU[node.builtinRouteKey] : undefined;
  const selfActive = Boolean(
    entry?.matchPrefix
      ? pathname.startsWith(entry.matchPrefix)
      : entry?.to && pathname === entry.to,
  );

  return selfActive || (node.children ?? []).some((child) => child.visible && isNodeActive(child, pathname));
}

function normalizeLocale(language: string): Locale {
  return language.startsWith("zh") ? "zh-CN" : language.startsWith("en") ? "en-US" : DEFAULT_LOCALE;
}
