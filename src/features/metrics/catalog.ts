import type {
  CapabilityDefinition,
  DomainDefinition,
  DomainKey,
  EvaluationDirection,
  FreshnessStatus,
  HistoryGrain,
  MetricDefinition,
  MetricTarget,
  SourceMode,
  TrendPoint,
} from "./types";

export const DOMAINS: DomainDefinition[] = [
  { key: "strategy", slug: "strategy", label: "数据战略", enLabel: "Strategy", description: "以目标、任务和评估量化战略落地成效。" },
  { key: "governance", slug: "governance", label: "数据治理", enLabel: "Governance", description: "监督治理机制、问题闭环与数据责任落实。" },
  { key: "architecture", slug: "architecture", label: "数据架构", enLabel: "Architecture", description: "评价模型、分布、集成共享与元数据管理。" },
  { key: "assets", slug: "assets", label: "数据资产", enLabel: "Assets", description: "跟踪目录、使用、权属、估值和运营价值。" },
  { key: "standards", slug: "standards", label: "数据标准", enLabel: "Standards", description: "监控术语、主数据、参考数据、数据元与指标口径。" },
  { key: "quality", slug: "quality", label: "数据质量", enLabel: "Quality", description: "从需求、检查、分析到提升管理质量问题。" },
  { key: "security", slug: "security", label: "数据安全", enLabel: "Security", description: "量化合规、防护、审计与事件响应。" },
  { key: "lifecycle", slug: "lifecycle", label: "数据生命周期", standardLabel: "标准名称：数据生存周期", enLabel: "Lifecycle", description: "跟踪数据需求、设计开发、运维与退役归档。" },
  { key: "application", slug: "application-circulation", label: "数据应用流通", enLabel: "Application", description: "评价数据应用、外部数据、开放和服务效果。" },
];

export const CAPABILITIES: CapabilityDefinition[] = [
  { id: "6.1", domain: "strategy", name: "数据战略规划", diagnosticMetrics: ["可量化战略目标覆盖率"] },
  { id: "6.2", domain: "strategy", name: "数据战略实施", diagnosticMetrics: ["战略任务按期完成率"] },
  { id: "6.3", domain: "strategy", name: "数据战略评估", diagnosticMetrics: ["战略评估按期完成率"] },
  { id: "7.1", domain: "governance", name: "数据治理组织", diagnosticMetrics: ["治理职责履行率"] },
  { id: "7.2", domain: "governance", name: "数据制度建设", diagnosticMetrics: ["数据制度执行符合率"] },
  { id: "7.3", domain: "governance", name: "数据文化建设", diagnosticMetrics: ["数据素养培训覆盖率"] },
  { id: "8.1", domain: "architecture", name: "数据模型", diagnosticMetrics: ["模型复用率"] },
  { id: "8.2", domain: "architecture", name: "数据分布", diagnosticMetrics: ["数据分布关系完整率", "权威数据源识别率"] },
  { id: "8.3", domain: "architecture", name: "数据集成与共享", diagnosticMetrics: ["数据集成任务成功率"] },
  { id: "8.4", domain: "architecture", name: "元数据管理", diagnosticMetrics: ["元数据更新及时率"] },
  { id: "9.1", domain: "assets", name: "权属管理", diagnosticMetrics: ["权属确认率"] },
  { id: "9.2", domain: "assets", name: "价值评估", diagnosticMetrics: ["有效估值覆盖率"] },
  { id: "9.3", domain: "assets", name: "资产运营", diagnosticMetrics: ["资产运营收益增长率"] },
  { id: "10.1", domain: "standards", name: "业务术语", diagnosticMetrics: ["术语变更及时率"] },
  { id: "10.2", domain: "standards", name: "主数据", diagnosticMetrics: ["主数据标准符合率"] },
  { id: "10.3", domain: "standards", name: "参考数据", diagnosticMetrics: ["参考数据同步一致率"] },
  { id: "10.4", domain: "standards", name: "数据元", diagnosticMetrics: ["数据元标准符合率"] },
  { id: "10.5", domain: "standards", name: "指标数据", diagnosticMetrics: ["指标血缘完整率"] },
  { id: "11.1", domain: "quality", name: "数据质量需求", diagnosticMetrics: ["质量需求覆盖率"] },
  { id: "11.2", domain: "quality", name: "数据质量检查", diagnosticMetrics: ["规则执行成功率"] },
  { id: "11.3", domain: "quality", name: "数据质量分析", diagnosticMetrics: ["经济影响评估覆盖率"] },
  { id: "11.4", domain: "quality", name: "数据质量提升", diagnosticMetrics: ["主动发现率", "重复发生率"] },
  { id: "12.1", domain: "security", name: "数据合规管理", diagnosticMetrics: ["合规评估覆盖率"] },
  { id: "12.2", domain: "security", name: "数据安全防护", diagnosticMetrics: ["防护策略执行覆盖率"] },
  { id: "12.3", domain: "security", name: "数据安全审计", diagnosticMetrics: ["审计证据缺口闭环率"] },
  { id: "13.1", domain: "lifecycle", name: "数据需求", diagnosticMetrics: ["数据需求按期完成率"] },
  { id: "13.2", domain: "lifecycle", name: "数据设计与开发", diagnosticMetrics: ["设计开发符合率"] },
  { id: "13.3", domain: "lifecycle", name: "数据运维", diagnosticMetrics: ["数据任务成功率"] },
  { id: "13.4", domain: "lifecycle", name: "数据退役", diagnosticMetrics: ["退役策略执行率", "归档恢复验证通过率"] },
  { id: "14.1", domain: "application", name: "数据应用", diagnosticMetrics: ["数据应用收益达成率"] },
  { id: "14.2", domain: "application", name: "外部数据管理", diagnosticMetrics: ["外部数据 SLA 达标率"] },
  { id: "14.3", domain: "application", name: "数据开放", diagnosticMetrics: ["开放数据质量达标率"] },
  { id: "14.4", domain: "application", name: "数据服务", diagnosticMetrics: ["数据服务成功率"] },
];

