# Platform · 平台概览 · Overview

## 一句话定位 · One-line Positioning
Data Agent 是面向数据团队的 AI 原生数据智能平台前端壳, 把"数据资产 + 智能体 + 工作流"组合成可视化、可编排的工作空间。

## 目标用户 · Target Users
| 角色 · Role | 关心什么 · Cares About |
|---|---|
| 数据工程师 · Data Engineer | 数据源接入、流水线编排、可观测性 |
| 数据分析师 · Data Analyst | 知识图谱浏览、洞察生成、自然语言查询 |
| 运维管理员 · Operator | 智能体生命周期、权限、审计 |
| 业务用户 · Business User | 报表、看板、问答式数据消费 |

## 模块全景 · Modules at a Glance
| Key | 名称 · Name | 状态 · Status | 入口 · Route |
|---|---|---|---|
| `knowledge-graph` | 知识图谱 | 🔨 脚手架 | `/knowledge-graph` |
| `data-source` | 数据源 | 🚧 占位 | `/data-source` |
| `agents` | 智能体 | 🚧 占位 | `/agents` |
| `workflow` | 编排流水线 | 🚧 占位 | `/workflow` |
| `insights` | 洞察分析 | 🚧 占位 | `/insights` |
| `settings` | 系统设置 | 🚧 占位 | `/settings` |

## 技术范围 · In Scope
- 纯前端: React 18 + TypeScript + Vite
- 样式: Tailwind CSS + shadcn/ui (new-york, dark)
- 状态: Zustand (持久化)
- 路由: react-router-dom v6
- 多语言: i18next (zh-CN 默认 / en-US fallback)
- Mock API: `mockClient` (单点切换到真实 API)

## 非目标 · Out of Scope (本阶段 · This Phase)
- 后端实现
- 鉴权/权限模型(预留 `settings` 模块)
- 移动端响应式自适应(优先桌面 ≥ 1280px)
- 离线/PWA

## 词汇表 · Glossary
| 术语 · Term | 释义 · Definition |
|---|---|
| Agent · 智能体 | 可被编排和触发的、围绕特定数据任务的 AI 角色 |
| Knowledge Graph · 知识图谱 | 实体 + 关系 + 本体的图状语义资产 |
| Workflow · 编排流水线 | 由多个 agent / 数据节点组成的 DAG 执行单元 |
| Insight · 洞察 | 由 agent 自动生成或由用户保存的、对数据的解读结论 |
| Mock 模式 | 前端通过 `mockClient` 命中本地 fixture, 不依赖真实后端 |
