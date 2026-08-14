# ADR-0019 · 最终确认数据标准资产化

## 状态 · Status

Superseded by [ADR-0020](./0020-finalize-data-standard-as-top-level-product.md)

## Supersedes

[ADR-0018](./0018-restore-data-standard-as-top-level-product.md)，并恢复 [ADR-0017](./0017-data-standards-as-assets.md) 的产品边界。

## 决策 · Decision

根据最新产品要求，数据标准最终作为 `data-asset` 的资产类型管理，不建设独立一级 `data-standard` feature、菜单、路由或 `data-agent.data-standard` 状态范围。标准编码、类别、定义、适用范围、批准主体、标准版本和治理状态是数据标准资产的类型专属信息；资产目录状态、权属状态和标准治理状态保持独立。

直接使用数据标准以及其他未包装为数据产品的资产时，统一进入 `/data-asset/circulation`，由一张申请贯通负责人审批、条件性安全审批、对接配置和使用证据。数据产品发布及其使用授权继续由 `/data-asset/service` 管理。

## 后果 · Consequences

- `specs/features/data-standard/` 仅保留为被替代的历史访谈与设计归档，不作为后续实现来源。
- 原 `/data-governance/standards` 不恢复；数据治理只维护元数据、质量以及对标准资产 ID/版本的引用。
- 数据标准资产可被统一检索、确权、申请、对接、引用和审计；已发布标准版本在申请时冻结，不随新版本静默升级。
- 不保存真实凭证，也不连接真实审批引擎、API 网关、文件服务或消费系统。
