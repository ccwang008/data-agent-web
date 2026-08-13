# Data Development · Design

## 1. 设计原则 · Principles

- 可视化 ETL 是流程编排器，SQL 是代码编辑器，Notebook 是有状态的单元格文档；三者不得复用同一个 `EntityWorkspace` 业务页面。
- 三类工作台可以复用按钮、状态徽标、抽屉、日志面板和结果表格等通用组件，但开发状态和业务组件保留在 `data-development` feature 内。
- 编辑态、生命周期、校验态和执行态分别建模，避免一个字符串状态承担多种含义。
- 真实连接和执行保持在前端边界外，所有运行与预览都通过 mock 数据层产生可持久化结果。

## 2. 路由 · Routes

当前已实现路由：

| Route | Current Page |
|---|---|
| `/data-development/etl` | ETL 任务列表 |
| `/data-development/etl/new` | 新建 ETL 任务并进入画布 |
| `/data-development/etl/:taskId` | ETL 画布编辑器 |
| `/data-development/sql` | SQL 脚本列表 |
| `/data-development/sql/new` | 新建 SQL 脚本并进入编辑器 |
| `/data-development/sql/:scriptId` | SQL 编辑器 |
| `/data-development/notebook` | Notebook 列表 |
| `/data-development/notebook/new` | 新建 Notebook 并进入编辑器 |
| `/data-development/notebook/:notebookId` | Notebook 单元格编辑器 |

`/data-development` 默认重定向到 `/data-development/etl`。

## 3. 页面信息架构 · Information Architecture

### 3.1 可视化 ETL

```text
任务列表
  └─ ETL 编辑器
      ├─ 顶部：名称、保存状态、校验、试运行、发布
      ├─ 左侧：输入 / 转换 / 输出节点库
      ├─ 中央：DAG 画布
      ├─ 右侧：节点属性与字段映射
      └─ 底部：Schema / 数据预览 / 日志 / 节点指标
```

画布优先复用仓库已有的 `@xyflow/react` 基础能力，但 ETL 节点类型、配置和状态必须定义在本 feature，不能直接 import `scheduler` feature。

### 3.2 SQL 开发

```text
脚本列表
  └─ SQL 编辑器
      ├─ 顶部：上下文、保存、校验、运行、发布
      ├─ 左侧：数据源 / 数据库 / Schema / 表 / 字段
      ├─ 中央：多标签 SQL 编辑器
      ├─ 右侧：参数 / 版本 / 发布设置
      └─ 底部：结果 / 日志 / 错误 / 执行计划
```

SQL 内容是唯一主编辑对象；解析得到的血缘只读展示，不将 SQL 自动转换成可编辑 ETL 画布。

### 3.3 Notebook

```text
Notebook 列表
  └─ Notebook 编辑器
      ├─ 顶部：运行时、内核、保存、运行全部、发布
      ├─ 左侧：文档大纲
      ├─ 中央：Markdown / SQL / Python / R / 参数单元格
      └─ 右侧：变量 / 运行时 / 检查点
```

Notebook 输出默认显示在对应单元格下方；运行日志和全局错误可以在底部抽屉汇总。

## 4. 领域模型 · Domain Model

### 4.1 共享引用

```ts
type DevelopmentArtifactType = "etl" | "sql" | "notebook";
type LifecycleStatus = "draft" | "ready" | "published" | "disabled" | "archived";
type SaveStatus = "clean" | "dirty" | "saving" | "save_failed";
type ValidationStatus = "unchecked" | "validating" | "valid" | "invalid";
type RunStatus = "queued" | "running" | "success" | "failed" | "stopped";

interface ArtifactRef {
  artifactType: DevelopmentArtifactType;
  artifactId: string;
  version: number;
}

interface DataObjectRef {
  id: string;
  name: string;
  kind: "source" | "table" | "dataset" | "file" | "temporary";
}
```

### 4.2 ETL 模型

```ts
interface EtlTask {
  id: string;
  name: string;
  owner: string;
  lifecycleStatus: LifecycleStatus;
  saveStatus: SaveStatus;
  validationStatus: ValidationStatus;
  currentVersion: number;
  publishedVersion?: number;
  graph: { nodes: EtlNode[]; edges: EtlEdge[] };
  updatedAt: string;
}

interface EtlNode {
  id: string;
  category: "input" | "transform" | "output";
  nodeType: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  inputSchema: EtlField[];
  outputSchema: EtlField[];
  validationIssues: ValidationIssue[];
}
```

### 4.3 SQL 模型

```ts
interface SqlScript {
  id: string;
  name: string;
  owner: string;
  context: { sourceRef: string; database: string; schema: string };
  content: string;
  parameters: SqlParameter[];
  output?: DataObjectRef;
  currentVersion: number;
  publishedVersion?: number;
  lifecycleStatus: LifecycleStatus;
  saveStatus: SaveStatus;
  validationStatus: ValidationStatus;
  updatedAt: string;
}
```

### 4.4 Notebook 模型

```ts
interface NotebookDocument {
  id: string;
  name: string;
  owner: string;
  runtime: string;
  kernelStatus: "not_started" | "starting" | "idle" | "busy" | "failed" | "stopped";
  cells: NotebookCell[];
  variables: NotebookVariable[];
  checkpoints: NotebookCheckpoint[];
  currentVersion: number;
  publishedVersion?: number;
  lifecycleStatus: LifecycleStatus;
  saveStatus: SaveStatus;
  updatedAt: string;
}

interface NotebookCell {
  id: string;
  type: "markdown" | "sql" | "python" | "r" | "parameter";
  source: string;
  executionCount?: number;
  status: "idle" | RunStatus;
  stale: boolean;
  outputs: NotebookOutput[];
}
```

## 5. 持久化模型 · Persistence

每个 scope 保存本开发方式的完整工作区状态：

```ts
interface DevelopmentWorkspaceState<TArtifact> {
  artifacts: TArtifact[];
  versions: DevelopmentVersion[];
  runs: DevelopmentRun[];
}
```

| Workspace | SQLite Scope |
|---|---|
| ETL | `data-agent.data-development.etl` |
| SQL | `data-agent.data-development.sql` |
| Notebook | `data-agent.data-development.notebook` |

页面通过 `useSqliteState` 读写；mock 运行可以使用共享 mock client，但不得由页面直接调用外部 `fetch`。

## 6. 调度、血缘与跨域契约 · Integration Contracts

- 数据开发发布结果只暴露 `ArtifactRef`、输入引用、输出引用、参数 Schema 和运行要求。
- 调度任务引用不可变版本，不读取编辑器草稿内部状态。
- 血缘使用数据对象稳定 ID 关联输入和输出；ETL 来自节点，SQL 来自 mock 解析，Notebook 来自单元声明和发布配置。
- `data-development` 不直接 import `scheduler`、`data-source`、`data-lake` 或 `data-asset`；跨域类型应提升到共享层或通过 mock API 契约传递。

## 7. 视觉与反馈 · Visual Feedback

- 延续 Classic Light SaaS：浅色工作区、白色面板、蓝色主操作和紧凑布局。
- 编辑器应优先保障可用面积，不使用营销 hero、超大卡片或装饰性渐变。
- 保存、校验、执行和发布状态必须同时提供文本与颜色反馈。
- 失败状态必须提供可操作的定位入口，不能只显示全局 Toast。
