import { DEFAULT_METRICS } from "./catalog";
import type { MetricsSnapshot, MetricsState, QuantitativeReport } from "./types";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const snapshots: MetricsSnapshot[] = [
  ["day", "2026-08-13", 13, 9, 2, 1],
  ["day", "2026-08-12", 14, 8, 2, 1],
  ["day", "2026-08-11", 15, 8, 1, 1],
  ["day", "2026-08-10", 14, 9, 1, 1],
  ["day", "2026-08-09", 13, 9, 2, 1],
  ["week", "2026-W32", 14, 8, 2, 1],
  ["week", "2026-W31", 15, 7, 2, 1],
  ["week", "2026-W30", 13, 9, 2, 1],
  ["week", "2026-W29", 14, 8, 2, 1],
  ["month", "2026-07", 15, 7, 2, 1],
  ["month", "2026-06", 14, 8, 2, 1],
  ["month", "2026-05", 13, 9, 2, 1],
  ["month", "2026-04", 12, 10, 2, 1],
].map(([grain, period, metCount, warningCount, unmetCount, dataIssueCount]) => ({
  id: `snapshot-${grain}-${period}-v1`,
  grain: grain as MetricsSnapshot["grain"],
  period: String(period),
  version: 1,
  createdAt: "2026-08-13 08:05:00",
  metCount: Number(metCount),
  warningCount: Number(warningCount),
  unmetCount: Number(unmetCount),
  dataIssueCount: Number(dataIssueCount),
  frozen: true,
}));

const reports: QuantitativeReport[] = [
  { id: "metrics-report-2026-q2-v2", period: "2026-Q2", version: 2, generatedAt: "2026-07-05 09:00:00", status: "部分达标", summary: "九域核心 KPI 达标率较一季度提升 5.8 个百分点，数据生命周期与数据质量仍是重点改进域。", frozen: true },
  { id: "metrics-report-2026-q1-v1", period: "2026-Q1", version: 1, generatedAt: "2026-04-05 09:00:00", status: "部分达标", summary: "建立九域首批量化口径，完成 25 项核心 KPI 责任分配和证据登记。", frozen: true },
  { id: "metrics-report-2025-q4-v1", period: "2025-Q4", version: 1, generatedAt: "2026-01-05 09:00:00", status: "未达标", summary: "量化体系处于基线建设期，主要缺口为资产价值、审计完整性和归档验证证据。", frozen: true },
];

export function createDefaultMetricsState(): MetricsState {
  const metrics = clone(DEFAULT_METRICS);
  return {
    metrics,
    targetVersions: metrics.map((metric) => ({
      id: `target-${metric.id}-v1`,
      metricId: metric.id,
      target: clone(metric.target),
      effectiveFrom: "2026-08-01",
      changedAt: "2026-08-01 09:00:00",
      changedBy: "指标管理员",
      reason: "首期组织量化管理默认目标",
    })),
    observations: metrics.map((metric) => ({
      id: `observation-${metric.id}-20260813-v1`,
      metricId: metric.id,
      period: metric.period,
      value: metric.currentValue,
      status: metric.status,
      freshness: metric.freshness,
      sourceTime: metric.sourceTime,
      calculatedAt: metric.calculatedAt,
      targetVersionId: `target-${metric.id}-v1`,
      evidenceRefs: clone(metric.evidenceRefs),
      submittedBy: metric.sourceMode === "manual" ? metric.owner : "日更计算任务",
    })),
    improvements: [
      { id: "improvement-lifecycle-archive-202608", metricId: "lifecycle-archive", domain: "lifecycle", period: "2026-08", reason: "湖仓冷数据恢复验证排队，历史逾期批次结转。", measure: "扩充恢复验证窗口并优先处理高存储成本批次。", owner: "数据运维组", dueAt: "2026-08-10", status: "open", createdAt: "2026-08-01 10:20:00" },
      { id: "improvement-security-audit-202608", metricId: "security-audit", domain: "security", period: "2026-08", reason: "两个边缘服务审计序列存在短时缺口。", measure: "补齐采集代理并增加连续性校验。", owner: "安全审计组", dueAt: "2026-08-20", status: "open", createdAt: "2026-08-05 14:10:00" },
      { id: "improvement-standards-indicator-202608", metricId: "standards-indicator", domain: "standards", period: "2026-08", reason: "营销与财务系统存在 3 组指标周期定义冲突。", measure: "统一周期定义并更新指标血缘。", owner: "指标管理组", dueAt: "2026-08-25", status: "open", createdAt: "2026-08-06 09:40:00" },
      { id: "improvement-quality-closure-202607", metricId: "quality-closure", domain: "quality", period: "2026-07", reason: "跨系统根因定位耗时较长。", measure: "引入统一问题关联标识并缩短转派路径。", owner: "质量改进组", dueAt: "2026-08-08", status: "closed", createdAt: "2026-07-20 11:00:00", result: "结转问题全部完成修复验证，平均转派耗时下降 31%。", effectEvidence: "QUALITY-IMPROVEMENT-202607", closedBy: "质量改进组", closedAt: "2026-08-07 17:00:00" },
    ],
    snapshots: clone(snapshots),
    reports: clone(reports),
    operationLog: [
      { id: "metrics-log-001", action: "日更计算", actor: "日更计算任务", at: "2026-08-13 08:00:00", detail: "完成 25 项核心 KPI 计算，1 项来源数据过期。" },
      { id: "metrics-log-002", action: "目标版本生效", actor: "指标管理员", at: "2026-08-01 09:00:00", detail: "首期 25 项组织目标生效；目标不是国标固定阈值。" },
    ],
    lastCalculatedAt: "2026-08-13 08:00:00",
    dailySchedule: "每日 08:00",
  };
}

