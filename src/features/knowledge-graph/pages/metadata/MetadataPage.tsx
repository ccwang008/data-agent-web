import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Boxes,
  Copy,
  GitBranch,
  Grip,
  Layers3,
  List,
  MousePointer2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import { useKnowledgeGraphStore, type MetadataDraft } from "../../store";
import type { EdgeLabel, IndexLabel, PropertyKey, VertexLabel } from "../../api/mock";

type Tab = "propertykey" | "vertexlabel" | "edgelabel" | "indexlabel";
type Mode = "list" | "graph";
type FormKind = Tab;
type EditingResource =
  | { kind: "propertykey"; value?: PropertyKey }
  | { kind: "vertexlabel"; value?: VertexLabel }
  | { kind: "edgelabel"; value?: EdgeLabel }
  | { kind: "indexlabel"; value?: IndexLabel }
  | null;

const DATA_TYPES: PropertyKey["dataType"][] = [
  "TEXT",
  "INT",
  "LONG",
  "FLOAT",
  "DOUBLE",
  "BOOLEAN",
  "DATE",
  "UUID",
  "BLOB",
];

const INDEX_TYPES: IndexLabel["indexType"][] = [
  "secondary",
  "range",
  "search",
  "shard",
  "unique",
];

const EMPTY_DRAFT: MetadataDraft = {
  addedPropertyKeys: [],
  addedVertexLabels: [],
  addedEdgeLabels: [],
  addedIndexLabels: [],
  positionChanges: {},
  styleChanges: {},
  deletions: {
    propertyKeys: [],
    vertexLabels: [],
    edgeLabels: [],
    indexLabels: [],
  },
};

