import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Merge, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import type { ExtractedVertex, ExtractedEdge, ExtractedClaim, AiGraphExtraction, Community } from "@/features/knowledge-graph/api/mock";
import { ClaimsTable } from "../components/ClaimsTable";
import { CommunityTree } from "../components/CommunityTree";
import { ReportCard } from "../components/ReportCard";

interface Props {
  extraction: AiGraphExtraction;
  vertices: ExtractedVertex[];
  edges: ExtractedEdge[];
  claims: ExtractedClaim[];
  onChange: (v: ExtractedVertex[], e: ExtractedEdge[], cl: ExtractedClaim[]) => void;
  onNavigateReports?: () => void;
}

type TabKey = "entities" | "relations" | "claims" | "communities" | "reports";
type DetailTarget = { kind: "vertex"; id: string } | { kind: "edge"; id: string } | null;

export function Step6Review({ extraction, vertices, edges, claims, onChange, onNavigateReports }: Props) {
  const { t } = useTranslation("knowledge-graph");
  const [tab, setTab] = useState<TabKey>("entities");
  const [selected, setSelected] = useState<DetailTarget>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

  const stats = extraction.stats;
  const lowCount = [...vertices, ...edges, ...claims].filter((x) => x.confidence < 0.5).length;
  const mergeSuggestions = findMergeSuggestions(vertices);

  const deleteVertex = (id: string) => {
    const next = vertices.filter((v) => v.id !== id);
    const nextEdges = edges.filter((e) => e.sourceVertexId !== id && e.targetVertexId !== id);
    if (selected?.kind === "vertex" && selected.id === id) setSelected(null);
    onChange(next, nextEdges, claims);
  };
  const deleteEdge = (id: string) => {
    const next = edges.filter((e) => e.id !== id);
    if (selected?.kind === "edge" && selected.id === id) setSelected(null);
    onChange(vertices, next, claims);
  };

  const autoMerge = () => {
    let nextV = [...vertices];
    let nextE = [...edges];
    mergeSuggestions.forEach(([keepId, dropId]) => {
      const keep = nextV.find((v) => v.id === keepId)!;
      const drop = nextV.find((v) => v.id === dropId);
      if (!drop) return;
      const merged: ExtractedVertex = {
        ...keep,
        origin: [...keep.origin, ...drop.origin],
        mergedFrom: [...(keep.mergedFrom ?? []), dropId],
      };
      nextV = nextV.filter((v) => v.id !== dropId).map((v) => v.id === keepId ? merged : v);
      nextE = nextE.map((e) => ({
        ...e,
        sourceVertexId: e.sourceVertexId === dropId ? keepId : e.sourceVertexId,
        targetVertexId: e.targetVertexId === dropId ? keepId : e.targetVertexId,
      }));
    });
    onChange(nextV, nextE, claims);
  };

  const updateVertexProp = (id: string, key: string, value: string) => {
    onChange(
      vertices.map((v) => v.id === id ? { ...v, properties: { ...v.properties, [key]: value } } : v),
      edges, claims,
    );
  };

  const editClaim = async (cid: string, patch: Partial<ExtractedClaim>) => {
    await mockClient.patch(`/api/knowledge-graph/ai-graph/extractions/${extraction.id}/claims/${cid}`, patch, { latencyMs: 60 });
    onChange(vertices, edges, claims.map(c => c.id === cid ? { ...c, ...patch } : c));
  };

  const selVertex = selected?.kind === "vertex" ? vertices.find((v) => v.id === selected.id) : null;
  const selEdge = selected?.kind === "edge" ? edges.find((e) => e.id === selected.id) : null;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "entities",    label: t("ai-graph.review.entities"),    count: vertices.length },
    { key: "relations",   label: t("ai-graph.review.relations"),   count: edges.length },
    { key: "claims",      label: t("ai-graph.review.claims"),      count: claims.length },
    { key: "communities", label: t("ai-graph.review.communities"), count: extraction.communities?.length ?? 0 },
    { key: "reports",     label: t("ai-graph.review.reports"),     count: extraction.reports?.length ?? 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: t("ai-graph.review.entities"), value: vertices.length },
          { label: t("ai-graph.review.relations"), value: edges.length },
          { label: "平均置信度", value: `${(stats.avgConfidence * 100).toFixed(0)}%` },
          { label: "Schema 覆盖率", value: `${(stats.schemaCoverage * 100).toFixed(0)}%` },
        ].map((s) => (
          <div key={s.label} className="rounded border border-border bg-card px-4 py-3 text-center">
            <div className="text-[18px] font-semibold text-primary">{s.value}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Banners */}
      {lowCount > 0 && (
        <div className="flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-4 py-2.5 text-[12px] text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {t("ai-graph.review.lowConfidenceHint", { count: lowCount })}
        </div>
      )}
      {mergeSuggestions.length > 0 && (tab === "entities" || tab === "relations") && (
        <div className="flex items-center justify-between rounded border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-[12px] text-primary">{t("ai-graph.review.suggestMerge", { count: mergeSuggestions.length })}</span>
          <button type="button" onClick={autoMerge}
            className="flex items-center gap-1.5 rounded border border-primary px-3 py-1 text-[12px] font-medium text-primary hover:bg-primary/10 transition-colors">
            <Merge className="h-3.5 w-3.5" />{t("ai-graph.review.doMerge")}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tb) => (
          <button key={tb.key} type="button" onClick={() => { setTab(tb.key); setSelected(null); }}
            className={cn("flex items-center gap-1.5 px-3 py-2 text-[12px] border-b-2 transition-colors -mb-px",
              tab === tb.key ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {tb.label}
            <span className="rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[9px]">{tb.count}</span>
          </button>
        ))}
      </div>

      {/* Tab contents */}
      {tab === "entities" && (
        <div className={cn("grid gap-4", selected ? "md:grid-cols-[1fr_320px]" : "")}>
          <EntityTable vertices={vertices}
            selectedId={selected?.kind === "vertex" ? selected.id : null}
            onSelect={(id) => setSelected({ kind: "vertex", id })}
            onDelete={deleteVertex} />
          {selected && selVertex && (
            <DetailPanel onClose={() => setSelected(null)} title={selVertex.name}>
              <div>
                <div className="eyebrow mb-2">{t("ai-graph.review.properties")}</div>
                <div className="space-y-2">
                  {Object.entries(selVertex.properties).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-20 shrink-0 truncate">{k}</span>
                      <input value={String(v ?? "")} onChange={(e) => updateVertexProp(selVertex.id, k, e.target.value)}
                        className="flex-1 h-7 rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-primary" />
                    </div>
                  ))}
                </div>
              </div>
              <ProvenanceSection refs={selVertex.origin} />
              {selVertex.mergedFrom && selVertex.mergedFrom.length > 0 && (
                <div className="text-[11px] text-muted-foreground">已合并 {selVertex.mergedFrom.length} 个重名实体</div>
              )}
            </DetailPanel>
          )}
        </div>
      )}

      {tab === "relations" && (
        <div className={cn("grid gap-4", selected ? "md:grid-cols-[1fr_320px]" : "")}>
          <EdgeTable edges={edges} vertices={vertices}
            selectedId={selected?.kind === "edge" ? selected.id : null}
            onSelect={(id) => setSelected({ kind: "edge", id })}
            onDelete={deleteEdge} />
          {selected && selEdge && (
            <DetailPanel onClose={() => setSelected(null)} title={selEdge.label}>
              <div>
                <div className="eyebrow mb-2">关系信息</div>
                <div className="space-y-1 text-[12px]">
                  <div className="flex gap-2"><span className="text-muted-foreground w-12">来源</span><span>{vertices.find((v) => v.id === selEdge.sourceVertexId)?.name ?? selEdge.sourceVertexId}</span></div>
                  <div className="flex gap-2"><span className="text-muted-foreground w-12">目标</span><span>{vertices.find((v) => v.id === selEdge.targetVertexId)?.name ?? selEdge.targetVertexId}</span></div>
                  <div className="flex gap-2"><span className="text-muted-foreground w-12">置信度</span><span className="font-mono">{(selEdge.confidence * 100).toFixed(0)}%</span></div>
                </div>
              </div>
              <ProvenanceSection refs={selEdge.origin} />
            </DetailPanel>
          )}
        </div>
      )}

      {tab === "claims" && (
        <ClaimsTable claims={claims} vertices={vertices} onEdit={editClaim} />
      )}

      {tab === "communities" && extraction.communities && (
        <div className="grid gap-4 md:grid-cols-[300px_1fr]">
          <div className="rounded border border-border bg-card p-3">
            <CommunityTree communities={extraction.communities} vertices={vertices}
              selectedId={selectedCommunity?.id ?? null}
              onSelect={setSelectedCommunity} />
          </div>
          <div className="rounded border border-border bg-card p-4">
            {selectedCommunity ? (
              <div className="space-y-3">
                <div>
                  <div className="text-[14px] font-medium">{selectedCommunity.title}</div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    L{selectedCommunity.level} · {selectedCommunity.memberVertexIds.length} 成员
                    {selectedCommunity.modularity != null && ` · Q=${selectedCommunity.modularity.toFixed(2)}`}
                  </div>
                </div>
                <div>
                  <div className="eyebrow mb-1.5">成员</div>
                  <div className="space-y-1">
                    {selectedCommunity.memberVertexIds.map(id => {
                      const v = vertices.find(x => x.id === id);
                      const isCentral = selectedCommunity.centralVertexIds.includes(id);
                      if (!v) return null;
                      return (
                        <div key={id} className="flex items-center gap-2 text-[12px]">
                          {isCentral && <span className="text-amber-500 text-[10px]">★</span>}
                          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{v.label}</span>
                          <span>{v.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : <p className="text-center py-8 text-[12px] text-muted-foreground">{t("ai-graph.community.selectHint")}</p>}
          </div>
        </div>
      )}

      {tab === "reports" && extraction.reports && (
        <div className="space-y-3">
          {onNavigateReports && (
            <div className="text-right">
              <button type="button" onClick={onNavigateReports}
                className="text-[11px] text-primary hover:underline">编辑报告 →</button>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {extraction.reports.map((r) => (
              <ReportCard key={r.id} report={r}
                community={extraction.communities?.find(c => c.id === r.communityId)}
                readOnly={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border bg-card p-4 self-start space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium">{title}</span>
        <button type="button" onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function EntityTable({ vertices, selectedId, onSelect, onDelete }: {
  vertices: ExtractedVertex[]; selectedId: string | null;
  onSelect: (id: string) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded border border-border overflow-hidden">
      <table className="w-full text-[13px]">
        <thead className="border-b border-border bg-card">
          <tr>
            {["Label", "名称", "置信度", "来源数", ""].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-[11px] uppercase text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vertices.map((v) => (
            <tr key={v.id} onClick={() => onSelect(v.id)}
              className={cn("border-b border-border/50 cursor-pointer transition-colors",
                v.confidence < 0.5 ? "bg-amber-50/60" : "",
                selectedId === v.id ? "bg-primary/5" : "hover:bg-accent/30")}>
              <td className="px-3 py-2.5">
                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{v.label}</span>
              </td>
              <td className="px-3 py-2.5 font-medium">{v.name}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-14 rounded-full bg-secondary overflow-hidden">
                    <div className={cn("h-full rounded-full", v.confidence < 0.5 ? "bg-amber-400" : "bg-primary")}
                      style={{ width: `${v.confidence * 100}%` }} />
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">{(v.confidence * 100).toFixed(0)}%</span>
                </div>
              </td>
              <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{v.origin.length}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1">
                  {selectedId === v.id ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(v.id); }}
                    className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EdgeTable({ edges, vertices, selectedId, onSelect, onDelete }: {
  edges: ExtractedEdge[]; vertices: ExtractedVertex[]; selectedId: string | null;
  onSelect: (id: string) => void; onDelete: (id: string) => void;
}) {
  const name = (id: string) => vertices.find((v) => v.id === id)?.name ?? id;
  return (
    <div className="rounded border border-border overflow-hidden">
      <table className="w-full text-[13px]">
        <thead className="border-b border-border bg-card">
          <tr>
            {["来源", "关系", "目标", "置信度", ""].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-[11px] uppercase text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {edges.map((e) => (
            <tr key={e.id} onClick={() => onSelect(e.id)}
              className={cn("border-b border-border/50 cursor-pointer transition-colors",
                e.confidence < 0.5 ? "bg-amber-50/60" : "",
                selectedId === e.id ? "bg-primary/5" : "hover:bg-accent/30")}>
              <td className="px-3 py-2.5 text-[12px]">{name(e.sourceVertexId)}</td>
              <td className="px-3 py-2.5"><span className="text-primary font-medium text-[12px]">{e.label}</span></td>
              <td className="px-3 py-2.5 text-[12px]">{name(e.targetVertexId)}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-14 rounded-full bg-secondary overflow-hidden">
                    <div className={cn("h-full rounded-full", e.confidence < 0.5 ? "bg-amber-400" : "bg-primary")}
                      style={{ width: `${e.confidence * 100}%` }} />
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">{(e.confidence * 100).toFixed(0)}%</span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <button type="button" onClick={(ex) => { ex.stopPropagation(); onDelete(e.id); }}
                  className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProvenanceSection({ refs }: { refs: Array<{ docId: string; sentenceText: string; charRange: [number, number] }> }) {
  const { t } = useTranslation("knowledge-graph");
  return (
    <div>
      <div className="eyebrow mb-2">{t("ai-graph.review.sources")}</div>
      <div className="space-y-2">
        {refs.map((ref, i) => (
          <div key={i} className="rounded border border-border bg-background p-2.5 text-[11px]">
            <div className="text-muted-foreground mb-1 font-mono text-[10px]">{ref.docId} · chars {ref.charRange[0]}–{ref.charRange[1]}</div>
            <p className="text-foreground leading-relaxed">&ldquo;{ref.sentenceText}&rdquo;</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function findMergeSuggestions(vertices: ExtractedVertex[]): Array<[string, string]> {
  const suggestions: Array<[string, string]> = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const a = vertices[i], b = vertices[j];
      if (a.label === b.label && nameSimilar(a.name, b.name)) suggestions.push([a.id, b.id]);
    }
  }
  return suggestions;
}
function nameSimilar(a: string, b: string): boolean {
  const shorter = a.length < b.length ? a : b;
  const longer  = a.length < b.length ? b : a;
  return longer.includes(shorter) || levenshtein(a, b) <= 2;
}
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}
