# Knowledge Graph · Requirements

> 关注 **WHAT**: 模块解决什么业务问题、谁来用、达到什么程度才算"完成"。HOW 留给 [design.md](./design.md)。

## 概述 · Overview
KG 模块是 Data Agent 平台的图能力中心, 对标 **Apache HugeGraph Hubble** 并向外覆盖 HG 生态其他组件(loader / computer / ai / website / tool) 的前端交互面。功能与 Hubble **1:1 对齐**(模块划分 / layout / 控件类型 / 流程), 视觉与品牌完全由本项目自治, 已选定 **Classic Light SaaS Admin** 方向(浅灰工作区 + 白色面板 + 蓝色主色 + 紧凑导航), 不沿用 Hubble 视觉(无论浅色 / 深色)。

本阶段所有能力以**前端 mock**形式存在, 不接入真实 HugeGraph 服务或 SDK。

## 目标用户 · Personas
| 角色 · Role | 场景 · Scenario | 期望产出 · Outcome |
|---|---|---|
| 数据工程师 · Data Engineer | 建模、接数、跑导入、调度任务 | 全流程闭环, 操作可审计、可回退 |
| 数据分析师 · Data Analyst | 写 Gremlin / Cypher 查询、看结果图、邻居扩展 | 三种查询模式 + 三种结果视图, 节点可逐跳探索 |
| 治理 / 数据负责人 · Governance Lead | 看图实例健康、任务历史、危险操作审计 | 概览 Dashboard + 任务中心 + DangerZone 审计轨迹 |
| 业务用户 · Business User | 不写代码, 用 NL 提问或 Visual Builder 拼模式查询 | NL2Query / GraphRAG / 拖拽模式 三条无代码路径 |

## 顶层用户故事 · Top-level User Stories
> 顶层 US 描述跨子模块的旅程, 落到 ≥1 个子模块 spec 中实现; 编号 `US-G-TOP-NN`。子模块 spec 各自有局部 US。

- **US-G-TOP-01 元数据建模双模式**: 作为数据工程师, 我希望在元数据建模中切换 **List 列表模式** 与 **Graph 可视化模式**, 两种模式都能完成: 拖拽建模、属性编辑、关系定义、索引配置, 以便不同人格按习惯工作。
- **US-G-TOP-02 多源数据导入**: 作为数据工程师, 我希望在导入向导中选择 schema 后, 接入 **本地文件 / 数据库 / API** 三种数据源, 完成字段映射并监控进度, 以覆盖常见数据上钩场景。
- **US-G-TOP-03 图谱可视化探索**: 作为数据分析师, 我希望在图谱可视化中以任意顶点为起点, 逐跳扩展邻居、高亮路径、查看节点详情、调整视图样式, 而不仅是把查询结果当图画。
- **US-G-TOP-04 业务视角(Perspectives)**: 作为分析师, 我希望在同一张图上保存多套业务视角(过滤规则 + 样式映射 + 默认布局 + 收藏查询), 在 TopBar 切换, 跨页面保留。
- **US-G-TOP-05 可视化查询构建器**: 作为业务用户, 我希望通过拖拽顶点模板 / 边模板 / 属性条件来构建模式查询, 无需手写 Gremlin / Cypher。
- **US-G-TOP-06 图谱探索 Quick Actions**: 作为分析师, 我希望在 visualization 页通过 toolbar 一键执行公共邻居 / 最短路径 / 子图导出 / 模式搜索, 结果直接叠加到当前画布, 不离开页面。

## 跨模块旅程 · Cross-module Journey
"选图 → 建 schema(双模式)→ 导数据(三种源)→ 查询(三种模式: Gremlin / Cypher / Visual)→ 图谱可视化 → 跑算法 / AI → 看洞察"

## 验收标准 · Acceptance Criteria (EARS)
> 顶层 AC 编号 `AC-G-XXX`, 跨模块约定; 子模块 spec 内的 AC 编号在各自 spec 中独立。

