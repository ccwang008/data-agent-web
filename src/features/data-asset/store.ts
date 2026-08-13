import { useCallback, useEffect, useMemo } from "react";

import { useSqliteState, type SqliteStateMeta } from "@/lib/sqlite-client";
import { createDefaultState } from "./api/default-state";
import type { DataAssetState } from "./api/types";

const STATE_SCOPE = "data-agent.data-asset";

export type DataAssetStateUpdater = (updater: (state: DataAssetState) => DataAssetState) => void;

export interface DataAssetStore {
  state: DataAssetState;
  update: DataAssetStateUpdater;
  meta: SqliteStateMeta;
}

function migrateState(raw: DataAssetState): DataAssetState {
  const def = createDefaultState();
  const result: DataAssetState = JSON.parse(JSON.stringify(raw)) as DataAssetState;
  if (!result.catalog.domains || result.catalog.domains.length === 0) {
    const names = new Set(def.catalog.domains.map((d) => d.name));
    result.catalog.domains = [
      ...def.catalog.domains,
      ...Array.from(new Set(result.catalog.assets.map((a) => a.businessDomain)))
        .filter((n) => !names.has(n))
        .map((name, i) => ({ id: `domain-${name}`, name, parentId: null, order: 10 + i })),
    ];
  }
  return result;
}

/**
 * data-asset 唯一状态入口：通过 `useSqliteState` 持久化到
 * `data-agent.data-asset` scope。路由同一时刻仅挂载一个页面，
 * 不存在并发写冲突；跨域联动（发布门槛、权属失效暂停、估值预警）在同一状态对象内直接读取。
 */
export function useDataAssetState(): DataAssetStore {
  const [rawState, setState, meta] = useSqliteState<DataAssetState>(STATE_SCOPE, createDefaultState());
  const state = useMemo(() => migrateState(rawState), [rawState]);

  useEffect(() => {
    if (meta.hydrated && rawState.catalog && (!rawState.catalog.domains || rawState.catalog.domains.length === 0)) {
      setState((current) => migrateState(current));
    }
  }, [meta.hydrated, rawState, setState]);

  const update = useCallback<DataAssetStateUpdater>(
    (updater) => {
      setState((current) => updater(JSON.parse(JSON.stringify(current)) as DataAssetState));
    },
    [setState],
  );

  return useMemo(() => ({ state, update, meta }), [state, update, meta]);
}
