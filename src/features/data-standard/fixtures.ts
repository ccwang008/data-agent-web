// 数据标准域 SQLite 持久化 mock 种子数据。
// 覆盖正常、运行中、成功、失败、已停止、待复核等状态，不代表真实执行结果。

import type {
  AiDecision, AuditBatch, AuditResult, BusinessTerm, CandidateDefinition,
  ConceptAttribute, DataElementBinding, DataElementStandard, DomainMetric,
  GoldenRecordVersion, MasterDistribution, MasterEntity, MasterSourceRecord,
  MetricComparison, MetricDefinition, MetricImplementation, OntologyConcept,
  OntologyDomain, OntologyEntity, OntologyRelation, OntologySchema,
  ProjectStandardMapping, ReferenceAiMappingStats, ReferenceDataset,
  ReferenceDistributionEvent, ReferenceMapping, ReferenceSubscription,
  ReferenceVersionDiff, RemediationIssue,
  SemanticMetricModel, StandardIdentity, StandardParticipationEvidence, StandardVersion,
} from "./types";

export const SCHEMA_VERSION = 2;

// ---------------- 共享：标准身份、版本、候选、稽核、AI、证据 ----------------

export const seedIdentities: StandardIdentity[] = [
  { id: "STD-BT-001", kind: "business-term", name: "客户", status: "已发布", ownerId: "陈晨", currentVersionId: "VER-BT-001-2", createdAt: "2026-07-02 10:20" },
  { id: "STD-BT-002", kind: "business-term", name: "有效订单", status: "已发布", ownerId: "张敏", currentVersionId: "VER-BT-002-1", createdAt: "2026-07-04 14:05" },
  { id: "STD-BT-003", kind: "business-term", name: "活跃用户", status: "待批准", ownerId: "王芳", currentVersionId: "VER-BT-003-1", createdAt: "2026-08-10 09:30" },
  { id: "STD-MD-001", kind: "master-data", name: "客户主数据", status: "已发布", ownerId: "陈晨", currentVersionId: "VER-MD-001-2", createdAt: "2026-06-20 11:00" },
  { id: "STD-MD-002", kind: "master-data", name: "商品主数据", status: "草稿", ownerId: "李浩", currentVersionId: "VER-MD-002-1", createdAt: "2026-08-08 16:40" },
  { id: "STD-RD-001", kind: "reference-data", name: "证件类型代码集", status: "已发布", ownerId: "王雪", currentVersionId: "VER-RD-001-2", createdAt: "2026-06-12 09:15" },
  { id: "STD-RD-002", kind: "reference-data", name: "行政区划代码集", status: "待复核", ownerId: "刘妍", currentVersionId: "VER-RD-002-1", createdAt: "2026-08-09 13:25" },
  { id: "STD-DE-001", kind: "data-element", name: "客户证件号码", status: "已发布", ownerId: "王雪", currentVersionId: "VER-DE-001-1", createdAt: "2026-06-15 10:00" },
  { id: "STD-DE-002", kind: "data-element", name: "订单成交金额", status: "已发布", ownerId: "张敏", currentVersionId: "VER-DE-002-1", createdAt: "2026-06-18 11:30" },
  { id: "STD-MT-001", kind: "metric", name: "月度成交额", status: "已发布", ownerId: "张敏", currentVersionId: "VER-MT-001-2", createdAt: "2026-06-22 15:00" },
  { id: "STD-MT-002", kind: "metric", name: "活跃用户数", status: "待批准", ownerId: "王芳", currentVersionId: "VER-MT-002-1", createdAt: "2026-08-11 10:10" },
];

export const seedVersions: StandardVersion[] = [
  { id: "VER-BT-001-1", standardId: "STD-BT-001", version: "v1", content: "与平台发生交易关系的组织或个人。", changeReason: "首次发布", createdBy: "陈晨", approvedBy: "数据标准负责人", createdAt: "2026-07-02 10:20", previousVersionId: null },
  { id: "VER-BT-001-2", standardId: "STD-BT-001", version: "v2", content: "与平台发生交易或服务关系的组织或个人，含历史与潜在客户。", changeReason: "扩展服务关系与潜在客户范围", createdBy: "陈晨", approvedBy: "数据标准负责人", createdAt: "2026-08-01 09:00", previousVersionId: "VER-BT-001-1" },
  { id: "VER-BT-002-1", standardId: "STD-BT-002", version: "v1", content: "已支付且未取消的订单。", changeReason: "首次发布", createdBy: "张敏", approvedBy: "数据标准负责人", createdAt: "2026-07-04 14:05", previousVersionId: null },
  { id: "VER-BT-003-1", standardId: "STD-BT-003", version: "v1", content: "近 30 天有登录或交易行为的注册用户。", changeReason: "首次发布", createdBy: "王芳", approvedBy: "—", createdAt: "2026-08-10 09:30", previousVersionId: null },
  { id: "VER-MD-001-1", standardId: "STD-MD-001", version: "v1", content: "客户主数据标准 v1，含证件号、姓名、手机号。", changeReason: "首次发布", createdBy: "陈晨", approvedBy: "数据标准负责人", createdAt: "2026-06-20 11:00", previousVersionId: null },
  { id: "VER-MD-001-2", standardId: "STD-MD-001", version: "v2", content: "客户主数据标准 v2，新增客户等级与归属客户经理。", changeReason: "补充客户等级与归属人", createdBy: "陈晨", approvedBy: "数据标准负责人", createdAt: "2026-08-05 10:30", previousVersionId: "VER-MD-001-1" },
  { id: "VER-MD-002-1", standardId: "STD-MD-002", version: "v1", content: "商品主数据标准 v1，含 SKU、品类、品牌。", changeReason: "新建草稿", createdBy: "李浩", approvedBy: "—", createdAt: "2026-08-08 16:40", previousVersionId: null },
  { id: "VER-RD-001-1", standardId: "STD-RD-001", version: "v1", content: "证件类型代码集 v1，5 个代码值。", changeReason: "首次发布", createdBy: "王雪", approvedBy: "数据标准负责人", createdAt: "2026-06-12 09:15", previousVersionId: null },
  { id: "VER-RD-001-2", standardId: "STD-RD-001", version: "v2", content: "证件类型代码集 v2，新增“外国人永久居留身份证”。", changeReason: "新增代码值", createdBy: "王雪", approvedBy: "数据标准负责人", createdAt: "2026-08-06 14:00", previousVersionId: "VER-RD-001-1" },
  { id: "VER-RD-002-1", standardId: "STD-RD-002", version: "v1", content: "行政区划代码集 v1，覆盖省/市/区三级。", changeReason: "新建草稿", createdBy: "刘妍", approvedBy: "—", createdAt: "2026-08-09 13:25", previousVersionId: null },
  { id: "VER-DE-001-1", standardId: "STD-DE-001", version: "v1", content: "客户证件号码：字符型，长度 18，仅数字与大写字母 X。", changeReason: "首次发布", createdBy: "王雪", approvedBy: "数据标准负责人", createdAt: "2026-06-15 10:00", previousVersionId: null },
  { id: "VER-DE-002-1", standardId: "STD-DE-002", version: "v1", content: "订单成交金额：数值型，长度 12，精度 2，单位元。", changeReason: "首次发布", createdBy: "张敏", approvedBy: "数据标准负责人", createdAt: "2026-06-18 11:30", previousVersionId: null },
  { id: "VER-MT-001-1", standardId: "STD-MT-001", version: "v1", content: "月度成交额 = SUM(有效订单.成交金额)。", changeReason: "首次发布", createdBy: "张敏", approvedBy: "数据标准负责人", createdAt: "2026-06-22 15:00", previousVersionId: null },
  { id: "VER-MT-001-2", standardId: "STD-MT-001", version: "v2", content: "月度成交额 = SUM(有效订单.成交金额)，剔除退款订单。", changeReason: "口径剔除退款订单", createdBy: "张敏", approvedBy: "数据标准负责人", createdAt: "2026-08-03 16:20", previousVersionId: "VER-MT-001-1" },
  { id: "VER-MT-002-1", standardId: "STD-MT-002", version: "v1", content: "活跃用户数 = COUNT(DISTINCT 近30天活跃用户)。", changeReason: "新建草稿", createdBy: "王芳", approvedBy: "—", createdAt: "2026-08-11 10:10", previousVersionId: null },
];

