# Data Governance · Design

本 feature 基于行业数据治理平台（WeData、DataWorks 治理中心模式）与 GB/T 36073—2025 DCMM 第4级（量化管理级）要求重构，覆盖三个产品子模块：治理中心（DCMM 7 数据治理域）、元数据与血缘（DCMM 8.4 元数据管理）、数据质量（DCMM 11 数据质量域）。数据标准正文不在本 feature 维护，仅保存稳定引用。

术语边界详见 `CONTEXT.md` 的"数据治理术语区分"：本模块的"数据治理产品模块"沿用行业惯例命名，不等于"DCMM 数据治理能力域"；DCMM 数据治理能力域（组织/制度/文化）由本模块治理中心承载管理面，由量化看板 `/metrics/governance` 承载 KPI。

## 路由与页面 · Routes and Pages

路由由 `src/features/data-governance/routes.tsx` 导出，并由 `src/app/router.tsx` 组合。`/data-governance` 默认重定向到 `/data-governance/center`。

| Route | Page | 子模块 | 责任 |
|---|---|---|---|
| `/data-governance/center` | `GovernanceCenterPage` | 治理中心 | 治理大盘 + 个人工作台 |
| `/data-governance/center/organization` | `GovernanceOrganizationPage` | 治理中心 | 治理组织、岗位与认责总览 |
| `/data-governance/center/regulation` | `GovernanceRegulationPage` | 治理中心 | 制度库与执行监控 |
| `/data-governance/center/culture` | `GovernanceCulturePage` | 治理中心 | 数据文化推广与成效 |
| `/data-governance/metadata` | `MetadataMapPage` | 元数据 | 检索、对象详情与血缘 |
| `/data-governance/metadata/model` | `MetaModelPage` | 元数据 | 元模型配置 |
| `/data-governance/metadata/quality` | `MetadataQualityPage` | 元数据 | 元数据质量评价 |
| `/data-governance/metadata/reports` | `MetadataReportPage` | 元数据 | 元数据管理报告 |
| `/data-governance/quality` | `QualityOverviewPage` | 数据质量 | 质量概览、可信度与趋势 |
| `/data-governance/quality/requirements` | `QualityRequirementPage` | 数据质量 | 质量需求矩阵 |
| `/data-governance/quality/rules` | `QualityRulePage` | 数据质量 | 规则库、剖析与检查执行 |
| `/data-governance/quality/issues` | `QualityIssuePage` | 数据质量 | 质量问题工作台与闭环 |
| `/data-governance/quality/analysis` | `QualityAnalysisPage` | 数据质量 | 质量分析与根因 |
| `/data-governance/quality/improvement` | `QualityImprovementPage` | 数据质量 | 质量改进报告 |

原 `/data-governance/metadata` 与 `/data-governance/quality` 路由保留，但语义升级：`/metadata` 由纯检索页升级为检索+详情+血缘；`/quality` 由规则 CRUD 页升级为质量概览，原规则 CRUD 移至 `/quality/rules`。

## 领域模型 · Domain Model

