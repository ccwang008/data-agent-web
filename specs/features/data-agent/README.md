# Data Agent

| 元数据 · Meta | 值 |
|---|---|
| 路径 · Path | `src/features/data-agent/` |
| 路由 · Route | `/data-agent/*` |
| 状态 · Status | 🔨 SQLite 持久化交互原型 |
| 负责人 · Owner | 平台产品团队 |
| 创建日期 · Created | 2026-08-25 |

## 概述 · Overview

Data Agent 是大数数据平台的一级智能任务入口，使用通用 Agent 自动路由并协调数据发现、数据问答、数据开发、数据治理和数据运维五个领域 Agent。它统一展示计划、动作、证据、确认和结果，同时把复杂编辑与最终审批留在原专业工作台。

## 关联文档 · Related Docs

- [需求 · Requirements](./requirements.md)
- [设计 · Design](./design.md)
- [任务 · Tasks](./tasks.md)
- [实施计划 · Plan](./plans/2026-08-25-data-agent-task-workspaces.md)
- [ADR-0021 · Data Agent 作为一级任务编排模块](../../adr/0021-data-agent-as-top-level-orchestration-module.md)

## 关键决策 · Key Decisions

- 不建设统一任务中心；每个 Agent 首页展示自己的任务 List。
- 底层任务记录共享，跨 Agent 任务按参与关系出现在多个列表中。
- 通用 Agent 负责编排与汇总，不复制五个领域 Agent 的专业能力。
- 六个任务详情使用专属信息架构，不复用统一聊天整页模板。
- 首期只实现 SQLite mock 交互、案例重放和上下文跳转，不接入真实推理或执行引擎。
