import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { DocumentChunk } from "@/features/knowledge-graph/api/mock";

interface Props {
  chunks: DocumentChunk[];
  charCount?: number;
}

export function ChunkPreview({ chunks, charCount }: Props) {
  const { t } = useTranslation("knowledge-graph");
  if (chunks.length === 0) {
    return (
      <div className="rounded border border-dashed border-border bg-card py-6 text-center text-[11px] text-muted-foreground">
        {t("ai-graph.chunking.preview")} —
      </div>
    );
  }
  const total = charCount ?? Math.max(...chunks.map(c => c.charRange[1]));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{t("ai-graph.chunking.totalChunks", { count: chunks.length })}</span>
        <span className="text-muted-foreground font-mono">{total.toLocaleString()} chars · {chunks.reduce((s, c) => s + c.tokenCount, 0).toLocaleString()} tokens</span>
      </div>

      {/* Overlap timeline visualization */}
      <div className="relative h-7 rounded border border-border bg-card overflow-hidden">
        {chunks.map((c, i) => {
          const leftPct = (c.charRange[0] / total) * 100;
          const widthPct = ((c.charRange[1] - c.charRange[0]) / total) * 100;
          return (
            <div
              key={c.id}
              className={cn(
                "absolute top-0 bottom-0 border-r border-background/40 transition-opacity hover:opacity-80",
                i % 2 === 0 ? "bg-primary/20" : "bg-primary/35",
              )}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              title={`#${c.index} · ${c.charRange[0]}–${c.charRange[1]} · ${c.tokenCount} tokens`}
            />
          );
        })}
      </div>

      {/* Chunk cards grid */}
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-72 overflow-y-auto scrollbar-thin pr-1">
        {chunks.map((c) => (
          <div key={c.id} className="rounded border border-border bg-card p-3 text-[12px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">#{c.index}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{c.tokenCount} tok</span>
            </div>
            <div className="text-[10px] text-muted-foreground mb-1 font-mono">
              {t("ai-graph.chunking.chunkRange", { from: c.charRange[0], to: c.charRange[1] })}
              {c.pageNumber ? ` · p${c.pageNumber}` : ""}
            </div>
            <p className="text-foreground leading-relaxed line-clamp-2">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
