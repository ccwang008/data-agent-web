# Workflows · Requirements

> 关注 **WHAT**: 模块解决什么业务问题、谁来用、达到什么程度才算"完成"。HOW 留给 [design.md](./design.md)。

## 概述 · Overview
用 DAG 形式编排多个智能体与数据节点的执行流水线, 支持触发、监控、回放。

## 目标用户 · Personas
| 角色 · Role | 场景 · Scenario | 期望产出 · Outcome |
|---|---|---|
| TODO | TODO | TODO |

## 用户故事 · User Stories
- **US-01** 作为 _<角色>_, 我希望 _<能力>_, 以便 _<业务价值>_。
- **US-02** TODO

## 验收标准 · Acceptance Criteria (EARS)
- **AC-01** 当 TODO 时, 系统应当 TODO。
- **AC-02** TODO

## 范围 · In Scope
- TODO

## 非目标 · Out of Scope
- TODO (例: 不在此处定义底层调度引擎)

## 依赖 · Dependencies
- 上游 · Upstream: `agents`(节点原语)、`data-source`(IO 节点)
- 下游 · Downstream: `insights`(消费产物)
- 外部 · External: 调度引擎 (Airflow / Temporal / 自研, 待定)

## 风险与未决 · Risks & Open Questions
- ❓ DAG 编辑器: 自研 vs react-flow / Rete.js
- ❓ 与 `agents` 模块的状态同步
- ❓ 失败重试 / 部分重跑的 UX 表达
