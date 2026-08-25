import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Square,
  X,
  XCircle,
} from "lucide-react";

import { mockClient } from "@/lib/mock-client";
import { DataAgentContextLink } from "@/components/data-platform/DataAgentContextLink";
import { cn } from "@/lib/utils";
import type { SchedulerRun, SchedulerRunStatus, SchedulerTask, SchedulerTaskType } from "../api/mock";

const TYPE_LABELS: Record<SchedulerTaskType, string> = {
  development: "数据开发",
  processing: "数据处理",
  sync: "数据集成",
  service: "数据服务",
};

const STATUS_META: Record<SchedulerRunStatus, { label: string; className: string; icon: typeof Activity }> = {
  draft: { label: "草稿", className: "border-slate-200 bg-slate-50 text-slate-600", icon: Clock3 },
  queued: { label: "排队中", className: "border-amber-200 bg-amber-50 text-amber-700", icon: Clock3 },
  running: { label: "运行中", className: "border-blue-200 bg-blue-50 text-blue-700", icon: Loader2 },
  success: { label: "成功", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  failed: { label: "失败", className: "border-red-200 bg-red-50 text-red-700", icon: XCircle },
  stopped: { label: "已停止", className: "border-slate-200 bg-slate-50 text-slate-600", icon: Square },
};

function StatusBadge({ status }: { status: SchedulerRunStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.className)}><Icon className={cn("h-3 w-3", status === "running" && "animate-spin")} />{meta.label}</span>;
}