const DAY_PERIODS = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 7, 13 - (29 - index)));
  const iso = date.toISOString().slice(0, 10);
  return { period: iso, label: iso.slice(5) };
});
const WEEK_PERIODS = Array.from({ length: 12 }, (_, index) => ({ period: `2026-W${String(21 + index).padStart(2, "0")}`, label: `W${21 + index}` }));
const MONTH_PERIODS = ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"].map((period) => ({ period, label: period.slice(2) }));

function buildPoints(periods: { period: string; label: string }[], current: number, seed: number, amplitude: number): TrendPoint[] {
  return periods.map((item, index) => {
    if (index === periods.length - 1) return { ...item, value: current };
    const distance = periods.length - 1 - index;
    const wave = Math.sin((index + seed) * 0.82) * amplitude;
    const slope = distance * amplitude * 0.035;
    return { ...item, value: Number(Math.max(0, current - slope + wave).toFixed(2)) };
  });
}

function history(current: number, seed: number, amplitude: number): Record<HistoryGrain, TrendPoint[]> {
  return {
    day: buildPoints(DAY_PERIODS, current, seed, amplitude * 0.5),
    week: buildPoints(WEEK_PERIODS, current, seed + 3, amplitude),
    month: buildPoints(MONTH_PERIODS, current, seed + 6, amplitude * 1.35),
  };
}

type MetricSeed = Omit<MetricDefinition, "core" | "history" | "status" | "calculatedAt" | "period"> & {
  status: MetricDefinition["status"];
  amplitude: number;
  seed: number;
};

function metric(seed: MetricSeed): MetricDefinition {
  return {
    ...seed,
    core: true,
    period: "2026-08-13",
    calculatedAt: "2026-08-13 08:00:00",
    history: history(seed.currentValue ?? 0, seed.seed, seed.amplitude),
  };
}

