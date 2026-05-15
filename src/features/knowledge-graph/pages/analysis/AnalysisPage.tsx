import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Share2, Download, ExternalLink, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import { useKnowledgeGraphStore } from "../../store";
import type { Vertex, Edge } from "../../api/mock";

const DEFAULT_GREMLIN = `g.V().hasLabel('Company')
  .has('industry', '互联网')
  .limit(20)`;

const DEFAULT_CYPHER = `MATCH (c:Company {industry: '互联网'})
RETURN c LIMIT 20`;

type EditorMode = "gremlin" | "cypher" | "visualBuilder";
type ResultTab = "graph" | "table" | "json";

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  graph?: { vertices: Vertex[]; edges: Edge[] };
}

export function AnalysisPage() {
  const { t } = useTranslation("knowledge-graph");
  const editorMode = useState<EditorMode>("gremlin");
  const resultTab = useState<ResultTab>("graph");
  const [gremlinQuery, setGremlinQuery] = useState(DEFAULT_GREMLIN);
  const [cypherQuery, setCypherQuery] = useState(DEFAULT_CYPHER);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addToHistory = useKnowledgeGraphStore((s) => s.addQueryToHistory);
  const history = useKnowledgeGraphStore((s) => s.queryHistory);

  const [mode, setMode] = editorMode;
  const [resTab, setResTab] = resultTab;

  const run = async () => {
    setRunning(true); setError(null);
    const body = mode === "gremlin" ? { query: gremlinQuery } : { query: cypherQuery };
    const endpoint = mode === "gremlin"
      ? "/api/knowledge-graph/analysis/gremlin"
      : "/api/knowledge-graph/analysis/cypher";
    try {
      const r = await mockClient.post<QueryResult>(endpoint, body);
      setResult(r);
      addToHistory({
        id: `qr-${Date.now()}`, graphId: "hugegraph-demo", mode,
        body: mode === "gremlin" ? gremlinQuery : cypherQuery,
        executedAt: new Date().toLocaleString(), status: "success",
        durationMs: 220, rowCount: r.rows.length, starred: false,
      });
      if (r.graph) setResTab("graph"); else setResTab("table");
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="workspace-shell flex flex-col animate-fade-in">
      {/* Editor (top) */}
      <div className="border-b border-border bg-surface">
        {/* Mode tabs */}
        <div className="flex items-center gap-0 border-b border-border px-4">
          {(["gremlin", "cypher", "visualBuilder"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "px-4 py-2.5 text-[13px] border-b-2 -mb-px transition-colors",
                mode === m ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`analysis.editor.${m === "visualBuilder" ? "visual" : m}`)}
            </button>
          ))}
          <div className="flex-1" />
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="flex h-7 items-center gap-1.5 rounded border border-primary bg-primary px-3 text-[12px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity mr-3"
          >
            <Play className="h-3 w-3" />
            {running ? "执行中…" : t("analysis.editor.run")}
          </button>
        </div>

        {/* Editor body */}
        <div className="px-4 py-3">
          {mode === "visualBuilder" ? (
            <VisualBuilder />
          ) : (
            <div className="relative">
              <textarea
                value={mode === "gremlin" ? gremlinQuery : cypherQuery}
                onChange={(e) => mode === "gremlin" ? setGremlinQuery(e.target.value) : setCypherQuery(e.target.value)}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); void run(); } }}
                className="h-28 w-full resize-none rounded border border-border bg-background px-4 py-3 font-mono text-[13px] leading-5 text-foreground outline-none focus:border-primary scrollbar-thin"
                spellCheck={false}
              />
              <span className="absolute bottom-2 right-3 font-mono text-[10px] text-muted-foreground/50">⌘ Enter</span>
            </div>
          )}
          {error && <div className="mt-2 text-[12px] text-destructive">{error}</div>}
        </div>
      </div>

      {/* Result (middle) — flex-1 */}
      <div className="flex min-h-0 flex-1 flex-col border-b border-border">
        {/* Result tabs + toolbar */}
        <div className="flex items-center gap-0 border-b border-border bg-surface px-4">
          {(["graph", "table", "json"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setResTab(tab)}
              className={cn(
                "px-4 py-2 text-[12px] border-b-2 -mb-px transition-colors",
                resTab === tab ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`analysis.result.${tab}`)}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-1 py-1.5 pr-1">
            {[
              { icon: Download, label: t("analysis.result.export") },
              { icon: ExternalLink, label: t("analysis.result.openViz") },
              { icon: Share2, label: t("analysis.result.share") },
            ].map(({ icon: Icon, label }) => (
              <button key={label} title={label} type="button" className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                <Icon className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>

        {/* Result content */}
        <div className="flex-1 overflow-auto scrollbar-thin p-4">
          {!result ? (
            <div className="grid h-full min-h-32 place-items-center text-[13px] text-muted-foreground">{t("analysis.result.empty")}</div>
          ) : resTab === "graph" && result.graph ? (
            <GraphResultView vertices={result.graph.vertices} edges={result.graph.edges} />
          ) : resTab === "table" ? (
            <TableResultView columns={result.columns} rows={result.rows} />
          ) : (
            <pre className="font-mono text-[12px] text-foreground">{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      </div>

      {/* History (bottom) */}
      <div className="h-36 overflow-y-auto scrollbar-thin border-t border-border bg-surface px-4 py-2">
        <div className="eyebrow mb-2">{t("analysis.history.title")}</div>
        {history.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">{t("analysis.history.empty")}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {history.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded border border-border bg-background px-3 py-1.5 text-[12px]">
                <span className="font-mono text-muted-foreground text-[10px]">{item.executedAt}</span>
                <span className="flex-1 truncate font-mono text-foreground">{item.body.split("\n")[0]}</span>
                <span className={cn("font-mono text-[10px] uppercase", item.status === "success" ? "text-emerald-600" : "text-destructive")}>{item.status}</span>
                <button type="button" className="text-muted-foreground hover:text-primary transition-colors">
                  <Star className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GraphResultView({ vertices, edges }: { vertices: Vertex[]; edges: Edge[] }) {
  if (vertices.length === 0) return <div className="grid place-items-center h-full text-[13px] text-muted-foreground">无图结果</div>;

  const W = 700, H = 340;
  const cols = Math.ceil(Math.sqrt(vertices.length));
  const spacing = Math.min(W / (cols + 1), 90);
  const positioned = vertices.map((v, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    return { ...v, cx: 60 + col * spacing, cy: 60 + row * spacing };
  });
  const posMap = Object.fromEntries(positioned.map((v) => [v.id, v]));

  return (
    <div className="rounded border border-border bg-grid-paper overflow-hidden" style={{ height: H }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <marker id="ar-arrow" markerWidth="6" markerHeight="6" orient="auto" refX="6" refY="3">
            <path d="M0,0 L0,6 L6,3 z" fill="hsl(var(--muted-foreground))" />
          </marker>
        </defs>
        {edges.map((e) => {
          const s = posMap[e.sourceId], t = posMap[e.targetId];
          if (!s || !t) return null;
          return (
            <line key={e.id} x1={s.cx} y1={s.cy} x2={t.cx} y2={t.cy}
              stroke="hsl(var(--muted-foreground))" strokeWidth={1.2} markerEnd="url(#ar-arrow)" />
          );
        })}
        {positioned.map((v) => (
          <g key={v.id}>
            <circle cx={v.cx} cy={v.cy} r={16} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth={1.5} />
            <text x={v.cx} y={v.cy + 28} textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))">
              {String(v.properties.name ?? v.id).slice(0, 10)}
            </text>
            <text x={v.cx} y={v.cy + 4} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">
              {v.label.slice(0, 3)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function TableResultView({ columns, rows }: { columns: string[]; rows: Record<string, unknown>[] }) {
  return (
    <div className="overflow-x-auto scrollbar-thin rounded border border-border">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-border bg-card">
          <tr>
            {columns.map((c) => <th key={c} className="px-4 py-2 font-medium text-[11px] uppercase text-muted-foreground">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
              {columns.map((c) => <td key={c} className="px-4 py-2 font-mono text-[12px]">{String(row[c] ?? "—")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VisualBuilder() {
  return (
    <div className="flex h-24 items-center justify-center rounded border border-dashed border-border text-[13px] text-muted-foreground">
      可视化查询构建器 · 拖拽 VertexLabel / EdgeLabel 构建模式查询（M3 实装）
    </div>
  );
}
