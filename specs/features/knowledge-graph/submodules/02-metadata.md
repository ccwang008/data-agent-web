# 02 · Metadata · 元数据建模

> 类别: Hubble 1:1 (双模式) + 平台扩展 (Style Mapping / Perspective 保存)
> Hubble 参照: <https://hugegraph.apache.org/docs/quickstart/hugegraph-hubble/>(元数据建模模块)

## 元数据 · Meta
| 项 | 值 |
|---|---|
| 路由 | `/knowledge-graph/metadata` (默认 `?mode=list`) |
| 状态 | 🚧 待实现 |
| 优先级 | M1 (List 模式) / M3 (Graph 模式) |
| 类别 | Hubble 1:1 |

## 概述 · Overview
管理当前图实例的 4 类元数据资源: **VertexLabel / EdgeLabel / PropertyKey / IndexLabel**, 提供 **List 列表模式** 与 **Graph 可视化模式** 两种工作流, 覆盖同一组能力(拖拽建模 / 属性编辑 / 关系定义 / 索引配置)。两种模式共享同一份 schema 数据源, 切换不丢状态。VertexLabel / EdgeLabel 创建时配置的节点 / 边样式直接影响 04-analysis 与 10-visualization 的渲染。

## Hubble UI 参照 · UI Reference
对应 Hubble "元数据建模" 模块, 原生具备双模式:
- **顶部模式切换开关**: List / Graph 二选一
- **List 模式**: 4 个 tab 切换 4 类资源, 每 tab 内为表格(列表) + "新建"按钮 → 抽屉式表单, 操作列含 "编辑 / 删除"
- **Graph 模式**: 画布展示 schema 关系网, 节点 = VertexLabel(圆), 连线 = EdgeLabel(箭头), 拖拽可改位置; PropertyKey / IndexLabel 通过画布侧栏关联编辑
- **节点/边样式**: 在 VertexLabel / EdgeLabel 创建表单中配置(颜色 / 形状 / 大小 / 节点下展示字段), 这些样式直接驱动后续可视化页面的渲染

## 用户故事 · User Stories
- **US-01** 作为数据工程师, 我希望在 List 模式下表格化批量管理 4 类资源, 用抽屉表单做单条精细编辑
- **US-02** 作为数据工程师, 我希望在 Graph 模式下用画布拖拽方式建模(新加 VertexLabel / 连出 EdgeLabel), 直观感受 schema 全貌
- **US-03** 作为数据工程师, 我希望切换两种模式时**不丢状态**, 当前选中 / 草稿 / 滚动位置应保留
- **US-04** 作为数据工程师, 我希望 Graph 模式有未提交草稿时, 切换到 List 前弹出二次确认(保留 / 丢弃 / 取消)
- **US-05** 作为数据工程师, 我希望在 Graph 模式下"保存当前样式 + 过滤"为 **Perspective**, 之后在 04-analysis / 10-visualization 可直接套用
- **US-06** 作为数据治理(P2), 我希望系统自动 lint 未使用的 Label / 缺索引的高基数属性, 给出告警

## 验收 · Acceptance Criteria (EARS)
- **AC-01 视觉对齐** 当用户进入页面时, 顶部应当显式存在 "List / Graph" 模式切换开关, 与 Hubble 同位
- **AC-02 视觉对齐** List 模式下应当存在 4 个 tab(VertexLabel / EdgeLabel / PropertyKey / IndexLabel), 每 tab 含表格 + 右上"新建"按钮 + 操作列, 与 Hubble 同位
- **AC-03 视觉对齐** Graph 模式下应当呈现 schema 关系网画布, 节点 = VertexLabel, 连线 = EdgeLabel, 与 Hubble 同位
- **AC-04 双模式共享** 当用户在 List 模式新建 VertexLabel 并提交后, 切换到 Graph 模式时应当在画布中立即看到对应节点, 反之亦然
- **AC-05 草稿粒度** List 模式下, 抽屉表单关闭即视为提交或丢弃(单条粒度); Graph 模式下, 多次拖拽 / 新增 / 连线均累积为页面级草稿, 通过顶部"保存"按钮整体提交
- **AC-06 模式切换确认** 当 Graph 模式有未提交草稿时, 切换到 List 应当弹出二次确认对话框(保留 / 丢弃 / 取消)
- **AC-07 样式联动** 当用户在 VertexLabel / EdgeLabel 创建表单调整样式后, 04-analysis Graph tab 与 10-visualization 应当即时反映新样式(同一会话内不需要 reload)
- **AC-08 Perspective 保存** Graph 模式顶部应当有"保存为 Perspective"按钮, 点击后弹出命名对话框, 保存后在 TopBar Perspective 下拉中出现
- **AC-09 删除影响** 删除 VertexLabel 时应当显示该 Label 被多少 EdgeLabel / IndexLabel / 实际数据引用; 引用计数 > 0 时需输入 Label 名才放行

