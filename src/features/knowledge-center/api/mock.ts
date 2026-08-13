import { registerMockRoute } from "@/lib/mock-client";
import { cloneJson, readLocalJson, writeLocalJson } from "@/lib/local-json-store";

import { buildKnowledgeCenterReport, type ReportRange } from "./report-data";

export type VectorRecordType = "chunk" | "entity" | "relation";
export type VectorRecordStatus = "ready" | "vectorizing" | "failed" | "deleted";

export interface VectorRecord {
  id: string;
  type: VectorRecordType;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  collection: string;
  embeddingModel: string;
  dimension: number;
  status: VectorRecordStatus;
  sourceTitle: string;
  content: string;
  vectorPreview: number[];
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export interface VectorSearchRequest {
  knowledgeBaseId: string;
  query: string;
  type?: VectorRecordType;
  collection?: string;
  embeddingModel?: string;
}

export interface VectorSearchResult {
  record: VectorRecord;
  score: number;
}

export interface VectorOperationResult {
  ok: boolean;
  affected: number;
}

export interface VectorIndexTask {
  id: string;
  status: "running" | "success";
  scope: {
    knowledgeBaseId: string;
    type: VectorRecordType;
    collection?: string;
  };
  startedAt: string;
}

export type RecallRetrievalMethod = "vector" | "keyword" | "graph" | "hybrid";

export interface RecallTestRequest {
  query: string;
  datasetId: string;
  knowledgeBaseIds: string[];
  method: RecallRetrievalMethod;
}

export interface RecallTestResult {
  id: string;
  rank: number;
  score: number;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  sourceTitle: string;
  content: string;
  recordType: VectorRecordType;
  hitReason: string;
}

export interface RecallTraceStep {
  id: string;
  order: number;
  name: string;
  status: "success";
  durationMs: number;
  input: string;
  output: string;
  metric: string;
}

export interface RecallHistoryItem {
  id: string;
  testedAt: string;
  query: string;
  datasetId: string;
  datasetName: string;
  knowledgeBaseIds: string[];
  knowledgeBaseCount: number;
  method: RecallRetrievalMethod;
  methodLabel: string;
  hitCount: number;
  results: RecallTestResult[];
  steps: RecallTraceStep[];
}

export interface RecallTestResponse {
  results: RecallTestResult[];
  steps: RecallTraceStep[];
  historyItem: RecallHistoryItem;
}

const now = "2026/6/10 10:30:00";
const VECTOR_RECORDS_STORAGE_KEY = "data-agent.mock.knowledge-center.vector-records";

const defaultVectorRecords: VectorRecord[] = [
  {
    id: "vec-chunk-pg-001",
    type: "chunk",
    knowledgeBaseId: "kb-test",
    knowledgeBaseName: "知识库test",
    collection: "kb-test_chunks",
    embeddingModel: "bge-large-zh",
    dimension: 1024,
    status: "ready",
    sourceTitle: "PostgreSQL从入门到精通.pdf · #1",
    content: "PostgreSQL 是一个功能强大的开源对象关系型数据库系统，它使用和扩展了 SQL 语言。",
    vectorPreview: [0.0214, -0.1142, 0.0831, 0.0034, -0.0479, 0.1568],
    metadata: { documentId: "doc-postgresql", chunkIndex: 1, pageNumber: 1, tokenCount: 35 },
    updatedAt: "2026/6/5 15:36:11",
  },
  {
    id: "vec-chunk-pg-002",
    type: "chunk",
    knowledgeBaseId: "kb-test",
    knowledgeBaseName: "知识库test",
    collection: "kb-test_chunks",
    embeddingModel: "bge-large-zh",
    dimension: 1024,
    status: "ready",
    sourceTitle: "PostgreSQL从入门到精通.pdf · #2",
    content: "PostgreSQL 支持复杂查询、外键、触发器、视图、事务完整性、MVCC 等特性。",
    vectorPreview: [0.0431, -0.0712, 0.1013, -0.0224, 0.0139, 0.0917],
    metadata: { documentId: "doc-postgresql", chunkIndex: 2, pageNumber: 1, tokenCount: 42 },
    updatedAt: "2026/6/5 15:36:14",
  },
  {
    id: "vec-chunk-pg-003",
    type: "chunk",
    knowledgeBaseId: "kb-test",
    knowledgeBaseName: "知识库test",
    collection: "kb-test_chunks",
    embeddingModel: "bge-large-zh",
    dimension: 1024,
    status: "ready",
    sourceTitle: "PostgreSQL从入门到精通.pdf · #3",
    content: "安装 PostgreSQL 可以通过系统包管理器或官方安装程序完成，初始化数据库集群后即可启动服务。",
    vectorPreview: [0.0146, -0.0648, 0.0752, 0.0381, -0.0193, 0.1045],
    metadata: { documentId: "doc-postgresql", chunkIndex: 3, pageNumber: 2, tokenCount: 32 },
    updatedAt: "2026/6/5 15:36:18",
  },
  {
    id: "vec-chunk-pg-004",
    type: "chunk",
    knowledgeBaseId: "kb-test",
    knowledgeBaseName: "知识库test",
    collection: "kb-test_chunks",
    embeddingModel: "bge-large-zh",
    dimension: 1024,
    status: "ready",
    sourceTitle: "PostgreSQL从入门到精通.pdf · #4",
    content: "创建数据库可以使用 createdb 命令，也可以在 psql 中执行 CREATE DATABASE 语句。",
    vectorPreview: [0.0583, -0.0392, 0.0228, 0.0714, -0.0835, 0.0496],
    metadata: { documentId: "doc-postgresql", chunkIndex: 4, pageNumber: 2, tokenCount: 38 },
    updatedAt: "2026/6/5 15:36:21",
  },
  {
    id: "vec-chunk-pg-005",
    type: "chunk",
    knowledgeBaseId: "kb-test",
    knowledgeBaseName: "知识库test",
    collection: "kb-test_chunks",
    embeddingModel: "bge-large-zh",
    dimension: 1024,
    status: "ready",
    sourceTitle: "PostgreSQL从入门到精通.pdf · #5",
    content: "PostgreSQL 支持 B-tree、Hash、GiST、GIN 等多种索引类型，合理建索引可以提升查询性能。",
    vectorPreview: [-0.0261, 0.0885, 0.0317, -0.0458, 0.0642, 0.0119],
    metadata: { documentId: "doc-postgresql", chunkIndex: 5, pageNumber: 3, tokenCount: 36 },
    updatedAt: "2026/6/5 15:36:24",
  },
  {
    id: "vec-chunk-pg-006",
    type: "chunk",
    knowledgeBaseId: "kb-test",
    knowledgeBaseName: "知识库test",
    collection: "kb-test_chunks",
    embeddingModel: "bge-large-zh",
    dimension: 1024,
    status: "ready",
    sourceTitle: "PostgreSQL从入门到精通.pdf · #6",
    content: "事务是数据库操作的基本单位，PostgreSQL 通过 ACID 特性确保数据一致性和完整性。",
    vectorPreview: [0.0372, -0.0128, 0.0951, -0.0683, 0.0245, 0.0529],
    metadata: { documentId: "doc-postgresql", chunkIndex: 6, pageNumber: 3, tokenCount: 30 },
    updatedAt: "2026/6/5 15:36:27",
  },
  {
    id: "vec-chunk-k8s-001",
    type: "chunk",
    knowledgeBaseId: "kb-0605",
    knowledgeBaseName: "0605_知识库",
    collection: "kb-0605_chunks",
    embeddingModel: "text-embedding-3-small",
    dimension: 1536,
    status: "failed",
    sourceTitle: "Kubernetes指南.pdf · #12",
    content: "Kubernetes 通过声明式 API 管理容器编排，并将调度、服务发现和弹性伸缩抽象为平台能力。",
    vectorPreview: [-0.0114, 0.0921, 0.0532, -0.0815, 0.0042, 0.0776],
    metadata: { documentId: "doc-kubernetes", chunkIndex: 12, pageNumber: 8, error: "embedding timeout" },
    updatedAt: "2026/6/5 15:12:20",
  },
  {
    id: "vec-chunk-k8s-002",
    type: "chunk",
    knowledgeBaseId: "kb-0605",
    knowledgeBaseName: "0605_知识库",
    collection: "kb-0605_chunks",
    embeddingModel: "text-embedding-3-small",
    dimension: 1536,
    status: "ready",
    sourceTitle: "Kubernetes指南.pdf · #13",
    content: "Pod 是 Kubernetes 中最小的调度单元，通常包含一个或多个共享网络和存储的容器。",
    vectorPreview: [0.0272, 0.0641, -0.0186, 0.0824, -0.0417, 0.0933],
    metadata: { documentId: "doc-kubernetes", chunkIndex: 13, pageNumber: 9, tokenCount: 44 },
    updatedAt: "2026/6/5 15:13:01",
  },
  {
    id: "vec-chunk-k8s-003",
    type: "chunk",
    knowledgeBaseId: "kb-0605",
    knowledgeBaseName: "0605_知识库",
    collection: "kb-0605_chunks",
    embeddingModel: "text-embedding-3-small",
    dimension: 1536,
    status: "ready",
    sourceTitle: "Kubernetes指南.pdf · #14",
    content: "Deployment 负责声明式管理副本数量和滚动更新策略，用于保持工作负载处于期望状态。",
    vectorPreview: [-0.0528, 0.0387, 0.0694, -0.0141, 0.1018, -0.0062],
    metadata: { documentId: "doc-kubernetes", chunkIndex: 14, pageNumber: 10, tokenCount: 51 },
    updatedAt: "2026/6/5 15:13:36",
  },
  {
    id: "vec-chunk-k8s-004",
    type: "chunk",
    knowledgeBaseId: "kb-0605",
    knowledgeBaseName: "0605_知识库",
    collection: "kb-0605_chunks",
    embeddingModel: "text-embedding-3-small",
    dimension: 1536,
    status: "ready",
    sourceTitle: "Kubernetes指南.pdf · #15",
    content: "Service 为一组 Pod 提供稳定访问入口，并通过标签选择器完成后端实例发现。",
    vectorPreview: [0.0729, -0.0215, -0.0354, 0.0498, 0.0876, -0.0291],
    metadata: { documentId: "doc-kubernetes", chunkIndex: 15, pageNumber: 11, tokenCount: 39 },
    updatedAt: "2026/6/5 15:14:02",
  },
  {
    id: "vec-entity-postgresql",
    type: "entity",
    knowledgeBaseId: "kb-test",
    knowledgeBaseName: "知识库test",
    collection: "kb-test_entities",
    embeddingModel: "bge-large-zh",
    dimension: 1024,
    status: "ready",
    sourceTitle: "实体 · PostgreSQL",
    content: "PostgreSQL，开源对象关系型数据库系统，支持 SQL 扩展、事务、索引与多语言接口。",
    vectorPreview: [0.0862, -0.0341, 0.0027, 0.1194, -0.0613, 0.0428],
    metadata: { entityId: "ent-postgresql", label: "Technology", aliases: ["Postgres"], confidence: 0.94 },
    updatedAt: "2026/6/5 15:37:03",
  },
  {
    id: "vec-entity-mvcc",
    type: "entity",
    knowledgeBaseId: "kb-test",
    knowledgeBaseName: "知识库test",
    collection: "kb-test_entities",
    embeddingModel: "bge-large-zh",
    dimension: 1024,
    status: "ready",
    sourceTitle: "实体 · MVCC",
    content: "MVCC，多版本并发控制，用于提升数据库事务并发能力并保持一致性。",
    vectorPreview: [-0.0182, 0.1264, 0.0543, -0.0447, 0.0216, 0.0684],
    metadata: { entityId: "ent-mvcc", label: "Concept", confidence: 0.89 },
    updatedAt: "2026/6/5 15:37:10",
  },
  {
    id: "vec-entity-kubernetes",
    type: "entity",
    knowledgeBaseId: "kb-0605",
    knowledgeBaseName: "0605_知识库",
    collection: "kb-0605_entities",
    embeddingModel: "text-embedding-3-small",
    dimension: 1536,
    status: "ready",
    sourceTitle: "实体 · Kubernetes",
    content: "Kubernetes，容器编排平台，用于自动化部署、扩缩容和管理容器化应用。",
    vectorPreview: [0.0327, 0.0419, -0.0942, 0.1185, -0.0251, 0.0734],
    metadata: { entityId: "ent-kubernetes", label: "Platform", aliases: ["K8s"], confidence: 0.96 },
    updatedAt: "2026/6/5 15:16:42",
  },
  {
    id: "vec-relation-pg-supports-mvcc",
    type: "relation",
    knowledgeBaseId: "kb-test",
    knowledgeBaseName: "知识库test",
    collection: "kb-test_relations",
    embeddingModel: "bge-large-zh",
    dimension: 1024,
    status: "ready",
    sourceTitle: "关系 · PostgreSQL supports MVCC",
    content: "PostgreSQL 支持 MVCC，用于保障事务并发和数据一致性。",
    vectorPreview: [0.0661, -0.0823, 0.0452, 0.0278, -0.0094, 0.1317],
    metadata: {
      relationId: "rel-pg-mvcc",
      label: "supports",
      sourceEntity: "PostgreSQL",
      targetEntity: "MVCC",
      confidence: 0.91,
    },
    updatedAt: "2026/6/5 15:38:22",
  },
  {
    id: "vec-relation-k8s-manages-container",
    type: "relation",
    knowledgeBaseId: "kb-0605",
    knowledgeBaseName: "0605_知识库",
    collection: "kb-0605_relations",
    embeddingModel: "text-embedding-3-small",
    dimension: 1536,
    status: "ready",
    sourceTitle: "关系 · Kubernetes manages container workloads",
    content: "Kubernetes 管理容器化工作负载，并提供服务发现、调度和弹性伸缩能力。",
    vectorPreview: [0.0184, 0.1153, -0.0381, 0.0638, -0.0719, 0.0246],
    metadata: {
      relationId: "rel-k8s-container",
      label: "manages",
      sourceEntity: "Kubernetes",
      targetEntity: "Container Workload",
      confidence: 0.88,
    },
    updatedAt: "2026/6/5 15:18:02",
  },
  {
    id: "vec-chunk-anniversary-001",
    type: "chunk",
    knowledgeBaseId: "kb-anniversary",
    knowledgeBaseName: "统计周年鉴",
    collection: "kb-anniversary_chunks",
    embeddingModel: "local-minilm",
    dimension: 384,
    status: "ready",
    sourceTitle: "统计周年鉴.pdf · #4",
    content: "本节汇总年度人口、产业结构和地区生产总值指标，用于宏观趋势分析。",
    vectorPreview: [-0.0321, 0.0514, 0.0098, -0.0762, 0.1125, 0.0194],
    metadata: { documentId: "doc-anniversary", chunkIndex: 4, pageNumber: 3, tokenCount: 48 },
    updatedAt: "2026/6/4 16:08:31",
  },
  {
    id: "vec-chunk-anniversary-002",
    type: "chunk",
    knowledgeBaseId: "kb-anniversary",
    knowledgeBaseName: "统计周年鉴",
    collection: "kb-anniversary_chunks",
    embeddingModel: "local-minilm",
    dimension: 384,
    status: "ready",
    sourceTitle: "统计周年鉴.pdf · #5",
    content: "人口指标包括常住人口、城镇化率和年龄结构，可用于观察区域发展阶段。",
    vectorPreview: [0.0442, -0.0581, 0.0216, 0.0839, -0.0374, 0.0665],
    metadata: { documentId: "doc-anniversary", chunkIndex: 5, pageNumber: 4, tokenCount: 42 },
    updatedAt: "2026/6/4 16:08:48",
  },
  {
    id: "vec-chunk-anniversary-003",
    type: "chunk",
    knowledgeBaseId: "kb-anniversary",
    knowledgeBaseName: "统计周年鉴",
    collection: "kb-anniversary_chunks",
    embeddingModel: "local-minilm",
    dimension: 384,
    status: "ready",
    sourceTitle: "统计周年鉴.pdf · #6",
    content: "产业结构章节比较第一、第二、第三产业增加值占比，并跟踪服务业占比变化。",
    vectorPreview: [-0.0734, 0.0198, 0.0586, -0.0247, 0.0913, 0.0362],
    metadata: { documentId: "doc-anniversary", chunkIndex: 6, pageNumber: 5, tokenCount: 46 },
    updatedAt: "2026/6/4 16:08:55",
  },
  {
    id: "vec-entity-gdp",
    type: "entity",
    knowledgeBaseId: "kb-anniversary",
    knowledgeBaseName: "统计周年鉴",
    collection: "kb-anniversary_entities",
    embeddingModel: "local-minilm",
    dimension: 384,
    status: "ready",
    sourceTitle: "实体 · 地区生产总值",
    content: "地区生产总值，衡量区域经济活动总量的核心统计指标。",
    vectorPreview: [0.0954, -0.0127, 0.0465, 0.0304, -0.1051, 0.0088],
    metadata: { entityId: "ent-gdp", label: "Indicator", confidence: 0.86 },
    updatedAt: "2026/6/4 16:09:02",
  },
];

function readVectorRecords() {
  return readLocalJson(VECTOR_RECORDS_STORAGE_KEY, defaultVectorRecords);
}

function writeVectorRecords(records: VectorRecord[]) {
  return writeLocalJson(VECTOR_RECORDS_STORAGE_KEY, records);
}

function cloneRecords() {
  return cloneJson(readVectorRecords());
}

function scoreRecord(record: VectorRecord, query: string) {
  const q = query.trim().toLowerCase();
  const haystack = `${record.content} ${record.sourceTitle} ${JSON.stringify(record.metadata)}`.toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  const hits = terms.filter((term) => haystack.includes(term)).length;
  const base = hits / Math.max(terms.length, 1);
  const deterministicNoise = (record.id.length % 13) / 100;

  return Math.min(0.98, Math.max(0.42, 0.56 + base * 0.34 + deterministicNoise));
}

const RECALL_DATASET_LABELS: Record<string, string> = {
  technical: "技术文档问答集",
  cloud: "云原生运维问答集",
  statistics: "统计指标问答集",
  custom: "自定义临时问题",
};

const RECALL_METHOD_LABELS: Record<RecallRetrievalMethod, string> = {
  vector: "向量检索",
  keyword: "关键字检索",
  graph: "图谱检索",
  hybrid: "混合检索",
};

const RECALL_PIPELINES: Record<RecallRetrievalMethod, string[]> = {
  vector: [
    "Query",
    "Query 向量化",
    "向量相似度计算",
    "检索 Chunks",
    "Rerank TopK",
    "Send LLM",
    "Response",
  ],
  keyword: [
    "Query",
    "Query 清洗与分词",
    "关键词扩展",
    "倒排索引 / BM25 匹配",
    "检索 Chunks",
    "Rerank TopK",
    "Send LLM",
    "Response",
  ],
  graph: [
    "Query",
    "实体识别与意图识别",
    "实体链接到图谱节点",
    "图谱邻域 / 路径扩展",
    "图谱证据片段召回",
    "Rerank TopK",
    "Send LLM",
    "Response",
  ],
  hybrid: [
    "Query",
    "Query 分析与检索路由",
    "并行执行 Query 向量化、关键词分词、实体识别",
    "向量相似度计算、BM25 匹配、图谱扩展",
    "多路结果合并去重",
    "检索 Chunks / 证据聚合",
    "Rerank TopK",
    "Send LLM",
    "Response",
  ],
};

function tokenizeQuery(query: string) {
  return Array.from(new Set(query.trim().toLowerCase().split(/[\s,，。？?、/]+/).filter(Boolean)));
}

function getMethodBoost(method: RecallRetrievalMethod, record: VectorRecord) {
  if (method === "keyword") return record.type === "chunk" ? 0.035 : -0.025;
  if (method === "graph") return record.type === "entity" || record.type === "relation" ? 0.06 : -0.015;
  if (method === "hybrid") return record.type === "chunk" ? 0.035 : 0.025;
  return record.type === "chunk" ? 0.025 : 0;
}

function getHitReason(method: RecallRetrievalMethod, record: VectorRecord, query: string) {
  const terms = tokenizeQuery(query);
  const haystack = `${record.content} ${record.sourceTitle}`.toLowerCase();
  const matched = terms.filter((term) => haystack.includes(term)).slice(0, 3);
  const matchedText = matched.length > 0 ? `命中 ${matched.join("、")}` : "语义相似片段";

  if (method === "keyword") return `${matchedText}, 关键词匹配得分靠前`;
  if (method === "graph") return record.type === "chunk" ? "图谱证据关联到原文片段" : "实体/关系节点与问题意图相关";
  if (method === "hybrid") return `${matchedText}, 向量、关键词与图谱信号融合排序`;
  return `${matchedText}, 向量相似度靠前`;
}

function buildRecallResults(payload: RecallTestRequest): RecallTestResult[] {
  const selectedKnowledgeBases = new Set(payload.knowledgeBaseIds);
  const records = cloneRecords()
    .filter((record) => record.status === "ready")
    .filter((record) => selectedKnowledgeBases.has(record.knowledgeBaseId))
    .filter((record) => {
      if (payload.method === "graph") return record.type !== "chunk" || record.knowledgeBaseId === "kb-anniversary";
      return true;
    });

  return records
    .map((record) => ({
      record,
      score: Math.min(0.99, scoreRecord(record, payload.query) + getMethodBoost(payload.method, record)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ record, score }, index) => ({
      id: `${payload.method}-${record.id}`,
      rank: index + 1,
      score,
      knowledgeBaseId: record.knowledgeBaseId,
      knowledgeBaseName: record.knowledgeBaseName,
      sourceTitle: record.sourceTitle,
      content: record.content,
      recordType: record.type,
      hitReason: getHitReason(payload.method, record, payload.query),
    }));
}

function getStepOutput(step: string, payload: RecallTestRequest, results: RecallTestResult[], candidateCount: number) {
  const terms = tokenizeQuery(payload.query);

  if (step === "Query") return `收到问题: ${payload.query}`;
  if (step.includes("向量化")) return "生成 1024/1536 维 query embedding";
  if (step.includes("相似度")) return `完成 ${candidateCount} 条候选向量相似度计算`;
  if (step.includes("清洗与分词")) return `提取 ${Math.max(terms.length, 1)} 个检索词`;
  if (step.includes("关键词扩展")) return "补充同义词、英文缩写和领域词";
  if (step.includes("BM25")) return `完成 ${candidateCount} 条倒排候选匹配`;
  if (step.includes("实体识别")) return "识别技术实体、指标实体和问题意图";
  if (step.includes("实体链接")) return "链接到候选实体节点和关系边";
  if (step.includes("图谱邻域")) return "完成 1-hop 邻域和路径证据扩展";
  if (step.includes("图谱证据")) return `召回 ${results.filter((item) => item.recordType !== "chunk").length} 条实体/关系证据`;
  if (step.includes("检索 Chunks")) return `召回 ${results.length} 条候选片段`;
  if (step.includes("合并去重")) return `合并多路结果并去重为 ${results.length} 条`;
  if (step.includes("证据聚合")) return `聚合 ${results.length} 条 chunk/entity/relation 证据`;
  if (step.includes("Rerank")) return `保留 Top ${Math.min(results.length, 5)} 进入上下文`;
  if (step.includes("Send LLM")) return "已构造上下文 prompt, mock 跳过真实模型调用";
  if (step === "Response") return "生成 mock response 并返回召回证据";
  if (step.includes("检索路由")) return `${RECALL_METHOD_LABELS[payload.method]} 路由到多路召回`;
  if (step.includes("并行执行")) return "并行完成向量、关键词、图谱三类查询准备";

  return "步骤完成";
}

function getStepMetric(step: string, results: RecallTestResult[], candidateCount: number, index: number) {
  if (step === "Query") return "1 query";
  if (step.includes("检索") || step.includes("召回") || step.includes("证据")) return `${results.length} hits`;
  if (step.includes("相似度") || step.includes("BM25") || step.includes("图谱")) return `${candidateCount} candidates`;
  if (step.includes("Rerank")) return `top ${Math.min(results.length, 5)}`;
  if (step.includes("LLM") || step === "Response") return "mock";
  return `${index + 1}/${results.length || 1}`;
}

function buildRecallTrace(payload: RecallTestRequest, results: RecallTestResult[]): RecallTraceStep[] {
  const selectedKnowledgeBases = new Set(payload.knowledgeBaseIds);
  const candidateCount = cloneRecords()
    .filter((record) => record.status === "ready")
    .filter((record) => selectedKnowledgeBases.has(record.knowledgeBaseId)).length;
  const inputScope = `${payload.knowledgeBaseIds.length} 个知识库 · ${RECALL_DATASET_LABELS[payload.datasetId] ?? payload.datasetId}`;

  return RECALL_PIPELINES[payload.method].map((step, index) => ({
    id: `${payload.method}-${index + 1}`,
    order: index + 1,
    name: step,
    status: "success",
    durationMs: 24 + index * 17 + payload.method.length * 3,
    input: index === 0 ? payload.query : inputScope,
    output: getStepOutput(step, payload, results, candidateCount),
    metric: getStepMetric(step, results, candidateCount, index),
  }));
}

registerMockRoute("GET", "/api/knowledge-center/vector-records", () => cloneRecords());

registerMockRoute("GET", "/api/knowledge-center/reports", (_body, params) => {
  return buildKnowledgeCenterReport({
    knowledgeBaseId: params?.knowledgeBaseId || "all",
    range: (params?.range as ReportRange | undefined) || "7d",
  });
});

registerMockRoute("POST", "/api/knowledge-center/vector-records/delete", (body) => {
  const ids = new Set(((body as { ids?: string[] })?.ids ?? []));
  const vectorRecords = readVectorRecords();
  const before = vectorRecords.length;
  const next = writeVectorRecords(vectorRecords.filter((record) => !ids.has(record.id)));

  return { ok: true, affected: before - next.length } satisfies VectorOperationResult;
});

registerMockRoute("POST", "/api/knowledge-center/vector-records/revectorize", (body) => {
  const ids = new Set(((body as { ids?: string[] })?.ids ?? []));
  let affected = 0;

  writeVectorRecords(readVectorRecords().map((record) => {
    if (!ids.has(record.id)) return record;
    affected += 1;
    return { ...record, status: "ready", updatedAt: now };
  }));

  return { ok: true, affected } satisfies VectorOperationResult;
});

registerMockRoute("POST", "/api/knowledge-center/vector-indexes/rebuild", (body) => {
  const payload = body as VectorIndexTask["scope"];

  return {
    id: `idx-task-${Date.now()}`,
    status: "running",
    scope: payload,
    startedAt: now,
  } satisfies VectorIndexTask;
});

registerMockRoute("POST", "/api/knowledge-center/vector-search", (body) => {
  const payload = body as VectorSearchRequest;
  const query = payload.query.trim();
  if (!query) return [] satisfies VectorSearchResult[];

  return cloneRecords()
    .filter((record) => record.status !== "deleted")
    .filter((record) => record.knowledgeBaseId === payload.knowledgeBaseId)
    .filter((record) => !payload.type || record.type === payload.type)
    .filter((record) => !payload.collection || record.collection === payload.collection)
    .filter((record) => !payload.embeddingModel || record.embeddingModel === payload.embeddingModel)
    .map((record) => ({ record, score: scoreRecord(record, query) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) satisfies VectorSearchResult[];
});

registerMockRoute("POST", "/api/knowledge-center/recall-test", (body) => {
  const payload = body as RecallTestRequest;
  const normalizedPayload: RecallTestRequest = {
    query: payload.query.trim(),
    datasetId: payload.datasetId || "technical",
    knowledgeBaseIds: payload.knowledgeBaseIds ?? [],
    method: payload.method || "hybrid",
  };
  const results = normalizedPayload.query ? buildRecallResults(normalizedPayload) : [];
  const steps = buildRecallTrace(normalizedPayload, results);
  const historyItem: RecallHistoryItem = {
    id: `recall-${Date.now()}`,
    testedAt: now,
    query: normalizedPayload.query,
    datasetId: normalizedPayload.datasetId,
    datasetName: RECALL_DATASET_LABELS[normalizedPayload.datasetId] ?? normalizedPayload.datasetId,
    knowledgeBaseIds: normalizedPayload.knowledgeBaseIds,
    knowledgeBaseCount: normalizedPayload.knowledgeBaseIds.length,
    method: normalizedPayload.method,
    methodLabel: RECALL_METHOD_LABELS[normalizedPayload.method],
    hitCount: results.length,
    results,
    steps,
  };

  return { results, steps, historyItem } satisfies RecallTestResponse;
});
