import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Minus, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractedVertex, ExtractedEdge } from "@/features/knowledge-graph/api/mock";

export interface DiffPayload {
  added: { vertices: ExtractedVertex[]; edges: ExtractedEdge[] };
  removed: { vertices: ExtractedVertex[]; edges: ExtractedEdge[] };
  modified: { vertices: ExtractedVertex[]; edges: ExtractedEdge[] };
  prevExtractionId?: string;
  prevFinishedAt?: string;
}

interface Props {
  diff: DiffPayload;
}

export function VersionDiff({ diff }: Props) {
  const { t } = useTranslation("knowledge-graph");
  const [openAdded, setOpenAdded] = useState(true);
  const [openRemoved, setOpenRemoved] = useState(true);

  const totals = {
    added: diff.added.vertices.length + diff.added.edges.length,
    removed: diff.removed.vertices.length + diff.removed.edges.length,
    modified: diff.modified.vertices.length + diff.modified.edges.length,
  };

  return (
    <div className="rounded border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="text-[12px]">
          <span className="text-muted-foreground">{t("ai-graph.commit.diff.against")}</span>
          <span className="ml-2 font-mono text-foreground">{diff.prevExtractionId ?? "—"}</span>
          {diff.prevFinishedAt && <span className="ml-2 font-mono text-[10px] text-muted-foreground">{diff.prevFinishedAt}</span>}
        </div>
        <div className="flex items-center gap-3 text-[12px]">
          <span className="flex items-center gap-1 text-emerald-600 font-mono">+{totals.added}</span>
          <span className="flex items-center gap-1 text-destructive font-mono">-{totals.removed}</span>
          {totals.modified > 0 && <span className="text-amber-600 font-mono">~{totals.modified}</span>}
        </div>
      </div>

      {/* Added */}
      <div className="border-b border-border/50">
        <button type="button" onClick={() => setOpenAdded(o => !o)}
          className="flex w-full items-center justify-between px-4 py-2 hover:bg-accent/20 transition-colors">
          <span className="flex items-center gap-2 text-[12px]">
            {openAdded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <Plus className="h-3 w-3 text-emerald-600" />
            <span className="text-emerald-700">{t("ai-graph.commit.diff.added")}</span>
            <span className="text-muted-foreground font-mono">({totals.added})</span>
          </span>
        </button>
        {openAdded && totals.added > 0 && (
          <div className="px-4 pb-3 space-y-1">
            {diff.added.vertices.map((v) => (
              <div key={v.id} className="flex items-center gap-2 text-[12px]">
                <Plus className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{v.label}</span>
                <span>{v.name}</span>
              </div>
            ))}
            {diff.added.edges.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Plus className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="font-mono text-[10px]">{e.label}</span>
                <span className="font-mono text-[10px]">{e.sourceVertexId} → {e.targetVertexId}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Removed */}
      <div>
        <button type="button" onClick={() => setOpenRemoved(o => !o)}
          className="flex w-full items-center justify-between px-4 py-2 hover:bg-accent/20 transition-colors">
          <span className="flex items-center gap-2 text-[12px]">
            {openRemoved ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <Minus className="h-3 w-3 text-destructive" />
            <span className="text-destructive">{t("ai-graph.commit.diff.removed")}</span>
            <span className="text-muted-foreground font-mono">({totals.removed})</span>
          </span>
        </button>
        {openRemoved && totals.removed > 0 && (
          <div className="px-4 pb-3 space-y-1">
            {diff.removed.vertices.map((v) => (
              <div key={v.id} className={cn("flex items-center gap-2 text-[12px] line-through text-muted-foreground")}>
                <Minus className="h-3 w-3 text-destructive shrink-0" />
                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px]">{v.label}</span>
                <span>{v.name}</span>
              </div>
            ))}
            {diff.removed.edges.map((e) => (
              <div key={e.id} className={cn("flex items-center gap-2 text-[12px] line-through text-muted-foreground")}>
                <Minus className="h-3 w-3 text-destructive shrink-0" />
                <span className="font-mono text-[10px]">{e.label}</span>
                <span className="font-mono text-[10px]">{e.sourceVertexId} → {e.targetVertexId}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
