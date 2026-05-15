import { registerMockRoute } from "@/lib/mock-client";

// ── Types ──────────────────────────────────────────────────────────────────

export interface GraphInstance {
  id: string; name: string; host: string; port: number;
  status: "healthy" | "warning" | "offline";
  createdAt: string; updatedAt: string;
}

export interface GraphOverviewStats {
  graphId: string; vertexCount: number; edgeCount: number;
  vertexLabelDistribution: Array<{ label: string; count: number }>;
  recentTasks: Array<{ id: string; type: string; status: string; createdAt: string }>;
  recentImports: Array<{ id: string; sourceKind: "local" | "database" | "api"; rows: number; finishedAt: string }>;
  indexHealth: { ready: number; building: number; failed: number };
}

export interface VertexLabel {
  id: string; name: string; idStrategy: "auto" | "primaryKey" | "customize";
  primaryKeys?: string[]; propertyKeys: string[];
  style: { color: string; shape: "circle" | "rect" | "diamond" | "triangle"; size: "sm" | "md" | "lg"; displayProperty?: string };
  position?: { x: number; y: number };
}

export interface EdgeLabel {
  id: string; name: string; sourceLabel: string; targetLabel: string;
  frequency: "single" | "multiple"; propertyKeys: string[];
  style: { color: string; thickness: 1 | 2 | 3; arrow: "none" | "end" | "both" };
}

export interface PropertyKey {
  id: string; name: string;
  dataType: "TEXT" | "INT" | "LONG" | "FLOAT" | "DOUBLE" | "BOOLEAN" | "DATE" | "UUID" | "BLOB";
  cardinality: "single" | "list" | "set";
}

export interface IndexLabel {
  id: string; name: string; baseType: "vertex" | "edge"; baseLabel: string;
  indexType: "secondary" | "range" | "search" | "shard" | "unique";
  fields: string[]; status: "ready" | "building" | "failed";
}

export interface Vertex {
  id: string; label: string; properties: Record<string, unknown>;
  x?: number; y?: number;
}

export interface Edge {
  id: string; label: string; sourceId: string; targetId: string;
  properties: Record<string, unknown>;
}

export interface AsyncTask {
  id: string; graphId: string;
  type: "gremlin-query" | "cypher-query" | "olap-algorithm" | "schema-delete" | "index-rebuild" | "import" | "ai-kg-build" | "ai-graph-extraction" | "ai-graph-commit" | "ai-graph-community-detection" | "ai-graph-community-summarization" | "ai-graph-embedding" | "large-export";
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  progress: number;
  parameters: Record<string, unknown>;
  result?: { summary: string; downloadUrl?: string; rowCount?: number };
  logs: Array<{ at: string; level: "info" | "warn" | "error"; message: string }>;
  createdAt: string; startedAt?: string; finishedAt?: string; error?: string;
}

export interface ImportJob {
  id: string; graphId: string;
  schemaSelection: { vertexLabels: string[]; edgeLabels: string[] };
  connector: { kind: "local" | "database" | "api" };
  status: "pending" | "running" | "paused" | "success" | "failed";
  progress: number; startedAt?: string; finishedAt?: string;
  error?: string; totalRows?: number; processedRows?: number;
}

export interface AlgorithmDescriptor {
  key: string; name: string;
  category: "centrality" | "community" | "path";
  description: string;
  paramSchema: Array<{ key: string; label: string; type: "number" | "string" | "boolean" | "enum" | "label-multi"; default?: unknown; min?: number; max?: number; options?: string[] }>;
  outputProperty?: string;
}

export interface Perspective {
  id: string; graphId: string; name: string; description?: string;
  filterRules: Array<{ target: "vertex" | "edge"; label: string; hidden: boolean }>;
  styleOverrides: Array<{ target: "vertex" | "edge"; binding: string; mapping: Record<string, unknown> }>;
  defaultLayout: string; createdAt: string; updatedAt: string;
}

// ── AI Graph Types ─────────────────────────────────────────────────────────

export type AiGraphDocStatus = "pending" | "parsing" | "parsed" | "chunking" | "chunked" | "extracting" | "extracted" | "committed" | "failed";
export type SchemaMode = "free" | "locked";
export type DomainKey = "general" | "finance" | "medical" | "legal" | "academic";

export type ChunkStrategy = "token" | "sentence" | "paragraph" | "recursive";
export type EmbeddingModel = "text-embedding-3-small" | "text-embedding-3-large" | "bge-large-zh" | "local-minilm";

export interface DocumentChunk {
  id: string; docId: string; index: number; text: string;
  charRange: [number, number]; tokenCount: number;
  pageNumber?: number; sectionTitle?: string;
}

export interface AiGraphDocument {
  id: string; graphId: string; filename: string; mimeType: string;
  sizeBytes: number; charCount?: number; textPreview?: string;
  status: AiGraphDocStatus; extractionCount: number; uploadedAt: string;
  chunkCount?: number; chunkingStrategy?: ChunkStrategy;
}

export interface ProvenanceRef {
  docId: string; chunkId: string; sentenceText: string; charRange: [number, number];
}

export interface ExtractedVertex {
  id: string; label: string; name: string;
  properties: Record<string, unknown>; confidence: number;
  origin: ProvenanceRef[]; mergedFrom?: string[]; needsReview?: boolean;
}

export interface ExtractedEdge {
  id: string; label: string; sourceVertexId: string; targetVertexId: string;
  properties: Record<string, unknown>; confidence: number;
  origin: ProvenanceRef[]; needsReview?: boolean;
}

export interface EntityTypeDef {
  label: string; description: string; examples: string[];
}

export interface ClaimTypeDef {
  type: string; description: string;
}

export interface ExtractionConfig {
  schemaMode: SchemaMode; lockedVertexLabels?: string[]; lockedEdgeLabels?: string[];
  domain: DomainKey; chunkSize: number; llmModel: string;
  // v2 extensions (optional, default in DEFAULT_CONFIG)
  chunking?: { strategy: ChunkStrategy; chunkSize: number; overlap: number };
  entityTypes?: EntityTypeDef[];
  gleaningRounds?: number;
  extractClaims?: boolean;
  claimTypes?: ClaimTypeDef[];
  embeddingModel?: EmbeddingModel;
  parallelism?: number;
}

export interface ExtractedClaim {
  id: string; type: string;
  subjectVertexId: string; objectVertexId?: string;
  statement: string; confidence: number; origin: ProvenanceRef[];
  timeRange?: [string, string]; status?: "TRUE" | "FALSE" | "SUSPECTED";
}

export interface Community {
  id: string; level: number; parentId?: string;
  memberVertexIds: string[]; centralVertexIds: string[];
  title: string; modularity?: number;
}

export interface CommunityReport {
  id: string; communityId: string; title: string;
  summary: string; rating: number; ratingExplanation: string;
  findings: Array<{ headline: string; explanation: string }>;
  generatedAt: string;
}

export type AiGraphExtractionStatus =
  | "pending" | "running" | "summarizing" | "embedding"
  | "clustering" | "reporting" | "reviewing" | "committed" | "failed";

export interface AiGraphExtraction {
  id: string; graphId: string; docIds: string[]; config: ExtractionConfig;
  status: AiGraphExtractionStatus;
  progress: number;
  vertices: ExtractedVertex[]; edges: ExtractedEdge[];
  stats: { vertexCount: number; edgeCount: number; avgConfidence: number; schemaCoverage: number; newLabels: string[] };
  createdAt: string; finishedAt?: string;
  // v2 additions
  chunks?: DocumentChunk[];
  claims?: ExtractedClaim[];
  communities?: Community[];
  reports?: CommunityReport[];
  embeddings?: Record<string, number[]>;
  gleaningRoundsUsed?: number;
  tokenUsage?: { prompt: number; completion: number; estimatedUsd: number };
  parentExtractionId?: string;
}

export interface DomainTemplate {
  key: DomainKey; label: { "zh-CN": string; "en-US": string };
  suggestedVertexLabels: string[]; suggestedEdgeLabels: string[]; fewShotCount: number;
}

// ── Fixtures ───────────────────────────────────────────────────────────────

const graphs: GraphInstance[] = [
  { id: "hugegraph-demo", name: "供应链知识图谱", host: "localhost", port: 8080, status: "healthy", createdAt: "2026-04-01", updatedAt: "2026-05-13" },
  { id: "risk-graph",     name: "风险关系图谱",   host: "10.0.0.2",  port: 8080, status: "warning", createdAt: "2026-03-15", updatedAt: "2026-05-10" },
];

const propertyKeys: PropertyKey[] = [
  { id: "pk-name",      name: "name",      dataType: "TEXT",    cardinality: "single" },
  { id: "pk-age",       name: "age",       dataType: "INT",     cardinality: "single" },
  { id: "pk-role",      name: "role",      dataType: "TEXT",    cardinality: "single" },
  { id: "pk-region",    name: "region",    dataType: "TEXT",    cardinality: "single" },
  { id: "pk-industry",  name: "industry",  dataType: "TEXT",    cardinality: "single" },
  { id: "pk-founded",   name: "founded",   dataType: "INT",     cardinality: "single" },
  { id: "pk-amount",    name: "amount",    dataType: "DOUBLE",  cardinality: "single" },
  { id: "pk-category",  name: "category",  dataType: "TEXT",    cardinality: "single" },
  { id: "pk-price",     name: "price",     dataType: "DOUBLE",  cardinality: "single" },
  { id: "pk-startedAt", name: "startedAt", dataType: "DATE",    cardinality: "single" },
  { id: "pk-weight",    name: "weight",    dataType: "FLOAT",   cardinality: "single" },
  { id: "pk-desc",      name: "description", dataType: "TEXT",  cardinality: "single" },
];

