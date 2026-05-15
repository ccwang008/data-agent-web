# Knowledge Graph · Tasks

> ID 规范: `T-kg-<sub>-NN`(子模块前缀两位数 + 序号), 跨模块为 `T-kg-G-NN`。完成后 `[ ]` → `[x]`, 行末附 PR/Commit。
> 子模块内细化任务见各 `submodules/NN-<key>.md` 的"任务 · Tasks"段(可选, 当前以本表为主)。

## P0 · 历史 (已完成 · Done from old spec)
- [x] T-kg-G-00 旧版 KG 单页脚手架(`KnowledgeGraphPage` + 单端点 mock + i18n namespace)

## M0 · Hub 骨架 · Bootstrap
- [ ] T-kg-G-01 KnowledgeGraphHub 布局: TopBar(图切换器 / Perspective 下拉 / 通知中心入口) + Outlet, **无 sub-nav**
- [ ] T-kg-G-02 10 个子路由占位页(`pages/<sub>/XxxPage`) + lazy load
- [ ] T-kg-G-03 全局 `<NotificationCenter>` shell 入框(实装订阅在 M2)
- [ ] T-kg-G-04 `useKnowledgeGraphStore` 扩展: currentGraphId / activePerspectiveId / visualization slice / metadata slice / import slice
- [ ] T-kg-G-05 `<GraphInstanceSwitcher>` / `<PerspectiveSwitcher>` 占位组件
- [ ] T-kg-G-06 i18n key 按子模块分组重组(`graphs.*` / `metadata.*` / ...)
- [ ] T-kg-G-07 Sidebar 改造为树菜单(`src/components/layout/Sidebar.tsx`), KG 节点展开为 10 子项 — 与 `T-settings-13` 并行, 走 ADR-0008 边界
- [ ] **🔒 截止: ADR-0003 代码编辑器选型** (否则 M2 analysis 编辑器无法做)
- [ ] **🔒 截止: ADR-0007 视觉方向重定** (基于已选 Classic Light SaaS Admin, 固化 `platform/02-design-system.md` 浅色 token)
- [ ] **🔒 截止: ADR-0008 树形菜单与用户自定义边界** (否则 Sidebar 重构与 `/settings/menu` 实装冲突)

## M1 · 图实例与元数据 List 模式 · Graphs + Metadata-List
- [ ] T-kg-graphs-01 GraphsListPage: 实例卡片网格 + 创建对话框 + 搜索
- [ ] T-kg-graphs-02 GraphDetailPage: "概览" tab(平台扩展 Dashboard, 计数 / VertexLabel 分布 / 近期任务 / 导入摘要 / 索引健康) + "明细" tab
- [ ] T-kg-graphs-03 mock 端点: `/api/knowledge-graph/graphs/{list,detail,overview-stats}`
- [ ] T-kg-metadata-01 MetadataListEditor: 4 个 tab(VertexLabel / EdgeLabel / PropertyKey / IndexLabel)
- [ ] T-kg-metadata-02 抽屉式新建 / 编辑 / 删除表单, 单条提交粒度
- [ ] T-kg-metadata-03 节点 / 边样式配置 (E6 Style Mapping 基础: 颜色 / 大小 / 形状 by label)
- [ ] T-kg-metadata-04 mock 端点: `/api/knowledge-graph/metadata/{vertexlabels,edgelabels,propertykeys,indexlabels}`
- [ ] T-kg-metadata-05 Perspectives 基础 CRUD (E1): `/api/knowledge-graph/perspectives/{list,detail,save,delete}`, TopBar 切换器对接

