import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Archive,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Copy,
  FileCode2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  DevelopmentArtifactSummary,
  LifecycleStatus,
  RunStatus,
  ValidationStatus,
} from "../types";

export const inputClass = "h-8 w-full rounded-md border border-input bg-card px-2.5 text-[12px] text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/15";
export const textareaClass = "w-full resize-none rounded-md border border-input bg-card px-2.5 py-2 text-[12px] text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/15";

const lifecycleLabels: Record<LifecycleStatus, string> = {
  draft: "草稿",
  ready: "待发布",
  published: "已发布",
  disabled: "已停用",
  archived: "已归档",
};

const validationLabels: Record<ValidationStatus, string> = {
  unchecked: "未校验",
  validating: "校验中",
  valid: "校验通过",
  invalid: "校验失败",
};

const runLabels: Record<RunStatus, string> = {
  queued: "排队中",
  running: "运行中",
  success: "成功",
  failed: "失败",
  stopped: "已停止",
};

export function StatusBadge({ status, kind = "lifecycle" }: { status: string; kind?: "lifecycle" | "validation" | "run" }) {
  const label = status === "idle" ? "未运行" : kind === "lifecycle"
    ? lifecycleLabels[status as LifecycleStatus] ?? status
    : kind === "validation"
      ? validationLabels[status as ValidationStatus] ?? status
      : runLabels[status as RunStatus] ?? status;
  const className = /invalid|failed/.test(status)
      ? "border-red-200 bg-red-50 text-red-700"
    : /published|^valid$|success/.test(status)
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : /running|validating|queued/.test(status)
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : /ready/.test(status)
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", className)}>{label}</span>;
}