const vertexLabels: VertexLabel[] = [
  {
    id: "vl-person", name: "Person", idStrategy: "primaryKey", primaryKeys: ["name"],
    propertyKeys: ["name", "age", "role", "region"],
    style: { color: "#2849D8", shape: "circle", size: "md", displayProperty: "name" },
    position: { x: 120, y: 140 },
  },
  {
    id: "vl-company", name: "Company", idStrategy: "primaryKey", primaryKeys: ["name"],
    propertyKeys: ["name", "industry", "founded", "region", "amount"],
    style: { color: "#059669", shape: "rect", size: "lg", displayProperty: "name" },
    position: { x: 360, y: 120 },
  },
  {
    id: "vl-product", name: "Product", idStrategy: "auto",
    propertyKeys: ["name", "category", "price", "description"],
    style: { color: "#d97706", shape: "diamond", size: "sm", displayProperty: "name" },
    position: { x: 600, y: 200 },
  },
];

const edgeLabels: EdgeLabel[] = [
  { id: "el-works-at",         name: "works_at",         sourceLabel: "Person",  targetLabel: "Company", frequency: "single",   propertyKeys: ["startedAt", "role"],   style: { color: "#6366f1", thickness: 1, arrow: "end" } },
  { id: "el-invests-in",       name: "invests_in",       sourceLabel: "Company", targetLabel: "Company", frequency: "multiple", propertyKeys: ["amount", "startedAt"], style: { color: "#dc2626", thickness: 2, arrow: "end" } },
  { id: "el-produces",         name: "produces",         sourceLabel: "Company", targetLabel: "Product", frequency: "single",   propertyKeys: ["startedAt"],            style: { color: "#d97706", thickness: 1, arrow: "end" } },
  { id: "el-collaborates-with", name: "collaborates_with", sourceLabel: "Company", targetLabel: "Company", frequency: "multiple", propertyKeys: ["weight", "startedAt"], style: { color: "#0891b2", thickness: 1, arrow: "both" } },
];

const indexLabels: IndexLabel[] = [
  { id: "il-person-name",    name: "personByName",     baseType: "vertex", baseLabel: "Person",  indexType: "secondary", fields: ["name"],     status: "ready" },
  { id: "il-company-industry", name: "companyByIndustry", baseType: "vertex", baseLabel: "Company", indexType: "secondary", fields: ["industry"], status: "ready" },
  { id: "il-company-region", name: "companyByRegion",  baseType: "vertex", baseLabel: "Company", indexType: "secondary", fields: ["region"],   status: "building" },
  { id: "il-product-name",   name: "productSearch",    baseType: "vertex", baseLabel: "Product", indexType: "search",    fields: ["name"],     status: "ready" },
];

// Vertices for the seed graph (~20 sample)
const vertices: Vertex[] = [
  { id: "v1",  label: "Person",  properties: { name: "张伟",   age: 35, role: "CTO",     region: "北京" }, x: 100, y: 160 },
  { id: "v2",  label: "Person",  properties: { name: "李娜",   age: 29, role: "分析师",   region: "上海" }, x: 180, y: 80  },
  { id: "v3",  label: "Person",  properties: { name: "王强",   age: 42, role: "CEO",     region: "深圳" }, x: 60,  y: 280 },
  { id: "v4",  label: "Person",  properties: { name: "刘芳",   age: 31, role: "数据工程师", region: "北京" }, x: 200, y: 240 },
  { id: "v5",  label: "Person",  properties: { name: "陈明",   age: 38, role: "产品经理",  region: "广州" }, x: 140, y: 320 },
  { id: "v6",  label: "Company", properties: { name: "远航科技", industry: "互联网", founded: 2015, region: "北京", amount: 5000000 }, x: 360, y: 100 },
  { id: "v7",  label: "Company", properties: { name: "星辰数据", industry: "大数据", founded: 2018, region: "上海", amount: 2000000 }, x: 520, y: 180 },
  { id: "v8",  label: "Company", properties: { name: "鹏程投资", industry: "金融",   founded: 2010, region: "深圳", amount: 80000000 }, x: 420, y: 300 },
  { id: "v9",  label: "Company", properties: { name: "合众供应链", industry: "物流",  founded: 2012, region: "广州", amount: 12000000 }, x: 300, y: 360 },
  { id: "v10", label: "Company", properties: { name: "智云平台", industry: "SaaS",  founded: 2020, region: "北京", amount: 800000  }, x: 600, y: 80  },
  { id: "v11", label: "Product", properties: { name: "供应链管理系统", category: "软件", price: 299000, description: "端到端供应链可视化平台" }, x: 640, y: 200 },
  { id: "v12", label: "Product", properties: { name: "风险预警平台",   category: "软件", price: 180000, description: "实时风险监控与预警" },      x: 700, y: 320 },
  { id: "v13", label: "Product", properties: { name: "数据集成中间件", category: "软件", price: 80000,  description: "多源数据融合中间件" },        x: 580, y: 380 },
  { id: "v14", label: "Person",  properties: { name: "赵磊",   age: 45, role: "VP",      region: "北京" }, x: 260, y: 160 },
  { id: "v15", label: "Person",  properties: { name: "孙婷",   age: 27, role: "研究员",   region: "上海" }, x: 320, y: 240 },
];

const edges: Edge[] = [
  { id: "e1",  label: "works_at",         sourceId: "v1",  targetId: "v6",  properties: { startedAt: "2019-03-01", role: "CTO" } },
  { id: "e2",  label: "works_at",         sourceId: "v2",  targetId: "v7",  properties: { startedAt: "2021-06-15", role: "分析师" } },
  { id: "e3",  label: "works_at",         sourceId: "v3",  targetId: "v8",  properties: { startedAt: "2015-01-01", role: "CEO" } },
  { id: "e4",  label: "works_at",         sourceId: "v4",  targetId: "v6",  properties: { startedAt: "2022-09-01", role: "数据工程师" } },
  { id: "e5",  label: "works_at",         sourceId: "v5",  targetId: "v9",  properties: { startedAt: "2020-04-01", role: "产品经理" } },
  { id: "e6",  label: "works_at",         sourceId: "v14", targetId: "v10", properties: { startedAt: "2020-01-01", role: "VP" } },
  { id: "e7",  label: "works_at",         sourceId: "v15", targetId: "v7",  properties: { startedAt: "2023-02-01", role: "研究员" } },
  { id: "e8",  label: "invests_in",       sourceId: "v8",  targetId: "v6",  properties: { amount: 3000000, startedAt: "2021-05-01" } },
  { id: "e9",  label: "invests_in",       sourceId: "v8",  targetId: "v7",  properties: { amount: 1500000, startedAt: "2022-11-01" } },
  { id: "e10", label: "invests_in",       sourceId: "v8",  targetId: "v10", properties: { amount: 500000,  startedAt: "2023-03-01" } },
  { id: "e11", label: "produces",         sourceId: "v6",  targetId: "v11", properties: { startedAt: "2022-01-01" } },
  { id: "e12", label: "produces",         sourceId: "v7",  targetId: "v12", properties: { startedAt: "2023-06-01" } },
  { id: "e13", label: "produces",         sourceId: "v10", targetId: "v13", properties: { startedAt: "2024-01-01" } },
  { id: "e14", label: "collaborates_with", sourceId: "v6",  targetId: "v9",  properties: { weight: 0.8, startedAt: "2020-07-01" } },
  { id: "e15", label: "collaborates_with", sourceId: "v7",  targetId: "v9",  properties: { weight: 0.6, startedAt: "2021-09-01" } },
  { id: "e16", label: "collaborates_with", sourceId: "v6",  targetId: "v7",  properties: { weight: 0.9, startedAt: "2022-03-01" } },
];

const asyncTasks: AsyncTask[] = [
  {
    id: "task-import-001", graphId: "hugegraph-demo", type: "import", status: "success", progress: 100,
    parameters: { connector: "local", file: "supply_chain.csv", rows: 45000 },
    result: { summary: "成功导入 45,000 条记录", rowCount: 45000 },
    logs: [
      { at: "2026-05-13 08:00:01", level: "info", message: "任务启动" },
      { at: "2026-05-13 08:02:30", level: "info", message: "解析完成: 45,000 行" },
      { at: "2026-05-13 08:05:12", level: "info", message: "导入完成" },
    ],
    createdAt: "2026-05-13 08:00:00", startedAt: "2026-05-13 08:00:01", finishedAt: "2026-05-13 08:05:12",
  },
  {
    id: "task-import-002", graphId: "hugegraph-demo", type: "import", status: "running", progress: 42,
    parameters: { connector: "database", jdbcUrl: "jdbc:mysql://db:3306/erp", table: "purchase_orders" },
    logs: [
      { at: "2026-05-13 09:30:00", level: "info", message: "连接数据库成功" },
      { at: "2026-05-13 09:30:15", level: "info", message: "正在读取采购订单表…" },
    ],
    createdAt: "2026-05-13 09:29:55", startedAt: "2026-05-13 09:30:00",
  },
  {
    id: "task-olap-pagerank", graphId: "hugegraph-demo", type: "olap-algorithm", status: "success", progress: 100,
    parameters: { algorithm: "page-rank", dampingFactor: 0.85, maxIterations: 100 },
    result: { summary: "PageRank 计算完成，结果回写至 pagerank 属性" },
    logs: [
      { at: "2026-05-13 07:00:00", level: "info", message: "算法启动: PageRank" },
      { at: "2026-05-13 07:03:45", level: "info", message: "迭代 100 次完成" },
      { at: "2026-05-13 07:04:10", level: "info", message: "结果回写完成" },
    ],
    createdAt: "2026-05-13 07:00:00", startedAt: "2026-05-13 07:00:05", finishedAt: "2026-05-13 07:04:10",
  },
  {
    id: "task-olap-wcc", graphId: "hugegraph-demo", type: "olap-algorithm", status: "pending", progress: 0,
    parameters: { algorithm: "wcc", maxIterations: 50 },
    logs: [],
    createdAt: "2026-05-13 10:00:00",
  },
  {
    id: "task-index-001", graphId: "hugegraph-demo", type: "index-rebuild", status: "running", progress: 67,
    parameters: { indexLabel: "companyByRegion" },
    logs: [
      { at: "2026-05-13 09:45:00", level: "info", message: "开始重建索引: companyByRegion" },
      { at: "2026-05-13 09:46:30", level: "info", message: "已处理 67% 数据" },
    ],
    createdAt: "2026-05-13 09:44:55", startedAt: "2026-05-13 09:45:00",
  },
  {
    id: "task-ai-kgbuild", graphId: "risk-graph", type: "ai-kg-build", status: "failed", progress: 38,
    parameters: { textSource: "annual_report_2025.pdf", domainHint: "金融风险" },
    error: "文本抽取服务超时，请重试",
    logs: [
      { at: "2026-05-12 16:00:00", level: "info", message: "开始抽取: annual_report_2025.pdf" },
      { at: "2026-05-12 16:03:20", level: "warn", message: "抽取服务响应缓慢" },
      { at: "2026-05-12 16:05:00", level: "error", message: "请求超时" },
    ],
    createdAt: "2026-05-12 16:00:00", startedAt: "2026-05-12 16:00:05", finishedAt: "2026-05-12 16:05:00",
  },
];

