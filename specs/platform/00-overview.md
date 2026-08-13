# Platform · 平台概览 · Overview

## 一句话定位 · One-line Positioning
大数数据平台是面向企业的数据资产运营与 AI 数据服务平台, 将数据接入、数据湖、数据治理、数据开发、调度、安全和运维串成可发现、可使用、可运营的数据闭环。

## 目标用户 · Target Users
| 角色 · Role | 关心什么 · Cares About |
|---|---|
| 数据工程师 · Data Engineer | 数据源接入、数据湖表、ETL/SQL/Notebook、流水线编排 |
| 数据治理人员 · Data Steward | 元数据、血缘、数据质量、数据标准和数据价值 |
| 运维管理员 · Operator | 任务、链路、质量、计算资源、安全和审计 |
| 业务用户 · Business User | 资产检索、申请授权、指标和数据服务调用 |
| AI 应用开发者 · AI Builder | 通过数据服务、知识中心和知识图谱使用可信数据 |

## 模块全景 · Modules at a Glance
| Key | 名称 · Name | 状态 · Status | 入口 · Route |
|---|---|---|---|
| `product-matrix` | 产品矩阵首页 | 🔨 SQLite 持久化 mock | `/` |
| `solutions` | 行业解决方案 | 🔨 本地图片与状态 mock | `/solutions` |
| `data-source` | 数据集成 | 🔨 SQLite 持久化 mock | `/data-source/*` |
| `data-lake` | 数据湖 | 🔨 SQLite 持久化 mock | `/data-lake/*` |
| `data-governance` | 数据治理 | 🔨 SQLite 持久化 mock | `/data-governance/*` |
| `scheduler` | 调度引擎 | 🔨 SQLite 持久化 mock | `/scheduler/*` |
| `data-asset` | 数据资产运营 | 🔨 SQLite 持久化 mock | `/data-asset/*` |
| `data-development` | 数据开发 | 🔨 SQLite 持久化 mock | `/data-development/*` |
| `ops-monitor` | 运维与监控 | 🔨 SQLite 持久化 mock | `/ops-monitor/*` |
| `data-security` | 数据安全 | 🔨 基础分类/脱敏 SQLite mock；合规增强设计完成 | `/data-security/*` |
| `knowledge-center` | 知识中心 | 🔨 前端 mock | `/knowledge-center/*` |
| `knowledge-graph` | 知识图谱 | 🔨 hub + 子模块 | `/knowledge-graph/*` |
| `agents` / `workflow` / `insights` / `settings` | AI 与平台扩展 | 🚧 基础页面或占位 | 对应 feature 路由 |

## 技术范围 · In Scope
- 本地全栈原型: React 18 + TypeScript + Vite + Node 22 `node:sqlite`
- 样式: Tailwind CSS + shadcn/ui (new-york, classic light SaaS)
- 状态: Zustand (持久化)
- 路由: react-router-dom v6
- 多语言: i18next (zh-CN 默认 / en-US fallback)
- 状态持久化: `useSqliteState` + `server/sqlite.mjs` + `local-json-store` fallback
- Mock API / 模拟执行: `mockClient`

## 参考标准 · Reference Standards

- [GB/T 36073—2025《数据管理能力成熟度评估模型》](./references/GB_T_36073-2025_数据管理能力成熟度评估模型.pdf)：用于 DCMM 4 级就绪度、量化指标和证据结构的产品设计参考。

## 非目标 · Out of Scope (本阶段 · This Phase)
- 真实生产后端和外部数据连接器
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
| Mock 模式 | 前端通过 `mockClient` 命中本地 fixture，执行结果为演示语义 |
| SQLite 状态 | 通过 `useSqliteState` 保存到项目本地 `data/platform.sqlite` 的 JSON scope |
| 数据资产 | 经治理、可发现、可授权、可使用和可追踪的数据资源 |
| 数据服务 | 对查询、指标、处理或编排能力的稳定 API 封装 |
| 数据湖 | 统一承载结构化和非结构化数据的存储与管理层 |
| 数据血缘 | 描述数据对象、任务、服务之间上下游关系的依赖图 |
| CDC | Change Data Capture, 捕获源端数据变更并进行增量同步 |
