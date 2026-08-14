/**
 * Data Asset · mock 数据类型、标签映射与工具函数。
 * 约定：页面通过 `store.ts` 的 `useDataAssetState()` 读写 `data-agent.data-asset` scope。
 */

export const MOCK_NOW = "2026-08-13 09:00:00";
export const MOCK_TODAY = "2026-08-13";

// ---------------------------------------------------------------- 目录

export type AssetType =
  | "table" | "dataset" | "metric" | "tag" | "service"
  | "json" | "xml" | "log" | "message" | "document"
  | "image" | "video" | "audio" | "knowledge" | "model" | "standard";

export type StandardKind = "业务术语" | "指标标准" | "数据元标准" | "参考数据标准" | "主数据标准";
export type StandardGovernanceStatus = "草稿" | "审批中" | "已发布" | "已废止";

export type CatalogStatus = "normal" | "sourceAbnormal" | "retiring" | "retired" | "archived";

export interface BusinessDomain {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
}

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  table: "数据表", dataset: "数据集", metric: "指标", tag: "标签", service: "数据服务",
  json: "JSON", xml: "XML", log: "日志", message: "消息数据", document: "文档",
  image: "图片", video: "视频", audio: "音频", knowledge: "知识资料", model: "模型", standard: "数据标准",
};

export const CATALOG_STATUS_LABEL: Record<CatalogStatus, string> = {
  normal: "正常", sourceAbnormal: "来源异常", retiring: "待退役", retired: "已退役", archived: "已归档",
};

export interface AssetField {
  name: string;
  type: string;
  primaryKey?: boolean;
  sensitive: boolean;
  securityLevel?: string;
  comment?: string;
}

export interface AssetExt {
  database?: string;
  schema?: string;
  table?: string;
  fields?: AssetField[];
  rowCount?: number;
  protocol?: string;
  method?: string;
  path?: string;
  apiVersion?: string;
  requestParams?: string[];
  responseStructure?: string;
  reportFormat?: string;
  relatedDatasets?: string[];
  updateCycle?: string;
  generateSystem?: string;
  reportVersion?: string;
  modelType?: string;
  inputOutput?: string;
  trainingData?: string;
  framework?: string;
  modelVersion?: string;
  effectMetrics?: string;
  standardCode?: string;
  standardKind?: StandardKind;
  standardDefinition?: string;
  applicableScope?: string;
  approvingBody?: string;
  effectiveFrom?: string;
  standardVersion?: string;
  standardStatus?: StandardGovernanceStatus;
}

export interface Asset {
  id: string; // 永久资产 ID，跨版本不变
  name: string;
  type: AssetType;
  subtype?: "API" | "报告";
  sourceSystem: string;
  dataSourceId?: string; // 引用数据集成模块登记的数据源 ID
  sourceObjectId?: string;
  businessDomain: string;
  description: string;
  tags: string[];
  owner: string;
  securityLevel: string; // 引用数据安全模块当前生效分类（mock）
  catalogStatus: CatalogStatus;
  version: number;
  updatedAt: string;
  ext: AssetExt;
  voided?: { at: string; by: string; reason: string };
}

export interface AssetVersion {
  id: string;
  assetId: string;
  version: number;
  changedAt: string;
  changedBy: string;
  reason: string;
  diff: string[];
}

export type ScanTaskStatus = "pending" | "running" | "success" | "partial" | "failed" | "cancelled";

export const SCAN_TASK_STATUS_LABEL: Record<ScanTaskStatus, string> = {
  pending: "待运行", running: "运行中", success: "成功", partial: "部分成功", failed: "失败", cancelled: "已取消",
};

export interface ScanLogLine {
  time: string;
  level: "INFO" | "WARN" | "ERROR";
  text: string;
}

export interface ScanFailedObject {
  id: string;
  name: string;
  reason: string;
  retried: boolean;
}

