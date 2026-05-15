import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Loader2 } from "lucide-react";
import { mockClient } from "@/lib/mock-client";
import type { CommunityReport, Community } from "@/features/knowledge-graph/api/mock";
import { ReportCard } from "../components/ReportCard";

interface Props {
  extractionId: string;
  communities: Community[];
  initialReports: CommunityReport[];
  onChange: (reports: CommunityReport[]) => void;
}

export function Step5Reports({ extractionId, communities, initialReports, onChange }: Props) {
  const { t } = useTranslation("knowledge-graph");
  const [reports, setReports] = useState<CommunityReport[]>(initialReports);
  const [generating, setGenerating] = useState(false);

  const generateAll = async () => {
    setGenerating(true);
    try {
      const r = await mockClient.post<CommunityReport[]>(
        `/api/knowledge-graph/ai-graph/extractions/${extractionId}/reports/generate`,
        {}, { latencyMs: 1500 },
      );
      setReports(r);
      onChange(r);
    } finally {
      setGenerating(false);
    }
  };

  const saveReport = async (rid: string, patch: Partial<CommunityReport>) => {
    const updated = await mockClient.patch<CommunityReport>(
      `/api/knowledge-graph/ai-graph/extractions/${extractionId}/reports/${rid}`,
      patch, { latencyMs: 80 },
    );
    if (updated) {
      const next = reports.map(r => r.id === rid ? updated : r);
      setReports(next);
      onChange(next);
    }
  };

  const regenerate = async (rid: string) => {
    // mock: re-touch generatedAt
    const target = reports.find(r => r.id === rid);
    if (!target) return;
    const updated = await mockClient.patch<CommunityReport>(
      `/api/knowledge-graph/ai-graph/extractions/${extractionId}/reports/${rid}`,
      { ...target }, { latencyMs: 1000 },
    );
    if (updated) {
      const next = reports.map(r => r.id === rid ? updated : r);
      setReports(next);
      onChange(next);
    }
  };

  const deleteReport = (rid: string) => {
    const next = reports.filter(r => r.id !== rid);
    setReports(next);
    onChange(next);
  };

  const sorted = [...reports].sort((a, b) => b.rating - a.rating);
  const empty = reports.length === 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-medium">{t("ai-graph.report.title")}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            共 {reports.length} 份报告 · {communities.length} 个社区
          </p>
        </div>
        {empty ? (
          <button type="button" onClick={() => void generateAll()} disabled={generating}
            className="flex h-8 items-center gap-1.5 rounded border border-primary bg-primary px-4 text-[12px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {t("ai-graph.report.generateAll")}
          </button>
        ) : (
          <button type="button" onClick={() => void generateAll()} disabled={generating}
            className="flex h-7 items-center gap-1.5 rounded border border-border px-3 text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 disabled:opacity-50 transition-colors">
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {t("ai-graph.report.regenerate")} (全部)
          </button>
        )}
      </div>

      {/* Cards grid */}
      {empty ? (
        <div className="rounded border border-dashed border-border bg-card py-16 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-[12px] text-muted-foreground">点击「{t("ai-graph.report.generateAll")}」生成社区报告</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((r) => (
            <ReportCard key={r.id} report={r}
              community={communities.find(c => c.id === r.communityId)}
              onSave={(patch) => void saveReport(r.id, patch)}
              onRegenerate={() => void regenerate(r.id)}
              onDelete={() => deleteReport(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
