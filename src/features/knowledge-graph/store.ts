import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LayoutKind = "force" | "hierarchical" | "circular" | "radial" | "grid" | "dagre";

export interface StyleRule {
  target: "vertex" | "edge";
  binding: "label" | "property" | "degree";
  mapping: Record<string, { color?: string; size?: number; shape?: string }>;
}

export interface QueryRecord {
  id: string;
  graphId: string;
  mode: "gremlin" | "cypher" | "visualBuilder";
  body: string;
  executedAt: string;
  status: "success" | "failed" | "cancelled";
  durationMs: number;
  rowCount?: number;
  errorMessage?: string;
  starred: boolean;
}

export interface MetadataDraft {
  addedPropertyKeys: unknown[];
  addedVertexLabels: unknown[];
  addedEdgeLabels: unknown[];
  addedIndexLabels: unknown[];
  positionChanges: Record<string, { x: number; y: number }>;
  styleChanges: Record<string, unknown>;
  deletions: {
    propertyKeys: string[];
    vertexLabels: string[];
    edgeLabels: string[];
    indexLabels: string[];
  };
}

interface KnowledgeGraphState {
  currentGraphId: string | null;
  activePerspectiveId: string | null;
  selectedNodeId: string | null;
  queryHistory: QueryRecord[];
  metadata: {
    mode: "list" | "graph";
    draft: MetadataDraft | null;
    activeTab: "propertykey" | "vertexlabel" | "edgelabel" | "indexlabel";
  };
  importState: {
    activeConnector: "local" | "database" | "api" | null;
    currentJobId: string | null;
  };
  visualization: {
    rootVertexId: string | null;
    expandedSet: string[];
    layout: LayoutKind;
    layoutSeed: number;
    styleOverrides: StyleRule[];
  };

  setCurrentGraphId: (id: string | null) => void;
  setActivePerspectiveId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  addQueryToHistory: (record: QueryRecord) => void;
  clearQueryHistory: () => void;
  setMetadataMode: (mode: "list" | "graph") => void;
  setMetadataTab: (tab: KnowledgeGraphState["metadata"]["activeTab"]) => void;
  setMetadataDraft: (draft: MetadataDraft | null) => void;
  setImportConnector: (kind: "local" | "database" | "api" | null) => void;
  setCurrentJobId: (id: string | null) => void;
  setVisualizationLayout: (layout: LayoutKind) => void;
  setVisualizationRoot: (id: string | null) => void;
  addExpandedVertex: (id: string) => void;
  resetVisualization: () => void;
}

export const useKnowledgeGraphStore = create<KnowledgeGraphState>()(
  persist(
    (set) => ({
      currentGraphId: null,
      activePerspectiveId: null,
      selectedNodeId: null,
      queryHistory: [],
      metadata: { mode: "list", draft: null, activeTab: "propertykey" },
      importState: { activeConnector: null, currentJobId: null },
      visualization: {
        rootVertexId: null,
        expandedSet: [],
        layout: "force",
        layoutSeed: 42,
        styleOverrides: [],
      },

      setCurrentGraphId: (id) => set({ currentGraphId: id }),
      setActivePerspectiveId: (id) => set({ activePerspectiveId: id }),
      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      addQueryToHistory: (record) =>
        set((s) => ({ queryHistory: [record, ...s.queryHistory].slice(0, 50) })),
      clearQueryHistory: () => set({ queryHistory: [] }),
      setMetadataMode: (mode) =>
        set((s) => ({ metadata: { ...s.metadata, mode } })),
      setMetadataTab: (tab) =>
        set((s) => ({ metadata: { ...s.metadata, activeTab: tab } })),
      setMetadataDraft: (draft) =>
        set((s) => ({ metadata: { ...s.metadata, draft } })),
      setImportConnector: (kind) =>
        set((s) => ({ importState: { ...s.importState, activeConnector: kind } })),
      setCurrentJobId: (id) =>
        set((s) => ({ importState: { ...s.importState, currentJobId: id } })),
      setVisualizationLayout: (layout) =>
        set((s) => ({ visualization: { ...s.visualization, layout } })),
      setVisualizationRoot: (id) =>
        set((s) => ({
          visualization: {
            ...s.visualization,
            rootVertexId: id,
            expandedSet: id ? [id] : [],
          },
        })),
      addExpandedVertex: (id) =>
        set((s) => ({
          visualization: {
            ...s.visualization,
            expandedSet: [...new Set([...s.visualization.expandedSet, id])],
          },
        })),
      resetVisualization: () =>
        set((s) => ({
          visualization: { ...s.visualization, rootVertexId: null, expandedSet: [] },
        })),
    }),
    {
      name: "data-agent.knowledge-graph",
      partialize: (s) => ({
        currentGraphId: s.currentGraphId,
        activePerspectiveId: s.activePerspectiveId,
        metadata: { mode: s.metadata.mode, draft: null, activeTab: s.metadata.activeTab },
        visualization: {
          layout: s.visualization.layout,
          layoutSeed: s.visualization.layoutSeed,
          rootVertexId: s.visualization.rootVertexId,
          expandedSet: s.visualization.expandedSet,
          styleOverrides: s.visualization.styleOverrides,
        },
      }),
    },
  ),
);