export interface ScanTask {
  id: string;
  name: string;
  sourceSystem: string;
  mode: "full" | "incremental";
  range: string;
  status: ScanTaskStatus;
  triggeredBy: string;
  startedAt?: string;
  finishedAt?: string;
  found: number;
  added: number;
  changed: number;
  abnormal: number;
  errorSummary?: string;
  logs: ScanLogLine[];
  failedObjects: ScanFailedObject[];
}

export interface ChangeRecord {
  id: string;
  assetId: string;
  at: string;
  actor: string;
  kind: string; // 负责人变更 / 目录信息变更 / 作废 / 退役 ...
  before: string;
  after: string;
  reason: string;
}

// ---------------------------------------------------------------- 权属

export type RightType = "持有权" | "使用权" | "经营权";
export type RightStatus = "pending" | "confirmed" | "invalid";

export const RIGHT_STATUS_LABEL: Record<RightStatus, string> = {
  pending: "待确认", confirmed: "已确权", invalid: "已失效",
};

export interface OwnershipRight {
  id: string;
  assetId: string;
  assetName: string;
  holder: string;
  holderKind: "内部部门" | "外部机构";
  rightType: RightType;
  dataScope: string;
  purpose: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: RightStatus;
  basis: string;
  version: number;
  registeredBy: string;
  confirmedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OwnershipVersion {
  id: string;
  rightId: string;
  assetId: string;
  assetName: string;
  version: number;
  changedAt: string;
  changedBy: string;
  reason: string;
  before: Partial<OwnershipRight>;
  after: Partial<OwnershipRight>;
  status: "待确认" | "已生效" | "已驳回";
  approvedBy?: string;
}

export type OwnershipApprovalStatus = "待确认" | "已通过" | "已驳回" | "已退回";

export const OWNERSHIP_APPROVAL_STATUS_LABEL: Record<OwnershipApprovalStatus, string> = {
  待确认: "待确认",
  已通过: "已通过",
  已驳回: "已驳回",
  已退回: "已退回",
};

export interface OwnershipApproval {
  id: string;
  rightId: string;
  assetId: string;
  assetName: string;
  applicant: string;
  applicantKind: "登记" | "变更" | "撤销";
  rightType: RightType;
  holder: string;
  status: OwnershipApprovalStatus;
  submittedAt: string;
  processedBy?: string;
  processedAt?: string;
  opinion?: string;
}

// ---------------------------------------------------------------- 价值评估

export type ValuationMethod = "cost" | "income" | "market";

export const VALUATION_METHOD_LABEL: Record<ValuationMethod, string> = {
  cost: "成本法", income: "收益法", market: "市场法",
};

export type EvaluationStatus = "草稿" | "计算中" | "待复核" | "已生效" | "已驳回" | "已过期" | "已被替代";

export interface ValuationSource {
  type: string; // 财务成本台账 / 业务收益预测 / 市场可比案例 / 人工补充材料
  name: string;
  period: string;
  provider: string;
  collectedAt: string;
  evidenceNo: string;
  quality: string;
  compliance: string;
  rawValue: number;
  adjustedValue?: number;
  adjustReason?: string;
}

export interface MethodParameter {
  key: string;
  label: string;
  value: string;
  unit: string;
  source: ValuationSource;
}

export interface MethodResult {
  method: ValuationMethod;
  formula: string;
  parameters: MethodParameter[];
  intermediate: string[];
  result: number; // 万元
}

export interface EvaluationSnapshot {
  assetVersion: number;
  ownershipVersion: number;
  securityVersion: string;
  catalogStatus: string;
}

export interface Evaluation {
  id: string;
  assetId: string;
  assetName: string;
  basisDate: string;
  effectiveMonths: number;
  validUntil: string;
  appraiser: string;
  status: EvaluationStatus;
  methods: MethodResult[];
  weights: { method: ValuationMethod; weight: number; basis: string }[];
  finalValue?: number;
  weightBasis: string;
  adjustNote: string;
  snapshot: EvaluationSnapshot;
  createdAt: string;
  updatedAt: string;
  triggerReason?: string;
  reviewComment?: string;
}

export interface EvaluationReview {
  id: string;
  evaluationId: string;
  reviewer: string;
  action: "批准" | "驳回" | "退回修改";
  opinion: string;
  at: string;
}

// ---------------------------------------------------------------- 资产运营

export type ProductDelivery = "API" | "下载";
export type ProductStatus = "草稿" | "待审批" | "已发布" | "已驳回" | "已暂停" | "已下线";

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  草稿: "草稿", 待审批: "待审批", 已发布: "已发布", 已驳回: "已驳回", 已暂停: "已暂停", 已下线: "已下线",
};

