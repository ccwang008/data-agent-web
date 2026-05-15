# Data Agent · Specs

> 与代码并行演进的功能需求与架构文档体系。采用 spec-coding 方法: **requirements → design → tasks → code**。

## 目录 · Structure

```
specs/
├── _templates/   # 模板, 拷贝即用
├── platform/     # 跨 feature 共识 (架构 / 设计系统 / i18n / mock / 状态 / 路由)
├── adr/          # 架构决策记录 (ADR)
└── features/     # 业务 feature spec, 与 src/features/ 同名
```

## Feature 状态 · Feature Status
| Feature | 路径 · Path | 路由 · Route | 状态 | Spec |
|---|---|---|---|---|
| Knowledge Graph | `src/features/knowledge-graph/` | `/knowledge-graph/*` | 🔨 hub (10 子模块) | [README](./features/knowledge-graph/README.md) · [Req](./features/knowledge-graph/requirements.md) · [Design](./features/knowledge-graph/design.md) · [Tasks](./features/knowledge-graph/tasks.md) · [Submodules](./features/knowledge-graph/submodules/) |
| Data Sources | `src/features/data-source/` | `/data-source` | 🚧 占位 | [README](./features/data-source/README.md) · [Req](./features/data-source/requirements.md) · [Design](./features/data-source/design.md) · [Tasks](./features/data-source/tasks.md) |
| Agents | `src/features/agents/` | `/agents` | 🚧 占位 | [README](./features/agents/README.md) · [Req](./features/agents/requirements.md) · [Design](./features/agents/design.md) · [Tasks](./features/agents/tasks.md) |
| Workflows | `src/features/workflow/` | `/workflow` | 🚧 占位 | [README](./features/workflow/README.md) · [Req](./features/workflow/requirements.md) · [Design](./features/workflow/design.md) · [Tasks](./features/workflow/tasks.md) |
| Insights | `src/features/insights/` | `/insights` | 🚧 占位 | [README](./features/insights/README.md) · [Req](./features/insights/requirements.md) · [Design](./features/insights/design.md) · [Tasks](./features/insights/tasks.md) |
| Settings | `src/features/settings/` | `/settings/*` (含 `/settings/menu`) | 🚧 占位 + 菜单自定义 spec | [README](./features/settings/README.md) · [Req](./features/settings/requirements.md) · [Design](./features/settings/design.md) · [Tasks](./features/settings/tasks.md) |

## Platform Specs
| File | 内容 |
|---|---|
| [00-overview](./platform/00-overview.md) | 平台愿景、范围、词汇表 |
| [01-architecture](./platform/01-architecture.md) | 分层与 feature 解剖 |
| [02-design-system](./platform/02-design-system.md) | 暗色 token / 字体 / shadcn 约定 |
| [03-i18n](./platform/03-i18n.md) | 多语言策略与流程 |
| [04-mock-api](./platform/04-mock-api.md) | mockClient 协议与切换点 |
| [05-state-management](./platform/05-state-management.md) | Zustand 全局 vs feature store |
| [06-routing](./platform/06-routing.md) | 路由组装规则 |

## ADR
见 [adr/README.md](./adr/README.md) 与 [ADR-0001](./adr/0001-record-architecture-decisions.md)。

## 写作流程 · Workflow

### 新 feature
1. 复制 `_templates/feature-README.md` / `requirements.md` / `design.md` / `tasks.md` 到 `features/<feature-key>/`
2. 按顺序填: requirements (WHAT) → design (HOW) → tasks (DO)
3. 同步建立 `src/features/<feature-key>/`(脚手架: routes / page / mock / locales)
4. 更新本 README 的状态表
5. 出现跨 feature 决策 → 新建 ADR

### 已有 feature 改动
- 影响验收标准 → 更新 `requirements.md`
- 影响实现 (路由 / 数据模型 / 状态) → 更新 `design.md`
- 新增任务 → 追加到 `tasks.md`,完成时勾选并附 PR 链接
- 跨 feature 影响 → 新建 ADR

### 拒绝改动
- 与已有 ADR 冲突的改动应先提议推翻 ADR (新 ADR 走 `Supersedes` 流程)
- spec 与代码同步 PR 提交, 不允许"先合代码再补 spec"

## 命名约定 · Naming Conventions
- 任务 ID: `T-<feature-key>-NN` (两位数字)
- ADR: `NNNN-kebab-title.md` (四位数字)
- platform spec: `NN-topic.md` (两位数字, 便于排序)
- feature 子目录: `kebab-case`, 与 `src/features/` 同名
- 章节标题: `## 中文 · English` 双语

## 状态 emoji · Status Icons
🚧 占位 · 🔨 开发中 · ✅ 已上线 · 🧪 实验性 · 🗄️ 已下线

## 关联 · Related
- 项目根 [README.md](../README.md)
- 计划文档(临时): `/Users/wangchao/.claude/plans/snappy-spinning-walrus.md`
