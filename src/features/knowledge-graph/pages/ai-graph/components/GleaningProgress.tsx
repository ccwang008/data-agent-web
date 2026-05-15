import { Check, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PhaseSpec {
  key: string;
  status: "pending" | "running" | "done" | "failed";
  label: string;
  detail?: string;
}

interface Props {
  phases: PhaseSpec[];
  overallProgress: number;
  failed?: boolean;
}

export function GleaningProgress({ phases, overallProgress, failed }: Props) {
  return (
    <div className="space-y-4">
      {/* Overall bar */}
      <div className="rounded border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-medium">{failed ? "失败" : overallProgress >= 100 ? "完成" : "进行中"}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{overallProgress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className={cn("h-full rounded-full transition-all duration-300",
            failed ? "bg-destructive" : overallProgress >= 100 ? "bg-emerald-500" : "bg-primary")}
            style={{ width: `${overallProgress}%` }} />
        </div>
      </div>

      {/* Per-phase rows */}
      <div className="space-y-1.5">
        {phases.map((p) => (
          <div key={p.key}
            className={cn("flex items-center gap-3 rounded border bg-card px-4 py-2.5",
              p.status === "running" ? "border-primary/40" : "border-border")}>
            {p.status === "done" ? <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              : p.status === "running" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              : p.status === "failed" ? <Circle className="h-4 w-4 shrink-0 text-destructive" />
              : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />}
            <span className={cn("flex-1 text-[13px]",
              p.status === "pending" ? "text-muted-foreground" : "text-foreground")}>
              {p.label}
            </span>
            {p.detail && <span className="text-[11px] text-muted-foreground font-mono">{p.detail}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
