# Platform · AI 能力体系化与 DCMM L4 举证

## 背景 · Background

GB/T 36073—2025《数据管理能力成熟度评估模型》DCMM 2.0 第 4 级（量化管理级）明确要求：

> 在数据管理全过程中**引入人工智能等先进技术**，支持自动化、智能化的数据治理、架构设计、资产运营、标准对齐、质量提升与应用流通；关键管理过程不仅要有制度、流程和工具，还应具备可量化、可追溯的 AI 赋能证据。

东方金信 Data Agent OS 已在数据查询、元数据、报表、语义理解、数据分析、图表推荐和 SQL 生成等场景实现了多项 AI 能力。为了支撑 DCMM L4 的评估举证和就绪度展示，本平台将上述能力以 **DCMM 评估语言**体系化梳理：每项能力对应稳定的实现组件、可观测的证据留存点以及明确的 DCMM 能力域映射，而不是零散的营销描述。

> **重要边界（与 ADR-0009、ADR-0010 保持一致）**：本平台的 AI 能力体系化文档和原型界面用于**就绪度说明与证据组织**，不自动构成 DCMM 认证通过结论、外部审计结论或监管合规保证；AI 生成的重要/核心等级、稽核结论和流通授权仍必须经职责分离的人工复核与审批。

---

## 设计原则 · Design Principles

1. **以 DCMM 能力域为索引**：所有 AI 能力都必须在九大能力域中存在显式落点，支撑量化看板 `metrics` 域内 KPI 的证据引用。
2. **组件名稳定、可回溯**：实现组件（DataQA、DCG、LLMReportComposer 等）使用固定代号，在原型、文档、证据链中保持一致，避免口语化替换。
3. **证据三要素**：每条 AI 能力至少保留「模型/规则版本、输入对象、输出对象与审批/复核状态」三类证据元数据，原型中以 mock scope 存储。
4. **人机协作、人负最终责任**：AI 只输出候选、建议或可复核结论，涉及重要数据等级、资产授权、标准发布等必须走人工审批。
5. **不新增独立一级产品域**：AI 能力作为横向赋能层嵌入现有十个产品域的工作台、报告与证据面板中，不上线独立的「AI 中心」菜单。

---

## AI 能力总表 · AI Capability Matrix

下表是体系化证明的核心素材，在 README、AGENTS.md、量化看板证据面板和产品范围文档中需保持一致引用：

| # | AI 能力 · Capability | 本系统实现组件 · Implementation | 输入 · Input | 输出 · Output | DCMM 能力域映射 · Domain Mapping | 原型证据留存点 · Evidence Scope |
|---|---|---|---|---|---|---|
| A1 | 自然语言数据查询 · NL Data Query | **DataQA NL2DSL2SQL** 六阶段管道（意图理解 → 实体抽取 → DSL 构造 → SQL 生成 → 执行校验 → 结果归因） | 业务用户自然语言问句、资产目录、指标字典、Schema | 参数化 DSL、可执行 SQL、执行结果与归因解释 | **数据应用流通（Application Circulation）**：数据服务可访问性、自助分析就绪度 | `data-agent.data-asset.service.dataqa`、`data-agent.metrics.evidenceRefs` |
| A2 | 智能元数据发现 · Intelligent Metadata Discovery | **DCG（Data Context Graph）** 自动 Schema 发现 + 血缘推断 | 接入源文件/库表、字段样本、历史 SQL、数据字典草稿 | 自动抽取的 Schema 候选、字段语义标签、血缘候选、置信度 | **数据架构（Architecture）**：元模型完整性、元数据自动采集率 | `data-agent.data-governance.metadata.dcg`、`data-agent.data-lake.tables` |
| A3 | AI 驱动报表生成 · AI Report Composer | **LLMReportComposer + ReportCardBuilder**（大纲生成 → 指标卡片组合 → 文字说明 → 图表嵌入 → 版本化审批） | 看板快照、核心 KPI、改进事项、用户指定报告主题 | 版本化报告草稿、AI 生成章节、人工修订记录 | **数据应用流通（Application Circulation）**：报告交付效率、决策支持覆盖 | `data-agent.metrics.reports`、`data-agent.data-asset.reports` |
| A4 | 语义理解与推荐 · Semantic Understanding & Recommendation | **SemanticRecEngine** 推荐引擎（本体概念向量 + 用户行为 + 标签共现） | 检索上下文、术语本体、历史查询、资产画像 | 资产推荐列表、术语关联推荐、指标相似推荐及可解释理由 | **数据标准（Standards）**：术语复用率、本体覆盖度；**数据应用流通**：检索命中率、自助数据就绪 | `data-agent.data-standard.business-terms.semantic`、`data-agent.data-asset.catalog.recs` |
| A5 | 智能数据分析 · Intelligent Data Analysis | **DataQA 思考树（Thinking Tree）** 七阶段推理（问题拆解 → 假设生成 → 证据检索 → 指标聚合 → 反例校验 → 结论合成 → 置信度评估） | 分析主题、数据集、指标口径、约束条件 | 分析报告草稿、关键发现点、证据链节点、置信度与未决问题 | **数据应用流通（Application Circulation）**：分析自动化率、决策支持深度 | `data-agent.data-asset.service.dataqa`、`data-agent.metrics.reports` |
| A6 | 图表智能推荐 · Chart Recommendation | **ChartRecommender + build_axis_chart_spec**（字段类型推断 → 场景匹配 → 最佳视觉通道 → 规格生成 → 可编辑） | 数据集字段元信息、分析任务（对比/趋势/分布/占比）、尺寸约束 | 推荐图表规格 JSON、推荐理由、可一键切换的备选方案 | **数据应用流通（Application Circulation）**：可视化交付效率、自助分析覆盖 | `data-agent.data-development.*.charts`、`data-agent.metrics.*.charts` |
| A7 | SQL 智能生成 · SQL Intelligent Generation | **match_sql_template + LLM SQL 生成**（模板召回 → LLM 补全 → 规则校验 → 变量绑定 → 安全策略注入） | 自然语言意图、模板库、Schema、指标口径、权限约束 | 可执行 SQL（带占位符）、模板来源 ID、校验日志与人工确认标记 | **数据应用流通（Application Circulation）**：数据服务开发效率、SQL 合规率 | `data-agent.data-development.sql.templates`、`data-agent.data-asset.service.queries` |