export function EditorButton({
  children,
  onClick,
  variant = "secondary",
  disabled,
  title,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  const variantClass = {
    primary: "border-primary bg-primary text-primary-foreground hover:opacity-90",
    secondary: "border-input bg-card text-foreground hover:border-primary/40 hover:text-primary",
    success: "border-emerald-500 bg-emerald-500 text-white hover:opacity-90",
    danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-slate-100 hover:text-foreground",
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn("inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-3 text-[12px] font-medium shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50", variantClass, className)}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-slate-700">
        {label}
        {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function LoadingWorkspace({ label }: { label: string }) {
  return (
    <div className="page-shell">
      <div className="grid min-h-[calc(100vh-2rem)] place-items-center rounded-lg border border-border bg-card text-[13px] text-muted-foreground">
        <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 animate-pulse text-primary" />{label}</div>
      </div>
    </div>
  );
}

export function MissingArtifact({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="page-shell">
      <div className="grid min-h-[420px] place-items-center rounded-lg border border-border bg-card">
        <div className="text-center">
          <CircleAlert className="mx-auto h-8 w-8 text-amber-500" />
          <h2 className="mt-3 text-[16px] font-semibold text-foreground">{label}不存在或已删除</h2>
          <EditorButton onClick={onBack} variant="primary" className="mt-4">返回列表</EditorButton>
        </div>
      </div>
    </div>
  );
}

interface ArtifactColumn<TArtifact> {
  label: string;
  className?: string;
  render: (artifact: TArtifact) => ReactNode;
}

export function ArtifactListPage<TArtifact extends DevelopmentArtifactSummary>({
  title,
  description,
  icon: Icon = FileCode2,
  createLabel,
  emptyLabel,
  artifacts,
  hydrated,
  error,
  columns,
  onCreate,
  onOpen,
  onDuplicate,
  onDelete,
  headerAction,
}: {
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
  createLabel: string;
  emptyLabel: string;
  artifacts: TArtifact[];
  hydrated: boolean;
  error: Error | null;
  columns: ArtifactColumn<TArtifact>[];
  onCreate: () => void;
  onOpen: (artifact: TArtifact) => void;
  onDuplicate: (artifact: TArtifact) => void;
  onDelete: (artifact: TArtifact) => void;
  headerAction?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    if (!keyword) return artifacts;
    return artifacts.filter((artifact) => [artifact.name, artifact.owner].some((value) => value.toLocaleLowerCase().includes(keyword)));
  }, [artifacts, query]);
  const published = artifacts.filter((artifact) => artifact.lifecycleStatus === "published").length;
  const successful = artifacts.filter((artifact) => artifact.lastRun?.status === "success").length;
  const invalid = artifacts.filter((artifact) => artifact.validationStatus === "invalid").length;

  if (!hydrated) return <LoadingWorkspace label={`加载${title}...`} />;

  return (
    <div className="page-shell animate-fade-in space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-primary"><Icon className="h-4 w-4" /></span><div><h1 className="text-[20px] font-semibold tracking-tight text-foreground">{title}</h1><p className="mt-0.5 max-w-3xl text-[12px] leading-5 text-muted-foreground">{description}</p></div></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">{headerAction}<EditorButton onClick={onCreate} variant="primary"><Plus className="h-3.5 w-3.5" />{createLabel}</EditorButton></div>
      </header>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">SQLite 状态同步失败：{error.message}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "开发对象", value: artifacts.length, hint: "当前持久化对象", icon: FileCode2, color: "text-primary bg-blue-50" },
          { label: "已发布", value: published, hint: "不可变发布版本", icon: Archive, color: "text-violet-600 bg-violet-50" },
          { label: "最近成功", value: successful, hint: "最近 mock 运行", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
          { label: "待修复", value: invalid, hint: "校验未通过", icon: CircleAlert, color: "text-red-600 bg-red-50" },
        ].map((metric) => {
          const MetricIcon = metric.icon;
          return <div key={metric.label} className="rounded-lg border border-border bg-card p-4 shadow-sm"><div className="flex items-start justify-between"><div><div className="text-[11px] font-medium text-muted-foreground">{metric.label}</div><div className="mt-1 text-[24px] font-semibold tabular-nums text-foreground">{metric.value}</div></div><span className={cn("grid h-8 w-8 place-items-center rounded-lg", metric.color)}><MetricIcon className="h-4 w-4" /></span></div><div className="mt-2 text-[11px] text-muted-foreground">{metric.hint}</div></div>;
        })}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="text-[13px] font-semibold text-foreground">开发对象</div>
          <label className="relative w-full sm:w-[280px]"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={cn(inputClass, "pl-8")} placeholder="搜索名称或负责人" /></label>
        </div>
        {visible.length === 0 ? (
          <div className="grid min-h-[260px] place-items-center text-center"><div><FileCode2 className="mx-auto h-8 w-8 text-slate-300" /><div className="mt-3 text-[13px] font-medium text-foreground">{emptyLabel}</div><div className="mt-1 text-[12px] text-muted-foreground">创建第一个开发对象，开始配置和 mock 试运行。</div></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-[12px]">
              <thead className="bg-slate-50 text-[11px] font-medium text-muted-foreground"><tr><th className="px-4 py-2.5">名称</th>{columns.map((column) => <th key={column.label} className={cn("px-3 py-2.5", column.className)}>{column.label}</th>)}<th className="px-3 py-2.5">状态</th><th className="px-3 py-2.5">校验</th><th className="px-3 py-2.5">负责人</th><th className="px-3 py-2.5">更新时间</th><th className="px-4 py-2.5 text-right">操作</th></tr></thead>
              <tbody className="divide-y divide-border">
                {visible.map((artifact) => (
                  <tr key={artifact.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3"><button type="button" onClick={() => onOpen(artifact)} className="max-w-[240px] truncate text-left font-medium text-foreground hover:text-primary">{artifact.name}</button><div className="mt-1 text-[10px] text-muted-foreground">v{artifact.currentVersion}{artifact.publishedVersion ? ` · 已发布 v${artifact.publishedVersion}` : ""}</div></td>
                    {columns.map((column) => <td key={column.label} className={cn("px-3 py-3 text-slate-600", column.className)}>{column.render(artifact)}</td>)}
                    <td className="px-3 py-3"><StatusBadge status={artifact.lifecycleStatus} /></td>
                    <td className="px-3 py-3"><StatusBadge status={artifact.validationStatus} kind="validation" /></td>
                    <td className="px-3 py-3 text-slate-600">{artifact.owner}</td>
                    <td className="px-3 py-3 text-muted-foreground">{artifact.updatedAt}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => onOpen(artifact)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-blue-50 hover:text-primary" title="编辑"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => onDuplicate(artifact)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-foreground" title="复制"><Copy className="h-3.5 w-3.5" /></button><button type="button" onClick={() => onDelete(artifact)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600" title="删除"><Trash2 className="h-3.5 w-3.5" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function PanelTabs<TValue extends string>({ value, onChange, items }: { value: TValue; onChange: (value: TValue) => void; items: { value: TValue; label: string; count?: number }[] }) {
  return <div className="flex items-center gap-1 border-b border-border bg-slate-50 px-3">{items.map((item) => <button key={item.value} type="button" onClick={() => onChange(item.value)} className={cn("border-b-2 px-3 py-2 text-[11px] font-medium transition-colors", value === item.value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{item.label}{item.count !== undefined && <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px]">{item.count}</span>}</button>)}</div>;
}
