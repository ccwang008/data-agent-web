import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Pencil, Save, X as XIcon, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommunityReport, Community } from "@/features/knowledge-graph/api/mock";

interface Props {
  report: CommunityReport;
  community?: Community;
  readOnly?: boolean;
  onSave?: (patch: Partial<CommunityReport>) => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
}

export function ReportCard({ report, community, readOnly, onSave, onRegenerate, onDelete }: Props) {
  const { t } = useTranslation("knowledge-graph");
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CommunityReport>(report);

  const startEdit = () => { setDraft(report); setEditing(true); setOpen(true); };
  const saveEdit = () => { onSave?.(draft); setEditing(false); };
  const cancelEdit = () => { setDraft(report); setEditing(false); };

  const stars = Math.round(report.rating);

  return (
    <div className="rounded border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-border/50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {community && (
              <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
                {t("ai-graph.community.level")} {community.level}
              </span>
            )}
            {editing ? (
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="flex-1 h-7 rounded border border-border bg-background px-2 text-[13px] font-medium outline-none focus:border-primary" />
            ) : (
              <h3 className="text-[14px] font-medium truncate">{report.title}</h3>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className={cn("inline-block h-1 w-1.5 rounded-sm", i < stars ? "bg-amber-400" : "bg-secondary")} />
              ))}
              <span className="ml-1.5 font-mono">{report.rating.toFixed(1)} / 10</span>
            </div>
            <span className="font-mono text-[10px]">{t("ai-graph.report.generated")} {report.generatedAt}</span>
          </div>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1 shrink-0">
            {editing ? (
              <>
                <button type="button" onClick={saveEdit}
                  className="flex h-7 items-center gap-1 rounded border border-primary bg-primary px-2.5 text-[11px] font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                  <Save className="h-3 w-3" />{t("ai-graph.report.saveReport")}
                </button>
                <button type="button" onClick={cancelEdit}
                  className="flex h-7 items-center gap-1 rounded border border-border px-2.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  <XIcon className="h-3 w-3" />{t("ai-graph.report.cancelEdit")}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={startEdit}
                  className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors" title={t("ai-graph.report.edit")}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {onRegenerate && (
                  <button type="button" onClick={onRegenerate}
                    className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors" title={t("ai-graph.report.regenerate")}>
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button type="button" onClick={onDelete}
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Summary (always visible, click to expand) */}
      <div className="p-4 space-y-3">
        <div>
          <button type="button" onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground hover:text-primary transition-colors mb-1.5">
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {t("ai-graph.report.summary")}
          </button>
          {editing ? (
            <textarea value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} rows={4}
              className="w-full rounded border border-border bg-background p-2 text-[12px] outline-none focus:border-primary leading-relaxed" />
          ) : (
            <p className={cn("text-[12px] text-foreground leading-relaxed", open ? "" : "line-clamp-2")}>
              {report.summary}
            </p>
          )}
        </div>

        {open && (
          <>
            {/* Rating explanation */}
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1">{t("ai-graph.report.ratingExplanation")}</div>
              <p className="text-[11px] italic text-muted-foreground leading-relaxed">{report.ratingExplanation}</p>
            </div>

            {/* Findings */}
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1.5">{t("ai-graph.report.findings")}</div>
              <div className="space-y-2">
                {(editing ? draft.findings : report.findings).map((f, i) => (
                  <div key={i} className="rounded border border-border/50 bg-background p-2.5">
                    {editing ? (
                      <>
                        <input value={f.headline} onChange={(e) => {
                          const next = [...draft.findings]; next[i] = { ...f, headline: e.target.value };
                          setDraft({ ...draft, findings: next });
                        }} className="h-7 w-full rounded border border-border bg-background px-2 text-[12px] font-medium mb-1 outline-none focus:border-primary" />
                        <textarea value={f.explanation} onChange={(e) => {
                          const next = [...draft.findings]; next[i] = { ...f, explanation: e.target.value };
                          setDraft({ ...draft, findings: next });
                        }} rows={2} className="w-full rounded border border-border bg-background p-1.5 text-[11px] outline-none focus:border-primary" />
                      </>
                    ) : (
                      <>
                        <div className="text-[12px] font-medium mb-0.5">{f.headline}</div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{f.explanation}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