export function MetadataPage() {
  const { t } = useTranslation("knowledge-graph");
  const mode = useKnowledgeGraphStore((s) => s.metadata.mode);
  const setMode = useKnowledgeGraphStore((s) => s.setMetadataMode);
  const activeTab = useKnowledgeGraphStore((s) => s.metadata.activeTab);
  const setTab = useKnowledgeGraphStore((s) => s.setMetadataTab);
  const draft = useKnowledgeGraphStore((s) => s.metadata.draft);
  const setDraft = useKnowledgeGraphStore((s) => s.setMetadataDraft);

  const [vertexLabels, setVertexLabels] = useState<VertexLabel[]>([]);
  const [edgeLabels, setEdgeLabels] = useState<EdgeLabel[]>([]);
  const [propertyKeys, setPropertyKeys] = useState<PropertyKey[]>([]);
  const [indexLabels, setIndexLabels] = useState<IndexLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditingResource>(null);

  useEffect(() => {
    setLoading(true);
    void Promise.all([
      mockClient.get<VertexLabel[]>("/api/knowledge-graph/metadata/vertexlabels"),
      mockClient.get<EdgeLabel[]>("/api/knowledge-graph/metadata/edgelabels"),
      mockClient.get<PropertyKey[]>("/api/knowledge-graph/metadata/propertykeys"),
      mockClient.get<IndexLabel[]>("/api/knowledge-graph/metadata/indexlabels"),
    ])
      .then(([vl, el, pk, il]) => {
        setVertexLabels(vl);
        setEdgeLabels(el);
        setPropertyKeys(pk);
        setIndexLabels(il);
      })
      .finally(() => setLoading(false));
  }, []);

  const draftCount = countDraftChanges(draft);

  const updateDraft = (patch: Partial<MetadataDraft>) => {
    setDraft(mergeDraft(draft, patch));
  };

  const handleModeSwitch = (next: Mode) => {
    if (mode === next) return;
    if (mode === "graph" && draftCount > 0) {
      const shouldDiscard = window.confirm(t("metadata.confirmSwitch"));
      if (!shouldDiscard) return;
      setDraft(null);
    }
    setMode(next);
  };

  const handleCreateOrUpdate = (kind: FormKind, resource: unknown) => {
    if (kind === "propertykey") {
      const next = resource as PropertyKey;
      setPropertyKeys((items) => upsertById(items, next));
    }
    if (kind === "vertexlabel") {
      const next = resource as VertexLabel;
      setVertexLabels((items) => upsertById(items, next));
    }
    if (kind === "edgelabel") {
      const next = resource as EdgeLabel;
      setEdgeLabels((items) => upsertById(items, next));
    }
    if (kind === "indexlabel") {
      const next = resource as IndexLabel;
      setIndexLabels((items) => upsertById(items, next));
    }
    setEditing(null);
  };

  const handleDelete = (kind: Tab, id: string, name: string) => {
    const impact = computeDeleteImpact(kind, name, edgeLabels, indexLabels);
    const confirmed =
      impact > 0
        ? window.prompt(t("metadata.deleteImpact", { count: impact, name })) === name
        : window.confirm(t("metadata.deleteConfirm", { name }));
    if (!confirmed) return;

    if (kind === "propertykey") {
      setPropertyKeys((items) => items.filter((item) => item.id !== id));
    }
    if (kind === "vertexlabel") {
      setVertexLabels((items) => items.filter((item) => item.id !== id));
    }
    if (kind === "edgelabel") {
      setEdgeLabels((items) => items.filter((item) => item.id !== id));
    }
    if (kind === "indexlabel") {
      setIndexLabels((items) => items.filter((item) => item.id !== id));
    }
  };

  const applyGraphDraft = () => {
    if (!draft) return;

    const addedPropertyKeys = draft.addedPropertyKeys as PropertyKey[];
    const addedVertexLabels = draft.addedVertexLabels as VertexLabel[];
    const addedEdgeLabels = draft.addedEdgeLabels as EdgeLabel[];
    const addedIndexLabels = draft.addedIndexLabels as IndexLabel[];

    setPropertyKeys((items) => [
      ...addedPropertyKeys,
      ...items.filter((item) => !draft.deletions.propertyKeys.includes(item.id)),
    ]);
    setVertexLabels((items) => {
      const positioned = items
        .filter((item) => !draft.deletions.vertexLabels.includes(item.id))
        .map((item) =>
          draft.positionChanges[item.id]
            ? { ...item, position: draft.positionChanges[item.id] }
            : item,
        );
      return [...addedVertexLabels, ...positioned];
    });
    setEdgeLabels((items) => [
      ...addedEdgeLabels,
      ...items.filter((item) => !draft.deletions.edgeLabels.includes(item.id)),
    ]);
    setIndexLabels((items) => [
      ...addedIndexLabels,
      ...items.filter((item) => !draft.deletions.indexLabels.includes(item.id)),
    ]);
    setDraft(null);
  };

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold">{t("metadata.title")}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t("metadata.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded border border-border">
            {(["list", "graph"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleModeSwitch(item)}
                className={cn(
                  "flex h-8 items-center gap-1.5 px-4 text-[13px] transition-colors",
                  mode === item
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item === "list" ? <List className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                {t(`metadata.mode.${item}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded border border-border px-3 text-[12px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
            {t("metadata.actions.reuse")}
          </button>
        </div>
      </div>

      {mode === "graph" && draftCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded border border-primary/30 bg-primary/5 px-4 py-2 text-[13px]">
          <span className="font-medium text-primary">
            {t("metadata.draft.count", { count: draftCount })}
          </span>
          <span className="text-muted-foreground">{t("metadata.draft.graphHint")}</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setDraft(null)}
            className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            {t("metadata.draft.discard")}
          </button>
          <button
            type="button"
            onClick={applyGraphDraft}
            className="flex items-center gap-1 rounded border border-primary bg-primary px-3 py-1 text-[12px] text-primary-foreground hover:opacity-90"
          >
            <Save className="h-3.5 w-3.5" />
            {t("metadata.draft.save")}
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : mode === "list" ? (
        <ListMode
          tab={activeTab as Tab}
          onTabChange={setTab}
          query={query}
          onQueryChange={setQuery}
          vertexLabels={vertexLabels}
          edgeLabels={edgeLabels}
          propertyKeys={propertyKeys}
          indexLabels={indexLabels}
          onCreate={(kind) => setEditing({ kind })}
          onEdit={(resource) => setEditing(resource)}
          onDelete={handleDelete}
        />
      ) : (
        <GraphMode
          draft={draft}
          updateDraft={updateDraft}
          vertexLabels={vertexLabels}
          edgeLabels={edgeLabels}
          propertyKeys={propertyKeys}
          indexLabels={indexLabels}
          onOpenForm={(kind) => setEditing({ kind })}
        />
      )}

      {editing && (
        <MetadataFormDrawer
          editing={editing}
          vertexLabels={vertexLabels}
          edgeLabels={edgeLabels}
          propertyKeys={propertyKeys}
          onClose={() => setEditing(null)}
          onSubmit={handleCreateOrUpdate}
        />
      )}
    </div>
  );
}

function ListMode({
  tab,
  onTabChange,
  query,
  onQueryChange,
  vertexLabels,
  edgeLabels,
  propertyKeys,
  indexLabels,
  onCreate,
  onEdit,
  onDelete,
}: {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  query: string;
  onQueryChange: (value: string) => void;
  vertexLabels: VertexLabel[];
  edgeLabels: EdgeLabel[];
  propertyKeys: PropertyKey[];
  indexLabels: IndexLabel[];
  onCreate: (kind: Tab) => void;
  onEdit: (resource: EditingResource) => void;
  onDelete: (kind: Tab, id: string, name: string) => void;
}) {
  const { t } = useTranslation("knowledge-graph");
  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "propertykey", label: t("metadata.tab.propertykey"), count: propertyKeys.length },
    { key: "vertexlabel", label: t("metadata.tab.vertexlabel"), count: vertexLabels.length },
    { key: "edgelabel", label: t("metadata.tab.edgelabel"), count: edgeLabels.length },
    { key: "indexlabel", label: t("metadata.tab.indexlabel"), count: indexLabels.length },
  ];

  const normalizedQuery = query.trim().toLowerCase();
  const visiblePropertyKeys = propertyKeys.filter((item) =>
    item.name.toLowerCase().includes(normalizedQuery),
  );
  const visibleVertexLabels = vertexLabels.filter((item) =>
    item.name.toLowerCase().includes(normalizedQuery),
  );
  const visibleEdgeLabels = edgeLabels.filter((item) =>
    item.name.toLowerCase().includes(normalizedQuery),
  );
  const visibleIndexLabels = indexLabels.filter((item) =>
    item.name.toLowerCase().includes(normalizedQuery),
  );

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <div className="flex gap-0">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              type="button"
              onClick={() => onTabChange(tb.key)}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-5 py-2.5 text-[13px] transition-colors",
                tab === tb.key
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tb.label}
              <span className="rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground">
                {tb.count}
              </span>
            </button>
          ))}
        </div>
        <label className="mb-2 flex h-8 min-w-[240px] items-center gap-2 rounded border border-border px-3 text-[12px]">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("metadata.search")}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <div className="mt-5">
        {tab === "propertykey" && (
          <ResourceTable
            title={t("metadata.tab.propertykey")}
            actionLabel={t("metadata.actions.createProperty")}
            columns={[
              t("metadata.propertykey.name"),
              t("metadata.propertykey.dataType"),
              t("metadata.propertykey.cardinality"),
              t("metadata.propertykey.refCount"),
              t("metadata.common.actions"),
            ]}
            rows={visiblePropertyKeys.map((pk) => [
              <span key="name" className="font-medium">{pk.name}</span>,
              pk.dataType,
              pk.cardinality,
              String(countPropertyUsage(pk.name, vertexLabels, edgeLabels, indexLabels)),
              <TableActions
                key="actions"
                onEdit={() => onEdit({ kind: "propertykey", value: pk })}
                onDelete={() => onDelete("propertykey", pk.id, pk.name)}
              />,
            ])}
            onAdd={() => onCreate("propertykey")}
          />
        )}
        {tab === "vertexlabel" && (
          <ResourceTable
            title={t("metadata.tab.vertexlabel")}
            actionLabel={t("metadata.actions.createVertex")}
            columns={[
              t("metadata.vertexlabel.name"),
              t("metadata.vertexlabel.idStrategy"),
              t("metadata.vertexlabel.properties"),
              t("metadata.vertexlabel.primaryKeys"),
              t("metadata.vertexlabel.style"),
              t("metadata.common.actions"),
            ]}
            rows={visibleVertexLabels.map((vl) => [
              <span key="name" className="font-medium">{vl.name}</span>,
              vl.idStrategy,
              vl.propertyKeys.join(", ") || "—",
              vl.primaryKeys?.join(", ") || "—",
              <StyleSwatch key="style" color={vl.style.color} shape={vl.style.shape} />,
              <TableActions
                key="actions"
                onEdit={() => onEdit({ kind: "vertexlabel", value: vl })}
                onDelete={() => onDelete("vertexlabel", vl.id, vl.name)}
              />,
            ])}
            onAdd={() => onCreate("vertexlabel")}
          />
        )}
        {tab === "edgelabel" && (
          <ResourceTable
            title={t("metadata.tab.edgelabel")}
            actionLabel={t("metadata.actions.createEdge")}
            columns={[
              t("metadata.edgelabel.name"),
              t("metadata.edgelabel.source"),
              t("metadata.edgelabel.target"),
              t("metadata.edgelabel.frequency"),
              t("metadata.edgelabel.properties"),
              t("metadata.common.actions"),
            ]}
            rows={visibleEdgeLabels.map((el) => [
              <span key="name" className="font-medium">{el.name}</span>,
              el.sourceLabel,
              el.targetLabel,
              el.frequency,
              el.propertyKeys.join(", ") || "—",
              <TableActions
                key="actions"
                onEdit={() => onEdit({ kind: "edgelabel", value: el })}
                onDelete={() => onDelete("edgelabel", el.id, el.name)}
              />,
            ])}
            onAdd={() => onCreate("edgelabel")}
          />
        )}
        {tab === "indexlabel" && (
          <ResourceTable
            title={t("metadata.tab.indexlabel")}
            actionLabel={t("metadata.actions.createIndex")}
            columns={[
              t("metadata.indexlabel.name"),
              t("metadata.indexlabel.baseType"),
              t("metadata.indexlabel.baseLabel"),
              t("metadata.indexlabel.indexType"),
              t("metadata.indexlabel.fields"),
              t("metadata.indexlabel.status"),
              t("metadata.common.actions"),
            ]}
            rows={visibleIndexLabels.map((il) => [
              <span key="name" className="font-medium">{il.name}</span>,
              il.baseType,
              il.baseLabel,
              il.indexType,
              il.fields.join(", ") || "—",
              <IndexStatusBadge key="status" status={il.status} />,
              <TableActions
                key="actions"
                extraAction={{
                  label: t("metadata.actions.rebuild"),
                  onClick: () => window.alert(t("metadata.mockTaskCreated")),
                }}
                onEdit={() => onEdit({ kind: "indexlabel", value: il })}
                onDelete={() => onDelete("indexlabel", il.id, il.name)}
              />,
            ])}
            onAdd={() => onCreate("indexlabel")}
          />
        )}
      </div>
    </div>
  );
}

function ResourceTable({
  title,
  actionLabel,
  columns,
  rows,
  onAdd,
}: {
  title: string;
  actionLabel: string;
  columns: string[];
  rows: ReactNode[][];
  onAdd: () => void;
}) {
  const { t } = useTranslation("knowledge-graph");
  return (
    <div className="overflow-hidden rounded border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-3">
        <span className="text-[13px] font-medium">{title}</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="flex items-center gap-1 rounded border border-border px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Copy className="h-3 w-3" />
            {t("metadata.actions.reuse")}
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded border border-border px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            {t("metadata.actions.batchDelete")}
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 rounded border border-primary bg-primary px-3 py-1 text-[12px] text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3 w-3" />
            {actionLabel}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-surface">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-2.5 font-medium text-[11px] uppercase tracking-wide text-muted-foreground"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-border/50 transition-colors hover:bg-accent/30"
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-2.5 align-middle">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {t("metadata.emptyTable")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableActions({
  onEdit,
  onDelete,
  extraAction,
}: {
  onEdit: () => void;
  onDelete: () => void;
  extraAction?: { label: string; onClick: () => void };
}) {
  const { t } = useTranslation("knowledge-graph");
  return (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        {t("metadata.actions.edit")}
      </button>
      {extraAction && (
        <button
          type="button"
          onClick={extraAction.onClick}
          className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          {extraAction.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="rounded border border-destructive/30 px-2 py-0.5 text-[11px] text-destructive transition-colors hover:bg-destructive/5"
      >
        {t("metadata.actions.delete")}
      </button>
    </div>
  );
}

function GraphMode({
  draft,
  updateDraft,
  vertexLabels,
  edgeLabels,
  propertyKeys,
  indexLabels,
  onOpenForm,
}: {
  draft: MetadataDraft | null;
  updateDraft: (patch: Partial<MetadataDraft>) => void;
  vertexLabels: VertexLabel[];
  edgeLabels: EdgeLabel[];
  propertyKeys: PropertyKey[];
  indexLabels: IndexLabel[];
  onOpenForm: (kind: Tab) => void;
}) {
  const { t } = useTranslation("knowledge-graph");
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<
    | { kind: "vertexlabel"; value: VertexLabel }
    | { kind: "edgelabel"; value: EdgeLabel }
    | null
  >(null);
  const [dragging, setDragging] = useState<{ id: string; dx: number; dy: number } | null>(null);

  const draftVertexLabels = (draft?.addedVertexLabels ?? []) as VertexLabel[];
  const draftEdgeLabels = (draft?.addedEdgeLabels ?? []) as EdgeLabel[];
  const graphVertexLabels = [...draftVertexLabels, ...vertexLabels]
    .filter((item) => !(draft?.deletions.vertexLabels ?? []).includes(item.id))
    .map((item) =>
      draft?.positionChanges[item.id]
        ? { ...item, position: draft.positionChanges[item.id] }
        : item,
    );
  const graphEdgeLabels = [...draftEdgeLabels, ...edgeLabels].filter(
    (item) => !(draft?.deletions.edgeLabels ?? []).includes(item.id),
  );

  const vertexByName = useMemo(
    () => Object.fromEntries(graphVertexLabels.map((item) => [item.name, item])),
    [graphVertexLabels],
  );

  const handleDropOnCanvas = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const tool = event.dataTransfer.getData("application/x-hubble-tool");
    if (tool !== "vertexlabel" || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const vertex: VertexLabel = {
      id: `vl-draft-${Date.now()}`,
      name: `Vertex_${graphVertexLabels.length + 1}`,
      idStrategy: "auto",
      propertyKeys: propertyKeys.slice(0, 2).map((item) => item.name),
      style: { color: "#2849D8", shape: "circle", size: "md", displayProperty: "name" },
      position: {
        x: Math.max(24, event.clientX - rect.left - 60),
        y: Math.max(24, event.clientY - rect.top - 22),
      },
    };
    updateDraft({ addedVertexLabels: [...draftVertexLabels, vertex] });
    setSelected({ kind: "vertexlabel", value: vertex });
  };

  const handleEdgeDrop = (event: DragEvent<HTMLButtonElement>, target: VertexLabel) => {
    event.preventDefault();
    const sourceName = event.dataTransfer.getData("application/x-hubble-edge-source");
    if (!sourceName || sourceName === target.name) return;
    const edge: EdgeLabel = {
      id: `el-draft-${Date.now()}`,
      name: `${sourceName.toLowerCase()}_to_${target.name.toLowerCase()}`,
      sourceLabel: sourceName,
      targetLabel: target.name,
      frequency: "multiple",
      propertyKeys: [],
      style: { color: "#2849D8", thickness: 1, arrow: "end" },
    };
    updateDraft({ addedEdgeLabels: [...draftEdgeLabels, edge] });
    setSelected({ kind: "edgelabel", value: edge });
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, vertex: VertexLabel) => {
    if (!canvasRef.current || !vertex.position) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragging({
      id: vertex.id,
      dx: event.clientX - rect.left - vertex.position.x,
      dy: event.clientY - rect.top - vertex.position.y,
    });
    setSelected({ kind: "vertexlabel", value: vertex });
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    updateDraft({
      positionChanges: {
        ...(draft?.positionChanges ?? {}),
        [dragging.id]: {
          x: Math.max(12, event.clientX - rect.left - dragging.dx),
          y: Math.max(12, event.clientY - rect.top - dragging.dy),
        },
      },
    });
  };

  const autoLayout = () => {
    const nextPositions = Object.fromEntries(
      graphVertexLabels.map((vertex, index) => [
        vertex.id,
        {
          x: 80 + (index % 4) * 190,
          y: 80 + Math.floor(index / 4) * 130,
        },
      ]),
    );
    updateDraft({ positionChanges: { ...(draft?.positionChanges ?? {}), ...nextPositions } });
  };

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[190px_1fr_300px]">
      <aside className="rounded border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-[13px] font-medium">
          {t("metadata.graph.toolbox")}
        </div>
        <div className="space-y-2 p-3">
          <ToolButton icon={Boxes} label={t("metadata.actions.createProperty")} onClick={() => onOpenForm("propertykey")} />
          <ToolButton
            icon={MousePointer2}
            label={t("metadata.graph.dragVertex")}
            draggable
            onDragStart={(event) =>
              event.dataTransfer.setData("application/x-hubble-tool", "vertexlabel")
            }
          />
          <ToolButton icon={GitBranch} label={t("metadata.graph.dragEdge")} passive />
          <ToolButton icon={Layers3} label={t("metadata.actions.createIndex")} onClick={() => onOpenForm("indexlabel")} />
          <ToolButton icon={Copy} label={t("metadata.actions.reuse")} passive />
          <ToolButton icon={RefreshCw} label={t("metadata.actions.autoLayout")} onClick={autoLayout} />
          <ToolButton icon={Sparkles} label={t("metadata.savePerspective")} passive />
        </div>
      </aside>

      <div className="overflow-hidden rounded border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-[13px] font-medium">{t("metadata.schema.canvas")}</span>
          <span className="text-[12px] text-muted-foreground">
            {t("metadata.graph.hint")}
          </span>
        </div>
        <div
          ref={canvasRef}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDropOnCanvas}
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDragging(null)}
          onPointerLeave={() => setDragging(null)}
          className="relative h-[520px] overflow-hidden bg-grid-paper"
        >
          {graphVertexLabels.length === 0 && (
            <div className="absolute inset-0 grid place-items-center text-[13px] text-muted-foreground">
              {t("metadata.schema.empty")}
            </div>
          )}
          <svg className="absolute inset-0 h-full w-full">
            <defs>
              <marker id="meta-arrow" markerWidth="8" markerHeight="8" orient="auto" refX="7" refY="3">
                <path d="M0,0 L0,6 L7,3 z" fill="hsl(var(--muted-foreground))" />
              </marker>
            </defs>
            {graphEdgeLabels.map((edge) => {
              const source = vertexByName[edge.sourceLabel];
              const target = vertexByName[edge.targetLabel];
              if (!source?.position || !target?.position) return null;
              const mx = (source.position.x + target.position.x) / 2 + 60;
              const my = (source.position.y + target.position.y) / 2 + 22;
              const active = selected?.kind === "edgelabel" && selected.value.id === edge.id;
              return (
                <g key={edge.id} onClick={() => setSelected({ kind: "edgelabel", value: edge })}>
                  <line
                    x1={source.position.x + 60}
                    y1={source.position.y + 22}
                    x2={target.position.x + 60}
                    y2={target.position.y + 22}
                    stroke={active ? "hsl(var(--primary))" : edge.style.color}
                    strokeWidth={active ? 3 : edge.style.thickness}
                    markerEnd={edge.style.arrow !== "none" ? "url(#meta-arrow)" : undefined}
                  />
                  <text
                    x={mx}
                    y={my - 5}
                    textAnchor="middle"
                    fontSize="10"
                    fill="hsl(var(--muted-foreground))"
                  >
                    {edge.name}
                  </text>
                </g>
              );
            })}
          </svg>
          {graphVertexLabels.map((vertex) => (
            <button
              key={vertex.id}
              type="button"
              draggable
              onPointerDown={(event) => handlePointerDown(event, vertex)}
              onClick={() => setSelected({ kind: "vertexlabel", value: vertex })}
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-hubble-edge-source", vertex.name);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleEdgeDrop(event, vertex)}
              style={{ left: vertex.position?.x ?? 0, top: vertex.position?.y ?? 0 }}
              className={cn(
                "absolute w-[128px] border bg-background px-3 py-2 text-left text-[12px] transition-colors",
                selected?.kind === "vertexlabel" && selected.value.id === vertex.id
                  ? "border-primary"
                  : "border-border hover:border-primary/40",
              )}
            >
              <div className="flex items-center gap-2">
                <Grip className="h-3.5 w-3.5 text-muted-foreground" />
                <span
                  className="h-3 w-3 rounded-full border border-border/50"
                  style={{ backgroundColor: vertex.style.color }}
                />
                <span className="truncate font-medium">{vertex.name}</span>
              </div>
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                {vertex.propertyKeys.length} props
              </div>
            </button>
          ))}
        </div>
      </div>

      <aside className="rounded border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-[13px] font-medium">
          {t("metadata.graph.config")}
        </div>
        <GraphInspector
          selected={selected}
          propertyKeys={propertyKeys}
          indexLabels={indexLabels}
          updateDraft={updateDraft}
          draft={draft}
        />
      </aside>
    </div>
  );
}

function GraphInspector({
  selected,
  propertyKeys,
  indexLabels,
  updateDraft,
  draft,
}: {
  selected:
    | { kind: "vertexlabel"; value: VertexLabel }
    | { kind: "edgelabel"; value: EdgeLabel }
    | null;
  propertyKeys: PropertyKey[];
  indexLabels: IndexLabel[];
  updateDraft: (patch: Partial<MetadataDraft>) => void;
  draft: MetadataDraft | null;
}) {
  const { t } = useTranslation("knowledge-graph");

  if (!selected) {
    return (
      <div className="p-4 text-[13px] text-muted-foreground">
        {t("metadata.graph.selectHint")}
      </div>
    );
  }

  const resource = selected.value;
  const relatedIndexes = indexLabels.filter(
    (index) =>
      index.baseLabel === resource.name ||
      ("sourceLabel" in resource && index.baseLabel === resource.sourceLabel) ||
      ("targetLabel" in resource && index.baseLabel === resource.targetLabel),
  );

  return (
    <div className="space-y-4 p-4 text-[13px]">
      <KeyValue label={t("metadata.vertexlabel.name")} value={resource.name} />
      {"propertyKeys" in resource && (
        <KeyValue
          label={t("metadata.vertexlabel.properties")}
          value={resource.propertyKeys.join(", ") || "—"}
        />
      )}
      {"sourceLabel" in resource && (
        <>
          <KeyValue label={t("metadata.edgelabel.source")} value={resource.sourceLabel} />
          <KeyValue label={t("metadata.edgelabel.target")} value={resource.targetLabel} />
        </>
      )}
      <div>
        <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          {t("metadata.tab.propertykey")}
        </div>
        <div className="flex flex-wrap gap-1">
          {propertyKeys.slice(0, 8).map((property) => (
            <span key={property.id} className="border border-border px-2 py-0.5 text-[11px]">
              {property.name}
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          {t("metadata.tab.indexlabel")}
        </div>
        <div className="space-y-1">
          {relatedIndexes.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            relatedIndexes.map((index) => (
              <div key={index.id} className="flex items-center justify-between border border-border px-2 py-1">
                <span>{index.name}</span>
                <IndexStatusBadge status={index.status} />
              </div>
            ))
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (selected.kind === "vertexlabel") {
            updateDraft({
              deletions: {
                ...(draft?.deletions ?? EMPTY_DRAFT.deletions),
                vertexLabels: [
                  ...(draft?.deletions.vertexLabels ?? []),
                  selected.value.id,
                ],
              },
            });
          }
          if (selected.kind === "edgelabel") {
            updateDraft({
              deletions: {
                ...(draft?.deletions ?? EMPTY_DRAFT.deletions),
                edgeLabels: [
                  ...(draft?.deletions.edgeLabels ?? []),
                  selected.value.id,
                ],
              },
            });
          }
        }}
        className="flex items-center gap-1 rounded border border-destructive/30 px-3 py-1 text-[12px] text-destructive hover:bg-destructive/5"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("metadata.actions.delete")}
      </button>
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  passive,
  draggable,
  onClick,
  onDragStart,
}: {
  icon: typeof Plus;
  label: string;
  passive?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      draggable={draggable}
      onClick={onClick}
      onDragStart={onDragStart}
      className={cn(
        "flex w-full items-center gap-2 border border-border px-3 py-2 text-left text-[12px] transition-colors",
        passive
          ? "cursor-default text-muted-foreground"
          : "text-foreground hover:border-primary/40 hover:bg-accent/30",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span>{label}</span>
    </button>
  );
}

function MetadataFormDrawer({
  editing,
  vertexLabels,
  edgeLabels,
  propertyKeys,
  onClose,
  onSubmit,
}: {
  editing: NonNullable<EditingResource>;
  vertexLabels: VertexLabel[];
  edgeLabels: EdgeLabel[];
  propertyKeys: PropertyKey[];
  onClose: () => void;
  onSubmit: (kind: FormKind, resource: unknown) => void;
}) {
  const { t } = useTranslation("knowledge-graph");
  const kind = editing.kind;
  const propertyValue = kind === "propertykey" ? editing.value : undefined;
  const vertexValue = kind === "vertexlabel" ? editing.value : undefined;
  const edgeValue = kind === "edgelabel" ? editing.value : undefined;
  const indexValue = kind === "indexlabel" ? editing.value : undefined;
  const value = editing.value;
  const [name, setName] = useState(value?.name ?? newDefaultName(kind));
  const [dataType, setDataType] = useState<PropertyKey["dataType"]>(
    propertyValue ? propertyValue.dataType : "TEXT",
  );
  const [cardinality, setCardinality] = useState<PropertyKey["cardinality"]>(
    propertyValue ? propertyValue.cardinality : "single",
  );
  const [idStrategy, setIdStrategy] = useState<VertexLabel["idStrategy"]>(
    vertexValue ? vertexValue.idStrategy : "auto",
  );
  const [sourceLabel, setSourceLabel] = useState(
    edgeValue ? edgeValue.sourceLabel : vertexLabels[0]?.name ?? "",
  );
  const [targetLabel, setTargetLabel] = useState(
    edgeValue ? edgeValue.targetLabel : vertexLabels[1]?.name ?? vertexLabels[0]?.name ?? "",
  );
  const [frequency, setFrequency] = useState<EdgeLabel["frequency"]>(
    edgeValue ? edgeValue.frequency : "multiple",
  );
  const [baseType, setBaseType] = useState<IndexLabel["baseType"]>(
    indexValue ? indexValue.baseType : "vertex",
  );
  const [baseLabel, setBaseLabel] = useState(
    indexValue ? indexValue.baseLabel : vertexLabels[0]?.name ?? "",
  );
  const [indexType, setIndexType] = useState<IndexLabel["indexType"]>(
    indexValue ? indexValue.indexType : "secondary",
  );
  const [color, setColor] = useState(
    vertexValue
      ? vertexValue.style.color
      : edgeValue
        ? edgeValue.style.color
        : "#2849D8",
  );

  const propertyOptions = propertyKeys.map((property) => property.name);
  const [selectedProperties, setSelectedProperties] = useState<string[]>(
    vertexValue?.propertyKeys ??
      edgeValue?.propertyKeys ??
      indexValue?.fields ??
      propertyOptions.slice(0, 1),
  );

  const submit = () => {
    if (kind === "propertykey") {
      onSubmit("propertykey", {
        id: propertyValue?.id ?? `pk-${Date.now()}`,
        name,
        dataType,
        cardinality,
      } satisfies PropertyKey);
    }
    if (kind === "vertexlabel") {
      onSubmit("vertexlabel", {
        id: vertexValue?.id ?? `vl-${Date.now()}`,
        name,
        idStrategy,
        primaryKeys: idStrategy === "primaryKey" ? selectedProperties.slice(0, 1) : undefined,
        propertyKeys: selectedProperties,
        style: {
          color,
          shape: vertexValue?.style.shape ?? "circle",
          size: vertexValue?.style.size ?? "md",
          displayProperty: selectedProperties[0],
        },
        position: vertexValue?.position ?? { x: 120, y: 140 },
      } satisfies VertexLabel);
    }
    if (kind === "edgelabel") {
      onSubmit("edgelabel", {
        id: edgeValue?.id ?? `el-${Date.now()}`,
        name,
        sourceLabel,
        targetLabel,
        frequency,
        propertyKeys: selectedProperties,
        style: {
          color,
          thickness: edgeValue?.style.thickness ?? 1,
          arrow: edgeValue?.style.arrow ?? "end",
        },
      } satisfies EdgeLabel);
    }
    if (kind === "indexlabel") {
      onSubmit("indexlabel", {
        id: indexValue?.id ?? `il-${Date.now()}`,
        name,
        baseType,
        baseLabel,
        indexType,
        fields: selectedProperties,
        status: indexValue?.status ?? "building",
      } satisfies IndexLabel);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm">
      <aside className="h-full w-full max-w-[430px] overflow-y-auto border-l border-border bg-card shadow-xl scrollbar-thin">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="text-[14px] font-medium">
              {value ? t("metadata.actions.edit") : t(`metadata.actions.create.${kind}`)}
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">
              {t("metadata.drawerHint")}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <FormField label={t("metadata.common.name")}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-9 w-full border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
            />
          </FormField>

          {kind === "propertykey" && (
            <>
              <FormField label={t("metadata.propertykey.dataType")}>
                <Select
                  value={dataType}
                  options={DATA_TYPES}
                  onChange={(next) => setDataType(next as PropertyKey["dataType"])}
                />
              </FormField>
              <FormField label={t("metadata.propertykey.cardinality")}>
                <Select
                  value={cardinality}
                  options={["single", "list", "set"]}
                  onChange={(next) => setCardinality(next as PropertyKey["cardinality"])}
                />
              </FormField>
            </>
          )}

          {kind === "vertexlabel" && (
            <>
              <FormField label={t("metadata.vertexlabel.idStrategy")}>
                <Select
                  value={idStrategy}
                  options={["auto", "primaryKey", "customize"]}
                  onChange={(next) => setIdStrategy(next as VertexLabel["idStrategy"])}
                />
              </FormField>
              <FormField label={t("metadata.vertexlabel.properties")}>
                <MultiSelect
                  options={propertyOptions}
                  values={selectedProperties}
                  onChange={setSelectedProperties}
                />
              </FormField>
              <FormField label={t("metadata.vertexlabel.style")}>
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-9 w-full border border-border bg-background"
                />
              </FormField>
            </>
          )}

          {kind === "edgelabel" && (
            <>
              <FormField label={t("metadata.edgelabel.source")}>
                <Select
                  value={sourceLabel}
                  options={vertexLabels.map((item) => item.name)}
                  onChange={setSourceLabel}
                />
              </FormField>
              <FormField label={t("metadata.edgelabel.target")}>
                <Select
                  value={targetLabel}
                  options={vertexLabels.map((item) => item.name)}
                  onChange={setTargetLabel}
                />
              </FormField>
              <FormField label={t("metadata.edgelabel.frequency")}>
                <Select
                  value={frequency}
                  options={["single", "multiple"]}
                  onChange={(next) => setFrequency(next as EdgeLabel["frequency"])}
                />
              </FormField>
              <FormField label={t("metadata.edgelabel.properties")}>
                <MultiSelect
                  options={propertyOptions}
                  values={selectedProperties}
                  onChange={setSelectedProperties}
                />
              </FormField>
            </>
          )}

          {kind === "indexlabel" && (
            <>
              <FormField label={t("metadata.indexlabel.baseType")}>
                <Select
                  value={baseType}
                  options={["vertex", "edge"]}
                  onChange={(next) => {
                    const typed = next as IndexLabel["baseType"];
                    setBaseType(typed);
                    setBaseLabel(
                      typed === "vertex"
                        ? vertexLabels[0]?.name ?? ""
                        : edgeLabels[0]?.name ?? "",
                    );
                  }}
                />
              </FormField>
              <FormField label={t("metadata.indexlabel.baseLabel")}>
                <Select
                  value={baseLabel}
                  options={(baseType === "vertex" ? vertexLabels : edgeLabels).map((item) => item.name)}
                  onChange={setBaseLabel}
                />
              </FormField>
              <FormField label={t("metadata.indexlabel.indexType")}>
                <Select
                  value={indexType}
                  options={INDEX_TYPES}
                  onChange={(next) => setIndexType(next as IndexLabel["indexType"])}
                />
              </FormField>
              <FormField label={t("metadata.indexlabel.fields")}>
                <MultiSelect
                  options={propertyOptions}
                  values={selectedProperties}
                  onChange={setSelectedProperties}
                />
              </FormField>
            </>
          )}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-4 py-1.5 text-[13px] text-muted-foreground hover:text-foreground"
          >
            {t("metadata.actions.cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded border border-primary bg-primary px-4 py-1.5 text-[13px] text-primary-foreground hover:opacity-90"
          >
            {t("metadata.actions.submit")}
          </button>
        </div>
      </aside>
    </div>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function MultiSelect({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((option) => (
        <label key={option} className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={values.includes(option)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...values, option]
                  : values.filter((value) => value !== option),
              )
            }
          />
          {option}
        </label>
      ))}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function StyleSwatch({ color, shape }: { color: string; shape: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-4 w-4 rounded border border-border"
        style={{ backgroundColor: color }}
      />
      <span className="text-muted-foreground">{shape}</span>
    </div>
  );
}

function IndexStatusBadge({ status }: { status: string }) {
  const cls =
    status === "ready"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
      : status === "building"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
        : "border-destructive/40 bg-destructive/10 text-destructive";
  return (
    <span className={cn("rounded border px-2 py-0.5 font-mono text-[10px] uppercase", cls)}>
      {status}
    </span>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="break-words text-[13px]">{value}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mt-5 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded border border-border bg-card" />
      ))}
    </div>
  );
}

function mergeDraft(current: MetadataDraft | null, patch: Partial<MetadataDraft>): MetadataDraft {
  return {
    ...EMPTY_DRAFT,
    ...current,
    ...patch,
    deletions: {
      ...EMPTY_DRAFT.deletions,
      ...(current?.deletions ?? {}),
      ...(patch.deletions ?? {}),
    },
    positionChanges: {
      ...(current?.positionChanges ?? {}),
      ...(patch.positionChanges ?? {}),
    },
    styleChanges: {
      ...(current?.styleChanges ?? {}),
      ...(patch.styleChanges ?? {}),
    },
  };
}

function countDraftChanges(draft: MetadataDraft | null) {
  if (!draft) return 0;
  return (
    draft.addedPropertyKeys.length +
    draft.addedVertexLabels.length +
    draft.addedEdgeLabels.length +
    draft.addedIndexLabels.length +
    Object.keys(draft.positionChanges).length +
    Object.keys(draft.styleChanges).length +
    draft.deletions.propertyKeys.length +
    draft.deletions.vertexLabels.length +
    draft.deletions.edgeLabels.length +
    draft.deletions.indexLabels.length
  );
}

function upsertById<T extends { id: string }>(items: T[], next: T) {
  return items.some((item) => item.id === next.id)
    ? items.map((item) => (item.id === next.id ? next : item))
    : [next, ...items];
}

function countPropertyUsage(
  propertyName: string,
  vertexLabels: VertexLabel[],
  edgeLabels: EdgeLabel[],
  indexLabels: IndexLabel[],
) {
  return (
    vertexLabels.filter((item) => item.propertyKeys.includes(propertyName)).length +
    edgeLabels.filter((item) => item.propertyKeys.includes(propertyName)).length +
    indexLabels.filter((item) => item.fields.includes(propertyName)).length
  );
}

function computeDeleteImpact(
  kind: Tab,
  name: string,
  edgeLabels: EdgeLabel[],
  indexLabels: IndexLabel[],
) {
  if (kind === "vertexlabel") {
    return (
      edgeLabels.filter((edge) => edge.sourceLabel === name || edge.targetLabel === name).length +
      indexLabels.filter((index) => index.baseLabel === name).length
    );
  }
  if (kind === "edgelabel") {
    return indexLabels.filter((index) => index.baseLabel === name).length;
  }
  return 0;
}

function newDefaultName(kind: FormKind) {
  if (kind === "propertykey") return "new_property";
  if (kind === "vertexlabel") return "NewVertex";
  if (kind === "edgelabel") return "new_edge";
  return "new_index";
}