### 跨能力域汇总 · Cross-Domain Coverage

| DCMM 九大能力域 | 承载 AI 能力 | 说明 |
|---|---|---|
| 数据战略 · Strategy | — | 战略域通过制度要求 AI 引入（由治理中心文档承载），不直接部署算法 |
| 数据治理 · Governance | A2（部分：AI 稽核候选）、A4（部分：语义管家推荐） | 治理对象的 AI 候选判定与责任分配辅助 |
| 数据架构 · Architecture | **A2（DCG 智能元数据发现）** | 核心承载域：自动 Schema、血缘推断、模型评审辅助 |
| 数据资产 · Assets | A4（目录推荐）、A3（资产报告） | 资产检索、估值分层和运营报告 |
| 数据标准 · Standards | **A4（SemanticRecEngine 语义推荐）**、A2（部分：标准映射候选） | 核心承载域：术语关联、主数据匹配、指标口径相似度 |
| 数据质量 · Quality | A2（部分：异常检测提示） | 质量规则 AI 辅助生成和异常样本识别（下阶段扩展） |
| 数据安全 · Security | A1/A7（SQL 安全注入策略）、A2（敏感字段识别） | 与 ADR-0010 一致：AI 只提议，重要/核心等级需人工审批 |
| 数据生命周期 · Lifecycle | A2（冷热分层建议） | 生命周期策略建议（下阶段扩展） |
| **数据应用流通 · Application Circulation** | **A1、A3、A5、A6、A7 五项核心** + A4 资产检索 | **最大承载域**：自助查询、报表、分析、可视化和 SQL 生成 |

> 因此，AI 能力的量化证据在量化看板中主要在 **`/metrics/application-circulation`（5+1 项）**、**`/metrics/architecture`（1 项主）** 和 **`/metrics/standards`（1 项主）** 三个域页面展示，并在综合看板 `/metrics` 上卷为「AI 赋能覆盖率」跨域指标。

---

## 证据链结构 · Evidence Chain Structure

为了在原型中支撑 DCMM 评估举证，每条 AI 能力的执行结果统一遵循以下证据结构（mock SQLite scope 使用相同字段）：