export const seedCandidates: CandidateDefinition[] = [
  { id: "CAND-BT-001", kind: "business-term", projectId: "CRM 项目", sourceId: "crm-term-cust", sourceVersion: "v1", content: "CRM 系统中的客户：已成交的商户。", aiSuggestion: "与 STD-BT-001 同义，建议归并到“客户”概念。", reviewStatus: "待复核", ownerId: "陈晨", createdAt: "2026-08-12 09:00" },
  { id: "CAND-BT-002", kind: "business-term", projectId: "营销项目", sourceId: "mkt-active-user", sourceVersion: "v2", content: "近 7 天有行为的用户。", aiSuggestion: "与 STD-BT-003 周期口径冲突，建议人工裁决。", reviewStatus: "候选", ownerId: "王芳", createdAt: "2026-08-12 10:30" },
  { id: "CAND-DE-001", kind: "data-element", projectId: "交易项目", sourceId: "trade-amount", sourceVersion: "v1", content: "订单金额，数值型 10 位。", aiSuggestion: "与 STD-DE-002 长度不一致（10 vs 12），疑似冲突。", reviewStatus: "待复核", ownerId: "张敏", createdAt: "2026-08-12 11:15" },
];

export const seedProjectMappings: ProjectStandardMapping[] = [
  { id: "MAP-001", candidateVersionId: "crm-term-cust@v1", enterpriseVersionId: "VER-BT-001-2", migrationStatus: "已落标", auditResultId: "AUD-RES-001" },
  { id: "MAP-002", candidateVersionId: "trade-amount@v1", enterpriseVersionId: "VER-DE-002-1", migrationStatus: "未通过", auditResultId: "AUD-RES-003" },
];

export const seedAuditBatches: AuditBatch[] = [
  { id: "AUD-001", trigger: "标准变更", scopeSnapshot: "客户域 12 对象", standardVersions: "VER-BT-001-2 / VER-DE-001-1", ruleVersions: "RULE-DE-v3", aiModelVersions: "DE-BIND-v2.1", status: "成功", passed: 9, failed: 2, unknown: 1, notApplicable: 0, createdAt: "2026-08-13 02:00" },
  { id: "AUD-002", trigger: "周期全量", scopeSnapshot: "交易域 28 对象", standardVersions: "VER-DE-002-1 / VER-MT-001-2", ruleVersions: "RULE-DE-v3 / RULE-MT-v2", aiModelVersions: "DE-BIND-v2.1 / MT-CMP-v1.4", status: "运行中", passed: 18, failed: 3, unknown: 2, notApplicable: 1, createdAt: "2026-08-13 09:10" },
  { id: "AUD-003", trigger: "手动执行", scopeSnapshot: "营销域 8 对象", standardVersions: "VER-BT-003-1", ruleVersions: "RULE-BT-v2", aiModelVersions: "BT-MERGE-v1.0", status: "失败", passed: 0, failed: 0, unknown: 0, notApplicable: 0, createdAt: "2026-08-12 17:30" },
];

export const seedAuditResults: AuditResult[] = [
  { id: "AUD-RES-001", batchId: "AUD-001", objectRef: "dwd_customer_profile.id_no", standardVersionId: "VER-DE-001-1", ruleId: "RULE-DE-v3", result: "通过", evidenceIds: ["EV-001"] },
  { id: "AUD-RES-002", batchId: "AUD-001", objectRef: "dwd_customer_profile.mobile", standardVersionId: "VER-DE-001-1", ruleId: "RULE-DE-v3", result: "未知", evidenceIds: ["EV-002"] },
  { id: "AUD-RES-003", batchId: "AUD-001", objectRef: "dwd_trade_order.amount", standardVersionId: "VER-DE-002-1", ruleId: "RULE-DE-v3", result: "失败", evidenceIds: ["EV-003"] },
  { id: "AUD-RES-004", batchId: "AUD-001", objectRef: "dws_customer_level", standardVersionId: "VER-DE-001-1", ruleId: "RULE-DE-v3", result: "不适用", evidenceIds: ["EV-004"] },
];

export const seedRemediationIssues: RemediationIssue[] = [
  { id: "ISS-001", objectRef: "dwd_trade_order.amount", standardVersionId: "VER-DE-002-1", ruleId: "RULE-DE-v3", status: "整改中", ownerId: "张敏", evidenceIds: ["EV-003", "EV-005"], createdAt: "2026-08-13 02:10" },
  { id: "ISS-002", objectRef: "dwd_customer_profile.mobile", standardVersionId: "VER-DE-001-1", ruleId: "RULE-DE-v3", status: "待复检", ownerId: "王雪", evidenceIds: ["EV-002"], createdAt: "2026-08-13 02:10" },
];

export const seedAiDecisions: AiDecision[] = [
  { id: "AI-001", modelVersion: "BT-MERGE-v1.0", strategyVersion: "BT-STRAT-v1.2", executedAt: "2026-08-12 09:01", inputRefs: ["CAND-BT-001", "STD-BT-001"], confidence: "高", result: "建议归并到“客户”概念", rationaleSummary: "定义语义一致，仅表述差异。", autoExecuted: false, reviewResult: "待复核" },
  { id: "AI-002", modelVersion: "MD-MATCH-v2.3", strategyVersion: "MD-STRAT-v2.0", executedAt: "2026-08-13 09:05", inputRefs: ["MD-SRC-001", "MD-SRC-002"], confidence: "中", result: "建议自动合并（关键属性无冲突）", rationaleSummary: "证件号一致，手机号差异为历史号码。", autoExecuted: true, reviewResult: "通过" },
  { id: "AI-003", modelVersion: "DE-BIND-v2.1", strategyVersion: "DE-STRAT-v1.5", executedAt: "2026-08-13 02:05", inputRefs: ["dwd_trade_order.amount"], confidence: "低", result: "自动落标暂停，进入待复核", rationaleSummary: "长度约束不匹配（10 vs 12）。", autoExecuted: false, reviewResult: "待复核" },
];

