import type { DomainKey, FreshnessStatus, MetricDefinition, MetricStatus, MetricTarget, MetricView, MetricsState, ViewMode } from "./types";

export function evaluateValue(metric: Pick<MetricDefinition, "direction" | "target">, value: number | null): MetricStatus {
  if (value === null || Number.isNaN(value)) return "no-data";
  const target = metric.target;

  if (metric.direction === "higher") {
    if (target.value !== undefined && value >= target.value) return "met";
    if (target.warningValue !== undefined && value >= target.warningValue) return "warning";
    return "unmet";
  }

  if (metric.direction === "lower") {
    if (target.value !== undefined && value <= target.value) return "met";
    if (target.warningValue !== undefined && value <= target.warningValue) return "warning";
    return "unmet";
  }

  const min = target.min ?? Number.NEGATIVE_INFINITY;
  const max = target.max ?? Number.POSITIVE_INFINITY;
  if (value >= min && value <= max) return "met";
  const warningMin = target.warningMin ?? min;
  const warningMax = target.warningMax ?? max;
  return value >= warningMin && value <= warningMax ? "warning" : "unmet";
}

export function getMetricView(metric: MetricDefinition, mode: ViewMode, selectedPeriod: string): MetricView {
  if (mode === "current") return { value: metric.currentValue, status: metric.status, period: metric.period };
  const points = metric.history[mode];
  const point = points.find((item) => item.period === selectedPeriod) ?? points.at(-1);
  const value = point?.value ?? metric.currentValue;
  return { value, status: evaluateValue(metric, value), period: point?.period ?? metric.period };
}

export function formatMetricValue(metric: MetricDefinition, value = metric.currentValue) {
  if (value === null) return "—";
  const formatted = new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: metric.decimals,
    maximumFractionDigits: metric.decimals,
  }).format(value);
  return metric.unit.startsWith("%") || metric.unit === "%" ? `${formatted}%` : `${formatted} ${metric.unit}`;
}

export function statusLabel(status: MetricStatus) {
  return {
    met: "达标",
    warning: "预警",
    unmet: "未达标",
    "no-data": "无数据",
    "not-applicable": "不适用",
  }[status];
}

export function freshnessLabel(status: FreshnessStatus) {
  return { fresh: "最新", expiring: "临近过期", expired: "已过期" }[status];
}

export function getGlobalSummary(state: MetricsState, mode: ViewMode, selectedPeriod: string) {
  const views = state.metrics.map((metric) => ({ metric, view: getMetricView(metric, mode, selectedPeriod) }));
  const evaluable = views.filter(({ metric, view }) => view.status !== "no-data" && view.status !== "not-applicable" && metric.freshness !== "expired");
  const metCount = evaluable.filter(({ view }) => view.status === "met").length;
  return {
    rate: evaluable.length ? Math.round((metCount / evaluable.length) * 1000) / 10 : 0,
    metCount,
    evaluableCount: evaluable.length,
    warningCount: views.filter(({ view }) => view.status === "warning").length,
    unmetCount: views.filter(({ view }) => view.status === "unmet").length,
    dataIssueCount: views.filter(({ metric, view }) => view.status === "no-data" || metric.freshness === "expired").length,
    overdueCount: state.improvements.filter((item) => item.status === "open" && item.dueAt < "2026-08-13").length,
  };
}

export type DomainHealth = "healthy" | "warning" | "risk" | "data-issue";

export function getDomainHealth(state: MetricsState, domain: DomainKey, mode: ViewMode, selectedPeriod: string): DomainHealth {
  const metrics = state.metrics.filter((metric) => metric.domain === domain);
  const views = metrics.map((metric) => ({ metric, view: getMetricView(metric, mode, selectedPeriod) }));
  const hasOverdue = state.improvements.some((item) => item.domain === domain && item.status === "open" && item.dueAt < "2026-08-13");
  if (hasOverdue || views.some(({ view }) => view.status === "unmet")) return "risk";
  if (views.some(({ metric, view }) => view.status === "no-data" || metric.freshness === "expired")) return "data-issue";
  if (views.some(({ view }) => view.status === "warning")) return "warning";
  return "healthy";
}

export function withTarget(metric: MetricDefinition, target: MetricTarget): MetricDefinition {
  return { ...metric, target, status: evaluateValue({ direction: metric.direction, target }, metric.currentValue) };
}

export function getMetricRiskReason(metric: MetricDefinition, mode: ViewMode, selectedPeriod: string) {
  const view = getMetricView(metric, mode, selectedPeriod);
  if (metric.freshness === "expired") return `数据已过期，最近来源时间 ${metric.sourceTime}`;
  if (view.status === "no-data") return "当前周期没有可评价数据或有效证据";
  if (view.status === "warning") return `当前值接近或偏离组织目标 ${metric.target.label}`;
  if (view.status === "unmet") return `当前值未达到组织目标 ${metric.target.label}`;
  return "当前运行正常";
}

