import { useEffect, useState } from "react";

type SqliteStateResponse<T> = {
  item: null | {
    scope: string;
    value: T;
    version: number;
    updatedAt: string;
  };
};

export type SqliteStateMeta = {
  hydrated: boolean;
  error: Error | null;
};

function stateUrl(scope: string) {
  return `/api/sqlite/state?scope=${encodeURIComponent(scope)}`;
}

export async function readSqliteState<T>(scope: string): Promise<T | null> {
  const response = await fetch(stateUrl(scope));
  if (!response.ok) throw new Error(`SQLite state read failed: ${response.status}`);
  const payload = (await response.json()) as SqliteStateResponse<T>;
  return payload.item?.value ?? null;
}

export async function writeSqliteState<T>(scope: string, value: T): Promise<void> {
  const response = await fetch("/api/sqlite/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, value }),
  });
  if (!response.ok) throw new Error(`SQLite state write failed: ${response.status}`);
}

export async function deleteSqliteState(scope: string): Promise<void> {
  const response = await fetch(stateUrl(scope), { method: "DELETE" });
  if (!response.ok) throw new Error(`SQLite state delete failed: ${response.status}`);
}

export function useSqliteState<T>(scope: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>, SqliteStateMeta] {
  const [value, setValue] = useState(initialValue);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    setHydrated(false);
    void readSqliteState<T>(scope)
      .then((stored) => {
        if (!active) return;
        if (stored !== null) setValue(stored);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason : new Error("SQLite state read failed"));
      })
      .finally(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, [scope]);

  useEffect(() => {
    if (!hydrated || error) return;
    void writeSqliteState(scope, value).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason : new Error("SQLite state write failed"));
    });
  }, [error, hydrated, scope, value]);

  return [value, setValue, { hydrated, error }];
}
