import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Shuffle, Expand, ChevronDown, Download, Map, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import { useKnowledgeGraphStore, type LayoutKind } from "../../store";
import type { Vertex, Edge } from "../../api/mock";

const LAYOUTS: { key: LayoutKind; label: string }[] = [
  { key: "force",       label: "力导向" },
  { key: "hierarchical", label: "层次" },
  { key: "circular",   label: "圆形" },
  { key: "radial",     label: "径向" },
  { key: "grid",       label: "网格" },
  { key: "dagre",      label: "Dagre" },
];

interface GraphState { vertices: Vertex[]; edges: Edge[]; }

export function VisualizationPage() {
  const { t } = useTranslation("knowledge-graph");
  const layout = useKnowledgeGraphStore((s) => s.visualization.layout);
  const setLayout = useKnowledgeGraphStore((s) => s.setVisualizationLayout);
  const setRoot = useKnowledgeGraphStore((s) => s.setVisualizationRoot);
  const addExpanded = useKnowledgeGraphStore((s) => s.addExpandedVertex);

  const [search, setSearch] = useState("");
  const [graph, setGraph] = useState<GraphState | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedVertex, setSelectedVertex] = useState<Vertex | null>(null);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [expandDepth] = useState(1);

  const startExplore = async (vertexId: string) => {
    setLoading(true);
    try {
      const r = await mockClient.post<{ vertex: Vertex; oneHop: GraphState }>(
        "/api/knowledge-graph/visualization/start",
        { vertexId },
      );
      setRoot(r.vertex.id);
      setGraph({ vertices: [r.vertex, ...r.oneHop.vertices], edges: r.oneHop.edges });
    } finally {
      setLoading(false);
    }
  };

  const expandNeighbors = async (vertexId: string) => {
    if (!graph) return;
    setLoading(true);
    try {
      const r = await mockClient.post<GraphState>(
        "/api/knowledge-graph/visualization/expand",
        { vertexId, depth: expandDepth },
      );
      addExpanded(vertexId);
      setGraph((prev) => {
        if (!prev) return r;
        const existingIds = new Set(prev.vertices.map((v) => v.id));
        return {
          vertices: [...prev.vertices, ...r.vertices.filter((v) => !existingIds.has(v.id))],
          edges: [...prev.edges, ...r.edges],
        };
      });
    } finally {
      setLoading(false);
    }
  };

  const randomStart = () => {
    const ids = ["v1", "v6", "v8", "v10"];
    const picked = ids[Math.floor(Math.random() * ids.length)];
    void startExplore(picked);
  };

  return (
    <div className="workspace-shell flex flex-col animate-fade-in">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-2">
        {/* Start vertex */}
        <div className="flex h-7 items-center gap-2 rounded border border-border bg-background px-3">
          <Search className="h-3 w-3 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && search) void startExplore(search); }}
            placeholder={t("visualization.start.placeholder")}
            className="w-44 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button type="button" onClick={randomStart} title={t("visualization.start.random")} className="flex h-7 items-center gap-1.5 rounded border border-border px-3 text-[12px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
          <Shuffle className="h-3 w-3" />随机
        </button>

        <span className="text-border">|</span>

        {/* Quick actions */}
        {(["commonNeighbors", "shortestPath", "subgraph", "patternSearch"] as const).map((qa) => (
          <button
            key={qa}
            type="button"
            disabled={!graph}
            className="h-7 rounded border border-border px-3 text-[12px] text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40 transition-colors"
          >
            {t(`visualization.qa.${qa === "commonNeighbors" ? "commonNeighbors" : qa === "shortestPath" ? "shortestPath" : qa === "subgraph" ? "subgraph" : "patternSearch"}`)}
          </button>
        ))}

        <span className="text-border">|</span>

        {/* Layout picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLayoutOpen((v) => !v)}
            className="flex h-7 items-center gap-1.5 rounded border border-border px-3 text-[12px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            {LAYOUTS.find((l) => l.key === layout)?.label ?? layout}
            <ChevronDown className="h-3 w-3" />
          </button>
          {layoutOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-28 rounded border border-border bg-background shadow-sm">
              {LAYOUTS.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => { setLayout(l.key); setLayoutOpen(false); }}
                  className={cn("w-full px-3 py-1.5 text-left text-[12px] hover:bg-accent transition-colors", l.key === layout && "text-primary font-medium")}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />
        <button type="button" title={t("visualization.export")} className="flex h-7 items-center gap-1 rounded border border-border px-3 text-[12px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
          <Download className="h-3 w-3" />导出
        </button>
      </div>

      {/* Canvas area */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {!graph ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-grid-paper">
            <p className="text-[15px] font-medium text-muted-foreground">{t("visualization.start.hint")}</p>
            <div className="flex items-center gap-2 rounded border border-border bg-background px-4 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && search) void startExplore(search); }}
                placeholder="输入顶点 ID…"
                className="w-48 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button type="button" onClick={randomStart} className="flex h-8 items-center gap-2 rounded border border-primary bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:opacity-90 transition-opacity">
              <Shuffle className="h-4 w-4" />{t("visualization.start.random")}
            </button>
          </div>
        ) : (
          <>
            <Canvas
              graph={graph}
              selectedId={selectedVertex?.id ?? null}
              onSelect={(v) => setSelectedVertex(v)}
              onExpand={(v) => void expandNeighbors(v.id)}
              loading={loading}
            />

            {/* Mini-map placeholder */}
            <div className="absolute bottom-4 right-4 h-24 w-32 rounded border border-border bg-background/90 shadow-sm flex items-center justify-center">
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Map className="h-3 w-3" />Mini-map
              </div>
            </div>

            {/* Property panel */}
            {selectedVertex && (
              <PropertyPanel vertex={selectedVertex} onClose={() => setSelectedVertex(null)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Canvas({ graph, selectedId, onSelect, onExpand, loading }: {
  graph: GraphState;
  selectedId: string | null;
  onSelect: (v: Vertex) => void;
  onExpand: (v: Vertex) => void;
  loading: boolean;
}) {
  const W = 800, H = 500;
  // Distribute vertices in a simple force-like grid
  const cols = Math.max(3, Math.ceil(Math.sqrt(graph.vertices.length)));
  const positioned = graph.vertices.map((v, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    return {
      ...v,
      cx: (v.x ?? 60 + col * 110) || 60 + col * 110,
      cy: (v.y ?? 60 + row * 100) || 60 + row * 100,
    };
  });
  const posMap = Object.fromEntries(positioned.map((v) => [v.id, v]));

  return (
    <div className="flex-1 bg-grid-paper overflow-hidden relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 z-10">
          <span className="text-[12px] text-muted-foreground">加载中…</span>
        </div>
      )}
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} className="cursor-default">
        <defs>
          <marker id="viz-arrow" markerWidth="7" markerHeight="7" orient="auto" refX="6" refY="3">
            <path d="M0,0 L0,6 L6,3 z" fill="hsl(var(--muted-foreground))" />
          </marker>
        </defs>
        {graph.edges.map((e) => {
          const s = posMap[e.sourceId], t_ = posMap[e.targetId];
          if (!s || !t_) return null;
          return (
            <g key={e.id}>
              <line x1={s.cx} y1={s.cy} x2={t_.cx} y2={t_.cy}
                stroke="hsl(var(--border))" strokeWidth={1.2} markerEnd="url(#viz-arrow)" />
              <text x={(s.cx + t_.cx) / 2} y={(s.cy + t_.cy) / 2 - 4}
                textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{e.label}</text>
            </g>
          );
        })}
        {positioned.map((v) => {
          const isSelected = v.id === selectedId;
          const labelColor = v.label === "Company" ? "#059669" : v.label === "Product" ? "#d97706" : "#2849D8";
          return (
            <g key={v.id} className="cursor-pointer" onClick={() => onSelect(v)} onDoubleClick={() => onExpand(v)}>
              <circle cx={v.cx} cy={v.cy} r={isSelected ? 20 : 16}
                fill={isSelected ? labelColor : "hsl(var(--card))"}
                stroke={labelColor} strokeWidth={isSelected ? 2 : 1.5} />
              <text x={v.cx} y={v.cy + 4} textAnchor="middle" fontSize="9"
                fill={isSelected ? "white" : "hsl(var(--muted-foreground))"}>
                {v.label.slice(0, 3)}
              </text>
              <text x={v.cx} y={v.cy + 32} textAnchor="middle" fontSize="10"
                fill="hsl(var(--foreground))">
                {String(v.properties.name ?? v.id).slice(0, 8)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PropertyPanel({ vertex, onClose }: { vertex: Vertex; onClose: () => void }) {
  const { t } = useTranslation("knowledge-graph");
  return (
    <div className="absolute right-0 top-0 h-full w-64 overflow-y-auto border-l border-border bg-background shadow-sm animate-slide-in-right scrollbar-thin">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-[13px] font-medium">{t("visualization.property.title")}</span>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="px-4 py-4 space-y-3">
        <KV label="ID" value={vertex.id} />
        <KV label="Label" value={vertex.label} />
        {Object.entries(vertex.properties).map(([k, v]) => (
          <KV key={k} label={k} value={String(v)} />
        ))}
      </div>
      <div className="border-t border-border px-4 py-3">
        <button type="button" className="flex h-7 w-full items-center justify-center gap-1.5 rounded border border-border text-[12px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
          <Expand className="h-3 w-3" />扩展邻居
        </button>
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="mt-0.5 break-words font-mono text-[12px]">{value}</div>
    </div>
  );
}
