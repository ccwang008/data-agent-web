// 数据标准域共享与子域类型。所有业务数据为 SQLite 持久化 mock，
// 不连接真实 MDM、参考数据服务、语义执行引擎或 AI 服务。

export type StandardKind =
  | "business-term"
  | "master-data"
  | "reference-data"
  | "data-element"
  | "metric";

export type ReviewStatus =
  | "候选"
  | "草稿"
  | "待复核"
  | "待批准"
  | "已发布"
  | "已废止";

/** 企业级稳定标准身份 */
export interface StandardIdentity {
  id: string;
  kind: StandardKind;
  name: string;
  status: ReviewStatus;
  ownerId: string;
  currentVersionId: string;
  createdAt: string;
}

/** 不可覆盖的标准版本 */
export interface StandardVersion {
  id: string;
  standardId: string;
  version: string;
  content: string;
  changeReason: string;
  createdBy: string;
  approvedBy: string;
  createdAt: string;
  previousVersionId: string | null;
}

/** 项目级候选定义 */
export interface CandidateDefinition {
  id: string;
  kind: StandardKind;
  projectId: string;
  sourceId: string;
  sourceVersion: string;
  content: string;
  aiSuggestion: string;
  reviewStatus: ReviewStatus;
  ownerId: string;
  createdAt: string;
}

/** 项目版本到企业版本映射 */
export interface ProjectStandardMapping {
  id: string;
  candidateVersionId: string;
  enterpriseVersionId: string;
  migrationStatus: "待迁移" | "迁移中" | "已落标" | "未通过";
  auditResultId: string | null;
}

export type AiConfidence = "高" | "中" | "低";

/** AI 判定审计记录（不保存内部推理或敏感原文） */
export interface AiDecision {
  id: string;
  modelVersion: string;
  strategyVersion: string;
  executedAt: string;
  inputRefs: string[];
  confidence: AiConfidence;
  result: string;
  rationaleSummary: string;
  autoExecuted: boolean;
  reviewResult: "待复核" | "通过" | "驳回";
}

/** 稽核结果 */
export type AuditResultType = "通过" | "失败" | "未知" | "不适用";

/** 不可覆盖稽核批次 */
export interface AuditBatch {
  id: string;
  trigger: "标准变更" | "对象变更" | "周期全量" | "手动执行";
  scopeSnapshot: string;
  standardVersions: string;
  ruleVersions: string;
  aiModelVersions: string;
  status: "排队" | "运行中" | "成功" | "失败" | "已停止";
  passed: number;
  failed: number;
  unknown: number;
  notApplicable: number;
  createdAt: string;
}

export interface AuditResult {
  id: string;
  batchId: string;
  objectRef: string;
  standardVersionId: string;
  ruleId: string;
  result: AuditResultType;
  evidenceIds: string[];
}

export type RemediationStatus =
  | "待分派"
  | "整改中"
  | "待复检"
  | "已关闭"
  | "已批准例外";

export interface RemediationIssue {
  id: string;
  objectRef: string;
  standardVersionId: string;
  ruleId: string;
  status: RemediationStatus;
  ownerId: string;
  evidenceIds: string[];
  createdAt: string;
}

/** 标准参与证据台账 */
export interface StandardParticipationEvidence {
  id: string;
  kind: StandardKind;
  project: string;
  level: "国家" | "行业" | "组织";
  role: string;
  stage: string;
  people: string;
  occurredAt: string;
  evidenceRefs: string[];
}

// ---------- 业务术语与本体 ----------

export interface ConceptAttribute {
  id: string;
  code: string;           // 英文代码，如 power_capacity
  label: string;          // 中文标签，如 发电装机容量
  dataType: "string" | "number" | "boolean" | "datetime" | "enum";
  required: boolean;
  unique: boolean;
  description?: string;
  defaultValue?: string;
}