## M2 · 数据分析(读)+ 异步任务 · Analysis + Async-Tasks
- [ ] T-kg-analysis-01 三段 layout: 顶 QueryEditor / 中 ResultPane / 底 HistoryPane
- [ ] T-kg-analysis-02 QueryEditor 顶层三模式 tab: Gremlin / Cypher / Visual Builder(后者占位, 在 M3 实装)
- [ ] T-kg-analysis-03 ResultPane: Table tab + JSON tab(Graph tab 占位)
- [ ] T-kg-analysis-04 HistoryPane: 时间 / 类型 / 内容 / 状态 / 耗时 + 收藏与重放 + Templates tab(E8 模板带参占位 UI)
- [ ] T-kg-analysis-05 mock 端点: `/api/knowledge-graph/analysis/{gremlin,cypher,history,favorites,templates}`
- [ ] T-kg-async-01 AsyncTasksPage 列表 + 状态徽标 + 类型过滤(4 类: Gremlin 查询 / OLAP 算法 / Schema 删除 / 索引重建) + 搜索
- [ ] T-kg-async-02 TaskDetailDrawer: 参数 / 结果 / 日志 / 取消 / 重跑
- [ ] T-kg-async-03 mock 端点: `/api/knowledge-graph/async-tasks/{list,detail,cancel,retry,subscribe}`
- [ ] T-kg-async-04 `<NotificationCenter>` 实装订阅 SSE-like mock 流, 接收 task 状态广播
- [ ] **🔒 截止: ADR-0004 图渲染库选型** (否则 M3 analysis Graph tab 与 10-visualization 都卡住)
- [ ] **🔒 截止: ADR-0005 文件上传组件 (大文件 / 断点续传)** (否则 M3 import 步骤 2 无法做)

## M3 · 可视化 + 导入(本地)+ Metadata Visual 模式
- [ ] T-kg-analysis-06 Graph tab 内嵌画布渲染(力导向, 默认布局), 右键 Expand / Query / Hide, 双击 = Expand, 单击 = Property Panel(E5)
- [ ] T-kg-analysis-07 "在可视化中打开"按钮 → 10-visualization, 移交当前结果作为 seed
- [ ] T-kg-analysis-08 Visual Builder 实装(E2): 拖拽顶点 / 边 / 属性条件, 三模式间双向转换(允许有损)
- [ ] T-kg-analysis-09 多格式导出 toolbar(E7): PNG / SVG / PDF / CSV / JSON / GraphML / GEXF / Gremlin / Cypher; > 1000 节点走 async
- [ ] T-kg-analysis-10 Shareable URL(E8): hash 编码查询 + 视图状态
- [ ] T-kg-viz-01 VisualizationPage: 起点选择 + 多跳邻居扩展 + Property Panel(E5)
- [ ] T-kg-viz-02 Quick Actions toolbar(E4): Common Neighbors / Shortest Path / Subgraph / Pattern Search
- [ ] T-kg-viz-03 多布局下拉(E3): force / hierarchical / circular / radial / grid / dagre
- [ ] T-kg-viz-04 Mini-map + 多选 + 批量(隐藏 / 移交 / 删除)
- [ ] T-kg-viz-05 Style Mapping(E6) by property / degree, 沿用 metadata + Perspective 样式
- [ ] T-kg-viz-06 mock 端点: `/api/knowledge-graph/visualization/{start,expand,paths,vertex-detail,common-neighbors,shortest-path,subgraph,pattern-search,layout,export}`
- [ ] T-kg-import-01 ImportWizard 步骤条: 选 schema → 选数据源 → 字段映射 → 执行+监控
- [ ] T-kg-import-02 LocalConnector(Hubble 1:1, CSV): 上传区 + 表头 / 编码配置
- [ ] T-kg-import-03 `<FieldMappingTable>` 通用组件(三类 Connector 共用)
- [ ] T-kg-import-04 ExecutionDashboard: 进度看板 + 暂停 / 续跑
- [ ] T-kg-import-05 mock 端点: `/api/knowledge-graph/import/{jobs,mappings,sources/local}` + Connector 抽象骨架
- [ ] T-kg-metadata-06 MetadataGraphEditor (Visual 模式): 画布 + 拖拽节点(VertexLabel) + 拖拽连线(EdgeLabel) + 侧栏 PropertyKey / IndexLabel
- [ ] T-kg-metadata-07 双模式草稿与提交边界(S2): List 单条粒度 / Graph 页面粒度 / 切换二次确认
- [ ] T-kg-metadata-08 "保存为 Perspective"按钮(E1)
- [ ] T-kg-metadata-09 mock 端点: `/api/knowledge-graph/metadata/schema-graph`
- [ ] **🔒 截止: ADR-0006 数据库 Connector 凭证存储策略** (本期 mock-only, 真实接入策略待定)