function LogDialog({ task, onClose }: { task: SchedulerTask; onClose: () => void }) {
  const [runs, setRuns] = useState<SchedulerRun[]>([]);
  const [loading, setLoading] = useState(true);
  const latestRun = runs[0];

  useEffect(() => {
    let active = true;
    void mockClient.get<SchedulerRun[]>(`/api/scheduler/tasks/${task.id}/runs`, { latencyMs: 120 }).then((response) => {
      if (active) setRuns(response);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [task.id]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <div className="flex max-h-[min(720px,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="text-[15px] font-semibold text-foreground">执行记录 · {task.name}</h2><p className="mt-1 text-[11px] text-muted-foreground">查看最近一次 mock 运行日志和结果</p></div><button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-foreground"><X className="h-4 w-4" /></button></div>
        <div className="grid min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? <div className="grid h-40 place-items-center text-[13px] text-muted-foreground">加载执行记录中...</div> : latestRun ? <div className="space-y-4"><div className="grid gap-3 rounded-md border border-border bg-surface-raised p-3 sm:grid-cols-4"><div><div className="text-[11px] text-muted-foreground">运行状态</div><div className="mt-1"><StatusBadge status={latestRun.status} /></div></div><div><div className="text-[11px] text-muted-foreground">运行 ID</div><div className="mt-1 truncate font-mono text-[11px] text-foreground">{latestRun.id}</div></div><div><div className="text-[11px] text-muted-foreground">开始时间</div><div className="mt-1 text-[11px] text-foreground">{latestRun.startedAt}</div></div><div><div className="text-[11px] text-muted-foreground">耗时</div><div className="mt-1 text-[11px] text-foreground">{latestRun.duration}</div></div></div><div className="overflow-hidden rounded-md border border-slate-800 bg-slate-950"><div className="border-b border-slate-800 px-3 py-2 text-[11px] font-medium text-slate-400">运行日志 · {latestRun.triggeredBy}</div><div className="max-h-[420px] overflow-y-auto p-3 font-mono text-[11px] leading-6">{latestRun.logs.map((line, index) => <div key={`${line.time}-${index}`} className={cn(line.level === "ERROR" ? "text-red-300" : line.level === "WARN" ? "text-amber-300" : "text-slate-300")}><span className="mr-2 text-slate-500">{line.time}</span><span className="mr-2">[{line.level}]</span>{line.text}</div>)}</div></div></div> : <div className="grid h-40 place-items-center text-[13px] text-muted-foreground">该任务暂无执行记录</div>}
        </div>
      </div>
    </div>
  );
}

export default function SchedulerMonitorPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<SchedulerTask[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | SchedulerRunStatus>("all");
  const [type, setType] = useState<"all" | SchedulerTaskType>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [logTask, setLogTask] = useState<SchedulerTask | null>(null);

  const loadTasks = async (withSpinner = false) => {
    if (withSpinner) setRefreshing(true);
    try {
      setTasks(await mockClient.get<SchedulerTask[]>("/api/scheduler/tasks", { latencyMs: 180 }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesKeyword = !keyword || `${task.name} ${task.description} ${task.owner}`.toLowerCase().includes(keyword);
      return matchesKeyword && (status === "all" || task.status === status) && (type === "all" || task.type === type);
    });
  }, [search, status, tasks, type]);

  const updateTask = (next: SchedulerTask) => setTasks((current) => current.map((task) => task.id === next.id ? next : task));

  const runTask = async (task: SchedulerTask) => {
    setActionId(task.id);
    try {
      updateTask(await mockClient.post<SchedulerTask>(`/api/scheduler/tasks/${task.id}/run`, { triggeredBy: "监控页手动触发" }));
      window.setTimeout(() => void loadTasks(), 1800);
    } finally {
      setActionId(null);
    }
  };

  const stopTask = async (task: SchedulerTask) => {
    setActionId(task.id);
    try {
      updateTask(await mockClient.post<SchedulerTask>(`/api/scheduler/tasks/${task.id}/stop`));
    } finally {
      setActionId(null);
    }
  };

  const runningCount = tasks.filter((task) => task.status === "running" || task.status === "queued").length;
  const successCount = tasks.filter((task) => task.status === "success").length;
  const failedCount = tasks.filter((task) => task.status === "failed").length;

  return (
    <div className="page-shell animate-fade-in">
      <div className="space-y-4">
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"><div><h1 className="text-[16px] font-semibold text-foreground">任务监控</h1><p className="mt-1 text-[12px] text-muted-foreground">查看调度任务运行状态、耗时、执行记录并进行运行控制</p></div><div className="flex flex-wrap items-center gap-2"><DataAgentContextLink agent="operations" contextType="调度运行" contextId={tasks.find((task) => task.status === "failed")?.id ?? "scheduler-monitor"} intent="诊断失败任务并生成安全的恢复步骤" /><button type="button" onClick={() => void loadTasks(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-[12px] font-medium text-foreground hover:border-primary/30 hover:text-primary"><RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />刷新状态</button><button type="button" onClick={() => navigate("/scheduler/tasks")} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground hover:opacity-90">任务列表</button></div></section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[{ label: "监控任务", value: tasks.length, icon: Activity, color: "text-primary", bg: "bg-primary/10" }, { label: "运行中 / 排队", value: runningCount, icon: Loader2, color: "text-blue-600", bg: "bg-blue-50" }, { label: "今日成功", value: successCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" }, { label: "失败待处理", value: failedCount, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" }].map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-lg border border-border bg-card p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[12px] text-muted-foreground">{item.label}</span><span className={cn("grid h-7 w-7 place-items-center rounded-md", item.bg, item.color)}><Icon className={cn("h-3.5 w-3.5", item.label.includes("运行") && runningCount > 0 && "animate-spin")} /></span></div><div className="mt-2 text-[22px] font-semibold tabular-nums text-foreground">{item.value}</div></div>; })}
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-2 text-[13px] font-semibold text-foreground"><Activity className="h-4 w-4 text-primary" />实时运行监控<span className="text-[11px] font-normal text-muted-foreground">{filtered.length} 个任务</span></div><div className="flex flex-wrap items-center gap-2"><div className="flex h-8 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-surface-raised px-3 text-[12px] text-muted-foreground sm:w-[220px]"><Search className="h-3.5 w-3.5 shrink-0" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70" placeholder="搜索任务" /></div><select value={type} onChange={(event) => setType(event.target.value as "all" | SchedulerTaskType)} className="h-8 rounded-md border border-input bg-card px-2.5 text-[12px] text-foreground outline-none focus:border-primary"><option value="all">全部任务域</option><option value="development">数据开发</option><option value="processing">数据处理</option><option value="sync">数据集成</option><option value="service">数据服务</option></select><select value={status} onChange={(event) => setStatus(event.target.value as "all" | SchedulerRunStatus)} className="h-8 rounded-md border border-input bg-card px-2.5 text-[12px] text-foreground outline-none focus:border-primary"><option value="all">全部状态</option>{Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></div></div>
          <div className="overflow-x-auto px-5"><table className="w-full min-w-[1050px] border-separate border-spacing-0 text-left"><thead><tr className="text-[12px] font-medium text-slate-600">{[["任务", "w-[22%]"], ["任务域", "w-[11%]"], ["状态", "w-[12%]"], ["最近运行", "w-[19%]"], ["下次运行", "w-[16%]"], ["运行次数", "w-[9%]"], ["操作", "w-[19%]"]].map(([label, width]) => <th key={label} className={cn("border-b border-border py-3 pr-4", width)}>{label}</th>)}</tr></thead><tbody>{!loading && filtered.map((task) => <tr key={task.id} className="text-[13px] text-foreground"><td className="border-b border-border py-3.5 pr-4"><button type="button" onClick={() => navigate(`/scheduler/editor?task=${task.id}`)} className="font-medium text-primary hover:underline">{task.name}</button><div className="mt-0.5 text-[11px] text-muted-foreground">{task.owner} · v{task.version}</div></td><td className="border-b border-border py-3.5 pr-4"><span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-700">{TYPE_LABELS[task.type]}</span></td><td className="border-b border-border py-3.5 pr-4"><StatusBadge status={task.status} /></td><td className="border-b border-border py-3.5 pr-4 text-[12px] tabular-nums text-muted-foreground">{task.lastRun ? <><div>{task.lastRun.startedAt}</div><div className="mt-0.5">{task.lastRun.duration}</div></> : "尚未运行"}</td><td className="border-b border-border py-3.5 pr-4 font-mono text-[11px] text-muted-foreground">{task.nextRun}</td><td className="border-b border-border py-3.5 pr-4 tabular-nums text-muted-foreground">{task.runCount}</td><td className="border-b border-border py-3.5"><div className="flex items-center gap-1"><button type="button" onClick={() => task.status === "running" ? void stopTask(task) : void runTask(task)} disabled={actionId === task.id} className={cn("inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] disabled:opacity-50", task.status === "running" ? "border-red-200 text-red-600 hover:bg-red-50" : "border-input text-foreground hover:border-primary/30 hover:text-primary")}>{task.status === "running" ? <><Square className="h-3 w-3" />停止</> : <><Play className="h-3 w-3" />运行</>}</button><button type="button" onClick={() => setLogTask(task)} className="inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary"><FileText className="h-3 w-3" />日志</button></div></td></tr>)}</tbody></table>{loading ? <div className="grid h-44 place-items-center text-[13px] text-muted-foreground">加载监控状态中...</div> : filtered.length === 0 ? <div className="grid h-44 place-items-center text-[13px] text-muted-foreground">暂无匹配的运行任务</div> : null}</div>
        </section>
      </div>
      {logTask && <LogDialog task={logTask} onClose={() => setLogTask(null)} />}
    </div>
  );
}
