/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { useSqliteState } from "@/lib/sqlite-client";
import type { SqliteStateMeta } from "@/lib/sqlite-client";

import { createDefaultMetricsState } from "./default-state";
import { evaluateValue, getGlobalSummary, withTarget } from "./logic";
import type { ImprovementItem, MetricTarget, MetricsState, ViewMode } from "./types";

const STATE_SCOPE = "data-agent.metrics";

function formatNow() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date()).replaceAll("/", "-");
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

type MetricsContextValue = {
  state: MetricsState;
  update: (updater: (draft: MetricsState) => void) => void;
  meta: SqliteStateMeta;
  viewMode: ViewMode;
  selectedPeriod: string;
  setViewMode: (mode: ViewMode) => void;
  setSelectedPeriod: (period: string) => void;
  notice: string | null;
  clearNotice: () => void;
  saveObservation: (metricId: string, value: number, sourceTime: string, evidence: string, note: string) => void;
  saveTarget: (metricId: string, target: MetricTarget, reason: string) => void;
  createImprovement: (input: Omit<ImprovementItem, "id" | "createdAt" | "status">) => void;
  closeImprovement: (id: string, result: string, effectEvidence: string) => void;
  recalculateDaily: () => void;
};

const MetricsContext = createContext<MetricsContextValue | null>(null);

