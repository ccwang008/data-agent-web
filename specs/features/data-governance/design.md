# Data Governance · Design

## 路由与页面 · Routes and Pages

路由由 `src/features/data-governance/routes.tsx` 导出，并由 `src/app/router.tsx` 组合：

| Route | Page | Responsibility |
|---|---|---|
| `/data-governance/metadata` | `MetadataPage` | 元数据详情、责任和血缘 |
| `/data-governance/quality` | `DataQualityPage` | 质量规则、评分和执行状态 |

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

元数据对象应能关联 `lineageId`、`sourceId`、`tableId`、`metricId`、`assetId`、`standardId`、`standardVersionId` 和 `ontologyConceptId`；质量规则应能关联对象、维度、阈值、评分、执行时间和失败明细。标准正文和审批历史由独立 `data-standard` feature 权威维护。

## 跨模块关系 · Cross-module Relationships

```text
数据源/同步 → 湖表/文件 → 元数据/血缘 → 质量治理 → 数据资产/数据服务
                         ↘ 数据标准引用与落标稽核
                         ↘ 调度任务与运行监控
```

治理页面只负责元数据、血缘和质量对象的展示与编辑；扫描、评分和血缘计算应通过 API/任务服务完成。标准对象、版本和审批位于独立数据标准域，双方通过稳定引用关联。

## UX 与安全 · UX and Security

所有规则启停和治理对象删除都要有确认和结果反馈。质量结果需要保留执行时间、数据范围和引用的标准版本；权限以服务端为准。

## 页面信息架构 · Page Information Architecture

- 元数据页面由统一检索驱动，使用“结果列表—对象说明—血缘影响”三栏数据地图。
- 质量页面先呈现综合得分、维度评分、批次趋势和问题整改，再提供规则运行面板。
- 治理页面不得统一退化为“顶部四指标 + CRUD 列表”的通用布局。

数据标准五个目标页面的信息架构见 [`../data-standard/design.md`](../data-standard/design.md)，不得在本 feature 重新实现标准页面。
