// 数据治理域 SQLite 持久化 mock 种子数据。
// 覆盖正常、空数据、加载中、失败、运行中、成功、已停止等产品状态，
// 不代表真实采集器、执行引擎、血缘采集器或 AI 服务的执行结果。

import type {
  AccountabilityOverview, CollectionRule, CultureActivity, CultureMetric,
  GovernanceOverview, GovernanceOrgNode, GovernanceRegulation,
  GovernanceRole, MetadataAiSuggestion, MetadataObject, MetadataQualityBatch,
  MetadataReport, MetaModel, MetaModelAttribute, MetaModelRelation,
  QualityExecutionBatch, QualityImprovementReport, QualityIssue,
  QualityProfiling, QualityRequirement, QualityRootCause, QualityRule,
  RegulationExecutionBatch, DataTrustworthiness,
} from "./types";

export const SCHEMA_VERSION = 1;

// ---------------- 元模型（L3 前置）----------------

const tableAttributes: MetaModelAttribute[] = [
  { id: "ATTR-T-01", name: "表名", group: "技术属性", required: true, collected: true },
  { id: "ATTR-T-02", name: "字段列表", group: "技术属性", required: true, collected: true },
  { id: "ATTR-T-03", name: "数据类型", group: "技术属性", required: true, collected: true, valueConstraint: "符合数据类型字典" },
  { id: "ATTR-T-04", name: "业务定义", group: "业务属性", required: true, collected: false },
  { id: "ATTR-T-05", name: "业务域", group: "业务属性", required: true, collected: false },
  { id: "ATTR-T-06", name: "数据所有者", group: "管理属性", required: true, collected: false },
  { id: "ATTR-T-07", name: "数据管理者", group: "管理属性", required: true, collected: false },
  { id: "ATTR-T-08", name: "最近采集时间", group: "管理属性", required: true, collected: true },
];

const metricAttributes: MetaModelAttribute[] = [
  { id: "ATTR-M-01", name: "指标名称", group: "业务属性", required: true, collected: true },
  { id: "ATTR-M-02", name: "业务口径", group: "业务属性", required: true, collected: false },
  { id: "ATTR-M-03", name: "计算公式", group: "技术属性", required: true, collected: true },
  { id: "ATTR-M-04", name: "数据所有者", group: "管理属性", required: true, collected: false },
  { id: "ATTR-M-05", name: "数据管理者", group: "管理属性", required: true, collected: false },
];

const taskAttributes: MetaModelAttribute[] = [
  { id: "ATTR-K-01", name: "任务名称", group: "技术属性", required: true, collected: true },
  { id: "ATTR-K-02", name: "调度周期", group: "技术属性", required: true, collected: true },
  { id: "ATTR-K-03", name: "输入对象", group: "技术属性", required: true, collected: true },
  { id: "ATTR-K-04", name: "输出对象", group: "技术属性", required: true, collected: true },
  { id: "ATTR-K-05", name: "数据所有者", group: "管理属性", required: true, collected: false },
];

const serviceAttributes: MetaModelAttribute[] = [
  { id: "ATTR-S-01", name: "服务名称", group: "业务属性", required: true, collected: true },
  { id: "ATTR-S-02", name: "服务接口", group: "技术属性", required: true, collected: true },
  { id: "ATTR-S-03", name: "服务等级协议", group: "管理属性", required: true, collected: false },
  { id: "ATTR-S-04", name: "数据所有者", group: "管理属性", required: true, collected: false },
];

const tableRelations: MetaModelRelation[] = [
  { id: "REL-T-01", name: "上下游血缘", sourceType: "湖表", targetType: "湖表", direction: "有向", inLineage: true, impactWeight: 1.0 },
  { id: "REL-T-02", name: "依赖", sourceType: "任务", targetType: "湖表", direction: "有向", inLineage: true, impactWeight: 0.9 },
  { id: "REL-T-03", name: "引用标准", sourceType: "湖表", targetType: "数据源", direction: "有向", inLineage: false, impactWeight: 0.5 },
];