export const seedParticipationEvidence: StandardParticipationEvidence[] = [
  { id: "PART-001", kind: "business-term", project: "GB/T 业务术语国标修订", level: "国家", role: "参编单位", stage: "征求意见", people: "陈晨、张敏", occurredAt: "2026-06-10", evidenceRefs: ["EV-PART-001"] },
  { id: "PART-002", kind: "reference-data", project: "行政区划行业标准维护", level: "行业", role: "成员单位", stage: "发布", people: "刘妍", occurredAt: "2026-07-20", evidenceRefs: ["EV-PART-002"] },
];

// ---------------- 业务术语与本体 ----------------

export const seedConcepts: OntologyConcept[] = [
  { id: "CONC-001", name: "客户", definition: "与平台发生交易或服务关系的组织或个人。", relations: ["CONC-002", "CONC-003"], versionId: "CONC-001-v1", status: "有效" },
  { id: "CONC-002", name: "订单", definition: "客户发起的交易凭证。", relations: ["CONC-001", "CONC-004"], versionId: "CONC-002-v1", status: "有效" },
  { id: "CONC-003", name: "用户", definition: "在平台注册并具备身份的自然人。", relations: ["CONC-001"], versionId: "CONC-003-v1", status: "有效" },
  { id: "CONC-004", name: "金额", definition: "以货币计量的数量。", relations: ["CONC-002"], versionId: "CONC-004-v1", status: "有效" },
  { id: "CONC-005", name: "活跃用户", definition: "近 30 天有登录或交易行为的注册用户。", relations: ["CONC-003"], versionId: "CONC-005-v1", status: "草稿" },
];

export const seedBusinessTerms: BusinessTerm[] = [
  { id: "BT-001", standardId: "STD-BT-001", conceptId: "CONC-001", name: "客户", definition: "与平台发生交易或服务关系的组织或个人，含历史与潜在客户。", abbreviation: "CUST", synonyms: ["商户", "会员"], scenario: "客户域、交易域", ownerId: "陈晨", version: "v2", status: "已发布", references: ["dwd_customer_profile", "STD-DE-001", "STD-MT-001"], updatedAt: "2026-08-01 09:00" },
  { id: "BT-002", standardId: "STD-BT-002", conceptId: "CONC-002", name: "有效订单", definition: "已支付且未取消的订单。", abbreviation: "VAL-ORD", synonyms: ["成交订单"], scenario: "交易域", ownerId: "张敏", version: "v1", status: "已发布", references: ["dwd_trade_order", "STD-MT-001"], updatedAt: "2026-07-04 14:05" },
  { id: "BT-003", standardId: "STD-BT-003", conceptId: null, name: "活跃用户", definition: "近 30 天有登录或交易行为的注册用户。", abbreviation: "ACT-USR", synonyms: ["MAU"], scenario: "营销域", ownerId: "王芳", version: "v1", status: "待批准", references: [], updatedAt: "2026-08-10 09:30" },
  { id: "BT-004", standardId: "—", conceptId: "CONC-003", name: "会员", definition: "CRM 项目中的客户，仅含已成交商户。", abbreviation: "—", synonyms: ["客户"], scenario: "CRM 项目", ownerId: "陈晨", version: "v0", status: "候选", references: [], updatedAt: "2026-08-12 09:00" },
];

// ---------------- 主数据 ----------------

export const seedMasterEntities: MasterEntity[] = [
  { id: "MD-ENT-001", standardId: "STD-MD-001", name: "客户主数据", keys: ["证件类型", "证件号码"], authoritySources: ["CRM", "会员中台"], matchRules: "证件号精确匹配 + 手机号模糊匹配（阈值 0.85）", ownerId: "陈晨", status: "已发布" },
  { id: "MD-ENT-002", standardId: "STD-MD-002", name: "商品主数据", keys: ["SKU"], authoritySources: ["商品中台"], matchRules: "SKU 精确匹配", ownerId: "李浩", status: "草稿" },
];

export const seedMasterSourceRecords: MasterSourceRecord[] = [
  { id: "MD-SRC-001", entityId: "MD-ENT-001", system: "CRM", values: { "证件类型": "身份证", "证件号码": "110101199001011234", "姓名": "张三", "手机号": "13800001111", "客户等级": "金卡" }, matchConfidence: 96, conflictKeys: [] },
  { id: "MD-SRC-002", entityId: "MD-ENT-001", system: "会员中台", values: { "证件类型": "身份证", "证件号码": "110101199001011234", "姓名": "张三", "手机号": "13900002222", "客户等级": "普卡" }, matchConfidence: 92, conflictKeys: ["手机号", "客户等级"] },
  { id: "MD-SRC-003", entityId: "MD-ENT-001", system: "客服系统", values: { "证件类型": "身份证", "证件号码": "—", "姓名": "张三", "手机号": "13800001111", "客户等级": "—" }, matchConfidence: 41, conflictKeys: ["证件号码"] },
];

export const seedGoldenRecords: GoldenRecordVersion[] = [
  { id: "GR-001", entityId: "MD-ENT-001", sourceRecordIds: ["MD-SRC-001", "MD-SRC-002"], values: { "证件类型": "身份证", "证件号码": "110101199001011234", "姓名": "张三", "手机号": "13800001111", "客户等级": "金卡" }, decisionId: "AI-002", decisionMode: "AI 自动合并", previousVersionId: null, createdAt: "2026-08-13 09:06" },
];

export const seedMasterDistributions: MasterDistribution[] = [
  { id: "DIST-001", entityId: "MD-ENT-001", targetSystem: "风控系统", status: "成功", sla: "按时", updatedAt: "2026-08-13 09:20" },
  { id: "DIST-002", entityId: "MD-ENT-001", targetSystem: "营销系统", status: "分发中", sla: "按时", updatedAt: "2026-08-13 09:21" },
  { id: "DIST-003", entityId: "MD-ENT-001", targetSystem: "BI 平台", status: "失败", sla: "超时", updatedAt: "2026-08-13 09:18" },
];

// ---------------- 参考数据 ----------------

