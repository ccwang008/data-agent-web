import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Edit3,
  Filter,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Workflow,
} from "lucide-react";

import { mockClient } from "@/lib/mock-client";
import { cn } from "@/lib/utils";
import type { SchedulerRunStatus, SchedulerTask, SchedulerTaskType } from "../api/mock";

const TYPE_META: Record<SchedulerTaskType, { label: string; className: string }> = {
  development: { label: "数据开发", className: "bg-blue-50 text-blue-700" },
  processing: { label: "数据处理", className: "bg-amber-50 text-amber-700" },
  sync: { label: "数据集成", className: "bg-emerald-50 text-emerald-700" },
  service: { label: "数据服务", className: "bg-violet-50 text-violet-700" },
};

const STATUS_META: Record<SchedulerRunStatus, { label: string; dot: string; className: string }> = {
  draft: { label: "草稿", dot: "bg-slate-400", className: "border-slate-200 bg-slate-50 text-slate-600" },
  queued: { label: "排队中", dot: "bg-amber-500", className: "border-amber-200 bg-amber-50 text-amber-700" },
  running: { label: "运行中", dot: "bg-blue-500", className: "border-blue-200 bg-blue-50 text-blue-700" },
  success: { label: "成功", dot: "bg-emerald-500", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  failed: { label: "失败", dot: "bg-red-500", className: "border-red-200 bg-red-50 text-red-700" },
  stopped: { label: "已停止", dot: "bg-slate-500", className: "border-slate-200 bg-slate-50 text-slate-600" },
};

function StatusBadge({ status }: { status: SchedulerRunStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot, status === "running" && "animate-pulse")} />
      {meta.label}
    </span>
  );
}

function triggerLabel(task: SchedulerTask) {
  if (task.trigger.type === "manual") return "手动触发";
  return task.trigger.expression || (task.trigger.type === "cron" ? "定时触发" : "事件触发");
}

function lastRunLabel(task: SchedulerTask) {
  if (!task.lastRun) return "尚未运行";
  return `${task.lastRun.startedAt} · ${task.lastRun.duration}`;
}