export interface ProductAssetRef {
  assetId: string;
  assetVersion: number;
  usageScope: string;
  rightId: string;
  purpose: string;
}

export interface PublishGateCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface PublishGate {
  checkedAt: string;
  passed: boolean;
  checks: PublishGateCheck[];
}

export interface DataProduct {
  id: string;
  name: string;
  delivery: ProductDelivery;
  serviceVersion: number;
  description: string;
  targetUsers: string;
  assets: ProductAssetRef[];
  status: ProductStatus;
  statusReason?: string;
  gate?: PublishGate;
  apiConfig?: { path?: string; method?: string; quotaPerDay?: number; fields?: string[]; region?: string };
  downloadConfig?: { fileFormat?: string; updateCycle?: string; maxDownloads?: number; validHours?: number; masking?: string; dataRange?: string };
  operator: string;
  owner: string;
  securityAlert?: { reason: string; dueAt: string; state: "待复核" | "已复核" };
  createdAt: string;
  updatedAt: string;
}

export type ProductApprovalStepName = "资产负责人确认" | "安全审批";

export interface ProductApprovalStep {
  name: ProductApprovalStepName;
  role: string;
  status: "pending" | "approved" | "rejected" | "returned";
  by?: string;
  at?: string;
  opinion?: string;
}

export interface ProductApproval {
  id: string;
  productId: string;
  productName: string;
  submittedBy: string;
  submittedAt: string;
  status: "待负责人确认" | "待安全审批" | "已通过" | "已驳回" | "已退回修改";
  steps: ProductApprovalStep[];
}

export type AuthorizationStatus = "待审批" | "已授权" | "已拒绝" | "已过期" | "已撤销";

export const AUTHORIZATION_STATUS_LABEL: Record<AuthorizationStatus, string> = {
  待审批: "待审批", 已授权: "已授权", 已拒绝: "已拒绝", 已过期: "已过期", 已撤销: "已撤销",
};

