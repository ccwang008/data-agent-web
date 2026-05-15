# 01 · Graphs · 图实例管理

> 类别: Hubble 1:1 + 平台扩展 Dashboard
> Hubble 参照: <https://hugegraph.apache.org/docs/quickstart/hugegraph-hubble/>(图管理模块)

## 元数据 · Meta
| 项 | 值 |
|---|---|
| 路由 | `/knowledge-graph/graphs` (列表) · `/knowledge-graph/graphs/:id` (详情) |
| 状态 | 🚧 待实现 |
| 优先级 | M1 |
| 类别 | Hubble 1:1 (列表 + 创建 + 切换) + 平台扩展 (详情 Dashboard) |

## 概述 · Overview
管理 KG hub 下的所有 mock 图实例: 列表浏览 / 创建 / 编辑 / 切换 / 删除, 以及详情页的"概览(Dashboard)"和"明细"两块。"概览"是本项目相对 Hubble 的差异化扩展, 治理 / 数据负责人人格驱动。

## Hubble UI 参照 · UI Reference
对应 Hubble "图管理" 模块:
- **列表区**: 卡片网格(也可切表格), 卡片信息含名称 / 实例标识 / 主机 / 端口 / 状态徽标 / 操作按钮组
- **创建对话框**: 输入实例标识 / 主机 / 端口 / 凭证, 提交后加入列表
- **TopBar 切换器**: KG hub TopBar 永远显示当前激活图实例, 可下拉切换

> 本项目**不**镜像 HG 真实连接协议, 字段仅在 UI 层面对齐, 数据走 mock。

## 用户故事 · User Stories
- **US-01** 作为运维, 我希望以卡片网格浏览所有图实例, 一眼看到状态与近 24h 关键指标
- **US-02** 作为运维, 我希望在 TopBar 一键切换当前激活图实例, 切换后所有子模块的"当前图"上下文同步更新
- **US-03** 作为数据负责人(平台扩展), 我希望点开任意图实例查看"概览"页, 包含: 顶点 / 边计数、各 VertexLabel 分布、近期任务、最近导入摘要、索引健康
- **US-04** 作为运维, 我希望对单个图实例执行编辑 / 删除操作, 删除前有二次确认
- **US-05** 作为分析师, 我希望在列表与详情之间用面包屑双向跳转

## 验收 · Acceptance Criteria (EARS)
- **AC-01 视觉对齐** 当用户进入 `/knowledge-graph/graphs` 时, 应当看到"实例卡片网格" + 右上"新建"按钮 + 顶部搜索框, 与 Hubble 同位
- **AC-02 视觉对齐** 当 KG hub 任何子页面渲染时, TopBar 应当持续显示当前激活图实例的下拉切换器, 与 Hubble 同位
- **AC-03** 当用户点击单个实例卡片时, 应当进入 `/knowledge-graph/graphs/:id`, 默认展示"概览" tab(平台扩展), 可切换到"明细" tab
- **AC-04** 当用户提交"新建图"表单, 字段未通过校验时, 系统应当显示行内错误, 不破坏页面状态
- **AC-05** 当用户删除实例时, 应当二次确认(输入实例标识); 成功后回退到列表 + toast 提示
- **AC-06 概览段** 概览 tab 应当包含: 顶点数 / 边数(大字号 mono) · 各 VertexLabel 分布(柱状或环) · 近期 5 条异步任务(链接到 05-async-tasks) · 最近 3 条导入摘要(链接到 03-import) · 索引健康(就绪 / 构建中 / 失败计数)
- **AC-07** 当用户切换 TopBar 实例时, `useKnowledgeGraphStore.currentGraphId` 应当更新, 所有子页面应当重新拉取该实例的 mock 数据
- **AC-08** 删除当前激活实例时, 系统应当自动切换到列表第一项, 不允许出现"无 currentGraphId" 状态(除非列表为空, 此时引导新建)

## 数据模型 · Data Model
```ts
interface GraphInstance {
  id: string;
  name: string;              // 实例标识(对齐 Hubble 概念)
  host: string;
  port: number;
  status: 'healthy' | 'warning' | 'offline';
  createdAt: string;
  updatedAt: string;
}

interface GraphOverviewStats {
  graphId: string;
  vertexCount: number;
  edgeCount: number;
  vertexLabelDistribution: Array<{ label: string; count: number }>;
  recentTasks: Array<{ id: string; type: string; status: string; createdAt: string }>;
  recentImports: Array<{ id: string; sourceKind: 'local' | 'database' | 'api'; rows: number; finishedAt: string }>;
  indexHealth: { ready: number; building: number; failed: number };
}
```

## 本地接口 · Local Mock API
| Method | Path | Response |
|---|---|---|
| GET | `/api/knowledge-graph/graphs/list` | `GraphInstance[]` |
| GET | `/api/knowledge-graph/graphs/:id/detail` | `GraphInstance` |
| GET | `/api/knowledge-graph/graphs/:id/overview-stats` | `GraphOverviewStats` |
| POST | `/api/knowledge-graph/graphs` | `GraphInstance` (创建) |
| PATCH | `/api/knowledge-graph/graphs/:id` | `GraphInstance` (编辑) |
| DELETE | `/api/knowledge-graph/graphs/:id` | `{ ok: boolean }` |

## 路由 · Routes
- `/knowledge-graph/graphs` → `GraphsListPage`
- `/knowledge-graph/graphs/:id` → `GraphDetailPage` (默认 `?tab=overview`)
- `/knowledge-graph/graphs/:id?tab=detail` → 同页, 明细 tab

## 组件分解 · Components
- `GraphsListPage`
  - `GraphSearchBar`
  - `GraphCard`(卡片网格 item)
  - `CreateGraphDialog`
- `GraphDetailPage`
  - `GraphDetailTabs`(overview / detail 两 tab)
  - `OverviewDashboard`(平台扩展)
    - `MetricCard`(顶点 / 边 / Label 数)
    - `LabelDistributionChart`
    - `RecentTasksList`
    - `RecentImportsList`
    - `IndexHealthSummary`
  - `GraphDetailForm`(明细 / 编辑)

## 交互与边界 · UX & Edges
- **空态**: 列表为空 → 大号 hero 引导"创建你的第一个图实例"(grotesque 标题, cobalt CTA 按钮)
- **错误态**: 列表加载失败 → 卡片网格区域错误占位 + 重试按钮, 不影响 TopBar
- **超时**: mock 默认 220ms, 失败率可配; 错误必须以工作区级错误态呈现, 不弹全局 modal
- **删除确认**: 必须输入实例标识完全匹配才放行(防误删)
- **TopBar 切换**: 切换中显示 cobalt 进度条横线, 切换完成淡出

## 开放问题 · Open Questions
- ❓ "概览"页指标是否要支持自定义(用户拖拽卡片顺序 / 隐藏)? P2 走 Perspective(E1) 顺带能力
- ❓ 多用户场景下, 实例列表是按用户隔离还是共享? 走 ADR(后续)

## 关联 · Links
- [Requirements](../requirements.md)
- [Design](../design.md)
- 上游 Hubble: 图管理模块
- 下游: 任何 KG 子页面(均通过 `currentGraphId` 拉对应图数据)
- 平台扩展: 概览 Dashboard 灵感来自 Linkurious / TigerGraph Dashboard