const metricRelations: MetaModelRelation[] = [
  { id: "REL-M-01", name: "衍生", sourceType: "湖表", targetType: "指标", direction: "有向", inLineage: true, impactWeight: 1.0 },
  { id: "REL-M-02", name: "引用", sourceType: "指标", targetType: "湖表", direction: "有向", inLineage: true, impactWeight: 0.8 },
];

const collectionRules: CollectionRule[] = [
  { id: "COL-T-01", objectType: "湖表", sourceSystem: "数据湖", method: "自动", frequency: "日", fieldMapping: "hive_tables → metadata_objects", taskStatus: "成功", lastCollectedAt: "2026-08-14 02:00" },
  { id: "COL-M-01", objectType: "指标", sourceSystem: "指标平台", method: "自动", frequency: "日", fieldMapping: "metric_catalog → metadata_objects", taskStatus: "成功", lastCollectedAt: "2026-08-14 02:15" },
  { id: "COL-K-01", objectType: "任务", sourceSystem: "调度引擎", method: "自动", frequency: "变更触发", fieldMapping: "scheduler_tasks → metadata_objects", taskStatus: "运行中", lastCollectedAt: "2026-08-14 09:16" },
  { id: "COL-S-01", objectType: "数据服务", sourceSystem: "资产运营", method: "手动", frequency: "周", fieldMapping: "asset_services → metadata_objects", taskStatus: "暂停", lastCollectedAt: "2026-08-12 17:10" },
  { id: "COL-SRC-01", objectType: "数据源", sourceSystem: "数据集成", method: "自动", frequency: "日", fieldMapping: "data_sources → metadata_objects", taskStatus: "失败", lastCollectedAt: "2026-08-13 23:45" },
];

export const seedMetaModels: MetaModel[] = [
  { id: "MM-TABLE", objectType: "湖表", displayName: "湖表元模型", attributes: tableAttributes, relations: tableRelations, collectionRules: collectionRules.filter((r) => r.objectType === "湖表"), status: "已发布", version: "v1", updatedAt: "2026-08-10 10:00" },
  { id: "MM-METRIC", objectType: "指标", displayName: "指标元模型", attributes: metricAttributes, relations: metricRelations, collectionRules: collectionRules.filter((r) => r.objectType === "指标"), status: "已发布", version: "v1", updatedAt: "2026-08-10 10:05" },
  { id: "MM-TASK", objectType: "任务", displayName: "任务元模型", attributes: taskAttributes, relations: [], collectionRules: collectionRules.filter((r) => r.objectType === "任务"), status: "已发布", version: "v1", updatedAt: "2026-08-10 10:10" },
  { id: "MM-SERVICE", objectType: "数据服务", displayName: "数据服务元模型", attributes: serviceAttributes, relations: [], collectionRules: collectionRules.filter((r) => r.objectType === "数据服务"), status: "草稿", version: "v0.1", updatedAt: "2026-08-12 14:00" },
];

// ---------------- 元数据对象（扩展认责字段 D2）----------------

