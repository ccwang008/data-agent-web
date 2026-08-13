# 大数数据平台 · Specs

> 与代码并行演进的产品需求、架构约束和实现计划。采用 `requirements → design → tasks → code` 流程。

## 目录 · Structure

```text
specs/
├── _templates/   # 模板，拷贝即用
├── platform/     # 平台愿景、产品范围、架构、设计系统和工程约定
│   └── references/ # 外部标准和平台参考原文
├── adr/          # 架构决策记录
└── features/     # 与 src/features/ 同名的业务 feature spec
    └── <feature-key>/plans/  # Plan 原文和配套文件归档
```

## 产品范围 · Product Scope

大数数据平台的八个产品域、核心对象、调用链、当前前端边界和后续 feature key 见 [07-data-platform-product-scope](./platform/07-data-platform-product-scope.md)。

| 产品域 | 当前 feature | 状态 | 入口 |
|---|---|---|---|
| 数据资产运营 | `data-asset` | 🔨 SQLite 持久化 mock | `/data-asset/*` |
| 数据集成 | `data-source` | 🔨 SQLite 持久化 mock | `/data-source/*` |
| 数据湖 | `data-lake` | 🔨 SQLite 持久化 mock | `/data-lake/*` |
| 数据治理 | `data-governance` | 🔨 SQLite 持久化 mock | `/data-governance/*` |
| 数据开发 | `data-development` | ✅ ETL/SQL/Notebook 专业工作台 P0 | `/data-development/*` |
| 调度引擎 | `scheduler` | 🔨 SQLite 持久化 mock | `/scheduler/*` |
| 运维与监控 | `ops-monitor` | 🔨 SQLite 持久化 mock | `/ops-monitor/*` |
| 数据安全 | `data-security` | 🔨 SQLite 持久化 mock | `/data-security/*` |

产品矩阵首页是统一产品发现入口：`product-matrix` / `/`，详见 [feature spec](./features/product-matrix/README.md)。

## Feature 状态 · Feature Status

| Feature | 路径 · Path | 路由 · Route | 状态 | Spec |
|---|---|---|---|---|
| Product Matrix | `src/features/product-matrix/` | `/` | 🔨 产品发现首页 | [README](./features/product-matrix/README.md) · [Req](./features/product-matrix/requirements.md) · [Design](./features/product-matrix/design.md) · [Tasks](./features/product-matrix/tasks.md) |
| Solutions | `src/features/solutions/` | `/solutions` | 🔨 行业方案首页 | [README](./features/solutions/README.md) · [Req](./features/solutions/requirements.md) · [Design](./features/solutions/design.md) · [Tasks](./features/solutions/tasks.md) |
| Data Source / Integration | `src/features/data-source/` | `/data-source/*` | 🔨 数据源、同步、共享交换 | [README](./features/data-source/README.md) · [Req](./features/data-source/requirements.md) · [Design](./features/data-source/design.md) · [Tasks](./features/data-source/tasks.md) |
| Data Lake | `src/features/data-lake/` | `/data-lake/*` | 🔨 统一存储、湖表、分层容量 | [README](./features/data-lake/README.md) · [Req](./features/data-lake/requirements.md) · [Design](./features/data-lake/design.md) · [Tasks](./features/data-lake/tasks.md) |
| Data Governance | `src/features/data-governance/` | `/data-governance/*` | 🔨 元数据、质量、数据标准 | [README](./features/data-governance/README.md) · [Req](./features/data-governance/requirements.md) · [Design](./features/data-governance/design.md) · [Tasks](./features/data-governance/tasks.md) |
| Data Development | `src/features/data-development/` | `/data-development/*` | 🔨 ETL、SQL、Notebook | [README](./features/data-development/README.md) · [Req](./features/data-development/requirements.md) · [Design](./features/data-development/design.md) · [Tasks](./features/data-development/tasks.md) |
| Scheduler | `src/features/scheduler/` | `/scheduler/*` | 🔨 调度任务、任务画布、任务监控 | [README](./features/scheduler/README.md) · [Req](./features/scheduler/requirements.md) · [Design](./features/scheduler/design.md) · [Tasks](./features/scheduler/tasks.md) |
| Data Asset | `src/features/data-asset/` | `/data-asset/*` | 🔨 目录、权属、估值、运营、审计、报告 | [README](./features/data-asset/README.md) · [Req](./features/data-asset/requirements.md) · [Design](./features/data-asset/design.md) · [Tasks](./features/data-asset/tasks.md) |
| Ops Monitor | `src/features/ops-monitor/` | `/ops-monitor/*` | 🔨 任务、链路、质量、资源监控 | [README](./features/ops-monitor/README.md) · [Req](./features/ops-monitor/requirements.md) · [Design](./features/ops-monitor/design.md) · [Tasks](./features/ops-monitor/tasks.md) |
| Data Security | `src/features/data-security/` | `/data-security/*` | 🔨 分级分类、脱敏与加密 | [README](./features/data-security/README.md) · [Req](./features/data-security/requirements.md) · [Design](./features/data-security/design.md) · [Tasks](./features/data-security/tasks.md) |
| Knowledge Center | `src/features/knowledge-center/` | `/knowledge-center/*` | 🔨 前端 mock | [README](./features/knowledge-center/README.md) · [Req](./features/knowledge-center/requirements.md) · [Design](./features/knowledge-center/design.md) · [Tasks](./features/knowledge-center/tasks.md) |
| Knowledge Graph | `src/features/knowledge-graph/` | `/knowledge-graph/*` | 🔨 hub + 子模块 | [README](./features/knowledge-graph/README.md) · [Req](./features/knowledge-graph/requirements.md) · [Design](./features/knowledge-graph/design.md) · [Tasks](./features/knowledge-graph/tasks.md) |
| Agents | `src/features/agents/` | `/agents` | 🚧 基础页面/占位 | [README](./features/agents/README.md) · [Req](./features/agents/requirements.md) · [Design](./features/agents/design.md) · [Tasks](./features/agents/tasks.md) |
| Workflows | `src/features/workflow/` | `/workflow` | 🚧 基础页面/占位 | [README](./features/workflow/README.md) · [Req](./features/workflow/requirements.md) · [Design](./features/workflow/design.md) · [Tasks](./features/workflow/tasks.md) |
| Insights | `src/features/insights/` | `/insights` | 🚧 基础页面/占位 | [README](./features/insights/README.md) · [Req](./features/insights/requirements.md) · [Design](./features/insights/design.md) · [Tasks](./features/insights/tasks.md) |
| Settings | `src/features/settings/` | `/settings/*` | 🚧 菜单与系统设置 | [README](./features/settings/README.md) · [Req](./features/settings/requirements.md) · [Design](./features/settings/design.md) · [Tasks](./features/settings/tasks.md) |

