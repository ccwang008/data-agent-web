# 03 · Import · 数据导入

> 类别: Hubble 1:1 (本地文件) + 平台扩展 (数据库 / API Connector)
> Hubble 参照: <https://hugegraph.apache.org/docs/quickstart/hugegraph-hubble/>(数据导入模块) + <https://hugegraph.apache.org/docs/quickstart/hugegraph-loader/>(灵感来源: JDBC / Kafka)

## 元数据 · Meta
| 项 | 值 |
|---|---|
| 路由 | `/knowledge-graph/import` |
| 状态 | 🚧 待实现 |
| 优先级 | M3 (本地 Connector) / M4 (DB / API Connector) |
| 类别 | Hubble 1:1 (向导骨架 + 本地) + 平台扩展 (DB / API) |


## 概述 · Overview
通过四步向导把外部数据导入当前图实例。第一步选择目标 schema; 第二步选数据源类型(本地文件 / 数据库 / API); 第三步字段映射(列 → VertexLabel / EdgeLabel 属性); 第四步执行+监控。三类数据源通过统一 `DataSourceConnector` 接口接入, 后续映射 / 执行步骤完全共享 UI。

## Hubble UI 参照 · UI Reference
对应 Hubble "数据导入"模块:
- **向导步骤条**(顶部固定): 4 步序号 + 标题 + 当前步指示
- **第 1 步 选 schema**: 列出当前图的 VertexLabel / EdgeLabel, 多选 + 必选校验
- **第 2 步 文件上传(Hubble 内建)**: CSV 文件拖拽区 + 表头 / 编码配置 + 预览前 N 行 → 本项目把这一步抽象为"选数据源", 本地是默认实现
- **第 3 步 字段映射**: 表格视图, 左列是文件 / 数据源字段, 右列下拉选 VertexLabel / EdgeLabel 的属性
- **第 4 步 执行 + 监控**: 进度看板(总进度 + 各文件 / 表 / API 单独进度), 支持暂停 / 续跑

> Hubble 内建只支持 CSV; 本项目把"数据库"和"API"加入第二步, 灵感来自 hugegraph-loader 的 JDBC 与 Kafka 能力, **不**接入 loader 本身。

## 用户故事 · User Stories
- **US-01** 作为数据工程师, 我希望通过 4 步向导完成一次导入, 步骤清晰、可回退
- **US-02** 作为数据工程师, 我希望第 2 步可选 本地 / 数据库 / API 三种数据源, Connector 表单按需切换
- **US-03** 作为数据工程师, 我希望第 3 步字段映射对所有 Connector 共用同一表格组件, 工作记忆不分裂
- **US-04** 作为数据工程师, 我希望第 4 步看到实时进度, 可暂停 / 续跑, 失败时看到原因与重试入口
- **US-05** 作为数据工程师, 我希望提交后**不阻塞页面**, 任务自动进入 05-async-tasks, 完成后通知中心提醒

## 验收 · Acceptance Criteria (EARS)
- **AC-01 视觉对齐** 顶部应当固定显示 4 步骤步骤条, 与 Hubble 同位
- **AC-02 视觉对齐** 第 3 步应当是"两列表"映射布局(左 = 数据源字段, 右 = Label 属性下拉), 与 Hubble 同位
- **AC-03 Connector 抽象** 第 2 步切换数据源类型时, 仅 Connector 表单区域变化, 步骤条 / 已选 schema / 后续映射 UI 不变
- **AC-04 Hubble 1:1 本地** 选"本地文件" Connector 时, 应当存在文件拖拽区 + 表头切换 + 编码下拉 + 前 N 行预览
- **AC-05 平台扩展 DB** 选"数据库" Connector 时, 应当存在 JDBC URL / 用户名 / 密码 / 表选择(下拉) / 自定义 SQL 切换
- **AC-06 平台扩展 API** 选"API" Connector 时, 应当存在 URL / Method / Header 编辑器 / Body / 响应 JSONPath 抽取
- **AC-07 共享映射** 三类 Connector 完成后均走同一 `<FieldMappingTable>` 组件
- **AC-08 执行非阻塞** 第 4 步触发"开始导入"后, 应当弹 toast 含"前往任务详情"链接(对应 `AC-G-HANDOFF`); 任务出现在 05-async-tasks 列表顶部
- **AC-09 失败可重试** 任一阶段失败时, 应当在向导内显示错误信息 + 上一步按钮; 已完成的步骤数据保留
- **AC-10 取消** 用户取消向导时, 弹二次确认; 草稿丢弃, 不写入 mock store