const importJobs: ImportJob[] = [
  {
    id: "job-001", graphId: "hugegraph-demo",
    schemaSelection: { vertexLabels: ["Person", "Company"], edgeLabels: ["works_at"] },
    connector: { kind: "local" }, status: "success", progress: 100,
    startedAt: "2026-05-13 08:00:00", finishedAt: "2026-05-13 08:05:12",
    totalRows: 45000, processedRows: 45000,
  },
  {
    id: "job-002", graphId: "hugegraph-demo",
    schemaSelection: { vertexLabels: ["Company"], edgeLabels: ["invests_in", "collaborates_with"] },
    connector: { kind: "database" }, status: "running", progress: 42,
    startedAt: "2026-05-13 09:30:00",
    totalRows: 12000, processedRows: 5040,
  },
  {
    id: "job-003", graphId: "risk-graph",
    schemaSelection: { vertexLabels: ["Company"], edgeLabels: ["invests_in"] },
    connector: { kind: "api" }, status: "failed", progress: 15,
    startedAt: "2026-05-12 14:00:00", finishedAt: "2026-05-12 14:02:30",
    error: "API 认证失败，请检查 Token",
    totalRows: 8000, processedRows: 1200,
  },
];

const algorithms: AlgorithmDescriptor[] = [
  {
    key: "page-rank", name: "PageRank", category: "centrality",
    description: "通过入链数量和质量衡量节点重要性，常用于影响力分析",
    outputProperty: "pagerank",
    paramSchema: [
      { key: "dampingFactor", label: "阻尼系数", type: "number", default: 0.85, min: 0, max: 1 },
      { key: "maxIterations", label: "最大迭代次数", type: "number", default: 100, min: 1, max: 1000 },
    ],
  },
  {
    key: "betweenness", name: "BetweennessCentrality", category: "centrality",
    description: "衡量节点在图中作为桥梁的程度，识别关键中间人",
    outputProperty: "betweenness",
    paramSchema: [
      { key: "sampleRatio", label: "采样比例", type: "number", default: 1.0, min: 0.1, max: 1.0 },
    ],
  },
  {
    key: "closeness", name: "ClosenessCentrality", category: "centrality",
    description: "通过到达其他节点的平均最短路径衡量中心性",
    outputProperty: "closeness",
    paramSchema: [
      { key: "maxDepth", label: "最大深度", type: "number", default: 6, min: 1, max: 20 },
    ],
  },
  {
    key: "degree", name: "DegreeCentrality", category: "centrality",
    description: "统计节点的度数（连接数量）作为中心性指标",
    outputProperty: "degree",
    paramSchema: [
      { key: "direction", label: "方向", type: "enum", default: "both", options: ["in", "out", "both"] },
    ],
  },
  {
    key: "clustering", name: "ClusteringCoefficient", category: "community",
    description: "衡量节点邻居间互相连接的程度",
    outputProperty: "clustering",
    paramSchema: [
      { key: "maxDegree", label: "最大度数", type: "number", default: 1000, min: 10 },
    ],
  },
  {
    key: "kcore", name: "Kcore", category: "community",
    description: "找出图中所有节点度数不小于 k 的最大子图",
    paramSchema: [
      { key: "k", label: "K 值", type: "number", default: 3, min: 1, max: 100 },
    ],
  },
  {
    key: "lpa", name: "LPA", category: "community",
    description: "标签传播算法，通过迭代传播标签发现社区结构",
    outputProperty: "community",
    paramSchema: [
      { key: "maxIterations", label: "最大迭代次数", type: "number", default: 20, min: 1, max: 200 },
    ],
  },
  {
    key: "triangle-count", name: "TriangleCount", category: "community",
    description: "统计每个节点参与的三角形数量",
    outputProperty: "triangles",
    paramSchema: [
      { key: "maxDegree", label: "最大度数", type: "number", default: 10000, min: 10 },
    ],
  },
  {
    key: "wcc", name: "WCC", category: "community",
    description: "弱连通分量，找出图中所有弱连通的子图",
    outputProperty: "wcc",
    paramSchema: [
      { key: "maxIterations", label: "最大迭代次数", type: "number", default: 100, min: 1 },
    ],
  },
  {
    key: "rings", name: "RingsDetection", category: "path",
    description: "检测图中的环形路径，常用于风险识别",
    paramSchema: [
      { key: "maxDepth", label: "最大环长度", type: "number", default: 5, min: 3, max: 20 },
      { key: "sourceLabel", label: "起点标签", type: "label-multi" },
    ],
  },
  {
    key: "rings-filter", name: "RingsDetectionWithFilter", category: "path",
    description: "带属性过滤的环形检测，支持按属性约束缩小范围",
    paramSchema: [
      { key: "maxDepth", label: "最大环长度", type: "number", default: 5, min: 3, max: 20 },
      { key: "sourceLabel", label: "起点标签", type: "label-multi" },
      { key: "filterProperty", label: "过滤属性", type: "string" },
    ],
  },
];

const perspectives: Perspective[] = [
  {
    id: "persp-procurement", graphId: "hugegraph-demo", name: "Procurement View",
    description: "聚焦采购关系，隐藏投资边",
    filterRules: [{ target: "edge", label: "invests_in", hidden: true }],
    styleOverrides: [{ target: "vertex", binding: "label", mapping: { Company: { color: "#059669" } } }],
    defaultLayout: "hierarchical",
    createdAt: "2026-04-10", updatedAt: "2026-05-01",
  },
  {
    id: "persp-risk", graphId: "hugegraph-demo", name: "Risk View",
    description: "高亮投资链路，识别多跳风险路径",
    filterRules: [],
    styleOverrides: [{ target: "edge", binding: "label", mapping: { invests_in: { color: "#dc2626", size: 3 } } }],
    defaultLayout: "force",
    createdAt: "2026-04-20", updatedAt: "2026-05-05",
  },
];

function overviewStats(graphId: string): GraphOverviewStats {
  const isMain = graphId === "hugegraph-demo";
  return {
    graphId,
    vertexCount: isMain ? 186432 : 54210,
    edgeCount: isMain ? 524891 : 127440,
    vertexLabelDistribution: isMain
      ? [{ label: "Person", count: 68000 }, { label: "Company", count: 42000 }, { label: "Product", count: 76432 }]
      : [{ label: "Person", count: 21000 }, { label: "Company", count: 33210 }],
    recentTasks: asyncTasks.filter(t => t.graphId === graphId).slice(0, 5).map(t => ({
      id: t.id, type: t.type, status: t.status, createdAt: t.createdAt,
    })),
    recentImports: importJobs.filter(j => j.graphId === graphId).slice(0, 3).map(j => ({
      id: j.id, sourceKind: j.connector.kind, rows: j.processedRows ?? 0, finishedAt: j.finishedAt ?? "—",
    })),
    indexHealth: isMain
      ? { ready: 3, building: 1, failed: 0 }
      : { ready: 1, building: 0, failed: 1 },
  };
}

// ── Route Registration ─────────────────────────────────────────────────────

// Graphs
registerMockRoute("GET", "/api/knowledge-graph/graphs/list", () => graphs);
for (const g of graphs) {
  registerMockRoute("GET", `/api/knowledge-graph/graphs/${g.id}/detail`, () => g);
  registerMockRoute("GET", `/api/knowledge-graph/graphs/${g.id}/overview-stats`, () => overviewStats(g.id));
}
registerMockRoute("POST", "/api/knowledge-graph/graphs", (_body) => {
  const b = _body as Partial<GraphInstance>;
  return { id: `graph-${Date.now()}`, name: b.name ?? "New Graph", host: b.host ?? "localhost", port: b.port ?? 8080, status: "healthy", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } satisfies GraphInstance;
});

// Perspectives
registerMockRoute("GET", "/api/knowledge-graph/perspectives/list", () => perspectives);

// Metadata
registerMockRoute("GET", "/api/knowledge-graph/metadata/vertexlabels", () => vertexLabels);
registerMockRoute("POST", "/api/knowledge-graph/metadata/vertexlabels", (body) => ({ ...body as object, id: `vl-${Date.now()}` }));
registerMockRoute("PUT", "/api/knowledge-graph/metadata/vertexlabels", (body) => body);
registerMockRoute("DELETE", "/api/knowledge-graph/metadata/vertexlabels", () => ({ ok: true }));
registerMockRoute("GET", "/api/knowledge-graph/metadata/edgelabels", () => edgeLabels);
registerMockRoute("POST", "/api/knowledge-graph/metadata/edgelabels", (body) => ({ ...body as object, id: `el-${Date.now()}` }));
registerMockRoute("PUT", "/api/knowledge-graph/metadata/edgelabels", (body) => body);
registerMockRoute("DELETE", "/api/knowledge-graph/metadata/edgelabels", () => ({ ok: true }));
registerMockRoute("GET", "/api/knowledge-graph/metadata/propertykeys", () => propertyKeys);
registerMockRoute("POST", "/api/knowledge-graph/metadata/propertykeys", (body) => ({ ...body as object, id: `pk-${Date.now()}` }));
registerMockRoute("PUT", "/api/knowledge-graph/metadata/propertykeys", (body) => body);
registerMockRoute("DELETE", "/api/knowledge-graph/metadata/propertykeys", () => ({ ok: true }));
registerMockRoute("GET", "/api/knowledge-graph/metadata/indexlabels", () => indexLabels);
registerMockRoute("POST", "/api/knowledge-graph/metadata/indexlabels", (body) => ({ ...body as object, id: `il-${Date.now()}` }));
registerMockRoute("PUT", "/api/knowledge-graph/metadata/indexlabels", (body) => body);
registerMockRoute("DELETE", "/api/knowledge-graph/metadata/indexlabels", () => ({ ok: true }));
registerMockRoute("GET", "/api/knowledge-graph/metadata/schema-graph", () => ({ vertices: vertexLabels, edges: edgeLabels }));
registerMockRoute("POST", "/api/knowledge-graph/metadata/schema-graph/commit", () => ({ ok: true, appliedChanges: 3 }));