```ts
interface AiCapabilityEvidence {
  id: string;                    // 稳定证据 ID，metrics 可跨域引用
  capabilityId:                  // "A1" | "A2" | "A3" | "A4" | "A5" | "A6" | "A7";
  capabilityId: string;
  domain: DcmmDomain;            // 对应 DCMM 能力域
  modelVersion: string;          // 模型/规则版本（mock，如 "DataQA-v2.3"）
  templateVersion?: string;      // 模板版本（A3/A7 需要）
  inputRefs: string[];           // 输入对象稳定 ID：标准版本ID/湖表ID/资产ID/指标ID等
  outputRefs: string[];          // 输出对象稳定 ID：SQL草稿ID/报告ID/推荐列表ID等
  confidence: number;            // 0-1
  status:                        // AI 输出生命周期：
    "proposed" |                 //  AI 已提议，待人工复核
    "reviewing" |                //  复核中
    "approved" |                 //  人工批准生效（必须有 approver）
    "rejected" |                 //  人工驳回，需保留驳回理由
    "superseded";                //  被新版本覆盖
  approverId?: string;           // 审批人角色 ID，重要等级和生效结论必须填写
  approverRole?:                 // 与治理中心职责映射
    "data-steward" | "data-owner" | "security-officer" | "architect";
  reviewedAt?: string;           // 审批时间
  reason?: string;               // 驳回或复审说明
  sourceTime: string;            // 证据生成时间（数据时间）
  auditTrail: AuditEvent[];      // 操作审计：生成、查看、修改、审批、驳回
  linkedMetricIds: string[];     // 关联 metrics feature 的核心 KPI ID
}
```

关键约束：

- **状态不可逆**：`approved` 只能由 `reviewing` 迁入；`rejected` 不得被同一版本改写为 `approved`，必须生成新版本 ID。
- **审批人不可为生成人**：原型中使用 `approverRole !== "ai"` 做最小职责分离校验。
- **证据新鲜度**：`sourceTime` 与指标观测 `sourceTime` 对齐，超过 90 天未刷新的 AI 证据在看板显示为「expired」，不进入达标率分母（与 metrics design 保持一致）。
- **模型版本与结果可复现**：`modelVersion + inputRefs + outputRefs` 三者可构成最小可复现单元；前端不执行真实推理，但 mock 数据结构必须保留该三元组。

---

## 与现有 Feature 的嵌入点 · Integration Points

### 1. 数据应用流通（Application Circulation）主承载

在 `data-asset` / `data-development` / `metrics` 三处嵌入 A1、A3、A5、A6、A7：

| 能力 | 嵌入位置 | 原型页面/组件 | 证据 scope |
|---|---|---|---|
| A1 NL2DSL2SQL | 资产服务工作台 + 量化应用流通看板 | `/data-asset/service` 新增「智能查询」Tab（后续实现） | `data-agent.data-asset.service.dataqa` |
| A3 AI 报表生成 | 量化看板「快照/报告」弹窗 + 资产报告页 | `/metrics` 报告对话框、`/data-asset/reports` | `data-agent.metrics.reports` |
| A5 思考树数据分析 | 资产服务工作台 + 报告编制 | `/data-asset/service`、`/data-asset/reports` | `data-agent.data-asset.service.dataqa` |
| A6 图表智能推荐 | 数据开发编辑器 + 看板指标详情 | `/data-development/sql/:id`、`/data-development/notebook/:id`、`/metrics/*` 指标详情 | `data-agent.data-development.sql.charts`、`data-agent.metrics.*.charts` |
| A7 SQL 智能生成 | SQL 编辑器 + 服务 API 定义 | `/data-development/sql/new`、`/data-development/sql/:id` | `data-agent.data-development.sql.templates` |

### 2. 数据架构（Architecture）主承载

- **A2 DCG 智能元数据发现**：嵌入数据湖湖表管理与治理元数据页。
  - `/data-lake/tables`：接入新表时展示「AI 自动 Schema 候选」面板，保留置信度、字段语义标签和手动确认标记。
  - `/data-governance/metadata`、`/data-governance/metadata/model`：元模型页展示 DCG 血缘候选，需架构师确认后进入正式血缘。
  - 证据 scope：`data-agent.data-governance.metadata.dcg`。

### 3. 数据标准（Standards）主承载

- **A4 SemanticRecEngine 语义理解与推荐**：
  - `/data-standard/business-terms`：术语编辑与审批页，推荐同义词、本体关联概念、关联数据元，附可解释理由与置信度。
  - `/data-standard/master-data`：主数据匹配与查重，AI 候选匹配 + 人工确认权威记录。
  - `/data-standard/metric-dictionary`：指标口径一致性比对，相似度 + 冲突候选。
  - 证据 scope：`data-agent.data-standard.business-terms.semantic`、`data-agent.data-standard.master-data.semantic`、`data-agent.data-standard.metric-dictionary.semantic`。

### 4. 数据安全（辅助约束）