## 数据模型 · Data Model
```ts
type ConnectorKind = 'local' | 'database' | 'api';

interface ImportJob {
  id: string;
  graphId: string;
  schemaSelection: { vertexLabels: string[]; edgeLabels: string[] };
  connector: ConnectorConfig;
  mappings: FieldMapping[];
  status: 'pending' | 'running' | 'paused' | 'success' | 'failed';
  progress: number;          // 0-100
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  totalRows?: number;
  processedRows?: number;
}

type ConnectorConfig =
  | { kind: 'local'; files: { name: string; size: number }[]; header: boolean; encoding: string; delimiter: ',' | ';' | '\t' }
  | { kind: 'database'; jdbcUrl: string; username: string; tableOrSql: { mode: 'table'; table: string } | { mode: 'sql'; sql: string } }
  | { kind: 'api'; url: string; method: 'GET' | 'POST'; headers: Record<string, string>; body?: string; jsonPath: string };

interface FieldMapping {
  sourceField: string;
  targetKind: 'vertex' | 'edge';
  targetLabel: string;
  targetProperty: string;
  transformer?: 'none' | 'trim' | 'lower' | 'upper' | 'parseInt' | 'parseFloat';
}

interface PreviewSample { row: number; values: Record<string, unknown>; }
interface SourceField { name: string; inferredType: 'string' | 'number' | 'boolean' | 'datetime' | 'json'; nullable: boolean; }
```

## 本地接口 · Local Mock API
| Method | Path | Response |
|---|---|---|
| GET | `/api/knowledge-graph/import/jobs` | `ImportJob[]` |
| GET | `/api/knowledge-graph/import/jobs/:id` | `ImportJob` |
| POST | `/api/knowledge-graph/import/jobs` | `ImportJob`(创建并入队) |
| POST | `/api/knowledge-graph/import/jobs/:id/{pause,resume,cancel,retry}` | `{ ok }` |
| POST | `/api/knowledge-graph/import/connectors/local/{preview,schema}` | `PreviewSample[]` / `SourceField[]` |
| POST | `/api/knowledge-graph/import/connectors/database/{connect,preview,schema}` | 同结构 |
| POST | `/api/knowledge-graph/import/connectors/api/{connect,preview,schema}` | 同结构 |
| GET | `/api/knowledge-graph/import/mappings/suggest` | `FieldMapping[]`(基于字段名模糊推荐) |

## 路由 · Routes
- `/knowledge-graph/import` → 向导起点, 列出已有 `ImportJob` + "新建导入" CTA
- `/knowledge-graph/import?jobId=<id>` → 进入已有任务的执行+监控视图(跳第 4 步)

## 组件分解 · Components
- `ImportPage`
  - `ImportJobList`(顶部历史 / 进行中任务)
  - `ImportWizard`
    - `WizardStepper`
    - `Step1SchemaPicker`
    - `Step2ConnectorPicker`
      - `LocalFileConnector`
      - `DatabaseConnector`
      - `ApiConnector`
    - `Step3FieldMapping`(通用 `<FieldMappingTable>`)
    - `Step4ExecutionDashboard`(进度看板, 接 async-tasks)

## 交互与边界 · UX & Edges
- **空态**: 未选图实例 → 引导先去 01-graphs; 已选但无 schema → 引导先去 02-metadata
- **错误**: Connector 连接失败 → 行内错误 + 重试; 字段类型不兼容 → 单元格红框 + tooltip 说明
- **超时**: mock 连接超过 5s 显示"连接较慢, 仍在尝试..." (实际 mock 用配置项控制)
- **取消**: 任一步骤右上 "取消导入" 按钮 → 二次确认
- **大文件**: 本期 mock 不限制大小; 真实接入由 ADR-0005 定型(分片 + 断点)

## 开放问题 · Open Questions
- ❓ TEXT / JSON 文件支持(参考 loader)纳入 P2 还是 M3? 当前先 CSV
- ❓ 数据库 Connector 凭证存储策略(ADR-0006): 本期 mock-only 内存中, 不持久化; 未来真实接入需独立 vault
- ❓ Kafka 流式 Connector 是否纳入未来? 标 future scope
- ❓ 字段映射的"批量自动推荐"算法 (mock 基于字段名相似度) 是否要在本期实装?

## 关联 · Links
- [Requirements](../requirements.md) — US-G-TOP-02
- [Design](../design.md) — DataSourceConnector 抽象 / 跨模块任务移交
- 上游 Hubble: 数据导入模块(向导骨架 + CSV)
- 灵感: hugegraph-loader(JDBC / Kafka)
- 下游: 05-async-tasks(任务移交)