export const seedReferenceDatasets: ReferenceDataset[] = [
  { id: "RD-001", standardId: "STD-RD-001", category: "身份标识", codeSet: "证件类型代码集", values: [{ code: "01", name: "居民身份证", hierarchy: "个人证件", valid: true }, { code: "02", name: "护照", hierarchy: "个人证件", valid: true }, { code: "03", name: "军官证", hierarchy: "个人证件", valid: true }, { code: "04", name: "港澳台通行证", hierarchy: "个人证件", valid: true }, { code: "05", name: "外国人永久居留身份证", hierarchy: "个人证件", valid: true }], effectiveAt: "2026-08-06", version: "v2", ownerId: "王雪", status: "已发布" },
  { id: "RD-002", standardId: "STD-RD-002", category: "地理区域", codeSet: "行政区划代码集", values: [{ code: "110000", name: "北京市", hierarchy: "省级", valid: true }, { code: "110100", name: "北京市辖区", hierarchy: "市级", valid: true }, { code: "110101", name: "东城区", hierarchy: "区级", valid: true }, { code: "310000", name: "上海市", hierarchy: "省级", valid: true }], effectiveAt: "2026-08-09", version: "v1", ownerId: "刘妍", status: "待复核" },
];

export const seedReferenceMappings: ReferenceMapping[] = [
  { id: "RMAP-001", datasetId: "RD-001", systemId: "CRM", sourceCode: "IDC", targetCode: "01", status: "已批准", confidence: "高", evidenceIds: ["EV-RM-001"] },
  { id: "RMAP-002", datasetId: "RD-001", systemId: "CRM", sourceCode: "PASSPORT", targetCode: "02", status: "AI 推荐", confidence: "高", evidenceIds: ["EV-RM-002"] },
  { id: "RMAP-003", datasetId: "RD-001", systemId: "客服系统", sourceCode: "OFFICER", targetCode: "03", status: "待复核", confidence: "低", evidenceIds: ["EV-RM-003"] },
  { id: "RMAP-004", datasetId: "RD-001", systemId: "营销系统", sourceCode: "GAT", targetCode: "04", status: "冲突", confidence: "中", evidenceIds: ["EV-RM-004"] },
];

export const seedReferenceSubscriptions: ReferenceSubscription[] = [
  { id: "RSUB-001", datasetId: "RD-001", subscriberSystem: "CRM", contactOwner: "李明", syncMode: "API 拉取", status: "已订阅", lastSyncAt: "2026-08-13 09:20", lastSyncResult: "成功", slaDeadline: "2026-08-13 10:00" },
  { id: "RSUB-002", datasetId: "RD-001", subscriberSystem: "客服系统", contactOwner: "张敏", syncMode: "增量", status: "已订阅", lastSyncAt: "2026-08-13 09:25", lastSyncResult: "部分成功", slaDeadline: "2026-08-13 10:00" },
  { id: "RSUB-003", datasetId: "RD-001", subscriberSystem: "营销系统", contactOwner: "王浩", syncMode: "全量", status: "已暂停", lastSyncAt: "2026-08-12 18:00", lastSyncResult: "失败", slaDeadline: "2026-08-13 10:00" },
  { id: "RSUB-004", datasetId: "RD-002", subscriberSystem: "BI 平台", contactOwner: "陈静", syncMode: "API 拉取", status: "待确认", lastSyncAt: "—", lastSyncResult: "未同步", slaDeadline: "2026-08-15 10:00" },
];

export const seedReferenceDistributions: ReferenceDistributionEvent[] = [
  { id: "RDIST-001", datasetId: "RD-001", version: "v2", targetSystem: "CRM", status: "成功", sla: "按时", publishedAt: "2026-08-06 10:05", detail: "v2 代码值 5 条已同步" },
  { id: "RDIST-002", datasetId: "RD-001", version: "v2", targetSystem: "客服系统", status: "分发中", sla: "未到截止", publishedAt: "2026-08-13 09:21", detail: "增量同步进行中" },
  { id: "RDIST-003", datasetId: "RD-001", version: "v2", targetSystem: "营销系统", status: "失败", sla: "超时", publishedAt: "2026-08-12 18:00", detail: "订阅已暂停,需重新激活" },
  { id: "RDIST-004", datasetId: "RD-002", version: "v1", targetSystem: "BI 平台", status: "排队", sla: "未到截止", publishedAt: "—", detail: "代码集待发布,发布后自动分发" },
];

export const seedReferenceVersionDiffs: ReferenceVersionDiff[] = [
  {
    id: "RVD-001", datasetId: "RD-001", fromVersion: "v1", toVersion: "v2",
    changedAt: "2026-08-06 09:30", changedBy: "王雪", changeReason: "新增外国人永久居留身份证代码值",
    changes: [
      { code: "05", type: "新增", after: "外国人永久居留身份证" },
      { code: "01", type: "改名", before: "居民身份证(15位)", after: "居民身份证" },
      { code: "03", type: "层级变更", before: "其他证件", after: "个人证件" },
    ],
  },
];

export const seedReferenceAiStats: ReferenceAiMappingStats = {
  sampled: 100,
  correct: 99,
  paused: false,
  lastSampledAt: "2026-08-13 08:00",
  modelVersion: "RD-MAP-v1.2",
};

// ---------------- 数据元标准 ----------------

export const seedDataElements: DataElementStandard[] = [
  { id: "DE-001", standardId: "STD-DE-001", name: "客户证件号码", englishName: "customer_id_no", definition: "客户合法身份凭证的编号。", termId: "BT-001", conceptId: "CONC-001", type: "字符型", length: "18", format: "数字与大写字母 X", unit: "—", valueDomainId: "RD-001", version: "v1", status: "已发布", ownerId: "王雪" },
  { id: "DE-002", standardId: "STD-DE-002", name: "订单成交金额", englishName: "order_amount", definition: "单笔有效订单的成交货币金额。", termId: "BT-002", conceptId: "CONC-004", type: "数值型", length: "12", format: "数字", unit: "元", valueDomainId: null, version: "v1", status: "已发布", ownerId: "张敏" },
  { id: "DE-003", standardId: "—", name: "客户手机号", englishName: "customer_mobile", definition: "客户登记的联系电话。", termId: "BT-001", conceptId: "CONC-001", type: "字符型", length: "11", format: "数字", unit: "—", valueDomainId: null, version: "v0", status: "候选", ownerId: "陈晨" },
];

export const seedDataElementBindings: DataElementBinding[] = [
  { id: "DEB-001", objectRef: "dwd_customer_profile.id_no", standardVersionId: "VER-DE-001-1", bindingMethod: "AI 自动落标", confidence: "高", constraintResults: [{ rule: "类型", result: "通过" }, { rule: "长度", result: "通过" }, { rule: "格式", result: "通过" }], evidenceIds: ["EV-001"], status: "已落标" },
  { id: "DEB-002", objectRef: "dwd_trade_order.amount", standardVersionId: "VER-DE-002-1", bindingMethod: "AI 自动落标", confidence: "低", constraintResults: [{ rule: "类型", result: "通过" }, { rule: "长度", result: "失败" }, { rule: "单位", result: "通过" }], evidenceIds: ["EV-003"], status: "未通过" },
  { id: "DEB-003", objectRef: "dwd_customer_profile.mobile", standardVersionId: "VER-DE-001-1", bindingMethod: "人工绑定", confidence: "中", constraintResults: [{ rule: "类型", result: "未知" }, { rule: "长度", result: "未知" }], evidenceIds: ["EV-002"], status: "待复核" },
];

