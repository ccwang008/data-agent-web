# Data Integration · 数据集成

| 元数据 · Meta | 值 |
|---|---|
| 路径 · Path | `src/features/data-source/` |
| 路由 · Route | `/data-source/*` |
| 子页面 · Pages | `sources` / `sync` / `exchange` |
| 状态 · Status | 🔨 SQLite 持久化 mock |

## 概述 · Overview

统一管理企业数据源、数据同步和共享交换，为数据湖、治理、开发、调度、数据服务和 AI 能力提供标准化的数据入口。

## 当前实现 · Current Implementation

- `/data-source/sources`：数据库、文件源、本地文件、消息队列、API 等数据源的列表、创建、编辑、删除和连接测试交互。
- `/data-source/sync`：全量、增量、CDC、实时同步任务的配置、状态、进度和运行管理交互。
- `/data-source/exchange`：API、文件、库表、消息交换的配置和状态管理交互。
- 当前数据为 SQLite 持久化 mock；真实连接器、凭证托管、执行引擎和传输链路待后端接入。

## 关联文档 · Related Docs

- [需求 · Requirements](./requirements.md)
- [设计 · Design](./design.md)
- [任务 · Tasks](./tasks.md)
- [平台产品范围](../../platform/07-data-platform-product-scope.md)
