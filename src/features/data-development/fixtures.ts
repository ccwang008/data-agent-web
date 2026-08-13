import { formatNow, makeId } from "./state";
import type {
  DevelopmentWorkspaceState,
  EtlField,
  EtlGraphEdge,
  EtlGraphNode,
  EtlNodeCategory,
  EtlTask,
  NotebookCell,
  NotebookDocument,
  SqlScript,
} from "./types";

const customerSchema: EtlField[] = [
  { name: "customer_id", type: "string", nullable: false },
  { name: "customer_name", type: "string", nullable: true },
  { name: "city", type: "string", nullable: true },
  { name: "amount", type: "decimal(18,2)", nullable: true },
];

function node(
  id: string,
  category: EtlNodeCategory,
  nodeType: string,
  label: string,
  x: number,
  y: number,
  config: Record<string, string>,
): EtlGraphNode {
  return {
    id,
    type: "etlNode",
    position: { x, y },
    data: {
      label,
      description: category === "input" ? "读取上游数据对象" : category === "output" ? "写入目标数据对象" : "执行字段级数据转换",
      category,
      nodeType,
      config,
      inputSchema: category === "input" ? [] : customerSchema,
      outputSchema: customerSchema,
      validationIssues: [],
      runStatus: "idle",
    },
  };
}

function edge(id: string, source: string, target: string): EtlGraphEdge {
  return { id, source, target };
}

const customerEtlNodes = [
  node("customer-source", "input", "table-input", "客户主表", 40, 150, { source: "lakehouse_prod", object: "ods_customer", mode: "全量" }),
  node("customer-filter", "transform", "filter", "有效客户过滤", 330, 150, { expression: "customer_id IS NOT NULL", nullHandling: "丢弃" }),
  node("customer-derive", "transform", "derive", "客户等级派生", 620, 150, { expression: "CASE WHEN amount >= 10000 THEN 'A' ELSE 'B' END", targetField: "customer_level" }),
  node("customer-output", "output", "table-output", "客户画像明细", 910, 150, { target: "dwd_customer_profile", writeMode: "覆盖分区", partition: "biz_date" }),
];

const customerEtlEdges = [
  edge("customer-e1", "customer-source", "customer-filter"),
  edge("customer-e2", "customer-filter", "customer-derive"),
  edge("customer-e3", "customer-derive", "customer-output"),
];