- A1/A7 SQL 生成必须注入访问控制、脱敏和分类分级策略（引用 `data-agent.data-security.*`），不得越权。
- A2 元数据发现中识别到敏感字段的高置信结果只能进入「proposed」，重要/核心必须由 `security-officer` 角色批准（与 ADR-0010 一致）。
- 证据 scope：引用 `data-agent.data-security.classification.records` 与 `data-agent.data-security.protection.policies`，不在 AI scope 重复保存敏感正文。

### 5. 量化看板（Quantitative Dashboard）证据上卷

AI 能力不新增独立一级看板或 KPI，但在以下位置集中展示证据与指标：

| 看板路由 | 新增 AI 相关展示项 | 引用证据 |
|---|---|---|
| `/metrics` 综合看板 | 跨域「AI 赋能覆盖率」（AI 生效证据/管理过程总数）、AI 证据待处理队列 | 汇总九域 `AiCapabilityEvidence[status=approved]` |
| `/metrics/application-circulation` | A1 自助查询成功率、A3 报告 AI 起草率、A5 分析自动化率、A6 图表采纳率、A7 SQL 模板命中率 | A1、A3、A5、A6、A7 证据 |
| `/metrics/architecture` | A2 自动 Schema 覆盖率、DCG 血缘采纳率、自动元数据采集率 | A2 证据 |
| `/metrics/standards` | A4 术语复用推荐采纳率、主数据匹配 AI 候选确认率、指标口径冲突 AI 识别率 | A4 证据 |
| `/metrics/security` | AI 识别敏感字段复核率、SQL 注入策略命中率 | 关联 A1/A2/A7 |

量化看板新增的 AI 相关 KPI 计入 33 个能力项覆盖，但不占用原 25 项核心 KPI 的固定位置（核心 KPI 列表保持稳定）；AI 指标作为「扩展指标」展示。详见 [`features/metrics/design.md`](../features/metrics/design.md)。

---

## DCMM L4 就绪度声明模板 · DCMM L4 Readiness Claim Template

为了在产品介绍和评估沟通中使用统一话术，对外声明统一采用以下模板（禁止使用「已认证」「已通过」等措辞）：

> 本平台已在 **数据架构、数据标准、数据应用流通** 三大 DCMM 能力域引入人工智能等先进技术，覆盖智能元数据发现、语义理解与推荐、自然语言查询、AI 报表生成、智能数据分析、图表智能推荐和 SQL 智能生成共 **7 类 AI 能力、对应 7 组稳定实现组件**，并保留了模型版本、输入输出、审批状态、置信度和审计链路等可追溯证据。相关能力的量化指标、达标率、改进闭环和历史快照由平台量化看板统一维护。
>
> 本平台为 DCMM 评估提供就绪度支撑和证据结构，不替代组织制度、外部审计和正式评估流程。AI 生成的重要数据等级、资产授权、标准发布等结论，均经过职责分离的人工复核与审批。

---

## 非目标 · Out of Scope

1. 不在当前前端原型中实现真实 LLM 推理、向量检索或图神经网络计算；AI 能力以结构化证据 mock、执行流程可视化和产物占位呈现。
2. 不新增独立的「AI 中心 / AI 工作台」一级或二级菜单；AI 能力作为横向赋能层嵌入现有 feature。
3. 不以 AI 生成结论替代治理审批人、架构师、数据安全负责人等角色的组织职责。
4. 不在 SQLite 中保存真实模型权重、真实推理日志或可反推的敏感数据样本；仅保存脱敏 ID、版本、置信度和状态。

---

## 关联文档 · References

- DCMM 参考原文：[`references/GB_T_36073-2025_数据管理能力成熟度评估模型.pdf`](./references/GB_T_36073-2025_数据管理能力成熟度评估模型.pdf)
- 产品范围：[`07-data-platform-product-scope.md`](./07-data-platform-product-scope.md)
- 架构分层：[`01-architecture.md`](./01-architecture.md)
- ADR-0009 DCMM 就绪度边界：[`../adr/0009-dcmm-readiness-not-certification.md`](../adr/0009-dcmm-readiness-not-certification.md)
- ADR-0010 AI 数据分级边界：[`../adr/0010-ai-proposes-regulated-data-levels.md`](../adr/0010-ai-proposes-regulated-data-levels.md)
- ADR-0021 AI 能力体系化映射：[`../adr/0021-ai-capability-systematization-and-evidence.md`](../adr/0021-ai-capability-systematization-and-evidence.md)
- 量化看板设计：[`features/metrics/design.md`](../features/metrics/design.md)
- 数据标准设计：[`features/data-standard/design.md`](../features/data-standard/design.md)
- 数据资产设计：[`features/data-asset/design.md`](../features/data-asset/design.md)
