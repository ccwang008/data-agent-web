import { DEFAULT_BASES } from "../pages/knowledge-base-data";

export type ReportRange = "today" | "7d" | "30d";

export interface ReportMetric {
  id: string;
  label: string;
  value: string;
  detail?: string;
  trend?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}

export interface HotDocument {
  id: string;
  title: string;
  knowledgeBaseName: string;
  hitRate: number;
  referenceRate: number;
}

export interface HotChunk {
  id: string;
  content: string;
  sourceTitle: string;
  knowledgeBaseName: string;
  hitRate: number;
  referenceRate: number;
}

export interface GrowthTrendPoint {
  label: string;
  documents: number;
  chunks: number;
  entities: number;
  relations: number;
}

export interface RankedTextItem {
  id: string;
  text: string;
  count: number;
  detail: string;
}

export interface FunnelStep {
  id: "queries" | "hits" | "references";
  label: string;
  value: number;
  rate: number;
}

export interface FunnelAnalysis {
  steps: FunnelStep[];
}

export interface KnowledgeCenterReportResponse {
  updatedAt: string;
  overview: {
    coreKpis: ReportMetric[];
    growthTrend: GrowthTrendPoint[];
  };
  health: {
    document: { title: string; metrics: ReportMetric[] };
    chunk: { title: string; metrics: ReportMetric[] };
    vector: { title: string; metrics: ReportMetric[] };
    graph: { title: string; metrics: ReportMetric[] };
  };
  operations: {
    funnel: FunnelAnalysis;
    hotDocuments: HotDocument[];
    hotChunks: HotChunk[];
  };
}

interface ReportRequest {
  knowledgeBaseId: string;
  range: ReportRange;
}

const SIZE_BY_BASE_MB: Record<string, number> = {
  "kb-test": 30.1,
  "kb-0605": 86.4,
  "kb-anniversary": 42.7,
  "kb-test-260604": 18.9,
  "kb-sx-0604": 63.5,
};

const HOT_DOCUMENTS: HotDocument[] = [
  {
    id: "doc-postgresql",
    title: "PostgreSQL从入门到精通.pdf",
    knowledgeBaseName: "知识库test",
    hitRate: 67.8,
    referenceRate: 31.4,
  },
  {
    id: "doc-kubernetes",
    title: "Kubernetes指南.pdf",
    knowledgeBaseName: "0605_知识库",
    hitRate: 63.1,
    referenceRate: 28.9,
  },
  {
    id: "doc-yearbook-population",
    title: "统计周年鉴-人口指标.xlsx",
    knowledgeBaseName: "统计周年鉴",
    hitRate: 59.6,
    referenceRate: 24.2,
  },
  {
    id: "doc-cloud-native",
    title: "云原生运维手册.docx",
    knowledgeBaseName: "sx_0604_知识库",
    hitRate: 52.7,
    referenceRate: 21.6,
  },
  {
    id: "doc-process",
    title: "平台操作流程.md",
    knowledgeBaseName: "test_260604",
    hitRate: 48.5,
    referenceRate: 18.3,
  },
];

const HOT_CHUNKS: HotChunk[] = [
  {
    id: "chunk-postgresql-index",
    content: "PostgreSQL 支持 B-tree、Hash、GiST、GIN 等多种索引类型，合理建索引可以提升查询性能。",
    sourceTitle: "PostgreSQL从入门到精通.pdf · #5",
    knowledgeBaseName: "知识库test",
    hitRate: 71.2,
    referenceRate: 35.6,
  },
  {
    id: "chunk-k8s-service",
    content: "Service 为一组 Pod 提供稳定访问入口，并通过标签选择器完成后端实例发现。",
    sourceTitle: "Kubernetes指南.pdf · #15",
    knowledgeBaseName: "0605_知识库",
    hitRate: 66.4,
    referenceRate: 32.8,
  },
  {
    id: "chunk-postgresql-transaction",
    content: "事务是数据库操作的基本单位，PostgreSQL 通过 ACID 特性确保数据一致性和完整性。",
    sourceTitle: "PostgreSQL从入门到精通.pdf · #6",
    knowledgeBaseName: "知识库test",
    hitRate: 61.8,
    referenceRate: 27.9,
  },
  {
    id: "chunk-k8s-pod",
    content: "Pod 是 Kubernetes 中最小的调度单元，通常包含一个或多个共享网络和存储的容器。",
    sourceTitle: "Kubernetes指南.pdf · #13",
    knowledgeBaseName: "0605_知识库",
    hitRate: 58.3,
    referenceRate: 26.4,
  },
  {
    id: "chunk-yearbook-population",
    content: "人口统计指标按年度、区域和年龄结构汇总，用于观察区域人口变化趋势。",
    sourceTitle: "统计周年鉴-人口指标.xlsx · #2",
    knowledgeBaseName: "统计周年鉴",
    hitRate: 54.9,
    referenceRate: 22.7,
  },
];