export function MetricsProvider({ children }: { children: ReactNode }) {
  const [state, setState, meta] = useSqliteState<MetricsState>(STATE_SCOPE, createDefaultMetricsState());
  const location = useLocation();
  const dashboardKey = location.pathname.split("/").filter(Boolean)[1] ?? "overview";
  const [dashboardViews, setDashboardViews] = useState<Record<string, { viewMode: ViewMode; selectedPeriod: string }>>({});
  const activeView = useMemo(
    () => dashboardViews[dashboardKey] ?? { viewMode: "current" as const, selectedPeriod: "" },
    [dashboardKey, dashboardViews],
  );
  const [notice, setNotice] = useState<string | null>(null);

  const update = useCallback((updater: (draft: MetricsState) => void) => {
    setState((current) => {
      const draft = JSON.parse(JSON.stringify(current)) as MetricsState;
      updater(draft);
      return draft;
    });
  }, [setState]);

  const setViewMode = useCallback((mode: ViewMode) => {
    const selectedPeriod = mode === "current" ? "" : state.snapshots.find((snapshot) => snapshot.grain === mode)?.period ?? "";
    setDashboardViews((current) => ({ ...current, [dashboardKey]: { viewMode: mode, selectedPeriod } }));
  }, [dashboardKey, state.snapshots]);

  const setSelectedPeriod = useCallback((period: string) => {
    setDashboardViews((current) => ({ ...current, [dashboardKey]: { ...activeView, selectedPeriod: period } }));
  }, [activeView, dashboardKey]);

  const saveObservation = useCallback((metricId: string, value: number, sourceTime: string, evidence: string, note: string) => {
    const now = formatNow();
    update((draft) => {
      const metric = draft.metrics.find((item) => item.id === metricId);
      if (!metric) return;
      metric.currentValue = value;
      metric.status = evaluateValue(metric, value);
      metric.freshness = "fresh";
      metric.sourceTime = sourceTime;
      metric.calculatedAt = now;
      metric.evidenceRefs = evidence.split(/[，,\n]/).map((item) => item.trim()).filter(Boolean);
      const dayPoint = metric.history.day.at(-1);
      if (dayPoint) dayPoint.value = value;
      const targetVersion = draft.targetVersions.filter((item) => item.metricId === metricId).at(-1);
      draft.observations.push({
        id: uid("observation"), metricId, period: "2026-08-13", value, status: metric.status, freshness: "fresh",
        sourceTime, calculatedAt: now, targetVersionId: targetVersion?.id ?? "unknown", evidenceRefs: [...metric.evidenceRefs], submittedBy: metric.owner, note,
      });
      draft.operationLog.unshift({ id: uid("metrics-log"), action: "人工填报", actor: metric.owner, at: now, detail: `${metric.name} 更新为 ${value}${metric.unit}。` });
    });
    setNotice("指标已保存并直接生效，历史观测版本已保留。无复核流程。");
  }, [update]);

  const saveTarget = useCallback((metricId: string, target: MetricTarget, reason: string) => {
    const now = formatNow();
    update((draft) => {
      const index = draft.metrics.findIndex((item) => item.id === metricId);
      if (index < 0) return;
      const metric = draft.metrics[index];
      draft.metrics[index] = withTarget(metric, target);
      const version = draft.targetVersions.filter((item) => item.metricId === metricId).length + 1;
      draft.targetVersions.push({ id: `target-${metricId}-v${version}`, metricId, target, effectiveFrom: "2026-08-13", changedAt: now, changedBy: "指标管理员", reason });
      draft.operationLog.unshift({ id: uid("metrics-log"), action: "目标调整", actor: "指标管理员", at: now, detail: `${metric.name} 目标调整为 ${target.label}。` });
    });
    setNotice("新目标版本已生效；历史观测仍引用原目标版本。");
  }, [update]);

  const createImprovement = useCallback((input: Omit<ImprovementItem, "id" | "createdAt" | "status">) => {
    const now = formatNow();
    update((draft) => {
      const duplicate = draft.improvements.some((item) => item.metricId === input.metricId && item.period === input.period && item.status === "open");
      if (duplicate) return;
      draft.improvements.unshift({ ...input, id: uid("improvement"), createdAt: now, status: "open" });
      draft.operationLog.unshift({ id: uid("metrics-log"), action: "创建改进事项", actor: input.owner, at: now, detail: `${input.metricId} · ${input.measure}` });
    });
    setNotice("改进事项已创建，无审批流程。");
  }, [update]);

  const closeImprovement = useCallback((id: string, result: string, effectEvidence: string) => {
    const now = formatNow();
    update((draft) => {
      const item = draft.improvements.find((entry) => entry.id === id);
      if (!item) return;
      item.status = "closed";
      item.result = result;
      item.effectEvidence = effectEvidence;
      item.closedBy = item.owner;
      item.closedAt = now;
      draft.operationLog.unshift({ id: uid("metrics-log"), action: "关闭改进事项", actor: item.owner, at: now, detail: `${item.metricId} · ${result}` });
    });
    setNotice("改进事项已直接关闭，处理结果和效果证据已留痕。");
  }, [update]);

  const recalculateDaily = useCallback(() => {
    const now = formatNow();
    update((draft) => {
      draft.lastCalculatedAt = now;
      draft.metrics.forEach((metric) => {
        metric.calculatedAt = now;
        if (metric.currentValue !== null) metric.status = evaluateValue(metric, metric.currentValue);
      });
      const summary = getGlobalSummary(draft, "current", "");
      const versions = draft.snapshots.filter((item) => item.grain === "day" && item.period === "2026-08-13");
      const version = versions.length + 1;
      draft.snapshots.unshift({
        id: `snapshot-day-2026-08-13-v${version}`, grain: "day", period: "2026-08-13", version, createdAt: now,
        metCount: summary.metCount, warningCount: summary.warningCount, unmetCount: summary.unmetCount, dataIssueCount: summary.dataIssueCount, frozen: true,
      });
      draft.operationLog.unshift({ id: uid("metrics-log"), action: "日更计算", actor: "日更计算任务", at: now, detail: `完成 ${draft.metrics.length} 项核心 KPI 重新计算并生成日快照 v${version}。` });
    });
    setNotice("已模拟完成每日计算并生成不可覆盖的日快照新版本。");
  }, [update]);

  const value = useMemo<MetricsContextValue>(() => ({
    state, update, meta, viewMode: activeView.viewMode, selectedPeriod: activeView.selectedPeriod, setViewMode, setSelectedPeriod, notice,
    clearNotice: () => setNotice(null), saveObservation, saveTarget, createImprovement, closeImprovement, recalculateDaily,
  }), [state, update, meta, activeView, setViewMode, setSelectedPeriod, notice, saveObservation, saveTarget, createImprovement, closeImprovement, recalculateDaily]);

  return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
}

export function useMetrics() {
  const value = useContext(MetricsContext);
  if (!value) throw new Error("useMetrics must be used inside MetricsProvider");
  return value;
}
