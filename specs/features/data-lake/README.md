# Data Lake · 数据湖

| 元数据 · Meta | 值 |
|---|---|
| 路径 · Path | `src/features/data-lake/` |
| 路由 · Route | `/data-lake/*` |
| 子页面 · Pages | `storage` / `tables` / `capacity` |
| 状态 · Status | 🔨 SQLite 持久化 mock |

## 概述 · Overview

统一承载企业结构化和非结构化数据，并提供湖表建模、Schema/版本管理、事务能力、生命周期和容量分层视图。

## 当前实现 · Current Implementation

- `/data-lake/storage`：统一数据存储对象管理，覆盖数据表、文件、图片、视频、日志、文档等类型。
- `/data-lake/tables`：湖表列表、建模和 Schema/版本信息交互。
- `/data-lake/capacity`：存储层级、容量统计和冷热/归档/清理策略交互。
- 当前只验证前端工作流；真实湖存储、表格式、事务和生命周期执行器待接入。

## 关联文档 · Related Docs

- [需求 · Requirements](./requirements.md)
- [设计 · Design](./design.md)
- [任务 · Tasks](./tasks.md)
- [平台产品范围](../../platform/07-data-platform-product-scope.md)
