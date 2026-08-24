# Architecture Decision Records · ADR

## 是什么 · What
ADR (Architecture Decision Record) 是对一次架构选择的简短书面记录, 风格遵循 Michael Nygard 提案: **背景 → 决策 → 后果**。

## 索引 · Index
| ID | Title | Status | 截止 · Deadline |
|---|---|---|---|
| [0001](./0001-record-architecture-decisions.md) | Record architecture decisions | Accepted | — |
| [0006](./0006-local-sqlite-state-persistence.md) | 本地 SQLite 状态持久化 | Accepted | — |
| [0007](./0007-classic-light-saas-direction.md) | Classic Light SaaS 视觉方向 | Accepted | — |
| [0008](./0008-tree-menu-and-user-customization.md) | 树形菜单与用户自定义边界 | Accepted | — |
| [0009](./0009-dcmm-readiness-not-certification.md) | DCMM 就绪度而非认证结论 | Accepted | — |
| [0010](./0010-ai-proposes-regulated-data-levels.md) | AI 只提议重要数据和核心数据等级 | Accepted | — |
| [0011](./0011-security-audit-references-source-evidence.md) | 安全审计引用来源域证据 | Accepted | — |
| 0012 | 数据库 Connector 凭证存储策略 | 🚧 Proposed (真实连接器接入前待写) | 生产化前 |
| [0013](./0013-quantitative-dashboard-as-top-level-product.md) | 量化看板作为一级跨域产品 | Superseded by [0014](./0014-comprehensive-plus-nine-domain-dashboards.md) | — |
| [0014](./0014-comprehensive-plus-nine-domain-dashboards.md) | 综合看板加九大能力域看板 | Accepted | — |
| [0015](./0015-data-standard-as-top-level-product.md) | 数据标准作为一级产品域 | Superseded by [0017](./0017-data-standards-as-assets.md) | — |
| [0016](./0016-data-standard-owns-ontology-and-semantic-layer.md) | 数据标准维护本体模型与语义层 | Superseded by [0017](./0017-data-standards-as-assets.md) | — |
| [0017](./0017-data-standards-as-assets.md) | 数据标准作为数据资产 | Superseded by [0018](./0018-restore-data-standard-as-top-level-product.md) | — |
| [0018](./0018-restore-data-standard-as-top-level-product.md) | 恢复数据标准一级产品域 | Superseded by [0019](./0019-finalize-data-standards-as-assets.md) | — |
| [0019](./0019-finalize-data-standards-as-assets.md) | 最终确认数据标准资产化 | Superseded by [0020](./0020-finalize-data-standard-as-top-level-product.md) | — |
| [0020](./0020-finalize-data-standard-as-top-level-product.md) | 最终确认数据标准为一级产品域 | Accepted | — |

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
