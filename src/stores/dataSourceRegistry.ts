import { useSqliteState } from "../lib/sqlite-client";

export const DATA_SOURCE_SCOPE = "data-agent.data-source.sources";

export type DataSourceRecord = {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  owner: string;
  status: string;
  updatedAt: string;
} & Record<string, string>;

export const DEFAULT_DATA_SOURCE_RECORDS: DataSourceRecord[] = [
  {
    id: "source-001",
    name: "核心交易 PostgreSQL",
    type: "数据库",
    endpoint: "10.24.*.*:5432 / core",
    owner: "张敏",
    status: "可用",
    updatedAt: "2026-08-13 09:20",
  },
  {
    id: "source-002",
    name: "客户事件 Kafka",
    type: "消息队列",
    endpoint: "broker-*** / customer-events",
    owner: "李浩",
    status: "检测中",
    updatedAt: "2026-08-13 08:45",
  },
  {
    id: "source-003",
    name: "营销文件交换区",
    type: "文件源",
    endpoint: "s3://marketing-***",
    owner: "王雪",
    status: "异常",
    updatedAt: "2026-08-12 18:10",
  },
];

export function useDataSourceRegistry() {
  const [sources, setSources, meta] = useSqliteState<DataSourceRecord[]>(
    DATA_SOURCE_SCOPE,
    DEFAULT_DATA_SOURCE_RECORDS,
  );

  return { sources, setSources, meta };
}