export const initialEtlWorkspace: DevelopmentWorkspaceState<EtlTask> = {
  artifacts: [
    {
      id: "etl-001",
      name: "客户主数据清洗",
      description: "清洗客户主数据并生成客户画像明细。",
      owner: "陈晨",
      tags: ["客户", "DWD"],
      lifecycleStatus: "published",
      saveStatus: "clean",
      validationStatus: "valid",
      currentVersion: 6,
      publishedVersion: 5,
      createdAt: "2026-08-01 10:20",
      updatedAt: "2026-08-13 09:12",
      lastRun: { status: "success", at: "2026-08-13 09:12", summary: "输出 12,840 行" },
      graph: { nodes: customerEtlNodes, edges: customerEtlEdges },
      validationIssues: [],
    },
    {
      id: "etl-002",
      name: "交易明细小时汇总",
      description: "按渠道和小时聚合交易金额。",
      owner: "张敏",
      tags: ["交易", "DWS"],
      lifecycleStatus: "draft",
      saveStatus: "clean",
      validationStatus: "unchecked",
      currentVersion: 3,
      createdAt: "2026-08-08 11:10",
      updatedAt: "2026-08-13 09:16",
      lastRun: { status: "running", at: "2026-08-13 09:16", summary: "正在执行聚合节点" },
      graph: {
        nodes: [
          node("trade-source", "input", "table-input", "交易明细", 60, 120, { source: "lakehouse_prod", object: "dwd_trade_order", mode: "增量" }),
          node("trade-aggregate", "transform", "aggregate", "小时聚合", 380, 120, { groupBy: "channel, hour", metrics: "SUM(amount), COUNT(*)" }),
          node("trade-output", "output", "table-output", "交易小时汇总", 700, 120, { target: "dws_trade_hourly", writeMode: "追加", partition: "biz_date" }),
        ],
        edges: [edge("trade-e1", "trade-source", "trade-aggregate"), edge("trade-e2", "trade-aggregate", "trade-output")],
      },
      validationIssues: [],
    },
    {
      id: "etl-003",
      name: "事件流标签计算",
      description: "从事件明细生成客户行为标签。",
      owner: "李浩",
      tags: ["事件", "标签"],
      lifecycleStatus: "draft",
      saveStatus: "clean",
      validationStatus: "invalid",
      currentVersion: 2,
      createdAt: "2026-08-09 14:20",
      updatedAt: "2026-08-13 08:48",
      lastRun: { status: "failed", at: "2026-08-13 08:48", summary: "输出节点未配置" },
      graph: {
        nodes: [
          node("event-source", "input", "table-input", "客户事件", 80, 150, { source: "lakehouse_prod", object: "dwd_customer_event", mode: "增量" }),
          node("event-filter", "transform", "filter", "有效事件过滤", 390, 150, { expression: "event_type IS NOT NULL", nullHandling: "丢弃" }),
        ],
        edges: [edge("event-e1", "event-source", "event-filter")],
      },
      validationIssues: [{ id: "issue-output", level: "error", message: "流程至少需要一个输出节点" }],
    },
  ],
  runs: [],
};

export function createBlankEtlTask(): EtlTask {
  const now = formatNow();
  return {
    id: makeId("etl"),
    name: "未命名 ETL 任务",
    description: "通过可视化节点搭建数据加工流程。",
    owner: "当前用户",
    tags: [],
    lifecycleStatus: "draft",
    saveStatus: "clean",
    validationStatus: "unchecked",
    currentVersion: 1,
    createdAt: now,
    updatedAt: now,
    graph: { nodes: [], edges: [] },
    validationIssues: [],
  };
}

