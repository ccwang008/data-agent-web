# Knowledge Graph · 知识图谱

| 元数据 · Meta | 值 |
|---|---|
| 路径 · Path | `src/features/knowledge-graph/` |
| 路由 · Route | `/knowledge-graph` (默认重定向 `/knowledge-graph/graphs`) |
| 状态 · Status | 🔨 hub (10 子模块) |
| 负责人 · Owner | _未指派_ |
| 创建日期 · Created | 2026-05-12 |
| 最近一次重写 · Last Rewrite | 2026-05-13 |

## 定位 · Positioning
对标 **Apache HugeGraph Hubble** 的 KG 工作空间(功能 1:1 克隆), 并向外扩展整合 HugeGraph 生态其他组件 (loader / computer / ai / website / tool) 的前端交互面, 作为 Data Agent 平台的图能力中心。

> **视觉与功能的边界**: Hubble 视觉(无论浅色 / 深色)整体不沿用; 本项目视觉方向已收敛为 **Classic Light SaaS Admin** — 浅灰工作区 + 白色面板 + 蓝色主色 + 紧凑导航 + IBM Plex Mono 数据字体。功能、模块划分、layout、控件类型、流程与 Hubble 1:1 对齐("Hubble 的骨, 本项目的皮")。

## 归属 · Attribution (Apache License 2.0)
本模块的 UI 结构、模块划分与交互流程衍生自 **Apache HugeGraph** 与其子项目 **Hubble**, 采用 **Apache License 2.0** 许可。

- 项目: <https://github.com/apache/hugegraph>
- 官网与文档: <https://hugegraph.apache.org/>

本仓库**未**直接引入 HugeGraph 项目的源代码、SDK、CLI、服务端依赖或 Hubble 前端资源(图标 / 截图 / 文案)。一旦未来引入任何第三方代码或资源, 必须随之复制对应的 `LICENSE` 与 `NOTICE` 文件到本仓库根目录, 并在此段补充清单。

## 导航 · Navigation
KG 各子模块**作为全局 Sidebar 树菜单**的二级节点存在, KG hub 自身不再保留独立的 inner sub-nav, 只保留 TopBar(图切换器 + Perspective 下拉 + 通知中心) + Outlet。菜单的展示(顺序 / 嵌套 / 名称 / 显隐) 可在 `/settings/menu` 自定义, 路由本身不被用户配置影响。

## 子模块状态表 · Submodule Status

| # | Key | 中文名 | 类别 · Class | 优先级 · Milestone | Spec |
|---|---|---|---|---|---|
| 01 | `graphs` | 图实例管理(含详情概览) | Hubble 1:1 + 平台扩展 Dashboard | M1 | [→](./submodules/01-graphs.md) |
| 02 | `metadata` | 元数据建模 (List / Graph 双模式) | Hubble 1:1 | M1 + M3 | [→](./submodules/02-metadata.md) |
| 03 | `import` | 数据导入 (Connector 抽象) | Hubble 1:1 + 平台扩展 | M3-M4 | [→](./submodules/03-import.md) |
| 04 | `analysis` | 数据分析 (Gremlin + 三 tab + Visual Builder) | Hubble 1:1 + 平台扩展 | M2-M3 | [→](./submodules/04-analysis.md) |
| 05 | `async-tasks` | 异步任务管理(+ 全局通知中心) | Hubble 1:1 | M2 | [→](./submodules/05-async-tasks.md) |
| 06 | `computer` | 图计算 (hugegraph-computer) | 平台扩展 | M4 | [→](./submodules/06-computer.md) |
| 07 | `ai` | 图 AI (hugegraph-ai) | 平台扩展 | M4 | [→](./submodules/07-ai.md) |
| 08 | `admin` | 危险操作中心 (hugegraph-tool) | 平台扩展 | M5 | [→](./submodules/08-admin.md) |
| 09 | `help` | 帮助与深链 (hugegraph-website) | 平台扩展 | M5 | [→](./submodules/09-help.md) |
| 10 | `visualization` | 图谱浏览与探索 | 平台扩展 (一等公民) | M3-M5 | [→](./submodules/10-visualization.md) |

> **Client SDK** (Java / Python) 不出现在前端规格中。

## 当前实现 · Current Implementation
`src/features/knowledge-graph/` 仅有 P0 脚手架: 单页 `KnowledgeGraphPage` + 一个 mock 端点 `/api/knowledge-graph/overview` + i18n 命名空间 `knowledge-graph`。本次 spec 重写 **不改动任何代码**, 子模块实现由 `tasks.md` 的 M0–M5 里程碑分批落地。

## 关联文档 · Related Docs
- [需求 · Requirements](./requirements.md) — 顶层 US / Personas / 跨模块 EARS
- [设计 · Design](./design.md) — 架构 / 路由 / Connector 抽象 / Fixtures / 视觉对齐清单
- [任务 · Tasks](./tasks.md) — M0–M5 + ADR 截止排期
- [submodules/](./submodules/) — 10 个子模块 spec
- 平台规约: [`platform/02-design-system.md`](../../platform/02-design-system.md)(待 ADR-0007 重写) · [`platform/04-mock-api.md`](../../platform/04-mock-api.md) · [`platform/05-state-management.md`](../../platform/05-state-management.md) · [`platform/06-routing.md`](../../platform/06-routing.md)

## 关键决策 · Key Decisions
- **重写动因**: 把抽象规格换成基于 Hubble 的结构化 1:1 规格, 同时把 HugeGraph 生态其他组件纳入子模块清单, 避免后期"碎片化新增"
- **视觉方向重定**: 不沿用 Hubble 视觉, 走 Classic Light SaaS Admin; **ADR-0007** 用于记录当前浅色 SaaS token 与组件约定
- **导航 IA 重塑**: KG 子模块作为全局 Sidebar 树菜单二级节点; 用户可在 `/settings/menu` 自定义菜单展示, 起 **ADR-0008** 界定"展示 vs 路由"边界
- **库选型一律 TBD**: 图渲染库 / 代码编辑器 / 文件上传组件 / 数据库 Connector 凭证存储 → 走独立 ADR(0003–0008), 截止时间锁死在 `tasks.md`
- **竞品强项纳入**: Perspectives / Visual Query Builder / Multi-Layout / Quick Actions / Property Panel / Style Mapping / Multi-format Export / Shareable URL, 见 `requirements.md` 顶层 US 与各子模块 spec
