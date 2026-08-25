import { useState } from "react";
import { BarChart3, BookOpen, MessageSquareText, Quote, Send, Sparkles } from "lucide-react";
import { Navigate, useParams } from "react-router-dom";

import { Panel } from "@/components/data-platform/WorkspacePrimitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { EvidenceStack, PendingActionCard } from "../components/TaskPrimitives";
import { TaskDetailShell } from "../components/TaskDetailShell";
import { useDataAgent } from "../state";

const metricTone = {
  blue: "border-blue-100 bg-blue-50 text-blue-900",
  green: "border-emerald-100 bg-emerald-50 text-emerald-900",
  amber: "border-amber-100 bg-amber-50 text-amber-900",
  red: "border-red-100 bg-red-50 text-red-900",
};

export function QaTaskPage() {
  const { taskId = "" } = useParams();
  const { getTask, confirmAction } = useDataAgent();
  const task = getTask(taskId);
  const [question, setQuestion] = useState("");
  const [view, setView] = useState<"trend" | "evidence">("trend");
  if (!task) return <Navigate to="/data-agent/qa" replace />;
  const answer = task.workspace.answer;
  if (!answer) return <Navigate to="/data-agent/qa" replace />;
  const maxValue = Math.max(...answer.chart.flatMap((point) => [point.value, point.compare ?? 0]), 1);

  return (
    <TaskDetailShell agent="qa" task={task}>
      <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title="问答记录" description="问题、澄清和可见动作保留在任务内">
          <div className="flex min-h-[570px] flex-col">
            <div className="flex-1 space-y-3 p-4">
              <div className="ml-8 rounded-lg rounded-tr-sm bg-blue-600 p-3 text-[10px] leading-5 text-white">{task.prompt}</div>
              <div className="mr-8 rounded-lg rounded-tl-sm border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-semibold text-blue-700"><Sparkles className="h-3 w-3" />数据问答 Agent</div>
                <p className="mt-2 text-[10px] leading-5 text-foreground">我已使用指标口径 v3，并检查订单新鲜度、区域参考数据和异常分区。结论中会分别说明业务变化与数据延迟的贡献。</p>
              </div>
              <div className="mr-8 rounded-lg rounded-tl-sm border border-amber-200 bg-amber-50/60 p-3">
                <div className="text-[9px] font-semibold text-amber-800">证据限制</div>
                <p className="mt-1 text-[10px] leading-5 text-amber-800">两家门店分区存在延迟，当前结论包含剔除延迟数据后的反事实校验。</p>
              </div>
            </div>
            <form className="border-t border-border p-3" onSubmit={(event) => { event.preventDefault(); setQuestion(""); }}>
              <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
                <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="继续追问这个结论…" className="min-w-0 flex-1 bg-transparent text-[10px] outline-none" />
                <button type="submit" className="text-blue-600" aria-label="发送追问"><Send className="h-3.5 w-3.5" /></button>
              </div>
            </form>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="border-indigo-100">
            <div className="p-5">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-indigo-700"><MessageSquareText className="h-4 w-4" />结论摘要</div>
              <h2 className="mt-3 text-[17px] font-semibold leading-7 text-foreground">{answer.headline}</h2>
              <p className="mt-2 text-[10px] leading-6 text-muted-foreground">{answer.narrative}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {answer.metrics.map((metric) => (
                  <div key={metric.label} className={cn("rounded-lg border p-3", metricTone[metric.tone])}>
                    <div className="text-[9px] opacity-70">{metric.label}</div>
                    <div className="mt-1 flex items-baseline justify-between gap-2"><span className="text-[20px] font-semibold tabular-nums">{metric.value}</span><span className="text-[10px] font-medium">{metric.delta}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel
            title="分析画布"
            description="趋势、对照与来源证据可切换"
            actions={<div className="flex rounded-md bg-muted p-0.5">{(["trend", "evidence"] as const).map((item) => <button key={item} type="button" onClick={() => setView(item)} className={cn("rounded px-2 py-1 text-[9px]", view === item ? "bg-white text-blue-700 shadow-sm" : "text-muted-foreground")}>{item === "trend" ? "趋势" : "证据"}</button>)}</div>}
          >
            {view === "trend" ? (
              <div className="p-4">
                <div className="flex items-center gap-2 text-[10px] font-medium text-foreground"><BarChart3 className="h-3.5 w-3.5 text-indigo-600" />区域复购率趋势</div>
                <div className="mt-5 flex h-[230px] items-end gap-4 border-b border-l border-border px-4 pb-0 pt-4">
                  {answer.chart.map((point) => (
                    <div key={point.label} className="flex h-full flex-1 items-end justify-center gap-1">
                      <div className="group relative w-3 rounded-t bg-indigo-500" style={{ height: `${(point.value / maxValue) * 88}%` }}><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] text-indigo-700">{point.value}</span></div>
                      {point.compare !== undefined && <div className="relative w-3 rounded-t bg-slate-300" style={{ height: `${(point.compare / maxValue) * 88}%` }} />}
                      <span className="absolute mt-5 translate-y-5 text-[8px] text-muted-foreground">{point.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex justify-center gap-4 text-[9px] text-muted-foreground"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-indigo-500" />华东</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-300" />全区域</span></div>
              </div>
            ) : <div className="p-4"><EvidenceStack evidence={task.evidence} /></div>}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="指标口径" description="固定引用批准版本">
              <div className="p-4"><div className="flex items-start gap-2"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><p className="text-[10px] leading-6 text-foreground">{answer.definition}</p></div><div className="mt-3 rounded-md bg-muted/30 p-2 text-[9px] leading-5 text-muted-foreground">查询归因：{answer.sqlSummary}</div></div>
            </Panel>
            <Panel title="回答置信度" description="结论受证据完整性约束">
              <div className="p-4"><div className="flex items-center gap-3"><Quote className="h-5 w-5 text-indigo-600" /><div><div className="text-[20px] font-semibold text-foreground">91%</div><div className="text-[9px] text-muted-foreground">数据延迟影响已单独披露</div></div></div><div className="mt-3"><Button variant="outline" size="sm" onClick={() => setView("evidence")}>查看全部证据</Button></div></div>
            </Panel>
          </div>
        </div>
      </div>
      {task.pendingAction && <PendingActionCard action={task.pendingAction} onConfirm={() => confirmAction(task.id)} />}
    </TaskDetailShell>
  );
}
