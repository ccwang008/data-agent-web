import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.resolve("data/platform.sqlite");

mkdirSync(path.dirname(databasePath), { recursive: true });

export const database = new DatabaseSync(databasePath);

database.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS app_state (
    scope TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_app_events_scope_created
    ON app_events(scope, created_at DESC);
`);

const selectState = database.prepare("SELECT scope, value_json, version, updated_at FROM app_state WHERE scope = ?");
const selectAllStates = database.prepare("SELECT scope, version, updated_at FROM app_state ORDER BY scope");
const upsertState = database.prepare(`
  INSERT INTO app_state(scope, value_json, version, updated_at)
  VALUES (?, ?, 1, ?)
  ON CONFLICT(scope) DO UPDATE SET
    value_json = excluded.value_json,
    version = app_state.version + 1,
    updated_at = excluded.updated_at
`);
const deleteState = database.prepare("DELETE FROM app_state WHERE scope = ?");
const insertEvent = database.prepare(
  "INSERT INTO app_events(scope, operation, payload_json, created_at) VALUES (?, ?, ?, ?)",
);

const now = () => new Date().toISOString();

export function getState(scope) {
  const row = selectState.get(scope);
  if (!row) return null;

  return {
    scope: row.scope,
    value: JSON.parse(row.value_json),
    version: row.version,
    updatedAt: row.updated_at,
  };
}

export function listStates() {
  return selectAllStates.all();
}

export function setState(scope, value, operation = "upsert") {
  const serialized = JSON.stringify(value);
  const updatedAt = now();
  upsertState.run(scope, serialized, updatedAt);
  insertEvent.run(scope, operation, serialized, updatedAt);
  return getState(scope);
}

export function removeState(scope) {
  const removed = deleteState.run(scope);
  const removedAt = now();
  insertEvent.run(scope, "delete", JSON.stringify({ removed: Number(removed.changes) > 0 }), removedAt);
  return Number(removed.changes) > 0;
}

export function getDatabaseInfo() {
  return {
    databasePath,
    stateCount: Number(database.prepare("SELECT COUNT(*) AS count FROM app_state").get().count),
    eventCount: Number(database.prepare("SELECT COUNT(*) AS count FROM app_events").get().count),
  };
}
