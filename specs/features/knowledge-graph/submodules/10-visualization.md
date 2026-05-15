# 10 · Visualization · 图谱浏览与探索

> 类别: 平台扩展(从 04-analysis Graph tab 独立出来, 作为一等公民)
> Hubble 参照: 无, 平台自设计(灵感: Neo4j Bloom / NebulaGraph Explorer / Linkurious)

## 元数据 · Meta
| 项 | 值 |
|---|---|
| 路由 | `/knowledge-graph/visualization` |
| 状态 | 🚧 待实现 |
| 优先级 | M3-M5 (M3 起点 + 邻居扩展 + Property Panel; M4 Quick Actions + 多布局; M5 高级交互 + 性能) |
| 类别 | 平台扩展 (一等公民) |

## 概述 · Overview
独立的"图浏览与探索"子模块, 不依赖 04-analysis 查询。用户从任意顶点起步, 逐跳扩展邻居, 高亮路径, 查看节点详情, 调整视图样式, 应用 Perspective, 切换布局, 导出多格式。与 04-analysis 的关系: 后者解决"查→看结果", 本模块解决"探索整张图"。两者共享 `<GraphCanvas>` 组件, 但路由、状态 slice、URL 独立。

## 用户故事 · User Stories
- **US-01** 作为分析师, 我希望以任意顶点(搜索 / 输入 ID) 为起点开始探索
- **US-02** 作为分析师, 我希望通过 toolbar 一键执行 **Quick Actions**: 公共邻居 / 最短路径 / 子图导出 / 模式搜索 (对应 `AC-G-QUICK-ACTIONS`)
- **US-03** 作为分析师, 我希望切换多种布局: 力导向 / 层次 / 圆形 / 径向 / 网格 / Dagre 有向 (对应 `AC-G-VIZ-FIRSTCLASS`)
- **US-04** 作为分析师, 我希望单击节点 / 边时打开 Property Panel, 看属性 / 邻居计数 / 跳到 02-metadata Label 定义
- **US-05** 作为分析师, 我希望节点 / 边样式按 property / degree 映射(沿用 02-metadata 配置 + Perspective)
- **US-06** 作为分析师, 我希望有 Mini-map 在大图中导航
- **US-07** 作为分析师, 我希望多选节点 + 批量操作(隐藏 / 移交查询 / 删除选择)
- **US-08** 作为分析师, 我希望应用 Perspective(过滤 + 样式 + 默认布局 + 收藏查询)
- **US-09** 作为分析师, 我希望多格式导出: PNG / SVG / PDF / GraphML / GEXF 等; > 1000 节点走 async

## 验收 · Acceptance Criteria (EARS)
- **AC-01 独立子页** 用户进入 `/knowledge-graph/visualization` 时, 应当看到独立的浏览页(不是 04-analysis 的 sub-tab) (对应 `AC-G-VIZ-FIRSTCLASS`)
- **AC-02 起点选择** 顶部 toolbar 应当有"选择起点"控件: 搜索框(按顶点 ID / 属性) + "随机起点"按钮; 选定后画布以该顶点为中心渲染
- **AC-03 邻居扩展** 选中节点后, 应当提供"扩展邻居"按钮(可配置深度 1-3) + 默认 1 跳; 已扩展节点显式标记
- **AC-04 Quick Actions toolbar** 顶部应当固定 Quick Actions 工具栏, 至少含: Common Neighbors / Shortest Path / Subgraph / Pattern Search 四个按钮; 每个动作结果**叠加**到当前画布, 不离开页面
- **AC-05 多布局** Layout 下拉应当至少含 6 种: force / hierarchical / circular / radial / grid / dagre; 切换时画布平滑过渡, 不丢选中 / 高亮 / Property Panel 状态
- **AC-06 Property Panel** 单击节点 / 边 → 右侧滑出详情侧栏, ESC / 点击空白关闭
- **AC-07 样式映射** 样式 tab 提供 by property(枚举值映射颜色 / 形状) + by degree(中心性映射大小)
- **AC-08 Mini-map** 画布右下角始终显示 mini-map, 可拖拽视图框, 双击居中
- **AC-09 多选 + 批量** 长按 Shift 或框选支持多选; 多选后 toolbar 出现"隐藏 / 移交分析 / 删除选择"按钮
- **AC-10 Perspective 应用** TopBar Perspective 切换器变更时, 本页样式 / 过滤 / 布局立即应用 (对应 `AC-G-PERSPECTIVE`)
- **AC-11 多格式导出** 顶部"导出"下拉含 PNG / SVG / PDF / CSV / JSON / GraphML / GEXF 等; > 1000 节点自动转 async (对应 `AC-G-EXPORT`)
- **AC-12 性能** ≥ 500 节点时, hierarchical / dagre 布局应当走 Web Worker, 不阻塞主线程

