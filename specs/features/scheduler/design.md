# Scheduler · Design

## 路由与页面 · Routes and Pages

路由由 `src/features/scheduler/routes.tsx` 导出，并由 `src/app/router.tsx` 组合：

| Route | Page | Responsibility |
|---|---|---|
| `/scheduler/tasks` | `SchedulerTasksPage` | 任务列表、筛选、进入画布和基本任务操作 |
| `/scheduler/editor` | `SchedulerEditorPage` | 任务画布、节点模板、属性和 mock 运行 |
| `/scheduler/monitor` | `SchedulerMonitorPage` | 任务运行状态、运行控制和执行日志 |

`/scheduler` 默认重定向到 `/scheduler/tasks`；任务列表可进入画布编辑器。

## 任务模型 · Task Model

```ts
type TaskType = "development" | "processing" | "sync" | "service";
type TaskNodeCategory = "integration" | "development" | "processing" | "quality" | "service";
type RunStatus = "draft" | "queued" | "running" | "success" | "failed" | "stopped";

interface ScheduleTask {
  id: string;
  name: string;
  version: number;
  nodes: Array<{ id: string; type: TaskNodeCategory; config: Record<string, unknown>; result?: { status: string; message: string } }>;
  edges: Array<{ source: string; target: string }>;
  owner: string;
  enabled: boolean;
  runCount: number;
  trigger?: { type: string; expression?: string };
  lastRun?: { status: RunStatus; startedAt: string; finishedAt?: string };
}
```

任务、画布和运行记录由 `src/features/scheduler/api/mock.ts` 统一维护；画布编辑状态在页面内使用 React Flow，保存时通过 mock API 回写任务 graph。后续接入后端时，用任务 ID、版本和运行 ID 关联画布、日志、血缘和资源。

## 画布 · Canvas

使用 `@xyflow/react` 管理节点、边、缩放和平移。节点属性面板按节点类型渲染配置；运行结果展示在节点详情或执行日志中。画布交互不应依赖其他 feature 的页面组件。

## 运行边界 · Execution Boundary

当前前端只调用 mock/演示运行逻辑。真实运行应通过调度 API 提交任务，返回 `runId`，再通过轮询或推送获取状态、日志和结果；不要在浏览器内执行 SQL、ETL 或服务调用。
