# 大数数据平台开发约定

本文是本仓库的统一产品与研发规则。Claude Code、其他 coding agent 和协作者都应先阅读本文；`CLAUDE.md` 仅作为入口引用，不重复维护另一套规则。

## 产品定位

大数数据平台是面向企业的数据资产运营与 AI 数据服务平台，覆盖数据集成、数据湖、数据治理、数据开发、调度引擎、运维监控和数据安全。

当前仓库是本地全栈原型：业务数据和执行结果仍是 mock 语义，但列表、详情、增删改查、运行状态、调度结果、质量评分、服务调用、安全策略和监控指标统一持久化到本地 SQLite，不依赖真实数据源、真实执行引擎或生产级服务。

## 当前产品模块

| 产品域 | Feature / Route | 状态 |
|---|---|---|
| 数据集成 | `data-source` / `/data-source/*` | SQLite 持久化 mock |
| 数据湖 | `data-lake` / `/data-lake/*` | SQLite 持久化 mock |
| 数据治理 | `data-governance` / `/data-governance/*` | SQLite 持久化 mock |
| 调度引擎 | `scheduler` / `/scheduler/*` | SQLite 持久化 mock |
| 数据资产运营 | `data-asset` / `/data-asset/*` | SQLite 持久化 mock；资产目录复用数据源注册表 |
| 数据开发 | `data-development` / `/data-development/*` | ETL/SQL/Notebook 专业工作台 P0，SQLite 持久化 mock |
| 运维与监控 | `ops-monitor` / `/ops-monitor/*` | SQLite 持久化 mock |
| 数据安全 | `data-security` / `/data-security/*` | SQLite 持久化 mock |

知识中心、知识图谱、智能体、工作流和洞察分析是现有 AI/语义扩展能力。产品范围详见 [`specs/platform/07-data-platform-product-scope.md`](specs/platform/07-data-platform-product-scope.md)。

## SQLite 持久化与 Mock 规则

- `npm run dev` 启动 `server/dev.mjs`，使用 Node 22 内置 `node:sqlite` 创建 `data/platform.sqlite`；不要改为浏览器 SQLite、远程数据库或临时内存存储。
- `server/sqlite.mjs` 维护 `app_state` 和 `app_events`：前者保存 feature JSON 状态，后者记录持久化操作审计；`npm run db:inspect` 用于只读检查。
- 可变业务状态统一使用 `src/lib/sqlite-client.ts` 的 `useSqliteState`，scope 使用 `data-agent.*` 前缀；页面不得自行实现另一套 SQLite 或 Local Storage 持久化。
- `src/lib/local-json-store.ts` 仅作为已有 mock fixture 的浏览器 fallback，同时将写入镜像到 SQLite；新功能优先使用 `useSqliteState`。
- HTTP-like 模拟执行仍可使用 `src/lib/mock-client.ts`；业务页面不得直接调用外部 `fetch`、`axios` 或真实数据源。SQLite API 只由共享数据层调用。
- 不在 SQLite 或浏览器中保存密码、token、私钥、完整连接串或其他真实敏感数据；安全相关页面只展示脱敏 mock 值。
- 不接入真实数据库连接器、文件系统、消息队列、对象存储、API 网关、CDC 引擎、Notebook 内核、调度执行器或计算集群；SQLite 只负责本地产品原型状态。
- mock 数据要覆盖正常、空数据、加载中、失败、运行中、成功和已停止等产品状态，但这些状态不代表真实生产执行结果。
- 所有 mock 数据应放在 feature 自己的 API/fixture 或页面数据层，不要把业务数据塞进通用 UI 组件。

## 不新增测试模块

“测试模块”不是大数数据平台的产品域。不得新增测试中心、测试菜单、测试路由或面向用户的测试页面；功能页面只展示业务 mock 数据和交互状态。

已有的工程文件、依赖或未提交改动如包含测试代码，除非用户明确要求删除，否则保留，不把它们扩展为产品模块。

## Spec-driven workflow

`specs/` 是产品需求和架构约束的来源，遵循 `requirements → design → tasks → code`：

- `specs/platform/`：产品范围、架构、设计系统、i18n、mock API、状态和路由规则
- `specs/features/<key>/`：与 `src/features/<key>/` 对应的 feature spec
- `specs/adr/`：架构决策记录；冲突通过新 ADR 的 `Supersedes` 关系处理
- `specs/_templates/`：新 feature 和 ADR 模板

修改产品范围、验收标准、路由、数据模型或状态时，同步更新对应 spec、[`README.md`](README.md) 和本文件。实现新 feature 前先建立 README、requirements、design、tasks 和 `plans/` 归档。

## 前端架构

入口链路：`main.tsx` → `App` → `AppProviders` → `RouterProvider` → `AppShell` → feature page。

- 每个 feature 通过 `src/features/<key>/routes.tsx` 导出 `RouteObject[]`。
- `src/app/router.tsx` 是唯一的 feature 路由组合入口，不直接 import feature 页面。
- feature 之间禁止直接 import；共享能力上提到 `src/components/`、`src/lib/` 或 `src/stores/`。
- `src/components/ui/` 不得依赖任何 feature。
- 全局状态放 `src/stores/`，feature 状态放自身目录；持久化 key 使用 `data-agent.<scope>`。
- 菜单由 `public/menu.config.json` 和 `src/features/settings/menu/` 管理；导航依赖稳定的 `builtinRouteKey`，不能依赖可编辑 label。
- 新增语言 namespace 时同步更新 `src/lib/i18n.ts` 及 `locales/{zh-CN,en-US}.json`。

## 当前路由

| 模块 | 页面 |
|---|---|
| 产品矩阵首页 | `/` |
| 行业解决方案 | `/solutions` |
| 数据集成 | `/data-source/sources`、`/data-source/sync`、`/data-source/exchange` |
| 数据湖 | `/data-lake/storage`、`/data-lake/tables`、`/data-lake/capacity` |
| 数据开发 | `/data-development/{etl,sql,notebook}` 列表及各自的 `/new`、`/:id` 编辑器 |
| 数据治理 | `/data-governance/metadata`、`/data-governance/quality`、`/data-governance/standards` |
| 调度引擎 | `/scheduler/tasks`、`/scheduler/editor`、`/scheduler/monitor` |
| 数据资产运营 | `/data-asset/catalog`、`/data-asset/ownership`、`/data-asset/value`、`/data-asset/service`、`/data-asset/audit`、`/data-asset/reports` |
| 运维与监控 | `/ops-monitor/tasks`、`/ops-monitor/lineage`、`/ops-monitor/quality`、`/ops-monitor/resource` |
| 数据安全 | `/data-security/classification`、`/data-security/masking` |
| 知识中心 | `/knowledge-center/*` |
| 知识图谱 | `/knowledge-graph/*` |
| AI 与平台扩展 | `/agents`、`/workflow`、`/insights`、`/settings/*` |

没有实际页面和 mock 数据前，不要伪造规划中模块的已上线路由。

## 视觉与交互

使用 Classic Light SaaS 设计：浅色工作区、白色面板、蓝色主色、紧凑表格和清晰状态反馈。避免紫色渐变、营销页 hero、过大圆角、feature 内部颜色 token 以及与产品无关的测试中心视觉。
