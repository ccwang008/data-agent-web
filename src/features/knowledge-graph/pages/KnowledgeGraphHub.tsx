import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import { useKnowledgeGraphStore } from "../store";
import type { GraphInstance, Perspective } from "../api/mock";

export function KnowledgeGraphHub() {
  const { t } = useTranslation("knowledge-graph");
  const navigate = useNavigate();
  const currentGraphId = useKnowledgeGraphStore((s) => s.currentGraphId);
  const activePerspectiveId = useKnowledgeGraphStore((s) => s.activePerspectiveId);
  const setCurrentGraphId = useKnowledgeGraphStore((s) => s.setCurrentGraphId);
  const setActivePerspectiveId = useKnowledgeGraphStore((s) => s.setActivePerspectiveId);

  const [graphs, setGraphs] = useState<GraphInstance[]>([]);
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [graphOpen, setGraphOpen] = useState(false);
  const [perspOpen, setPerspOpen] = useState(false);

  useEffect(() => {
    void mockClient.get<GraphInstance[]>("/api/knowledge-graph/graphs/list").then((list) => {
      setGraphs(list);
      if (!currentGraphId && list[0]) setCurrentGraphId(list[0].id);
    });
    void mockClient.get<Perspective[]>("/api/knowledge-graph/perspectives/list").then((list) => {
      setPerspectives(list);
    });
  }, [currentGraphId, setCurrentGraphId]);

  const currentGraph = graphs.find((g) => g.id === currentGraphId);
  const currentPersp = perspectives.find((p) => p.id === activePerspectiveId);

  return (
    <div className="flex h-full flex-col">
      {/* KG Hub TopBar */}
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-border bg-surface px-5">
        {/* Graph instance switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setGraphOpen((v) => !v); setPerspOpen(false); }}
            className="flex h-7 items-center gap-2 rounded border border-border bg-background px-3 text-[12px] text-foreground hover:border-primary/50 transition-colors"
          >
            <StatusDot status={currentGraph?.status} />
            <span className="max-w-[160px] truncate font-medium">
              {currentGraph?.name ?? t("hub.noGraph")}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          {graphOpen && graphs.length > 0 && (
            <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded border border-border bg-background shadow-sm">
              {graphs.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => { setCurrentGraphId(g.id); setGraphOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-accent transition-colors",
                    g.id === currentGraphId && "bg-accent",
                  )}
                >
                  <StatusDot status={g.status} />
                  <span className="truncate">{g.name}</span>
                </button>
              ))}
              <div className="border-t border-border px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => { setGraphOpen(false); navigate("/knowledge-graph/graphs"); }}
                  className="text-[11px] text-primary hover:underline"
                >
                  管理图实例 →
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="text-border">|</span>

        {/* Perspective switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setPerspOpen((v) => !v); setGraphOpen(false); }}
            className="flex h-7 items-center gap-2 rounded border border-border bg-background px-3 text-[12px] text-muted-foreground hover:border-primary/50 transition-colors"
          >
            <span className="eyebrow">视角</span>
            <span className="max-w-[120px] truncate text-foreground">
              {currentPersp?.name ?? "默认视角"}
            </span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {perspOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded border border-border bg-background shadow-sm">
              <button
                type="button"
                onClick={() => { setActivePerspectiveId(null); setPerspOpen(false); }}
                className={cn(
                  "flex w-full px-3 py-2 text-left text-[12px] hover:bg-accent transition-colors",
                  !activePerspectiveId && "bg-accent font-medium",
                )}
              >
                默认视角
              </button>
              {perspectives
                .filter((p) => p.graphId === currentGraphId)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setActivePerspectiveId(p.id); setPerspOpen(false); }}
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-[12px] hover:bg-accent transition-colors",
                      p.id === activePerspectiveId && "bg-accent font-medium",
                    )}
                  >
                    {p.name}
                  </button>
                ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Notification center (shell) */}
        <button
          type="button"
          className="relative grid h-7 w-7 place-items-center rounded border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
          title={t("hub.notifications")}
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
        </button>
      </div>

      {/* Sub-page outlet */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

function StatusDot({ status }: { status?: string }) {
  const color =
    status === "healthy" ? "bg-emerald-500" :
    status === "warning" ? "bg-amber-400" :
    "bg-gray-400";
  return <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", color)} />;
}
