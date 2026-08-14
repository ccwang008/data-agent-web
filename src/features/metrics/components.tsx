import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Clock3,
  DatabaseZap,
  FileDown,
  FileText,
  History,
  PencilLine,
  RefreshCw,
  Settings2,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";

import {
  ActionButton,
  InlineNotice,
  PageTitle,
  Panel,
  Pill,
  ProgressBar,
  WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { cn } from "@/lib/utils";

import { CAPABILITIES, DOMAINS, getDomain } from "./catalog";
import {
  formatMetricValue,
  freshnessLabel,
  getMetricRiskReason,
  getMetricView,
  statusLabel,
} from "./logic";
import { useMetrics } from "./store";
import type {
  DomainKey,
  ImprovementItem,
  MetricDefinition,
  MetricStatus,
  MetricTarget,
  ViewMode,
} from "./types";

const STATUS_META: Record<MetricStatus, { tone: "green" | "amber" | "red" | "slate"; icon: typeof CheckCircle2; className: string }> = {
  met: { tone: "green", icon: CheckCircle2, className: "text-emerald-600" },
  warning: { tone: "amber", icon: AlertTriangle, className: "text-amber-600" },
  unmet: { tone: "red", icon: CircleAlert, className: "text-red-600" },
  "no-data": { tone: "slate", icon: DatabaseZap, className: "text-slate-500" },
  "not-applicable": { tone: "slate", icon: CircleAlert, className: "text-slate-500" },
};

export function MetricsLayout() {
  const { meta, notice, clearNotice, recalculateDaily } = useMetrics();
  const [reportsOpen, setReportsOpen] = useState(false);

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="DCMM Quantitative Management"
        title="量化看板"
        description="按日监控九大能力域 25 项核心 KPI，以 33 个能力项映射、证据和改进事项解释结果；只用于组织内部量化管理，不输出认证结论。"
        actions={(
          <>
            <ActionButton icon={History} onClick={() => setReportsOpen(true)}>快照与报告</ActionButton>
            <ActionButton icon={RefreshCw} primary onClick={recalculateDaily}>重新计算</ActionButton>
          </>
        )}
      />

      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
          <span>{notice}</span>
          <button type="button" onClick={clearNotice} aria-label="关闭提示"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <DomainTabs />

      <Outlet />
      {reportsOpen && <SnapshotReportDialog onClose={() => setReportsOpen(false)} />}
    </WorkspacePage>
  );
}

