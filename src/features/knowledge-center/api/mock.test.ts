import { afterEach, describe, expect, it, vi } from "vitest";

import { MemoryStorage } from "@/test/memory-storage";
import type { MockClient } from "@/lib/mock-client";
import type { VectorRecord, VectorSearchResult } from "./mock";

const VECTOR_RECORDS_STORAGE_KEY = "data-agent.mock.knowledge-center.vector-records";

function installStorage() {
  const localStorage = new MemoryStorage();
  vi.stubGlobal("window", { localStorage });
  return localStorage;
}

async function loadMockClient(): Promise<MockClient> {
  vi.resetModules();
  await import("./mock");
  const { mockClient } = await import("@/lib/mock-client");
  return mockClient;
}

describe("knowledge-center mock localStorage persistence", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps deleted vector records deleted after module reload", async () => {
    installStorage();
    let mockClient = await loadMockClient();
    const records = await mockClient.get<VectorRecord[]>("/api/knowledge-center/vector-records", {
      latencyMs: 0,
    });
    const deletedId = records[0].id;

    await mockClient.post(
      "/api/knowledge-center/vector-records/delete",
      { ids: [deletedId] },
      { latencyMs: 0 },
    );

    mockClient = await loadMockClient();
    const reloaded = await mockClient.get<VectorRecord[]>("/api/knowledge-center/vector-records", {
      latencyMs: 0,
    });

    expect(reloaded.some((record) => record.id === deletedId)).toBe(false);
  });

  it("persists revectorized record status and timestamp", async () => {
    installStorage();
    const mockClient = await loadMockClient();
    const records = await mockClient.get<VectorRecord[]>("/api/knowledge-center/vector-records", {
      latencyMs: 0,
    });
    const failed = records.find((record) => record.status === "failed");

    expect(failed).toBeDefined();

    await mockClient.post(
      "/api/knowledge-center/vector-records/revectorize",
      { ids: [failed!.id] },
      { latencyMs: 0 },
    );

    const persisted = JSON.parse(
      window.localStorage.getItem(VECTOR_RECORDS_STORAGE_KEY) ?? "[]",
    ) as VectorRecord[];
    const updated = persisted.find((record) => record.id === failed!.id);

    expect(updated?.status).toBe("ready");
    expect(updated?.updatedAt).toBe("2026/6/10 10:30:00");
  });

  it("searches against the latest records in localStorage", async () => {
    const localStorage = installStorage();
    const mockClient = await loadMockClient();
    const record: VectorRecord = {
      id: "vec-local-search",
      type: "chunk",
      knowledgeBaseId: "kb-local",
      knowledgeBaseName: "Local KB",
      collection: "kb-local_chunks",
      embeddingModel: "bge-large-zh",
      dimension: 1024,
      status: "ready",
      sourceTitle: "Local Search",
      content: "needle-from-local-storage",
      vectorPreview: [0.1, 0.2],
      metadata: {},
      updatedAt: "2026/6/10 10:30:00",
    };
    localStorage.setItem(VECTOR_RECORDS_STORAGE_KEY, JSON.stringify([record]));

    const results = await mockClient.post<VectorSearchResult[]>(
      "/api/knowledge-center/vector-search",
      { knowledgeBaseId: "kb-local", query: "needle-from-local-storage" },
      { latencyMs: 0 },
    );

    expect(results).toHaveLength(1);
    expect(results[0].record.id).toBe(record.id);
  });
});
