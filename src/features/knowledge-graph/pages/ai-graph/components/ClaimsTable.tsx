import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Pencil, Check, X } from "lucide-react";
import type { ExtractedClaim, ExtractedVertex } from "@/features/knowledge-graph/api/mock";

interface Props {
  claims: ExtractedClaim[];
  vertices: ExtractedVertex[];
  onEdit?: (claimId: string, patch: Partial<ExtractedClaim>) => void;
}

const STATUS_CLS: Record<string, string> = {
  TRUE:      "badge-success",
  SUSPECTED: "bg-amber-50 text-amber-700 border-amber-200",
  FALSE:     "badge-offline",
};

export function ClaimsTable({ claims, vertices, onEdit }: Props) {
  const { t } = useTranslation("knowledge-graph");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const nameOf = (id?: string) => id ? vertices.find(v => v.id === id)?.name ?? id : "—";

  if (claims.length === 0) {
    return (
      <div className="rounded border border-dashed border-border bg-card py-8 text-center text-[12px] text-muted-foreground">
        {t("ai-graph.claim.empty")}
      </div>
    );
  }

  return (
    <div className="rounded border border-border overflow-hidden">
      <table className="w-full text-[13px]">
        <thead className="border-b border-border bg-card">
          <tr>
            {[t("ai-graph.claim.type"), t("ai-graph.claim.subject"), t("ai-graph.claim.object"), t("ai-graph.claim.statement"), t("ai-graph.review.confidence"), t("ai-graph.claim.status"), ""].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-[11px] uppercase text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => {
            const isEdit = editing === c.id;
            return (
              <tr key={c.id} className={cn("border-b border-border/50",
                c.confidence < 0.5 ? "bg-amber-50/40" : "hover:bg-accent/20")}>
                <td className="px-3 py-2.5">
                  <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{c.type}</span>
                </td>
                <td className="px-3 py-2.5 text-[12px] truncate max-w-[120px]">{nameOf(c.subjectVertexId)}</td>
                <td className="px-3 py-2.5 text-[12px] truncate max-w-[120px]">{nameOf(c.objectVertexId)}</td>
                <td className="px-3 py-2.5 text-[12px]">
                  {isEdit ? (
                    <input value={draft} onChange={(e) => setDraft(e.target.value)}
                      className="h-7 w-full rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-primary" />
                  ) : (
                    <span className="line-clamp-2">{c.statement}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-12 rounded-full bg-secondary overflow-hidden">
                      <div className={cn("h-full rounded-full", c.confidence < 0.5 ? "bg-amber-400" : "bg-primary")}
                        style={{ width: `${c.confidence * 100}%` }} />
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{(c.confidence * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn("rounded border px-2 py-0.5 font-mono text-[9px] uppercase", STATUS_CLS[c.status ?? "TRUE"])}>
                    {t(`ai-graph.claim.status${(c.status ?? "TRUE").charAt(0) + (c.status ?? "TRUE").slice(1).toLowerCase()}`)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {onEdit && (
                    isEdit ? (
                      <div className="flex gap-1">
                        <button type="button" onClick={() => { onEdit(c.id, { statement: draft }); setEditing(null); }}
                          className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition-colors">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setEditing(null)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setEditing(c.id); setDraft(c.statement); }}
                        className="p-1 rounded text-muted-foreground hover:text-primary transition-colors">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
