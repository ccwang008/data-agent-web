import { useSqliteState } from "@/lib/sqlite-client";

import { MOCK_SOURCES, MOCK_SYNC_TASKS, MOCK_EXCHANGES } from "./api/mock";
import type { DataSource, SyncTask, ExchangeItem } from "./api/types";

export function useSources() {
  return useSqliteState<DataSource[]>("data-agent.data-source.sources", MOCK_SOURCES);
}
export function useSyncTasks() {
  return useSqliteState<SyncTask[]>("data-agent.data-source.sync", MOCK_SYNC_TASKS);
}
export function useExchanges() {
  return useSqliteState<ExchangeItem[]>("data-agent.data-source.exchange", MOCK_EXCHANGES);
}
