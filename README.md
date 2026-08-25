# 大数数据平台

大数数据平台是面向企业的数据资产与 AI 数据服务平台。平台覆盖 Data Agent、数据接入、统一存储、治理、数据标准、开发、调度、服务化与安全运营，帮助企业把分散的数据转化为可发现、可理解、可复用、可运营的数据资产。

本仓库是平台的本地全栈原型。业务数据和执行结果使用 mock 语义，但可变状态统一保存到项目本地 SQLite（`data/platform.sqlite`）；真实数据源、计算引擎、权限中心和生产级服务网关不在当前实现范围内。

## DCMM 4 级建设基线

本系统以 **GB/T 36073—2025《数据管理能力成熟度评估模型》DCMM 4 级（量化管理级）**作为产品实现和验收参考，以提升组织的 DCMM 第4级就绪度和举证能力为建设目标。产品规划、需求、设计、开发和验收均应对照该标准建立能力映射与评估证据，不能只完成页面展示或基础流程；软件功能不自动构成认证结论或通过保证。

- 具备 DCMM 3 级要求的组织级统一制度、职责、流程和管理能力，并在此基础上实现 4 级要求的量化管理。
- 为关键管理过程设置可计算的量化指标，支持目标值、实际值、趋势、异常和改进措施的持续跟踪。
- 定期形成管理评价、效益评价和分析报告，使评价依据、数据来源、计算过程和结果可追溯。
- 数据资产能力对照标准第 9 章建设，覆盖权属管理、价值评估和资产运营，并保留授权、变更、评估、运营及审计证据链。
- 数据标准能力对照标准第 10 章建设，覆盖业务术语、主数据、参考数据、数据元和指标数据；产品名称使用“数据元标准”和“指标字典”。
- 重要业务对象应具备稳定标识、责任主体、状态、版本、时间、来源、审批记录、变更历史和审计信息。
- 当前 SQLite 持久化 mock 用于验证产品能力和证据结构，不代表系统已经通过认证；正式评估前仍需接入真实组织制度、业务数据、执行系统和审计材料。

## 产品能力

| 领域 | 核心能力 | 当前状态 |
|---|---|---|
| Data Agent | 通用 Agent 自动路由，数据发现、问答、开发、治理和运维五类专业任务，计划/动作/证据/确认与案例重放 | 六个 Agent 任务 List、专属任务详情与 SQLite mock 已实现 |
| 量化看板 | 综合态势、DCMM 九大能力域、25 项核心 KPI、33 个能力项覆盖、快照与改进闭环 | 综合看板加九域看板与 SQLite 持久化 mock 已实现 |
| 数据集成 | 数据源管理、全量/增量/CDC/实时同步、API/文件/库表/消息共享交换 | SQLite 持久化 mock 已实现 |
| 数据湖 | 统一存储、湖表管理、Schema/版本/ACID、分层与容量、生命周期管理 | SQLite 持久化 mock 已实现 |
| 数据标准 | 企业级业务术语库与本体模型、主数据、参考数据、数据元标准、指标字典与语义层、自动落标稽核、跨部门指标一致性比对 | SQLite 持久化 mock 已实现 |
| 数据治理 | 治理中心（组织/制度/文化）、元数据与血缘（元模型/质量评价/报告）、数据质量（需求/规则/问题闭环/分析/改进） | SQLite 持久化 mock 重构中 · DCMM L4 就绪度 |
| 数据开发 | ETL 画布、SQL 编辑器、Notebook 单元格工作台 | 专业工作台 P0 与 SQLite mock 已实现 |
| 数据资产 | 统一数据资产目录、资产流通申请/审批/对接/使用、权属、估值、产品运营、审计与报告 | SQLite 持久化 mock 已实现；数据标准不作为资产类型 |
| 调度引擎 | 画布编排、节点管理、运行结果、任务监控 | SQLite 持久化 mock 已实现 |
| 运维与监控 | 任务、数据链路、数据质量、计算资源监控 | SQLite 持久化 mock 已实现 |
| 数据安全 | 安全总览、合规、分类分级、防护、脱敏、加密、水印、出境评估、审计和事件响应 | 25 个功能页、六分域 SQLite mock 与三级菜单已实现 |

## 当前前端入口

