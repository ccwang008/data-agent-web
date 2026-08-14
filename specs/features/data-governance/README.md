# Data Governance · 数据治理

| 元数据 · Meta | 值 |
|---|---|
| 路径 · Path | `src/features/data-governance/` |
| 路由 · Route | `/data-governance/*` |
| 子页面 · Pages | `metadata` / `quality` |
| 状态 · Status | 🔨 SQLite 持久化 mock |

## 概述 · Overview

通过元数据、血缘、数据地图、质量规则和质量评分提升数据的可信度、可理解性和规范性，为数据标准落标、数据资产运营和数据服务提供治理对象及质量依据。

## 当前实现 · Current Implementation

- `/data-governance/metadata`：元数据检索、详情、责任信息和血缘关系交互。
- `/data-governance/quality`：质量规则、指标、评分、启停和执行结果交互。
- 数据标准不在本 feature 维护第二套可编辑事实；目标入口为独立 `/data-standard/*`，本 feature 只保存稳定标准 ID、版本 ID 和稽核摘要。
- 原 `/data-governance/standards` 删除，不提供兼容入口；数据标准也不作为数据资产类型流通。
- 当前只验证前端治理工作流；真实扫描、规则执行、血缘采集和审批服务待接入。

## 关联文档 · Related Docs

- [需求 · Requirements](./requirements.md)
- [设计 · Design](./design.md)
- [任务 · Tasks](./tasks.md)
- [平台产品范围](../../platform/07-data-platform-product-scope.md)