export default function SchedulerTasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<SchedulerTask[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | SchedulerTaskType>("all");
  const [status, setStatus] = useState<"all" | SchedulerRunStatus>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

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
      const matchesSearch = !keyword || `${task.name} ${task.description} ${task.owner}`.toLowerCase().includes(keyword);
      const matchesType = type === "all" || task.type === type;
      const matchesStatus = status === "all" || task.status === status;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [search, status, tasks, type]);

  const runTask = async (task: SchedulerTask) => {
    setRunningId(task.id);
    try {
      const running = await mockClient.post<SchedulerTask>(`/api/scheduler/tasks/${task.id}/run`, {
        triggeredBy: "任务列表手动触发",
      });
      setTasks((current) => current.map((item) => (item.id === running.id ? running : item)));
    } finally {
      setRunningId(null);
    }
  };

  const removeTask = async (task: SchedulerTask) => {
    await mockClient.delete(`/api/scheduler/tasks/${task.id}`);
    setTasks((current) => current.filter((item) => item.id !== task.id));
  };

  const counts = {
    total: tasks.length,
    running: tasks.filter((task) => task.status === "running" || task.status === "queued").length,
    success: tasks.filter((task) => task.status === "success").length,
    failed: tasks.filter((task) => task.status === "failed").length,
  };

  return (
    <div className="page-shell animate-fade-in">
      <div className="space-y-4">
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[16px] font-semibold text-foreground">调度任务</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">统一编排数据集成、数据开发、数据质量校验与数据服务任务</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadTasks(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              刷新
            </button>
            <button
              type="button"
              onClick={() => navigate("/scheduler/editor?new=1")}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              新建调度任务
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "任务总数", value: counts.total, icon: Workflow, color: "text-primary", bg: "bg-primary/10" },
            { label: "运行中 / 排队", value: counts.running, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "最近成功", value: counts.success, icon: Play, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "需要关注", value: counts.failed, icon: Filter, color: "text-red-600", bg: "bg-red-50" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">{item.label}</span>
                  <span className={cn("grid h-7 w-7 place-items-center rounded-md", item.bg, item.color)}><Icon className="h-3.5 w-3.5" /></span>
                </div>
                <div className="mt-2 text-[22px] font-semibold tabular-nums text-foreground">{item.value}</div>
              </div>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
              <Workflow className="h-4 w-4 text-primary" />
              任务列表
              <span className="text-[11px] font-normal text-muted-foreground">共 {filtered.length} 条</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-8 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-surface-raised px-3 text-[12px] text-muted-foreground sm:w-[240px]">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70" placeholder="搜索任务、负责人" />
              </div>
              <select value={type} onChange={(event) => setType(event.target.value as "all" | SchedulerTaskType)} className="h-8 rounded-md border border-input bg-card px-2.5 text-[12px] text-foreground outline-none focus:border-primary">
                <option value="all">全部任务域</option>
                <option value="development">数据开发</option>
                <option value="processing">数据处理</option>
                <option value="sync">数据集成</option>
                <option value="service">数据服务</option>
              </select>
              <select value={status} onChange={(event) => setStatus(event.target.value as "all" | SchedulerRunStatus)} className="h-8 rounded-md border border-input bg-card px-2.5 text-[12px] text-foreground outline-none focus:border-primary">
                <option value="all">全部状态</option>
                {Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto px-5">
            <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-[12px] font-medium text-slate-600">
                  {[
                    ["任务名称", "w-[23%]"],
                    ["任务域", "w-[10%]"],
                    ["触发策略", "w-[17%]"],
                    ["版本 / 负责人", "w-[15%]"],
                    ["最近运行", "w-[18%]"],
                    ["状态", "w-[9%]"],
                    ["操作", "w-[18%]"],
                  ].map(([label, width]) => <th key={label} className={cn("border-b border-border py-3 pr-4", width)}>{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {!loading && filtered.map((task) => (
                  <tr key={task.id} className="group text-[13px] text-foreground">
                    <td className="border-b border-border py-3.5 pr-4">
                      <button type="button" onClick={() => navigate(`/scheduler/editor?task=${task.id}`)} className="text-left font-medium text-primary hover:underline">{task.name}</button>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{task.description}</div>
                    </td>
                    <td className="border-b border-border py-3.5 pr-4"><span className={cn("inline-flex rounded-md px-2 py-1 text-[11px] font-medium", TYPE_META[task.type].className)}>{TYPE_META[task.type].label}</span></td>
                    <td className="border-b border-border py-3.5 pr-4 font-mono text-[11px] text-slate-600">{triggerLabel(task)}</td>
                    <td className="border-b border-border py-3.5 pr-4 text-[12px] text-muted-foreground"><div>v{task.version}</div><div className="mt-0.5">{task.owner}</div></td>
                    <td className="border-b border-border py-3.5 pr-4 text-[12px] tabular-nums text-muted-foreground">{lastRunLabel(task)}</td>
                    <td className="border-b border-border py-3.5 pr-4"><StatusBadge status={task.status} /></td>
                    <td className="border-b border-border py-3.5">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => void runTask(task)} disabled={task.status === "running" || runningId === task.id} className="inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-[11px] text-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"><Play className="h-3 w-3" />执行</button>
                        <button type="button" onClick={() => navigate(`/scheduler/editor?task=${task.id}`)} className="inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-[11px] text-foreground transition-colors hover:border-primary/30 hover:text-primary"><Edit3 className="h-3 w-3" />编排</button>
                        <button type="button" onClick={() => void removeTask(task)} className="grid h-7 w-7 place-items-center rounded-md text-red-500 transition-colors hover:bg-red-50 hover:text-red-600" aria-label={`删除${task.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading ? <div className="grid h-44 place-items-center text-[13px] text-muted-foreground">加载任务中...</div> : filtered.length === 0 ? <div className="grid h-44 place-items-center text-[13px] text-muted-foreground">暂无匹配的调度任务</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