export interface Authorization {
  id: string;
  productId: string;
  productName: string;
  applicant: string;
  applicantKind: "内部" | "外部";
  purpose: string;
  purposeNote: string;
  useSystem: string;
  fields: string[];
  region?: string;
  quotaPerDay?: number;
  effectiveFrom: string;
  effectiveTo: string;
  status: AuthorizationStatus;
  requiresSecurity: boolean;
  securityStatus: "无需" | "待安全审批" | "已通过" | "已拒绝";
  approvedBy?: string;
  rejectedReason?: string;
  revokedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const PURPOSE_OPTIONS = [
  "贷款风险审核", "营销推荐", "活动运营分析", "经营分析", "监管报送", "外部合作结算", "模型训练与评估",
];

export type DownloadTaskStatus = "有效" | "已失效" | "已用完";

export interface DownloadTask {
  id: string;
  authorizationId: string;
  productId: string;
  productName: string;
  requester: string;
  fileFormat: string;
  maxDownloads: number;
  usedDownloads: number;
  validUntil: string;
  status: DownloadTaskStatus;
  masking: string;
  dataRange: string;
  serviceVersion: number;
  assetVersions: string[];
}

export interface RetentionPolicy {
  policyYears: number;
  frozen: { scope: string; reason: string } | null;
  lastCleanup?: { at: string; by: string; rule: string; count: number; summary: string };
}

// ---------------------------------------------------------------- 资产流通

export type CirculationDelivery = "API" | "文件下载" | "在线查询" | "标准引用";
export type CirculationStage = "application" | "approval" | "integration" | "use";
export type CirculationStatus =
  | "draft" | "pendingOwner" | "pendingSecurity" | "pendingIntegration"
  | "integrating" | "inUse" | "returned" | "rejected" | "integrationFailed" | "suspended";

export const CIRCULATION_STATUS_LABEL: Record<CirculationStatus, string> = {
  draft: "草稿",
  pendingOwner: "待负责人审批",
  pendingSecurity: "待安全审批",
  pendingIntegration: "待对接",
  integrating: "对接中",
  inUse: "使用中",
  returned: "已退回",
  rejected: "已驳回",
  integrationFailed: "对接失败",
  suspended: "已暂停",
};

export interface CirculationAssetSnapshot {
  assetId: string;
  assetName: string;
  assetType: AssetType;
  assetVersion: number;
  securityLevel: string;
  standardCode?: string;
  standardVersion?: string;
}

export interface CirculationApprovalStep {
  id: string;
  role: "资产负责人" | "安全审批人";
  assignee: string;
  status: "pending" | "approved" | "returned" | "rejected" | "skipped";
  opinion?: string;
  processedBy?: string;
  processedAt?: string;
}

export interface AssetCirculationApplication {
  id: string;
  title: string;
  asset: CirculationAssetSnapshot;
  applicant: string;
  applicantOrg: string;
  applicantKind: "内部" | "外部";
  consumerSystem: string;
  purpose: string;
  purposeNote: string;
  requestedScope: string;
  delivery: CirculationDelivery;
  effectiveFrom: string;
  effectiveTo: string;
  status: CirculationStatus;
  stage: CirculationStage;
  requiresSecurity: boolean;
  submittedAt: string;
  updatedAt: string;
  approvals: CirculationApprovalStep[];
  integrationTaskId?: string;
  grantNo?: string;
  lastDecisionReason?: string;
}

export interface IntegrationChecklistItem {
  id: string;
  label: string;
  status: "pending" | "passed" | "failed";
  note?: string;
}

export interface AssetIntegrationTask {
  id: string;
  applicationId: string;
  assetId: string;
  delivery: CirculationDelivery;
  owner: string;
  dueAt: string;
  status: "pending" | "configuring" | "testing" | "completed" | "failed";
  configSummary: string;
  checklist: IntegrationChecklistItem[];
  lastResult?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface AssetUsageRecord {
  id: string;
  applicationId: string;
  assetId: string;
  assetName: string;
  assetVersion: number;
  consumerSystem: string;
  purpose: string;
  delivery: CirculationDelivery;
  at: string;
  result: "成功" | "失败" | "拒绝";
  action: string;
  volume: string;
  evidenceNo: string;
}

// ---------------------------------------------------------------- 使用审计

export type AccessChannel = "API" | "下载" | "在线查询" | "预览";
export type AccessResult = "成功" | "失败" | "拒绝" | "超时";

export interface AuditEvent {
  id: string;
  at: string;
  principal: string;
  principalKind: "人员" | "部门" | "内部系统" | "外部机构";
  appId: string;
  appNameMasked: string;
  channel: AccessChannel;
  ipRegion: string;
  accountMasked: string;
  traceId: string;
  productId?: string;
  productName?: string;
  serviceVersion?: number;
  assetId?: string;
  assetVersion?: number;
  authorizationId?: string;
  result: AccessResult;
  statusCode?: string;
  errorMasked?: string;
  rejectedReason?: string;
  recordCount?: number;
  fileSizeKB?: number;
  durationMs?: number;
  authorizedPurpose?: string;
  declaredPurpose?: string;
}

export type AnomalyStatus = "待研判" | "已确认异常" | "已排除" | "整改中" | "待复核" | "已关闭";

export const ANOMALY_STATUS_LABEL: Record<AnomalyStatus, string> = {
  待研判: "待研判", 已确认异常: "已确认异常", 已排除: "已排除", 整改中: "整改中", 待复核: "待复核", 已关闭: "已关闭",
};

export interface Anomaly {
  id: string;
  rule: string;
  ruleLabel: string;
  severity: "高" | "中" | "低";
  eventIds: string[];
  principal: string;
  productName?: string;
  channel?: AccessChannel;
  status: AnomalyStatus;
  createdAt: string;
  owner?: string;
  judgeBasis?: string;
  judgedBy?: string;
  judgedAt?: string;
  rectificationId?: string;
}

export type RectificationStatus = "整改中" | "待复核" | "已关闭";

export interface Rectification {
  id: string;
  anomalyId: string;
  owner: string;
  measure: string;
  dueAt: string;
  status: RectificationStatus;
  createdAt: string;
  reviewBasis?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// ---------------------------------------------------------------- 量化报告

export type IndicatorTrend = "up" | "down" | "flat";
export type ImprovementStatus = "未开始" | "进行中" | "已完成";

export interface IndicatorResult {
  id: string;
  name: string;
  definition: string;
  calcFormula: string;
  direction: "≥" | "=";
  target: number;
  actual: number;
  period: string;
  trend: IndicatorTrend;
  dataTime: string;
  abnormalReason?: string;
  improvement?: string;
  improvementDueAt?: string;
  improvementStatus?: ImprovementStatus;
  traceableTo: string[];
}

export type ReportKind = "目录质量" | "权属管理" | "价值评估" | "资产运营" | "使用审计" | "综合管理";

export interface ManagementReport {
  id: string;
  kind: ReportKind;
  period: string;
  version: number;
  frozen: boolean;
  generatedAt: string;
  generatedBy: string;
  reviseReason?: string;
  indicators: IndicatorResult[];
  summary: string;
  gapReasons: { indicator: string; reason: string }[];
  responsible: string;
  measures: string[];
  dueAt: string;
  status: "达标" | "部分达标" | "未达标";
  reviewResult?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// ---------------------------------------------------------------- 全局状态

export interface DataAssetState {
  schemaVersion: number;
  catalog: {
    domains: BusinessDomain[];
    assets: Asset[];
    assetVersions: AssetVersion[];
    scanTasks: ScanTask[];
    changes: ChangeRecord[];
  };
  ownership: {
    rights: OwnershipRight[];
    ownershipVersions: OwnershipVersion[];
    approvals: OwnershipApproval[];
  };
  valuation: {
    evaluations: Evaluation[];
    reviews: EvaluationReview[];
  };
  service: {
    products: DataProduct[];
    productApprovals: ProductApproval[];
    authorizations: Authorization[];
    downloadTasks: DownloadTask[];
    retention: RetentionPolicy;
  };
  circulation: {
    applications: AssetCirculationApplication[];
    integrationTasks: AssetIntegrationTask[];
    usageRecords: AssetUsageRecord[];
  };
  audit: {
    events: AuditEvent[];
    anomalies: Anomaly[];
    rectifications: Rectification[];
  };
  reports: {
    indicators: IndicatorResult[];
    reports: ManagementReport[];
  };
}

// ---------------------------------------------------------------- 工具函数

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function daysUntil(dateStr: string, from = MOCK_TODAY): number {
  const target = new Date(`${dateStr}T00:00:00`);
  const base = new Date(`${from}T00:00:00`);
  return Math.round((target.getTime() - base.getTime()) / 86400000);
}

export function isExpired(dateStr: string, now = MOCK_NOW): boolean {
  return `${dateStr} 23:59:59` < now;
}

export function expiryReminderDays(dateStr: string): number[] {
  const days = daysUntil(dateStr);
  const reminders: number[] = [];
  if (days <= 1) reminders.push(1);
  if (days <= 7) reminders.push(7);
  if (days <= 30) reminders.push(30);
  return reminders;
}

export function effectiveOwnershipRights(state: DataAssetState, assetId: string): OwnershipRight[] {
  return state.ownership.rights.filter(
    (right) => right.assetId === assetId && right.status === "confirmed" && !isExpired(right.effectiveTo),
  );
}

export function validValuation(state: DataAssetState, assetId: string): Evaluation | undefined {
  return state.valuation.evaluations.find(
    (evaluation) => evaluation.assetId === assetId && evaluation.status === "已生效" && !isExpired(evaluation.validUntil),
  );
}