```ts
type GovernanceStatus = "draft" | "pending" | "approved" | "active" | "deprecated";

// 元数据子模块
type MetadataObjectType = "table" | "metric" | "task" | "service" | "source" | "model" | "api" | "report";

interface MetaModel {
  id: string;
  objectType: MetadataObjectType;
  displayName: string;
  attributes: MetaModelAttribute[];
  relations: MetaModelRelation[];
  collectionRules: CollectionRule[];
  qualityIndicators: QualityIndicator[];
  status: GovernanceStatus;
  version: string;
}

interface MetaModelAttribute {
  id: string;
  name: string;
  group: "technical" | "business" | "management";
  required: boolean;        // 完整性依据
  collected: boolean;        // 时效性依据
  valueConstraint?: string;  // 准确性依据
}

interface MetadataObject {
  id: string;
  modelId: string;            // 引用元模型
  objectType: MetadataObjectType;
  name: string;
  attributes: Record<string, string>;  // 按元模型属性集渲染
  ownerId: string;            // 认责字段：数据所有者
  managerId: string;          // 认责字段：数据管理者
  accountabilityStatus: "assigned" | "unassigned" | "pending";
  status: GovernanceStatus;
  updatedAt: string;
}

interface MetadataQualityBatch {
  id: string;
  triggeredAt: string;
  scope: { objectTypes: MetadataObjectType[]; domains: string[] };
  modelVersionId: string;     // 评分依据快照
  results: MetadataQualityResult[];
  status: "running" | "completed";
}

interface MetadataQualityResult {
  objectId: string;
  completeness: number;
  accuracy: number;
  timeliness: number;
  totalScore: number;
  grade: "excellent" | "good" | "needs-improvement" | "unqualified";
  missingItems: string[];
}

// 数据质量子模块
type QualityDimension = "completeness" | "accuracy" | "timeliness" | "consistency" | "uniqueness";

interface QualityRequirement {
  id: string;
  objectId: string;
  dimension: QualityDimension;
  indicator: string;
  target: string;
  priority: "P0" | "P1" | "P2" | "P3";
  context: string;            // 信息环境上下文
  status: GovernanceStatus;
}

interface QualityRule {
  id: string;
  requirementId?: string;
  name: string;
  dimension: QualityDimension;
  target: string;
  threshold: string;
  score: string;
  owner: string;
  status: "enabled" | "disabled" | "running" | "passed" | "failed";
  updatedAt: string;
}

interface QualityIssue {
  id: string;
  objectId: string;
  ruleId: string;
  dimension: QualityDimension;
  severity: "P0" | "P1" | "P2" | "P3";
  status: "discovered" | "confirmed" | "dispatched" | "rectifying" | "recheck" | "closed";
  discoveredAt: string;
  confirmer?: string;
  assignee?: string;          // 认责管理者
  rectifyAction?: string;
  recheckResult?: "passed" | "failed";
  closedBy?: string;
  closedAt?: string;
  evidenceRefs: string[];
}

// 治理中心子模块
interface GovernanceRole {
  id: string;
  name: string;
  level: "decision" | "management" | "execution";
  responsibilities: string[];
  requirements: string;
}

interface GovernanceRegulation {
  id: string;
  tier: "policy" | "measure" | "rule";   // 政策/办法/细则
  title: string;
  capabilityDomains: string[];           // 覆盖的 DCMM 能力域
  version: string;
  status: GovernanceStatus;
  publishedAt: string;
}

interface RegulationExecutionBatch {
  id: string;
  regulationVersionId: string;
  scope: string;
  executedAt: string;
  results: { regulationId: string; result: "passed" | "partial" | "not-executed" | "deviation"; score: number; deviation?: string }[];
  status: "running" | "completed";
}

interface CultureActivity {
  id: string;
  type: "value" | "commitment" | "communication" | "training" | "benchmark";
  title: string;
  date: string;
  participants: number;
  effectivenessScore?: number;   // L4 量化
}
```

元数据对象通过 `modelId` 引用元模型；元数据对象、质量规则、质量问题通过 `objectId` / `target` 关联同一治理对象；质量问题 `assignee` 自动取自元数据对象的 `managerId`（认责字段，D2 联动）；治理对象应能关联 `lineageId`、`sourceId`、`tableId`、`metricId`、`assetId`、`standardId`、`standardVersionId` 和 `ontologyConceptId`；标准正文和审批历史由独立 `data-standard` feature 权威维护。

## 跨模块关系 · Cross-module Relationships

```text
数据源/同步 → 湖表/文件 → 元数据/血缘 → 质量治理 → 数据资产/数据服务
                         ↘ 数据标准引用与落标稽核
                         ↘ 调度任务与运行监控
治理中心(组织/制度/文化) ──认责总览──→ 元数据对象认责字段
                          ──制度覆盖──→ 各能力域执行监控
                          ──KPI──→ /metrics/governance (引用不重复)
质量问题分发 ──assignee──→ 元数据对象 managerId (认责管理者)
质量问题闭环 ──趋势/根因──→ /metrics/quality (引用不重复)
元数据质量评价 ──指标──→ /metrics/architecture (引用不重复)
```

治理页面负责治理对象、元模型、元数据质量、数据质量规则和问题的展示与编辑；扫描、采集、剖析、规则执行、血缘计算和制度执行通过 mock 批次呈现，不接真实执行引擎。标准对象、版本和审批位于独立数据标准域，双方通过稳定引用关联。

## UX 与安全 · UX and Security

- 所有规则启停、对象删除、问题关闭都要有确认和结果反馈。
- 质量问题闭环遵循职责分离：确认人 ≠ 处置人 ≠ 复核人，处置人不得自行关闭；紧急可先处置但必须补录授权和原因。
- 元数据认责字段在元数据对象详情编辑并回写；治理组织面通过对象 ID 聚合认责总览，不重复维护认责事实。
- 所有 AI 辅助（业务元数据补充、符合性异常检测、血缘追踪、规则推荐、需求矩阵识别）为 mock 建议，需人工确认后回写，保留确认人和时间。
- 权限以服务端为准；L4 量化指标引用 `/metrics/governance`、`/metrics/quality`、`/metrics/architecture`，不在本 feature 重复计算。