// Analysis
registerMockRoute("POST", "/api/knowledge-graph/analysis/gremlin", (body) => {
  const q = body as { query?: string };
  const lower = (q.query ?? "").toLowerCase();
  const matched = lower.includes("person") ? vertices.filter(v => v.label === "Person") : lower.includes("company") ? vertices.filter(v => v.label === "Company") : vertices.slice(0, 8);
  const ids = new Set(matched.map(v => v.id));
  return {
    columns: ["id", "label", "name"],
    rows: matched.map(v => ({ id: v.id, label: v.label, name: v.properties.name })),
    graph: {
      vertices: matched,
      edges: edges.filter(e => ids.has(e.sourceId) && ids.has(e.targetId)),
    },
  };
});
registerMockRoute("POST", "/api/knowledge-graph/analysis/cypher", (_body) => {
  return { columns: ["n.name", "n.label"], rows: vertices.slice(0, 5).map(v => ({ "n.name": v.properties.name, "n.label": v.label })), graph: { vertices: vertices.slice(0, 5), edges: [] } };
});
registerMockRoute("GET", "/api/knowledge-graph/analysis/history", () => []);
registerMockRoute("GET", "/api/knowledge-graph/analysis/templates", () => []);

// Visualization
registerMockRoute("POST", "/api/knowledge-graph/visualization/start", (body) => {
  const b = body as { vertexId?: string };
  const root = vertices.find(v => v.id === b.vertexId) ?? vertices[0];
  const oneHopIds = edges.filter(e => e.sourceId === root.id || e.targetId === root.id).flatMap(e => [e.sourceId, e.targetId]);
  const oneHopVerts = vertices.filter(v => oneHopIds.includes(v.id) && v.id !== root.id);
  const oneHopEdges = edges.filter(e => e.sourceId === root.id || e.targetId === root.id);
  return { vertex: root, oneHop: { vertices: oneHopVerts, edges: oneHopEdges } };
});
registerMockRoute("POST", "/api/knowledge-graph/visualization/expand", (body) => {
  const b = body as { vertexId?: string; depth?: number };
  const connected = edges.filter(e => e.sourceId === b.vertexId || e.targetId === b.vertexId);
  const ids = new Set(connected.flatMap(e => [e.sourceId, e.targetId]).filter(id => id !== b.vertexId));
  return { vertices: vertices.filter(v => ids.has(v.id)), edges: connected };
});
registerMockRoute("POST", "/api/knowledge-graph/visualization/vertex-detail", (body) => {
  const b = body as { vertexId?: string };
  const v = vertices.find(vv => vv.id === b.vertexId) ?? vertices[0];
  const neighborCount = edges.filter(e => e.sourceId === v.id || e.targetId === v.id).length;
  return { ...v, neighborCount, outgoingEdgeLabels: ["works_at", "invests_in"], incomingEdgeLabels: ["works_at"] };
});
registerMockRoute("POST", "/api/knowledge-graph/visualization/shortest-path", () => ({
  kind: "shortest-path",
  addedVertices: vertices.slice(0, 3),
  addedEdges: edges.slice(0, 2),
  highlight: { vertices: vertices.slice(0, 3).map(v => v.id), edges: edges.slice(0, 2).map(e => e.id) },
}));
registerMockRoute("POST", "/api/knowledge-graph/visualization/common-neighbors", () => ({
  kind: "common-neighbors",
  addedVertices: vertices.slice(3, 6),
  addedEdges: edges.slice(3, 5),
}));
registerMockRoute("POST", "/api/knowledge-graph/visualization/pattern-search", () => ({
  kind: "pattern-search",
  addedVertices: vertices.slice(0, 5),
  addedEdges: edges.slice(0, 4),
}));

// Async Tasks
registerMockRoute("GET", "/api/knowledge-graph/async-tasks/list", () => asyncTasks);
registerMockRoute("GET", "/api/knowledge-graph/async-tasks/subscribe", () => []);
for (const t of asyncTasks) {
  registerMockRoute("GET", `/api/knowledge-graph/async-tasks/${t.id}/detail`, () => t);
  registerMockRoute("POST", `/api/knowledge-graph/async-tasks/${t.id}/cancel`, () => ({ ok: true }));
  registerMockRoute("POST", `/api/knowledge-graph/async-tasks/${t.id}/retry`, () => ({ ...t, id: `${t.id}-retry-${Date.now()}`, status: "pending", progress: 0 }));
}

// Import
registerMockRoute("GET", "/api/knowledge-graph/import/jobs", () => importJobs);
registerMockRoute("POST", "/api/knowledge-graph/import/jobs", (body) => ({
  ...body as object, id: `job-${Date.now()}`, status: "pending", progress: 0,
  createdAt: new Date().toISOString(),
}));
registerMockRoute("POST", "/api/knowledge-graph/import/connectors/local/preview", () =>
  Array.from({ length: 5 }, (_, i) => ({ row: i, values: { name: `Entity_${i}`, type: "Person", age: 20 + i } }))
);
registerMockRoute("POST", "/api/knowledge-graph/import/connectors/local/schema", () => [
  { name: "name", inferredType: "string", nullable: false },
  { name: "age", inferredType: "number", nullable: true },
  { name: "type", inferredType: "string", nullable: false },
]);
registerMockRoute("POST", "/api/knowledge-graph/import/connectors/database/connect", () => ({ ok: true, message: "连接成功", sampleSize: 100 }));
registerMockRoute("POST", "/api/knowledge-graph/import/connectors/database/preview", () =>
  Array.from({ length: 5 }, (_, i) => ({ row: i, values: { id: i + 1, company_name: `公司${i}`, industry: "互联网" } }))
);
registerMockRoute("POST", "/api/knowledge-graph/import/mappings/suggest", () => []);

// Computer
registerMockRoute("GET", "/api/knowledge-graph/computer/algorithms", () => algorithms);
registerMockRoute("POST", "/api/knowledge-graph/computer/jobs", (body) => {
  const b = body as { algorithmKey?: string };
  const taskId = `task-olap-${b.algorithmKey}-${Date.now()}`;
  return { taskId };
});

// AI
registerMockRoute("POST", "/api/knowledge-graph/ai/nl2query", (body) => {
  const b = body as { question?: string; targetLanguage?: string };
  const isGremlin = (b.targetLanguage ?? "gremlin") === "gremlin";
  return {
    query: isGremlin
      ? `g.V().hasLabel('Company').has('industry', '${(b.question ?? "").split("行业")[0]}').limit(20)`
      : `MATCH (c:Company {industry: '互联网'}) RETURN c LIMIT 20`,
    rationale: "根据问题识别出目标实体类型为 Company，筛选条件来自 industry 属性",
    confidence: 0.82,
  };
});
registerMockRoute("POST", "/api/knowledge-graph/ai/ragqa", (body) => {
  const b = body as { question?: string };
  return {
    answer: `根据知识图谱分析，"${b.question ?? "您的问题"}"的相关结果：远航科技与星辰数据存在深度合作关系，鹏程投资同时持股两家公司，构成潜在关联风险。`,
    citations: [
      { subgraphId: "sg-1", vertices: ["v6", "v7"], edges: ["e16"] },
      { subgraphId: "sg-2", vertices: ["v8", "v6", "v7"], edges: ["e8", "e9"] },
    ],
  };
});
registerMockRoute("POST", "/api/knowledge-graph/ai/kg-build/preview", () => ({
  extractedVertices: [
    { label: "Company", name: "新能源集团", properties: { industry: "能源", region: "北京" } },
    { label: "Person",  name: "李总",       properties: { role: "CEO", age: 52 } },
  ],
  extractedEdges: [
    { sourceName: "李总", targetName: "新能源集团", label: "works_at", properties: { role: "CEO" } },
  ],
}));
registerMockRoute("POST", "/api/knowledge-graph/ai/kg-build/commit", () => ({ taskId: `task-ai-kgbuild-${Date.now()}` }));
registerMockRoute("GET", "/api/knowledge-graph/ai/ml-models", () => [
  { key: "gcn",       family: "embedding",           description: "图卷积网络" },
  { key: "gat",       family: "embedding",           description: "图注意力网络" },
  { key: "graphsage", family: "embedding",           description: "GraphSAGE 归纳式表示学习" },
  { key: "node-cls",  family: "node-classification", description: "节点分类模型" },
  { key: "link-pred", family: "link-prediction",     description: "链路预测模型" },
]);

// Admin
registerMockRoute("GET", "/api/knowledge-graph/admin/backups", () => [
  { id: "bk-001", graphId: "hugegraph-demo", size: 128 * 1024 * 1024, vertexCount: 186000, edgeCount: 524000, schemaSnapshot: { vertexLabels: 3, edgeLabels: 4 }, createdAt: "2026-05-10 03:00:00", createdBy: "admin" },
  { id: "bk-002", graphId: "hugegraph-demo", size: 98 * 1024 * 1024,  vertexCount: 150000, edgeCount: 410000, schemaSnapshot: { vertexLabels: 3, edgeLabels: 3 }, createdAt: "2026-04-30 03:00:00", createdBy: "admin" },
]);
registerMockRoute("POST", "/api/knowledge-graph/admin/backup",     () => ({ taskId: `task-backup-${Date.now()}` }));
registerMockRoute("POST", "/api/knowledge-graph/admin/restore",    () => ({ taskId: `task-restore-${Date.now()}` }));
registerMockRoute("POST", "/api/knowledge-graph/admin/clear-data", () => ({ taskId: `task-clear-${Date.now()}` }));
registerMockRoute("POST", "/api/knowledge-graph/admin/clear-all",  () => ({ taskId: `task-clear-all-${Date.now()}` }));
registerMockRoute("GET", "/api/knowledge-graph/admin/history", () => [
  { id: "ah-001", graphId: "hugegraph-demo", kind: "backup", status: "success", parameters: {}, effects: { vertexDelta: 0, edgeDelta: 0, schemaDelta: 0 }, taskId: "task-import-001", performedBy: "admin", performedAt: "2026-05-10 03:00:00" },
]);

