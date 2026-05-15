import type { ExtractionConfig } from "@/features/knowledge-graph/api/mock";

export const DEFAULT_CONFIG: ExtractionConfig = {
  schemaMode: "free",
  lockedVertexLabels: [],
  lockedEdgeLabels: [],
  domain: "general",
  chunkSize: 1024,
  llmModel: "gpt-4o",
  chunking: { strategy: "token", chunkSize: 1024, overlap: 10 },
  entityTypes: [],
  gleaningRounds: 1,
  extractClaims: false,
  claimTypes: [],
  embeddingModel: "text-embedding-3-large",
  parallelism: 4,
};
