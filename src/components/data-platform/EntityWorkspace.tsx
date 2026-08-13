import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  CheckCircle2,
  Database,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useSqliteState } from "@/lib/sqlite-client";
import { cn } from "@/lib/utils";

export type EntityRecord = {
  id: string;
  name: string;
  status: string;
  owner: string;
  updatedAt: string;
} & Record<string, string>;

export type EntityColumn = {
  key: string;
  label: string;
  className?: string;
  render?: (record: EntityRecord) => ReactNode;
};

export type EntityField = {
  key: string;
  label: string;
  placeholder?: string;
  options?: string[];
};

export type WorkspaceMetric = {
  label: string;
  value: ReactNode;
  hint: string;
};

export type MockAction = {
  label: string;
  runningStatus: string;
  successStatus: string;
  successMessage: string;
};

type EntityWorkspaceProps = {
  title: string;
  description: string;
  scope: string;
  initialRecords: EntityRecord[];
  columns: EntityColumn[];
  fields: EntityField[];
  createLabel: string;
  emptyLabel: string;
  createDefaults?: Record<string, string>;
  metrics: (records: EntityRecord[]) => WorkspaceMetric[];
  action?: MockAction;
};

export function EntityWorkspace({
  title,
  description,
  scope,
  initialRecords,
  columns,
  fields,
  createLabel,
  emptyLabel,
  createDefaults = {},
  metrics,
  action,
}: EntityWorkspaceProps) {
  const [records, setRecords, meta] = useSqliteState<EntityRecord[]>(scope, initialRecords);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("全部状态");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [message, setMessage] = useState("");

  const statuses = useMemo(
    () => ["全部状态", ...Array.from(new Set(records.map((record) => record.status)))],
    [records],
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesStatus = status === "全部状态" || record.status === status;
      const matchesQuery =
        !normalized ||
        Object.values(record).some((value) => value.toLowerCase().includes(normalized));
      return matchesStatus && matchesQuery;
    });
  }, [query, records, status]);
  const summary = metrics(records);

  function startCreate() {
    setEditingId(null);
    setDraft({
      name: "",
      owner: "平台团队",
      status: "草稿",
      ...createDefaults,
    });
  }

  function startEdit(record: EntityRecord) {
    setEditingId(record.id);
    setDraft({ ...record });
  }

  function saveDraft() {
    if (!draft?.name?.trim()) {
      setMessage("名称不能为空");
      return;
    }
    const updatedAt = new Date().toLocaleString("zh-CN", { hour12: false });
    if (editingId) {
      setRecords((current) =>
        current.map((record) =>
          record.id === editingId
            ? ({ ...record, ...draft, name: draft.name.trim(), updatedAt } as EntityRecord)
            : record,
        ),
      );
      setMessage("已保存修改");
    } else {
      const next: EntityRecord = {
        id: scope.replace(/[^a-z0-9]+/gi, "-") + "-" + Date.now(),
        name: draft.name.trim(),
        owner: draft.owner || "平台团队",
        status: draft.status || "草稿",
        updatedAt,
        ...draft,
      };
      setRecords((current) => [next, ...current]);
      setMessage("已创建记录");
    }
    setDraft(null);
    setEditingId(null);
  }

  function removeRecord(record: EntityRecord) {
    if (!window.confirm("确认删除“" + record.name + "”？该操作只影响本地演示数据。")) return;
    setRecords((current) => current.filter((item) => item.id !== record.id));
    setMessage("已删除 " + record.name);
  }

  function runAction(record: EntityRecord) {
    if (!action) return;
    setRecords((current) =>
      current.map((item) =>
        item.id === record.id
          ? { ...item, status: action.runningStatus, updatedAt: "刚刚" }
          : item,
      ),
    );
    setMessage(record.name + "：" + action.label + "执行中");
    window.setTimeout(() => {
      setRecords((current) =>
        current.map((item) =>
          item.id === record.id
            ? { ...item, status: action.successStatus, updatedAt: "刚刚" }
            : item,
        ),
      );
      setMessage(record.name + "：" + action.successMessage);
    }, 650);
  }

  return (
    <div className="h-full overflow-y-auto bg-background p-5">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[17px] font-semibold text-foreground">{title}</h1>
            <p className="mt-1 max-w-4xl text-[12px] leading-5 text-muted-foreground">{description}</p>
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            {createLabel}
          </button>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((metric, index) => (
            <div key={metric.label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">{metric.label}</span>
                <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
                  {index === 0 ? (
                    <Database className="h-3.5 w-3.5" />
                  ) : index === 1 ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Activity className="h-3.5 w-3.5" />
                  )}
                </span>
              </div>
              <div className="mt-2 text-[22px] font-semibold tabular-nums text-foreground">
                {metric.value}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{metric.hint}</div>
            </div>
          ))}
        </section>

        {(message || meta.error) && (
          <div
            className={cn(
              "flex items-center justify-between rounded-md border px-3 py-2 text-[12px]",
              meta.error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-blue-200 bg-blue-50 text-blue-700",
            )}
          >
            <span>
              {meta.error
                ? "SQLite 状态服务不可用，请使用 npm run dev 启动完整开发服务。"
                : message}
            </span>
            {!meta.error && (
              <button type="button" onClick={() => setMessage("")} aria-label="关闭提示">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <label className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索名称、负责人或属性"
                  className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-[12px] outline-none focus:border-primary"
                />
              </label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-[12px] outline-none focus:border-primary"
              >
                {statuses.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {meta.hydrated ? "SQLite 已同步" : "正在加载 SQLite 状态…"} · {filtered.length} 条
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="bg-muted/60 text-[11px] font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">名称</th>
                  {columns.map((column) => (
                    <th key={column.key} className={cn("px-3 py-2.5", column.className)}>
                      {column.label}
                    </th>
                  ))}
                  <th className="px-3 py-2.5">负责人</th>
                  <th className="px-3 py-2.5">状态</th>
                  <th className="px-3 py-2.5">更新时间</th>
                  <th className="px-4 py-2.5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[12px]">
                {!meta.hydrated && records.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 5} className="px-4 py-14 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
                      正在加载
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 5} className="px-4 py-14 text-center text-muted-foreground">
                      {emptyLabel}
                    </td>
                  </tr>
                ) : (
                  filtered.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/35">
                      <td className="px-4 py-3 font-medium text-foreground">{record.name}</td>
                      {columns.map((column) => (
                        <td key={column.key} className={cn("px-3 py-3 text-muted-foreground", column.className)}>
                          {column.render ? column.render(record) : record[column.key] || "—"}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-muted-foreground">{record.owner}</td>
                      <td className="px-3 py-3">
                        <StatusBadge value={record.status} />
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{record.updatedAt}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {action && (
                            <button
                              type="button"
                              onClick={() => runAction(record)}
                              disabled={record.status === action.runningStatus}
                              className="h-7 rounded-md border border-blue-200 bg-blue-50 px-2 text-[11px] font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              {action.label}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startEdit(record)}
                            aria-label={"编辑" + record.name}
                            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRecord(record)}
                            aria-label={"删除" + record.name}
                            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4 backdrop-blur-[1px]">
          <section className="w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-xl" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">
                  {editingId ? "编辑记录" : createLabel}
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  当前为本地 SQLite 持久化 mock，不会调用真实生产系统。
                </p>
              </div>
              <button type="button" onClick={() => setDraft(null)} aria-label="关闭">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.key} className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-foreground">{field.label}</span>
                  {field.options ? (
                    <select
                      value={draft[field.key] || ""}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      className="h-9 rounded-md border border-input bg-background px-2.5 text-[12px] outline-none focus:border-primary"
                    >
                      {field.options.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={draft[field.key] || ""}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      placeholder={field.placeholder}
                      className="h-9 rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary"
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="h-8 rounded-md border border-input px-3 text-[12px] font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={saveDraft}
                className="h-8 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground"
              >
                保存
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const tone =
    /成功|正常|可用|生效|发布|通过|完成|已同步|已识别/.test(value)
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : /失败|异常|阻塞|过载/.test(value)
        ? "border-red-200 bg-red-50 text-red-700"
        : /运行|执行|检测|审批|同步中|识别中/.test(value)
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-amber-200 bg-amber-50 text-amber-700";
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", tone)}>
      {value}
    </span>
  );
}
