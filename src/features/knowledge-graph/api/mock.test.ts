import { afterEach, describe, expect, it, vi } from "vitest";

import type { MockClient } from "@/lib/mock-client";
import { MemoryStorage } from "@/test/memory-storage";
import type {
  AiGraphDocument,
  AiGraphExtraction,
  AsyncTask,
  DocumentChunk,
  GraphInstance,
  ImportJob,
  PropertyKey,
} from "./mock";

const AI_GRAPH_EXTRACTIONS_STORAGE_KEY = "data-agent.mock.knowledge-graph.ai-graph.extractions";

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

describe("knowledge-graph mock localStorage persistence", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps created graphs available in list and detail after module reload", async () => {
    installStorage();
    let mockClient = await loadMockClient();

    const created = await mockClient.post<GraphInstance>(
      "/api/knowledge-graph/graphs",
      { name: "Local Graph", host: "127.0.0.1", port: 8182 },
      { latencyMs: 0 },
    );

    mockClient = await loadMockClient();
    const list = await mockClient.get<GraphInstance[]>("/api/knowledge-graph/graphs/list", {
      latencyMs: 0,
    });
    const detail = await mockClient.get<GraphInstance>(
      `/api/knowledge-graph/graphs/${created.id}/detail`,
      { latencyMs: 0 },
    );

    expect(list.some((graph) => graph.id === created.id)).toBe(true);
    expect(detail.name).toBe("Local Graph");
  });

  it("persists metadata create, update, and delete operations", async () => {
    installStorage();
    let mockClient = await loadMockClient();

    const created = await mockClient.post<PropertyKey>(
      "/api/knowledge-graph/metadata/propertykeys",
      { name: "localScore", dataType: "DOUBLE", cardinality: "single" },
      { latencyMs: 0 },
    );
    await mockClient.put<PropertyKey>(
      "/api/knowledge-graph/metadata/propertykeys",
      { ...created, cardinality: "list" },
      { latencyMs: 0 },
    );

    mockClient = await loadMockClient();
    let propertyKeys = await mockClient.get<PropertyKey[]>(
      "/api/knowledge-graph/metadata/propertykeys",
      { latencyMs: 0 },
    );

    expect(propertyKeys.find((item) => item.id === created.id)?.cardinality).toBe("list");

    await mockClient.delete(`/api/knowledge-graph/metadata/propertykeys?id=${created.id}`, {
      latencyMs: 0,
    });

    mockClient = await loadMockClient();
    propertyKeys = await mockClient.get<PropertyKey[]>("/api/knowledge-graph/metadata/propertykeys", {
      latencyMs: 0,
    });

    expect(propertyKeys.some((item) => item.id === created.id)).toBe(false);
  });

  it("persists AI Graph document, chunks, extraction review edits, and commit outputs", async () => {
    const localStorage = installStorage();
    let mockClient = await loadMockClient();

    const doc = await mockClient.post<AiGraphDocument>(
      "/api/knowledge-graph/ai-graph/documents",
      {
        graphId: "hugegraph-demo",
        filename: "local.txt",
        mimeType: "text/plain",
        sizeBytes: 1200,
        charCount: 1600,
        textPreview: "Local AI Graph document",
      },
      { latencyMs: 0 },
    );
    const chunkResponse = await mockClient.post<{ chunks: DocumentChunk[] }>(
      `/api/knowledge-graph/ai-graph/documents/${doc.id}/chunks`,
      { strategy: "token", chunkSize: 400, overlap: 40 },
      { latencyMs: 0 },
    );
    const extraction = await mockClient.post<AiGraphExtraction>(
      "/api/knowledge-graph/ai-graph/extractions",
      {
        graphId: "hugegraph-demo",
        docIds: [doc.id],
        config: { schemaMode: "free", domain: "finance", chunkSize: 512, llmModel: "gpt-4o" },
      },
      { latencyMs: 0 },
    );

    const storedExtractions = JSON.parse(
      localStorage.getItem(AI_GRAPH_EXTRACTIONS_STORAGE_KEY) ?? "[]",
    ) as Array<AiGraphExtraction & { _startedAt: number }>;
    localStorage.setItem(
      AI_GRAPH_EXTRACTIONS_STORAGE_KEY,
      JSON.stringify(storedExtractions.map((item) =>
        item.id === extraction.id ? { ...item, _startedAt: 0 } : item,
      )),
    );

    mockClient = await loadMockClient();
    const reviewed = await mockClient.get<AiGraphExtraction>(
      `/api/knowledge-graph/ai-graph/extractions/${extraction.id}`,
      { latencyMs: 0 },
    );
    await mockClient.patch(
      `/api/knowledge-graph/ai-graph/extractions/${reviewed.id}/claims/cl-002`,
      { status: "FALSE" },
      { latencyMs: 0 },
    );
    await mockClient.patch(
      `/api/knowledge-graph/ai-graph/extractions/${reviewed.id}/reports/r-c-l0-1`,
      { rating: 1 },
      { latencyMs: 0 },
    );
    const commit = await mockClient.post<{ taskId: string; importJobId: string }>(
      `/api/knowledge-graph/ai-graph/extractions/${reviewed.id}/commit`,
      { vertices: reviewed.vertices, edges: reviewed.edges },
      { latencyMs: 0 },
    );

    mockClient = await loadMockClient();
    const chunks = await mockClient.get<DocumentChunk[]>(
      `/api/knowledge-graph/ai-graph/documents/${doc.id}/chunks`,
      { latencyMs: 0 },
    );
    const docs = await mockClient.get<AiGraphDocument[]>("/api/knowledge-graph/ai-graph/documents", {
      latencyMs: 0,
    });
    const committed = await mockClient.get<AiGraphExtraction>(
      `/api/knowledge-graph/ai-graph/extractions/${reviewed.id}`,
      { latencyMs: 0 },
    );
    const tasks = await mockClient.get<AsyncTask[]>("/api/knowledge-graph/async-tasks/list", {
      latencyMs: 0,
    });
    const jobs = await mockClient.get<ImportJob[]>("/api/knowledge-graph/import/jobs", {
      latencyMs: 0,
    });

    expect(chunks).toHaveLength(chunkResponse.chunks.length);
    expect(docs.find((item) => item.id === doc.id)?.status).toBe("committed");
    expect(committed.status).toBe("committed");
    expect(committed.claims?.find((claim) => claim.id === "cl-002")?.status).toBe("FALSE");
    expect(committed.reports?.find((report) => report.id === "r-c-l0-1")?.rating).toBe(1);
    expect(tasks.some((task) => task.id === commit.taskId)).toBe(true);
    expect(jobs.some((job) => job.id === commit.importJobId)).toBe(true);
  });
});