## M4 · 图计算 + 图 AI + 导入(DB / API)
- [ ] T-kg-computer-01 AlgorithmCatalog: 三类卡片(中心性 4 / 社区 5 / 路径 2)
- [ ] T-kg-computer-02 AlgorithmParamForm: 通用参数 + 算法特定参数
- [ ] T-kg-computer-03 提交后跳转 async-tasks, 接通知中心
- [ ] T-kg-computer-04 mock 端点: `/api/knowledge-graph/computer/{algorithms,jobs}`
- [ ] T-kg-ai-01 NL2QueryPanel: 自然语言输入 → 生成 Gremlin → 移交 04-analysis
- [ ] T-kg-ai-02 GraphRAGPanel: 问答 + 答复带子图引用
- [ ] T-kg-ai-03 KGBuildPanel: 文本上传 → 实体 / 关系抽取 → 走 import 后端
- [ ] T-kg-ai-04 GraphMLCatalog: 嵌入 / 节点分类 / 链路预测目录占位
- [ ] T-kg-ai-05 mock 端点: `/api/knowledge-graph/ai/{nl2query,ragqa,kg-build,ml-models}`
- [ ] T-kg-import-06 DatabaseConnector(平台扩展): JDBC URL / 凭证 / 表或 SQL 表单
- [ ] T-kg-import-07 ApiConnector(平台扩展): URL / Method / Header / Body / JSONPath 抽取
- [ ] T-kg-import-08 mock 端点: `/api/knowledge-graph/import/sources/{database,api}/{connect,preview,schema}`

## M5 · 危险操作 + 帮助 + 可视化打磨
- [ ] T-kg-admin-01 DangerZoneList: 备份 / 还原 / 清空 三类操作卡片
- [ ] T-kg-admin-02 DangerConfirmDialog: 二次确认 + 输入图名校验
- [ ] T-kg-admin-03 OperationHistory: 危险操作审计轨迹
- [ ] T-kg-admin-04 mock 端点: `/api/knowledge-graph/admin/{backup,restore,clear,history}`
- [ ] T-kg-help-01 DeepLinkGrid: 卡片网格指向 hugegraph-website 主要文档章节
- [ ] T-kg-help-02 AttributionBanner: Apache-2.0 短归属(对应 AC-G-ATTRIBUTION)
- [ ] T-kg-help-03 各子模块顶部"打开官方文档"上下文链接
- [ ] T-kg-viz-07 高级交互打磨: 路径高亮变体(最短 / 全部 / Top-K) + 截图导出 PDF / SVG
- [ ] T-kg-viz-08 性能优化: ≥ 500 节点的 hierarchical / dagre 走 Web Worker

## 持续项 · Ongoing
- [ ] 性能压测: 每里程碑结束跑一次 ≥ 1000 节点的渲染 + 导出
- [ ] a11y: 表格 / 按钮 / tab / 抽屉 / 画布可键盘导航, 对比度 ≥ 4.5:1
- [ ] i18n review: 新增文案随提交同步补 zh-CN / en-US
- [ ] Hubble 视觉对齐巡检: 每里程碑结束按 `design.md` 视觉对齐清单跑一次
- [ ] ADR 截止巡检: 每月 Review ADR-0003~0008 是否按期定型

## 历史 · Changelog
- 2026-05-12 · 初版 KG 脚手架与抽象规格
- 2026-05-13 · 重写 spec, 对标 Hubble 1:1 + HG 生态扩展; 视觉方向重定为 Classic Light SaaS Admin; 导航切换为左侧树菜单; 子模块增至 10; 竞品强项 E1–E8 纳入