export const seedMetadataObjects: MetadataObject[] = [
  {
    id: "meta-001", modelId: "MM-TABLE", objectType: "湖表", name: "客户主数据表", system: "CRM → 数据湖",
    domain: "客户域",
    attributes: { "表名": "dwd_customer_profile", "字段列表": "customer_id, name, id_no, mobile, level", "数据类型": "STRING/BIGINT", "业务定义": "客户主数据明细表", "业务域": "客户域" },
    ownerId: "陈晨", managerId: "王雪", accountabilityStatus: "已认责",
    lineage: "12 上游 / 8 下游", status: "已同步", updatedAt: "2026-08-14 09:08",
    standardId: "STD-MD-001", standardVersionId: "VER-MD-001-2", ontologyConceptId: "CONCEPT-CUSTOMER",
    auditSummary: "2026-08-13 稽核通过 9/12",
  },
  {
    id: "meta-002", modelId: "MM-METRIC", objectType: "指标", name: "月度交易额指标", system: "指标平台",
    domain: "交易域",
    attributes: { "指标名称": "月度交易额", "业务口径": "SUM(有效订单.成交金额)", "计算公式": "SUM(amount)" },
    ownerId: "张敏", managerId: "李浩", accountabilityStatus: "已认责",
    lineage: "4 上游 / 6 下游", status: "已同步", updatedAt: "2026-08-14 08:30",
    standardId: "STD-MT-001", standardVersionId: "VER-MT-001-2", ontologyConceptId: "CONCEPT-TRADE",
    auditSummary: "2026-08-13 稽核通过",
  },
  {
    id: "meta-003", modelId: "MM-SERVICE", objectType: "数据服务", name: "客户画像服务", system: "资产运营",
    domain: "营销域",
    attributes: { "服务名称": "客户画像 API", "服务接口": "/api/v1/customer/profile", "服务等级协议": "P99 < 200ms" },
    ownerId: "赵宁", managerId: "", accountabilityStatus: "待确认",
    lineage: "7 上游 / 3 下游", status: "待确认", updatedAt: "2026-08-12 17:10",
  },
  {
    id: "meta-004", modelId: "MM-TASK", objectType: "任务", name: "订单实时同步任务", system: "调度引擎",
    domain: "交易域",
    attributes: { "任务名称": "trade_sync_rt", "调度周期": "5min", "输入对象": "MySQL.trade_order", "输出对象": "dwd_trade_order" },
    ownerId: "李浩", managerId: "张敏", accountabilityStatus: "已认责",
    lineage: "2 上游 / 5 下游", status: "已同步", updatedAt: "2026-08-14 09:16",
  },
  {
    id: "meta-005", modelId: "MM-SERVICE", objectType: "数据服务", name: "客户经营分析报告", system: "BI 平台",
    domain: "经营分析",
    attributes: { "服务名称": "经营分析报告", "服务接口": "/reports/customer-analytics" },
    ownerId: "", managerId: "", accountabilityStatus: "未认责",
    lineage: "9 上游 / 2 下游", status: "待确认", updatedAt: "2026-08-12 16:45",
  },
];

// ---------------- 元数据质量评价（DCMM 8.4.2.e）----------------

export const seedMetadataQualityBatches: MetadataQualityBatch[] = [
  {
    id: "MQB-001", triggeredAt: "2026-08-14 03:00",
    scope: { objectTypes: ["湖表", "指标", "任务", "数据服务"], domains: ["客户域", "交易域", "营销域", "经营分析"] },
    modelVersionId: "MM-*@v1",
    results: [
      { objectId: "meta-001", completeness: 95, accuracy: 98, timeliness: 100, totalScore: 97.7, grade: "优秀", missingItems: [] },
      { objectId: "meta-002", completeness: 90, accuracy: 95, timeliness: 100, totalScore: 95.0, grade: "良好", missingItems: ["业务口径补充"] },
      { objectId: "meta-003", completeness: 60, accuracy: 85, timeliness: 40, totalScore: 61.7, grade: "不合格", missingItems: ["数据管理者", "服务等级协议未采集"] },
      { objectId: "meta-004", completeness: 100, accuracy: 100, timeliness: 100, totalScore: 100, grade: "优秀", missingItems: [] },
      { objectId: "meta-005", completeness: 30, accuracy: 70, timeliness: 30, totalScore: 43.3, grade: "不合格", missingItems: ["数据所有者", "数据管理者", "业务定义", "服务等级协议"] },
    ],
    status: "已完成",
  },
  {
    id: "MQB-002", triggeredAt: "2026-08-07 03:00",
    scope: { objectTypes: ["湖表", "指标", "任务", "数据服务"], domains: ["客户域", "交易域", "营销域", "经营分析"] },
    modelVersionId: "MM-*@v1",
    results: [
      { objectId: "meta-001", completeness: 92, accuracy: 96, timeliness: 100, totalScore: 96.0, grade: "优秀", missingItems: [] },
      { objectId: "meta-002", completeness: 88, accuracy: 94, timeliness: 100, totalScore: 94.0, grade: "良好", missingItems: ["业务口径"] },
      { objectId: "meta-003", completeness: 55, accuracy: 82, timeliness: 35, totalScore: 57.3, grade: "不合格", missingItems: ["数据管理者"] },
      { objectId: "meta-004", completeness: 100, accuracy: 100, timeliness: 100, totalScore: 100, grade: "优秀", missingItems: [] },
      { objectId: "meta-005", completeness: 25, accuracy: 65, timeliness: 25, totalScore: 38.3, grade: "不合格", missingItems: ["数据所有者", "数据管理者"] },
    ],
    status: "已完成",
  },
];

