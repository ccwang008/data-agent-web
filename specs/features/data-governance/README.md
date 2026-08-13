# Data Governance · 数据治理

| 元数据 · Meta | 值 |
|---|---|
| 路径 · Path | `src/features/data-governance/` |
| 路由 · Route | `/data-governance/*` |
| 子页面 · Pages | `metadata` / `quality` / `standards` |
| 状态 · Status | 🔨 SQLite 持久化 mock |

## 概述 · Overview

通过元数据、血缘、数据地图、质量规则、质量评分和数据标准，提升数据的可信度、可理解性和规范性，为数据资产运营和数据服务提供治理依据。

## 当前实现 · Current Implementation

- `/data-governance/metadata`：元数据检索、详情、责任信息和血缘关系交互。
- `/data-governance/quality`：质量规则、指标、评分、启停和执行结果交互。
- `/data-governance/standards`：业务术语、指标定义、标准状态和审批交互。
- 当前只验证前端治理工作流；真实扫描、规则执行、血缘采集和审批服务待接入。

## 关联文档 · Related Docs

- [需求 · Requirements](./requirements.md)
- [设计 · Design](./design.md)
- [任务 · Tasks](./tasks.md)
- [平台产品范围](../../platform/07-data-platform-product-scope.md)