以上八个产品域均已建立 feature、路由和 SQLite 持久化 mock；真实连接器、执行器、资源采集和安全控制仍属于后续生产化范围。

## Platform Specs

| 文件 | 内容 |
|---|---|
| [00-overview](./platform/00-overview.md) | 平台愿景、角色、模块全景和词汇表 |
| [01-architecture](./platform/01-architecture.md) | 产品域分层、前端分层和 feature 解剖 |
| [02-design-system](./platform/02-design-system.md) | 经典浅色 SaaS token、字体和 shadcn 约定 |
| [03-i18n](./platform/03-i18n.md) | 多语言策略与流程 |
| [04-mock-api](./platform/04-mock-api.md) | mockClient、Local JSON Store 与真实 API 切换点 |
| [05-state-management](./platform/05-state-management.md) | Zustand 全局状态与 feature state |
| [06-routing](./platform/06-routing.md) | 路由组装、菜单身份和导航规则 |
| [07-data-platform-product-scope](./platform/07-data-platform-product-scope.md) | 大数数据平台八大产品域、对象、边界和验收原则 |
| [platform/references](./platform/references/README.md) | 外部标准和平台参考原文 |

## ADR

见 [adr/README.md](./adr/README.md) 与 [ADR-0001](./adr/0001-record-architecture-decisions.md)。

## 写作流程 · Workflow

### Plan 模式硬性要求

- 任何进入实现阶段的 Plan 都必须同步写入 `specs/`。
- Plan 生成的完整计划正文和配套文件必须原文归档到 `features/<feature-key>/plans/`，不得只拆入 `requirements.md` / `design.md` / `tasks.md` 后丢失原始计划。
- 若 feature 已有 spec，先更新对应 `requirements.md` / `design.md` / `tasks.md`，再改代码。
- 若 feature 尚无 spec，先创建 `README.md` / `requirements.md` / `design.md` / `tasks.md` / `plans/`，再改代码。
- spec 与代码必须同轮交付，不接受只实现代码、不落 specs 的改动。

### 已有 feature 改动

- 影响验收标准 → 更新 `requirements.md`
- 影响路由、数据模型或状态 → 更新 `design.md`
- 新增工作项 → 追加到 `tasks.md`，完成时勾选并附 PR 链接
- 跨 feature 影响 → 新建 ADR

## 命名与状态 · Naming and Status

- 任务 ID：`T-<feature-key>-NN`
- ADR：`NNNN-kebab-title.md`
- Platform spec：`NN-topic.md`
- Feature 目录：kebab-case，与 `src/features/` 同名
- 章节标题：优先使用 `## 中文 · English`
- 状态：🚧 规划/占位 · 🔨 开发中 · ✅ 已上线 · 🧪 实验性 · 🗄️ 已下线

## 关联 · Related

- 项目根：[README.md](../README.md)
- 领域语言：[CONTEXT.md](../CONTEXT.md)
- 开发约定：[AGENTS.md](../AGENTS.md)；Claude Code 入口：[CLAUDE.md](../CLAUDE.md)
