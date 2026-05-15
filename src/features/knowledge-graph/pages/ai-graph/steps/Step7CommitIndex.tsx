import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import type { AiGraphExtraction, ExtractedVertex, ExtractedEdge, ExtractedClaim } from "@/features/knowledge-graph/api/mock";
import { VersionDiff, type DiffPayload } from "../components/VersionDiff";
import { SearchPreview } from "../components/SearchPreview";

interface Props {
  extraction: AiGraphExtraction;
  reviewedVertices: ExtractedVertex[];
  reviewedEdges: ExtractedEdge[];
  reviewedClaims: ExtractedClaim[];
}

interface CommitScope {
  entities: boolean;
  claims: boolean;
  communities: boolean;
  metadata: boolean;
}
interface IndexOptions {
  bm25: boolean;
  embedding: boolean;
  community: boolean;
}

export function Step7CommitIndex({ extraction, reviewedVertices, reviewedEdges, reviewedClaims }: Props) {
  const { t } = useTranslation("knowledge-graph");
  const [scope, setScope] = useState<CommitScope>({ entities: true, claims: true, communities: true, metadata: false });
  const [index, setIndex] = useState<IndexOptions>({ bm25: true, embedding: true, community: true });
  const [diffMode, setDiffMode] = useState<"full" | "incremental">("incremental");
  const [diff, setDiff] = useState<DiffPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ taskId: string; importJobId: string } | null>(null);

  useEffect(() => {
    if (extraction.parentExtractionId) {
      void mockClient.get<DiffPayload>(`/api/knowledge-graph/ai-graph/extractions/${extraction.id}/diff?against=${extraction.parentExtractionId}`, { latencyMs: 80 })
        .then(setDiff);
    }
  }, [extraction.id, extraction.parentExtractionId]);

  const newLabels = extraction.stats.newLabels;
  const isFree = extraction.config.schemaMode === "free";

  const commit = async () => {
    setLoading(true);
    try {
      const r = await mockClient.post<{ taskId: string; importJobId: string }>(
        `/api/knowledge-graph/ai-graph/extractions/${extraction.id}/commit`,
        {
          vertices: reviewedVertices, edges: reviewedEdges, claims: scope.claims ? reviewedClaims : [],
          scope, index, diffMode,
        },
      );
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col items-center py-8 text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
          <h2 className="mt-4 text-[16px] font-semibold">{t("ai-graph.commit.success")}</h2>
          <p className="mt-1 text-[12px] text-muted-foreground font-mono">Task: {result.taskId}</p>
          <div className="mt-6 flex gap-3">
            <NavLink to="/knowledge-graph/async-tasks"
              className="flex h-8 items-center gap-1.5 rounded border border-primary bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:opacity-90 transition-opacity">
              <ArrowRight className="h-3.5 w-3.5" />{t("ai-graph.commit.toTasks")}
            </NavLink>
            <NavLink to="/knowledge-graph/import"
              className="flex h-8 items-center gap-1.5 rounded border border-border px-4 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              {t("ai-graph.commit.toImport")}
            </NavLink>
          </div>
        </div>
        <SearchPreview extractionId={extraction.id} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryCard label={t("ai-graph.commit.vertices")}    value={reviewedVertices.length} />
        <SummaryCard label={t("ai-graph.commit.edges")}       value={reviewedEdges.length} />
        <SummaryCard label={t("ai-graph.commit.claims")}      value={reviewedClaims.length} />
        <SummaryCard label={t("ai-graph.commit.communities")} value={extraction.communities?.length ?? 0} />
        <SummaryCard label={t("ai-graph.commit.reports")}     value={extraction.reports?.length ?? 0} />
      </div>

      {/* Schema impact */}
      <div className="rounded border border-border bg-card p-4">
        <div className="eyebrow mb-2">{t("ai-graph.commit.schemaImpact")}</div>
        {isFree && newLabels.length > 0 ? (
          <p className="text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            {t("ai-graph.commit.freeNote", { count: newLabels.length })}：{newLabels.join("、")}
          </p>
        ) : !isFree ? (
          <p className="text-[13px] text-muted-foreground">
            {t("ai-graph.commit.lockedDropped", { count: 0 })}
          </p>
        ) : (
          <p className="text-[13px] text-muted-foreground">无新增 schema</p>
        )}
      </div>

      {/* Scope */}
      <Section title={t("ai-graph.commit.scope")}>
        <Checkbox checked disabled label={t("ai-graph.commit.scope.entities")} />
        <Checkbox checked={scope.claims}      onChange={(v) => setScope(s => ({ ...s, claims: v }))}      label={t("ai-graph.commit.scope.claims")}      sub={`${reviewedClaims.length} claims`} />
        <Checkbox checked={scope.communities} onChange={(v) => setScope(s => ({ ...s, communities: v }))} label={t("ai-graph.commit.scope.communities")} sub={`${extraction.communities?.length ?? 0} communities, ${extraction.reports?.length ?? 0} reports`} />
        <Checkbox checked={scope.metadata}    onChange={(v) => setScope(s => ({ ...s, metadata: v }))}    label={t("ai-graph.commit.scope.metadata")}    sub={`${extraction.chunks?.length ?? 0} chunks`} />
      </Section>

      {/* Index options */}
      <Section title={t("ai-graph.commit.index")}>
        <Checkbox checked={index.bm25}      onChange={(v) => setIndex(s => ({ ...s, bm25: v }))}      label={t("ai-graph.commit.index.bm25")} />
        <Checkbox checked={index.embedding} onChange={(v) => setIndex(s => ({ ...s, embedding: v }))} label={t("ai-graph.commit.index.embedding")} sub={extraction.config.embeddingModel} />
        <Checkbox checked={index.community} onChange={(v) => setIndex(s => ({ ...s, community: v }))} label={t("ai-graph.commit.index.community")} />
      </Section>

      {/* Version diff */}
      {diff && (
        <Section title={t("ai-graph.commit.diff")}>
          <VersionDiff diff={diff} />
          <div className="flex rounded border border-border overflow-hidden w-fit">
            {(["full", "incremental"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setDiffMode(m)}
                className={cn("px-3 py-1 text-[11px] transition-colors",
                  diffMode === m ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
                {t(`ai-graph.commit.diff.${m}`)}
              </button>
            ))}
          </div>
        </Section>
      )}

      <div className="flex justify-center pt-2">
        <button type="button" onClick={() => void commit()} disabled={loading}
          className="flex h-9 items-center gap-2 rounded border border-primary bg-primary px-6 text-[13px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
          {loading ? "提交中…" : t("ai-graph.commit.confirm")}
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-border bg-card px-3 py-2.5">
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      <div className="text-[14px] font-semibold">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Checkbox({ checked, onChange, disabled, label, sub }: {
  checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label: string; sub?: string;
}) {
  return (
    <label className={cn("flex items-start gap-2 rounded border border-border bg-card px-3 py-2.5 cursor-pointer transition-colors",
      disabled ? "opacity-70 cursor-not-allowed" : "hover:border-primary/40")}>
      <input type="checkbox" checked={checked} disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-3.5 w-3.5 mt-0.5 accent-primary" />
      <div className="flex-1">
        <div className="text-[12px]">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{sub}</div>}
      </div>
    </label>
  );
}