// ── AI Graph Fixtures & Routes ─────────────────────────────────────────────

const _prov = (charStart: number, text: string): ProvenanceRef => ({
  docId: "doc-fixture-001", chunkId: `chunk-${Math.floor(charStart / 512)}`,
  sentenceText: text, charRange: [charStart, charStart + text.length],
});

const _fixtureVertices: ExtractedVertex[] = [
  { id: "ev-001", label: "Company",  name: "远航科技",       properties: { industry: "互联网", region: "北京", founded: 2015 }, confidence: 0.95, origin: [_prov(240,  "远航科技由张伟担任CTO，成立于2015年，专注于供应链金融领域")], needsReview: false },
  { id: "ev-002", label: "Company",  name: "远航科技有限公司", properties: { industry: "互联网", region: "北京"              }, confidence: 0.78, origin: [_prov(1840, "远航科技有限公司于2023年获得鹏程投资追加投资三千万元")],   needsReview: false },
  { id: "ev-003", label: "Person",   name: "张伟",           properties: { role: "CTO", age: 35                           }, confidence: 0.96, origin: [_prov(240,  "远航科技由张伟担任CTO，成立于2015年")],                   needsReview: false },
  { id: "ev-004", label: "Person",   name: "李明",           properties: { role: "CFO"                                     }, confidence: 0.89, origin: [_prov(320,  "首席财务官李明主导了本轮供应链金融产品设计")],               needsReview: false },
  { id: "ev-005", label: "Person",   name: "王芳",           properties: { role: "董事会成员"                              }, confidence: 0.41, origin: [_prov(6200, "王芳参与了董事会审议")],                                   needsReview: true  },
  { id: "ev-006", label: "Company",  name: "鹏程投资",        properties: { industry: "金融", region: "深圳"               }, confidence: 0.92, origin: [_prov(1840, "远航科技有限公司于2023年获得鹏程投资追加投资三千万元")],   needsReview: false },
  { id: "ev-007", label: "Company",  name: "星辰数据",        properties: { industry: "大数据", region: "上海"             }, confidence: 0.88, origin: [_prov(3100, "星辰数据与远航科技签署战略合作协议，共同开发数据中台产品")], needsReview: false },
  { id: "ev-008", label: "Product",  name: "供应链金融平台",  properties: { category: "金融科技", description: "端到端供应链融资管理平台" }, confidence: 0.84, origin: [_prov(2500, "远航科技自主研发的供应链金融平台于2024年正式上线")], needsReview: false },
];

const _fixtureEdges: ExtractedEdge[] = [
  { id: "ee-001", label: "works_at",   sourceVertexId: "ev-003", targetVertexId: "ev-001", properties: { role: "CTO", startedAt: "2019-03-01" }, confidence: 0.95, origin: [_prov(240,  "远航科技由张伟担任CTO")], needsReview: false },
  { id: "ee-002", label: "works_at",   sourceVertexId: "ev-004", targetVertexId: "ev-001", properties: { role: "CFO"                          }, confidence: 0.88, origin: [_prov(320,  "首席财务官李明主导了本轮供应链金融产品设计")], needsReview: false },
  { id: "ee-003", label: "works_at",   sourceVertexId: "ev-005", targetVertexId: "ev-001", properties: { role: "董事会成员"                   }, confidence: 0.38, origin: [_prov(6200, "王芳参与了董事会审议")], needsReview: true },
  { id: "ee-004", label: "invests_in", sourceVertexId: "ev-006", targetVertexId: "ev-001", properties: { amount: 30000000, startedAt: "2023-01-01" }, confidence: 0.91, origin: [_prov(1840, "远航科技有限公司于2023年获得鹏程投资追加投资三千万元")], needsReview: false },
  { id: "ee-005", label: "invests_in", sourceVertexId: "ev-006", targetVertexId: "ev-007", properties: {}                                    , confidence: 0.76, origin: [_prov(4200, "鹏程投资同期持有星辰数据15%股份")], needsReview: false },
  { id: "ee-006", label: "produces",   sourceVertexId: "ev-001", targetVertexId: "ev-008", properties: { startedAt: "2024-01-01" }           , confidence: 0.83, origin: [_prov(2500, "远航科技自主研发的供应链金融平台于2024年正式上线")], needsReview: false },
];

const _fixtureChunks: DocumentChunk[] = [
  { id: "chunk-0", docId: "doc-fixture-001", index: 0, text: "2025年供应链白皮书\n\n摘要：本报告分析了远航科技、星辰数据、鹏程投资等企业在供应链金融领域的合作模式。远航科技由张伟担任CTO，成立于2015年，专注于供应链金融领域。",                   charRange: [0,   480 ], tokenCount: 286, pageNumber: 1, sectionTitle: "摘要" },
  { id: "chunk-1", docId: "doc-fixture-001", index: 1, text: "...首席财务官李明主导了本轮供应链金融产品设计。公司通过线上线下融合，连接了三百余家上游供应商和上千家下游经销商，年化交易规模超过50亿元...",                   charRange: [320, 800 ], tokenCount: 312, pageNumber: 2, sectionTitle: "公司概况" },
  { id: "chunk-2", docId: "doc-fixture-001", index: 2, text: "...远航科技有限公司于2023年获得鹏程投资追加投资三千万元，估值达到八亿元。鹏程投资专注于早期金融科技项目，过往投资组合包括星辰数据、智云平台...",        charRange: [1696, 2208], tokenCount: 298, pageNumber: 3, sectionTitle: "融资历史" },
  { id: "chunk-3", docId: "doc-fixture-001", index: 3, text: "远航科技自主研发的供应链金融平台于2024年正式上线，整合了AR融资、信用评级、智能风控三大核心模块。平台采用云原生架构，支持每秒万级并发交易...",        charRange: [2400, 2912], tokenCount: 305, pageNumber: 4, sectionTitle: "产品体系" },
  { id: "chunk-4", docId: "doc-fixture-001", index: 4, text: "星辰数据与远航科技签署战略合作协议，共同开发数据中台产品。两家公司将在数据资产管理、实时分析引擎方向深度协同...",                                       charRange: [3008, 3520], tokenCount: 287, pageNumber: 5, sectionTitle: "合作伙伴" },
  { id: "chunk-5", docId: "doc-fixture-001", index: 5, text: "鹏程投资同期持有星辰数据15%股份，形成跨公司协同效应。这种交叉持股结构是近年来金融科技投资圈的常见模式...",                                                charRange: [4096, 4608], tokenCount: 261, pageNumber: 6, sectionTitle: "股权结构" },
  { id: "chunk-6", docId: "doc-fixture-001", index: 6, text: "...王芳参与了董事会审议，对2024年战略规划提出关键性建议。董事会成员名单尚未正式公开，但其影响力在业内备受关注。",                                             charRange: [6080, 6592], tokenCount: 270, pageNumber: 9, sectionTitle: "治理结构" },
];

const _fixtureClaims: ExtractedClaim[] = [
  { id: "cl-001", type: "invested_by",  subjectVertexId: "ev-001", objectVertexId: "ev-006", statement: "远航科技于 2023 年获得鹏程投资追加投资三千万元，估值达到八亿元。", confidence: 0.91, origin: [_prov(1840, "远航科技有限公司于2023年获得鹏程投资追加投资三千万元")], timeRange: ["2023-01-01", "2023-12-31"], status: "TRUE" },
  { id: "cl-002", type: "employed_at",  subjectVertexId: "ev-005", objectVertexId: "ev-001", statement: "王芳参与远航科技董事会审议，疑似为董事会成员，但身份未在公开材料中正式披露。",                  confidence: 0.41, origin: [_prov(6200, "王芳参与了董事会审议")],                                                       status: "SUSPECTED" },
  { id: "cl-003", type: "partnered_with", subjectVertexId: "ev-007", objectVertexId: "ev-001", statement: "星辰数据与远航科技签署战略合作协议，共同开发数据中台产品。",                                       confidence: 0.87, origin: [_prov(3100, "星辰数据与远航科技签署战略合作协议，共同开发数据中台产品")], status: "TRUE" },
];

