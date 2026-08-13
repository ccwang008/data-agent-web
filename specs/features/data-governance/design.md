# Data Governance · Design

## 路由与页面 · Routes and Pages

路由由 `src/features/data-governance/routes.tsx` 导出，并由 `src/app/router.tsx` 组合：

| Route | Page | Responsibility |
|---|---|---|
| `/data-governance/metadata` | `MetadataPage` | 元数据详情、责任和血缘 |
| `/data-governance/quality` | `DataQualityPage` | 质量规则、评分和执行状态 |
| `/data-governance/standards` | `DataStandardsPage` | 术语、指标和标准审批 |

`/data-governance` 默认重定向到 `/data-governance/metadata`。

## 领域模型 · Domain Model

```ts
type GovernanceStatus = "draft" | "pending" | "approved" | "active" | "deprecated";
type QualityDimension = "completeness" | "accuracy" | "timeliness" | "consistency" | "uniqueness";

interface GovernanceObject {
  id: string;
  name: string;
  owner: string;
  status: GovernanceStatus;
  updatedAt: string;
}
```

元数据对象应能关联 `lineageId`、`sourceId`、`tableId`、`metricId` 和 `assetId`；质量规则应能关联对象、维度、阈值、评分、执行时间和失败明细；标准审批应能关联版本、申请人、审批人和审批历史。

## 跨模块关系 · Cross-module Relationships

```text
数据源/同步 → 湖表/文件 → 元数据/血缘 → 质量与标准 → 数据资产/数据服务
                         ↘ 调度任务与运行监控
```

治理页面只负责治理对象的展示和编辑；扫描、评分、血缘计算、审批和审计应通过 API/任务服务完成。

## UX 与安全 · UX and Security

所有规则启停、标准发布和治理对象删除都要有确认和结果反馈。业务术语和指标的变更需要保留版本，质量结果需要保留执行时间和数据范围；权限和审批以服务端为准。
