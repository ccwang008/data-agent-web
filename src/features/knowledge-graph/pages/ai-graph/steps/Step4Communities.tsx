import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import type { Community, ExtractedVertex, ExtractedEdge } from "@/features/knowledge-graph/api/mock";
import { CommunityTree } from "../components/CommunityTree";
import { CommunityMiniGraph } from "../components/CommunityMiniGraph";

interface Props {
  extractionId: string;
  vertices: ExtractedVertex[];
  edges: ExtractedEdge[];
  initialCommunities: Community[];
  onChange: (communities: Community[]) => void;
}

export function Step4Communities({ extractionId, vertices, edges, initialCommunities, onChange }: Props) {
  const { t } = useTranslation("knowledge-graph");
  const [communities, setCommunities] = useState<Community[]>(initialCommunities);
  const [selected, setSelected] = useState<Community | null>(initialCommunities[0] ?? null);
  const [resolution, setResolution] = useState(1.0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCommunities(initialCommunities);
    if (!selected || !initialCommunities.find(c => c.id === selected.id)) {
      setSelected(initialCommunities[0] ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCommunities]);

  const rerun = async () => {
    setLoading(true);
    try {
      const next = await mockClient.post<Community[]>(
        `/api/knowledge-graph/ai-graph/extractions/${extractionId}/recluster`,
        { resolution }, { latencyMs: 350 },
      );
      setCommunities(next);
      setSelected(next[0] ?? null);
      onChange(next);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: communities.length,
    levels: new Set(communities.map(c => c.level)).size,
    maxSize: communities.reduce((m, c) => Math.max(m, c.memberVertexIds.length), 0),
    modularity: communities[0]?.modularity ?? 0,
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("ai-graph.community.total")}      value={stats.total} />
        <Stat label={t("ai-graph.community.levels")}     value={stats.levels} />
        <Stat label={t("ai-graph.community.maxSize")}    value={stats.maxSize} />
        <Stat label={t("ai-graph.community.modularity")} value={stats.modularity.toFixed(2)} />
      </div>

      {/* Re-cluster bar */}
      <div className="flex items-center justify-between gap-3 rounded border border-border bg-card p-3">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-[12px] text-muted-foreground shrink-0">{t("ai-graph.community.resolution")}</span>
          <input type="range" min={0.5} max={2.0} step={0.1}
            value={resolution}
            onChange={(e) => setResolution(parseFloat(e.target.value))}
            className="flex-1 max-w-xs accent-primary" />
          <span className="font-mono text-[12px] w-10">{resolution.toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground hidden md:inline">{t("ai-graph.community.resolutionHint")}</span>
        </div>
        <button type="button" onClick={() => void rerun()} disabled={loading}
          className="flex h-7 items-center gap-1 rounded border border-primary px-3 text-[11px] font-medium text-primary hover:bg-primary/5 disabled:opacity-50 transition-colors">
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          {t("ai-graph.community.rerun")}
        </button>
      </div>

      {/* Main: tree + detail */}
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <div className="rounded border border-border bg-card p-3 self-start">
          <div className="eyebrow mb-2">{t("ai-graph.community.title")}</div>
          <CommunityTree communities={communities} vertices={vertices}
            selectedId={selected?.id ?? null}
            onSelect={setSelected} />
        </div>

        <div className="rounded border border-border bg-card p-4">
          {selected ? (
            <CommunityDetail community={selected} vertices={vertices} edges={edges} />
          ) : (
            <p className="text-center py-12 text-[12px] text-muted-foreground">{t("ai-graph.community.selectHint")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CommunityDetail({ community, vertices, edges }: {
  community: Community; vertices: ExtractedVertex[]; edges: ExtractedEdge[];
}) {
  const { t } = useTranslation("knowledge-graph");
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            L{community.level}
          </span>
          <h3 className="text-[15px] font-medium">{community.title}</h3>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground font-mono">
          {community.memberVertexIds.length} {t("ai-graph.community.members")}
          {community.modularity != null && ` · Q=${community.modularity.toFixed(2)}`}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        {/* Members list */}
        <div>
          <div className="eyebrow mb-2">{t("ai-graph.community.members")}</div>
          <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin pr-1">
            {community.memberVertexIds.map((id) => {
              const v = vertices.find((x) => x.id === id);
              if (!v) return null;
              const isCentral = community.centralVertexIds.includes(id);
              return (
                <div key={id} className="flex items-center gap-2 rounded px-2 py-1 text-[12px] hover:bg-accent/30">
                  {isCentral && <Star className="h-3 w-3 text-amber-500" fill="currentColor" />}
                  <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{v.label}</span>
                  <span>{v.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mini graph */}
        <div>
          <div className="eyebrow mb-2">{t("ai-graph.community.miniGraphTitle")}</div>
          <CommunityMiniGraph community={community} vertices={vertices} edges={edges} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-border bg-card px-4 py-3 text-center">
      <div className="text-[18px] font-semibold text-primary">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
