import { useCallback, useEffect } from "react";

import { useSqliteState, type SqliteStateMeta } from "@/lib/sqlite-client";
import type { DevelopmentWorkspaceState } from "./types";

type WorkspaceUpdater<TArtifact> = (
  updater: (current: DevelopmentWorkspaceState<TArtifact>) => DevelopmentWorkspaceState<TArtifact>,
) => void;

function isWorkspaceState<TArtifact>(value: unknown): value is DevelopmentWorkspaceState<TArtifact> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DevelopmentWorkspaceState<TArtifact>>;
  return Array.isArray(candidate.artifacts) && Array.isArray(candidate.runs);
}

export function useDevelopmentWorkspace<TArtifact>(
  scope: string,
  initialState: DevelopmentWorkspaceState<TArtifact>,
): [DevelopmentWorkspaceState<TArtifact>, WorkspaceUpdater<TArtifact>, SqliteStateMeta] {
  const [stored, setStored, meta] = useSqliteState<DevelopmentWorkspaceState<TArtifact> | unknown[]>(scope, initialState);
  const state = isWorkspaceState<TArtifact>(stored) ? stored : initialState;

  useEffect(() => {
    if (meta.hydrated && !isWorkspaceState<TArtifact>(stored)) setStored(initialState);
  }, [initialState, meta.hydrated, setStored, stored]);

  const update = useCallback<WorkspaceUpdater<TArtifact>>((updater) => {
    setStored((current) => updater(isWorkspaceState<TArtifact>(current) ? current : initialState));
  }, [initialState, setStored]);

  return [state, update, meta];
}

export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatNow() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date()).replaceAll("/", "-");
}
