import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  FileCheck2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Pill, ProgressBar } from "@/components/data-platform/WorkspacePrimitives";
import { cn } from "@/lib/utils";

import { agentProfiles } from "../profiles";
import type {
  AgentEvidence,
  AgentObjectRef,
  AgentPendingAction,
  AgentStep,
  AgentTaskStatus,
} from "../types";

const statusMeta: Record<AgentTaskStatus, { label: string; tone: "blue" | "amber" | "green" | "red" }> = {
  running: { label: "执行中", tone: "blue" },
  "needs-confirmation": { label: "待确认", tone: "amber" },
  completed: { label: "已完成", tone: "green" },
  blocked: { label: "受阻", tone: "red" },
};

export function TaskStatusPill({ status }: { status: AgentTaskStatus }) {
  const meta = statusMeta[status];
  return <Pill tone={meta.tone}>{meta.label}</Pill>;
}

export function TaskProgress({ value, status }: { value: number; status: AgentTaskStatus }) {
  const tone = status === "completed" ? "green" : status === "blocked" ? "red" : status === "needs-confirmation" ? "amber" : "blue";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>任务进度</span>
        <span className="font-mono text-foreground">{value}%</span>
      </div>
      <ProgressBar value={value} tone={tone} />
    </div>
  );
}

export function StepTimeline({ steps, compact = false }: { steps: AgentStep[]; compact?: boolean }) {
  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const profile = agentProfiles[step.agent];
        const Icon = step.status === "completed"
          ? CheckCircle2
          : step.status === "running"
            ? Loader2
            : step.status === "needs-confirmation"
              ? AlertTriangle
              : Circle;
        return (
          <div key={step.id} className="relative flex gap-3">
            {index < steps.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%_-_10px)] w-px bg-border" />}
            <span className={cn(
              "relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border",
              step.status === "completed" && "border-emerald-200 bg-emerald-50 text-emerald-600",
              step.status === "running" && "border-blue-200 bg-blue-50 text-blue-600",
              step.status === "needs-confirmation" && "border-amber-200 bg-amber-50 text-amber-600",
              step.status === "waiting" && "border-slate-200 bg-white text-slate-300",
            )}>
              <Icon className={cn("h-3.5 w-3.5", step.status === "running" && "animate-spin")} />
            </span>
            <div className={cn("min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2", compact && "py-1.5")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-foreground">{step.label}</span>
                <Pill tone="slate" size="sm">{profile.name}</Pill>
              </div>
              {!compact && <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{step.detail}</p>}
              {step.outputRef && <div className="mt-1 font-mono text-[9px] text-blue-600">输出 {step.outputRef}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EvidenceStack({ evidence }: { evidence: AgentEvidence[] }) {
  return (
    <div className="space-y-2">
      {evidence.map((item) => (
        <div key={item.id} className="rounded-md border border-border bg-muted/20 p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground">
                <FileCheck2 className="h-3 w-3 text-blue-600" />
                {item.label}
              </div>
              <div className="mt-1 text-[9px] text-muted-foreground">{item.source} · {item.id}</div>
            </div>
            <Pill tone={item.status === "valid" ? "green" : item.status === "review" ? "amber" : "red"} size="sm">
              {Math.round(item.confidence * 100)}%
            </Pill>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ObjectReferenceList({ refs }: { refs: AgentObjectRef[] }) {
  return (
    <div className="space-y-2">
      {refs.map((ref) => {
        const content = (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 hover:border-blue-200 hover:bg-blue-50/40">
            <div className="min-w-0">
              <div className="truncate text-[10px] font-semibold text-foreground">{ref.label}</div>
              <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">{ref.type} · {ref.id}</div>
            </div>
            {ref.route && <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />}
          </div>
        );
        return ref.route ? <Link key={ref.id} to={ref.route}>{content}</Link> : <div key={ref.id}>{content}</div>;
      })}
    </div>
  );
}

export function PendingActionCard({
  action,
  onConfirm,
}: {
  action: AgentPendingAction;
  onConfirm: () => void;
}) {
  return (
    <div className={cn(
      "rounded-lg border p-4",
      action.risk === "controlled" ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60",
    )}>
      <div className="flex items-start gap-3">
        <span className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-md",
          action.risk === "controlled" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700",
        )}>
          {action.risk === "controlled" ? <ShieldAlert className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[12px] font-semibold text-foreground">{action.label}</h3>
            <Pill tone={action.risk === "controlled" ? "red" : "amber"} size="sm">
              {action.risk === "controlled" ? "受控动作" : "需要确认"}
            </Pill>
          </div>
          <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{action.description}</p>
          <div className="mt-3 space-y-1.5">
            {action.preview.map((item) => (
              <div key={item} className="flex items-start gap-2 text-[10px] text-foreground">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[9px] text-muted-foreground">确认人和执行结果将写入任务审计</span>
            <Button size="sm" onClick={onConfirm}>确认执行 mock 动作</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
