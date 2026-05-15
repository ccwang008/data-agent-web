import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import { isLocalResult, type SearchResult } from "../utils/mockSearch";

interface Props {
  extractionId: string;
  defaultQuery?: string;
}

export function SearchPreview({ extractionId, defaultQuery }: Props) {
  const { t } = useTranslation("knowledge-graph");
  const [query, setQuery] = useState(defaultQuery ?? "");
  const [mode, setMode] = useState<"local" | "global">("local");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const r = await mockClient.post<SearchResult>(
        `/api/knowledge-graph/ai-graph/extractions/${extractionId}/search`,
        { query, mode },
        { latencyMs: 220 },
      );
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-[13px] font-medium">{t("ai-graph.commit.searchPreview")}</h3>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded border border-border overflow-hidden w-fit">
        {(["local", "global"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={cn("px-3 py-1 text-[11px] transition-colors",
              mode === m ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
            {t(`ai-graph.commit.${m}Search`)}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">{t(`ai-graph.commit.${mode}Hint`)}</p>

      {/* Query input */}
      <div className="flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void run(); }}
          placeholder={t("ai-graph.commit.searchPlaceholder")}
          className="flex-1 h-8 rounded border border-border bg-background px-3 text-[12px] outline-none focus:border-primary" />
        <button type="button" onClick={() => void run()} disabled={loading || !query.trim()}
          className="flex h-8 items-center gap-1.5 rounded border border-primary bg-primary px-3 text-[12px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
          {t("ai-graph.commit.searchRun")}
        </button>
      </div>

      {/* Results */}
      {!result ? (
        <p className="text-center py-6 text-[11px] text-muted-foreground">{t("ai-graph.commit.searchEmpty")}</p>
      ) : isLocalResult(result) ? (
        <div className="space-y-3">
          <div>
            <div className="eyebrow mb-1.5">相关实体 ({result.entities.length})</div>
            <div className="space-y-1">
              {result.entities.map((v) => (
                <div key={v.id} className="flex items-center gap-2 text-[12px]">
                  <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{v.label}</span>
                  <span>{v.name}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{(v.confidence * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="eyebrow mb-1.5">相关切片 ({result.chunks.length})</div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
              {result.chunks.map((c) => (
                <div key={c.id} className="rounded border border-border/50 bg-background p-2 text-[11px]">
                  <div className="text-[9px] text-muted-foreground font-mono mb-0.5">#{c.index} · chars {c.charRange[0]}–{c.charRange[1]}</div>
                  <p className="line-clamp-2">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {result.reports.map((r) => (
            <div key={r.reportId} className="rounded border border-border/50 bg-background p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-medium">{r.communityTitle}</span>
                <span className="font-mono text-[10px] text-amber-600">{r.rating.toFixed(1)} / 10</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-1.5">{r.snippet}</p>
              <div className="space-y-0.5">
                {r.findings.map((f, i) => (
                  <div key={i} className="text-[10px]">
                    <span className="font-medium">· {f.headline}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