export interface OntologyConcept {
  id: string;
  name: string;
  definition: string;
  relations: string[];
  versionId: string;
  status: "有效" | "草稿";
  domainCode?: string;             // 所属本体域 code，如 customer / transaction
  parentConceptId?: string | null; // 父概念（上下位）
  attributes?: ConceptAttribute[]; // 概念下声明的属性
}

// ---------- 本体工作台（参考截图的 6 个 Tab） ----------

/** 本体域：顶层分类器，一个域下聚合 Schema / 实体 / 关系 / 指标 */
export interface OntologyDomain {
  code: string;                   // 英文 code，如 ai / customer / transaction
  name: string;                   // 中文名
  description?: string;
}

/** Schema（概念类）：业务概念的类型定义，带父类形成层级 */
export interface OntologySchema {
  id: string;                     // 稳定 ID
  code: string;                   // 英文类名，如 AIModel / Customer
  name: string;                   // 中文名，如 AI 模型 / 客户
  domainCode: string;
  description: string;
  parentSchemaId: string | null;
  attributes: ConceptAttribute[];
  status: "有效" | "草稿";
}

/** 实体：Schema 下登记的具体实例，带置信度与状态 */
export type EntityStatus = "已确认" | "候选" | "已废止";

export interface OntologyEntity {
  id: string;
  name: string;
  schemaCode: string;
  confidence: number;             // 0-100
  status: EntityStatus;
  domainCode: string;
  boundTermIds: string[];         // 业务术语绑定
}

/** 关系：主体-谓词-客体三元组 */
export interface OntologyRelation {
  id: string;
  subject: string;                // 主体实体名
  predicate: string;              // 谓词（英文动词）
  object: string;                 // 客体实体名
  confidence: number;             // 0-100
  domainCode: string;
}

/** 域内指标 */
export type DomainMetricType = "计数" | "平均值" | "比率" | "求和";

export interface DomainMetric {
  id: string;
  name: string;
  code: string;                   // 规范名
  type: DomainMetricType;
  domainCode: string;
  definition: string;
}

/** 业务术语工作台（本体工作台）整体状态 */
export interface OntologyWorkbenchState {
  domains: OntologyDomain[];
  schemas: OntologySchema[];
  entities: OntologyEntity[];
  relations: OntologyRelation[];
  metrics: DomainMetric[];
  initializedAt: string;
}

export interface BusinessTerm {
  id: string;
  standardId: string;
  conceptId: string | null;
  name: string;
  definition: string;
  abbreviation: string;
  synonyms: string[];
  scenario: string;
  ownerId: string;
  version: string;
  status: ReviewStatus;
  references: string[];
  updatedAt: string;
}

// ---------- 主数据 ----------

export interface MasterEntity {
  id: string;
  standardId: string;
  name: string;
  keys: string[];
  authoritySources: string[];
  matchRules: string;
  ownerId: string;
  status: ReviewStatus;
}

export interface MasterSourceRecord {
  id: string;
  entityId: string;
  system: string;
  values: Record<string, string>;
  matchConfidence: number;
  conflictKeys: string[];
}

export interface GoldenRecordVersion {
  id: string;
  entityId: string;
  sourceRecordIds: string[];
  values: Record<string, string>;
  decisionId: string;
  decisionMode: "AI 自动合并" | "人工裁决";
  previousVersionId: string | null;
  createdAt: string;
}

export interface MasterDistribution {
  id: string;
  entityId: string;
  targetSystem: string;
  status: "排队" | "分发中" | "成功" | "失败" | "已停止";
  sla: "按时" | "超时";
  updatedAt: string;
}

// ---------- 参考数据 ----------

export interface ReferenceDataset {
  id: string;
  standardId: string;
  category: string;
  codeSet: string;
  values: ReferenceCodeValue[];
  effectiveAt: string;
  version: string;
  ownerId: string;
  status: ReviewStatus;
}

export interface ReferenceCodeValue {
  code: string;
  name: string;
  hierarchy: string;
  valid: boolean;
}

