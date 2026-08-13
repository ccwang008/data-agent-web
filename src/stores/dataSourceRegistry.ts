/**
 * Legacy compatibility layer.
 * 新数据源数据由 `src/features/data-source/store.ts` 的 `useSources()` 管理。
 * 本文件将其转换为 data-asset 模块原先依赖的 DataSourceRecord 形状，保持向后兼容。
 * 新代码请直接使用 `src/features/data-source/store.ts`。
 */

import { useSources as _useSources } from "../features/data-source/store";

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

export const DEFAULT_DATA_SOURCE_RECORDS: DataSourceRecord[] = [];

export function useDataSourceRegistry() {
  const [sources, , meta] = _useSources();
  const records: DataSourceRecord[] = sources.map((s) => ({
    id: s.id,
    name: s.name,
    type: `${s.category}/${s.subtype}`,
    endpoint: s.endpoint,
    owner: s.owner,
    status: s.status,
    updatedAt: s.updatedAt,
    ...(s.tags ? { tags: s.tags.join(",") } : {}),
  }));
  return { sources: records, setSources: () => undefined, meta };
}
