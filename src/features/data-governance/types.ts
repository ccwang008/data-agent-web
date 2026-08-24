// 数据治理域共享与子域类型。所有业务数据为 SQLite 持久化 mock，
// 不连接真实采集器、执行引擎、血缘采集器或 AI 服务。
// 对齐 DCMM 第4级（量化管理级）就绪度要求。

export type GovernanceStatus =
  | "草稿"
  | "待审核"
  | "已发布"
  | "已废止";

export type AccountabilityStatus = "已认责" | "未认责" | "待确认";

// ---------- 元数据子模块（DCMM 8.4）----------

export type MetadataObjectType =
  | "湖表"
  | "指标"
  | "任务"
  | "数据服务"
  | "数据源"
  | "模型"
  | "API"
  | "报告";

/** 元模型属性分组 */
export type AttributeGroup = "技术属性" | "业务属性" | "管理属性";

/** 元模型属性定义（驱动质量评价）*/
export interface MetaModelAttribute {
  id: string;
  name: string;
  group: AttributeGroup;
  required: boolean;          // 完整性依据
  collected: boolean;          // 时效性依据
  valueConstraint?: string;    // 准确性依据
}

/** 元模型关系类型定义（驱动血缘）*/
export interface MetaModelRelation {
  id: string;
  name: string;
  sourceType: MetadataObjectType;
  targetType: MetadataObjectType;
  direction: "有向" | "无向";
  inLineage: boolean;
  impactWeight: number;
}

/** 采集规则配置 */
export interface CollectionRule {
  id: string;
  objectType: MetadataObjectType;
  sourceSystem: string;
  method: "自动" | "手动";
  frequency: "日" | "周" | "变更触发";
  fieldMapping: string;
  taskStatus: "运行中" | "成功" | "失败" | "暂停";
  lastCollectedAt: string;
}

/** 元模型（L3 前置：为采集、质量评价、血缘提供规范依据）*/
export interface MetaModel {
  id: string;
  objectType: MetadataObjectType;
  displayName: string;
  attributes: MetaModelAttribute[];
  relations: MetaModelRelation[];
  collectionRules: CollectionRule[];
  status: GovernanceStatus;
  version: string;
  updatedAt: string;
}

/** 元数据对象（扩展认责字段 D2）*/
export interface MetadataObject {
  id: string;
  modelId: string;                          // 引用元模型
  objectType: MetadataObjectType;
  name: string;
  system: string;
  domain: string;
  attributes: Record<string, string>;       // 按元模型属性集渲染
  ownerId: string;                          // 认责字段：数据所有者
  managerId: string;                        // 认责字段：数据管理者
  accountabilityStatus: AccountabilityStatus;
  lineage: string;
  status: string;
  updatedAt: string;
  standardId?: string;                       // 引用数据标准稳定 ID
  standardVersionId?: string;
  ontologyConceptId?: string;
  auditSummary?: string;
}

/** 元数据质量评分等级 */
export type MetadataQualityGrade =
  | "优秀"
  | "良好"
  | "待改进"
  | "不合格";

/** 元数据质量评价结果 */
export interface MetadataQualityResult {
  objectId: string;
  completeness: number;    // 完整性
  accuracy: number;        // 准确性
  timeliness: number;      // 时效性
  totalScore: number;
  grade: MetadataQualityGrade;
  missingItems: string[];
}

/** 不可覆盖的元数据质量评价批次 */
export interface MetadataQualityBatch {
  id: string;
  triggeredAt: string;
  scope: { objectTypes: MetadataObjectType[]; domains: string[] };
  modelVersionId: string;                   // 评分依据快照
  results: MetadataQualityResult[];
  status: "运行中" | "已完成";
}

/** 元数据质量 AI 辅助建议（L4 mock）*/
export type MetadataAiSuggestionType =
  | "业务元数据补充"
  | "符合性异常检测"
  | "血缘自动追踪";

export interface MetadataAiSuggestion {
  id: string;
  type: MetadataAiSuggestionType;
  objectId: string;
  content: string;
  confidence: "高" | "中" | "低";
  modelVersion: string;
  status: "待确认" | "已采纳" | "已驳回";
  confirmedBy?: string;
  confirmedAt?: string;
}

/** 元数据管理报告（L4）*/
export interface MetadataReport {
  id: string;
  period: string;
  collectionCoverage: number;   // 采集覆盖率
  qualityScore: number;          // 质量分
  lineageCompleteness: number;   // 血缘完整率
  trends: string;
  gaps: string;
  improvements: string;
  status: GovernanceStatus;
  createdAt: string;
}

// ---------- 数据质量子模块（DCMM 11）----------

export type QualityDimension =
  | "完整性"
  | "准确性"
  | "及时性"
  | "一致性"
  | "唯一性";

export type QualitySeverity = "P0" | "P1" | "P2" | "P3";

/** 质量需求（11.1）*/
export interface QualityRequirement {
  id: string;
  objectId: string;
  objectName: string;
  dimension: QualityDimension;
  indicator: string;
  target: string;
  priority: QualitySeverity;
  context: string;             // 信息环境上下文
  status: GovernanceStatus;
  updatedAt: string;
}

