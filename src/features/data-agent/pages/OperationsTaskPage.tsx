import { useState } from "react";
import { Activity, ArrowRight, CheckCircle2, Clock3, Play, RotateCcw, ServerCog, TriangleAlert, XCircle } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import { Panel, ProgressBar } from "@/components/data-platform/WorkspacePrimitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { PendingActionCard } from "../components/TaskPrimitives";
import { TaskDetailShell } from "../components/TaskDetailShell";
import { useDataAgent } from "../state";

const nodeStyle = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  failed: "border-red-200 bg-red-50 text-red-800",
};

export function OperationsTaskPage() {
  const { taskId = "" } = useParams();
  const { getTask, confirmAction, patchTask } = useDataAgent();
  const task = getTask(taskId);
  const operations = task?.workspace.operations;
  const [selectedCause, setSelectedCause] = useState(0);
  if (!task || !operations) return <Navigate to="/data-agent/operations" replace />;
  const activeTask = task;
  const activeOperations = operations;

  function simulateRecovery() {
    patchTask(activeTask.id, (current) => ({
      ...current,
      status: "running",
      progress: Math.max(current.progress, 88),
      currentStep: "正在补跑延迟分区并观察质量门禁",
      updatedAt: "刚刚",
      workspace: {
        ...current.workspace,
        operations: {
          ...activeOperations,
          nodes: activeOperations.nodes.map((node, index) => index === 1 ? { ...node, status: "healthy" as const } : index === 2 ? { ...node, status: "warning" as const } : node),
          events: [...activeOperations.events, { time: "现在", status: "running", title: "恢复 Runbook 已启动", detail: "补跑两个延迟分区，未修改质量阈值" }],
          rootCauses: activeOperations.rootCauses,
        },
      },
    }));
  }

  return (
    <TaskDetailShell agent="operations" task={task}>
      <Panel title="数据链路拓扑" description="异常节点、上下游影响和当前恢复态">
        <div className="overflow-x-auto p-4">
          <div className="flex min-w-[820px] items-center justify-between gap-2">
            {operations.nodes.map((node, index) => (
              <div key={node.id} className="contents">
                <div className={cn("min-w-[140px] rounded-lg border p-3", nodeStyle[node.status])}>
                  <div className="flex items-center justify-between"><ServerCog className="h-4 w-4" />{node.status === "healthy" ? <CheckCircle2 className="h-3.5 w-3.5" /> : node.status === "failed" ? <XCircle className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}</div>
                  <div className="mt-3 text-[10px] font-semibold">{node.label}</div>
                  <div className="mt-1 text-[9px] opacity-75">{node.type} · {node.id}</div>
                </div>
                {index < operations.nodes.length - 1 && <ArrowRight className={cn("h-5 w-5 shrink-0", node.status === "failed" ? "text-red-400" : "text-slate-300")} />}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Panel title="运行时间线" description="只展示可复核事件和对象状态">
            <div className="p-4">
              {operations.events.map((event, index) => {
                const Icon = event.status === "success" ? CheckCircle2 : event.status === "failed" ? XCircle : event.status === "running" ? RotateCcw : TriangleAlert;
                return <div key={`${event.time}-${event.title}`} className="relative flex gap-3 pb-5 last:pb-0">{index < operations.events.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%_-_12px)] w-px bg-border" />}<span className={cn("relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-card", event.status === "success" ? "text-emerald-600" : event.status === "failed" ? "text-red-600" : event.status === "running" ? "text-blue-600" : "text-amber-600")}><Icon className={cn("h-4 w-4", event.status === "running" && "animate-spin")} /></span><div className="min-w-0 flex-1 rounded-md border border-border p-3"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-foreground">{event.title}</span><span className="font-mono text-[9px] text-muted-foreground">{event.time}</span></div><p className="mt-1 text-[9px] leading-5 text-muted-foreground">{event.detail}</p></div></div>;
              })}
            </div>
          </Panel>
          <Panel title="恢复 Runbook" description="先低风险恢复，再决定是否回交开发修复">
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              {["补跑延迟门店分区", "重试复购率质量门禁", "观察下游快照与周报"].map((item, index) => <div key={item} className="rounded-lg border border-border bg-muted/20 p-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-[9px] font-semibold text-white">{index + 1}</span><div className="mt-3 text-[10px] font-semibold text-foreground">{item}</div><div className="mt-1 text-[9px] leading-5 text-muted-foreground">{index === 0 ? "不修改代码和质量阈值" : index === 1 ? "使用原版本，保留运行批次" : "10 分钟观察窗口"}</div></div>)}
            </div>
            {!task.pendingAction && task.status !== "completed" && <div className="border-t border-border p-3 text-right"><Button size="sm" onClick={simulateRecovery}><Play className="mr-1.5 h-3.5 w-3.5" />执行恢复 mock</Button></div>}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="根因排序" description="概率来自 mock 证据关联，不等于生产诊断">
            <div className="divide-y divide-border">
              {operations.rootCauses.map((cause, index) => (
                <button key={cause.label} type="button" onClick={() => setSelectedCause(index)} className={cn("w-full p-3 text-left hover:bg-muted/30", selectedCause === index && "bg-amber-50/60")}>
                  <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold leading-5 text-foreground">{cause.label}</span><span className="font-mono text-[11px] font-semibold text-amber-700">{cause.probability}%</span></div>
                  <div className="mt-2"><ProgressBar value={cause.probability} tone={index === 0 ? "amber" : "blue"} /></div>
                  {selectedCause === index && <div className="mt-3 rounded-md bg-white p-2"><div className="text-[9px] leading-5 text-muted-foreground">证据：{cause.evidence}</div><div className="mt-1 text-[9px] font-medium text-foreground">建议：{cause.action}</div></div>}
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="专业工作台" description="复杂运行控制回到原模块">
            <div className="space-y-2 p-3"><Button variant="outline" size="sm" className="w-full justify-start" asChild><Link to="/scheduler/monitor"><Activity className="mr-2 h-3.5 w-3.5" />打开调度任务监控</Link></Button><Button variant="outline" size="sm" className="w-full justify-start" asChild><Link to="/ops-monitor/lineage"><Clock3 className="mr-2 h-3.5 w-3.5" />打开链路监控</Link></Button></div>
          </Panel>
        </div>
      </div>
      {task.pendingAction && <PendingActionCard action={task.pendingAction} onConfirm={() => confirmAction(task.id)} />}
    </TaskDetailShell>
  );
}
