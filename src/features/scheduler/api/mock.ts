import { registerMockRoute } from "@/lib/mock-client";
import { readLocalJson, writeLocalJson } from "@/lib/local-json-store";

export type SchedulerTaskType = "development" | "processing" | "sync" | "service";
export type SchedulerNodeCategory = "integration" | "development" | "processing" | "quality" | "service" | "sync";
export type SchedulerTriggerType = "manual" | "cron" | "event";
export type SchedulerRunStatus = "draft" | "queued" | "running" | "success" | "failed" | "stopped";
export type SchedulerNodeResultStatus = "success" | "running" | "failed" | "stopped";

export interface SchedulerNodeResult {
  status: SchedulerNodeResultStatus;
  message: string;
  updatedAt?: string;
}

export interface SchedulerNodeData {
  [key: string]: unknown;
  label: string;
  description: string;
  category: SchedulerNodeCategory;
  result?: SchedulerNodeResult;
  config: Record<string, string>;
}

export interface SchedulerGraphNode {
  id: string;
  type: "dataNode";
  position: { x: number; y: number };
  data: SchedulerNodeData;
}

export interface SchedulerGraphEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface SchedulerGraph {
  nodes: SchedulerGraphNode[];
  edges: SchedulerGraphEdge[];
}

export interface SchedulerTrigger {
  type: SchedulerTriggerType;
  expression?: string;
}

export interface SchedulerLastRun {
  runId: string;
  status: SchedulerRunStatus;
  startedAt: string;
  finishedAt?: string;
  duration: string;
}

export interface SchedulerTask {
  id: string;
  name: string;
  description: string;
  type: SchedulerTaskType;
  version: number;
  owner: string;
  enabled: boolean;
  trigger: SchedulerTrigger;
  graph: SchedulerGraph;
  status: SchedulerRunStatus;
  lastRun?: SchedulerLastRun;
  nextRun: string;
  runCount: number;
  updatedAt: string;
}

export interface SchedulerLogLine {
  time: string;
  level: "INFO" | "WARN" | "ERROR";
  text: string;
}

export interface SchedulerRun {
  id: string;
  taskId: string;
  status: SchedulerRunStatus;
  startedAt: string;
  finishedAt?: string;
  duration: string;
  triggeredBy: string;
  logs: SchedulerLogLine[];
}

const TASK_STORAGE_KEY = "data-agent.scheduler.tasks";
const RUN_STORAGE_KEY = "data-agent.scheduler.runs";

const isoNow = () => new Date().toISOString();

const pad = (value: number) => String(value).padStart(2, "0");