const _fixtureCommunitiesByResolution = {
  // resolution 1.0 (默认，3 社区)
  default: [
    { id: "c-l0-1", level: 0, parentId: "c-l1-1", memberVertexIds: ["ev-001", "ev-002", "ev-003", "ev-004", "ev-005", "ev-008"], centralVertexIds: ["ev-001", "ev-003", "ev-008"], title: "远航科技及核心团队",   modularity: 0.42 },
    { id: "c-l0-2", level: 0, parentId: "c-l1-1", memberVertexIds: ["ev-006", "ev-007"],                                       centralVertexIds: ["ev-006", "ev-007"],          title: "投资与数据合作网络", modularity: 0.42 },
    { id: "c-l1-1", level: 1,                     memberVertexIds: ["ev-001","ev-002","ev-003","ev-004","ev-005","ev-006","ev-007","ev-008"], centralVertexIds: ["ev-001","ev-006"], title: "金融科技生态系统", modularity: 0.39 },
  ] as Community[],
  // resolution 1.5 (高分辨率，5 社区)
  fine: [
    { id: "c-l0-a", level: 0, parentId: "c-l1-x", memberVertexIds: ["ev-001", "ev-002", "ev-008"], centralVertexIds: ["ev-001"],          title: "远航科技集团",   modularity: 0.51 },
    { id: "c-l0-b", level: 0, parentId: "c-l1-x", memberVertexIds: ["ev-003", "ev-004"],         centralVertexIds: ["ev-003", "ev-004"], title: "远航管理团队",   modularity: 0.51 },
    { id: "c-l0-c", level: 0, parentId: "c-l1-x", memberVertexIds: ["ev-005"],                     centralVertexIds: ["ev-005"],          title: "孤立节点",      modularity: 0.51 },
    { id: "c-l0-d", level: 0, parentId: "c-l1-y", memberVertexIds: ["ev-006"],                     centralVertexIds: ["ev-006"],          title: "鹏程投资",      modularity: 0.51 },
    { id: "c-l0-e", level: 0, parentId: "c-l1-y", memberVertexIds: ["ev-007"],                     centralVertexIds: ["ev-007"],          title: "星辰数据",      modularity: 0.51 },
    { id: "c-l1-x", level: 1,                     memberVertexIds: ["ev-001","ev-002","ev-008","ev-003","ev-004","ev-005"], centralVertexIds: ["ev-001"], title: "远航科技生态", modularity: 0.45 },
    { id: "c-l1-y", level: 1,                     memberVertexIds: ["ev-006","ev-007"],            centralVertexIds: ["ev-006"],          title: "外部合作方",    modularity: 0.45 },
  ] as Community[],
  // resolution 0.5 (低分辨率，1 社区)
  coarse: [
    { id: "c-all", level: 0, memberVertexIds: ["ev-001","ev-002","ev-003","ev-004","ev-005","ev-006","ev-007","ev-008"], centralVertexIds: ["ev-001","ev-006"], title: "金融科技生态整体", modularity: 0.18 },
  ] as Community[],
};

const _fixtureReports: CommunityReport[] = [
  {
    id: "r-c-l0-1", communityId: "c-l0-1", title: "远航科技及核心团队",
    summary: "本社区围绕远航科技及其管理层、自研产品组成。CTO 张伟与 CFO 李明构成技术与财务双线，董事会成员王芳身份存疑。供应链金融平台是该社区的核心产品资产，已于 2024 年正式上线。社区内部职务与组织关系清晰，存在一个待审核的低置信度成员（王芳）。",
    rating: 8.5, ratingExplanation: "社区涵盖一家中等规模科技企业的完整管理与产品视图，对供应链金融行业分析价值较高。",
    findings: [
      { headline: "高层职务结构完整",         explanation: "CTO 张伟与 CFO 李明的任职关系均有原文佐证，置信度 ≥ 0.88。" },
      { headline: "供应链金融平台为旗舰产品",  explanation: "2024 年上线，集成 AR 融资、信用评级与智能风控，是社区估值锚点。" },
      { headline: "王芳董事身份待确认",        explanation: "原文仅提及'参与董事会审议'，未明确职务，需进一步核实。" },
    ],
    generatedAt: "2026-05-12 14:33:00",
  },
  {
    id: "r-c-l0-2", communityId: "c-l0-2", title: "投资与数据合作网络",
    summary: "本社区由鹏程投资和星辰数据组成。鹏程投资作为金融科技领域专业投资方，同时持有远航科技与星辰数据股份，形成跨社区桥梁。星辰数据与远航科技的战略合作进一步加强了两社区的耦合。",
    rating: 6.2, ratingExplanation: "社区规模较小但起到关键桥接作用，对识别交叉持股风险有价值。",
    findings: [
      { headline: "交叉持股现象",         explanation: "鹏程投资持有星辰数据 15% 股份，又向远航科技投资三千万元。" },
      { headline: "战略合作驱动数据协同", explanation: "星辰与远航的合作聚焦数据中台，强化跨企业资产管理能力。" },
    ],
    generatedAt: "2026-05-12 14:33:08",
  },
  {
    id: "r-c-l1-1", communityId: "c-l1-1", title: "金融科技生态系统",
    summary: "顶层社区涵盖远航科技生态及其投资/合作方，构成一个完整的金融科技小生态。生态中心是远航科技，鹏程投资是资本枢纽，星辰数据提供数据能力，三方形成稳定铁三角。社区可作为行业分析的最小完备样本。",
    rating: 9.0, ratingExplanation: "覆盖产品方、资本方、数据方三类角色，结构完整，是供应链金融研究的优质案例。",
    findings: [
      { headline: "完备角色三角",     explanation: "产品（远航）+ 资本（鹏程）+ 数据（星辰）构成最小生态闭环。" },
      { headline: "潜在风险传导路径", explanation: "鹏程任一笔投资异常将通过持股关系影响远航与星辰估值。" },
      { headline: "中央实体集中",     explanation: "远航科技度数最高（5），是社区不可替代节点。" },
    ],
    generatedAt: "2026-05-12 14:33:15",
  },
];

const _fixtureEmbeddings: Record<string, number[]> = {
  "ev-001": [ 0.81,  0.42, -0.13,  0.55, -0.27,  0.62,  0.18, -0.34],
  "ev-002": [ 0.78,  0.45, -0.11,  0.51, -0.30,  0.64,  0.20, -0.32],
  "ev-003": [ 0.34, -0.21,  0.65,  0.18,  0.42, -0.15,  0.51,  0.28],
  "ev-004": [ 0.31, -0.18,  0.62,  0.21,  0.40, -0.12,  0.49,  0.30],
  "ev-005": [ 0.12, -0.08,  0.55,  0.05,  0.38, -0.20,  0.40,  0.25],
  "ev-006": [-0.45,  0.72,  0.18, -0.38,  0.55,  0.12, -0.28,  0.41],
  "ev-007": [-0.32,  0.65,  0.22, -0.42,  0.51,  0.18, -0.25,  0.38],
  "ev-008": [ 0.68,  0.31, -0.20,  0.48, -0.18,  0.55,  0.22, -0.40],
};

const _fixtureExtraction: AiGraphExtraction = {
  id: "ext-fixture-001", graphId: "hugegraph-demo",
  docIds: ["doc-fixture-001"],
  config: {
    schemaMode: "locked", lockedVertexLabels: ["Person", "Company"], lockedEdgeLabels: ["works_at", "invests_in", "produces"],
    domain: "finance", chunkSize: 1024, llmModel: "gpt-4o",
    chunking: { strategy: "token", chunkSize: 1024, overlap: 10 },
    entityTypes: [
      { label: "Person",  description: "自然人，包括高管、董事、员工等", examples: ["张伟", "李明", "王芳"] },
      { label: "Company", description: "公司或组织实体",                examples: ["远航科技", "鹏程投资", "星辰数据"] },
      { label: "Product", description: "公司提供的产品或服务",          examples: ["供应链金融平台"] },
    ],
    gleaningRounds: 2, extractClaims: true,
    claimTypes: [
      { type: "invested_by",    description: "被投资关系" },
      { type: "employed_at",    description: "雇佣或任职关系" },
      { type: "partnered_with", description: "合作或战略协议关系" },
    ],
    embeddingModel: "text-embedding-3-large", parallelism: 4,
  },
  status: "reviewing", progress: 100,
  vertices: _fixtureVertices, edges: _fixtureEdges,
  stats: { vertexCount: 8, edgeCount: 6, avgConfidence: 0.74, schemaCoverage: 0.875, newLabels: ["Product"] },
  createdAt: "2026-05-12 14:30:00", finishedAt: "2026-05-12 14:33:20",
  chunks: _fixtureChunks,
  claims: _fixtureClaims,
  communities: _fixtureCommunitiesByResolution.default,
  reports: _fixtureReports,
  embeddings: _fixtureEmbeddings,
  gleaningRoundsUsed: 2,
  tokenUsage: { prompt: 18450, completion: 4820, estimatedUsd: 0.184 },
  parentExtractionId: "ext-prev-001",
};

const _prevExtraction: AiGraphExtraction = {
  id: "ext-prev-001", graphId: "hugegraph-demo",
  docIds: ["doc-fixture-001"],
  config: _fixtureExtraction.config,
  status: "committed", progress: 100,
  vertices: _fixtureVertices.filter(v => v.id !== "ev-005" && v.id !== "ev-008"), // 缺 王芳 + 供应链金融平台
  edges:    _fixtureEdges.filter(e => e.id !== "ee-003" && e.id !== "ee-006"),    // 缺 王芳→远航, 远航→平台
  stats: { vertexCount: 6, edgeCount: 4, avgConfidence: 0.81, schemaCoverage: 1.0, newLabels: [] },
  createdAt: "2026-05-08 10:15:00", finishedAt: "2026-05-08 10:17:42",
  chunks: _fixtureChunks.filter(c => c.index < 5),
  claims: _fixtureClaims.filter(c => c.id !== "cl-002"),
  communities: _fixtureCommunitiesByResolution.default.map(c => ({
    ...c,
    memberVertexIds: c.memberVertexIds.filter(v => v !== "ev-005" && v !== "ev-008"),
  })),
  reports: _fixtureReports,
  gleaningRoundsUsed: 1,
  tokenUsage: { prompt: 14210, completion: 3640, estimatedUsd: 0.142 },
};

const aiGraphDocsStore: AiGraphDocument[] = [{
  id: "doc-fixture-001", graphId: "hugegraph-demo",
  filename: "supply-chain-report-2025.pdf", mimeType: "application/pdf",
  sizeBytes: 2516582, charCount: 38420,
  textPreview: "2025年供应链白皮书\n\n摘要：本报告分析了远航科技、星辰数据、鹏程投资等企业在供应链金融领域的合作模式。远航科技由张伟担任CTO，李明任CFO...",
  status: "extracted", extractionCount: 1, uploadedAt: "2026-05-10 09:30:00",
}];

const aiGraphExtractionsStore = new Map<string, AiGraphExtraction & { _startedAt: number }>([
  [_fixtureExtraction.id, { ..._fixtureExtraction, _startedAt: 0 }],
  [_prevExtraction.id,    { ..._prevExtraction,    _startedAt: 0 }],
]);

