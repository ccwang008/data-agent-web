import { useCallback, useEffect, useMemo, useRef } from "react";

import { readSqliteState, useSqliteState } from "@/lib/sqlite-client";

import { createInitialDomainState, SECURITY_SCOPES } from "./catalog";
import {
  hasCurrentDomainSchema,
  migrateLegacyMaskingRecords,
  normalizeDomainState,
} from "./rules";
import type { SecurityDomain, SecurityDomainState } from "./types";

type StateAction = SecurityDomainState | ((current: SecurityDomainState) => SecurityDomainState);

export function useSecurityDomainState(domain: SecurityDomain) {
  const initial = useMemo(() => createInitialDomainState(domain), [domain]);
  const [rawState, setRawState, meta] = useSqliteState<unknown>(SECURITY_SCOPES[domain], initial);
  const state = useMemo(() => normalizeDomainState(rawState, domain), [domain, rawState]);
  const legacyMaskingChecked = useRef(false);

  const setState = useCallback((action: StateAction) => {
    setRawState((currentRaw: unknown) => {
      const current = normalizeDomainState(currentRaw, domain);
      return typeof action === "function" ? action(current) : action;
    });
  }, [domain, setRawState]);

  useEffect(() => {
    if (!meta.hydrated || hasCurrentDomainSchema(rawState, domain)) return;
    setRawState(state);
  }, [domain, meta.hydrated, rawState, setRawState, state]);

  useEffect(() => {
    if (domain !== "protection" || !meta.hydrated || legacyMaskingChecked.current) return;
    legacyMaskingChecked.current = true;

    void readSqliteState<unknown>("data-agent.data-security.masking")
      .then((legacyValue) => {
        const migrated = migrateLegacyMaskingRecords(legacyValue);
        if (!migrated.length) return;

        setState((current) => {
          const masking = current.collections.masking ?? [];
          const existingSources = new Set(masking.map((record) => record.legacySourceId).filter(Boolean));
          const additions = migrated.filter((record) => !existingSources.has(record.legacySourceId));
          if (!additions.length) return current;

          return {
            ...current,
            updatedAt: new Date().toISOString(),
            collections: { ...current.collections, masking: [...additions, ...masking] },
            activity: [
              {
                id: `masking-migration-${Date.now()}`,
                pageKey: "masking",
                action: "复制旧版脱敏策略",
                actor: "系统迁移",
                result: `${additions.length} 条记录转为迁移草稿`,
                occurredAt: new Date().toISOString(),
              },
              ...current.activity,
            ],
          };
        });
      })
      .catch(() => {
        // 旧 scope 不存在或当前服务不可用时，不影响新版保护域使用。
      });
  }, [domain, meta.hydrated, setState]);

  return [state, setState, meta] as const;
}
