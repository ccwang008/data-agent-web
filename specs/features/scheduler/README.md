# Scheduler · 调度引擎

| 元数据 · Meta | 值 |
|---|---|
| 路径 · Path | `src/features/scheduler/` |
| 路由 · Route | `/scheduler/*` |
| 子页面 · Pages | `tasks` / `editor` / `monitor` |
| 状态 · Status | 🔨 SQLite 持久化 mock |

## 概述 · Overview

统一编排和运行数据集成、数据开发、数据处理、数据质量校验和数据服务任务，提供可视化 DAG 画布、节点配置、运行结果和任务监控。

## 当前实现 · Current Implementation

- `/scheduler/tasks`：调度任务列表，按任务域和运行状态筛选，可进入画布、运行或删除任务。
- `/scheduler/editor`：支持节点模板拖拽、画布缩放/平移、节点增删改查、节点配置和 mock 运行结果查看；覆盖数据集成、数据开发、数据处理、数据质量校验、数据服务五类节点。
- `/scheduler/monitor`：监控任务运行状态、耗时、运行次数，支持运行、停止和执行日志查看。
- 任务画布是任务列表进入后的工作台，不作为调度引擎的独立二级菜单项展示。
- 画布使用 `@xyflow/react`；当前不连接真实执行引擎。
- 任务、画布、版本和运行记录通过 `src/features/scheduler/api/mock.ts` 统一提供 mock API，并使用 `data-agent.scheduler.*` 本地 key 保存、镜像到 SQLite。

## 关联文档 · Related Docs

- [需求 · Requirements](./requirements.md)
- [设计 · Design](./design.md)
- [任务 · Tasks](./tasks.md)
- [平台产品范围](../../platform/07-data-platform-product-scope.md)