export const seedMetadataAiSuggestions: MetadataAiSuggestion[] = [
  { id: "MAI-001", type: "业务元数据补充", objectId: "meta-005", content: "建议根据报告名称补充业务定义为「客户经营分析报告，汇总客户、交易、留存指标」", confidence: "中", modelVersion: "META-SUGGEST-v1.2", status: "待确认" },
  { id: "MAI-002", type: "符合性异常检测", objectId: "meta-003", content: "检测到「服务等级协议」字段值格式不符合 SLA 规范（应为 P99 < Xms）", confidence: "高", modelVersion: "META-CHECK-v1.0", status: "待确认" },
  { id: "MAI-003", type: "血缘自动追踪", objectId: "meta-005", content: "发现与 meta-001（客户主数据表）、meta-002（月度交易额指标）存在血缘关系，置信度 85%", confidence: "中", modelVersion: "LINEAGE-TRACE-v0.9", status: "待确认" },
  { id: "MAI-004", type: "业务元数据补充", objectId: "meta-003", content: "建议补充服务等级协议为「P99 < 200ms」", confidence: "高", modelVersion: "META-SUGGEST-v1.2", status: "已采纳", confirmedBy: "赵宁", confirmedAt: "2026-08-13 14:00" },
];

export const seedMetadataReports: MetadataReport[] = [
  { id: "MREP-2026-08", period: "2026-08", collectionCoverage: 92, qualityScore: 79.5, lineageCompleteness: 85, trends: "采集覆盖率上升 3%，质量分上升 2.1，血缘完整率持平", gaps: "数据服务类元模型待发布；3 个对象未认责", improvements: "推进数据服务元模型发布；完成未认责对象认责分配", status: "已发布", createdAt: "2026-08-14 09:00" },
  { id: "MREP-2026-07", period: "2026-07", collectionCoverage: 89, qualityScore: 77.4, lineageCompleteness: 85, trends: "采集覆盖率上升 5%，质量分上升 1.8", gaps: "数据服务类元模型未配置", improvements: "完成数据服务元模型草稿", status: "已发布", createdAt: "2026-08-01 09:00" },
];

// ---------------- 数据质量（DCMM 11）----------------