export function buildKnowledgeCenterReport(request: ReportRequest): KnowledgeCenterReportResponse {
  const range = normalizeRange(request.range);
  const bases = request.knowledgeBaseId === "all"
    ? DEFAULT_BASES
    : DEFAULT_BASES.filter((base) => base.id === request.knowledgeBaseId);

  const activeBases = bases.filter((base) => base.status === "active");
  const totalDocuments = sumBy(bases, (base) => base.documents);
  const totalChunks = sumBy(bases, (base) => base.chunks);
  const storageMb = sumBy(bases, (base) => SIZE_BY_BASE_MB[base.id] ?? 0);
  const entityCount = Math.max(12, Math.round(totalChunks * 0.42));
  const relationCount = Math.max(8, Math.round(totalChunks * 0.28));
  const questionCount = getRangeFactor(range) * Math.max(42, activeBases.length * 76);
  const averageHitRate = Math.min(94.8, 72 + activeBases.length * 2.4 + getRangeFactor(range) * 0.9);
  const latestUpdate = bases.map((base) => base.updatedAt).sort().at(-1) ?? "暂无";

  return {
    updatedAt: "2026/6/17 10:30:00",
    overview: {
      coreKpis: [
        metric("storage", "知识库总存储量", formatStorage(storageMb), `${bases.length} 个知识库`),
        metric("latestUpdate", "最近更新时间", latestUpdate, "文档、向量或图谱最近变更时间"),
        metric("documents", "文档数", formatNumber(totalDocuments), "已纳入统计范围的文档"),
        metric("chunks", "Chunk数", formatNumber(totalChunks), "已解析切片总数"),
        metric("entities", "实体数", formatNumber(entityCount), "知识图谱实体节点"),
        metric("relations", "关系数", formatNumber(relationCount), "知识图谱关系边"),
        metric("questions", "问答次数", formatNumber(questionCount), getRangeLabel(range)),
        metric("hitRate", "文档平均命中率", `${averageHitRate.toFixed(1)}%`, "被问答召回的平均比例", "+2.8%"),
      ],
      growthTrend: buildGrowthTrend(range, activeBases.length),
    },
    health: {
      document: {
        title: "文档质量",
        metrics: [
          metric("docTotal", "文档总数", formatNumber(totalDocuments), "当前统计范围"),
          metric("docAverageSize", "文档大小（平均）", `${(storageMb / Math.max(totalDocuments, 1)).toFixed(1)} MB`, "总存储量 / 文档数"),
          metric("docTypeDistribution", "文档类型分布", "PDF 42% / DOCX 28% / XLSX 18%", "其余为 MD、HTML、TXT"),
          metric("docCategoryDistribution", "文档分类分布", "技术 46% / 产品 29% / 制度 25%", "按文档分类树统计"),
          metric("parseSuccessRate", "解析成功率", "96.8%", "成功解析文档 / 全部文档", "+1.4%", "success"),
          metric("docAvailabilityRate", "文档可用率", "91.5%", "启用、可检索且可引用文档占比", "-0.7%", "warning"),
          metric("graphBuildRate", "图谱构建率", "87.2%", "已完成实体和关系抽取的文档占比", "+2.1%", "success"),
        ],
      },
      chunk: {
        title: "Chunk质量",
        metrics: [
          metric("chunkTotal", "Chunk总数", formatNumber(totalChunks), "当前统计范围"),
          metric("chunkAverageLength", "平均Chunk长度", "486 tokens", "目标区间 400-700 tokens"),
          metric("chunkDuplicateRate", "Chunk重复率", "3.6%", "文本相似度高于阈值"),
          metric("chunkAverageHitRate", "平均命中率", "28.4%", "被问答召回比例"),
          metric("chunkAverageCitationRate", "平均引用率", "19.7%", "被答案引用比例"),
        ],
      },
      vector: {
        title: "向量质量",
        metrics: [
          metric("vectorTotal", "向量数", formatNumber(totalChunks + entityCount + relationCount), "Chunk、实体、关系向量"),
          metric("vectorDuplicateRate", "向量重复率", "2.1%", "余弦相似度 > 99.5%"),
          metric("entityVectors", "实体向量数", formatNumber(entityCount), "实体节点向量"),
          metric("relationVectors", "关系向量数", formatNumber(relationCount), "关系边向量"),
        ],
      },
      graph: {
        title: "图谱质量",
        metrics: [
          metric("entityTotal", "实体数", formatNumber(entityCount), "图谱实体节点"),
          metric("relationTotal", "关系数", formatNumber(relationCount), "图谱关系边"),
          metric("entityTypeTotal", "实体类型数", "12", "Technology、Concept、Metric 等"),
          metric("relationTypeTotal", "关系类型数", "9", "USES、SUPPORTS、RELATED_TO 等"),
          metric("communityTotal", "社区数", "7", "基于图聚类估算"),
          metric("entityDuplicateRate", "实体重复率", "4.8%", "别名与相似实体重复"),
          metric("isolatedEntityRate", "孤立实体率", "6.2%", "无关系连接实体占比", "-1.1%", "warning"),
          metric("largestComponentRatio", "最大连通图占比", "83.9%", "最大连通子图节点占比"),
        ],
      },
    },
    operations: {
      funnel: buildFunnel(range, activeBases.length),
      hotDocuments: filterHotDocuments(request.knowledgeBaseId).slice(0, 5),
      hotChunks: filterHotChunks(request.knowledgeBaseId).slice(0, 5),
    },
  };
}

