import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, CheckCircle2, Eye, FileText, Loader2, Pause, Pencil,
  Play, Plus, RotateCcw, Search, SlidersHorizontal, Trash2, X, Zap, Clock,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Field, Modal, Select } from "@/features/data-asset/components/common";

import { useSyncTasks } from "../store";
import {
  SYNC_MODE_LABEL, SYNC_STATUS_LABEL,
  type SyncMode, type SyncStatus, type SyncTask, type SyncRunLog,
} from "../api/types";

const STATUS_TONE: Record<SyncStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  running: "border-blue-200 bg-blue-50 text-blue-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  paused: "border-amber-200 bg-amber-50 text-amber-700",
  queued: "border-violet-200 bg-violet-50 text-violet-700",
};

export function SyncPage() {
  const [tasks, setTasks] = useSyncTasks();
  const [query, setQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<SyncMode | "all">("all");
  const [statusFilter, setStatusFilter] = useState<SyncStatus | "all">("all");
  const [selected, setSelected] = useState<SyncTask | null>(null);
  const [editing, setEditing] = useState<SyncTask | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (modeFilter !== "all" && t.mode !== modeFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (q && !(t.name.toLowerCase().includes(q) || t.sourceName.toLowerCase().includes(q) || t.owner.toLowerCase().includes(q) || t.targetTable.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [tasks, modeFilter, statusFilter, query]);

  const kpis = [
    { label: "同步任务", value: tasks.length, icon: Zap, hint: "全量 + 增量 + CDC + 实时" },
    { label: "运行中", value: tasks.filter((t) => t.status === "running").length, icon: Loader2, hint: "实时或调度执行" },
    { label: "成功", value: tasks.filter((t) => t.status === "success").length, icon: CheckCircle2, hint: "最近一次运行成功" },
    { label: "失败", value: tasks.filter((t) => t.status === "failed").length, icon: AlertTriangle, hint: "需关注或重试" },
  ];

  function runTask(t: SyncTask) {
    setTasks((cur) => cur.map((x) => x.id === t.id ? ({ ...x, status: "running", progress: 0, lastRunAt: "刚刚", updatedAt: "刚刚" } as SyncTask) : x));
    window.setTimeout(() => {
      const success = Math.random() > 0.3;
      setTasks((cur) => cur.map((x): SyncTask => {
        if (x.id !== t.id) return x;
        if (success) {
          const delta = Math.floor(10000 + Math.random() * 100000);
          const log: SyncRunLog = { id: "log-" + Date.now(), startedAt: "刚刚", finishedAt: "刚刚", status: "success", recordsRead: delta, recordsWritten: delta, durationSec: Math.floor(20 + Math.random() * 200), operator: "manual" };
          return { ...x, status: "success", progress: 100, throughput: delta, recordsTotal: x.recordsTotal + delta, recordsSynced: x.recordsTotal + delta, logs: [log, ...x.logs].slice(0, 20), updatedAt: "刚刚" };
        }
        const log: SyncRunLog = { id: "log-" + Date.now(), startedAt: "刚刚", status: "failed", recordsRead: Math.floor(1000 + Math.random() * 5000), recordsWritten: 0, durationSec: 60, errorMessage: "目标端连接超时：connection refused", operator: "manual" };
        return { ...x, status: "failed", progress: Math.floor(Math.random() * 80), retryCount: x.retryCount + 1, logs: [log, ...x.logs].slice(0, 20), updatedAt: "刚刚" };
      }));
    }, 2000);
  }

  function togglePause(t: SyncTask) {
    setTasks((cur) => cur.map((x) => x.id === t.id ? { ...x, status: x.status === "paused" ? "queued" : "paused", updatedAt: "刚刚" } : x));
  }

  function remove(t: SyncTask) {
    if (!window.confirm(`确认删除同步任务"${t.name}"？`)) return;
    setTasks((cur) => cur.filter((x) => x.id !== t.id));
  }

  return (
    <div className="h-full overflow-y-auto bg-background p-5">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
        <Header onCreate={() => setEditing(newSyncTask())} />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => <Kpi key={k.label} {...k} />)}
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <Search className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索任务名、源端、目标表或负责人"
              className="h-8 min-w-[240px] flex-1 rounded-md border border-input bg-background px-2 text-[12px] outline-none focus:border-primary" />
            <div className="flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={modeFilter} onChange={(v) => setModeFilter(v as SyncMode | "all")} options={[
                { value: "all", label: "全部模式" },
                { value: "full", label: "全量" }, { value: "incremental", label: "增量" },
                { value: "cdc", label: "CDC" }, { value: "realtime", label: "实时" },
              ]} className="w-28" />
              <Select value={statusFilter} onChange={(v) => setStatusFilter(v as SyncStatus | "all")} options={[
                { value: "all", label: "全部状态" },
                { value: "draft", label: "草稿" }, { value: "queued", label: "排队中" },
                { value: "running", label: "运行中" }, { value: "success", label: "成功" },
                { value: "failed", label: "失败" }, { value: "paused", label: "已暂停" },
              ]} className="w-28" />
            </div>
            <span className="ml-auto text-[11px] text-muted-foreground">{filtered.length} 条</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-[12px]">
              <thead className="bg-muted/60 text-[11px] font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">任务</th>
                  <th className="px-3 py-2.5">模式</th>
                  <th className="px-3 py-2.5">源端 → 目标</th>
                  <th className="px-3 py-2.5">进度 / 吞吐</th>
                  <th className="px-3 py-2.5">调度</th>
                  <th className="px-3 py-2.5">状态</th>
                  <th className="px-3 py-2.5">负责人</th>
                  <th className="px-3 py-2.5">最近运行</th>
                  <th className="px-4 py-2.5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-14 text-center text-muted-foreground">无匹配同步任务</td></tr>
                )}
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/35">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{t.name}</div>
                      <div className="text-[11px] text-muted-foreground">{t.targetTable}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        "inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium",
                        t.mode === "realtime" ? "bg-purple-50 text-purple-700" :
                        t.mode === "cdc" ? "bg-blue-50 text-blue-700" :
                        t.mode === "incremental" ? "bg-amber-50 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      )}>{SYNC_MODE_LABEL[t.mode]}</span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <div>{t.sourceName}</div>
                      <div className="text-[11px]">→ {t.targetType} / {t.targetName}</div>
                    </td>
                    <td className="px-3 py-3">
                      <ProgressBar value={t.progress} />
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {t.throughput > 0 ? `${t.throughput.toLocaleString()} 行/s` : "—"} · {t.recordsSynced.toLocaleString()} / {t.recordsTotal.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{t.schedule}</td>
                    <td className="px-3 py-3">
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", STATUS_TONE[t.status])}>
                        {SYNC_STATUS_LABEL[t.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{t.owner}</td>
                    <td className="px-3 py-3 text-muted-foreground">{t.lastRunAt ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {t.status !== "running" && (
                          <button onClick={() => runTask(t)} className="inline-flex h-7 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 text-[11px] font-medium text-blue-700 hover:bg-blue-100">
                            <Play className="h-3 w-3" /> 运行
                          </button>
                        )}
                        {(t.status === "running" || t.status === "paused" || t.status === "queued") && (
                          <button onClick={() => togglePause(t)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-amber-50 hover:text-amber-600" aria-label="暂停/恢复">
                            <Pause className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {t.status === "failed" && (
                          <button onClick={() => runTask(t)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-blue-50 hover:text-blue-600" aria-label="重试">
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => setSelected(t)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary" aria-label="详情">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditing(t)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary" aria-label="编辑">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => remove(t)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="删除">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selected && <SyncDetailDrawer task={selected} onClose={() => setSelected(null)} />}
      {editing && <SyncEditModal task={editing} onChange={setEditing} onSave={(t) => {
        setTasks((cur) => {
          const idx = cur.findIndex((x) => x.id === t.id);
          if (idx >= 0) { const c = [...cur]; c[idx] = t; return c; }
          return [{ ...t, updatedAt: "刚刚" }, ...cur];
        });
        setEditing(null);
      }} onCancel={() => setEditing(null)} />}
    </div>
  );
}

// ------------------ Helpers ------------------

function newSyncTask(): SyncTask {
  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  return {
    id: "sync-new-" + Date.now(),
    name: "新建同步任务",
    mode: "incremental",
    sourceId: "", sourceName: "请选择源端",
    targetType: "hive", targetName: "数据湖 ODS 层", targetTable: "ods_table",
    schedule: "每日 02:00", owner: "平台团队", status: "draft",
    progress: 0, nextRunAt: "明日", throughput: 0,
    recordsTotal: 0, recordsSynced: 0, latencyMin: 0, retryCount: 0,
    logs: [], updatedAt: now,
  };
}

// ------------------ Header ------------------

function Header({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-[17px] font-semibold text-foreground">数据同步</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          配置全量 / 增量 / CDC / 实时同步任务，跟踪源端、目标端、调度策略与 mock 运行结果。运行历史与错误日志用于演示排障。
        </p>
      </div>
      <button onClick={onCreate} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground hover:opacity-90">
        <Plus className="h-3.5 w-3.5" /> 新建同步任务
      </button>
    </section>
  );
}

function Kpi({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint: string; icon: typeof Zap }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="h-3.5 w-3.5" /></span>
      </div>
      <div className="mt-2 text-[22px] font-semibold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const bg = value >= 100 ? "bg-emerald-500" : value === 0 ? "bg-muted" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full transition-all", bg)} style={{ width: pct + "%" }} />
      </div>
      <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

// ------------------ Detail Drawer ------------------

function SyncDetailDrawer({ task, onClose }: { task: SyncTask; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose}>
      <aside className="absolute right-0 top-0 flex h-full w-[640px] flex-col border-l border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">{task.name}</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {SYNC_MODE_LABEL[task.mode]} · {task.sourceName} → {task.targetType}/{task.targetTable}
            </p>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-[12px]">
          <div className="grid gap-3 sm:grid-cols-4">
            <MiniCard label="吞吐" value={task.throughput.toLocaleString() + "/s"} icon={Activity} />
            <MiniCard label="已同步" value={task.recordsSynced.toLocaleString()} icon={FileText} />
            <MiniCard label="延迟" value={task.latencyMin + " min"} icon={Clock} />
            <MiniCard label="重试" value={task.retryCount + ""} icon={AlertTriangle} />
          </div>

          <DetailSection title="同步配置">
            <KV label="模式" value={SYNC_MODE_LABEL[task.mode]} />
            <KV label="源端" value={task.sourceName} />
            <KV label="目标端" value={`${task.targetType} / ${task.targetName}`} />
            <KV label="目标表" value={task.targetTable} mono />
            <KV label="调度策略" value={task.schedule} />
            <KV label="下次运行" value={task.nextRunAt ?? "—"} />
            <KV label="负责人" value={task.owner} />
          </DetailSection>

          {task.columns && task.columns.length > 0 && (
            <DetailSection title="字段映射">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/50 text-muted-foreground"><tr>
                  <th className="px-2 py-1 text-left">源字段</th>
                  <th className="px-2 py-1 text-left">类型</th>
                  <th className="px-2 py-1 text-left">→ 目标</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {task.columns.map((c) => (
                    <tr key={c.name}>
                      <td className="px-2 py-1 font-mono">{c.name}</td>
                      <td className="px-2 py-1 text-muted-foreground font-mono">{c.type}</td>
                      <td className="px-2 py-1 font-mono">{c.mappedTo ?? c.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>
          )}

          <DetailSection title="运行历史（最近 {task.logs.length} 次）">
            {task.logs.length === 0 ? (
              <p className="text-muted-foreground">无运行记录</p>
            ) : (
              <div className="space-y-2">
                {task.logs.map((log) => <LogItem key={log.id} log={log} />)}
              </div>
            )}
          </DetailSection>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button onClick={onClose} className="h-8 rounded-md border border-input px-3 text-[12px] font-medium">关闭</button>
        </div>
      </aside>
    </div>
  );
}

function MiniCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-[15px] font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="mb-2 border-b border-border/70 pb-1 text-[12px] font-semibold text-foreground">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("flex-1 text-foreground", mono && "font-mono text-[11px]")}>{value || "—"}</span>
    </div>
  );
}

function LogItem({ log }: { log: SyncRunLog }) {
  const isRunning = log.status === "running";
  const isFailed = log.status === "failed";
  const tone = isRunning ? "border-blue-200 bg-blue-50" : isFailed ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50";
  return (
    <div className={cn("rounded-md border px-3 py-2", tone)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium">{log.startedAt}</span>
        <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium">
          {isRunning ? "运行中" : isFailed ? "失败" : "成功"}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        读 {log.recordsRead.toLocaleString()} → 写 {log.recordsWritten.toLocaleString()} · 耗时 {log.durationSec}s
      </div>
      {log.errorMessage && (
        <div className="mt-1 rounded bg-red-900/5 px-2 py-1 font-mono text-[10px] text-red-700">{log.errorMessage}</div>
      )}
    </div>
  );
}

// ------------------ Edit Modal ------------------

function SyncEditModal({
  task, onChange, onSave, onCancel,
}: {
  task: SyncTask; onChange: (t: SyncTask) => void;
  onSave: (t: SyncTask) => void; onCancel: () => void;
}) {
  const isNew = task.id.startsWith("sync-new-");
  function update<K extends keyof SyncTask>(key: K, v: SyncTask[K]) {
    onChange({ ...task, [key]: v });
  }

  return (
    <Modal title={isNew ? "新建同步任务" : "编辑同步任务"} description="配置源端、目标端、同步模式和调度策略。"
      onClose={onCancel}
      footer={
        <>
          <button onClick={onCancel} className="h-8 rounded-md border border-input px-3 text-[12px] font-medium">取消</button>
          <button disabled={!task.name || !task.sourceName || !task.targetTable}
            onClick={() => onSave({ ...task, updatedAt: "刚刚" })}
            className="h-8 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground disabled:opacity-50">
            保存
          </button>
        </>
      }>
      <div className="grid gap-4 text-[12px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="任务名称" required>
            <input value={task.name} onChange={(e) => update("name", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
          </Field>
          <Field label="同步模式" required>
            <Select value={task.mode} onChange={(v) => update("mode", v as SyncMode)} options={Object.entries(SYNC_MODE_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
          </Field>
          <Field label="源端" required>
            <input value={task.sourceName} onChange={(e) => update("sourceName", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" placeholder="选择已登记数据源" />
          </Field>
          <Field label="目标端">
            <Select value={task.targetType} onChange={(v) => update("targetType", v as SyncTask["targetType"])} options={[
              { value: "hive", label: "Hive" }, { value: "doris", label: "Doris" },
              { value: "hbase", label: "HBase" }, { value: "kafka", label: "Kafka" },
              { value: "mysql", label: "MySQL" },
            ]} />
          </Field>
          <Field label="目标库/表" required>
            <input value={task.targetTable} onChange={(e) => update("targetTable", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-[11px] outline-none focus:border-primary" />
          </Field>
          <Field label="调度策略">
            <Select value={task.schedule} onChange={(v) => update("schedule", v)} options={[
              { value: "持续运行", label: "持续运行" },
              { value: "每 5 分钟", label: "每 5 分钟" }, { value: "每 15 分钟", label: "每 15 分钟" },
              { value: "每小时", label: "每小时" },
              { value: "每日 02:00", label: "每日 02:00" }, { value: "每日 06:00", label: "每日 06:00" },
              { value: "每周一早 05:00", label: "每周一早 05:00" }, { value: "手动", label: "手动触发" },
            ]} />
          </Field>
          <Field label="负责人">
            <input value={task.owner} onChange={(e) => update("owner", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

// Sync page complete
