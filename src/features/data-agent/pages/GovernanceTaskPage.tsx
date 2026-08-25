import { useMemo, useState } from "react";
import { AlertOctagon, ArrowRight, GitBranch, ShieldCheck, UserCheck } from "lucide-react";
import { Navigate, useParams } from "react-router-dom";

import { Panel, Pill } from "@/components/data-platform/WorkspacePrimitives";
import { cn } from "@/lib/utils";

import { EvidenceStack, PendingActionCard } from "../components/TaskPrimitives";
import { TaskDetailShell } from "../components/TaskDetailShell";
import { useDataAgent } from "../state";

const categoryTone = { 标准: "blue", 质量: "amber", 元数据: "slate", 安全: "red", 认责: "violet" } as const;

export function GovernanceTaskPage() {
  const { taskId = "" } = useParams();
  const { getTask, confirmAction } = useDataAgent();
  const task = getTask(taskId);
  const governance = task?.workspace.governance;
  const [category, setCategory] = useState<"全部" | "标准" | "质量" | "元数据" | "安全" | "认责">("全部");
  const [selectedId, setSelectedId] = useState(governance?.findings[0]?.id ?? "");
  const findings = useMemo(() => governance?.findings.filter((item) => category === "全部" || item.category === category) ?? [], [category, governance]);
  const selected = governance?.findings.find((item) => item.id === selectedId) ?? findings[0];
  if (!task || !governance) return <Navigate to="/data-agent/governance" replace />;

  return (
    <TaskDetailShell agent="governance" task={task}>
      <Panel className="border-emerald-100">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-700" /><span className="text-[12px] font-semibold text-foreground">治理检查范围</span>{governance.scope.map((item) => <Pill key={item} tone="green" size="sm">{item}</Pill>)}</div>
          <p className="mt-2 text-[9px] text-muted-foreground">检查结果只形成候选与整改建议；标准、质量、安全和认责事实仍由原产品域持有。</p>
        </div>
      </Panel>

      <div className="grid gap-4 2xl:grid-cols-[330px_minmax(0,1fr)_330px]">
        <Panel title="问题研判队列" description={`${findings.length} 项当前结果`}>
          <div className="flex flex-wrap gap-1.5 border-b border-border p-3">{(["全部", "标准", "质量", "元数据", "安全", "认责"] as const).map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={cn("rounded px-2 py-1 text-[9px]", category === item ? "bg-emerald-600 text-white" : "bg-muted/40 text-muted-foreground")}>{item}</button>)}</div>
          <div className="divide-y divide-border">
            {findings.map((finding) => (
              <button key={finding.id} type="button" onClick={() => setSelectedId(finding.id)} className={cn("w-full p-3 text-left hover:bg-muted/30", selected?.id === finding.id && "bg-emerald-50/60")}>
                <div className="flex items-center justify-between gap-2"><Pill tone={categoryTone[finding.category]} size="sm">{finding.category}</Pill><Pill tone={finding.severity === "高" ? "red" : finding.severity === "中" ? "amber" : "slate"} size="sm">{finding.severity}</Pill></div>
                <div className="mt-2 text-[10px] font-semibold leading-5 text-foreground">{finding.title}</div>
                <div className="mt-1 text-[9px] text-muted-foreground">{finding.object} · {finding.status}</div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="问题与整改审阅" description={selected ? `${selected.id} · ${selected.object}` : "选择问题"}>
          {selected ? (
            <div className="space-y-4 p-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3"><div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">治理发现</div><h3 className="mt-1 text-[14px] font-semibold text-foreground">{selected.title}</h3></div><Pill tone={selected.severity === "高" ? "red" : "amber"}>{selected.severity}风险</Pill></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-md bg-white p-3"><div className="text-[9px] text-muted-foreground">影响范围</div><div className="mt-1 text-[10px] leading-5 text-foreground">{selected.impact}</div></div><div className="rounded-md bg-white p-3"><div className="text-[9px] text-muted-foreground">认责管理者</div><div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-foreground"><UserCheck className="h-3.5 w-3.5 text-emerald-600" />{selected.owner}</div></div></div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4"><div className="flex items-center gap-2 text-[10px] font-semibold text-emerald-900"><ShieldCheck className="h-4 w-4" />建议整改方案</div><p className="mt-2 text-[10px] leading-6 text-emerald-900">{selected.recommendation}</p><div className="mt-3 flex flex-wrap gap-2"><Pill tone="green">保留来源证据</Pill><Pill tone="blue">进入原职责链</Pill><Pill tone="amber">需要人工复核</Pill></div></div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3"><div className="flex items-center gap-2 text-[10px] font-semibold text-amber-900"><AlertOctagon className="h-4 w-4" />职责边界</div><p className="mt-1 text-[9px] leading-5 text-amber-800">Data Agent 可以创建候选或整改事项，但不能发布标准、认定重要数据或替代复核人关闭问题。</p></div>
            </div>
          ) : <div className="grid h-64 place-items-center text-[10px] text-muted-foreground">当前筛选下没有问题</div>}
        </Panel>

        <div className="space-y-4">
          <Panel title="影响关系" description="稳定对象 ID 与下游关系">
            <div className="space-y-2 p-3">
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[10px] font-semibold text-emerald-800"><GitBranch className="h-3.5 w-3.5" />{selected?.object ?? "治理对象"}</div>
              {governance.impactObjects.map((object) => <div key={object.id} className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-slate-300" /><div className="min-w-0 flex-1 rounded-md border border-border bg-card p-2"><div className="truncate text-[10px] font-medium text-foreground">{object.label}</div><div className="mt-0.5 text-[9px] text-muted-foreground">{object.relation} · {object.id}</div></div></div>)}
            </div>
          </Panel>
          <Panel title="治理证据" description="未知与证据不足不判为符合"><div className="p-3"><EvidenceStack evidence={task.evidence} /></div></Panel>
        </div>
      </div>
      {task.pendingAction && <PendingActionCard action={task.pendingAction} onConfirm={() => confirmAction(task.id)} />}
    </TaskDetailShell>
  );
}
