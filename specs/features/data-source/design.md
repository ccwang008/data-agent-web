# Data Integration · Design

## 路由与页面 · Routes and Pages

路由由 `src/features/data-source/routes.tsx` 导出，并由 `src/app/router.tsx` 组合：

| Route | Page | Responsibility |
|---|---|---|
| `/data-source/sources` | `DataSourcesPage` | 数据源列表、筛选、CRUD、连接测试 |
| `/data-source/sync` | `DataSyncPage` | 同步任务、模式、进度和运行状态 |
| `/data-source/exchange` | `DataExchangePage` | 交换方式、配置和状态 |

`/data-source` 默认重定向到 `/data-source/sources`。

## 数据模型 · Data Model

```ts
type DataSourceType = "database" | "file" | "local-file" | "message-queue" | "api";
type SyncMode = "full" | "incremental" | "cdc" | "realtime";
type ExchangeType = "api" | "file" | "table" | "message";
```

数据源、同步任务和交换任务都应包含 `id`、`name`、`status`、`owner`、`updatedAt`；同步和交换对象额外包含 `sourceId`、`targetId`、`lastRunAt`、`errorMessage` 等可追踪字段。凭证字段只保留引用或脱敏值。

## I/O 边界 · I/O Boundary

页面通过共享 `useSqliteState` 数据层读写项目本地 SQLite，不直接调用 `fetch`。三个页面分别使用 `data-agent.data-source.sources`、`sync`、`exchange` scope；其中数据源 scope 的类型、默认 fixture 和 hook 由 `src/stores/dataSourceRegistry.ts` 统一提供，供资产目录按稳定数据源 ID 引用。真实后端接入时替换共享数据层。

## 状态与反馈 · UX States

列表、对话框和任务面板必须覆盖加载、空数据、成功、失败、连接测试中、运行中、失败重试和删除确认等状态。对于实时同步，进度和状态要能被刷新，不要求在当前前端模拟真实数据传输。

## 安全约束 · Security

- 不在浏览器明文持久化密码、token、私钥或完整连接串。
- UI 只展示脱敏后的连接信息和后端生成的连接 ID。
- 真实授权、审计和密钥轮换由后端权限/密钥服务负责。