- **AC-G-DUAL-MODE** 当用户在元数据建模页切换 List / Graph 模式时, 两种视图应当渲染**同一份** schema 数据源, 切换不丢状态; Graph 模式有未提交草稿时切换需弹出二次确认。
- **AC-G-MULTI-SOURCE** 当用户在导入向导第二步选择数据源类型时, 系统应当提供本地 / 数据库 / API 三种 Connector 入口, 后续字段映射步骤对三类共享 UI。
- **AC-G-VIZ-FIRSTCLASS** 当用户进入 `/knowledge-graph/visualization` 时, 应当看到独立的图浏览页(非 analysis 子页), 提供起点选择 / 邻居扩展 / Quick Actions / Property Panel / 样式映射 / 多布局 / Mini-map / 多格式导出。
- **AC-G-PERSPECTIVE** 当用户在 TopBar 切换 Perspective 时, 当前页面的过滤规则 / 样式 / 默认布局应当同步刷新, 跨页面保持; 重新进入应用应恢复 last-active perspective。
- **AC-G-VISUAL-QUERY** 当用户在 analysis 顶部编辑器切到 Visual Builder tab 时, 系统应当提供拖拽顶点 / 边 / 属性条件的画布, 同一模式可在三种 tab 间双向转换(允许有损), 转换失败给出提示。
- **AC-G-QUICK-ACTIONS** 当用户在 visualization 顶部 toolbar 触发 Common Neighbors / Shortest Path / Subgraph / Pattern Search 中任一动作时, 结果应当直接叠加到当前画布, 不离开页面。
- **AC-G-EXPORT** 当用户在 analysis 或 visualization 触发导出时, 系统应当支持 PNG / SVG / PDF / CSV / JSON / GraphML / GEXF / Gremlin / Cypher 至少 9 种格式; 数据量 > 1000 节点时改走 async-tasks, 完成后通过通知中心提醒下载。
- **AC-G-SHARE-URL** 当用户复制分享链接时, URL hash 应当编码当前查询 + 视图状态(视角 / 布局 / 过滤); 粘贴到新会话能完整恢复。
- **AC-G-HANDOFF** 当 ai / computer / import 触发耗时操作时, 系统应当: ① 不阻塞当前页面; ② 弹 toast 含"前往任务详情"快捷链接; ③ 任务自动出现在 async-tasks 列表顶部; ④ 任务状态变化通过全局通知中心广播。
- **AC-G-ATTRIBUTION** Apache-2.0 归属在 UI **至少一处可达**(KG hub footer 或 09-help 顶部) 可见; README 顶部含完整归属段。
- **AC-G-VISUAL-INDEPENDENCE** 整个 KG 模块的视觉应当不沿用 Hubble; 字体不得是 Inter / Arial / Roboto / system-ui / Helvetica; 默认主题为浅色, 不提供深色切换(除非 ADR 推翻)。
- **AC-G-NAV-TREE** KG 各子模块**通过左侧全局 Sidebar 树菜单切换**, KG hub 自身**不**渲染独立的 inner sub-nav。
- **AC-G-MENU-CUSTOMIZE** 当用户在 `/settings/menu` 调整菜单顺序 / 名称 / 嵌套 / 显隐时, 仅影响展示, 路由地址不变; 隐藏的菜单项仍可通过 URL 直接访问。
- **AC-G-i18n** 当用户切换语言时, KG 模块所有导航、表格标题、按钮、空态、错误态、Inspector、模式切换控件文案应同步翻译。
- **AC-G-PERF-MAIN** 进入任一 KG 子页面, 框架 skeleton 应在 < 500ms 内显现; 子页面内主数据应在 < 1.2s 内完成首屏 (mock latency 默认 220ms)。

## 范围 · In Scope
- Hubble 5 个主模块的 1:1 功能克隆(graphs / metadata / import / analysis / async-tasks)
- HG 生态扩展 4 个(computer / ai / admin / help) + 平台扩展 1 个(visualization)
- Perspectives / Visual Query Builder / 多布局 / Quick Actions / Property Panel / Style Mapping / 多格式导出 / Shareable URL
- 跨模块任务移交(任一耗时操作 → async-tasks + 通知中心)
- 左侧 Sidebar 树菜单 + `/settings/menu` 菜单自定义
- Apache-2.0 归属

## 非目标 · Out of Scope
- 真实 HugeGraph 服务连接、SDK、CLI 集成
- 真实数据持久化、认证、租户隔离
- 真实图谱抽取 / 实体消歧 / 关系抽取算法 / 查询执行引擎
- 多用户菜单方案隔离(只做本地 store)
- 图谱以外的数据库管理台(关系型 / 文档 / 向量)
- 实时多人协作

## 依赖 · Dependencies
- 上游 · Upstream: `data-source`(未来真实数据源目录, 当前 mock)
- 下游 · Downstream: `agents` / `insights` / `workflow`(未来引用图谱节点 / 消费分析结果 / 编排任务)
- 内部 · Internal: `mockClient` / Zustand / react-i18next / React Router / Tailwind / shadcn-style UI
- 外部 · External: 上游 HugeGraph 各组件**仅作为业务意图来源**, 不作为运行时依赖; 图渲染库 / 代码编辑器 / 文件上传组件 / 数据库 Connector 凭证存储待 ADR 0003–0008 定型

## 风险与未决 · Risks & Open Questions
- ❓ 大图渲染性能策略需在接入真实数据前验证(LOD / WebGL / Canvas)
- ❓ Hubble 视觉对齐度的主观评审(交付时如何裁判"功能 1:1")
- ❓ 双模式数据一致性(List 写完切到 Graph 应即时反映, 反之亦然)
- ❓ 多数据源的凭证安全(本期 mock-only, 真实接入待 ADR-0006)
- ❓ 规则告警 / 案件管理(灵感 Linkurious)是否纳入本模块还是 workflow / insights, 待 ADR
- ❓ GraphChat 对话记忆 + 多线程并行(灵感 Memgraph Lab)在 07-ai 是否本期实现