## 页面信息架构 · Page Information Architecture

每个页面须根据用户核心任务、业务对象关系和决策路径设计信息架构，不得统一退化为"顶部四指标 + CRUD 列表"的通用布局。可以复用按钮、面板、状态徽标、筛选器等交互原语，但不得复用会固定整页结构的通用业务页面壳。

### 治理中心子模块

#### `/data-governance/center` · 治理大盘 + 个人工作台

- 核心任务：跨组织/制度/文化概览治理健康度，并驱动个人日常治理待办。
- 主结构：上半部治理大盘（组织健康度、制度覆盖、文化成效、治理问题四象限概览 + KPI 摘要引用 metrics），下半部个人工作台（按角色展示认领待办、待确认 AI 建议、待复检问题、待审阅报告）。
- 关键决策信息：各域能力项就绪度、未闭环问题数、逾期整改、AI 建议待确认数。
- 布局差异：本页是唯一采用"概览+待办"双区结构的页面；其余治理中心页面是单主题工作台。

#### `/data-governance/center/organization` · 治理组织与认责总览

- 核心任务：管理三级治理组织、岗位职责，并监控认责覆盖与业务部门量化考核。
- 主结构：左侧三级组织架构树（决策/管理/执行）+ 岗位职责详情；右侧认责总览（按业务部门统计认责覆盖率、未认责对象清单、异常清单、L4 业务部门量化考核评分）。
- 关键决策信息：组织层级完整性、认责覆盖率、未认责对象、业务部门考核得分。
- 布局差异：采用"组织树 + 认责总览"主从结构，不是 CRUD 列表；认责字段编辑跳转元数据对象详情，不在本页编辑。

#### `/data-governance/center/regulation` · 制度库与执行监控

- 核心任务：管理三层制度文档（政策/办法/细则），并监控执行情况与偏差。
- 主结构：左侧制度库（按三层分类的文档树 + 版本 + 起草审核发布流程）；右侧执行监控（执行批次列表 + 符合度评分 + 偏差明细 + 整改事项）。
- 关键决策信息：制度覆盖能力域、执行符合度、偏差项、整改状态。
- 布局差异：采用"文档库 + 执行监控"双区结构；执行监控以批次卡片+偏差清单呈现，不是通用 CRUD。

#### `/data-governance/center/culture` · 文化推广与成效

- 核心任务：管理数据文化推广活动并量化成效。
- 主结构：顶部文化价值观与领导力承诺；中部宣贯培训与标杆案例时间线；底部文化成效量化指标看板（L4）。
- 关键决策信息：活动覆盖率、参与人数、成效评分、标杆案例数。
- 布局差异：采用"价值观 + 活动时间线 + 成效看板"叙事结构，不是列表页。

### 元数据子模块

#### `/data-governance/metadata` · 元数据检索、详情与血缘（升级）

- 核心任务：统一检索治理对象，从业务/技术属性和上下游依赖理解它。
- 主结构：三栏数据地图——左检索结果列表（按元模型对象类型筛选）、中对象说明（按元模型属性集分组渲染 + 认责字段编辑回写 D2）、右血缘影响（按关系类型渲染 + 影响分析 + L4 AI 血缘追踪建议）。
- 关键决策信息：对象属性完整度、认责状态、血缘影响范围、AI 追踪建议。
- 布局差异：保留现有三栏数据地图，但属性按元模型渲染、血缘按关系类型展示、认责字段可编辑；新增 AI 辅助建议区。

#### `/data-governance/metadata/model` · 元模型配置（新增）

- 核心任务：定义元数据管理的对象类型、属性集、关系类型和采集规则。
- 主结构：四象限配置——对象类型定义、属性集定义（按技术/业务/管理分组，标注必填/采集/值域作为质量依据）、关系类型定义（源/目标类型/方向/影响权重）、采集规则配置（来源/方式/频率/字段映射 + 采集任务状态）。
- 关键决策信息：类型覆盖率、属性约束完整度、关系类型合法性、采集任务运行状态。
- 布局差异：采用四象限配置工作台，不是 CRUD 列表；每象限是独立配置面板。

#### `/data-governance/metadata/quality` · 元数据质量评价（新增）

