# Architecture Decision Records · ADR

## 是什么 · What
ADR (Architecture Decision Record) 是对一次架构选择的简短书面记录, 风格遵循 Michael Nygard 提案: **背景 → 决策 → 后果**。

## 索引 · Index
| ID | Title | Status | 截止 · Deadline |
|---|---|---|---|
| [0001](./0001-record-architecture-decisions.md) | Record architecture decisions | Accepted | — |
| [0002](./0002-knowledge-graph-management-frontend.md) | Knowledge graph management frontend | Superseded by [新版 KG spec](../features/knowledge-graph/) | — |
| 0003 | 代码编辑器选型(Gremlin / Cypher 语法支持) | 🚧 Proposed (待写) | M0 |
| 0004 | 图渲染库选型(≥ 6 布局 / Mini-map / ≥ 5000 节点) | 🚧 Proposed (待写) | M3 启动前 |
| 0005 | 文件上传组件选型(大文件 / 断点续传) | 🚧 Proposed (待写) | M3 启动前 |
| [0006](./0006-local-sqlite-state-persistence.md) | 本地 SQLite 状态持久化 | Accepted | — |
| [0007](./0007-classic-light-saas-direction.md) | Classic Light SaaS 视觉方向 | Accepted | — |
| [0008](./0008-tree-menu-and-user-customization.md) | 树形菜单与用户自定义边界 | Accepted | — |
| [0009](./0009-dcmm-readiness-not-certification.md) | DCMM 就绪度而非认证结论 | Accepted | — |
| [0010](./0010-ai-proposes-regulated-data-levels.md) | AI 只提议重要数据和核心数据等级 | Accepted | — |
| [0011](./0011-security-audit-references-source-evidence.md) | 安全审计引用来源域证据 | Accepted | — |
| 0012 | 数据库 Connector 凭证存储策略 | 🚧 Proposed (真实连接器接入前待写) | 生产化前 |
| [0013](./0013-quantitative-dashboard-as-top-level-product.md) | 量化看板作为一级跨域产品 | Accepted | — |

## 编号 · Numbering
- 4 位递增数字, 文件名 `NNNN-kebab-title.md`
- 状态机: `Proposed` → `Accepted` / `Rejected`;`Accepted` 后续可被新 ADR `Superseded`
- 不删旧 ADR;被替换时改状态并在新 ADR 中 `Supersedes ADR-NNNN`

## 新建 · Create
```bash
# 在 specs/adr/ 下执行
cp ../_templates/adr.md NNNN-your-title.md
# 填充内容, 更新本 README 的索引表
```

## 何时写 · When to Write
- 改变跨 feature 的依赖 / 技术选型 (库、框架、协议)
- 引入新的非 trivial 约定 (目录结构、命名、流程)
- 推翻或调整既有约定时

## 何时不写 · When Not to Write
- 单个 feature 内部实现选择 → 写到该 feature 的 `design.md`
- bug 修复 → 走 commit message
- 文案 / 视觉微调 → 直接合入

## 评审 · Review
- 至少一名其他贡献者 review (异步即可)
- 状态从 `Proposed` 切到 `Accepted` 需有 reviewer 签字 (PR approve 即可)