// ---------------- 指标字典与语义层 ----------------

export const seedMetricDefinitions: MetricDefinition[] = [
  { id: "MT-001", standardId: "STD-MT-001", name: "月度成交额", metricType: "派生指标", businessDefinition: "统计月度内全部有效订单的成交金额合计，剔除退款。", purpose: "经营分析", scope: "交易域", formula: "SUM(有效订单.成交金额) - SUM(退款金额)", filters: "订单状态=有效", grain: "月", period: "自然月", dimensions: ["渠道", "区域"], unit: "元", precision: "2", sourceRefs: ["dwd_trade_order", "dwd_refund"], ownerId: "张敏", version: "v2", status: "已发布", autoComputeEnabled: true },
  { id: "MT-002", standardId: "STD-MT-002", name: "活跃用户数", metricType: "原子指标", businessDefinition: "近 30 天有登录或交易行为的去重用户数。", purpose: "增长分析", scope: "营销域", formula: "COUNT(DISTINCT user_id)", filters: "行为时间∈近30天", grain: "日", period: "滚动30天", dimensions: ["渠道"], unit: "人", precision: "0", sourceRefs: ["dwd_user_event"], ownerId: "王芳", version: "v1", status: "待批准", autoComputeEnabled: false },
  { id: "MT-003", standardId: "—", name: "月度 GMV", metricType: "派生指标", businessDefinition: "营销部门口径：含未支付订单的成交金额。", purpose: "营销复盘", scope: "营销域", formula: "SUM(订单.成交金额)", filters: "—", grain: "月", period: "自然月", dimensions: ["渠道"], unit: "元", precision: "2", sourceRefs: ["dwd_trade_order"], ownerId: "周凯", version: "v0", status: "候选", autoComputeEnabled: false },
];

export const seedSemanticModels: SemanticMetricModel[] = [
  { id: "SEM-001", metricVersionId: "VER-MT-001-2", expression: "AGG_SUM(dwd_trade_order.amount) - AGG_SUM(dwd_refund.amount)", physicalLineage: "dwd_trade_order → dws_trade_summary", executionStatus: "可执行" },
  { id: "SEM-002", metricVersionId: "VER-MT-002-1", expression: "—", physicalLineage: "—", executionStatus: "待绑定" },
];

export const seedMetricImplementations: MetricImplementation[] = [
  { id: "MI-001", metricId: "MT-001", departmentId: "财务部", implementationVersion: "v2", formula: "SUM(有效订单.成交金额) - SUM(退款金额)", grain: "月", semanticRefs: ["SEM-001"] },
  { id: "MI-002", metricId: "MT-001", departmentId: "营销部", implementationVersion: "v1", formula: "SUM(订单.成交金额)", grain: "月", semanticRefs: [] },
];

export const seedMetricComparisons: MetricComparison[] = [
  { id: "MC-001", groupId: "GRP-MT-001", implementationIds: ["MI-001", "MI-002"], result: "冲突", differences: ["公式不一致：营销部未剔除退款", "过滤条件不一致：营销部含未支付订单"], evidenceIds: ["EV-MC-001"], reviewStatus: "待批准" },
];

// ---------------- 本体工作台（7-Tab 本体模型） ----------------

export const seedOntologyDomains: OntologyDomain[] = [
  { code: "ai",           name: "人工智能",       description: "AI 模型、数据集、训练与评估" },
  { code: "customer",     name: "客户域",         description: "客户、会员、客群" },
  { code: "transaction",  name: "交易域",         description: "订单、合同、结算" },
  { code: "product",      name: "产品域",         description: "商品、SKU、物料" },
  { code: "finance",      name: "财务域",         description: "金额、成本、毛利、营收" },
  { code: "organization", name: "组织域",         description: "部门、员工、机构" },
  { code: "core",         name: "通用上层本体",   description: "跨域通用概念" },
];

const AI_SCHEMA_ATTRIBUTES: ConceptAttribute[] = [
  { id: "a1", code: "version", label: "版本", dataType: "string", required: true, unique: false },
  { id: "a2", code: "parameters", label: "参数量(B)", dataType: "number", required: false, unique: false },
  { id: "a3", code: "architecture", label: "架构", dataType: "string", required: false, unique: false },
];

const DATASET_ATTRIBUTES: ConceptAttribute[] = [
  { id: "a1", code: "size", label: "规模", dataType: "number", required: true, unique: false },
  { id: "a2", code: "format", label: "格式", dataType: "enum", required: false, unique: false },
  { id: "a3", code: "license", label: "许可证", dataType: "string", required: false, unique: false },
];

const SPLIT_ATTRIBUTES: ConceptAttribute[] = [
  { id: "a1", code: "ratio", label: "比例", dataType: "number", required: true, unique: false },
  { id: "a2", code: "seed", label: "随机种子", dataType: "number", required: false, unique: false },
];

const TASK_ATTRIBUTES: ConceptAttribute[] = [
  { id: "a1", code: "modality", label: "模态", dataType: "enum", required: true, unique: false },
  { id: "a2", code: "objective", label: "目标", dataType: "string", required: false, unique: false },
];

const TRAIN_ATTRIBUTES: ConceptAttribute[] = [
  { id: "a1", code: "epochs", label: "训练轮次", dataType: "number", required: true, unique: false },
  { id: "a2", code: "batch_size", label: "批大小", dataType: "number", required: false, unique: false },
  { id: "a3", code: "learning_rate", label: "学习率", dataType: "number", required: false, unique: false },
];

const METRIC_ATTRIBUTES: ConceptAttribute[] = [
  { id: "a1", code: "formula", label: "计算公式", dataType: "string", required: true, unique: false },
  { id: "a2", code: "threshold", label: "阈值", dataType: "number", required: false, unique: false },
];

