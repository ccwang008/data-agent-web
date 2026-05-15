# 04 · Analysis · 数据分析

> 类别: Hubble 1:1 (三段 layout + Gremlin + 三 tab + 右键菜单) + 平台扩展 (Cypher / Visual Builder / 多格式导出 / 分享链接)
> Hubble 参照: <https://hugegraph.apache.org/docs/quickstart/hugegraph-hubble/>(数据分析模块)

## 元数据 · Meta
| 项 | 值 |
|---|---|
| 路由 | `/knowledge-graph/analysis` |
| 状态 | 🚧 待实现 |
| 优先级 | M2 (Gremlin + Table/JSON + 历史) / M3 (Graph tab + Visual Builder + 导出 + 分享) |
| 类别 | Hubble 1:1 + 平台扩展 |

## 概述 · Overview
查询当前图实例的核心工作区。顶部编辑器 + 中部结果区 + 底部执行历史三段式 layout。编辑器支持三种模式(Gremlin / Cypher / Visual Builder), 结果区切换三种视图(Graph / Table / JSON), 历史区记录每次执行并可收藏 / 重放 / 套用模板。结果中的节点可右键扩展 / 过滤 / 隐藏, 单击展开 Property Panel, 也可一键移交到 10-visualization。

## Hubble UI 参照 · UI Reference
对应 Hubble "数据分析"模块, 三段 layout 严格对齐:
- **顶**: 查询编辑器区(Hubble 内建仅 Gremlin); 本项目扩展为三模式 tab(Gremlin / Cypher / Visual Builder)
- **中**: 结果区, 三 tab 切换(Graph / Table / JSON), Graph 支持 缩放 / 居中 / 全屏 / 导出
- **底**: 执行历史面板, 列 含 查询时间 / 执行类型 / 内容 / 状态 / 耗时, 支持收藏与重放; 本项目扩展"Templates" tab(带参数模板)

**节点右键菜单(3 项, Hubble 同位)**:
- **扩展(Expand)**: 展开关联邻居
- **查询(Query)**: 按边类型 / 方向 / 属性条件过滤路径
- **隐藏(Hide)**: 从视图移除节点与挂载的边

**双击 = Expand 快捷方式**; **单击 = Property Panel(平台扩展)**。

## 用户故事 · User Stories
- **US-01** 作为分析师, 我希望在顶部 Gremlin 编辑器写查询并执行, 中部立即看到结果
- **US-02** 作为分析师, 我希望切到 Cypher tab 用 Cypher 写查询, 后端 mock 自动转换并执行(允许有损)
- **US-03** 作为业务用户(US-G-TOP-05), 我希望切到 Visual Builder 通过拖拽 顶点 / 边 / 属性条件 来构建模式查询
- **US-04** 作为分析师, 我希望结果在 Graph / Table / JSON 三 tab 自由切换, Graph 支持缩放 / 居中 / 全屏
- **US-05** 作为分析师, 我希望在结果图节点上**单击**打开 Property Panel(看属性 / 邻居计数 / 跳到 metadata Label 定义); **右键**Expand / Query / Hide; **双击** = Expand
- **US-06** 作为分析师, 我希望底部历史记录可筛选(执行类型 / 状态)、收藏、重放
- **US-07** 作为分析师, 我希望保存带参数模板(`{{userId}}`), 调用时填表单
- **US-08** 作为分析师, 我希望"在可视化中打开"按钮把当前结果集 seed 给 10-visualization 继续探索
- **US-09** 作为分析师, 我希望"复制分享链接"按钮把当前查询 + 视图状态序列化到 URL hash, 粘贴即可复现
- **US-10** 作为分析师, 我希望导出按钮支持 PNG / SVG / PDF / CSV / JSON / GraphML / GEXF / Gremlin / Cypher 至少 9 种格式; 大结果 (> 1000 节点) 自动走 async-tasks

## 验收 · Acceptance Criteria (EARS)
- **AC-01 视觉对齐** 页面应当呈三段 layout: 顶编辑器 / 中结果区 / 底执行历史, 与 Hubble 同位
- **AC-02 视觉对齐** 中部结果区应当存在 Graph / Table / JSON 三 tab; Graph tab 顶部应当有 缩放 / 居中 / 全屏 / 导出 按钮组, 与 Hubble 同位
- **AC-03 视觉对齐** 底部执行历史应当列出 时间 / 类型 / 内容 / 状态 / 耗时 5 列, 与 Hubble 同位
- **AC-04 视觉对齐** Graph tab 内节点右键菜单应当包含 Expand / Query / Hide 三项, 双击 = Expand, 与 Hubble 同位
- **AC-05 三模式编辑器** 顶部应当存在三个 tab: Gremlin / Cypher / Visual Builder; 同一查询模式应可在三 tab 间双向转换(允许有损); 转换失败给出提示, 不静默截断 (对应 `AC-G-VISUAL-QUERY`)
- **AC-06 Property Panel** 单击 Graph tab 中任一节点 / 边时, 应当从右侧滑出 Property Panel; ESC 或点击空白处关闭
- **AC-07 移交可视化** 顶部 toolbar 应当存在"在可视化中打开"按钮, 点击后跳转 10-visualization 并以当前结果集 seed
- **AC-08 多格式导出** 顶部"导出"下拉应当列出至少 9 种格式: PNG / SVG / PDF / CSV / JSON / GraphML / GEXF / Gremlin / Cypher (对应 `AC-G-EXPORT`)
- **AC-09 大结果异步导出** 结果 > 1000 节点时, 导出动作应当变为异步任务, 弹 toast 含"前往任务详情"链接
- **AC-10 分享链接** "复制分享链接"按钮应当生成 URL hash 含查询体 + 当前 tab + Perspective; 粘贴到新会话能完整恢复 (对应 `AC-G-SHARE-URL`)
- **AC-11 收藏与模板** 底部历史项可"收藏" → 进入收藏 tab; "保存为模板" → 进入 Templates tab, 占位符语法 `{{xxx}}` 在调用时弹表单
- **AC-12 校验** 提交 Gremlin / Cypher 语法错误时, 编辑器下方显示错误带行号定位; 不破坏页面状态

