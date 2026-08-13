# 大数数据平台

大数数据平台是面向企业的数据资产运营与 AI 数据服务平台。平台覆盖数据接入、统一存储、治理、开发、调度、服务化与安全运营，帮助企业把分散的数据转化为可发现、可理解、可复用、可运营的数据资产。

本仓库是平台的本地全栈原型。业务数据和执行结果使用 mock 语义，但可变状态统一保存到项目本地 SQLite（`data/platform.sqlite`）；真实数据源、计算引擎、权限中心和生产级服务网关不在当前实现范围内。

## DCMM 4 级建设基线

本系统以 **GB/T 36073—2025《数据管理能力成熟度评估模型》DCMM 4 级（量化管理级）**作为产品实现和验收标准，以通过 DCMM 4 级评估认证为建设目标。产品规划、需求、设计、开发和验收均应对照该标准建立能力映射与评估证据，不能只完成页面展示或基础流程。

- 具备 DCMM 3 级要求的组织级统一制度、职责、流程和管理能力，并在此基础上实现 4 级要求的量化管理。
- 为关键管理过程设置可计算的量化指标，支持目标值、实际值、趋势、异常和改进措施的持续跟踪。
- 定期形成管理评价、效益评价和分析报告，使评价依据、数据来源、计算过程和结果可追溯。
- 数据资产能力对照标准第 9 章建设，覆盖权属管理、价值评估和资产运营，并保留授权、变更、评估、运营及审计证据链。
- 重要业务对象应具备稳定标识、责任主体、状态、版本、时间、来源、审批记录、变更历史和审计信息。
- 当前 SQLite 持久化 mock 用于验证产品能力和证据结构，不代表系统已经通过认证；正式评估前仍需接入真实组织制度、业务数据、执行系统和审计材料。

## 产品能力

| 领域 | 核心能力 | 当前状态 |
|---|---|---|
| 数据资产运营 | 资产目录（支持从已登记数据源直接添加）、权属登记、价值评估、资产运营（数据产品/使用授权/API/下载）、使用审计、量化报告 | SQLite 持久化 mock 已实现 |
| 数据集成 | 数据源管理、全量/增量/CDC/实时同步、API/文件/库表/消息共享交换 | SQLite 持久化 mock 已实现 |
| 数据湖 | 统一存储、湖表管理、Schema/版本/ACID、分层与容量、生命周期管理 | SQLite 持久化 mock 已实现 |
| 数据治理 | 元数据、血缘、数据地图、质量规则与评分、业务术语、指标、标准审批 | SQLite 持久化 mock 已实现 |
| 数据开发 | ETL 画布、SQL 编辑器、Notebook 单元格工作台 | 专业工作台 P0 与 SQLite mock 已实现 |
| 调度引擎 | 画布编排、节点管理、运行结果、任务监控 | SQLite 持久化 mock 已实现 |
| 运维与监控 | 任务、数据链路、数据质量、计算资源监控 | SQLite 持久化 mock 已实现 |
| 数据安全 | 分级分类、脱敏、加密 | SQLite 持久化 mock 已实现 |

平台还保留知识中心和知识图谱能力，作为数据资产面向 AI 使用的扩展能力。

## 当前前端入口

| 模块 | 路由 | 页面 |
|---|---|---|
| 数据资产 | `/data-asset` | `/catalog` 资产目录、`/ownership` 权属登记、`/value` 价值评估、`/service` 资产运营、`/audit` 使用审计、`/reports` 量化报告 |
| 数据集成 | `/data-source` | `/sources` 数据源、`/sync` 数据同步、`/exchange` 共享交换 |
| 数据湖 | `/data-lake` | `/storage` 统一存储、`/tables` 湖表管理、`/capacity` 分层与容量 |
| 数据治理 | `/data-governance` | `/metadata` 元数据、`/quality` 数据质量、`/standards` 数据标准 |
| 数据开发 | `/data-development` | `/etl`、`/sql`、`/notebook` 列表及 `/new`、`/:id` 专业编辑器 |
| 调度引擎 | `/scheduler` | `/tasks` 调度任务、`/editor` 任务画布、`/monitor` 任务监控 |
| 运维与监控 | `/ops-monitor` | `/tasks` 任务、`/lineage` 链路、`/quality` 质量、`/resource` 资源监控 |
| 数据安全 | `/data-security` | `/classification` 分级分类、`/masking` 脱敏与加密策略 |
| 知识中心 | `/knowledge-center` | 知识库、文档、分析报表、知识权限 |
| 知识图谱 | `/knowledge-graph` | 图实例、元数据、导入、分析、可视化、异步任务等 |
| 系统设置 | `/settings` | 菜单管理等平台配置能力；菜单调整保存到 SQLite `data-agent.settings.menu` |

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
    data-source/          # 数据集成：数据源、同步、共享交换
    data-lake/             # 数据湖：统一存储、湖表、容量分层
    data-governance/      # 数据治理：元数据、质量、标准
    data-development/     # 数据开发：ETL、SQL、Notebook
    scheduler/             # 调度引擎：任务列表、任务画布、任务监控
    data-asset/           # 数据资产：目录、权属、估值、运营、审计、报告
    ops-monitor/          # 运维与监控：任务、链路、质量、资源
    data-security/        # 数据安全：分级分类、脱敏与加密
    knowledge-center/     # 知识资产与向量能力
    knowledge-graph/       # 知识图谱能力
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