const domainTemplates: DomainTemplate[] = [
  { key: "general",  label: { "zh-CN": "通用",   "en-US": "General"  }, suggestedVertexLabels: ["Entity", "Concept", "Person", "Org"],             suggestedEdgeLabels: ["related_to", "part_of", "works_at"],          fewShotCount: 3 },
  { key: "finance",  label: { "zh-CN": "金融",   "en-US": "Finance"  }, suggestedVertexLabels: ["Person", "Company", "Product", "Fund"],            suggestedEdgeLabels: ["works_at", "invests_in", "produces", "manages"], fewShotCount: 5 },
  { key: "medical",  label: { "zh-CN": "医疗",   "en-US": "Medical"  }, suggestedVertexLabels: ["Disease", "Drug", "Gene", "Protein", "Symptom"],   suggestedEdgeLabels: ["treats", "causes", "inhibits"],               fewShotCount: 4 },
  { key: "legal",    label: { "zh-CN": "法律",   "en-US": "Legal"    }, suggestedVertexLabels: ["Party", "Contract", "Clause", "Case"],             suggestedEdgeLabels: ["party_to", "governs", "references"],          fewShotCount: 4 },
  { key: "academic", label: { "zh-CN": "学术",   "en-US": "Academic" }, suggestedVertexLabels: ["Paper", "Author", "Institution", "Concept"],        suggestedEdgeLabels: ["authored_by", "affiliated_with", "cites"],    fewShotCount: 3 },
];

const llmModels = [
  { key: "gpt-4o",       label: "GPT-4o",          family: "openai"    },
  { key: "gpt-4o-mini",  label: "GPT-4o Mini",     family: "openai"    },
  { key: "claude-sonnet",label: "Claude Sonnet",    family: "anthropic" },
  { key: "claude-haiku", label: "Claude Haiku",     family: "anthropic" },
  { key: "qwen-max",     label: "Qwen Max",         family: "local"     },
];