## 数据模型 · Data Model
```ts
type LayoutKind = 'force' | 'hierarchical' | 'circular' | 'radial' | 'grid' | 'dagre';

interface VisualizationState {
  rootVertexId: string | null;
  expandedSet: Set<string>;          // 已展开过邻居的节点
  layout: LayoutKind;
  layoutSeed: number;                 // 影响初始位置
  styleOverrides: StyleRule[];        // Perspective 应用后的样式
  visibleVertexIds: Set<string>;     // 多选隐藏后的剩余集合
  selectedVertexIds: Set<string>;    // 多选集合
  highlightedPath: { vertices: string[]; edges: string[] } | null;
}

interface QuickActionResult {
  kind: 'common-neighbors' | 'shortest-path' | 'subgraph' | 'pattern-search';
  addedVertices: Vertex[];
  addedEdges: Edge[];
  highlight?: { vertices: string[]; edges: string[] };
  warning?: string;
}
```

## 本地接口 · Local Mock API
| Method | Path | Response |
|---|---|---|
| POST | `/api/knowledge-graph/visualization/start` | `{ vertex: Vertex; oneHop: { vertices: Vertex[]; edges: Edge[] } }` |
| POST | `/api/knowledge-graph/visualization/expand` | `{ vertices: Vertex[]; edges: Edge[] }` (body: `{ vertexId, depth, edgeLabels? }`) |
| POST | `/api/knowledge-graph/visualization/paths` | `{ paths: Path[] }` (body: `{ fromId, toId, kind: 'shortest'|'all'|'topK', k? }`) |
| POST | `/api/knowledge-graph/visualization/vertex-detail` | `Vertex & { neighborCount: number; ... }` |
| POST | `/api/knowledge-graph/visualization/common-neighbors` | `QuickActionResult` (body: `{ vertexIds: string[] }`) |
| POST | `/api/knowledge-graph/visualization/shortest-path` | `QuickActionResult` |
| POST | `/api/knowledge-graph/visualization/subgraph` | `QuickActionResult` (body: `{ rootIds, depth }`) |
| POST | `/api/knowledge-graph/visualization/pattern-search` | `QuickActionResult` (body: `{ pattern: VisualQueryPattern }`) |
| POST | `/api/knowledge-graph/visualization/layout` | `{ positions: Record<string, { x: number; y: number }> }` (body: `{ layout, vertexIds }`) |
| POST | `/api/knowledge-graph/visualization/export?format=<fmt>` | 同步 blob meta / 异步 `{ taskId }` |

## 路由 · Routes
- `/knowledge-graph/visualization` → 默认空画布 + 引导
- `/knowledge-graph/visualization?startId=<id>` → 以指定顶点为起点
- `/knowledge-graph/visualization?seed=<query-hash>` → 从 04-analysis 移交的结果集 seed
- `/knowledge-graph/visualization#share=<hash>` → 分享链接恢复(沿用 04-analysis 的 share URL 协议)

## 组件分解 · Components
- `VisualizationPage`
  - `VisualizationToolbar`(起点选择 + Quick Actions + 布局下拉 + 导出 + 分享)
  - `GraphCanvas`(共享组件)
  - `MiniMap`
  - `EntityDetailDrawer`(共享组件)
  - `StylePanel`(右侧 tab: 样式 / Perspective / 过滤)
  - `MultiSelectActionBar`(浮动, 多选激活时出现)

## 交互与边界 · UX & Edges
- **空态**: 未选起点 → 大号引导卡 "选择一个起点开始探索" + 搜索框
- **错误**: 起点不存在 → 行内错误; 扩展邻居失败 → toast + 重试; 布局计算失败 → 回退到 force
- **超时**: 长路径计算 / 大子图 → 走 async
- **取消**: 长操作可"取消", 已添加节点保留
- **画布性能**: 节点 > 500 时启用 LOD(简化样式); 节点 > 2000 时建议用户用过滤 / 子图导出
- **多选交互**: Shift+点击多选; 拖拽矩形框选; Ctrl+A 全选; ESC 取消选择
- **快捷键**: F = fit view; R = reset layout; M = toggle mini-map

## 开放问题 · Open Questions
- ❓ 2D / 3D 切换(灵感 NebulaGraph Explorer): 取决于 ADR-0004 图渲染库是否支持 — 暂列 P2
- ❓ 节点 / 边的注释(灵感协作工具): 跨 user 系统 — 暂列 P2
- ❓ 时间轴过滤(temporal graph): 当前数据模型暂无时间维度, 留 future
- ❓ 路径变体(最短 / 全部 / Top-K) 的视觉区分如何最清晰? UX 评审
- ❓ 大图的 Mini-map 渲染策略(简化代表 vs 完整缩放)

## 关联 · Links
- [Requirements](../requirements.md) — US-G-TOP-03 / US-G-TOP-06
- [Design](../design.md) — Perspective 模型, 跨模块任务移交
- 灵感: Neo4j Bloom / NebulaGraph Explorer / Linkurious / Gephi / Cytoscape
- 共享组件: `<GraphCanvas>` (来自 04-analysis 与 02-metadata Graph 模式)
- 下游: 05-async-tasks(大操作移交), 04-analysis("移交查询"双向跳转)