export const seedQualityRequirements: QualityRequirement[] = [
  { id: "QR-001", objectId: "meta-001", objectName: "客户主数据表", dimension: "完整性", indicator: "证件号填写率", target: "≥ 99.5%", priority: "P0", context: "客户主数据是营销与服务的基础，证件号缺失直接影响实名认证", status: "已发布", updatedAt: "2026-07-15 10:00" },
  { id: "QR-002", objectId: "meta-002", objectName: "月度交易额指标", dimension: "准确性", indicator: "金额计算偏差", target: "≤ 0.1%", priority: "P0", context: "月度交易额对外披露，偏差影响财务合规", status: "已发布", updatedAt: "2026-07-16 11:00" },
  { id: "QR-003", objectId: "meta-004", objectName: "订单实时同步任务", dimension: "及时性", indicator: "同步延迟", target: "≤ 5 min", priority: "P1", context: "实时看板依赖同步任务，延迟影响运营决策", status: "已发布", updatedAt: "2026-07-17 09:30" },
  { id: "QR-004", objectId: "meta-001", objectName: "客户主数据表", dimension: "唯一性", indicator: "客户主键唯一性", target: "= 100%", priority: "P0", context: "主键重复导致数据合并异常", status: "已发布", updatedAt: "2026-07-15 10:05" },
  { id: "QR-005", objectId: "meta-001", objectName: "客户主数据表", dimension: "一致性", indicator: "客户等级跨系统一致", target: "≥ 99%", priority: "P1", context: "CRM 与数据湖客户等级不一致影响分层营销", status: "草稿", updatedAt: "2026-08-10 14:00" },
];

export const seedQualityRules: QualityRule[] = [
  { id: "quality-001", requirementId: "QR-001", name: "客户证件号完整性", dimension: "完整性", target: "dwd_customer_profile.id_no", threshold: "≥ 99.5%", score: "99.8", owner: "王雪", status: "通过", updatedAt: "2026-08-14 08:00" },
  { id: "quality-002", requirementId: "QR-002", name: "订单金额准确性", dimension: "准确性", target: "dwd_trade_order.amount", threshold: "≥ 99.9%", score: "98.7", owner: "张敏", status: "失败", updatedAt: "2026-08-14 07:45" },
  { id: "quality-003", requirementId: "QR-003", name: "事件入湖及时性", dimension: "及时性", target: "dwd_customer_event", threshold: "≤ 5 min", score: "97.2", owner: "李浩", status: "执行中", updatedAt: "刚刚" },
  { id: "quality-004", requirementId: "QR-004", name: "客户主键唯一性", dimension: "唯一性", target: "dwd_customer_profile.customer_id", threshold: "= 100%", score: "100", owner: "王雪", status: "通过", updatedAt: "2026-08-14 08:00" },
  { id: "quality-005", requirementId: "QR-005", name: "客户等级一致性", dimension: "一致性", target: "dws_customer_level", threshold: "≥ 99%", score: "96.4", owner: "陈晨", status: "失败", updatedAt: "2026-08-14 06:30" },
];

export const seedQualityProfilings: QualityProfiling[] = [
  { id: "QP-001", objectId: "meta-001", dimension: "完整性", totalRecords: 1250000, nullCount: 2500, distinctCount: 1247500, distribution: "证件号缺失率 0.2%，集中在历史数据", snapshotAt: "2026-08-14 03:00" },
  { id: "QP-002", objectId: "meta-002", dimension: "准确性", totalRecords: 980000, nullCount: 0, distinctCount: 980000, distribution: "金额偏差率 1.3%，超阈值", snapshotAt: "2026-08-14 03:00" },
];

export const seedQualityExecutionBatches: QualityExecutionBatch[] = [
  { id: "QEB-001", scope: "客户域+交易域 5 规则", executedAt: "2026-08-14 08:00", totalRules: 5, passed: 2, failed: 2, status: "已完成" },
  { id: "QEB-002", scope: "客户域+交易域 5 规则", executedAt: "2026-08-13 08:00", totalRules: 5, passed: 3, failed: 1, status: "已完成" },
  { id: "QEB-003", scope: "全量 8 规则", executedAt: "2026-08-14 09:20", totalRules: 8, passed: 0, failed: 0, status: "运行中" },
];

