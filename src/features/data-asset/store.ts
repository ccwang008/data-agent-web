import { useCallback, useEffect, useMemo } from "react";

import { useSqliteState, type SqliteStateMeta } from "@/lib/sqlite-client";
import { createDefaultState, DATA_ASSET_SCHEMA_VERSION } from "./api/default-state";
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
  result.catalog = result.catalog ?? def.catalog;
  const domainIds = new Set((result.catalog.domains ?? []).map((domain) => domain.id));
  result.catalog.domains = [
    ...(result.catalog.domains ?? []),
    ...def.catalog.domains.filter((domain) => !domainIds.has(domain.id)),
  ];
  const knownNames = new Set(result.catalog.domains.map((domain) => domain.name));
  result.catalog.domains.push(
    ...Array.from(new Set((result.catalog.assets ?? []).map((asset) => asset.businessDomain)))
      .filter((name) => !knownNames.has(name))
      .map((name, index) => ({ id: `domain-${name}`, name, parentId: null, order: 20 + index })),
  );
  const assetIds = new Set((result.catalog.assets ?? []).map((asset) => asset.id));
  result.catalog.assets = [
    ...(result.catalog.assets ?? []),
    ...def.catalog.assets.filter((asset) => asset.type === "standard" && !assetIds.has(asset.id)),
  ];
  const versionIds = new Set((result.catalog.assetVersions ?? []).map((version) => version.id));
  result.catalog.assetVersions = [
    ...(result.catalog.assetVersions ?? []),
    ...def.catalog.assetVersions.filter((version) => version.assetId.startsWith("asset-standard-") && !versionIds.has(version.id)),
  ];
  result.circulation = result.circulation ?? def.circulation;
  result.schemaVersion = DATA_ASSET_SCHEMA_VERSION;
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
    if (meta.hydrated && rawState.schemaVersion !== DATA_ASSET_SCHEMA_VERSION) {
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