export const seedOntologySchemas: OntologySchema[] = [
  { id: "S-AI-001", code: "AIModel", name: "AI 模型", domainCode: "ai", description: "人工智能模型基类，包含所有 AI 模型的通用属性。", parentSchemaId: null, attributes: AI_SCHEMA_ATTRIBUTES, status: "有效" },
  { id: "S-AI-002", code: "FoundationModel", name: "基础模型", domainCode: "ai", description: "具备通用能力的大型预训练模型。", parentSchemaId: "S-AI-001", attributes: AI_SCHEMA_ATTRIBUTES, status: "有效" },
  { id: "S-AI-003", code: "LargeLanguageModel", name: "大语言模型", domainCode: "ai", description: "基于 Transformer 的大语言模型。", parentSchemaId: "S-AI-002", attributes: AI_SCHEMA_ATTRIBUTES, status: "有效" },
  { id: "S-AI-004", code: "Dataset", name: "数据集", domainCode: "ai", description: "用于训练和评估 AI 模型的数据集合。", parentSchemaId: null, attributes: DATASET_ATTRIBUTES, status: "有效" },
  { id: "S-AI-005", code: "DatasetSplit", name: "数据集分片", domainCode: "ai", description: "数据集按训练/验证/测试的划分。", parentSchemaId: "S-AI-004", attributes: SPLIT_ATTRIBUTES, status: "有效" },
  { id: "S-AI-006", code: "ModelTask", name: "模型任务", domainCode: "ai", description: "AI 模型可执行的任务类型。", parentSchemaId: null, attributes: TASK_ATTRIBUTES, status: "有效" },
  { id: "S-AI-007", code: "TrainingRun", name: "训练运行", domainCode: "ai", description: "一次完整的模型训练过程。", parentSchemaId: null, attributes: TRAIN_ATTRIBUTES, status: "有效" },
  { id: "S-AI-008", code: "EvaluationMetric", name: "评估指标", domainCode: "ai", description: "衡量模型性能的量化指标。", parentSchemaId: null, attributes: METRIC_ATTRIBUTES, status: "有效" },

  { id: "S-CUS-001", code: "Customer", name: "客户", domainCode: "customer", description: "与平台发生交易或服务关系的组织或个人。", parentSchemaId: null, attributes: [
    { id: "c1", code: "id", label: "客户编号", dataType: "string", required: true, unique: true },
    { id: "c2", code: "level", label: "客户等级", dataType: "enum", required: false, unique: false },
  ], status: "有效" },
  { id: "S-CUS-002", code: "Member", name: "会员", domainCode: "customer", description: "注册并享有会员权益的客户。", parentSchemaId: "S-CUS-001", attributes: [
    { id: "c1", code: "member_no", label: "会员编号", dataType: "string", required: true, unique: true },
    { id: "c2", code: "tier", label: "会员等级", dataType: "enum", required: false, unique: false },
  ], status: "有效" },

  { id: "S-TRX-001", code: "Order", name: "订单", domainCode: "transaction", description: "客户发起的交易凭证。", parentSchemaId: null, attributes: [
    { id: "t1", code: "order_no", label: "订单号", dataType: "string", required: true, unique: true },
    { id: "t2", code: "status", label: "订单状态", dataType: "enum", required: false, unique: false },
  ], status: "有效" },
  { id: "S-TRX-002", code: "Contract", name: "合同", domainCode: "transaction", description: "业务合作的法律合同。", parentSchemaId: null, attributes: [
    { id: "t1", code: "contract_no", label: "合同号", dataType: "string", required: true, unique: true },
    { id: "t2", code: "party", label: "签约方", dataType: "string", required: false, unique: false },
  ], status: "有效" },

  { id: "S-PRD-001", code: "Product", name: "产品", domainCode: "product", description: "可供销售的商品品类。", parentSchemaId: null, attributes: [
    { id: "p1", code: "product_no", label: "产品编号", dataType: "string", required: true, unique: true },
    { id: "p2", code: "category", label: "品类", dataType: "string", required: false, unique: false },
  ], status: "有效" },
  { id: "S-PRD-002", code: "SKU", name: "SKU", domainCode: "product", description: "最小库存单位，产品的具体规格。", parentSchemaId: "S-PRD-001", attributes: [
    { id: "p1", code: "sku_code", label: "SKU 编码", dataType: "string", required: true, unique: true },
    { id: "p2", code: "spec", label: "规格", dataType: "string", required: false, unique: false },
  ], status: "有效" },

  { id: "S-FIN-001", code: "Amount", name: "金额", domainCode: "finance", description: "以货币计量的数值。", parentSchemaId: null, attributes: [
    { id: "f1", code: "value", label: "金额值", dataType: "number", required: true, unique: false },
    { id: "f2", code: "currency", label: "币种", dataType: "string", required: false, unique: false },
  ], status: "有效" },
  { id: "S-FIN-002", code: "Cost", name: "成本", domainCode: "finance", description: "获取或生产商品所付出的代价。", parentSchemaId: null, attributes: [
    { id: "f1", code: "cost_center", label: "成本中心", dataType: "string", required: false, unique: false },
    { id: "f2", code: "period", label: "周期", dataType: "string", required: false, unique: false },
  ], status: "有效" },

  { id: "S-ORG-001", code: "Department", name: "部门", domainCode: "organization", description: "组织架构中的职能部门。", parentSchemaId: null, attributes: [
    { id: "o1", code: "dept_code", label: "部门编码", dataType: "string", required: true, unique: true },
    { id: "o2", code: "manager", label: "负责人", dataType: "string", required: false, unique: false },
  ], status: "有效" },
  { id: "S-ORG-002", code: "Employee", name: "员工", domainCode: "organization", description: "组织内的工作人员。", parentSchemaId: null, attributes: [
    { id: "o1", code: "emp_no", label: "工号", dataType: "string", required: true, unique: true },
    { id: "o2", code: "position", label: "职位", dataType: "string", required: false, unique: false },
  ], status: "有效" },

  { id: "S-COR-001", code: "Entity", name: "业务实体", domainCode: "core", description: "跨域通用的业务实体抽象。", parentSchemaId: null, attributes: [
    { id: "co1", code: "id", label: "唯一标识", dataType: "string", required: true, unique: true },
    { id: "co2", code: "type", label: "实体类型", dataType: "string", required: false, unique: false },
  ], status: "有效" },
];