// AI Graph routes
registerMockRoute("GET",  "/api/knowledge-graph/ai-graph/documents", (_b) => {
  const b = _b as { graphId?: string } | undefined;
  return aiGraphDocsStore.filter(d => d.graphId === (b?.graphId ?? "hugegraph-demo"));
});
registerMockRoute("POST", "/api/knowledge-graph/ai-graph/documents", (_b) => {
  const b = _b as Partial<AiGraphDocument>;
  const doc: AiGraphDocument = {
    id: `doc-${Date.now()}`, graphId: b.graphId ?? "hugegraph-demo",
    filename: b.filename ?? "document.txt", mimeType: b.mimeType ?? "text/plain",
    sizeBytes: b.sizeBytes ?? 0, charCount: b.charCount, textPreview: b.textPreview,
    status: "parsed", extractionCount: 0, uploadedAt: new Date().toISOString(),
  };
  aiGraphDocsStore.push(doc);
  return doc;
});
registerMockRoute("GET",  "/api/knowledge-graph/ai-graph/templates",  () => domainTemplates);
registerMockRoute("GET",  "/api/knowledge-graph/ai-graph/llm-models", () => llmModels);
registerMockRoute("GET",  "/api/knowledge-graph/ai-graph/extractions", (_b) => {
  const b = _b as { graphId?: string } | undefined;
  return [...aiGraphExtractionsStore.values()]
    .filter(e => e.graphId === (b?.graphId ?? "hugegraph-demo"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) as AiGraphExtraction[];
});
registerMockRoute("POST", "/api/knowledge-graph/ai-graph/extractions", (_b) => {
  const b = _b as { graphId: string; docIds: string[]; config: ExtractionConfig };
  const ext = {
    id: `ext-${Date.now()}`, graphId: b.graphId, docIds: b.docIds, config: b.config,
    status: "running" as const, progress: 0, vertices: [], edges: [],
    stats: { vertexCount: 0, edgeCount: 0, avgConfidence: 0, schemaCoverage: 0, newLabels: [] },
    createdAt: new Date().toISOString(), _startedAt: Date.now(),
  };
  aiGraphExtractionsStore.set(ext.id, ext);
  b.docIds.forEach(id => { const d = aiGraphDocsStore.find(x => x.id === id); if (d) d.status = "extracting"; });
  return ext as AiGraphExtraction;
});
// Pattern routes (matched by mock-client wildcard logic)
const PHASE_DURATIONS_MS = {
  running:      800,   // 实体抽取（含 gleanings 合并显示）
  summarizing:  500,   // entity summarization
  embedding:    500,   // 嵌入生成
  clustering:   500,   // 社区聚类
  reporting:    500,   // 社区报告生成
};
const PHASE_ORDER: AiGraphExtractionStatus[] = ["running", "summarizing", "embedding", "clustering", "reporting"];

function _computeExtractionPhase(elapsed: number): { status: AiGraphExtractionStatus; progress: number } {
  let cumulative = 0;
  const total = PHASE_ORDER.reduce((sum, p) => sum + PHASE_DURATIONS_MS[p as keyof typeof PHASE_DURATIONS_MS], 0);
  for (const phase of PHASE_ORDER) {
    const dur = PHASE_DURATIONS_MS[phase as keyof typeof PHASE_DURATIONS_MS];
    if (elapsed < cumulative + dur) {
      const overall = Math.min(Math.floor(((cumulative + (elapsed - cumulative)) / total) * 100), 99);
      return { status: phase, progress: overall };
    }
    cumulative += dur;
  }
  return { status: "reviewing", progress: 100 };
}

registerMockRoute("GET",    "/api/knowledge-graph/ai-graph/extractions/:id", (_b, params) => {
  const stored = aiGraphExtractionsStore.get(params!.id);
  if (!stored) return _fixtureExtraction;
  const inProgress: AiGraphExtractionStatus[] = ["running", "summarizing", "embedding", "clustering", "reporting"];
  if (inProgress.includes(stored.status)) {
    const elapsed = Date.now() - stored._startedAt;
    const phase = _computeExtractionPhase(elapsed);
    if (phase.status !== "reviewing") {
      // partial fixture data depending on phase
      const partial: Partial<AiGraphExtraction> = {};
      if (phase.status === "summarizing" || PHASE_ORDER.indexOf(phase.status) > PHASE_ORDER.indexOf("running")) {
        partial.vertices = _fixtureVertices; partial.edges = _fixtureEdges;
      }
      if (PHASE_ORDER.indexOf(phase.status) > PHASE_ORDER.indexOf("embedding")) partial.embeddings = _fixtureEmbeddings;
      if (PHASE_ORDER.indexOf(phase.status) >= PHASE_ORDER.indexOf("clustering")) partial.communities = _fixtureCommunitiesByResolution.default;
      return { ...stored, ...partial, status: phase.status, progress: phase.progress } as AiGraphExtraction;
    }
    const updated = {
      ...stored,
      vertices: _fixtureVertices, edges: _fixtureEdges,
      chunks: _fixtureChunks, claims: _fixtureClaims,
      communities: _fixtureCommunitiesByResolution.default,
      reports: _fixtureReports, embeddings: _fixtureEmbeddings,
      stats: _fixtureExtraction.stats,
      gleaningRoundsUsed: stored.config.gleaningRounds ?? 0,
      tokenUsage: { prompt: 18450, completion: 4820, estimatedUsd: 0.184 },
      status: "reviewing" as const, progress: 100,
      finishedAt: new Date().toISOString(),
    };
    aiGraphExtractionsStore.set(stored.id, updated);
    stored.docIds.forEach(id => { const d = aiGraphDocsStore.find(x => x.id === id); if (d) { d.status = "extracted"; d.extractionCount += 1; } });
    return updated as AiGraphExtraction;
  }
  return stored as AiGraphExtraction;
});
registerMockRoute("DELETE", "/api/knowledge-graph/ai-graph/documents/:id", (_b, params) => {
  const idx = aiGraphDocsStore.findIndex(d => d.id === params!.id);
  if (idx !== -1) aiGraphDocsStore.splice(idx, 1);
  return { ok: true };
});
// ── v2 GraphRAG routes ───────────────────────────────────────────────────
const _domainEntityTypes: Record<DomainKey, EntityTypeDef[]> = {
  general: [
    { label: "Person",  description: "自然人",       examples: ["张三", "李四"] },
    { label: "Org",     description: "组织或机构",   examples: ["XX 公司", "XX 部门"] },
    { label: "Concept", description: "抽象概念或主题", examples: ["人工智能", "可持续发展"] },
  ],
  finance: [
    { label: "Person",  description: "自然人，包括高管、董事、员工等", examples: ["张伟", "李明"] },
    { label: "Company", description: "公司或组织实体",                examples: ["远航科技", "鹏程投资"] },
    { label: "Product", description: "金融产品或服务",                examples: ["供应链金融平台", "信贷产品 A"] },
    { label: "Fund",    description: "基金或投资工具",                examples: ["XX 一期基金"] },
  ],
  medical: [
    { label: "Disease", description: "疾病或综合征",       examples: ["糖尿病", "高血压"] },
    { label: "Drug",    description: "药物或药品",         examples: ["二甲双胍", "阿司匹林"] },
    { label: "Gene",    description: "基因",               examples: ["BRCA1", "TP53"] },
    { label: "Symptom", description: "症状或临床表现",     examples: ["头痛", "发热"] },
  ],
  legal: [
    { label: "Party",    description: "合同方或诉讼方", examples: ["甲方 ABC 公司", "乙方 XYZ 公司"] },
    { label: "Contract", description: "合同或协议",     examples: ["合作协议 2024-01"] },
    { label: "Clause",   description: "合同条款",       examples: ["保密条款", "违约条款"] },
    { label: "Case",     description: "案件",           examples: ["XX 案"] },
  ],
  academic: [
    { label: "Paper",       description: "学术论文",   examples: ["《关于 X 的研究》"] },
    { label: "Author",      description: "论文作者",   examples: ["张教授"] },
    { label: "Institution", description: "学术机构",   examples: ["XX 大学"] },
    { label: "Concept",     description: "学术概念",   examples: ["注意力机制"] },
  ],
};

const _domainClaimTypes: Record<DomainKey, ClaimTypeDef[]> = {
  general: [
    { type: "related_to", description: "通用关联关系" },
  ],
  finance: [
    { type: "invested_by",    description: "被投资关系" },
    { type: "employed_at",    description: "雇佣或任职关系" },
    { type: "partnered_with", description: "合作或战略协议关系" },
    { type: "acquired",       description: "收购关系" },
  ],
  medical: [
    { type: "treats",   description: "药物治疗疾病的关系" },
    { type: "causes",   description: "致病关系" },
    { type: "inhibits", description: "抑制关系" },
  ],
  legal: [
    { type: "party_to",   description: "合同方关系" },
    { type: "governs",    description: "约束关系" },
    { type: "references", description: "引用关系" },
  ],
  academic: [
    { type: "authored_by",     description: "作者关系" },
    { type: "cites",           description: "引用关系" },
    { type: "affiliated_with", description: "隶属关系" },
  ],
};

const embeddingModels = [
  { key: "text-embedding-3-large", label: "OpenAI text-embedding-3-large", family: "openai",    dimensions: 3072 },
  { key: "text-embedding-3-small", label: "OpenAI text-embedding-3-small", family: "openai",    dimensions: 1536 },
  { key: "bge-large-zh",           label: "BGE Large 中文",                family: "local",     dimensions: 1024 },
  { key: "local-minilm",           label: "MiniLM 本地小模型",            family: "local",     dimensions: 384  },
];

const aiGraphChunksStore = new Map<string, DocumentChunk[]>([
  ["doc-fixture-001", _fixtureChunks],
]);

registerMockRoute("POST",   "/api/knowledge-graph/ai-graph/documents/:id/chunks", (_b, params) => {
  const cfg = _b as { strategy?: ChunkStrategy; chunkSize?: number; overlap?: number };
  const doc = aiGraphDocsStore.find(d => d.id === params!.id);
  if (!doc) return { chunks: [] as DocumentChunk[], strategy: "token" as ChunkStrategy };
  const charCount = doc.charCount ?? 4000;
  const chunkSize = cfg.chunkSize ?? 512;
  const overlap = cfg.overlap ?? 0;
  const stride = Math.max(1, chunkSize - overlap);
  const chunks: DocumentChunk[] = [];
  let idx = 0;
  for (let start = 0; start < charCount; start += stride) {
    const end = Math.min(start + chunkSize, charCount);
    chunks.push({
      id: `chunk-${doc.id}-${idx}`, docId: doc.id, index: idx,
      text: (doc.textPreview ?? "").slice(0, 120) + "…",
      charRange: [start, end], tokenCount: Math.floor((end - start) * 0.45),
      pageNumber: Math.floor(start / 600) + 1,
    });
    idx += 1;
    if (end >= charCount) break;
  }
  aiGraphChunksStore.set(doc.id, chunks);
  doc.chunkCount = chunks.length;
  doc.chunkingStrategy = cfg.strategy ?? "token";
  return { chunks, strategy: cfg.strategy ?? "token", chunkSize, overlap };
});

registerMockRoute("GET",    "/api/knowledge-graph/ai-graph/documents/:id/chunks", (_b, params) => {
  return aiGraphChunksStore.get(params!.id) ?? [];
});

registerMockRoute("GET",    "/api/knowledge-graph/ai-graph/extractions/:id/communities", (_b, params) => {
  const stored = aiGraphExtractionsStore.get(params!.id);
  return stored?.communities ?? _fixtureCommunitiesByResolution.default;
});

registerMockRoute("POST",   "/api/knowledge-graph/ai-graph/extractions/:id/recluster", (_b, params) => {
  const cfg = _b as { resolution?: number };
  const stored = aiGraphExtractionsStore.get(params!.id);
  if (!stored) return _fixtureCommunitiesByResolution.default;
  const r = cfg.resolution ?? 1.0;
  const next = r >= 1.4 ? _fixtureCommunitiesByResolution.fine
            : r <= 0.7 ? _fixtureCommunitiesByResolution.coarse
            :            _fixtureCommunitiesByResolution.default;
  stored.communities = next;
  return next;
});

registerMockRoute("GET",    "/api/knowledge-graph/ai-graph/extractions/:id/reports", (_b, params) => {
  const stored = aiGraphExtractionsStore.get(params!.id);
  return stored?.reports ?? _fixtureReports;
});

registerMockRoute("POST",   "/api/knowledge-graph/ai-graph/extractions/:id/reports/generate", (_b, params) => {
  const stored = aiGraphExtractionsStore.get(params!.id);
  if (stored) stored.reports = _fixtureReports;
  return _fixtureReports;
});

registerMockRoute("PATCH",  "/api/knowledge-graph/ai-graph/extractions/:id/reports/:rid", (_b, params) => {
  const stored = aiGraphExtractionsStore.get(params!.id);
  const patch = _b as Partial<CommunityReport>;
  if (stored?.reports) {
    stored.reports = stored.reports.map(r => r.id === params!.rid ? { ...r, ...patch, generatedAt: new Date().toISOString() } : r);
    return stored.reports.find(r => r.id === params!.rid) ?? null;
  }
  return null;
});

registerMockRoute("GET",    "/api/knowledge-graph/ai-graph/extractions/:id/claims", (_b, params) => {
  const stored = aiGraphExtractionsStore.get(params!.id);
  return stored?.claims ?? _fixtureClaims;
});

registerMockRoute("PATCH",  "/api/knowledge-graph/ai-graph/extractions/:id/claims/:cid", (_b, params) => {
  const stored = aiGraphExtractionsStore.get(params!.id);
  const patch = _b as Partial<ExtractedClaim>;
  if (stored?.claims) {
    stored.claims = stored.claims.map(c => c.id === params!.cid ? { ...c, ...patch } : c);
    return stored.claims.find(c => c.id === params!.cid) ?? null;
  }
  return null;
});

registerMockRoute("POST",   "/api/knowledge-graph/ai-graph/extractions/:id/search", (_b, _params) => {
  const q = _b as { query?: string; mode?: "local" | "global" };
  const mode = q.mode ?? "local";
  if (mode === "local") {
    return {
      mode,
      query: q.query ?? "",
      entities: _fixtureVertices.filter(v => ["ev-001", "ev-006", "ev-003"].includes(v.id)),
      neighbors: { vertices: _fixtureVertices.slice(0, 5), edges: _fixtureEdges.slice(0, 3) },
      chunks: _fixtureChunks.filter(c => [0, 2, 4].includes(c.index)),
    };
  }
  return {
    mode,
    query: q.query ?? "",
    reports: _fixtureReports.map(r => ({
      reportId: r.id, communityTitle: r.title, rating: r.rating,
      snippet: r.summary.slice(0, 120) + "…",
      findings: r.findings.slice(0, 2),
    })),
  };
});

registerMockRoute("GET",    "/api/knowledge-graph/ai-graph/extractions/:id/diff", (body, params) => {
  const b = body as { against?: string };
  const cur = aiGraphExtractionsStore.get(params!.id);
  const prev = aiGraphExtractionsStore.get(b.against ?? "ext-prev-001");
  if (!cur || !prev) return { added: { vertices: [], edges: [] }, removed: { vertices: [], edges: [] }, modified: { vertices: [], edges: [] } };
  const prevVertexIds = new Set(prev.vertices.map(v => v.id));
  const curVertexIds = new Set(cur.vertices.map(v => v.id));
  const prevEdgeIds = new Set(prev.edges.map(e => e.id));
  const curEdgeIds = new Set(cur.edges.map(e => e.id));
  return {
    added: {
      vertices: cur.vertices.filter(v => !prevVertexIds.has(v.id)),
      edges:    cur.edges.filter(e => !prevEdgeIds.has(e.id)),
    },
    removed: {
      vertices: prev.vertices.filter(v => !curVertexIds.has(v.id)),
      edges:    prev.edges.filter(e => !curEdgeIds.has(e.id)),
    },
    modified: { vertices: [], edges: [] },
    prevExtractionId: prev.id, prevFinishedAt: prev.finishedAt,
  };
});

registerMockRoute("GET",    "/api/knowledge-graph/ai-graph/entity-types/suggested", (body) => {
  const b = body as { domain?: DomainKey } | undefined;
  return _domainEntityTypes[b?.domain ?? "general"];
});
registerMockRoute("GET",    "/api/knowledge-graph/ai-graph/claim-types/suggested", (body) => {
  const b = body as { domain?: DomainKey } | undefined;
  return _domainClaimTypes[b?.domain ?? "general"];
});
registerMockRoute("GET",    "/api/knowledge-graph/ai-graph/embedding-models", () => embeddingModels);

registerMockRoute("POST",   "/api/knowledge-graph/ai-graph/extractions/:id/commit", (_b, params) => {
  const b = _b as { vertices?: ExtractedVertex[]; edges?: ExtractedEdge[] };
  const stored = aiGraphExtractionsStore.get(params!.id);
  if (stored) {
    stored.status = "committed";
    if (b.vertices) stored.vertices = b.vertices;
    if (b.edges) stored.edges = b.edges;
    stored.docIds.forEach(id => { const d = aiGraphDocsStore.find(x => x.id === id); if (d) d.status = "committed"; });
  }
  const taskId = `task-ai-graph-commit-${Date.now()}`;
  const importJobId = `job-ai-graph-${Date.now()}`;
  asyncTasks.push({
    id: taskId, graphId: stored?.graphId ?? "hugegraph-demo", type: "ai-graph-commit",
    status: "pending", progress: 0,
    parameters: { extractionId: params!.id, vertexCount: b.vertices?.length ?? 0, edgeCount: b.edges?.length ?? 0 },
    logs: [{ at: new Date().toISOString(), level: "info", message: "AI 图谱入图任务已创建" }],
    createdAt: new Date().toISOString(),
  });
  importJobs.push({
    id: importJobId, graphId: stored?.graphId ?? "hugegraph-demo",
    schemaSelection: { vertexLabels: [...new Set(b.vertices?.map(v => v.label) ?? [])], edgeLabels: [...new Set(b.edges?.map(e => e.label) ?? [])] },
    connector: { kind: "local" }, status: "pending", progress: 0,
  });
  return { taskId, importJobId };
});

export { vertices, edges, vertexLabels, edgeLabels, propertyKeys, indexLabels, graphs, asyncTasks, importJobs, algorithms, perspectives };