/** 质量规则（11.2）*/
export interface QualityRule {
  id: string;
  requirementId?: string;
  name: string;
  dimension: QualityDimension;
  target: string;
  threshold: string;
  score: string;
  owner: string;
  status: "启用" | "停用" | "执行中" | "通过" | "失败";
  updatedAt: string;
}

/** 质量剖析快照（11.2.b）*/
export interface QualityProfiling {
  id: string;
  objectId: string;
  dimension: QualityDimension;
  totalRecords: number;
  nullCount: number;
  distinctCount: number;
  distribution: string;
  snapshotAt: string;
}

/** 质量检查执行批次 */
export interface QualityExecutionBatch {
  id: string;
  scope: string;
  executedAt: string;
  totalRules: number;
  passed: number;
  failed: number;
  status: "运行中" | "已完成";
}

/** 质量问题闭环状态机 */
export type QualityIssueStatus =
  | "发现"
  | "确认"
  | "分发"
  | "整改"
  | "复检"
  | "关闭";

/** 质量问题（独立于规则生命周期，D6 核心）*/
export interface QualityIssue {
  id: string;
  objectId: string;
  objectName: string;
  ruleId: string;
  ruleName: string;
  dimension: QualityDimension;
  severity: QualitySeverity;
  status: QualityIssueStatus;
  discoveredAt: string;
  confirmer?: string;          // 确认人（≠处置人≠复核人）
  assignee?: string;            // 分发对象（认责管理者，D2 联动）
  rectifyAction?: string;
  recheckResult?: "通过" | "失败";
  closedBy?: string;            // 关闭人（独立于处置人）
  closedAt?: string;
  evidenceRefs: string[];
}

/** 数据可信度评分 */
export interface DataTrustworthiness {
  objectId: string;
  objectName: string;
  score: number;
  level: "高" | "中" | "低";
  dimensions: Record<QualityDimension, number>;
  updatedAt: string;
}

/** 质量分析根因聚类 */
export interface QualityRootCause {
  id: string;
  clusterName: string;
  issueIds: string[];
  rootCause: string;
  affectedObjects: number;
  suggestedAction: string;
}

/** 质量改进报告（11.4 L4）*/
export interface QualityImprovementReport {
  id: string;
  period: string;
  trends: string;
  rootCauses: string;
  measures: string;
  effectRecheck: string;
  lifecycleOptimization: string;   // L4 生存周期闭环优化
  status: GovernanceStatus;
  createdAt: string;
}

// ---------- 治理中心子模块（DCMM 7）----------

export type GovernanceRoleLevel = "决策" | "管理" | "执行";

/** 治理角色 */
export interface GovernanceRole {
  id: string;
  name: string;
  level: GovernanceRoleLevel;
  department: string;
  responsibilities: string[];
  requirements: string;
  headcount: number;
}

/** 治理组织节点 */
export interface GovernanceOrgNode {
  id: string;
  name: string;
  level: GovernanceRoleLevel;
  parentId: string | null;
  roleIds: string[];
  accountabilityCoverage: number;   // 认责覆盖率
}

/** 认责总览（D2：组织面聚合，不重复维护认责事实）*/
export interface AccountabilityOverview {
  id: string;
  department: string;
  totalObjects: number;
  assignedObjects: number;
  coverage: number;
  unassignedObjects: number;
  exceptionCount: number;
  assessmentScore: number;          // L4 业务部门量化考核
}

/** 制度层级 */
export type RegulationTier = "政策" | "办法" | "细则";

/** 治理制度（7.2）*/
export interface GovernanceRegulation {
  id: string;
  tier: RegulationTier;
  title: string;
  capabilityDomains: string[];     // 覆盖的 DCMM 能力域
  version: string;
  status: GovernanceStatus;
  publishedAt: string;
  owner: string;
}

/** 制度执行结果 */
export type RegulationExecutionResult =
  | "通过"
  | "部分通过"
  | "未执行"
  | "偏差";

/** 制度执行监控批次（7.2 L4，mock）*/
export interface RegulationExecutionBatch {
  id: string;
  regulationVersionId: string;
  regulationTitle: string;
  scope: string;
  executedAt: string;
  results: {
    regulationId: string;
    result: RegulationExecutionResult;
    score: number;
    deviation?: string;
    remediation?: string;
  }[];
  overallScore: number;
  status: "运行中" | "已完成";
}

/** 文化活动类型 */
export type CultureActivityType =
  | "价值观"
  | "承诺"
  | "宣贯"
  | "培训"
  | "标杆";

/** 文化活动（7.3）*/
export interface CultureActivity {
  id: string;
  type: CultureActivityType;
  title: string;
  date: string;
  participants: number;
  department: string;
  effectivenessScore?: number;   // L4 量化
  description: string;
}

/** 文化成效指标（L4）*/
export interface CultureMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: "上升" | "下降" | "持平";
}

/** 治理大盘概览 */
export interface GovernanceOverview {
  organizationHealth: number;
  regulationCoverage: number;
  cultureEffectiveness: number;
  governanceIssues: number;
  openIssues: number;
  overdueRectifications: number;
  pendingAiSuggestions: number;
}
