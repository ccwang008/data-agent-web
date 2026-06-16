import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

const ROUTE_LABELS: Record<string, string> = {
  "knowledge-graph": "Knowledge Graph",
  graphs: "Graphs",
  metadata: "Metadata",
  import: "Import",
  analysis: "Analysis",
  visualization: "Visualization",
  "async-tasks": "Async Tasks",
  computer: "Computer",
  ai: "AI",
  admin: "Admin",
  help: "Help",
  "knowledge-center": "Knowledge Center",
  "knowledge-bases": "Knowledge Base",
  documents: "Documents",
  vectors: "Knowledge Vectors",
  permissions: "Permissions",
  "data-source": "Data Source",
  agents: "Agents",
  workflow: "Workflow",
  insights: "Insights",
  settings: "Settings",
};

function pathToCrumbs(pathname: string) {
  return pathname.split("/").filter(Boolean);
}

export function TopBar() {
  const { t } = useTranslation();
  const location = useLocation();
  const crumbs = pathToCrumbs(location.pathname);

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-5 shadow-sm">
      {/* Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]">
        <span className="text-muted-foreground/40">/</span>
        {crumbs.map((c, i) => (
          <span key={`${c}-${i}`} className="flex items-center gap-1.5">
            <span
              className={cn(
                i === crumbs.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {ROUTE_LABELS[c] ?? c}
            </span>
            {i < crumbs.length - 1 && (
              <span className="text-muted-foreground/40">/</span>
            )}
          </span>
        ))}
      </div>

      {/* Search (visual placeholder) */}
      <div className="hidden h-9 min-w-[240px] max-w-[360px] flex-1 items-center gap-2 rounded-md border border-border bg-muted/60 px-3 text-[13px] text-muted-foreground md:flex">
        <Search className="h-3.5 w-3.5" />
        <span className="truncate">{t("topbar.search")}</span>
        <kbd className="ml-auto rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/70">⌘K</kbd>
      </div>

      {/* User */}
      <div className="grid h-8 w-8 place-items-center rounded-md border border-border bg-secondary font-mono text-[10px] font-semibold uppercase text-foreground">
        OP
      </div>
    </header>
  );
}
