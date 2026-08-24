import { useCallback, useEffect, useMemo } from "react";

import { useSqliteState, type SqliteStateMeta } from "@/lib/sqlite-client";

import { SCHEMA_VERSION } from "./fixtures";

// 数据治理域通用状态 hook：负责 SQLite 读写、schema 校验与回填。
// 各子域状态以 schemaVersion 标记；结构不匹配时回填默认种子数据。
// scope 统一使用 data-agent.data-governance.* 前缀。

type StateWithSchema = { schemaVersion?: number };

function hasSchema<T extends StateWithSchema>(value: unknown): value is T {
  return !!value && typeof value === "object" &&
    (value as T).schemaVersion === SCHEMA_VERSION;
}

export function useGovernanceState<T extends StateWithSchema>(
  scope: string,
  initialState: T,
): [T, (updater: (current: T) => T) => void, SqliteStateMeta] {
  const [raw, setRaw, meta] = useSqliteState<unknown>(scope, initialState);
  const state = useMemo(() => (hasSchema<T>(raw) ? raw : initialState), [initialState, raw]);

  const update = useCallback(
    (updater: (current: T) => T) => {
      setRaw((currentRaw: unknown) => {
        const current = hasSchema<T>(currentRaw) ? currentRaw : initialState;
        return updater(current);
      });
    },
    [initialState, setRaw],
  );

  useEffect(() => {
    if (!meta.hydrated || hasSchema<T>(raw)) return;
    setRaw(state);
  }, [meta.hydrated, raw, setRaw, state]);

  return [state, update, meta];
}

export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function formatNow() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date()).replaceAll("/", "-");
}

export function nextVersion(current: string): string {
  const match = /v(\d+)/i.exec(current);
  return match ? `v${Number(match[1]) + 1}` : "v1";
}
