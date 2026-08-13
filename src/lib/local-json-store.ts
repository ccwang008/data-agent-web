import { writeSqliteState } from "./sqlite-client";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function getStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function readLocalJson<T>(key: string, defaultValue: T): T {
  const storage = getStorage();
  if (!storage) return cloneJson(defaultValue);

  const fallback = cloneJson(defaultValue);

  try {
    const raw = storage.getItem(key);
    if (raw === null) {
      storage.setItem(key, JSON.stringify(fallback));
      void writeSqliteState(key, fallback).catch(() => {
        // SQLite is optional during isolated UI rendering; localStorage remains the fallback.
      });
      return cloneJson(fallback);
    }

    const parsed = JSON.parse(raw) as T;
    void writeSqliteState(key, parsed).catch(() => {
      // SQLite is optional during isolated UI rendering; localStorage remains the fallback.
    });
    return parsed;
  } catch {
    try {
      storage.setItem(key, JSON.stringify(fallback));
      void writeSqliteState(key, fallback).catch(() => {
        // SQLite is optional during isolated UI rendering; localStorage remains the fallback.
      });
    } catch {
      // Storage may be full or unavailable; callers still get deterministic data.
    }
    return cloneJson(fallback);
  }
}

export function writeLocalJson<T>(key: string, value: T): T {
  const next = cloneJson(value);
  const storage = getStorage();

  if (storage) {
    storage.setItem(key, JSON.stringify(next));
  }

  void writeSqliteState(key, next).catch(() => {
    // SQLite is optional during isolated UI rendering; localStorage remains the fallback.
  });

  return cloneJson(next);
}

export function updateLocalJson<T>(
  key: string,
  defaultValue: T,
  updater: (current: T) => T,
): T {
  return writeLocalJson(key, updater(readLocalJson(key, defaultValue)));
}