function normalizeRange(range: ReportRange): ReportRange {
  if (range === "today" || range === "7d" || range === "30d") return range;
  return "7d";
}

function getRangeFactor(range: ReportRange) {
  if (range === "today") return 1;
  if (range === "30d") return 8;
  return 3;
}

function getRangeLabel(range: ReportRange) {
  if (range === "today") return "今日问答";
  if (range === "30d") return "近30天问答";
  return "近7天问答";
}

function buildGrowthTrend(range: ReportRange, baseCount: number): GrowthTrendPoint[] {
  const labels = getRangeLabels(range);

  return labels.map((label, index) => {
    const seed = Math.max(1, baseCount) * (index + 1);
    return {
      label,
      documents: Math.max(1, Math.round(seed * 0.8 + index)),
      chunks: Math.max(6, seed * 8 + index * 5),
      entities: Math.max(3, seed * 4 + index * 3),
      relations: Math.max(2, seed * 3 + index * 2),
    };
  });
}

function buildFunnel(range: ReportRange, baseCount: number): FunnelAnalysis {
  const scope = Math.max(1, baseCount);
  const queries = getRangeFactor(range) * scope * 96;
  const hits = Math.round(queries * 0.74);
  const references = Math.round(hits * 0.46);

  return {
    steps: [
      { id: "queries", label: "查询次数", value: queries, rate: 100 },
      { id: "hits", label: "命中次数", value: hits, rate: getRate(hits, queries) },
      { id: "references", label: "引用次数", value: references, rate: getRate(references, hits) },
    ],
  };
}

function getRate(value: number, base: number) {
  if (base <= 0) return 0;
  return Number(((value / base) * 100).toFixed(1));
}

function getRangeLabels(range: ReportRange) {
  if (range === "today") return ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"];
  if (range === "30d") return ["05/19", "05/24", "05/29", "06/03", "06/08", "06/13", "06/17"];
  return ["06/11", "06/12", "06/13", "06/14", "06/15", "06/16", "06/17"];
}

function filterHotDocuments(knowledgeBaseId: string) {
  if (knowledgeBaseId === "all") return HOT_DOCUMENTS;

  const base = DEFAULT_BASES.find((item) => item.id === knowledgeBaseId);
  if (!base) return [];

  const matched = HOT_DOCUMENTS.filter((item) => item.knowledgeBaseName === base.name);
  return matched.length > 0 ? matched : HOT_DOCUMENTS.slice(0, 1).map((item) => ({ ...item, knowledgeBaseName: base.name }));
}

function filterHotChunks(knowledgeBaseId: string) {
  if (knowledgeBaseId === "all") return HOT_CHUNKS;

  const base = DEFAULT_BASES.find((item) => item.id === knowledgeBaseId);
  if (!base) return [];

  const matched = HOT_CHUNKS.filter((item) => item.knowledgeBaseName === base.name);
  return matched.length > 0 ? matched : HOT_CHUNKS.slice(0, 1).map((item) => ({ ...item, knowledgeBaseName: base.name }));
}

function metric(
  id: string,
  label: string,
  value: string,
  detail?: string,
  trend?: string,
  tone: ReportMetric["tone"] = "neutral",
): ReportMetric {
  return { id, label, value, detail, trend, tone };
}

function sumBy<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((total, item) => total + pick(item), 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatStorage(value: number) {
  if (value >= 1024) return `${(value / 1024).toFixed(2)} GB`;
  return `${value.toFixed(1)} MB`;
}
