import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, RefreshCw, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import type { AsyncTask } from "../../api/mock";

const TYPE_LABELS: Record<string, string> = {
  "gremlin-query": "Gremlin 查询",
  "cypher-query": "Cypher 查询",
  "olap-algorithm": "OLAP 算法",
  "schema-delete": "Schema 删除",
  "index-rebuild": "索引重建",
  import: "数据导入",
  "ai-kg-build": "AI KG 构建",
  "large-export": "大规模导出",
};

export function AsyncTasksPage() {
  const { t } = useTranslation("knowledge-graph");
  const [searchParams] = useSearchParams();
  const autoOpenId = searchParams.get("taskId");

  const [tasks, setTasks] = useState<AsyncTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<AsyncTask | null>(null);
  const [typeOpen, setTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    void mockClient.get<AsyncTask[]>("/api/knowledge-graph/async-tasks/list")
      .then((list) => {
        setTasks(list);
        if (autoOpenId) {
          const t_ = list.find((t) => t.id === autoOpenId);
          if (t_) setSelectedTask(t_);
        }
      })
      .finally(() => setLoading(false));
  }, [autoOpenId]);

  const filtered = tasks.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (query && !t.id.includes(query) && !t.type.includes(query)) return false;
    return true;
  });

  const cancelTask = async (task: AsyncTask) => {
    if (!window.confirm(t("asyncTasks.cancel.confirm"))) return;
    await mockClient.post(`/api/knowledge-graph/async-tasks/${task.id}/cancel`);
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: "cancelled" } : t));
    if (selectedTask?.id === task.id) setSelectedTask((prev) => prev ? { ...prev, status: "cancelled" } : null);
  };

  const retryTask = async (task: AsyncTask) => {
    if (!window.confirm(t("asyncTasks.retry.confirm"))) return;
    const newTask = await mockClient.post<AsyncTask>(`/api/knowledge-graph/async-tasks/${task.id}/retry`);
    setTasks((prev) => [newTask, ...prev]);
  };

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[20px] font-semibold">{t("asyncTasks.title")}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{t("asyncTasks.subtitle")}</p>
        </div>
        <button type="button" onClick={() => { setLoading(true); void mockClient.get<AsyncTask[]>("/api/knowledge-graph/async-tasks/list").then(setTasks).finally(() => setLoading(false)); }}
          className="flex h-8 items-center gap-1.5 rounded border border-border px-3 text-[13px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />刷新
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索任务 ID…"
          className="h-7 rounded border border-border bg-background px-3 text-[12px] outline-none focus:border-primary w-48"
        />

        {/* Type filter */}
        <Dropdown
          label={typeFilter === "all" ? "全部类型" : TYPE_LABELS[typeFilter] ?? typeFilter}
          open={typeOpen}
          onToggle={() => { setTypeOpen((v) => !v); setStatusOpen(false); }}
        >
          {["all", ...Object.keys(TYPE_LABELS)].map((type) => (
            <button key={type} type="button" onClick={() => { setTypeFilter(type); setTypeOpen(false); }}
              className={cn("w-full px-3 py-1.5 text-left text-[12px] hover:bg-accent transition-colors", typeFilter === type && "text-primary font-medium")}>
              {type === "all" ? "全部类型" : TYPE_LABELS[type]}
            </button>
          ))}
        </Dropdown>

        {/* Status filter */}
        <Dropdown
          label={statusFilter === "all" ? "全部状态" : statusFilter}
          open={statusOpen}
          onToggle={() => { setStatusOpen((v) => !v); setTypeOpen(false); }}
        >
          {["all", "pending", "running", "success", "failed", "cancelled"].map((s) => (
            <button key={s} type="button" onClick={() => { setStatusFilter(s); setStatusOpen(false); }}
              className={cn("w-full px-3 py-1.5 text-left text-[12px] hover:bg-accent transition-colors", statusFilter === s && "text-primary font-medium")}>
              {s === "all" ? "全部状态" : s}
            </button>
          ))}
        </Dropdown>

        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{filtered.length} 条</span>
      </div>

      {/* Table */}
      <div className="rounded border border-border overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-card">
            <tr>
              {["任务 ID", "类型", "状态", "进度", "创建时间", "耗时", "操作"].map((h) => (
                <th key={h} className="px-4 py-2.5 font-medium text-[11px] uppercase text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-muted" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-muted-foreground">{t("asyncTasks.empty")}</td>
              </tr>
            ) : (
              filtered.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={cn(
                    "border-b border-border/50 cursor-pointer hover:bg-accent/20 transition-colors",
                    selectedTask?.id === task.id && "bg-accent/30",
                  )}
                >
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{task.id}</td>
                  <td className="px-4 py-3">{TYPE_LABELS[task.type] ?? task.type}</td>
                  <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${task.progress}%` }} />
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">{task.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{task.createdAt}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">
                    {task.finishedAt && task.startedAt ? "~5m" : task.startedAt ? "运行中" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {(task.status === "running" || task.status === "pending") && (
                        <button type="button" onClick={() => void cancelTask(task)} className="rounded border border-destructive/30 px-2 py-0.5 text-[11px] text-destructive hover:bg-destructive/5 transition-colors">取消</button>
                      )}
                      {task.status === "failed" && (
                        <button type="button" onClick={() => void retryTask(task)} className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">重试</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail drawer */}
      {selectedTask && (
        <TaskDetailDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}

function TaskDetailDrawer({ task, onClose }: { task: AsyncTask; onClose: () => void }) {
  const { t } = useTranslation("knowledge-graph");
  const [activeTab, setActiveTab] = useState<"params" | "result" | "logs">("params");
  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-[400px] flex-col border-l border-border bg-background shadow-sm animate-slide-in-right">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <div className="text-[13px] font-medium truncate">{task.id}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <StatusBadge status={task.status} />
            <span className="text-[11px] text-muted-foreground">{TYPE_LABELS[task.type]}</span>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress */}
      <div className="border-b border-border px-5 py-3">
        <div className="mb-1 flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">进度</span>
          <span className="font-mono">{task.progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${task.progress}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["params", "result", "logs"] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={cn("flex-1 py-2 text-[12px] transition-colors", activeTab === tab ? "border-b-2 border-primary text-primary font-medium" : "text-muted-foreground")}>
            {tab === "params" ? t("asyncTasks.detail.params") : tab === "result" ? t("asyncTasks.detail.result") : t("asyncTasks.detail.logs")}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
        {activeTab === "params" && (
          <pre className="font-mono text-[11px] text-foreground">{JSON.stringify(task.parameters, null, 2)}</pre>
        )}
        {activeTab === "result" && (
          task.result
            ? <div className="space-y-2"><div className="text-[13px]">{task.result.summary}</div>{task.result.rowCount && <div className="font-mono text-[12px] text-muted-foreground">{task.result.rowCount.toLocaleString()} 行</div>}</div>
            : <p className="text-[12px] text-muted-foreground">暂无结果</p>
        )}
        {activeTab === "logs" && (
          <div className="space-y-1">
            {task.logs.map((log, i) => (
              <div key={i} className={cn("font-mono text-[11px]", log.level === "error" ? "text-destructive" : log.level === "warn" ? "text-amber-600" : "text-foreground/70")}>
                <span className="mr-2 text-muted-foreground">{log.at}</span>
                <span className="uppercase mr-2">[{log.level}]</span>
                {log.message}
              </div>
            ))}
            {task.logs.length === 0 && <p className="text-[12px] text-muted-foreground">暂无日志</p>}
          </div>
        )}
      </div>

      {task.error && (
        <div className="border-t border-border px-5 py-3 text-[12px] text-destructive">{task.error}</div>
      )}
    </div>
  );
}

function Dropdown({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <button type="button" onClick={onToggle} className="flex h-7 items-center gap-1.5 rounded border border-border bg-background px-3 text-[12px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
        {label}<ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-52 w-40 overflow-y-auto rounded border border-border bg-background shadow-sm scrollbar-thin">
          {children}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "success" || status === "ready" ? "badge-success" :
    status === "running" ? "badge-running" :
    status === "pending" ? "badge-pending" :
    status === "failed" ? "badge-offline" :
    "badge-cancelled";
  return <span className={cn("rounded border px-2 py-0.5 font-mono text-[10px] uppercase", cls)}>{status}</span>;
}