export interface ReferenceMapping {
  id: string;
  datasetId: string;
  systemId: string;
  sourceCode: string;
  targetCode: string;
  status: "AI 推荐" | "已批准" | "待复核" | "冲突";
  confidence: AiConfidence;
  evidenceIds: string[];
}

// 订阅方:哪个系统订阅了哪个代码集,以及同步模式与最近一次同步结果
export interface ReferenceSubscription {
  id: string;
  datasetId: string;
  subscriberSystem: string;
  contactOwner: string;
  syncMode: "全量" | "增量" | "API 拉取";
  status: "已订阅" | "待确认" | "已暂停";
  lastSyncAt: string;
  lastSyncResult: "成功" | "失败" | "部分成功" | "未同步";
  slaDeadline: string;
}

// 分发事件:每次代码集版本发布向订阅方的分发轨迹(类似主数据 distributions)
export interface ReferenceDistributionEvent {
  id: string;
  datasetId: string;
  version: string;
  targetSystem: string;
  status: "成功" | "失败" | "分发中" | "排队";
  sla: "按时" | "超时" | "未到截止";
  publishedAt: string;
  detail: string;
}

// 版本字段级差异:v1 → v2 之间具体哪些代码新增/删除/改名/层级变更
export interface ReferenceVersionDiff {
  id: string;
  datasetId: string;
  fromVersion: string;
  toVersion: string;
  changes: ReferenceVersionChange[];
  changedAt: string;
  changedBy: string;
  changeReason: string;
}

export interface ReferenceVersionChange {
  code: string;
  type: "新增" | "删除" | "改名" | "层级变更" | "状态变更";
  before?: string;
  after?: string;
}

// AI 映射抽样准确率与自动发布门禁:抽样准确率 < 99% 时 paused=true,
// 暂停 AI 推荐映射的自动批量发布,强制逐条人工批准
export interface ReferenceAiMappingStats {
  sampled: number;
  correct: number;
  paused: boolean;
  lastSampledAt: string;
  modelVersion: string;
}

// ---------- 数据元标准 ----------

export interface DataElementStandard {
  id: string;
  standardId: string;
  name: string;
  englishName: string;
  definition: string;
  termId: string | null;
  conceptId: string | null;
  type: string;
  length: string;
  format: string;
  unit: string;
  valueDomainId: string | null;
  version: string;
  status: ReviewStatus;
  ownerId: string;
}

export interface DataElementBinding {
  id: string;
  objectRef: string;
  standardVersionId: string;
  bindingMethod: "AI 自动落标" | "人工绑定";
  confidence: AiConfidence;
  constraintResults: { rule: string; result: AuditResultType }[];
  evidenceIds: string[];
  status: "已落标" | "待复核" | "未通过";
}

// ---------- 指标字典与语义层 ----------

export type MetricType = "原子指标" | "派生指标" | "复合指标";

export interface MetricDefinition {
  id: string;
  standardId: string;
  name: string;
  metricType: MetricType;
  businessDefinition: string;
  purpose: string;
  scope: string;
  formula: string;
  filters: string;
  grain: string;
  period: string;
  dimensions: string[];
  unit: string;
  precision: string;
  sourceRefs: string[];
  ownerId: string;
  version: string;
  status: ReviewStatus;
  autoComputeEnabled: boolean;
}

export interface SemanticMetricModel {
  id: string;
  metricVersionId: string;
  expression: string;
  physicalLineage: string;
  executionStatus: "可执行" | "待绑定" | "血缘不完整";
}

export interface MetricImplementation {
  id: string;
  metricId: string;
  departmentId: string;
  implementationVersion: string;
  formula: string;
  grain: string;
  semanticRefs: string[];
}

export type ComparisonResult = "一致" | "受控变体" | "冲突" | "未知";

export interface MetricComparison {
  id: string;
  groupId: string;
  implementationIds: string[];
  result: ComparisonResult;
  differences: string[];
  evidenceIds: string[];
  reviewStatus: ReviewStatus;
}
