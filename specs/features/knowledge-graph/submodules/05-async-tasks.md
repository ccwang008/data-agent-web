# 05 · Async Tasks · 异步任务管理

> 类别: Hubble 1:1 + 平台扩展 (全局通知中心订阅)
> Hubble 参照: <https://hugegraph.apache.org/docs/quickstart/hugegraph-hubble/>(任务管理模块)

## 元数据 · Meta
| 项 | 值 |
|---|---|
| 路由 | `/knowledge-graph/async-tasks` |
| 状态 | 🚧 待实现 |
| 优先级 | M2 |
| 类别 | Hubble 1:1 |

## 概述 · Overview
统一管理跨子模块触发的异步任务: Gremlin 大查询 / OLAP 算法(06-computer) / Schema 删除 / 索引重建 / Import 导入(03) / AI KG 构建(07) / 大导出(04, 10) 等。提供列表 + 状态筛选 + 详情抽屉 + 取消 / 重跑, 同时是全局通知中心的事件源。

## Hubble UI 参照 · UI Reference
对应 Hubble "任务管理"模块:
- **列表视图**: 表格列含 任务 ID / 类型 / 状态 / 创建时间 / 耗时 / 操作
- **类型过滤**(顶部): 至少 4 类 — Gremlin 查询 / OLAP 算法 / Schema 删除 / 索引重建
- **状态过滤**: pending / running / success / failed / cancelled
- **搜索**: 按 ID / 内容
- **详情抽屉**: 任务参数 / 结果摘要 / 日志 / 取消 / 重跑

> 本项目把范围扩到 import / ai / export 等子模块触发的任务, 任务类型枚举扩充。

## 用户故事 · User Stories
- **US-01** 作为运维, 我希望看到所有异步任务的列表, 一眼分辨状态
- **US-02** 作为运维, 我希望按类型 / 状态过滤, 快速定位关心的任务
- **US-03** 作为运维, 我希望点开详情看参数 / 结果 / 日志
- **US-04** 作为运维, 我希望取消 running 任务, 二次确认后生效
- **US-05** 作为运维, 我希望对 failed 任务一键重跑, 复用原参数
- **US-06** 作为平台用户, 我希望任务状态变化时**全局通知中心**主动提醒(toast + 红点), 不需要主动刷新本页

## 验收 · Acceptance Criteria (EARS)
- **AC-01 视觉对齐** 列表应当含 任务 ID / 类型 / 状态 / 创建时间 / 耗时 / 操作 至少 6 列, 与 Hubble 同位
- **AC-02 视觉对齐** 顶部应当存在类型过滤下拉, 至少覆盖 Gremlin 查询 / OLAP 算法 / Schema 删除 / 索引重建 四类, 与 Hubble 同位
- **AC-03 视觉对齐** 任务详情应当从右侧滑出抽屉, 含 参数 / 结果 / 日志 / 取消 / 重跑, 与 Hubble 同位
- **AC-04 取消** 取消 running 任务时弹二次确认; 成功后状态变为 cancelled, toast 提示
- **AC-05 重跑** 重跑 failed 任务时, 应当复制原参数生成新任务(新 ID), 原任务保留为历史
- **AC-06 通知中心订阅** 当任意子模块触发新任务时, 应当在通知中心 toast 提示 + 任务出现在列表顶部 (对应 `AC-G-HANDOFF`)
- **AC-07 状态广播** 任务状态变化(running → success / failed) 时, 全局通知中心广播; 订阅页面应即时刷新
- **AC-08 日志流** running 任务详情中, 日志区域应当滚动追加(模拟 SSE 流), 暂停 / 恢复 / 清空可控
- **AC-09 长列表** ≥ 200 条任务时启用虚拟滚动(P2 可放后续)

## 数据模型 · Data Model
```ts
type TaskType =
  | 'gremlin-query'
  | 'cypher-query'
  | 'olap-algorithm'      // 06-computer
  | 'schema-delete'
  | 'index-rebuild'
  | 'import'              // 03-import
  | 'ai-kg-build'         // 07-ai
  | 'large-export';       // 04-analysis / 10-visualization

interface AsyncTask {
  id: string;
  graphId: string;
  type: TaskType;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  progress: number;        // 0-100
  parameters: Record<string, unknown>;
  result?: { summary: string; downloadUrl?: string; rowCount?: number };
  logs: Array<{ at: string; level: 'info' | 'warn' | 'error'; message: string }>;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

interface TaskEvent {     // 全局通知中心广播
  taskId: string;
  type: TaskType;
  status: AsyncTask['status'];
  progress: number;
  emittedAt: string;
}
```

## 本地接口 · Local Mock API
| Method | Path | Response |
|---|---|---|
| GET | `/api/knowledge-graph/async-tasks/list?type=&status=&q=` | `AsyncTask[]` |
| GET | `/api/knowledge-graph/async-tasks/:id/detail` | `AsyncTask` |
| POST | `/api/knowledge-graph/async-tasks/:id/cancel` | `{ ok }` |
| POST | `/api/knowledge-graph/async-tasks/:id/retry` | `AsyncTask`(新 ID) |
| GET (SSE-like) | `/api/knowledge-graph/async-tasks/subscribe` | stream of `TaskEvent` |

## 路由 · Routes
- `/knowledge-graph/async-tasks` → 列表
- `/knowledge-graph/async-tasks?taskId=<id>` → 列表 + 自动打开该任务详情抽屉

## 组件分解 · Components
- `AsyncTasksPage`
  - `TaskFilterBar`(类型 / 状态 / 搜索)
  - `TaskList`(虚拟滚动 P2)
  - `TaskDetailDrawer`
    - `TaskParamsView`
    - `TaskResultView`
    - `TaskLogStream`
    - `TaskActions`(取消 / 重跑)
- 全局: `<NotificationCenter>`(位于 `src/components/layout/NotificationCenter.tsx`)
  - 订阅 `/subscribe` SSE-like 流
  - 维护 `useNotificationStore` (未读计数, 最近 N 条)
  - toast 入口由各子模块在提交任务时主动触发

## 交互与边界 · UX & Edges
- **空态**: 列表为空 → 引导卡"还没有异步任务, 在导入 / 计算 / 大查询时它们会自动出现"
- **错误**: 列表加载失败 → 错误占位 + 重试; 不影响其他子模块
- **超时**: 长任务(模拟 5+ 分钟) 在前端进度上限制以避免假死, 后端进度 mock 走轮询或 SSE
- **取消时机**: pending / running 可取消; success / failed / cancelled 不可
- **重跑保护**: 同一任务不允许同时存在两个 running 重跑(同 mock 任务 ID + retry 序号)

## 开放问题 · Open Questions
- ❓ 任务保留期限策略(成功 N 天 / 失败 N 天)? 当前 mock 保留全部
- ❓ 大批量任务的批量取消 / 批量删除 UI? P2
- ❓ 任务订阅是否要走真实 SSE? mock 用 setInterval 模拟即可

## 关联 · Links
- [Requirements](../requirements.md) — AC-G-HANDOFF
- [Design](../design.md) — 跨模块任务移交段
- 上游 Hubble: 任务管理模块
- 下游: 全局 `<NotificationCenter>`(订阅广播)
- 上游事件源: 03-import / 04-analysis / 06-computer / 07-ai / 10-visualization 任一触发的异步操作