| 模块 | 路由 | 页面 |
|---|---|---|
| Data Agent | `/data-agent` | 默认 `/general`；`/discovery`、`/qa`、`/development`、`/governance`、`/operations` 及各自 `/tasks/:id` 任务详情 |
| 量化看板 | `/metrics` | 综合看板；九大能力域使用独立 URL 的 Tab 切换，完整路由见 [metrics spec](./specs/features/metrics/README.md) |
| 数据集成 | `/data-source` | `/sources` 数据源、`/sync` 数据同步、`/exchange` 共享交换 |
| 数据湖 | `/data-lake` | `/storage` 统一存储、`/tables` 湖表管理、`/capacity` 分层与容量 |
| 数据标准 | `/data-standard` | `/business-terms` 业务术语、`/master-data` 主数据、`/reference-data` 参考数据、`/data-element-standards` 数据元标准、`/metric-dictionary` 指标字典 |
| 数据治理 | `/data-governance` | 治理中心 `/center`、`/center/{organization,regulation,culture}`；元数据 `/metadata`、`/metadata/{model,quality,reports}`；数据质量 `/quality`、`/quality/{requirements,rules,issues,analysis,improvement}` |
| 数据开发 | `/data-development` | `/etl`、`/sql`、`/notebook` 列表及 `/new`、`/:id` 专业编辑器 |
| 数据资产 | `/data-asset` | `/catalog` 资产目录、`/circulation` 资产流通、`/ownership` 权属登记、`/value` 价值评估、`/service` 资产运营、`/audit` 使用审计、`/reports` 量化报告 |
| 调度引擎 | `/scheduler` | `/tasks` 调度任务、`/editor` 任务画布、`/monitor` 任务监控 |
| 运维与监控 | `/ops-monitor` | `/tasks` 任务、`/lineage` 链路、`/quality` 质量、`/resource` 资源监控 |
| 数据安全 | `/data-security` | 默认 `/overview`；合规、分类、防护、审计、事件响应共 25 个页面，完整路由见 [data-security spec](./specs/features/data-security/README.md) |
| 系统设置 | `/settings` | 菜单管理等平台配置能力；菜单调整保存到 SQLite `data-agent.settings.menu` |

数据标准的一级入口为 `/data-standard`，二级路由为 `/business-terms`、`/master-data`、`/reference-data`、`/data-element-standards` 和 `/metric-dictionary`，五个工作台与 SQLite mock 已实现；原 `/data-governance/standards` 不保留兼容入口。完整设计见 [data-standard spec](./specs/features/data-standard/README.md)。

数据资产目录、数据服务、数据开发、运维监控和数据安全的产品范围与验收方向记录在 [`specs/platform/07-data-platform-product-scope.md`](./specs/platform/07-data-platform-product-scope.md)。

## 技术栈

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui（new-york 风格，经典浅色 SaaS 主题）
- Zustand（全局 UI/语言状态与 feature 局部状态）
- React Router v6（按 feature 组合路由）
- react-i18next（`zh-CN` 默认，`en-US` fallback；feature 可拥有独立 namespace）
- `@xyflow/react`（调度任务与图类画布）
- Node 22 `node:sqlite`（本地 SQLite 数据库）
- `useSqliteState`、mockClient 与 Local JSON Store（状态持久化和模拟执行边界）

## 快速开始

```bash
npm install
npm run dev          # SQLite + Vite 本地全栈开发服务，默认 :5173
npm run db:inspect   # 查看 SQLite 状态 scope 和事件统计
npm run dev:vite     # 仅启动 Vite（不提供 SQLite API，不建议用于完整功能）
npm run build        # tsc -b + 生产构建
npm run preview      # 预览生产构建
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest 单元与路由/菜单一致性测试
```

## 目录结构

```text
src/
  app/                    # providers、router、App
  components/
    ui/                   # shadcn 原子组件
    layout/               # AppShell、Sidebar、TopBar
  features/
    data-agent/           # Data Agent：通用编排与五类专业任务工作区
    metrics/              # 量化看板：九域 KPI、能力覆盖、快照和改进事项 SQLite mock
    data-source/          # 数据集成：数据源、同步、共享交换
    data-lake/            # 数据湖：统一存储、湖表、容量分层
    data-standard/        # 数据标准：业务术语、主数据、参考数据、数据元、指标字典
    data-governance/      # 数据治理：治理中心、元数据、数据质量
    data-development/     # 数据开发：ETL、SQL、Notebook
    data-asset/           # 数据资产：目录、流通、权属、估值、运营、审计、报告
    scheduler/            # 调度引擎：任务列表、任务画布、任务监控
    ops-monitor/          # 运维与监控：任务、链路、质量、资源
    data-security/        # 数据安全：DCMM4 就绪度、合规、防护、审计与事件响应 SQLite mock
    settings/             # 系统管理
  stores/                 # 全局 Zustand stores
  lib/                    # cn、i18n、mock-client、SQLite client、local-json-store
server/                   # SQLite schema、API 和 Vite 开发服务
data/                     # 本地 SQLite 数据文件（默认不提交）
src/locales/              # 全局 common namespace
src/styles/globals.css    # 设计 token 与全局样式
specs/
  platform/               # 产品范围、架构、设计与工程约定
  features/               # 与 src/features 对应的 feature spec
  adr/                    # 架构决策记录
```

## 开发约定

`specs/` 是产品需求和实现约束的来源。新增或扩展模块时，先更新 `requirements → design → tasks`，再实现代码，并同步更新 [`AGENTS.md`](./AGENTS.md) 和 [`specs/README.md`](./specs/README.md) 的模块状态。

可变业务状态通过 `src/lib/sqlite-client.ts` 的 `useSqliteState` 持久化到 SQLite；已有 HTTP-like 模拟执行通过 `src/lib/mock-client.ts`，业务 feature 不直接调用外部服务。SQLite 只保存本地原型数据，不代表接入真实生产后端。

```ts
import { useSqliteState } from "@/lib/sqlite-client";

const [assets, setAssets] = useSqliteState("data-agent.data-asset.catalog.assets", initialAssets);
```

更多规则见 [`AGENTS.md`](./AGENTS.md)，跨产品域术语见 [`CONTEXT.md`](./CONTEXT.md)；[`CLAUDE.md`](./CLAUDE.md) 仅作为 Claude Code 入口引用。
