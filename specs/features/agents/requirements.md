# Agents · Requirements

> 关注 **WHAT**: 模块解决什么业务问题、谁来用、达到什么程度才算"完成"。HOW 留给 [design.md](./design.md)。

## 概述 · Overview
创建、配置、触发、监控围绕数据任务的 AI 智能体。智能体是 workflow 的执行原语, 消费 KG / data-source 数据, 产出 insights。

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
- TODO (例: 不在此处定义模型微调 / RAG 索引构建)

## 依赖 · Dependencies
- 上游 · Upstream: `data-source`(数据输入)、`knowledge-graph`(语义上下文)
- 下游 · Downstream: `workflow`(被编排)、`insights`(产出消费)
- 外部 · External: 模型推理服务 (待定)

## 风险与未决 · Risks & Open Questions
- ❓ 智能体的能力边界 (技能注册机制)
- ❓ 触发方式: 即席 / 定时 / 事件驱动
- ❓ 失败重试与幂等性