export const seedQualityIssues: QualityIssue[] = [
  {
    id: "QI-001", objectId: "meta-002", objectName: "月度交易额指标", ruleId: "quality-002", ruleName: "订单金额准确性",
    dimension: "准确性", severity: "P0", status: "分发",
    discoveredAt: "2026-08-14 07:45", confirmer: "王雪", assignee: "张敏",
    evidenceRefs: ["QP-002", "QEB-001"],
  },
  {
    id: "QI-002", objectId: "meta-001", objectName: "客户主数据表", ruleId: "quality-005", ruleName: "客户等级一致性",
    dimension: "一致性", severity: "P1", status: "整改",
    discoveredAt: "2026-08-14 06:30", confirmer: "王雪", assignee: "陈晨",
    rectifyAction: "修正 dws_customer_level 等级映射规则，与 CRM 对齐",
    evidenceRefs: ["QEB-001"],
  },
  {
    id: "QI-003", objectId: "meta-004", objectName: "订单实时同步任务", ruleId: "quality-003", ruleName: "事件入湖及时性",
    dimension: "及时性", severity: "P2", status: "发现",
    discoveredAt: "2026-08-14 09:10",
    evidenceRefs: [],
  },
  {
    id: "QI-004", objectId: "meta-001", objectName: "客户主数据表", ruleId: "quality-001", ruleName: "客户证件号完整性",
    dimension: "完整性", severity: "P1", status: "关闭",
    discoveredAt: "2026-08-10 08:00", confirmer: "王雪", assignee: "王雪",
    rectifyAction: "补充历史数据证件号", recheckResult: "通过",
    closedBy: "李浩", closedAt: "2026-08-12 16:00",
    evidenceRefs: ["QEB-002"],
  },
];

export const seedDataTrustworthiness: DataTrustworthiness[] = [
  { objectId: "meta-001", objectName: "客户主数据表", score: 96, level: "高", dimensions: { "完整性": 99.8, "准确性": 95, "及时性": 100, "一致性": 96.4, "唯一性": 100 }, updatedAt: "2026-08-14 08:00" },
  { objectId: "meta-002", objectName: "月度交易额指标", score: 92, level: "高", dimensions: { "完整性": 100, "准确性": 98.7, "及时性": 100, "一致性": 80, "唯一性": 100 }, updatedAt: "2026-08-14 08:00" },
  { objectId: "meta-004", objectName: "订单实时同步任务", score: 85, level: "中", dimensions: { "完整性": 100, "准确性": 95, "及时性": 97.2, "一致性": 70, "唯一性": 100 }, updatedAt: "2026-08-14 08:00" },
];

export const seedQualityRootCauses: QualityRootCause[] = [
  { id: "QRC-001", clusterName: "金额计算偏差", issueIds: ["QI-001"], rootCause: "订单金额在 ETL 中未剔除退款订单，导致 SUM 偏高", affectedObjects: 1, suggestedAction: "修正 ETL 公式，剔除退款订单，对齐 STD-MT-001 v2 口径" },
  { id: "QRC-002", clusterName: "跨系统等级不一致", issueIds: ["QI-002"], rootCause: "dws_customer_level 等级映射规则与 CRM 不一致", affectedObjects: 1, suggestedAction: "对齐 CRM 等级映射规则，刷新 dws 表" },
];

export const seedQualityImprovementReports: QualityImprovementReport[] = [
  {
    id: "QIR-2026-08", period: "2026-08",
    trends: "综合可信度从 92 上升至 94；准确性维度下降 1.3，其余维度上升",
    rootCauses: "金额偏差源于 ETL 未剔除退款；等级不一致源于映射规则未对齐",
    measures: "修正 ETL 公式；对齐 CRM 等级映射；建立退款剔除校验规则",
    effectRecheck: "措施执行率 75%，金额偏差待复检",
    lifecycleOptimization: "建议在需求矩阵中增加「退款剔除」校验项，纳入生存周期闭环",
    status: "已发布", createdAt: "2026-08-14 09:00",
  },
];

// ---------------- 治理中心（DCMM 7）----------------