function DomainTabs() {
  return (
    <nav className="overflow-x-auto rounded-lg border border-border bg-card px-2 shadow-sm" aria-label="综合与九大能力域 Tab">
      <div className="flex min-w-max items-center">
        <NavLink
          to="/metrics"
          end
          className={({ isActive }) => cn(
            "inline-flex h-11 items-center border-b-2 px-3 text-[11px] font-medium transition-colors",
            isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          综合看板
        </NavLink>
        {DOMAINS.map((domain) => (
          <NavLink
            key={domain.key}
            to={`/metrics/${domain.slug}`}
            className={({ isActive }) => cn(
              "inline-flex h-11 items-center border-b-2 px-3 text-[11px] font-medium transition-colors",
              isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {domain.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function DashboardTimeFilter({
  modes,
  label = "统计周期",
  hint,
}: {
  modes: ViewMode[];
  label?: string;
  hint: string;
}) {
  const { state, viewMode, selectedPeriod, setViewMode, setSelectedPeriod } = useMetrics();
  const effectiveMode = modes.includes(viewMode) ? viewMode : modes[0];
  const periods = effectiveMode === "current"
    ? []
    : Array.from(new Set(state.snapshots.filter((item) => item.grain === effectiveMode).map((item) => item.period)));

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card px-3 py-2.5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium text-foreground">{label}</span>
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={cn(
              "h-7 rounded-md border px-2.5 text-[10px] font-medium transition",
              effectiveMode === mode ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {{ current: "当前态", day: "按天", week: "按周", month: "按月" }[mode]}
          </button>
        ))}
        {effectiveMode !== "current" && (
          <select value={selectedPeriod || periods[0] || ""} onChange={(event) => setSelectedPeriod(event.target.value)} className="h-7 rounded-md border border-input bg-card px-2 text-[10px] text-foreground outline-none">
            {periods.map((period) => <option key={period} value={period}>{period}</option>)}
          </select>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[9px] text-muted-foreground">
        <span>{hint}</span>
        <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-primary" />最近计算 {state.lastCalculatedAt}</span>
      </div>
    </div>
  );
}

export function DomainHeading({ domain, children }: { domain: DomainKey; children?: ReactNode }) {
  const definition = getDomain(domain);
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-[17px] font-semibold text-foreground">{definition.label}</h2>
          {definition.standardLabel && <Pill tone="slate">{definition.standardLabel}</Pill>}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{definition.description}</p>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function DomainMetricsWorkspace({ domain }: { domain: DomainKey }) {
  const { state } = useMetrics();
  const metrics = state.metrics.filter((metric) => metric.domain === domain);
  return (
    <div className="space-y-4">
      <MetricCards metrics={metrics} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
        <MetricTrendPanel metrics={metrics} />
        <ImprovementPanel domain={domain} />
      </div>
      <MetricLedger metrics={metrics} />
      <CapabilityCoverage domain={domain} />
    </div>
  );
}

function MetricCards({ metrics }: { metrics: MetricDefinition[] }) {
  const { viewMode, selectedPeriod } = useMetrics();
  return (
    <section className={cn("grid gap-3", metrics.length === 2 ? "md:grid-cols-2" : metrics.length === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3")}>
      {metrics.map((metric) => {
        const view = getMetricView(metric, viewMode, selectedPeriod);
        const meta = STATUS_META[view.status];
        const Icon = meta.icon;
        return (
          <article key={metric.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">{metric.name}</div>
                <div className="mt-2 text-[24px] font-semibold tabular-nums text-foreground">{formatMetricValue(metric, view.value)}</div>
              </div>
              <span className={cn("grid h-8 w-8 place-items-center rounded-md bg-muted/60", meta.className)}><Icon className="h-4 w-4" /></span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Pill tone={meta.tone}>{statusLabel(view.status)}</Pill>
              <Pill tone={metric.freshness === "fresh" ? "blue" : metric.freshness === "expiring" ? "amber" : "red"}>{freshnessLabel(metric.freshness)}</Pill>
              <span className="text-[10px] text-muted-foreground">目标 {metric.target.label}</span>
            </div>
            <div className="mt-3"><ProgressBar value={metric.unit === "%" ? Number(view.value ?? 0) : view.status === "met" ? 100 : view.status === "warning" ? 68 : 36} tone={view.status === "met" ? "green" : view.status === "warning" ? "amber" : "red"} /></div>
            <div className="mt-2 text-[9px] text-muted-foreground">数据时间 {metric.sourceTime} · {metric.owner}</div>
          </article>
        );
      })}
    </section>
  );
}

function MetricTrendPanel({ metrics }: { metrics: MetricDefinition[] }) {
  const { viewMode } = useMetrics();
  const [metricId, setMetricId] = useState(metrics[0]?.id ?? "");
  const metric = metrics.find((item) => item.id === metricId) ?? metrics[0];
  const grain = viewMode === "current" ? "day" : viewMode;
  if (!metric) return null;
  return (
    <Panel
      title={`${metric.name}趋势`}
      description={grain === "day" ? "最近 30 天" : grain === "week" ? "最近 12 周" : "最近 12 月"}
      actions={(
        <select value={metric.id} onChange={(event) => setMetricId(event.target.value)} className="h-7 rounded-md border border-input bg-card px-2 text-[10px] outline-none">
          {metrics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      )}
    >
      <div className="p-4"><LineTrend metric={metric} grain={grain} /></div>
    </Panel>
  );
}

function LineTrend({ metric, grain }: { metric: MetricDefinition; grain: "day" | "week" | "month" }) {
  const points = metric.history[grain];
  const width = 760;
  const height = 220;
  const padding = { top: 18, right: 20, bottom: 32, left: 50 };
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const coords = points.map((point, index) => ({
    x: padding.left + (index / Math.max(1, points.length - 1)) * plotWidth,
    y: padding.top + plotHeight - ((point.value - min) / spread) * plotHeight,
  }));
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));

  return (
    <div className="overflow-x-auto">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${metric.name}${grain === "day" ? "日" : grain === "week" ? "周" : "月"}趋势`}>
        {[0, 0.5, 1].map((ratio) => {
          const y = padding.top + plotHeight * ratio;
          const value = max - spread * ratio;
          return <g key={ratio}><line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="hsl(var(--border))" strokeDasharray="4 4" /><text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="9" fill="hsl(var(--muted-foreground))">{new Intl.NumberFormat("zh-CN", { notation: value > 9999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value)}</text></g>;
        })}
        <polyline points={line} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((point, index) => <circle key={points[index].period} cx={point.x} cy={point.y} r={index === coords.length - 1 ? 4 : 2.2} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />)}
        {points.map((point, index) => index % labelEvery === 0 || index === points.length - 1 ? <text key={point.period} x={coords[index].x} y={height - 9} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{point.label}</text> : null)}
      </svg>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground"><span>目标 {metric.target.label}</span><span>数据时间 {metric.sourceTime}</span></div>
    </div>
  );
}

function MetricLedger({ metrics }: { metrics: MetricDefinition[] }) {
  const { state, viewMode, selectedPeriod } = useMetrics();
  const [observationMetric, setObservationMetric] = useState<MetricDefinition | null>(null);
  const [targetMetric, setTargetMetric] = useState<MetricDefinition | null>(null);
  const [improvementMetric, setImprovementMetric] = useState<MetricDefinition | null>(null);
  return (
    <>
      <Panel title="核心 KPI 台账" description="25 项核心 KPI 不可删除；口径、目标和观测按版本留痕。">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-[10px]">
            <thead className="bg-muted/30 text-muted-foreground"><tr>{["指标与口径", "实际值", "目标", "状态", "来源与新鲜度", "责任人", "证据", "操作"].map((label) => <th key={label} className="border-b border-border px-3 py-2.5 font-medium">{label}</th>)}</tr></thead>
            <tbody>
              {metrics.map((metric) => {
                const view = getMetricView(metric, viewMode, selectedPeriod);
                const status = STATUS_META[view.status];
                const hasOpen = state.improvements.some((item) => item.metricId === metric.id && item.status === "open");
                const needsAction = view.status === "warning" || view.status === "unmet" || metric.freshness === "expired";
                return (
                  <tr key={metric.id} className="align-top hover:bg-muted/15">
                    <td className="border-b border-border px-3 py-3"><div className="text-[11px] font-medium text-foreground">{metric.name}</div><div className="mt-1 max-w-[330px] leading-4 text-muted-foreground">{metric.definition}</div><div className="mt-1 font-mono text-[9px] text-slate-400">{metric.formula}</div></td>
                    <td className="border-b border-border px-3 py-3 text-[12px] font-semibold tabular-nums text-foreground">{formatMetricValue(metric, view.value)}<div className="mt-1 text-[9px] font-normal text-muted-foreground">{view.period}</div></td>
                    <td className="border-b border-border px-3 py-3 text-muted-foreground">{metric.target.label}</td>
                    <td className="border-b border-border px-3 py-3"><Pill tone={status.tone}>{statusLabel(view.status)}</Pill></td>
                    <td className="border-b border-border px-3 py-3"><div>{metric.sourceMode === "manual" ? "人工填报" : "自动计算"}</div><div className="mt-1 text-muted-foreground">{metric.sourceTime}</div><Pill className="mt-1" tone={metric.freshness === "fresh" ? "blue" : metric.freshness === "expiring" ? "amber" : "red"}>{freshnessLabel(metric.freshness)}</Pill></td>
                    <td className="border-b border-border px-3 py-3 text-muted-foreground">{metric.owner}</td>
                    <td className="border-b border-border px-3 py-3"><div className="max-w-[160px] space-y-1">{metric.evidenceRefs.slice(0, 2).map((ref) => <div key={ref} className="truncate font-mono text-[9px] text-primary">{ref}</div>)}</div></td>
                    <td className="border-b border-border px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {metric.sourceMode === "manual" && viewMode === "current" && <TinyButton onClick={() => setObservationMetric(metric)} icon={PencilLine}>填报</TinyButton>}
                        {viewMode === "current" && <TinyButton onClick={() => setTargetMetric(metric)} icon={Settings2}>目标</TinyButton>}
                        {needsAction && viewMode === "current" && <TinyButton disabled={hasOpen} onClick={() => setImprovementMetric(metric)} icon={TrendingUp}>{hasOpen ? "整改中" : "建单"}</TinyButton>}
                      </div>
                      {needsAction && <div className="mt-2 max-w-[180px] leading-4 text-red-600">{getMetricRiskReason(metric, viewMode, selectedPeriod)}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      {observationMetric && <ObservationDialog metric={observationMetric} onClose={() => setObservationMetric(null)} />}
      {targetMetric && <TargetDialog metric={targetMetric} onClose={() => setTargetMetric(null)} />}
      {improvementMetric && <ImprovementDialog metric={improvementMetric} onClose={() => setImprovementMetric(null)} />}
    </>
  );
}

function TinyButton({ children, onClick, icon: Icon, disabled }: { children: ReactNode; onClick: () => void; icon: typeof PencilLine; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex h-6 items-center gap-1 rounded border border-input px-1.5 text-[9px] text-foreground hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"><Icon className="h-3 w-3" />{children}</button>;
}

function CapabilityCoverage({ domain }: { domain: DomainKey }) {
  const { state } = useMetrics();
  const capabilities = CAPABILITIES.filter((item) => item.domain === domain);
  return (
    <Panel title="DCMM 能力项量化覆盖" description="只显示量化监控覆盖缺口，不计算成熟度分数或认证结论。">
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        {capabilities.map((capability) => {
          const metrics = state.metrics.filter((metric) => metric.capabilityIds.includes(capability.id));
          const evidenceCount = metrics.reduce((sum, metric) => sum + metric.evidenceRefs.length, 0);
          return (
            <article key={capability.id} className="rounded-md border border-border p-3">
              <div className="flex items-start justify-between gap-2"><div><div className="text-[9px] font-semibold text-primary">{capability.id}</div><div className="mt-0.5 text-[11px] font-medium text-foreground">{capability.name}</div></div><Pill tone={metrics.length ? "green" : "slate"}>{metrics.length ? "已覆盖" : "待建设"}</Pill></div>
              <div className="mt-3 space-y-1.5">{metrics.map((metric) => <div key={metric.id} className="rounded bg-blue-50 px-2 py-1 text-[9px] text-blue-700">核心 · {metric.name}</div>)}</div>
              <div className="mt-2 flex flex-wrap gap-1">{capability.diagnosticMetrics.map((item) => <span key={item} className="rounded bg-muted px-1.5 py-0.5 text-[8px] text-muted-foreground">诊断 · {item}</span>)}</div>
              <div className="mt-3 text-[9px] text-muted-foreground">{evidenceCount} 条证据引用 · {metrics.length ? "有当前观测" : "无观测"}</div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function ImprovementPanel({ domain }: { domain: DomainKey }) {
  const { state } = useMetrics();
  const [closing, setClosing] = useState<ImprovementItem | null>(null);
  const items = state.improvements.filter((item) => item.domain === domain).slice(0, 4);
  return (
    <>
      <Panel title="改进事项" description="自动预警、手动建单；负责人可直接关闭。" className="h-full">
        <div className="divide-y divide-border">
          {items.length === 0 && <div className="p-6 text-center text-[11px] text-muted-foreground">本能力域暂无改进事项</div>}
          {items.map((item) => {
            const metric = state.metrics.find((entry) => entry.id === item.metricId);
            const overdue = item.status === "open" && item.dueAt < "2026-08-13";
            return (
              <div key={item.id} className="p-3">
                <div className="flex items-start justify-between gap-2"><div className="text-[10px] font-medium text-foreground">{metric?.name ?? item.metricId}</div><Pill tone={item.status === "closed" ? "green" : overdue ? "red" : "amber"}>{item.status === "closed" ? "已关闭" : overdue ? "已逾期" : "进行中"}</Pill></div>
                <div className="mt-1 text-[9px] leading-4 text-muted-foreground">{item.measure}</div>
                <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground"><span>{item.owner} · 截止 {item.dueAt}</span>{item.status === "open" && <button type="button" onClick={() => setClosing(item)} className="font-medium text-primary hover:underline">直接关闭</button>}</div>
              </div>
            );
          })}
        </div>
      </Panel>
      {closing && <CloseImprovementDialog item={closing} onClose={() => setClosing(null)} />}
    </>
  );
}

function Modal({ title, description, children, onClose, footer }: { title: string; description?: string; children: ReactNode; onClose: () => void; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4"><div><h3 className="text-[15px] font-semibold text-foreground">{title}</h3>{description && <p className="mt-1 text-[10px] text-muted-foreground">{description}</p>}</div><button type="button" onClick={onClose} aria-label="关闭"><X className="h-4 w-4 text-muted-foreground" /></button></div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-medium text-foreground">{label}</span>{children}{hint && <span className="mt-1 block text-[9px] text-muted-foreground">{hint}</span>}</label>;
}

const inputClass = "h-9 w-full rounded-md border border-input bg-card px-3 text-[11px] text-foreground outline-none focus:border-primary";
const textareaClass = "min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-[11px] text-foreground outline-none focus:border-primary";

function ObservationDialog({ metric, onClose }: { metric: MetricDefinition; onClose: () => void }) {
  const { saveObservation } = useMetrics();
  const [value, setValue] = useState(String(metric.currentValue ?? ""));
  const [sourceTime, setSourceTime] = useState("2026-08-13");
  const [evidence, setEvidence] = useState(metric.evidenceRefs.join(", "));
  const [note, setNote] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); saveObservation(metric.id, Number(value), `${sourceTime} 18:00:00`, evidence, note); onClose(); }
  return <Modal title={`填报 · ${metric.name}`} description="保存后直接生效，无复核流程；修正会形成新的观测版本。" onClose={onClose}><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label={`实际值（${metric.unit}）`}><input required type="number" step="any" value={value} onChange={(event) => setValue(event.target.value)} className={inputClass} /></Field><Field label="数据时间"><input required type="date" value={sourceTime} onChange={(event) => setSourceTime(event.target.value)} className={inputClass} /></Field></div><Field label="证据引用" hint="多个证据编号使用逗号分隔，不保存真实敏感材料。"><textarea required value={evidence} onChange={(event) => setEvidence(event.target.value)} className={textareaClass} /></Field><Field label="填报说明"><textarea value={note} onChange={(event) => setNote(event.target.value)} className={textareaClass} /></Field><div className="flex justify-end gap-2"><ActionButton onClick={onClose}>取消</ActionButton><button type="submit" className="h-8 rounded-md bg-primary px-3 text-[11px] font-medium text-primary-foreground">保存并生效</button></div></form></Modal>;
}

function TargetDialog({ metric, onClose }: { metric: MetricDefinition; onClose: () => void }) {
  const { saveTarget } = useMetrics();
  const [label, setLabel] = useState(metric.target.label);
  const [value, setValue] = useState(metric.target.value?.toString() ?? "");
  const [min, setMin] = useState(metric.target.min?.toString() ?? "");
  const [max, setMax] = useState(metric.target.max?.toString() ?? "");
  const [warning, setWarning] = useState(metric.target.warningValue?.toString() ?? "");
  const [warningMin, setWarningMin] = useState(metric.target.warningMin?.toString() ?? "");
  const [warningMax, setWarningMax] = useState(metric.target.warningMax?.toString() ?? "");
  const [reason, setReason] = useState("根据本期组织管理要求调整");
  const range = metric.direction === "range" || metric.direction === "trend";
  function submit(event: FormEvent) {
    event.preventDefault();
    const target: MetricTarget = range
      ? { label, min: Number(min), max: Number(max), warningMin: Number(warningMin), warningMax: Number(warningMax) }
      : { label, value: Number(value), warningValue: Number(warning) };
    saveTarget(metric.id, target, reason); onClose();
  }
  return <Modal title={`目标设置 · ${metric.name}`} description="这是组织管理目标，不是国标规定阈值；新版本不会改写历史状态。" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="目标展示"><input required value={label} onChange={(event) => setLabel(event.target.value)} className={inputClass} /></Field>{range ? <div className="grid grid-cols-2 gap-3"><Field label="目标下限"><input required type="number" step="any" value={min} onChange={(event) => setMin(event.target.value)} className={inputClass} /></Field><Field label="目标上限"><input required type="number" step="any" value={max} onChange={(event) => setMax(event.target.value)} className={inputClass} /></Field><Field label="预警下限"><input required type="number" step="any" value={warningMin} onChange={(event) => setWarningMin(event.target.value)} className={inputClass} /></Field><Field label="预警上限"><input required type="number" step="any" value={warningMax} onChange={(event) => setWarningMax(event.target.value)} className={inputClass} /></Field></div> : <div className="grid grid-cols-2 gap-3"><Field label="目标值"><input required type="number" step="any" value={value} onChange={(event) => setValue(event.target.value)} className={inputClass} /></Field><Field label="预警值"><input required type="number" step="any" value={warning} onChange={(event) => setWarning(event.target.value)} className={inputClass} /></Field></div>}<Field label="调整原因"><textarea required value={reason} onChange={(event) => setReason(event.target.value)} className={textareaClass} /></Field><div className="flex justify-end gap-2"><ActionButton onClick={onClose}>取消</ActionButton><button type="submit" className="h-8 rounded-md bg-primary px-3 text-[11px] font-medium text-primary-foreground">生成新版本</button></div></form></Modal>;
}

function ImprovementDialog({ metric, onClose }: { metric: MetricDefinition; onClose: () => void }) {
  const { createImprovement } = useMetrics();
  const [reason, setReason] = useState(getMetricRiskReason(metric, "current", ""));
  const [measure, setMeasure] = useState("");
  const [owner, setOwner] = useState(metric.owner);
  const [dueAt, setDueAt] = useState("2026-08-31");
  function submit(event: FormEvent) { event.preventDefault(); createImprovement({ metricId: metric.id, domain: metric.domain, period: "2026-08", reason, measure, owner, dueAt }); onClose(); }
  return <Modal title={`创建改进事项 · ${metric.name}`} description="同一 KPI 和周期最多存在一个未关闭事项；创建后直接生效。" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="原因"><textarea required value={reason} onChange={(event) => setReason(event.target.value)} className={textareaClass} /></Field><Field label="改进措施"><textarea required value={measure} onChange={(event) => setMeasure(event.target.value)} className={textareaClass} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="负责人"><input required value={owner} onChange={(event) => setOwner(event.target.value)} className={inputClass} /></Field><Field label="完成期限"><input required type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className={inputClass} /></Field></div><div className="flex justify-end gap-2"><ActionButton onClick={onClose}>取消</ActionButton><button type="submit" className="h-8 rounded-md bg-primary px-3 text-[11px] font-medium text-primary-foreground">创建事项</button></div></form></Modal>;
}

function CloseImprovementDialog({ item, onClose }: { item: ImprovementItem; onClose: () => void }) {
  const { closeImprovement } = useMetrics();
  const [result, setResult] = useState("");
  const [evidence, setEvidence] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); closeImprovement(item.id, result, evidence); onClose(); }
  return <Modal title="直接关闭改进事项" description="无复核流程；必须填写处理结果和效果证据并保留关闭记录。" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="处理结果"><textarea required value={result} onChange={(event) => setResult(event.target.value)} className={textareaClass} /></Field><Field label="效果证据"><input required value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="例如 IMPROVEMENT-EFFECT-202608" className={inputClass} /></Field><div className="flex justify-end gap-2"><ActionButton onClick={onClose}>取消</ActionButton><button type="submit" className="h-8 rounded-md bg-primary px-3 text-[11px] font-medium text-primary-foreground">确认关闭</button></div></form></Modal>;
}

function SnapshotReportDialog({ onClose }: { onClose: () => void }) {
  const { state } = useMetrics();
  const [exported, setExported] = useState<string | null>(null);
  return (
    <Modal title="快照与量化管理报告" description="日、周、月快照和季度报告均版本冻结；当前原型只提供模拟导出。" onClose={onClose}>
      <div className="space-y-5">
        {exported && <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] text-blue-800">已模拟导出 {exported}；该文件不构成正式认证材料。</div>}
        <div><div className="mb-2 text-[11px] font-semibold text-foreground">最近快照</div><div className="overflow-x-auto rounded-md border border-border"><table className="w-full min-w-[600px] text-left text-[10px]"><thead className="bg-muted/30 text-muted-foreground"><tr>{["粒度", "周期", "版本", "达标", "预警", "未达标", "数据异常"].map((label) => <th key={label} className="px-3 py-2 font-medium">{label}</th>)}</tr></thead><tbody>{state.snapshots.slice(0, 10).map((snapshot) => <tr key={snapshot.id} className="border-t border-border"><td className="px-3 py-2">{{ day: "日", week: "周", month: "月" }[snapshot.grain]}</td><td className="px-3 py-2 font-mono">{snapshot.period}</td><td className="px-3 py-2">v{snapshot.version}</td><td className="px-3 py-2 text-emerald-700">{snapshot.metCount}</td><td className="px-3 py-2 text-amber-700">{snapshot.warningCount}</td><td className="px-3 py-2 text-red-700">{snapshot.unmetCount}</td><td className="px-3 py-2 text-slate-600">{snapshot.dataIssueCount}</td></tr>)}</tbody></table></div></div>
        <div><div className="mb-2 text-[11px] font-semibold text-foreground">季度量化管理报告</div><div className="space-y-2">{state.reports.map((report) => <div key={report.id} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-primary" /><span className="text-[10px] font-medium text-foreground">{report.period} 量化管理报告 v{report.version}</span><Pill tone={report.status === "达标" ? "green" : report.status === "未达标" ? "red" : "amber"}>{report.status}</Pill></div><div className="mt-1 text-[9px] text-muted-foreground">{report.summary}</div></div><TinyButton icon={FileDown} onClick={() => setExported(`${report.period} v${report.version}`)}>模拟导出</TinyButton></div>)}</div></div>
      </div>
    </Modal>
  );
}

export function SectionTitle({ icon: Icon, title, description }: { icon: typeof Target; title: string; description: string }) {
  return <div className="flex items-start gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-blue-50 text-primary"><Icon className="h-3.5 w-3.5" /></span><div><div className="text-[12px] font-semibold text-foreground">{title}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{description}</div></div></div>;
}

export function CompactBar({ label, value, target, tone = "blue", hint }: { label: string; value: number; target?: number; tone?: "blue" | "green" | "amber" | "red" | "violet"; hint?: string }) {
  return <div><div className="mb-1 flex items-center justify-between gap-3 text-[10px]"><span className="font-medium text-foreground">{label}</span><span className="tabular-nums text-muted-foreground">{value}%{target !== undefined ? ` / 目标 ${target}%` : ""}</span></div><ProgressBar value={value} tone={tone} />{hint && <div className="mt-1 text-[9px] text-muted-foreground">{hint}</div>}</div>;
}
