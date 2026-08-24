import { useState } from "react";
import { ChevronRight, GitCompareArrows, Sparkles, X } from "lucide-react";

import { ActionButton, Panel, Pill } from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import type { AiDecision, StandardVersion } from "./types";

/** 标准版本追溯抽屉：版本列表 + 任意两版本差异 + 引用追溯 */
export function VersionTraceDrawer({
  open, onClose, versions, title,
}: {
  open: boolean;
  onClose: () => void;
  versions: StandardVersion[];
  title: string;
}) {
  const [baseId, setBaseId] = useState<string | null>(versions[0]?.id ?? null);
  const [targetId, setTargetId] = useState<string | null>(versions[1]?.id ?? versions[0]?.id ?? null);
  if (!open) return null;
  const base = versions.find((v) => v.id === baseId) ?? null;
  const target = versions.find((v) => v.id === targetId) ?? null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">Version Traceability</div>
            <div className="text-[14px] font-semibold text-foreground">{title} · 版本追溯</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <Panel title="版本列表" description="已发布内容不可覆盖，修订生成新版本">
            <div className="divide-y divide-border">
              {versions.length === 0 && <EmptyHint text="暂无版本记录" />}
              {versions.map((v) => (
                <div key={v.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground">{v.version}</span>
                    <Pill tone={v.approvedBy === "—" ? "amber" : "green"}>{v.approvedBy === "—" ? "未批准" : "已发布"}</Pill>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{v.content}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                    <span>变更人：{v.createdBy}</span>
                    <span>批准人：{v.approvedBy}</span>
                    <span>{v.createdAt}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-amber-700">原因：{v.changeReason}</div>
                </div>
              ))}
            </div>
          </Panel>
          {versions.length >= 2 && (
            <Panel title="版本差异" description="选择两个版本对比字段级差异">
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <VersionSelect label="基准版本" value={baseId} onChange={setBaseId} versions={versions} />
                  <VersionSelect label="目标版本" value={targetId} onChange={setTargetId} versions={versions} />
                </div>
                {base && target && (
                  <div className="rounded-md border border-border">
                    <DiffRow label="版本" base={base.version} target={target.version} />
                    <DiffRow label="内容" base={base.content} target={target.content} />
                    <DiffRow label="变更原因" base={base.changeReason} target={target.changeReason} />
                    <DiffRow label="变更人" base={base.createdBy} target={target.createdBy} />
                  </div>
                )}
              </div>
            </Panel>
          )}
          <Panel title="引用追溯" description="前后版本、项目版本映射与稽核批次引用">
            <div className="space-y-2 p-4 text-[11px] leading-5 text-muted-foreground">
              <TraceRow label="前一版本" value={target?.previousVersionId ?? "—"} />
              <TraceRow label="项目版本映射" value="MAP-001（已落标）" />
              <TraceRow label="稽核批次" value="AUD-001（成功）" />
              <TraceRow label="量化快照" value="绑定当期标准版本，不回算" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function VersionSelect({ label, value, onChange, versions }: { label: string; value: string | null; onChange: (v: string) => void; versions: StandardVersion[] }) {
  return (
    <label className="block">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-[11px] text-foreground outline-none">
        {versions.map((v) => <option key={v.id} value={v.id}>{v.version} · {v.createdAt}</option>)}
      </select>
    </label>
  );
}

function DiffRow({ label, base, target }: { label: string; base: string; target: string }) {
  const changed = base !== target;
  return (
    <div className={cn("grid grid-cols-[80px_1fr_1fr] gap-2 border-b border-border px-3 py-2 text-[11px] last:border-b-0", changed && "bg-amber-50/60")}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("break-words", changed && "text-amber-800 line-through opacity-70")}>{base || "—"}</span>
      <span className={cn("break-words", changed ? "font-medium text-emerald-700" : "text-foreground")}>{target || "—"}</span>
    </div>
  );
}

function TraceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
      <span>{label}</span>
      <span className="font-mono text-[10px] text-foreground">{value}</span>
    </div>
  );
}

/** AI 判定审计面板：展示模型/策略版本、置信度、依据摘要与复核结果 */
export function AiDecisionCard({ decision }: { decision: AiDecision }) {
  const confidenceTone = decision.confidence === "高" ? "green" : decision.confidence === "中" ? "blue" : "amber";
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-800"><Sparkles className="h-3.5 w-3.5" />AI 判定</div>
        <div className="flex items-center gap-1.5">
          <Pill tone={confidenceTone}>置信度 {decision.confidence}</Pill>
          <Pill tone={decision.autoExecuted ? "blue" : "slate"}>{decision.autoExecuted ? "自动执行" : "人工复核"}</Pill>
        </div>
      </div>
      <div className="mt-2 text-[11px] font-medium text-foreground">{decision.result}</div>
      <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{decision.rationaleSummary}</p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span>模型 {decision.modelVersion}</span>
        <span>策略 {decision.strategyVersion}</span>
        <span>{decision.executedAt}</span>
        <Pill tone={statusTone(decision.reviewResult)}>{decision.reviewResult}</Pill>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
        <GitCompareArrows className="h-3 w-3" />输入：{decision.inputRefs.join("、")}
      </div>
    </div>
  );
}

/** 证据缺口提示：没有标准参与证据时显示，并可创建改进事项 */
export function EvidenceGapNotice({ hasEvidence, onCreate }: { hasEvidence: boolean; onCreate?: () => void }) {
  if (hasEvidence) return null;
  return (
    <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
      <span>尚未登记国家/行业标准参与证据，存在证据缺口。</span>
      {onCreate && <ActionButton icon={ChevronRight} onClick={onCreate}>创建改进事项</ActionButton>}
    </div>
  );
}

export function EmptyHint({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-[11px] text-muted-foreground">{text}</div>;
}

/** 责任链推进按钮组：候选 → 草稿 → 待复核 → 待批准 → 已发布 */
export function ApprovalActions({
  status, onAdvance,
}: {
  status: string;
  onAdvance: (next: string) => void;
}) {
  const flow: Record<string, string | null> = {
    候选: "草稿", 草稿: "待复核", 待复核: "待批准", 待批准: "已发布", 已发布: null, 已废止: null,
  };
  const next = flow[status] ?? null;
  if (!next) return <Pill tone="green">已发布</Pill>;
  const label = next === "已发布" ? "批准发布" : `提交${next.replace("待", "")}`;
  return <ActionButton primary onClick={() => onAdvance(next)}>{label}</ActionButton>;
}