const evidence = (prefix: string, count = 2) => Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(3, "0")}`);

export const DEFAULT_METRICS: MetricDefinition[] = [
  metricSeed("strategy-goal", "strategy", ["6.1", "6.2", "6.3"], "数据战略目标达成率", "各战略目标按批准权重加权后的完成程度，单项目标最高按 100% 计。", "Σ(目标权重 × 完成系数) ÷ Σ目标权重", "higher", "manual", "%", 1, 86.4, { label: "≥ 90%", value: 90, warningValue: 85 }, "warning", "fresh", "2026-08-12 18:00:00", "战略规划组", evidence("STRATEGY-OBJECTIVE"), ["可量化战略目标覆盖率", "战略评估按期完成率"], 1, 4.2),
  metricSeed("strategy-deviation", "strategy", ["6.2", "6.3"], "战略实施偏差率", "战略任务实际进度与计划进度绝对偏差的加权结果。", "Σ(任务权重 × |实际进度-计划进度|) ÷ Σ任务权重", "lower", "automatic", "%", 1, 12.6, { label: "≤ 10%", value: 10, warningValue: 15 }, "warning", "fresh", "2026-08-13 07:45:00", "战略推进办公室", evidence("STRATEGY-TASK", 3), ["战略任务按期完成率"], 2, 3.1),
  metricSeed("governance-meetings", "governance", ["7.1", "7.2"], "治理会议频次", "具备议题、参会记录、决议和纪要的有效治理会议数。", "统计周期内有效治理会议数", "range", "manual", "次/月", 0, 1, { label: "每月 1–2 次", min: 1, max: 2, warningMin: 0, warningMax: 3 }, "met", "fresh", "2026-08-08 17:30:00", "数据治理办公室", evidence("GOV-MEETING"), ["治理职责履行率", "数据制度执行符合率"], 3, 0.45),
  metricSeed("governance-closure", "governance", ["7.2"], "治理问题闭环率", "到期且完成处理验证的问题占应闭环问题的比例，包含历史逾期结转。", "已闭环治理问题数 ÷ 应闭环治理问题总数 × 100%", "higher", "automatic", "%", 1, 91.8, { label: "≥ 95%", value: 95, warningValue: 90 }, "warning", "fresh", "2026-08-13 07:50:00", "治理运营组", evidence("GOV-ISSUE", 3), ["治理问题逾期率"], 4, 4),
  metricSeed("governance-steward", "governance", ["7.1", "7.3"], "数据管家覆盖率", "配置有效任期数据管家的关键数据对象占比。", "已配置有效数据管家的关键对象数 ÷ 关键对象总数 × 100%", "higher", "automatic", "%", 1, 93.0, { label: "≥ 90%", value: 90, warningValue: 85 }, "met", "fresh", "2026-08-13 07:40:00", "数据责任管理组", evidence("STEWARD"), ["数据素养培训覆盖率"], 5, 3.2),
  metricSeed("architecture-metadata", "architecture", ["8.2", "8.4"], "元数据自动采集覆盖率", "通过自动采集获得有效技术元数据的纳管对象占比。", "自动采集有效对象数 ÷ 应自动采集对象总数 × 100%", "higher", "automatic", "%", 1, 96.2, { label: "≥ 95%", value: 95, warningValue: 90 }, "met", "fresh", "2026-08-13 06:30:00", "企业架构组", evidence("META-SCAN", 3), ["数据分布关系完整率", "权威数据源识别率", "元数据更新及时率"], 6, 3.5),
  metricSeed("architecture-model-review", "architecture", ["8.1", "8.3"], "模型规范评审通过率", "首次评审通过的数据模型占完成首次评审模型的比例。", "首次评审通过模型数 ÷ 完成首次评审模型总数 × 100%", "higher", "automatic", "%", 1, 87.5, { label: "≥ 90%", value: 90, warningValue: 85 }, "warning", "fresh", "2026-08-12 19:10:00", "数据模型组", evidence("MODEL-REVIEW", 3), ["模型复用率", "数据集成任务成功率"], 7, 4.2),
  metricSeed("asset-catalog", "assets", ["9.1", "9.3"], "资产目录完整率", "必填目录信息完整且通过校验的有效数据资产占比。", "完整有效资产数 ÷ 纳管有效资产总数 × 100%", "higher", "automatic", "%", 1, 98.4, { label: "≥ 98%", value: 98, warningValue: 95 }, "met", "fresh", "2026-08-13 07:10:00", "资产管理组", evidence("ASSET-CATALOG"), ["权属确认率"], 8, 2.2),
  metricSeed("asset-usage", "assets", ["9.3"], "资产使用率", "近 90 天发生过授权范围内有效使用的可用资产占比。", "近 90 天被有效使用资产数 ÷ 可用资产总数 × 100%", "higher", "automatic", "%", 1, 57.8, { label: "≥ 60%", value: 60, warningValue: 55 }, "warning", "fresh", "2026-08-13 07:20:00", "资产运营组", evidence("ASSET-USAGE", 3), ["资产运营收益增长率"], 9, 5.6),
  metricSeed("asset-value-growth", "assets", ["9.2", "9.3"], "资产价值增长率", "固定可比资产集合的本期有效估值相对基期增长。", "(本期可比资产有效估值-基期估值) ÷ 基期估值 × 100%", "trend", "manual", "%", 1, 12.4, { label: "同比增长 ≥ 10%", min: 10, max: 30, warningMin: 5, warningMax: 40 }, "met", "expiring", "2026-07-31 18:00:00", "价值评估组", evidence("ASSET-VALUATION", 3), ["有效估值覆盖率"], 10, 5),
  metricSeed("standards-landing", "standards", ["10.2", "10.3", "10.4"], "关键标准落标率", "引用生效标准且通过符合性校验的关键数据对象占比。", "已符合关键对象数 ÷ 应落标关键对象总数 × 100%", "higher", "automatic", "%", 1, 93.4, { label: "≥ 95%", value: 95, warningValue: 90 }, "warning", "fresh", "2026-08-13 06:50:00", "数据标准组", evidence("STANDARD-LANDING", 3), ["主数据标准符合率", "参考数据同步一致率", "数据元标准符合率"], 11, 4.1),
  metricSeed("standards-terms", "standards", ["10.1"], "业务术语覆盖率", "具有批准术语定义的关键业务概念占比。", "已批准术语关键概念数 ÷ 应管理关键概念总数 × 100%", "higher", "automatic", "%", 1, 91.2, { label: "≥ 90%", value: 90, warningValue: 85 }, "met", "fresh", "2026-08-12 20:00:00", "业务术语组", evidence("TERM"), ["术语变更及时率"], 12, 3.3),
  metricSeed("standards-indicator", "standards", ["10.5"], "指标口径一致率", "跨系统指标组名称、定义、公式、粒度、周期和维度全部一致的比例。", "一致指标组数 ÷ 应统一指标组总数 × 100%", "higher", "automatic", "%", 1, 96.8, { label: "≥ 98%", value: 98, warningValue: 95 }, "warning", "fresh", "2026-08-13 07:00:00", "指标管理组", evidence("INDICATOR-DEFINITION", 3), ["指标血缘完整率"], 13, 3.6),
  metricSeed("quality-discovered", "quality", ["11.2", "11.3"], "数据质量问题发现数", "新增且经过确认和去重的问题数，区分主动发现、重复发生和严重等级。", "统计周期内确认去重后的新增质量问题数", "trend", "automatic", "个/日", 0, 22, { label: "正常区间 15–28", min: 15, max: 28, warningMin: 10, warningMax: 36 }, "met", "fresh", "2026-08-13 07:30:00", "质量运营组", evidence("QUALITY-ISSUE", 3), ["主动发现率", "重复发生率", "经济影响评估覆盖率"], 14, 7),
  metricSeed("quality-repair-time", "quality", ["11.3", "11.4"], "平均质量问题修复时长", "通过修复验证的问题从确认到验证通过的平均时长。", "Σ修复验证耗时 ÷ 已验证问题数", "lower", "automatic", "小时", 1, 52, { label: "≤ 48 小时", value: 48, warningValue: 60 }, "warning", "fresh", "2026-08-13 07:30:00", "质量改进组", evidence("QUALITY-REPAIR", 3), ["P90 修复时长", "未关闭问题账龄"], 15, 9),
  metricSeed("quality-closure", "quality", ["11.4"], "质量问题闭环率", "到期且通过修复验证的问题占应闭环问题的比例。", "已验证闭环问题数 ÷ 应闭环问题总数 × 100%", "higher", "automatic", "%", 1, 92.4, { label: "≥ 95%", value: 95, warningValue: 90 }, "warning", "fresh", "2026-08-13 07:30:00", "质量改进组", evidence("QUALITY-CLOSURE", 3), ["重复发生率"], 16, 4.2),
  metricSeed("quality-rule", "quality", ["11.1", "11.2"], "质量规则覆盖率", "由启用且成功执行的规则覆盖的数据质量需求占比。", "已覆盖质量需求数 ÷ 纳管质量需求总数 × 100%", "higher", "automatic", "%", 1, 97.1, { label: "≥ 95%", value: 95, warningValue: 90 }, "met", "fresh", "2026-08-13 06:40:00", "质量规则组", evidence("QUALITY-RULE", 3), ["质量需求覆盖率", "规则执行成功率"], 17, 3.1),
  metricSeed("security-classification", "security", ["12.1", "12.2"], "分类分级覆盖率", "具有生效、版本化分类分级记录的数据项占比。", "生效分类分级数据项数 ÷ 应分类分级数据项总数 × 100%", "higher", "automatic", "%", 1, 94.2, { label: "≥ 95%", value: 95, warningValue: 90 }, "warning", "fresh", "2026-08-13 06:20:00", "分类分级组", evidence("SEC-CLASS", 3), ["合规评估覆盖率", "防护策略执行覆盖率"], 18, 4),
  metricSeed("security-audit", "security", ["12.3"], "审计日志完整性", "已采集且通过必填字段、连续性和完整性校验的应采集事件占比。", "完整审计事件数 ÷ 应采集事件总数 × 100%", "higher", "automatic", "%", 2, 99.72, { label: "≥ 99.9%", value: 99.9, warningValue: 99.5 }, "warning", "fresh", "2026-08-13 07:55:00", "安全审计组", evidence("SEC-AUDIT", 4), ["审计证据缺口闭环率"], 19, 0.35),
  metricSeed("security-response", "security", ["12.2", "12.3"], "安全事件响应时长", "已确认安全事件从确认到完成初步遏制的时长，按严重等级评价。", "各严重等级事件确认至初步遏制耗时", "lower", "automatic", "分钟", 0, 42, { label: "按 S1–S4 SLA", value: 30, warningValue: 45 }, "warning", "fresh", "2026-08-13 07:35:00", "安全响应组", evidence("SEC-INCIDENT", 3), ["S1–S4 SLA 达标率", "P90 响应时长"], 20, 11),
  metricSeed("lifecycle-archive", "lifecycle", ["13.4"], "数据归档率", "按策略应归档且完成完整性和可恢复性验证的数据对象占比。", "已验证归档对象数 ÷ 应归档对象总数 × 100%", "higher", "automatic", "%", 1, 88.6, { label: "≥ 95%", value: 95, warningValue: 90 }, "unmet", "fresh", "2026-08-13 05:50:00", "数据运维组", evidence("ARCHIVE-BATCH", 3), ["退役策略执行率", "归档恢复验证通过率"], 21, 6),
  metricSeed("lifecycle-sla", "lifecycle", ["13.1", "13.2", "13.3"], "数据 SLA 达标率", "满足数据提供及时性、可用性和质量约定的有效测量窗口占比。", "达标 SLA 测量窗口数 ÷ 全部应测量窗口数 × 100%", "higher", "automatic", "%", 1, 98.7, { label: "≥ 99%", value: 99, warningValue: 98 }, "warning", "fresh", "2026-08-13 07:25:00", "数据运维组", evidence("DATA-SLA", 4), ["数据需求按期完成率", "设计开发符合率", "数据任务成功率"], 22, 1.2),
  metricSeed("application-api", "application", ["14.1", "14.3", "14.4"], "API 调用量", "数据服务产生的有效调用事件数，区分成功、失败、拒绝和调用方。", "统计周期内 API 有效调用事件数", "trend", "automatic", "次/日", 0, 186420, { label: "正常区间 12万–18万", min: 120000, max: 180000, warningMin: 90000, warningMax: 220000 }, "warning", "fresh", "2026-08-13 07:58:00", "数据服务组", evidence("API-AUDIT", 4), ["数据服务成功率", "开放数据质量达标率", "重复请求率"], 23, 28000),
  metricSeed("application-satisfaction", "application", ["14.1", "14.4"], "数据服务满意度", "有效评价得分占满分比例，同时披露样本量和响应率。", "有效评价得分合计 ÷ 满分合计 × 100%", "higher", "manual", "%", 1, 82.6, { label: "≥ 85%", value: 85, warningValue: 80 }, "warning", "expired", "2026-07-15 18:00:00", "数据产品运营组", evidence("SERVICE-SURVEY", 2), ["有效样本量", "评价响应率", "数据应用收益达成率"], 24, 5),
  metricSeed("application-external", "application", ["14.2"], "外部数据接入数", "完成需求评估、合规与安全校验并正式接入的不同外部数据集数量。", "统计周期内正式接入的不同外部数据集数", "range", "manual", "个/季", 0, 7, { label: "季度计划 6–10 个", min: 6, max: 10, warningMin: 4, warningMax: 12 }, "met", "fresh", "2026-08-11 18:00:00", "外部数据管理组", evidence("EXTERNAL-DATA", 3), ["外部数据 SLA 达标率"], 25, 2.1),
];

function metricSeed(
  id: string,
  domain: DomainKey,
  capabilityIds: string[],
  name: string,
  definition: string,
  formula: string,
  direction: EvaluationDirection,
  sourceMode: SourceMode,
  unit: string,
  decimals: number,
  currentValue: number,
  target: MetricTarget,
  status: MetricDefinition["status"],
  freshness: FreshnessStatus,
  sourceTime: string,
  owner: string,
  evidenceRefs: string[],
  diagnostics: string[],
  seed: number,
  amplitude: number,
): MetricDefinition {
  return metric({ id, domain, capabilityIds, name, definition, formula, direction, sourceMode, unit, decimals, currentValue, target, status, freshness, sourceTime, owner, evidenceRefs, diagnostics, seed, amplitude });
}

export function getDomain(key: DomainKey) {
  return DOMAINS.find((domain) => domain.key === key) ?? DOMAINS[0];
}

export function isDomainKey(value: string): value is DomainKey {
  return DOMAINS.some((domain) => domain.key === value || domain.slug === value);
}

export function domainFromSlug(slug: string): DomainKey | null {
  return DOMAINS.find((domain) => domain.slug === slug)?.key ?? null;
}