## 数据模型 · Data Model
```ts
interface QueryRecord {
  id: string;
  graphId: string;
  mode: 'gremlin' | 'cypher' | 'visualBuilder';
  body: string | VisualQueryPattern;
  executedAt: string;
  status: 'success' | 'failed' | 'cancelled';
  durationMs: number;
  rowCount?: number;
  errorMessage?: string;
  starred: boolean;
}

interface VisualQueryPattern {
  vertices: Array<{ alias: string; labelKey: string; conditions: PropertyCondition[] }>;
  edges: Array<{ from: string; to: string; labelKey: string; direction: 'out' | 'in' | 'both'; conditions: PropertyCondition[] }>;
}

interface PropertyCondition {
  property: string;
  op: '=' | '!=' | '>' | '<' | 'contains' | 'startsWith';
  value: unknown;
}

interface QueryTemplate {
  id: string;
  name: string;
  description?: string;
  mode: QueryRecord['mode'];
  body: string | VisualQueryPattern;
  parameters: Array<{ key: string; label: string; type: 'string' | 'number' | 'boolean'; default?: unknown }>;
}

interface QueryResult {
  columns?: string[];
  rows?: Record<string, unknown>[];
  graph?: { vertices: Vertex[]; edges: Edge[] };  // for Graph tab
}

interface Vertex { id: string; label: string; properties: Record<string, unknown>; }
interface Edge { id: string; label: string; sourceId: string; targetId: string; properties: Record<string, unknown>; }
```

## 本地接口 · Local Mock API
| Method | Path | Response |
|---|---|---|
| POST | `/api/knowledge-graph/analysis/gremlin` | `QueryResult` |
| POST | `/api/knowledge-graph/analysis/cypher` | `QueryResult` |
| POST | `/api/knowledge-graph/analysis/visual-builder/{validate,execute,translate}` | `QueryResult` / `{ gremlin: string; cypher: string }` |
| GET | `/api/knowledge-graph/analysis/history` | `QueryRecord[]` |
| POST | `/api/knowledge-graph/analysis/history/:id/{star,unstar}` | `{ ok }` |
| GET/POST | `/api/knowledge-graph/analysis/favorites` | `QueryRecord[]` |
| GET/POST | `/api/knowledge-graph/analysis/templates` | `QueryTemplate[]` |
| POST | `/api/knowledge-graph/analysis/expand` | `QueryResult`(右键 Expand 后端) |
| POST | `/api/knowledge-graph/analysis/filter-query` | `QueryResult`(右键 Query 后端) |
| POST | `/api/knowledge-graph/analysis/vertex-detail` | `Vertex & { neighborCount: number; outgoingEdgeLabels: string[]; incomingEdgeLabels: string[] }` |
| POST | `/api/knowledge-graph/analysis/share` | `{ hashUrl: string }`(可选, 也可纯前端) |
| POST | `/api/knowledge-graph/analysis/export?format=<fmt>` | 同步: blob meta / 异步: `{ taskId: string }` |

## 路由 · Routes
- `/knowledge-graph/analysis` → AnalysisPage
- `/knowledge-graph/analysis#share=<hash>` → 进入并 hydrate 分享状态

## 组件分解 · Components
- `AnalysisPage`
  - `QueryEditor`(三模式 tab)
    - `GremlinEditor`
    - `CypherEditor`
    - `VisualQueryBuilder`
  - `ResultPane`(三 tab: Graph / Table / JSON)
    - `GraphResultView`(复用 `<GraphCanvas>`, 含右键菜单 + Property Panel 触发)
    - `TableResultView`
    - `JsonResultView`
    - `ResultToolbar`(导出 / 分享 / "在可视化中打开" / 全屏)
  - `EntityDetailDrawer`(共享组件)
  - `HistoryPane`
    - `HistoryTab`
    - `FavoritesTab`
    - `TemplatesTab`(带参数模板调用对话框)

## 交互与边界 · UX & Edges
- **空态**: 未执行查询时, 中部结果区显示"输入查询并执行"引导卡; 底部历史为空
- **错误**: 语法错误显示在编辑器下方; 执行错误显示在结果区, 不破坏页面
- **超时**: mock 默认 220ms; 模拟"大查询"时延迟 2-5s, 期间显示进度
- **取消**: 长时间查询可"取消", 走 async-tasks 路径
- **三模式转换有损**: 例如 Visual Builder 无法表达递归遍历, 转 Gremlin 时给出警告
- **快捷键**: `Cmd/Ctrl+Enter` 执行; `Cmd/Ctrl+S` 收藏

## 开放问题 · Open Questions
- ❓ Cypher 与 Visual Builder 标注为"平台扩展", 是否在 README 顶部显式区分? 当前已在 spec 中说明
- ❓ 大结果集分页 / 流式渲染策略?
- ❓ 模板参数类型是否要支持下拉(从图实例数据动态拉)? P2
- ❓ 收藏与历史的本地存储策略(走 mock store / IndexedDB)?

## 关联 · Links
- [Requirements](../requirements.md) — US-G-TOP-03 / US-G-TOP-05
- [Design](../design.md)
- 上游 Hubble: 数据分析模块
- 下游: 10-visualization(在可视化中打开 → 移交), 05-async-tasks(大查询 / 大导出移交)
