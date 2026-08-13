# Data Asset · 数据资产运营

| 元数据 · Meta | 值 |
|---|---|
| 路径 · Path | `src/features/data-asset/` |
| 路由 · Route | `/data-asset/*` |
| 状态 · Status | 🔨 前端 mock（SQLite 持久化） |
| 负责人 · Owner | 数据资产运营团队 |
| 创建日期 · Created | 2026-08-13 |

## 概述 · Overview

数据资产运营是数据资产管理域的核心产品，覆盖资产目录、权属登记、价值评估、资产运营（数据产品与使用授权）和使用审计五项核心功能，并配套 DCMM 4 级量化管理报告，帮助组织实现数据资产从确权到运营的全生命周期闭环。

## 关联文档 · Related Docs

- [需求 · Requirements](./requirements.md)
- [设计 · Design](./design.md)
- [任务 · Tasks](./tasks.md)
- [实现计划 · Plan](./plans/2026-08-13-data-asset-implementation.md)

## 关键决策 · Key Decisions

- 五个页面：资产目录 `/data-asset/catalog`、权属登记 `/data-asset/ownership`、价值评估 `/data-asset/value`、资产运营 `/data-asset/service`、使用审计 `/data-asset/audit`；量化报告作为独立页面 `/data-asset/reports` 承载八项指标、月度专项报告与季度综合报告（设计「量化管理」章节的落地载体）。
- 资产详情并列展示目录、权属、评估、运营四组独立状态，不设置混合总状态。
- 全部可变业务状态统一使用 `useSqliteState` 持久化，scope 为 `data-agent.data-asset`，不重复实现 localStorage 或 mockClient 路由。
- 资产目录通过共享 `dataSourceRegistry` 读取 `data-agent.data-source.sources`，支持引用稳定数据源 ID 直接添加资产；无法自动扫描的资产继续使用人工补录。
- 资产与字段只引用数据安全模块当前生效的分类分级记录（mock），不在资产模块复制维护安全等级。
- 固定流程模板：权属登记「登记人提交 → 主体确认」；价值评估「评估人提交 → 复核人审批」；产品发布「运营提交 → 资产负责人确认 → 安全审批」；使用授权「使用方提交 → 资产负责人审批，敏感/外部追加安全审批」。
- 发布门槛、权属失效联动、估值重评、异常闭环等跨域联动以明确固定规则实现。
