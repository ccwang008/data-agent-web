import type { ExtractedVertex, ExtractedEdge, DocumentChunk } from "@/features/knowledge-graph/api/mock";

export interface LocalSearchResult {
  mode: "local";
  query: string;
  entities: ExtractedVertex[];
  neighbors: { vertices: ExtractedVertex[]; edges: ExtractedEdge[] };
  chunks: DocumentChunk[];
}

export interface GlobalSearchResult {
  mode: "global";
  query: string;
  reports: Array<{
    reportId: string;
    communityTitle: string;
    rating: number;
    snippet: string;
    findings: Array<{ headline: string; explanation: string }>;
  }>;
}

export type SearchResult = LocalSearchResult | GlobalSearchResult;

export function isLocalResult(r: SearchResult): r is LocalSearchResult {
  return r.mode === "local";
}