export const initialSqlWorkspace: DevelopmentWorkspaceState<SqlScript> = {
  artifacts: [
    {
      id: "sql-001",
      name: "高价值客户识别",
      description: "识别最近 90 天累计交易金额较高的客户。",
      owner: "赵宁",
      tags: ["客户", "营销"],
      lifecycleStatus: "published",
      saveStatus: "clean",
      validationStatus: "valid",
      currentVersion: 12,
      publishedVersion: 11,
      createdAt: "2026-07-20 09:10",
      updatedAt: "2026-08-13 09:02",
      lastRun: { status: "success", at: "2026-08-13 09:02", summary: "返回 12,840 行" },
      context: { sourceRef: "source-lakehouse", database: "lakehouse_prod", schema: "analytics" },
      content: "WITH customer_amount AS (\n  SELECT customer_id, SUM(amount) AS total_amount\n  FROM dwd_trade_order\n  WHERE biz_date >= {{start_date}}\n  GROUP BY customer_id\n)\nSELECT customer_id, total_amount\nFROM customer_amount\nWHERE total_amount >= {{amount_threshold}}\nORDER BY total_amount DESC;",
      parameters: [
        { id: "param-start", name: "start_date", type: "date", defaultValue: "2026-05-15", required: true, description: "统计开始日期" },
        { id: "param-amount", name: "amount_threshold", type: "number", defaultValue: "10000", required: true, description: "高价值金额阈值" },
      ],
      output: { id: "ads-high-value", name: "ads_high_value_customer", kind: "table" },
      validationIssues: [],
      result: {
        status: "success",
        columns: ["customer_id", "total_amount", "customer_level"],
        rows: [["C10028", "86,420.00", "A"], ["C10991", "75,230.50", "A"], ["C20384", "64,810.00", "A"]],
        rowCount: 12840,
        scanned: "2.4 GB",
        duration: "1.28s",
        logs: ["09:02:14 参数解析完成", "09:02:15 查询执行成功，共返回 12,840 行"],
        plan: ["Sort total_amount DESC", "Filter total_amount >= 10000", "HashAggregate customer_id", "Scan dwd_trade_order"],
      },
      versions: [],
    },
    {
      id: "sql-002",
      name: "渠道转化漏斗",
      description: "按渠道统计访问、加购和支付转化。",
      owner: "王雪",
      tags: ["渠道", "漏斗"],
      lifecycleStatus: "draft",
      saveStatus: "clean",
      validationStatus: "unchecked",
      currentVersion: 5,
      createdAt: "2026-08-02 15:20",
      updatedAt: "2026-08-12 18:32",
      context: { sourceRef: "source-analytics", database: "analytics", schema: "mart" },
      content: "WITH funnel AS (\n  SELECT channel, event_type, COUNT(DISTINCT user_id) AS users\n  FROM dwd_user_event\n  GROUP BY channel, event_type\n)\nSELECT * FROM funnel;",
      parameters: [],
      validationIssues: [],
      versions: [],
    },
    {
      id: "sql-003",
      name: "风险敞口日报",
      description: "生成机构风险敞口日汇总。",
      owner: "周凯",
      tags: ["风险", "日报"],
      lifecycleStatus: "draft",
      saveStatus: "clean",
      validationStatus: "invalid",
      currentVersion: 21,
      createdAt: "2026-07-12 10:00",
      updatedAt: "2026-08-13 07:35",
      lastRun: { status: "failed", at: "2026-08-13 07:35", summary: "mock 查询超时" },
      context: { sourceRef: "source-risk", database: "risk_mart", schema: "report" },
      content: "SELECT biz_date, institution_id, SUM(exposure) AS total_exposure\nFROM dwd_risk_exposure\nGROUP BY biz_date, institution_id;",
      parameters: [],
      output: { id: "ads-risk-daily", name: "ads_risk_exposure_daily", kind: "table" },
      validationIssues: [],
      result: { status: "failed", columns: [], rows: [], rowCount: 0, scanned: "18.7 GB", duration: "30.00s", logs: ["07:35:12 查询超过 mock 超时阈值"], plan: [], error: { id: "timeout", level: "error", message: "查询超时，请缩小数据范围", line: 2, column: 1 } },
      versions: [],
    },
  ],
  runs: [],
};

export function createBlankSqlScript(): SqlScript {
  const now = formatNow();
  return {
    id: makeId("sql"),
    name: "未命名 SQL 脚本",
    description: "使用 SQL 完成数据查询或加工。",
    owner: "当前用户",
    tags: [],
    lifecycleStatus: "draft",
    saveStatus: "clean",
    validationStatus: "unchecked",
    currentVersion: 1,
    createdAt: now,
    updatedAt: now,
    context: { sourceRef: "source-lakehouse", database: "lakehouse_dev", schema: "default" },
    content: "SELECT\n  *\nFROM source_table\nLIMIT 100;",
    parameters: [],
    validationIssues: [],
    versions: [],
  };
}

function notebookCell(id: string, type: NotebookCell["type"], source: string, executionCount?: number): NotebookCell {
  return { id, type, source, executionCount, status: executionCount ? "success" : "idle", stale: false, outputs: [] };
}

