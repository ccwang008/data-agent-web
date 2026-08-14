/**
 * Data Integration · 数据源 / 同步任务 / 共享交换 类型定义。
 */

// ------------------------- 数据源 -------------------------

export type SourceCategory = "database" | "file" | "local-file" | "message" | "api" | "object-store";

export const SOURCE_CATEGORY_LABEL: Record<SourceCategory, string> = {
  database: "数据库",
  file: "文件源",
  "local-file": "本地文件",
  message: "消息队列",
  api: "API 网关",
  "object-store": "对象存储",
};

export type SourceSubtype =
  | "postgresql" | "mysql" | "oracle" | "sqlserver" | "dameng"
  | "csv" | "excel" | "json" | "parquet" | "sftp"
  | "local-csv" | "local-excel" | "local-json" | "local-parquet"
  | "kafka" | "rocketmq" | "pulsar"
  | "rest" | "grpc" | "soap"
  | "s3" | "minio" | "oss";

export const SOURCE_SUBTYPE_LABEL: Record<SourceSubtype, string> = {
  postgresql: "PostgreSQL", mysql: "MySQL", oracle: "Oracle",
  sqlserver: "SQL Server", dameng: "达梦",
  csv: "CSV", excel: "Excel", json: "JSON", parquet: "Parquet", sftp: "SFTP",
  "local-csv": "本地 CSV", "local-excel": "本地 Excel", "local-json": "本地 JSON", "local-parquet": "本地 Parquet",
  kafka: "Kafka", rocketmq: "RocketMQ", pulsar: "Pulsar",
  rest: "RESTful API", grpc: "gRPC", soap: "SOAP",
  s3: "AWS S3", minio: "MinIO", oss: "阿里云 OSS",
};

export type SourceStatus = "available" | "testing" | "abnormal" | "degraded" | "offline";

export const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = {
  available: "可用", testing: "测试中", abnormal: "异常",
  degraded: "性能降级", offline: "离线",
};

export interface SourceConfig {
  host?: string;
  port?: number;
  database?: string;
  schema?: string;
  bucket?: string;
  path?: string;
  topic?: string;
  group?: string;
  baseUrl?: string;
  authType?: "none" | "basic" | "bearer" | "kerberos" | "aksk";
  ssl?: boolean;
  [key: string]: unknown;
}

export interface DataSource {
  id: string;
  name: string;
  category: SourceCategory;
  subtype: SourceSubtype;
  status: SourceStatus;
  endpoint: string;
  owner: string;
  config: SourceConfig;
  lastTestAt: string;
  latencyMs?: number;
  tableCount?: number;
  description?: string;
  tags?: string[];
  updatedAt: string;
}

// ------------------------- 同步任务 -------------------------

export type SyncMode = "full" | "incremental" | "cdc" | "realtime";
export type SyncStatus = "draft" | "running" | "success" | "failed" | "paused" | "queued";

export const SYNC_MODE_LABEL: Record<SyncMode, string> = {
  full: "全量", incremental: "增量", cdc: "CDC", realtime: "实时",
};
export const SYNC_STATUS_LABEL: Record<SyncStatus, string> = {
  draft: "草稿", running: "运行中", success: "成功",
  failed: "失败", paused: "已暂停", queued: "排队中",
};

export interface SyncRunLog {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: SyncStatus;
  recordsRead: number;
  recordsWritten: number;
  durationSec: number;
  errorMessage?: string;
  operator: string;
}

export interface SyncTask {
  id: string;
  name: string;
  mode: SyncMode;
  sourceId: string;
  sourceName: string;
  targetType: "hive" | "doris" | "hbase" | "kafka" | "mysql";
  targetName: string;
  targetTable: string;
  schedule: string;
  owner: string;
  status: SyncStatus;
  progress: number;
  lastRunAt?: string;
  nextRunAt?: string;
  throughput: number;
  recordsTotal: number;
  recordsSynced: number;
  latencyMin: number;
  retryCount: number;
  logs: SyncRunLog[];
  columns?: Array<{ name: string; type: string; mappedTo?: string }>;
  updatedAt: string;
}

// ------------------------- 共享交换 -------------------------

export type ExchangeChannel = "api" | "file" | "table" | "message";
export type ExchangeStatus = "draft" | "submitted" | "approved" | "published" | "rejected" | "suspended";

export const EXCHANGE_CHANNEL_LABEL: Record<ExchangeChannel, string> = {
  api: "API", file: "文件", table: "库表", message: "消息",
};
export const EXCHANGE_STATUS_LABEL: Record<ExchangeStatus, string> = {
  draft: "草稿", submitted: "审批中", approved: "已审批",
  published: "已发布", rejected: "已驳回", suspended: "已暂停",
};

export type ExchangeFrequency = "realtime" | "hourly" | "daily" | "weekly" | "monthly" | "manual";

export interface ExchangeAuditLog {
  id: string;
  time: string;
  consumer: string;
  action: "调用" | "下载" | "推送" | "查询";
  result: "成功" | "失败";
  records: number;
  latencyMs: number;
}

export interface ExchangeItem {
  id: string;
  name: string;
  channel: ExchangeChannel;
  consumerDept: string;
  consumerContact: string;
  sourceSystem: string;
  sourceTable?: string;
  frequency: ExchangeFrequency;
  sla: string;
  dataFormat?: string;
  encryption?: string;
  owner: string;
  status: ExchangeStatus;
  publishedAt?: string;
  rejectReason?: string;
  auditLogs: ExchangeAuditLog[];
  updatedAt: string;
}
