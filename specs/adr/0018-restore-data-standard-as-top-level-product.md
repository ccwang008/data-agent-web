# ADR-0018 · 恢复数据标准一级产品域

## 状态 · Status

Superseded by [ADR-0019](./0019-finalize-data-standards-as-assets.md)

## Supersedes

[ADR-0017](./0017-data-standards-as-assets.md)。本决策恢复并收敛 [ADR-0015](./0015-data-standard-as-top-level-product.md) 与 [ADR-0016](./0016-data-standard-owns-ontology-and-semantic-layer.md) 的产品边界。

## 决策 · Decision

数据标准建设为一级菜单和独立 `data-standard` feature，不作为数据资产类型，也不进入资产发布、申请、授权或流通流程。一级菜单下固定设置业务术语、主数据、参考数据、数据元标准和指标字典五个二级能力，使用 `/data-standard/*` 独立路由；删除原 `/data-governance/standards` 路由、旧菜单 key 和旧实现，不提供兼容入口。

数据标准域权威维护业务术语、本体模型、主数据、参考数据、数据元标准、指标字典和语义层指标模型，并负责版本查看与追溯、AI 辅助、落标稽核、整改和专项证据。跨能力组织级量化汇总仍由 `/metrics/standards` 承担。当前原型只提供 SQLite 持久化 mock，不连接真实业务系统、语义执行引擎或外部标准下发平台。

## 后果 · Consequences

- 新建独立 feature spec、菜单、路由、i18n 和 `data-agent.data-standard` 状态范围。
- 数据治理只保留元数据与数据质量，不再拥有可编辑数据标准事实。
- 数据资产域不纳管数据标准资产；数据标准资产发布、外部申请、授权和下发流程退出本期范围。
- 其他 feature 仅通过稳定标准 ID、版本和共享契约引用已发布标准，不能复制维护另一套定义。

## 备选 · Alternatives Considered

- 延续 ADR-0017 的数据标准资产化：可复用资产目录与流通，但无法承载完整的业务术语、主数据、参考数据、数据元标准和指标字典专业工作台，并会混淆标准治理与资产运营。
- 恢复 `/data-governance/standards`：改动较少，但继续把独立 DCMM 数据标准能力域放在数据治理之下。