export const seedGovernanceRoles: GovernanceRole[] = [
  { id: "GR-001", name: "数据治理委员会主任", level: "决策", department: "总经办", responsibilities: ["审批治理战略", "审批重大制度", "决策治理资源"], requirements: "5 年以上数据治理经验", headcount: 1 },
  { id: "GR-002", name: "数据治理负责人", level: "管理", department: "数据中心", responsibilities: ["制定治理规划", "组织制度建设", "推动认责落实", "量化考核业务部门"], requirements: "3 年以上数据治理经验", headcount: 1 },
  { id: "GR-003", name: "元数据管理员", level: "执行", department: "数据中心", responsibilities: ["维护元模型", "监控元数据质量", "执行采集任务"], requirements: "熟悉元数据管理工具", headcount: 2 },
  { id: "GR-004", name: "质量负责人", level: "执行", department: "数据中心", responsibilities: ["管理质量规则", "跟踪质量问题闭环", "生成质量报告"], requirements: "熟悉数据质量管理", headcount: 2 },
  { id: "GR-005", name: "业务数据管家", level: "执行", department: "业务部门", responsibilities: ["认领数据对象", "参与问题整改", "落实本部门认责"], requirements: "熟悉本业务域数据", headcount: 8 },
];

export const seedGovernanceOrgNodes: GovernanceOrgNode[] = [
  { id: "ON-001", name: "数据治理委员会", level: "决策", parentId: null, roleIds: ["GR-001"], accountabilityCoverage: 100 },
  { id: "ON-002", name: "数据中心", level: "管理", parentId: "ON-001", roleIds: ["GR-002"], accountabilityCoverage: 95 },
  { id: "ON-003", name: "元数据组", level: "执行", parentId: "ON-002", roleIds: ["GR-003"], accountabilityCoverage: 90 },
  { id: "ON-004", name: "质量组", level: "执行", parentId: "ON-002", roleIds: ["GR-004"], accountabilityCoverage: 88 },
  { id: "ON-005", name: "客户域管家", level: "执行", parentId: "ON-002", roleIds: ["GR-005"], accountabilityCoverage: 80 },
  { id: "ON-006", name: "交易域管家", level: "执行", parentId: "ON-002", roleIds: ["GR-005"], accountabilityCoverage: 75 },
];

export const seedAccountabilityOverviews: AccountabilityOverview[] = [
  { id: "AO-001", department: "客户域", totalObjects: 24, assignedObjects: 19, coverage: 79.2, unassignedObjects: 5, exceptionCount: 2, assessmentScore: 82 },
  { id: "AO-002", department: "交易域", totalObjects: 18, assignedObjects: 14, coverage: 77.8, unassignedObjects: 4, exceptionCount: 1, assessmentScore: 78 },
  { id: "AO-003", department: "营销域", totalObjects: 12, assignedObjects: 6, coverage: 50, unassignedObjects: 6, exceptionCount: 3, assessmentScore: 55 },
  { id: "AO-004", department: "经营分析", totalObjects: 8, assignedObjects: 3, coverage: 37.5, unassignedObjects: 5, exceptionCount: 2, assessmentScore: 48 },
];

export const seedGovernanceRegulations: GovernanceRegulation[] = [
  { id: "REG-001", tier: "政策", title: "数据治理总政策", capabilityDomains: ["7.1", "7.2", "7.3", "8.4", "11"], version: "v2", status: "已发布", publishedAt: "2026-06-01", owner: "数据治理委员会" },
  { id: "REG-002", tier: "办法", title: "数据认责管理办法", capabilityDomains: ["7.1"], version: "v1", status: "已发布", publishedAt: "2026-06-15", owner: "数据治理负责人" },
  { id: "REG-003", tier: "办法", title: "元数据管理办法", capabilityDomains: ["8.4"], version: "v1", status: "已发布", publishedAt: "2026-07-01", owner: "数据治理负责人" },
  { id: "REG-004", tier: "办法", title: "数据质量管理办法", capabilityDomains: ["11"], version: "v1", status: "已发布", publishedAt: "2026-07-01", owner: "数据治理负责人" },
  { id: "REG-005", tier: "细则", title: "元模型配置细则", capabilityDomains: ["8.4"], version: "v1", status: "已发布", publishedAt: "2026-07-10", owner: "元数据管理员" },
  { id: "REG-006", tier: "细则", title: "质量问题闭环细则", capabilityDomains: ["11"], version: "v0.1", status: "草稿", publishedAt: "—", owner: "质量负责人" },
];

