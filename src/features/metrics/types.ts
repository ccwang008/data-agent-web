export type DomainKey =
  | "strategy"
  | "governance"
  | "architecture"
  | "assets"
  | "standards"
  | "quality"
  | "security"
  | "lifecycle"
  | "application";

export type HistoryGrain = "day" | "week" | "month";
export type ViewMode = "current" | HistoryGrain;
export type MetricStatus = "met" | "warning" | "unmet" | "no-data" | "not-applicable";
export type FreshnessStatus = "fresh" | "expiring" | "expired";
export type EvaluationDirection = "higher" | "lower" | "range" | "trend";
export type SourceMode = "automatic" | "manual";

export interface DomainDefinition {
  key: DomainKey;
  slug: string;
  label: string;
  enLabel: string;
  standardLabel?: string;
  description: string;
}

export interface CapabilityDefinition {
  id: string;
  domain: DomainKey;
  name: string;
  diagnosticMetrics: string[];
}

export interface MetricTarget {
  label: string;
  value?: number;
  min?: number;
  max?: number;
  warningValue?: number;
  warningMin?: number;
  warningMax?: number;
}

export interface TrendPoint {
  label: string;
  period: string;
  value: number;
}

export interface MetricDefinition {
  id: string;
  domain: DomainKey;
  capabilityIds: string[];
  name: string;
  definition: string;
  formula: string;
  direction: EvaluationDirection;
  core: true;
  sourceMode: SourceMode;
  unit: string;
  decimals: number;
  currentValue: number | null;
  target: MetricTarget;
  status: MetricStatus;
  freshness: FreshnessStatus;
  sourceTime: string;
  calculatedAt: string;
  owner: string;
  period: string;
  evidenceRefs: string[];
  diagnostics: string[];
  history: Record<HistoryGrain, TrendPoint[]>;
}

export interface TargetVersion {
  id: string;
  metricId: string;
  target: MetricTarget;
  effectiveFrom: string;
  changedAt: string;
  changedBy: string;
  reason: string;
}

export interface MetricObservation {
  id: string;
  metricId: string;
  period: string;
  value: number | null;
  status: MetricStatus;
  freshness: FreshnessStatus;
  sourceTime: string;
  calculatedAt: string;
  targetVersionId: string;
  evidenceRefs: string[];
  submittedBy: string;
  note?: string;
}

export interface ImprovementItem {
  id: string;
  metricId: string;
  domain: DomainKey;
  period: string;
  reason: string;
  measure: string;
  owner: string;
  dueAt: string;
  status: "open" | "closed";
  createdAt: string;
  result?: string;
  effectEvidence?: string;
  closedBy?: string;
  closedAt?: string;
}

export interface MetricsSnapshot {
  id: string;
  grain: HistoryGrain;
  period: string;
  version: number;
  createdAt: string;
  metCount: number;
  warningCount: number;
  unmetCount: number;
  dataIssueCount: number;
  frozen: true;
}

export interface QuantitativeReport {
  id: string;
  period: string;
  version: number;
  generatedAt: string;
  status: "达标" | "部分达标" | "未达标";
  summary: string;
  frozen: true;
}

export interface OperationLogEntry {
  id: string;
  action: string;
  actor: string;
  at: string;
  detail: string;
}

export interface MetricsState {
  metrics: MetricDefinition[];
  targetVersions: TargetVersion[];
  observations: MetricObservation[];
  improvements: ImprovementItem[];
  snapshots: MetricsSnapshot[];
  reports: QuantitativeReport[];
  operationLog: OperationLogEntry[];
  lastCalculatedAt: string;
  dailySchedule: string;
}

export interface MetricView {
  value: number | null;
  status: MetricStatus;
  period: string;
}

