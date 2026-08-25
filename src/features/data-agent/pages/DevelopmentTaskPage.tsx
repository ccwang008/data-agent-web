import { useState } from "react";
import { CheckCircle2, Code2, GitCompare, PlayCircle, Rows3, TriangleAlert, XCircle } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import { Panel, Pill } from "@/components/data-platform/WorkspacePrimitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ObjectReferenceList, PendingActionCard } from "../components/TaskPrimitives";
import { TaskDetailShell } from "../components/TaskDetailShell";
import { useDataAgent } from "../state";

export function DevelopmentTaskPage() {
  const { taskId = "" } = useParams();
  const { getTask, confirmAction } = useDataAgent();
  const task = getTask(taskId);
  const [tab, setTab] = useState<"code" | "diff" | "preview">("code");
  if (!task) return <Navigate to="/data-agent/development" replace />;
  const development = task.workspace.development;
  if (!development) return <Navigate to="/data-agent/development" replace />;

  return (
    <TaskDetailShell agent="development" task={task}>
      <section className="grid gap-3 rounded-lg border border-violet-100 bg-violet-50/40 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="flex items-center gap-2"><Code2 className="h-4 w-4 text-violet-700" /><span className="text-[12px] font-semibold text-foreground">开发 Brief</span><Pill tone="violet">{development.artifactType}</Pill></div>
          <p className="mt-2 text-[10px] leading-5 text-muted-foreground">{task.prompt}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[9px] text-muted-foreground"><span>输入：订单明细 / 客户主数据</span><span>·</span><span>输出：区域复购率日快照</span><span>·</span><span>口径：v3</span></div>
        </div>
        <Button variant="outline" size="sm" asChild><Link to="/data-development/sql">进入 SQL 专业编辑器</Link></Button>
      </section>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <Panel
          title={`${development.artifactType} 产物预览`}
          description={`${development.sourceVersion} → ${development.targetVersion}`}
          actions={<div className="flex rounded-md bg-muted p-0.5">{(["code", "diff", "preview"] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={cn("rounded px-2 py-1 text-[9px]", tab === item ? "bg-white text-violet-700 shadow-sm" : "text-muted-foreground")}>{item === "code" ? "代码" : item === "diff" ? "差异" : "试运行"}</button>)}</div>}
        >
          {tab === "code" && (
            <div className="bg-slate-950 p-4">
              <div className="mb-3 flex items-center justify-between text-[9px] text-slate-400"><span>repurchase_rate_daily.sql</span><span>只读预览</span></div>
              <pre className="max-h-[470px] overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-6 text-slate-200">{development.code}</pre>
            </div>
          )}
          {tab === "diff" && (
            <div className="space-y-2 p-4">
              {development.diff.map((line) => <div key={line} className={cn("rounded-md border px-3 py-2 font-mono text-[10px]", line.startsWith("+") ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-blue-100 bg-blue-50 text-blue-800")}><GitCompare className="mr-2 inline h-3 w-3" />{line}</div>)}
            </div>
          )}
          {tab === "preview" && (
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[520px] text-left text-[10px]"><thead><tr>{Object.keys(development.previewRows[0] ?? {}).map((key) => <th key={key} className="border-b border-border px-3 py-2 font-mono font-medium text-muted-foreground">{key}</th>)}</tr></thead><tbody>{development.previewRows.map((row, index) => <tr key={index}>{Object.values(row).map((value, cell) => <td key={`${index}-${cell}`} className="border-b border-border px-3 py-3 font-mono text-foreground">{value}</td>)}</tr>)}</tbody></table>
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="校验结果" description="规则、口径、安全和成本">
            <div className="divide-y divide-border">
              {development.validations.map((validation) => {
                const Icon = validation.status === "passed" ? CheckCircle2 : validation.status === "warning" ? TriangleAlert : XCircle;
                return <div key={validation.label} className="flex items-start gap-2 p-3"><Icon className={cn("mt-0.5 h-4 w-4 shrink-0", validation.status === "passed" ? "text-emerald-600" : validation.status === "warning" ? "text-amber-600" : "text-red-600")} /><div><div className="text-[10px] font-semibold text-foreground">{validation.label}</div><div className="mt-1 text-[9px] leading-5 text-muted-foreground">{validation.detail}</div></div></div>;
              })}
            </div>
          </Panel>
          <Panel title="输入与输出引用" description="发布版本将固定这些对象">
            <div className="p-3"><ObjectReferenceList refs={task.contextRefs.slice(0, 4)} /></div>
          </Panel>
          <Panel title="试运行摘要" description="mock 结果不代表生产执行">
            <div className="p-4"><div className="flex items-center gap-3"><PlayCircle className="h-6 w-6 text-violet-600" /><div><div className="text-[12px] font-semibold text-foreground">3 个区域返回结果</div><div className="mt-0.5 text-[9px] text-muted-foreground">耗时 1.8s · 扫描 31 个分区</div></div></div><div className="mt-3 flex gap-2"><Pill tone="green"><Rows3 className="mr-1 h-3 w-3" />结果 Schema 稳定</Pill><Pill tone="amber">敏感字段已聚合</Pill></div></div>
          </Panel>
        </div>
      </div>
      {task.pendingAction && <PendingActionCard action={task.pendingAction} onConfirm={() => confirmAction(task.id)} />}
    </TaskDetailShell>
  );
}
