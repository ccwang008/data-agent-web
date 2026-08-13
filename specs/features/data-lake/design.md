# Data Lake · Design

## 路由与页面 · Routes and Pages

路由由 `src/features/data-lake/routes.tsx` 导出，并由 `src/app/router.tsx` 组合：

| Route | Page | Responsibility |
|---|---|---|
| `/data-lake/storage` | `DataLakeStoragePage` | 统一存储对象、类型和生命周期入口 |
| `/data-lake/tables` | `DataLakeTablesPage` | 湖表、Schema、版本和建模 |
| `/data-lake/capacity` | `DataLakeCapacityPage` | 分层、容量和生命周期策略 |

`/data-lake` 默认重定向到 `/data-lake/storage`。

## 数据模型 · Data Model

```ts
type StorageObjectType = "table" | "file" | "image" | "video" | "log" | "document";
type StorageTier = "hot" | "warm" | "cold" | "archive";

interface LakeObject {
  id: string;
  type: StorageObjectType;
  storageTier: StorageTier;
  schemaVersion?: string;
  retentionPolicyId?: string;
  lineageId?: string;
}
```

湖表对象还应能关联字段定义、分区、格式、版本、事务能力和最近变更；容量对象应能关联层级、配额、使用量、趋势和策略。

## 交互边界 · Interaction Boundary

页面负责查询、筛选、表单和状态反馈；真实 Schema 变更、版本提交、事务提交和生命周期执行由后端服务完成。mock 数据应通过可替换的 API/fixture 边界提供。

## 安全与可恢复性 · Safety

归档和清理属于高风险操作，必须显示影响范围、保留期和确认结果；生产实现需要权限校验、二次确认、软删除/恢复窗口和审计日志。
