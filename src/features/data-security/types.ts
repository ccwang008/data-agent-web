export type SecurityDomain =
  | "overview"
  | "compliance"
  | "classification"
  | "protection"
  | "audit"
  | "incidents";

export type SecurityPageKey =
  | "overview"
  | "compliance"
  | "compliance-reviews"
  | "personal-information"
  | "important-data"
  | "cross-border"
  | "classification"
  | "classification-reviews"
  | "classification-rules"
  | "classification-reports"
  | "protection"
  | "access-control"
  | "masking"
  | "encryption"
  | "watermark"
  | "risk"
  | "audit"
  | "audit-executions"
  | "audit-evidence"
  | "audit-reports"
  | "audit-findings"
  | "incidents"
  | "incident-sop"
  | "incident-notifications"
  | "incident-drills";

export type SecurityPageVariant =
  | "general"
  | "classification"
  | "cross-border"
  | "masking"
  | "encryption"
  | "watermark"
  | "audit-report"
  | "incident";

export type SecurityFieldValue = string | number | boolean | string[] | null;

export interface SecurityRecord {
  id: string;
  name: string;
  summary: string;
  status: string;
  owner: string;
  updatedAt: string;
  version: number;
  risk: "低" | "中" | "高" | "严重";
  evidenceState: "有效" | "缺失" | "采集失败" | "待核验" | "已固化";
  evidenceRefs: string[];
  fields: Record<string, SecurityFieldValue>;
  legacySourceId?: string;
  mock: true;
}

export interface SecurityActivity {
  id: string;
  pageKey: SecurityPageKey;
  action: string;
  actor: string;
  result: string;
  occurredAt: string;
}

export interface SecurityDomainState {
  schemaVersion: 2;
  domain: SecurityDomain;
  updatedAt: string;
  collections: Partial<Record<SecurityPageKey, SecurityRecord[]>>;
  activity: SecurityActivity[];
}

export interface SecurityColumn {
  key: string;
  label: string;
}

export interface SecurityPageConfig {
  key: SecurityPageKey;
  domain: SecurityDomain;
  eyebrow: string;
  title: string;
  description: string;
  createLabel: string;
  runLabel: string;
  runningStatus: string;
  completedStatus: string;
  columns: SecurityColumn[];
  variant: SecurityPageVariant;
  seedRecords: SecurityRecord[];
}
