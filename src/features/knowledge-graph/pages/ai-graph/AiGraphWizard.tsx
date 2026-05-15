import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiGraphDocument, AiGraphExtraction, ExtractedVertex, ExtractedEdge, ExtractedClaim, Community, CommunityReport } from "@/features/knowledge-graph/api/mock";
import { Step1DocumentsChunking, type ChunkingConfig } from "./steps/Step1DocumentsChunking";
import { Step2ExtractionConfig } from "./steps/Step2ExtractionConfig";
import type { ExtractionConfig } from "./steps/Step2ExtractionConfig";
import { Step3Extraction } from "./steps/Step3Extraction";
import { Step4Communities } from "./steps/Step4Communities";
import { Step5Reports } from "./steps/Step5Reports";
import { Step6Review } from "./steps/Step6Review";
import { Step7CommitIndex } from "./steps/Step7CommitIndex";
import { DEFAULT_CONFIG } from "./utils/defaultConfig";

type StepKey = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const STEPS: StepKey[] = [1, 2, 3, 4, 5, 6, 7];

interface Props {
  graphId: string;
  onClose: () => void;
}

export function AiGraphWizard({ graphId, onClose }: Props) {
  const { t } = useTranslation("knowledge-graph");
  const [step, setStep] = useState<StepKey>(1);
  const [readyDocs, setReadyDocs] = useState<AiGraphDocument[]>([]);
  const [chunking, setChunking] = useState<ChunkingConfig>({ strategy: "token", chunkSize: 1024, overlap: 10 });
  const [config, setConfig] = useState<ExtractionConfig>({ ...DEFAULT_CONFIG, chunking: { strategy: "token", chunkSize: 1024, overlap: 10 } });
  const [extraction, setExtraction] = useState<AiGraphExtraction | null>(null);
  const [vertices, setVertices] = useState<ExtractedVertex[]>([]);
  const [edges, setEdges] = useState<ExtractedEdge[]>([]);
  const [claims, setClaims] = useState<ExtractedClaim[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);

  const stepLabels: Record<StepKey, string> = {
    1: t("ai-graph.step1"), 2: t("ai-graph.step2"), 3: t("ai-graph.step3"),
    4: t("ai-graph.step4"), 5: t("ai-graph.step5"), 6: t("ai-graph.step6"), 7: t("ai-graph.step7"),
  };

  const canNext = (): boolean => {
    if (step === 1) return readyDocs.length > 0;
    if (step === 3) return false; // auto-advance via onDone
    return true;
  };

  const next = () => { if (step < 7) setStep((s) => (s + 1) as StepKey); };
  const prev = () => { if (step > 1) setStep((s) => (s - 1) as StepKey); else onClose(); };

  const onExtractionDone = (ext: AiGraphExtraction) => {
    setExtraction(ext);
    setVertices(ext.vertices);
    setEdges(ext.edges);
    setClaims(ext.claims ?? []);
    setCommunities(ext.communities ?? []);
    setReports(ext.reports ?? []);
    setStep(4);
  };

  return (
    <div className="page-shell animate-fade-in">
      {/* Stepper */}
      <div className="mb-8 flex items-center gap-0 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center shrink-0">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded border font-mono text-[12px] font-medium shrink-0",
              step === s
                ? "border-primary bg-primary text-primary-foreground"
                : s < step
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-border text-muted-foreground",
            )}>
              {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            <span className={cn("ml-2 text-[12px] whitespace-nowrap", step === s ? "font-medium text-foreground" : "text-muted-foreground")}>
              {stepLabels[s]}
            </span>
            {i < STEPS.length - 1 && <div className="mx-3 h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded border border-border bg-card p-6 min-h-[300px]">
        {step === 1 && (
          <Step1DocumentsChunking
            graphId={graphId}
            chunking={chunking}
            onChunkingChange={(c) => { setChunking(c); setConfig((cfg) => ({ ...cfg, chunking: c, chunkSize: c.chunkSize })); }}
            onReady={setReadyDocs}
          />
        )}
        {step === 2 && (
          <Step2ExtractionConfig config={config} onChange={setConfig} />
        )}
        {step === 3 && (
          <Step3Extraction graphId={graphId} docs={readyDocs} config={config} onDone={onExtractionDone} />
        )}
        {step === 4 && extraction && (
          <Step4Communities
            extractionId={extraction.id}
            vertices={vertices} edges={edges}
            initialCommunities={communities}
            onChange={setCommunities} />
        )}
        {step === 5 && extraction && (
          <Step5Reports
            extractionId={extraction.id}
            communities={communities}
            initialReports={reports}
            onChange={setReports} />
        )}
        {step === 6 && extraction && (
          <Step6Review
            extraction={{ ...extraction, communities, reports }}
            vertices={vertices} edges={edges} claims={claims}
            onChange={(v, e, c) => { setVertices(v); setEdges(e); setClaims(c); }}
            onNavigateReports={() => setStep(5)} />
        )}
        {step === 7 && extraction && (
          <Step7CommitIndex
            extraction={{ ...extraction, communities, reports }}
            reviewedVertices={vertices}
            reviewedEdges={edges}
            reviewedClaims={claims} />
        )}
      </div>

      {/* Navigation */}
      {step !== 3 && step !== 7 && (
        <div className="mt-5 flex justify-between">
          <button type="button" onClick={prev}
            className="h-8 rounded border border-border px-4 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            {step === 1 ? "取消" : `← ${stepLabels[(step - 1) as StepKey]}`}
          </button>
          {step < 6 && (
            <button type="button" onClick={next} disabled={!canNext()}
              className="h-8 rounded border border-primary bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
              下一步 →
            </button>
          )}
          {step === 6 && (
            <button type="button" onClick={next}
              className="h-8 rounded border border-primary bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:opacity-90 transition-opacity">
              确认审阅，前往入图 →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