export const initialNotebookWorkspace: DevelopmentWorkspaceState<NotebookDocument> = {
  artifacts: [
    {
      id: "notebook-001",
      name: "客户流失预测探索",
      description: "探索客户行为特征并验证流失预测基线。",
      owner: "孙琪",
      tags: ["客户", "机器学习"],
      lifecycleStatus: "published",
      saveStatus: "clean",
      validationStatus: "valid",
      currentVersion: 8,
      publishedVersion: 7,
      createdAt: "2026-08-03 10:30",
      updatedAt: "2026-08-12 20:18",
      lastRun: { status: "success", at: "2026-08-12 20:18", summary: "26 个单元执行成功" },
      runtime: "Python 3.11",
      kernelStatus: "idle",
      cells: [
        notebookCell("nb1-title", "markdown", "# 客户流失预测探索\n加载客户特征，检查分布并训练基线模型。"),
        { ...notebookCell("nb1-sql", "sql", "SELECT customer_id, active_days, order_count, churned\nFROM ads_customer_features\nLIMIT 1000;", 1), outputs: [{ id: "out-sql", type: "table", title: "样例数据", content: "返回 1,000 行", columns: ["customer_id", "active_days", "order_count", "churned"], rows: [["C10001", "23", "8", "0"], ["C10002", "3", "1", "1"]] }] },
        { ...notebookCell("nb1-python", "python", "churn_rate = df['churned'].mean()\nprint(f'流失率: {churn_rate:.2%}')", 2), outputs: [{ id: "out-python", type: "metric", title: "流失率", content: "18.42%" }] },
      ],
      variables: [{ name: "df", type: "DataFrame", summary: "1,000 rows × 4 columns", cellId: "nb1-sql", updatedAt: "20:17" }, { name: "churn_rate", type: "float", summary: "0.1842", cellId: "nb1-python", updatedAt: "20:18" }],
      checkpoints: [],
    },
    {
      id: "notebook-002",
      name: "异常交易特征分析",
      description: "分析异常交易的时间和金额特征。",
      owner: "周凯",
      tags: ["风控", "特征"],
      lifecycleStatus: "draft",
      saveStatus: "clean",
      validationStatus: "unchecked",
      currentVersion: 4,
      createdAt: "2026-08-10 09:30",
      updatedAt: "刚刚",
      lastRun: { status: "running", at: "刚刚", summary: "正在运行第 7 个单元" },
      runtime: "Python 3.11",
      kernelStatus: "busy",
      cells: [notebookCell("nb2-title", "markdown", "# 异常交易特征分析"), notebookCell("nb2-python", "python", "features = build_features(transactions)\nfeatures.describe()")],
      variables: [],
      checkpoints: [],
    },
    {
      id: "notebook-003",
      name: "营销归因实验",
      description: "使用 SQL 和 Python 比较不同归因口径。",
      owner: "赵宁",
      tags: ["营销", "实验"],
      lifecycleStatus: "draft",
      saveStatus: "clean",
      validationStatus: "unchecked",
      currentVersion: 2,
      createdAt: "2026-08-11 13:00",
      updatedAt: "2026-08-13 08:12",
      runtime: "SQL + Python",
      kernelStatus: "not_started",
      cells: [notebookCell("nb3-title", "markdown", "# 营销归因实验"), notebookCell("nb3-param", "parameter", "lookback_days = 30"), notebookCell("nb3-sql", "sql", "SELECT * FROM dwd_marketing_touch WHERE biz_date >= {{start_date}}")],
      variables: [],
      checkpoints: [],
    },
  ],
  runs: [],
};

export function createBlankNotebook(): NotebookDocument {
  const now = formatNow();
  return {
    id: makeId("notebook"),
    name: "未命名 Notebook",
    description: "通过交互式单元格探索和验证数据。",
    owner: "当前用户",
    tags: [],
    lifecycleStatus: "draft",
    saveStatus: "clean",
    validationStatus: "unchecked",
    currentVersion: 1,
    createdAt: now,
    updatedAt: now,
    runtime: "Python 3.11",
    kernelStatus: "not_started",
    cells: [notebookCell(makeId("cell"), "markdown", "# 新建 Notebook\n记录分析目标和结论。"), notebookCell(makeId("cell"), "python", "# 在此编写 Python 代码\nprint('Hello, data platform!')")],
    variables: [],
    checkpoints: [],
  };
}