## 数据模型 · Data Model
```ts
interface VertexLabel {
  id: string;
  name: string;
  idStrategy: 'auto' | 'primaryKey' | 'customize';
  primaryKeys?: string[];
  propertyKeys: string[];
  style: {
    color: string;
    shape: 'circle' | 'rect' | 'diamond' | 'triangle';
    size: 'sm' | 'md' | 'lg';
    displayProperty?: string;
  };
  position?: { x: number; y: number };  // 仅 Graph 模式
}

interface EdgeLabel {
  id: string;
  name: string;
  sourceLabel: string;
  targetLabel: string;
  frequency: 'single' | 'multiple';
  propertyKeys: string[];
  style: {
    color: string;
    thickness: 1 | 2 | 3;
    arrow: 'none' | 'end' | 'both';
  };
}

interface PropertyKey {
  id: string;
  name: string;
  dataType: 'TEXT' | 'INT' | 'LONG' | 'FLOAT' | 'DOUBLE' | 'BOOLEAN' | 'DATE' | 'UUID' | 'BLOB';
  cardinality: 'single' | 'list' | 'set';
}

interface IndexLabel {
  id: string;
  name: string;
  baseType: 'vertex' | 'edge';
  baseLabel: string;
  indexType: 'secondary' | 'range' | 'search' | 'shard' | 'unique';
  fields: string[];
  status: 'ready' | 'building' | 'failed';
}

interface MetadataDraft {       // Graph 模式累积草稿
  addedVertexLabels: VertexLabel[];
  addedEdgeLabels: EdgeLabel[];
  positionChanges: Record<string, { x: number; y: number }>;
  styleChanges: Record<string, Partial<VertexLabel['style'] | EdgeLabel['style']>>;
  deletions: { vertexLabels: string[]; edgeLabels: string[] };
}
```

## 本地接口 · Local Mock API
| Method | Path | Response |
|---|---|---|
| GET | `/api/knowledge-graph/metadata/vertexlabels` | `VertexLabel[]` |
| POST/PATCH/DELETE | 同上路径 | `VertexLabel` 或 `{ ok }` |
| GET | `/api/knowledge-graph/metadata/edgelabels` | `EdgeLabel[]` |
| GET | `/api/knowledge-graph/metadata/propertykeys` | `PropertyKey[]` |
| GET | `/api/knowledge-graph/metadata/indexlabels` | `IndexLabel[]` |
| GET | `/api/knowledge-graph/metadata/schema-graph` | `{ vertices: VertexLabel[]; edges: EdgeLabel[] }` |
| POST | `/api/knowledge-graph/metadata/schema-graph/commit` | `{ ok; appliedChanges: number }` |

## 路由 · Routes
- `/knowledge-graph/metadata` → 默认 `?mode=list&tab=vertexlabel`
- `?mode=list&tab=<vertexlabel|edgelabel|propertykey|indexlabel>` → List 4 tab
- `?mode=graph` → Graph 模式

## 组件分解 · Components
- `MetadataPage` (路由根, 处理模式切换 + 草稿确认)
  - `MetadataModeSwitcher`(顶部 List / Graph 开关)
  - `MetadataListEditor`
    - `MetadataTabs`(4 tab)
    - `LabelTable`(通用)
    - `LabelFormDrawer`(新建 / 编辑, 含样式配置)
    - `DeleteImpactDialog`
  - `MetadataGraphEditor`
    - `SchemaCanvas`(复用 `<GraphCanvas>`, schema-only 模式)
    - `LabelSidePanel`(选中节点 / 边 → 关联 PropertyKey / IndexLabel)
    - `DraftStatusBar`(顶部, 显示草稿计数 + 保存按钮)
    - `SavePerspectiveDialog`

## 交互与边界 · UX & Edges
- **空态(全空图)**: Graph 模式画布显示提示"画布为空, 拖入第一个 VertexLabel 开始建模"; List 模式各 tab 显示对应空态卡片
- **错误**: 提交草稿失败时保留草稿, 在草稿状态栏显示错误信息 + 重试按钮
- **删除**: 引用计数为 0 可直接删除; 计数 > 0 必须键入 Label 名匹配后才放行
- **拖拽性能**: ≥ 100 Label 时 Graph 模式启用 requestAnimationFrame 节流, 拖拽中不持续广播位置变化, 释放时一次性更新
- **样式实时联动**: 样式变更同步到 Zustand `metadata.styleDraft`, 监听该 slice 的子模块即时刷新

## 开放问题 · Open Questions
- ❓ Graph 模式是否支持 schema 元素的批量选择 + 批量样式应用? P2
- ❓ Schema Lint (E9): 未使用 Label / 缺索引的高基数属性 / 孤立顶点类型 → 何时实现? P2
- ❓ Schema Diff (E9): 两个图实例之间的 schema 差异 → 何时实现? P2
- ❓ 多人协作场景下, 草稿冲突如何解决? 走 ADR(后续)

## 关联 · Links
- [Requirements](../requirements.md) — US-G-TOP-01
- [Design](../design.md) — Perspective 模型
- 上游 Hubble: 元数据建模模块
- 下游: 04-analysis(样式联动), 10-visualization(样式 + Perspective 应用), 03-import(字段映射要选 Label)
