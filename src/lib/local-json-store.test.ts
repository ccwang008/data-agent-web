import { afterEach, describe, expect, it, vi } from "vitest";

import { readLocalJson, updateLocalJson, writeLocalJson } from "./local-json-store";
import { MemoryStorage } from "@/test/memory-storage";

function installStorage() {
  const localStorage = new MemoryStorage();
  vi.stubGlobal("window", { localStorage });
  return localStorage;
}

describe("local-json-store", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("seeds localStorage from the default value on first read", () => {
    const localStorage = installStorage();
    const value = readLocalJson("test.seed", [{ id: "a" }]);

    expect(value).toEqual([{ id: "a" }]);
    expect(JSON.parse(localStorage.getItem("test.seed") ?? "null")).toEqual([{ id: "a" }]);
  });

  it("returns persisted values after writes and updates", () => {
    installStorage();

    writeLocalJson("test.update", { count: 1 });
    const next = updateLocalJson("test.update", { count: 0 }, (current) => ({
      count: current.count + 1,
    }));

    expect(next).toEqual({ count: 2 });
    expect(readLocalJson("test.update", { count: 0 })).toEqual({ count: 2 });
  });

  it("recovers from corrupted JSON by restoring defaults", () => {
    const localStorage = installStorage();
    localStorage.setItem("test.corrupt", "{nope");

    const value = readLocalJson("test.corrupt", { ok: true });

    expect(value).toEqual({ ok: true });
    expect(JSON.parse(localStorage.getItem("test.corrupt") ?? "null")).toEqual({ ok: true });
  });

  it("falls back safely when window is unavailable", () => {
    expect(readLocalJson("test.ssr", { ok: true })).toEqual({ ok: true });
  });
});
