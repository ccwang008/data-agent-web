import { useMemo, useState } from "react";
import { CheckCircle2, Database, GitBranch, Search, ShieldCheck, Star } from "lucide-react";
import { Navigate, useParams } from "react-router-dom";

import { Panel, Pill, ProgressBar } from "@/components/data-platform/WorkspacePrimitives";
import { cn } from "@/lib/utils";

import { EvidenceStack, PendingActionCard } from "../components/TaskPrimitives";
import { TaskDetailShell } from "../components/TaskDetailShell";
import { useDataAgent } from "../state";

export function DiscoveryTaskPage() {
  const { taskId = "" } = useParams();
  const { getTask, confirmAction } = useDataAgent();
  const task = getTask(taskId);
  const candidates = useMemo(() => task?.workspace.candidates ?? [], [task?.workspace.candidates]);
  const [selectedId, setSelectedId] = useState(task?.workspace.recommendedCandidateId ?? candidates[0]?.id ?? "");
  const [query, setQuery] = useState(task?.prompt ?? "");
  const selected = useMemo(() => candidates.find((item) => item.id === selectedId) ?? candidates[0], [candidates, selectedId]);
  if (!task) return <Navigate to="/data-agent/discovery" replace />;

  return (
    <TaskDetailShell agent="discovery" task={task}>
      <Panel className="border-cyan-100">
        <div className="p-4">
          <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 focus-within:border-cyan-300 focus-within:ring-2 focus-within:ring-cyan-100">
            <Search className="h-4 w-4 text-cyan-700" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none" aria-label="数据发现查询" />
            <button type="button" className="rounded-md bg-cyan-700 px-3 py-1.5 text-[10px] font-medium text-white">重新匹配 mock</button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] text-muted-foreground">
            <span>已解析：</span>
            <Pill tone="blue" size="sm">业务实体</Pill><Pill tone="slate" size="sm">指标口径</Pill><Pill tone="amber" size="sm">权限约束</Pill>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 2xl:grid-cols-[330px_minmax(0,1fr)_320px]">
        <Panel title="候选资产" description={`${candidates.length} 项 · 按综合适用性排序`}>
          <div className="divide-y divide-border">
            {candidates.map((candidate) => (
              <button key={candidate.id} type="button" onClick={() => setSelectedId(candidate.id)} className={cn("w-full p-3 text-left hover:bg-muted/30", selected?.id === candidate.id && "bg-cyan-50/70")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-cyan-700" /><span className="truncate text-[11px] font-semibold text-foreground">{candidate.name}</span></div>
                    <div className="mt-1 text-[9px] text-muted-foreground">{candidate.type} · {candidate.domain}</div>
                  </div>
                  <Pill tone={candidate.match >= 90 ? "green" : candidate.match >= 80 ? "blue" : "slate"} size="sm">{candidate.match}%</Pill>
                </div>
                <div className="mt-3"><ProgressBar value={candidate.match} tone={candidate.match >= 90 ? "green" : "blue"} /></div>
                <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground"><span>质量 {candidate.quality}</span><span>{candidate.access}</span></div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="候选对比" description="语义、质量、安全、时效和可访问性共同决策">
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[620px] text-left text-[10px]">
              <thead><tr className="text-muted-foreground">{["资产", "语义匹配", "质量", "新鲜度", "安全等级", "访问", "负责人"].map((item) => <th key={item} className="border-b border-border px-2 py-2 font-medium">{item}</th>)}</tr></thead>
              <tbody>{candidates.map((candidate) => <tr key={candidate.id} className={cn("cursor-pointer", candidate.id === selected?.id && "bg-cyan-50/60")} onClick={() => setSelectedId(candidate.id)}><td className="border-b border-border px-2 py-3 font-semibold text-foreground">{candidate.name}{candidate.id === task.workspace.recommendedCandidateId && <Star className="ml-1 inline h-3 w-3 fill-amber-400 text-amber-400" />}</td><td className="border-b border-border px-2 py-3 font-mono">{candidate.match}%</td><td className="border-b border-border px-2 py-3 font-mono">{candidate.quality}</td><td className="border-b border-border px-2 py-3">{candidate.freshness}</td><td className="border-b border-border px-2 py-3">{candidate.security}</td><td className="border-b border-border px-2 py-3"><Pill tone={candidate.access === "已授权" ? "green" : "amber"} size="sm">{candidate.access}</Pill></td><td className="border-b border-border px-2 py-3">{candidate.owner}</td></tr>)}</tbody>
            </table>
          </div>
          {selected && (
            <div className="border-t border-border bg-cyan-50/40 p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-cyan-900"><CheckCircle2 className="h-4 w-4" />为什么推荐 {selected.name}</div>
              <p className="mt-1 text-[10px] leading-5 text-cyan-800">{selected.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2"><Pill tone="blue"><GitBranch className="mr-1 h-3 w-3" />血缘可追踪</Pill><Pill tone="green"><ShieldCheck className="mr-1 h-3 w-3" />质量证据有效</Pill></div>
            </div>
          )}
        </Panel>

        <Panel title="证据检查器" description={selected ? selected.name : "选择候选资产"}>
          <div className="space-y-4 p-3">
            <EvidenceStack evidence={task.evidence} />
            {selected && <div className="rounded-md border border-border bg-muted/20 p-3"><div className="text-[9px] uppercase tracking-wider text-muted-foreground">使用建议</div><div className="mt-1 text-[10px] leading-5 text-foreground">优先作为主来源；与客户主数据按稳定客户 ID 关联，并保留区域参考数据版本。</div></div>}
          </div>
        </Panel>
      </div>

      {task.pendingAction && <PendingActionCard action={task.pendingAction} onConfirm={() => confirmAction(task.id)} />}
    </TaskDetailShell>
  );
}