export const seedRegulationExecutionBatches: RegulationExecutionBatch[] = [
  {
    id: "REB-001", regulationVersionId: "REG-002@v1", regulationTitle: "数据认责管理办法", scope: "全公司 62 对象",
    executedAt: "2026-08-10 10:00",
    results: [
      { regulationId: "REG-002", result: "部分通过", score: 78, deviation: "营销域认责覆盖率 50% 低于目标 80%", remediation: "营销域 9 月完成认责分配" },
    ],
    overallScore: 78, status: "已完成",
  },
  {
    id: "REB-002", regulationVersionId: "REG-003@v1", regulationTitle: "元数据管理办法", scope: "数据中心 4 类对象",
    executedAt: "2026-08-12 10:00",
    results: [
      { regulationId: "REG-003", result: "通过", score: 92, remediation: "—" },
    ],
    overallScore: 92, status: "已完成",
  },
  {
    id: "REB-003", regulationVersionId: "REG-004@v1", regulationTitle: "数据质量管理办法", scope: "客户域+交易域",
    executedAt: "2026-08-14 09:00",
    results: [
      { regulationId: "REG-004", result: "偏差", score: 65, deviation: "质量问题闭环未覆盖复检环节", remediation: "发布质量问题闭环细则 REG-006" },
    ],
    overallScore: 65, status: "已完成",
  },
];

export const seedCultureActivities: CultureActivity[] = [
  { id: "CA-001", type: "价值观", title: "发布「数据驱动」企业价值观", date: "2026-06-01", participants: 500, department: "全公司", effectivenessScore: 88, description: "由 CEO 发布数据驱动价值观，纳入年度考核" },
  { id: "CA-002", type: "承诺", title: "高管数据治理承诺书签署", date: "2026-06-05", participants: 12, department: "高管层", effectivenessScore: 90, description: "12 位高管签署数据治理承诺书" },
  { id: "CA-003", type: "宣贯", title: "数据治理总政策宣贯会", date: "2026-06-10", participants: 200, department: "全公司", effectivenessScore: 82, description: "解读数据治理总政策 v2" },
  { id: "CA-004", type: "培训", title: "元数据管理员认证培训", date: "2026-07-15", participants: 20, department: "数据中心", effectivenessScore: 85, description: "元模型配置与质量评价培训" },
  { id: "CA-005", type: "标杆", title: "客户域数据管家标杆案例", date: "2026-08-01", participants: 50, department: "客户域", effectivenessScore: 87, description: "客户域管家认责覆盖率从 60% 提升至 80%" },
];

export const seedCultureMetrics: CultureMetric[] = [
  { id: "CM-001", name: "治理活动覆盖率", value: 85, target: 90, unit: "%", trend: "上升" },
  { id: "CM-002", name: "数据素养测评通过率", value: 72, target: 80, unit: "%", trend: "上升" },
  { id: "CM-003", name: "数据驱动决策占比", value: 58, target: 70, unit: "%", trend: "上升" },
  { id: "CM-004", name: "业务部门参与度", value: 68, target: 75, unit: "%", trend: "持平" },
];

export const seedGovernanceOverview: GovernanceOverview = {
  organizationHealth: 88,
  regulationCoverage: 82,
  cultureEffectiveness: 85,
  governanceIssues: 3,
  openIssues: 2,
  overdueRectifications: 0,
  pendingAiSuggestions: 3,
};