export const seedOntologyEntities: OntologyEntity[] = [
  { id: "E-AI-001", name: "GPT-4o", schemaCode: "AIModel", confidence: 96, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-002", name: "Claude-3.5", schemaCode: "AIModel", confidence: 94, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-003", name: "Llama-3-base", schemaCode: "FoundationModel", confidence: 90, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-004", name: "Mistral-7B-base", schemaCode: "FoundationModel", confidence: 88, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-005", name: "GPT-4o-turbo", schemaCode: "LargeLanguageModel", confidence: 93, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-006", name: "Claude-3.5-sonnet", schemaCode: "LargeLanguageModel", confidence: 91, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-007", name: "Qwen-max", schemaCode: "LargeLanguageModel", confidence: 87, status: "候选", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-008", name: "Wenxin-4", schemaCode: "LargeLanguageModel", confidence: 85, status: "候选", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-009", name: "Commons-Crawl", schemaCode: "Dataset", confidence: 97, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-010", name: "LAION-5B", schemaCode: "Dataset", confidence: 94, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-011", name: "MNBVC", schemaCode: "Dataset", confidence: 86, status: "候选", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-012", name: "TheStack", schemaCode: "Dataset", confidence: 92, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-013", name: "train-80", schemaCode: "DatasetSplit", confidence: 95, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-014", name: "validation-10", schemaCode: "DatasetSplit", confidence: 93, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-015", name: "test-10", schemaCode: "DatasetSplit", confidence: 93, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-016", name: "text-generation", schemaCode: "ModelTask", confidence: 98, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-017", name: "image-classification", schemaCode: "ModelTask", confidence: 94, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-018", name: "speech-recognition", schemaCode: "ModelTask", confidence: 89, status: "候选", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-019", name: "run-001", schemaCode: "TrainingRun", confidence: 91, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-020", name: "run-002", schemaCode: "TrainingRun", confidence: 87, status: "候选", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-021", name: "accuracy", schemaCode: "EvaluationMetric", confidence: 98, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-022", name: "BLEU-score", schemaCode: "EvaluationMetric", confidence: 95, status: "已确认", domainCode: "ai", boundTermIds: [] },
  { id: "E-AI-023", name: "ROUGE-L", schemaCode: "EvaluationMetric", confidence: 92, status: "已确认", domainCode: "ai", boundTermIds: [] },

  { id: "E-CUS-001", name: "零售客户", schemaCode: "Customer", confidence: 94, status: "已确认", domainCode: "customer", boundTermIds: [] },
  { id: "E-CUS-002", name: "企业客户", schemaCode: "Customer", confidence: 90, status: "已确认", domainCode: "customer", boundTermIds: [] },
  { id: "E-CUS-003", name: "金卡会员", schemaCode: "Member", confidence: 92, status: "已确认", domainCode: "customer", boundTermIds: [] },
  { id: "E-CUS-004", name: "银卡会员", schemaCode: "Member", confidence: 88, status: "已确认", domainCode: "customer", boundTermIds: [] },

  { id: "E-TRX-001", name: "有效订单", schemaCode: "Order", confidence: 96, status: "已确认", domainCode: "transaction", boundTermIds: [] },
  { id: "E-TRX-002", name: "已取消订单", schemaCode: "Order", confidence: 91, status: "已确认", domainCode: "transaction", boundTermIds: [] },
  { id: "E-TRX-003", name: "采购合同", schemaCode: "Contract", confidence: 89, status: "候选", domainCode: "transaction", boundTermIds: [] },

  { id: "E-PRD-001", name: "电子产品", schemaCode: "Product", confidence: 93, status: "已确认", domainCode: "product", boundTermIds: [] },
  { id: "E-PRD-002", name: "SKU-001", schemaCode: "SKU", confidence: 95, status: "已确认", domainCode: "product", boundTermIds: [] },
  { id: "E-PRD-003", name: "SKU-002", schemaCode: "SKU", confidence: 90, status: "已确认", domainCode: "product", boundTermIds: [] },

  { id: "E-FIN-001", name: "订单金额", schemaCode: "Amount", confidence: 96, status: "已确认", domainCode: "finance", boundTermIds: [] },
  { id: "E-FIN-002", name: "退款金额", schemaCode: "Amount", confidence: 89, status: "候选", domainCode: "finance", boundTermIds: [] },
  { id: "E-FIN-003", name: "采购成本", schemaCode: "Cost", confidence: 87, status: "候选", domainCode: "finance", boundTermIds: [] },

  { id: "E-ORG-001", name: "技术部", schemaCode: "Department", confidence: 95, status: "已确认", domainCode: "organization", boundTermIds: [] },
  { id: "E-ORG-002", name: "市场部", schemaCode: "Department", confidence: 93, status: "已确认", domainCode: "organization", boundTermIds: [] },
  { id: "E-ORG-003", name: "张三", schemaCode: "Employee", confidence: 94, status: "已确认", domainCode: "organization", boundTermIds: [] },
  { id: "E-ORG-004", name: "李四", schemaCode: "Employee", confidence: 91, status: "已确认", domainCode: "organization", boundTermIds: [] },

  { id: "E-COR-001", name: "业务实体", schemaCode: "Entity", confidence: 97, status: "已确认", domainCode: "core", boundTermIds: [] },
];

export const seedOntologyRelations: OntologyRelation[] = [
  { id: "R-AI-001", subject: "GPT-4o", predicate: "outperforms", object: "Claude-3.5", confidence: 92, domainCode: "ai" },
  { id: "R-AI-002", subject: "GPT-4o-turbo", predicate: "basedOn", object: "GPT-4o", confidence: 90, domainCode: "ai" },
  { id: "R-AI-003", subject: "Llama-3-base", predicate: "inspiredBy", object: "GPT-4o", confidence: 85, domainCode: "ai" },
  { id: "R-AI-004", subject: "Commons-Crawl", predicate: "contains", object: "train-80", confidence: 88, domainCode: "ai" },
  { id: "R-AI-005", subject: "text-generation", predicate: "relatedTo", object: "image-classification", confidence: 82, domainCode: "ai" },
  { id: "R-AI-006", subject: "run-001", predicate: "uses", object: "Commons-Crawl", confidence: 86, domainCode: "ai" },
  { id: "R-AI-007", subject: "accuracy", predicate: "correlatesWith", object: "BLEU-score", confidence: 94, domainCode: "ai" },
  { id: "R-AI-008", subject: "Wenxin-4", predicate: "competesWith", object: "GPT-4o-turbo", confidence: 80, domainCode: "ai" },

  { id: "R-CUS-001", subject: "金卡会员", predicate: "belongsTo", object: "零售客户", confidence: 90, domainCode: "customer" },
  { id: "R-CUS-002", subject: "银卡会员", predicate: "belongsTo", object: "零售客户", confidence: 85, domainCode: "customer" },
  { id: "R-CUS-003", subject: "金卡会员", predicate: "ranksAbove", object: "银卡会员", confidence: 92, domainCode: "customer" },
  { id: "R-CUS-004", subject: "零售客户", predicate: "classifiedAs", object: "企业客户", confidence: 88, domainCode: "customer" },
  { id: "R-CUS-005", subject: "银卡会员", predicate: "ranksBelow", object: "金卡会员", confidence: 80, domainCode: "customer" },

  { id: "R-TRX-001", subject: "有效订单", predicate: "associatedWith", object: "采购合同", confidence: 91, domainCode: "transaction" },
  { id: "R-TRX-002", subject: "已取消订单", predicate: "associatedWith", object: "采购合同", confidence: 84, domainCode: "transaction" },
  { id: "R-TRX-003", subject: "有效订单", predicate: "replaces", object: "已取消订单", confidence: 89, domainCode: "transaction" },
  { id: "R-TRX-004", subject: "采购合同", predicate: "governs", object: "有效订单", confidence: 82, domainCode: "transaction" },

  { id: "R-PRD-001", subject: "SKU-001", predicate: "belongsTo", object: "电子产品", confidence: 90, domainCode: "product" },
  { id: "R-PRD-002", subject: "SKU-002", predicate: "belongsTo", object: "电子产品", confidence: 88, domainCode: "product" },
  { id: "R-PRD-003", subject: "SKU-001", predicate: "replaces", object: "SKU-002", confidence: 82, domainCode: "product" },

  { id: "R-FIN-001", subject: "订单金额", predicate: "includes", object: "退款金额", confidence: 91, domainCode: "finance" },
  { id: "R-FIN-002", subject: "采购成本", predicate: "relatesTo", object: "订单金额", confidence: 85, domainCode: "finance" },
  { id: "R-FIN-003", subject: "退款金额", predicate: "reduces", object: "订单金额", confidence: 87, domainCode: "finance" },

  { id: "R-ORG-001", subject: "张三", predicate: "worksIn", object: "技术部", confidence: 90, domainCode: "organization" },
  { id: "R-ORG-002", subject: "李四", predicate: "worksIn", object: "市场部", confidence: 88, domainCode: "organization" },
  { id: "R-ORG-003", subject: "技术部", predicate: "collaboratesWith", object: "市场部", confidence: 85, domainCode: "organization" },

  { id: "R-COR-001", subject: "业务实体", predicate: "abstractedFrom", object: "GPT-4o", confidence: 95, domainCode: "core" },
  { id: "R-COR-002", subject: "业务实体", predicate: "generalizes", object: "零售客户", confidence: 88, domainCode: "core" },
  { id: "R-COR-003", subject: "业务实体", predicate: "relatesTo", object: "订单金额", confidence: 82, domainCode: "core" },
];

export const seedDomainMetrics: DomainMetric[] = [
  { id: "M-AI-001", name: "模型总量", code: "model_count", type: "计数", domainCode: "ai", definition: "平台已登记的 AI 模型总数。" },
  { id: "M-AI-002", name: "平均模型准确率", code: "avg_model_accuracy", type: "平均值", domainCode: "ai", definition: "所有 AI 模型在标准测试集上的平均准确率。" },
  { id: "M-AI-003", name: "推理延迟P50", code: "inference_latency_p50", type: "平均值", domainCode: "ai", definition: "AI 模型推理延迟的 P50 分位值（毫秒）。" },
  { id: "M-AI-004", name: "数据集总量", code: "dataset_count", type: "计数", domainCode: "ai", definition: "平台已登记的数据集总数。" },
  { id: "M-AI-005", name: "实验成功率", code: "experiment_success_rate", type: "比率", domainCode: "ai", definition: "模型训练实验中达到目标指标的比率。" },

  { id: "M-CUS-001", name: "客户总数", code: "total_customers", type: "计数", domainCode: "customer", definition: "平台登记的客户总数。" },
  { id: "M-CUS-002", name: "客户活跃度", code: "customer_activity_rate", type: "比率", domainCode: "customer", definition: "近 30 天有交易或登录行为的客户占比。" },
  { id: "M-CUS-003", name: "VIP客户占比", code: "vip_ratio", type: "比率", domainCode: "customer", definition: "VIP 客户占全部客户的比率。" },

  { id: "M-TRX-001", name: "订单总数", code: "total_orders", type: "计数", domainCode: "transaction", definition: "统计周期内全部订单数量。" },
  { id: "M-TRX-002", name: "交易金额", code: "total_gmv", type: "求和", domainCode: "transaction", definition: "统计周期内有效订单的成交金额合计。" },
  { id: "M-TRX-003", name: "订单转化率", code: "order_conversion_rate", type: "比率", domainCode: "transaction", definition: "从浏览到下单的转化率。" },

  { id: "M-PRD-001", name: "SKU数量", code: "sku_count", type: "计数", domainCode: "product", definition: "平台在售 SKU 总数。" },
  { id: "M-PRD-002", name: "产品数量", code: "product_count", type: "计数", domainCode: "product", definition: "平台登记的产品品类总数。" },

  { id: "M-FIN-001", name: "总金额", code: "total_amount", type: "求和", domainCode: "finance", definition: "统计周期内的交易金额合计。" },
  { id: "M-FIN-002", name: "平均金额", code: "avg_amount", type: "平均值", domainCode: "finance", definition: "单笔订单的平均成交金额。" },
  { id: "M-FIN-003", name: "成本降低率", code: "cost_reduction_rate", type: "比率", domainCode: "finance", definition: "成本优化后较基期降低的比率。" },
];

// ---------------- 默认状态装配 ----------------

export function createDefaultBusinessTermsState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    concepts: seedConcepts,
    terms: seedBusinessTerms,
    candidates: seedCandidates.filter((c) => c.kind === "business-term"),
    versions: seedVersions.filter((v) => v.standardId.startsWith("STD-BT")),
    workbench: {
      domains: seedOntologyDomains,
      schemas: seedOntologySchemas,
      entities: seedOntologyEntities,
      relations: seedOntologyRelations,
      metrics: seedDomainMetrics,
      initializedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultMasterDataState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    entities: seedMasterEntities,
    sourceRecords: seedMasterSourceRecords,
    goldenRecords: seedGoldenRecords,
    distributions: seedMasterDistributions,
    aiDecisions: seedAiDecisions.filter((a) => a.modelVersion.startsWith("MD")),
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultReferenceDataState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    datasets: seedReferenceDatasets,
    mappings: seedReferenceMappings,
    subscriptions: seedReferenceSubscriptions,
    distributions: seedReferenceDistributions,
    versionDiffs: seedReferenceVersionDiffs,
    aiStats: seedReferenceAiStats,
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultDataElementState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    standards: seedDataElements,
    bindings: seedDataElementBindings,
    candidates: seedCandidates.filter((c) => c.kind === "data-element"),
    auditBatches: seedAuditBatches,
    auditResults: seedAuditResults,
    issues: seedRemediationIssues,
    aiDecisions: seedAiDecisions.filter((a) => a.modelVersion.startsWith("DE")),
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultMetricState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    definitions: seedMetricDefinitions,
    semanticModels: seedSemanticModels,
    implementations: seedMetricImplementations,
    comparisons: seedMetricComparisons,
    candidates: seedCandidates.filter((c) => c.kind === "metric"),
    versions: seedVersions.filter((v) => v.standardId.startsWith("STD-MT")),
    updatedAt: new Date().toISOString(),
  };
}

export const DATA_STANDARD_SCOPES = {
  businessTerms: "data-agent.data-standard.business-terms",
  masterData: "data-agent.data-standard.master-data",
  referenceData: "data-agent.data-standard.reference-data",
  dataElement: "data-agent.data-standard.data-element",
  metric: "data-agent.data-standard.metric",
  audit: "data-agent.data-standard.audit",
  participation: "data-agent.data-standard.participation",
} as const;
