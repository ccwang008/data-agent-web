import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { mockClient } from "@/lib/mock-client";
import type { AiGraphExtraction, AiGraphDocument, ExtractionConfig } from "@/features/knowledge-graph/api/mock";
import { GleaningProgress } from "../components/GleaningProgress";
import { computePhaseSpecs } from "../utils/extractionPhases";

interface Props {
  graphId: string;
  docs: AiGraphDocument[];
  config: ExtractionConfig;
  onDone: (extraction: AiGraphExtraction) => void;
}

export function Step3Extraction({ graphId, docs, config, onDone }: Props) {
  const { t } = useTranslation("knowledge-graph");
  const [extraction, setExtraction] = useState<AiGraphExtraction | null>(null);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    void start();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    try {
      const ext = await mockClient.post<AiGraphExtraction>(
        "/api/knowledge-graph/ai-graph/extractions",
        { graphId, docIds: docs.map((d) => d.id), config },
        { latencyMs: 80 },
      );
      setExtraction(ext);
      poll(ext.id);
    } catch (e) {
      setError(String(e));
    }
  }

  function poll(id: string) {
    intervalRef.current = setInterval(async () => {
      if (doneRef.current) return;
      try {
        const ext = await mockClient.get<AiGraphExtraction>(
          `/api/knowledge-graph/ai-graph/extractions/${id}`,
          { latencyMs: 50 },
        );
        setExtraction(ext);
        if (ext.status === "reviewing" || ext.status === "failed") {
          doneRef.current = true;
          clearInterval(intervalRef.current!);
          if (ext.status === "reviewing") onDone(ext);
          else setError("抽取失败，请重试");
        }
      } catch {
        // transient polling error
      }
    }, 400);
  }

  const labels = {
    chunking:      t("ai-graph.extraction.phase.chunking"),
    extraction:    t("ai-graph.extraction.phase.extraction"),
    summarization: t("ai-graph.extraction.phase.summarization"),
    embedding:     t("ai-graph.extraction.phase.embedding"),
    clustering:    t("ai-graph.extraction.phase.clustering"),
    reporting:     t("ai-graph.extraction.phase.reporting"),
    claims:        t("ai-graph.extraction.phase.claims"),
  };

  const phases = computePhaseSpecs(
    extraction?.status ?? "running",
    config.gleaningRounds ?? 1,
    config.extractClaims ?? false,
    labels,
    extraction ? { vertexCount: extraction.vertices.length, edgeCount: extraction.edges.length } : undefined,
  );

  return (
    <div className="space-y-5">
      <GleaningProgress phases={phases} overallProgress={extraction?.progress ?? 0} failed={!!error} />

      {/* Token usage */}
      {extraction?.tokenUsage && (
        <div className="grid grid-cols-3 gap-3">
          <UsageCard label={t("ai-graph.extraction.promptTokens")}     value={extraction.tokenUsage.prompt.toLocaleString()} />
          <UsageCard label={t("ai-graph.extraction.completionTokens")} value={extraction.tokenUsage.completion.toLocaleString()} />
          <UsageCard label={t("ai-graph.extraction.estimatedCost")}    value={`$${extraction.tokenUsage.estimatedUsd.toFixed(3)}`} />
        </div>
      )}

      {/* Per-document brief */}
      <div className="space-y-1.5">
        <div className="eyebrow">处理文档</div>
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 rounded border border-border bg-card px-4 py-2">
            <span className="flex-1 truncate text-[12px]">{doc.filename}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {doc.chunkCount ?? "—"} chunks · {doc.charCount?.toLocaleString() ?? "—"} chars
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

function UsageCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-card px-3 py-2.5">
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      <div className="font-mono text-[13px]">{value}</div>
    </div>
  );
}