function formatDateTime(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function result(status: SchedulerNodeResultStatus, message: string): SchedulerNodeResult {
  return { status, message, updatedAt: formatDateTime() };
}

function makeNode(
  id: string,
  x: number,
  y: number,
  category: SchedulerNodeCategory,
  label: string,
  description: string,
  config: Record<string, string>,
  nodeResult?: SchedulerNodeResult,
): SchedulerGraphNode {
  return {
    id,
    type: "dataNode",
    position: { x, y },
    data: { label, description, category, config, ...(nodeResult ? { result: nodeResult } : {}) },
  };
}

export function createDefaultGraph(): SchedulerGraph {
  return {
    nodes: [
      makeNode("n1", 40, 190, "integration", "数据库集成", "采集订单明细并写入湖仓", {
        connector: "mock://source-db/orders",
        target: "mock://lakehouse/ods.orders",
        mode: "增量同步",
      }, result("success", "接入 128,430 行，耗时 2.3s")),
      makeNode("n2", 340, 90, "development", "SQL 开发", "标准化订单字段", {
        language: "SQL",
        script: "SELECT order_id, user_id, amount, status FROM input WHERE dt = '${date}'",
      }, result("success", "输出 128,430 行，耗时 0.8s")),
      makeNode("n3", 340, 300, "processing", "数据转换", "清洗并关联用户画像", {
        operation: "异常值过滤",
        expression: "amount > 0 AND status IS NOT NULL",
      }, result("success", "过滤 342 行，输出 128,088 行")),
      makeNode("n4", 650, 190, "processing", "指标聚合", "按城市计算 GMV", {
        operation: "Group & Aggregate",
        expression: "GROUP BY city; SUM(amount) AS gmv",
      }, result("success", "输出 320 个城市指标")),
      makeNode("n5", 960, 90, "quality", "数据质量校验", "校验完整性、准确性和及时性", {
        rule: "order_id 唯一且 amount > 0",
        dimensions: "完整性 / 准确性 / 唯一性",
        threshold: "通过率 ≥ 99%",
      }, result("success", "质量得分 99.7%，通过质量门禁")),
      makeNode("n6", 960, 300, "service", "发布数据服务", "刷新 GMV 查询服务缓存", {
        endpoint: "/mock-api/v1/gmv/daily",
        method: "POST",
        timeout: "30s",
      }, result("success", "服务版本 v12 已刷新")),
    ],
    edges: [
      { id: "e1-2", source: "n1", target: "n2" },
      { id: "e2-3", source: "n2", target: "n3" },
      { id: "e3-4", source: "n3", target: "n4" },
      { id: "e4-5", source: "n4", target: "n5" },
      { id: "e5-6", source: "n5", target: "n6" },
    ],
  };
}

function graphFor(type: SchedulerTaskType): SchedulerGraph {
  const graph = createDefaultGraph();
  const focusLabels: Record<SchedulerTaskType, [string, string]> = {
    development: ["开发任务", "SQL / Python 开发节点"],
    processing: ["处理任务", "清洗、转换和聚合节点"],
    sync: ["集成任务", "数据库、文件、消息和 API 集成节点"],
    service: ["服务任务", "数据服务发布和刷新节点"],
  };
  const focusCategory: Record<SchedulerTaskType, SchedulerNodeCategory> = {
    development: "development",
    processing: "processing",
    sync: "integration",
    service: "service",
  };
  graph.nodes[0].data.label = focusLabels[type][0];
  graph.nodes[0].data.description = focusLabels[type][1];
  graph.nodes[0].data.category = focusCategory[type];
  return graph;
}

function task(
  id: string,
  name: string,
  type: SchedulerTaskType,
  status: SchedulerRunStatus,
  trigger: SchedulerTrigger,
  lastRun?: SchedulerLastRun,
): SchedulerTask {
  const now = isoNow();
  return {
    id,
    name,
    description:
      type === "development"
        ? "统一编排 SQL 与脚本开发节点"
        : type === "processing"
          ? "清洗、转换、关联和指标计算"
          : type === "sync"
            ? "数据源、文件、消息和 API 的数据集成链路"
            : "发布并刷新可供业务调用的数据服务",
    type,
    version: 12,
    owner: type === "service" ? "数据服务组" : "数据工程组",
    enabled: status !== "draft" && status !== "stopped",
    trigger,
    graph: graphFor(type),
    status,
    lastRun,
    nextRun: trigger.type === "manual" ? "手动触发" : "2026-08-12 02:00:00",
    runCount: lastRun ? 128 : 0,
    updatedAt: now,
  };
}

const defaultRuns: SchedulerRun[] = [
  {
    id: "run-gmv-20260811",
    taskId: "task-gmv",
    status: "success",
    startedAt: "2026-08-11 02:00:01",
    finishedAt: "2026-08-11 02:02:44",
    duration: "2m 43s",
    triggeredBy: "定时触发",
    logs: [
      { time: "02:00:01", level: "INFO", text: "任务启动，载入版本 v12" },
      { time: "02:00:03", level: "INFO", text: "SQL 开发节点完成，读取 128,430 行" },
      { time: "02:00:08", level: "WARN", text: "检测到 342 行异常数据，已按规则过滤" },
      { time: "02:00:10", level: "INFO", text: "数据处理节点完成，输出 120,888 行" },
      { time: "02:02:44", level: "INFO", text: "同步与服务刷新完成，任务成功" },
    ],
  },
  {
    id: "run-sync-20260811",
    taskId: "task-sync",
    status: "running",
    startedAt: "2026-08-11 08:12:45",
    duration: "12s",
    triggeredBy: "事件触发",
    logs: [
      { time: "08:12:45", level: "INFO", text: "收到 topic: sales.order 事件" },
      { time: "08:12:46", level: "INFO", text: "同步任务排队，准备写入湖表" },
      { time: "08:12:57", level: "INFO", text: "已写入 8,230 条，任务仍在运行" },
    ],
  },
  {
    id: "run-risk-20260808",
    taskId: "task-risk",
    status: "failed",
    startedAt: "2026-08-08 04:00:02",
    finishedAt: "2026-08-08 04:15:05",
    duration: "15m 03s",
    triggeredBy: "定时触发",
    logs: [
      { time: "04:00:02", level: "INFO", text: "开始更新风控特征" },
      { time: "04:14:58", level: "ERROR", text: "mock://scheduler/risk-feature 返回字段校验失败" },
      { time: "04:15:05", level: "ERROR", text: "任务失败，建议检查处理节点配置" },
    ],
  },
];

const defaultTasks: SchedulerTask[] = [
  task("task-gmv", "电商 GMV 每日统计", "processing", "success", { type: "cron", expression: "0 2 * * *" }, {
    runId: "run-gmv-20260811",
    status: "success",
    startedAt: "2026-08-11 02:00:01",
    finishedAt: "2026-08-11 02:02:44",
    duration: "2m 43s",
  }),
  task("task-profile", "用户画像 ETL", "development", "success", { type: "cron", expression: "30 3 * * *" }, {
    runId: "run-profile-20260811",
    status: "success",
    startedAt: "2026-08-11 03:30:01",
    finishedAt: "2026-08-11 03:38:13",
    duration: "8m 12s",
  }),
  task("task-sync", "销售数据实时同步", "sync", "running", { type: "event", expression: "topic: sales.order" }, {
    runId: "run-sync-20260811",
    status: "running",
    startedAt: "2026-08-11 08:12:45",
    duration: "12s",
  }),
  task("task-service", "客户画像查询服务", "service", "queued", { type: "event", expression: "webhook: profile.refresh" }),
  task("task-risk", "风控特征日更", "processing", "failed", { type: "cron", expression: "0 4 * * 1-5" }, {
    runId: "run-risk-20260808",
    status: "failed",
    startedAt: "2026-08-08 04:00:02",
    finishedAt: "2026-08-08 04:15:05",
    duration: "15m 03s",
  }),
  task("task-archive", "S3 日志归档", "sync", "stopped", { type: "cron", expression: "0 1 * * 0" }),
];

let tasks = readLocalJson(TASK_STORAGE_KEY, defaultTasks);
let runs = readLocalJson(RUN_STORAGE_KEY, defaultRuns);

function saveTasks() {
  writeLocalJson(TASK_STORAGE_KEY, tasks);
}

function saveRuns() {
  writeLocalJson(RUN_STORAGE_KEY, runs);
}

function findTask(id: string) {
  const found = tasks.find((item) => item.id === id);
  if (!found) throw new Error(`Scheduler mock task not found: ${id}`);
  return found;
}

function createRun(taskRecord: SchedulerTask, triggeredBy = "手动触发"): SchedulerRun {
  const startedAt = formatDateTime();
  const runId = `run-${taskRecord.id}-${Date.now()}`;
  return {
    id: runId,
    taskId: taskRecord.id,
    status: "running",
    startedAt,
    duration: "运行中",
    triggeredBy,
    logs: [
      { time: startedAt.slice(11), level: "INFO", text: `任务启动，载入版本 v${taskRecord.version}` },
      { time: startedAt.slice(11), level: "INFO", text: `准备执行 ${taskRecord.graph.nodes.length} 个编排节点` },
    ],
  };
}

function runTask(taskRecord: SchedulerTask, triggeredBy = "手动触发") {
  const run = createRun(taskRecord, triggeredBy);
  runs = [run, ...runs.filter((item) => item.taskId !== taskRecord.id || item.status !== "running")];
  taskRecord.status = "running";
  taskRecord.enabled = true;
  taskRecord.runCount += 1;
  taskRecord.updatedAt = isoNow();
  taskRecord.lastRun = {
    runId: run.id,
    status: "running",
    startedAt: run.startedAt,
    duration: run.duration,
  };
  saveTasks();
  saveRuns();

  window.setTimeout(() => {
    const currentRun = runs.find((item) => item.id === run.id);
    const currentTask = tasks.find((item) => item.id === taskRecord.id);
    if (!currentRun || !currentTask || currentRun.status !== "running") return;
    const finishedAt = formatDateTime();
    currentRun.status = "success";
    currentRun.finishedAt = finishedAt;
    currentRun.duration = "1m 18s";
    currentRun.logs = [
      ...currentRun.logs,
      { time: finishedAt.slice(11), level: "INFO", text: "节点执行完成，mock 结果已生成" },
      { time: finishedAt.slice(11), level: "INFO", text: "任务成功，未连接真实执行引擎" },
    ];
    currentTask.status = "success";
    currentTask.lastRun = {
      runId: currentRun.id,
      status: currentRun.status,
      startedAt: currentRun.startedAt,
      finishedAt,
      duration: currentRun.duration,
    };
    currentTask.updatedAt = isoNow();
    currentTask.graph.nodes = currentTask.graph.nodes.map((node) => ({
      ...node,
      data: { ...node.data, result: result("success", "mock 执行成功，结果仅用于演示") },
    }));
    saveTasks();
    saveRuns();
  }, 1600);

  return taskRecord;
}

registerMockRoute("GET", "/api/scheduler/tasks", () => tasks);
registerMockRoute("GET", "/api/scheduler/tasks/:id", (_body, params) => findTask(params?.id ?? ""));
registerMockRoute("GET", "/api/scheduler/tasks/:id/runs", (_body, params) =>
  runs.filter((item) => item.taskId === (params?.id ?? "")),
);
registerMockRoute("GET", "/api/scheduler/runs", () => runs);

registerMockRoute("POST", "/api/scheduler/tasks", (body) => {
  const input = body as Partial<SchedulerTask> & { graph?: SchedulerGraph };
  const created: SchedulerTask = {
    id: `task-${Date.now()}`,
    name: input.name?.trim() || "未命名调度任务",
    description: input.description?.trim() || "通过画布创建的调度任务",
    type: input.type ?? "processing",
    version: 1,
    owner: input.owner || "当前用户",
    enabled: input.enabled ?? false,
    trigger: input.trigger ?? { type: "manual" },
    graph: input.graph ?? createDefaultGraph(),
    status: "draft",
    nextRun: input.trigger?.type === "manual" ? "手动触发" : "待配置",
    runCount: 0,
    updatedAt: isoNow(),
  };
  tasks = [created, ...tasks];
  saveTasks();
  return created;
});

registerMockRoute("PATCH", "/api/scheduler/tasks/:id", (body, params) => {
  const current = findTask(params?.id ?? "");
  const input = body as Partial<SchedulerTask>;
  Object.assign(current, {
    ...input,
    name: input.name?.trim() || current.name,
    description: input.description?.trim() || current.description,
    version: current.version + 1,
    updatedAt: isoNow(),
  });
  saveTasks();
  return current;
});

registerMockRoute("DELETE", "/api/scheduler/tasks/:id", (_body, params) => {
  const id = params?.id ?? "";
  findTask(id);
  tasks = tasks.filter((item) => item.id !== id);
  runs = runs.filter((item) => item.taskId !== id);
  saveTasks();
  saveRuns();
  return { id };
});

registerMockRoute("POST", "/api/scheduler/tasks/:id/run", (body, params) =>
  runTask(findTask(params?.id ?? ""), (body as { triggeredBy?: string } | undefined)?.triggeredBy),
);

registerMockRoute("POST", "/api/scheduler/tasks/:id/stop", (_body, params) => {
  const current = findTask(params?.id ?? "");
  const running = runs.find((item) => item.taskId === current.id && item.status === "running");
  if (running) {
    running.status = "stopped";
    running.finishedAt = formatDateTime();
    running.duration = "已停止";
    running.logs = [...running.logs, { time: running.finishedAt.slice(11), level: "WARN", text: "任务已手动停止" }];
  }
  current.status = "stopped";
  current.enabled = false;
  current.updatedAt = isoNow();
  if (current.lastRun) current.lastRun = { ...current.lastRun, status: "stopped", duration: "已停止" };
  saveTasks();
  saveRuns();
  return current;
});