- 核心任务：按元模型指标评价元数据本身的质量（准确/完整/时效），驱动整改闭环。
- 主结构：顶部三维评分概览（完整性/准确性/时效性 + 趋势）；中部评价批次列表（不可覆盖，引用元模型版本）；底部质量问题闭环（绑定对象+属性+维度，联动认责管理者）+ L4 AI 辅助（业务元数据补充建议、符合性异常检测命中）。
- 关键决策信息：三维评分趋势、不合格对象、缺失项明细、AI 建议待确认数。
- 布局差异：采用"评分概览 + 批次 + 问题闭环"三层结构；与数据质量页（`/quality`）评价对象不同，不混合。

#### `/data-governance/metadata/reports` · 元数据管理报告（新增 L4）

- 核心任务：定期冻结元数据管理量化指标和工作报告。
- 主结构：版本化报告列表 + 报告详情（量化指标：采集覆盖率/质量分/血缘完整率 + 趋势 + 差距 + 改进）。
- 关键决策信息：指标达标情况、趋势、改进措施。
- 布局差异：采用版本化报告视图；引用 `/metrics/architecture` KPI 不重复计算。

### 数据质量子模块

#### `/data-governance/quality` · 质量概览（升级）

- 核心任务：从综合得分、维度评分、可信度和趋势概览数据质量全局。
- 主结构：综合可信度评分 + 五维评分雷达 + 批次趋势 + 问题闭环漏斗（发现/确认/分发/整改/复检/关闭各阶段数量）。
- 关键决策信息：综合可信度、维度短板、问题闭环阶段分布、趋势。
- 布局差异：概览页，不直接做规则 CRUD（移至 `/quality/rules`）；采用可信度+维度+漏斗组合视图。

#### `/data-governance/quality/requirements` · 质量需求矩阵（新增）

- 核心任务：基于业务和监管需求明确质量管理目标和范围，形成需求矩阵。
- 主结构：质量需求矩阵（对象 × 维度 × 指标 + 优先级 + 信息环境上下文）+ L4 AI 需求矩阵自动识别建议。
- 关键决策信息：需求覆盖范围、优先级分布、AI 识别建议。
- 布局差异：采用矩阵视图，不是列表；需求与规则分离（需求驱动规则设计）。

#### `/data-governance/quality/rules` · 规则库与剖析（升级）

- 核心任务：管理质量规则库、质量剖析和检查执行。
- 主结构：规则库列表（CRUD + 启停 + 维度 + 阈值 + 评分 + 最近执行）+ 质量剖析（分布统计快照）+ 检查执行批次。
- 关键决策信息：规则覆盖率、剖析结果、执行结果。
- 布局差异：由原 `/quality` 规则 CRUD 升级，新增剖析和执行批次；规则失败生成质量问题跳转 `/quality/issues`。

#### `/data-governance/quality/issues` · 质量问题工作台（新增核心）

- 核心任务：独立管理质量问题，驱动发现→确认→分发→整改→复检→关闭闭环。
- 主结构：问题列表（按对象/维度/严重/状态/认责管理者筛选）+ 问题详情（闭环状态机可视化 + 职责分离字段 + 证据引用）+ 批量分发。
- 关键决策信息：问题严重分布、闭环阶段、逾期问题、分发对象（认责管理者）。
- 布局差异：采用"列表 + 闭环状态机详情"结构；问题独立于规则生命周期；分发对象自动取自元数据认责字段（D2 联动）；职责分离强制约束。

#### `/data-governance/quality/analysis` · 质量分析（新增）

- 核心任务：分析质量趋势、根因和改进方向。
- 主结构：质量趋势（跨批次维度评分趋势）+ 根因分析（问题聚类 + 高发对象/维度）+ 对比分析。
- 关键决策信息：趋势走向、根因聚类、改进优先级。
- 布局差异：分析视图，无 CRUD；引用质量问题闭环数据。

#### `/data-governance/quality/improvement` · 质量改进报告（新增）

- 核心任务：基于闭环数据形成版本化改进报告并跟踪效果。
- 主结构：版本化报告列表 + 报告详情（趋势 + 根因 + 措施 + 效果复评 + L4 生存周期闭环优化）。
- 关键决策信息：改进措施执行率、效果复评、遗留问题。
- 布局差异：版本化报告视图；引用 `/metrics/quality` KPI 不重复计算。

数据标准五个目标页面的信息架构见 [`../data-standard/design.md`](../data-standard/design.md)，不得在本 feature 重新实现标准页面。
