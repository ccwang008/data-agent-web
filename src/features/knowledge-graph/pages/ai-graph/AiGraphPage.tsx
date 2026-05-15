import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BrainCog, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import { useKnowledgeGraphStore } from "@/features/knowledge-graph/store";
import type { AiGraphDocument, AiGraphExtraction } from "@/features/knowledge-graph/api/mock";
import { formatBytes } from "./parsers";
import { AiGraphWizard } from "./AiGraphWizard";

export function AiGraphPage() {
  const { t } = useTranslation("knowledge-graph");
  const currentGraphId = useKnowledgeGraphStore((s) => s.currentGraphId);
  const [showWizard, setShowWizard] = useState(false);
  const [docs, setDocs] = useState<AiGraphDocument[]>([]);
  const [extractions, setExtractions] = useState<AiGraphExtraction[]>([]);

  const reload = () => {
    if (!currentGraphId) return;
    void mockClient.get<AiGraphDocument[]>("/api/knowledge-graph/ai-graph/documents", { latencyMs: 100 })
      .then(setDocs);
    void mockClient.get<AiGraphExtraction[]>("/api/knowledge-graph/ai-graph/extractions", { latencyMs: 100 })
      .then(setExtractions);
  };

  useEffect(() => { reload(); }, [currentGraphId]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteDoc = async (id: string) => {
    await mockClient.delete(`/api/knowledge-graph/ai-graph/documents/${id}`, { latencyMs: 80 });
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  if (showWizard && currentGraphId) {
    return <AiGraphWizard graphId={currentGraphId} onClose={() => { setShowWizard(false); reload(); }} />;
  }

  // No graph selected
  if (!currentGraphId) {
    return (
      <div className="page-shell animate-fade-in">
        <div className="mb-6">
          <h1 className="text-[20px] font-semibold">{t("ai-graph.title")}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{t("ai-graph.subtitle")}</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded border border-dashed border-border bg-card py-20 text-center">
          <BrainCog className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-[13px] font-medium text-muted-foreground">请先在「图实例」中选择一个图</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold">{t("ai-graph.title")}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{t("ai-graph.subtitle")}</p>
        </div>
        <button type="button" onClick={() => setShowWizard(true)}
          className="flex h-8 items-center gap-2 rounded border border-primary bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:opacity-90 transition-opacity shrink-0">
          + {t("ai-graph.newExtraction")}
        </button>
      </div>

      {/* Document library */}
      <section>
        <h2 className="mb-3 text-[13px] font-medium">{t("ai-graph.docs.title")}</h2>
        {docs.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-card py-10 text-center text-[13px] text-muted-foreground">
            {t("ai-graph.docs.empty")}
          </div>
        ) : (
          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border bg-card">
                <tr>
                  {[t("ai-graph.docs.filename"), t("ai-graph.docs.size"), t("ai-graph.docs.chars"), t("ai-graph.docs.status"), t("ai-graph.docs.extractions"), t("ai-graph.docs.uploadedAt"), ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
                          {doc.filename.split(".").pop()}
                        </span>
                        <span className="truncate max-w-[180px]">{doc.filename}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{formatBytes(doc.sizeBytes)}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">
                      {doc.charCount != null ? doc.charCount.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3"><DocStatusBadge status={doc.status} t={t} /></td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground text-center">{doc.extractionCount}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{doc.uploadedAt}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => void deleteDoc(doc.id)}
                        className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Extraction history */}
      <section>
        <h2 className="mb-3 text-[13px] font-medium">{t("ai-graph.history.title")}</h2>
        {extractions.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-card py-10 text-center text-[13px] text-muted-foreground">
            {t("ai-graph.history.empty")}
          </div>
        ) : (
          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border bg-card">
                <tr>
                  {["任务 ID", "文档数", t("ai-graph.history.config"), t("ai-graph.review.entities"), t("ai-graph.review.relations"), t("ai-graph.history.communities"), t("ai-graph.history.reports"), "状态", "进度", t("ai-graph.history.createdAt")].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {extractions.map((ext) => (
                  <tr key={ext.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{ext.id}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{ext.docIds.length}</td>
                    <td className="px-4 py-3 text-[12px]">
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground mr-1">{ext.config.schemaMode}</span>
                      <span className="text-muted-foreground">{ext.config.domain} · {ext.config.llmModel}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px]">{ext.stats.vertexCount || "—"}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{ext.stats.edgeCount || "—"}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{ext.communities?.length || "—"}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{ext.reports?.length || "—"}</td>
                    <td className="px-4 py-3"><ExtractionStatusBadge status={ext.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${ext.progress}%` }} />
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground">{ext.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{ext.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function DocStatusBadge({ status, t }: { status: AiGraphDocument["status"]; t: (k: string) => string }) {
  const cfg: Record<string, string> = {
    pending:    "badge-pending",
    parsing:    "badge-running",
    parsed:     "bg-sky-50 text-sky-700 border-sky-200",
    chunking:   "badge-running",
    chunked:    "bg-sky-50 text-sky-700 border-sky-200",
    extracting: "badge-running",
    extracted:  "bg-violet-50 text-violet-700 border-violet-200",
    committed:  "badge-success",
    failed:     "badge-offline",
  };
  return (
    <span className={cn("rounded border px-2 py-0.5 font-mono text-[10px] uppercase", cfg[status] ?? "badge-pending")}>
      {t(`ai-graph.docs.${status}`)}
    </span>
  );
}

function ExtractionStatusBadge({ status }: { status: AiGraphExtraction["status"] }) {
  const cfg: Record<string, string> = {
    pending:      "badge-pending",
    running:      "badge-running",
    summarizing:  "badge-running",
    embedding:    "badge-running",
    clustering:   "badge-running",
    reporting:    "badge-running",
    reviewing:    "bg-violet-50 text-violet-700 border-violet-200",
    committed:    "badge-success",
    failed:       "badge-offline",
  };
  const labels: Record<string, string> = {
    pending: "待抽取", running: "抽取中", summarizing: "合并中", embedding: "向量化",
    clustering: "聚类中", reporting: "生成报告", reviewing: "待审阅", committed: "已入图", failed: "失败",
  };
  return (
    <span className={cn("rounded border px-2 py-0.5 font-mono text-[10px] uppercase", cfg[status] ?? "badge-pending")}>
      {labels[status] ?? status}
    </span>
  );
}
