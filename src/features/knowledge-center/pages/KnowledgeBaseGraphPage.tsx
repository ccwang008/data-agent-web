import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import {
  ArrowLeft,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Network,
  Play,
  RotateCcw,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { cn } from "@/lib/utils";

import { DEFAULT_BASES } from "./knowledge-base-data";

interface KnowledgeBaseGraphLocationState {
  name?: string;
}

type EntityType = "knowledgeBase" | "document" | "chunk" | "parser" | "owner" | "topic";
type GraphTab = "graph" | "entities" | "relations";
type BuildScope = "all" | "partial";
type DocumentStatus = "unparsed" | "parsing" | "parsed" | "failed";
type GraphBuildStatus = "pending" | "building" | "generated" | "failed";

interface GraphEntity {
  id: string;
  name: string;
  type: EntityType;
  description: string;
  source: string;
  confidence: number;
  properties: Record<string, string | number>;
  knowledgeBase: string;
  document: string;
  sourceChunk: string;
  createdAt: string;
  updatedAt: string;
  x: number;
  y: number;
}

interface GraphRelation {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  description: string;
  confidence: number;
  knowledgeBase: string;
  document: string;
  sourceChunk: string;
  createdAt: string;
  updatedAt: string;
}

interface GraphData {
  entities: GraphEntity[];
  relations: GraphRelation[];
  entityCount: number;
  relationCount: number;
}

interface BuildGraphDocument {
  id: string;
  name: string;
  size: string;
  parseStatus: DocumentStatus;
  graphStatus: GraphBuildStatus;
}

interface DragState {
  entityId: string;
  offsetX: number;
  offsetY: number;
}

interface PanelDragState {
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 520;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.8;
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const ENTITY_STYLES: Record<EntityType, { fill: string; stroke: string; text: string; label: string }> = {
  knowledgeBase: { fill: "#eff6ff", stroke: "#2563eb", text: "#1e3a8a", label: "知识库" },
  document: { fill: "#ecfdf5", stroke: "#059669", text: "#065f46", label: "文档" },
  chunk: { fill: "#fff7ed", stroke: "#ea580c", text: "#9a3412", label: "切片" },
  parser: { fill: "#f5f3ff", stroke: "#7c3aed", text: "#5b21b6", label: "解析策略" },
  owner: { fill: "#f8fafc", stroke: "#64748b", text: "#334155", label: "创建人" },
  topic: { fill: "#fef2f2", stroke: "#dc2626", text: "#991b1b", label: "主题" },
};

const DOCUMENT_STATUS_META: Record<DocumentStatus, { label: string; className: string }> = {
  unparsed: { label: "待解析", className: "border-slate-200 bg-slate-50 text-slate-500" },
  parsing: { label: "解析中", className: "border-amber-200 bg-amber-50 text-amber-700" },
  parsed: { label: "解析成功", className: "border-emerald-200 bg-emerald-50 text-emerald-600" },
  failed: { label: "解析失败", className: "border-red-200 bg-red-50 text-red-600" },
};

const GRAPH_BUILD_STATUS_META: Record<GraphBuildStatus, { label: string; className: string }> = {
  pending: { label: "未生成", className: "border-slate-200 bg-slate-50 text-slate-500" },
  building: { label: "构建中", className: "border-amber-200 bg-amber-50 text-amber-700" },
  generated: { label: "已生成", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  failed: { label: "构建失败", className: "border-red-200 bg-red-50 text-red-600" },
};

export function KnowledgeBaseGraphPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { knowledgeBaseId } = useParams<{ knowledgeBaseId: string }>();
  const state = location.state as KnowledgeBaseGraphLocationState | null;
  const matchedBase = DEFAULT_BASES.find((item) => item.id === knowledgeBaseId);
  const name = state?.name || matchedBase?.name || knowledgeBaseId || "知识库";
  const initialGraphData = useMemo(() => buildGraphData(name, matchedBase), [matchedBase, name]);
  const buildDocuments = useMemo(() => buildGraphDocuments(name, matchedBase), [matchedBase, name]);
  const [entities, setEntities] = useState<GraphEntity[]>(initialGraphData.entities);
  const [selectedEntityId, setSelectedEntityId] = useState(initialGraphData.entities[0]?.id ?? "");
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [activeTab, setActiveTab] = useState<GraphTab>("graph");
  const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 });
  const [panelDragState, setPanelDragState] = useState<PanelDragState | null>(null);
  const [showBuildDialog, setShowBuildDialog] = useState(false);
  const [buildScope, setBuildScope] = useState<BuildScope>("all");
  const [selectedBuildDocumentIds, setSelectedBuildDocumentIds] = useState<string[]>(() =>
    buildDocuments.map((document) => document.id),
  );
  const [buildStatus, setBuildStatus] = useState<GraphBuildStatus>("generated");
  const [buildProgress, setBuildProgress] = useState(100);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const buildTimerRef = useRef<number | null>(null);
  const finishBuildTimerRef = useRef<number | null>(null);

  const entityMap = useMemo(() => new Map(entities.map((entity) => [entity.id, entity])), [entities]);
  const selectedEntity = entityMap.get(selectedEntityId) ?? entities[0] ?? null;
  const selectedRelation = initialGraphData.relations.find((relation) => relation.id === selectedRelationId) ?? null;
  const relatedRelations = selectedEntity
    ? initialGraphData.relations.filter(
        (relation) => relation.sourceId === selectedEntity.id || relation.targetId === selectedEntity.id,
      )
    : [];
  const overviewItems = [
    { label: "实体数量", value: initialGraphData.entityCount.toLocaleString(), icon: Boxes },
    { label: "关系数量", value: initialGraphData.relationCount.toLocaleString(), icon: Network },
    { label: "来源文档", value: String(matchedBase?.documents ?? 0), icon: FileText },
    { label: "分片数量", value: String(matchedBase?.chunks ?? 0), icon: Database },
  ];

  const graphTransform = `translate(${CANVAS_WIDTH / 2 - (CANVAS_WIDTH / 2) * zoom} ${
    CANVAS_HEIGHT / 2 - (CANVAS_HEIGHT / 2) * zoom
  }) scale(${zoom})`;
  const buildStatusMeta = GRAPH_BUILD_STATUS_META[buildStatus];

  useEffect(() => {
    setEntities(initialGraphData.entities);
    setZoom(1);
    setDragState(null);
    setPanelDragState(null);
    setPanelOffset({ x: 0, y: 0 });
    setSelectedRelationId(null);
    setSelectedEntityId(initialGraphData.entities[0]?.id ?? "");
  }, [initialGraphData]);

  useEffect(() => {
    setShowBuildDialog(false);
    setBuildScope("all");
    setSelectedBuildDocumentIds(buildDocuments.map((document) => document.id));
    setBuildStatus("generated");
    setBuildProgress(100);
  }, [buildDocuments]);

  useEffect(
    () => () => {
      clearBuildTimers();
    },
    [],
  );

  const selectEntity = (entityId: string, relationId: string | null = null) => {
    setSelectedEntityId(entityId);
    setSelectedRelationId(relationId);
  };

  const handleNodePointerDown = (event: ReactPointerEvent<SVGGElement>, entity: GraphEntity) => {
    event.preventDefault();
    event.stopPropagation();
    const point = getGraphPoint(event, svgRef.current, zoom);

    selectEntity(entity.id);
    setDragState({
      entityId: entity.id,
      offsetX: point.x - entity.x,
      offsetY: point.y - entity.y,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragState) return;
    const point = getGraphPoint(event, svgRef.current, zoom);

    setEntities((current) =>
      current.map((entity) =>
        entity.id === dragState.entityId
          ? {
              ...entity,
              x: clamp(point.x - dragState.offsetX, 64, CANVAS_WIDTH - 64),
              y: clamp(point.y - dragState.offsetY, 58, CANVAS_HEIGHT - 58),
            }
          : entity,
      ),
    );
  };

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    setZoom((value) => clamp(Number((value + delta).toFixed(2)), MIN_ZOOM, MAX_ZOOM));
  };

  const resetView = () => {
    setEntities(initialGraphData.entities);
    setZoom(1);
    selectEntity(initialGraphData.entities[0]?.id ?? "");
  };

  const handlePanelPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setPanelDragState({
      startX: event.clientX,
      startY: event.clientY,
      offsetX: panelOffset.x,
      offsetY: panelOffset.y,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePanelPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!panelDragState) return;

    setPanelOffset({
      x: clamp(panelDragState.offsetX + event.clientX - panelDragState.startX, -560, 120),
      y: clamp(panelDragState.offsetY + event.clientY - panelDragState.startY, -80, 360),
    });
  };

  const handleBuildScopeChange = (scope: BuildScope) => {
    setBuildScope(scope);
    if (scope === "partial" && selectedBuildDocumentIds.length === 0) {
      setSelectedBuildDocumentIds(buildDocuments.map((document) => document.id));
    }
  };

  const clearBuildTimers = () => {
    if (buildTimerRef.current !== null) {
      window.clearInterval(buildTimerRef.current);
      buildTimerRef.current = null;
    }
    if (finishBuildTimerRef.current !== null) {
      window.clearTimeout(finishBuildTimerRef.current);
      finishBuildTimerRef.current = null;
    }
  };

  const startBuildGraph = () => {
    if (buildScope === "partial" && selectedBuildDocumentIds.length === 0) return;

    clearBuildTimers();
    setShowBuildDialog(false);
    setBuildStatus("building");
    setBuildProgress(0);

    buildTimerRef.current = window.setInterval(() => {
      setBuildProgress((current) => {
        const next = Math.min(current + 10, 100);

        if (next >= 100) {
          if (buildTimerRef.current !== null) {
            window.clearInterval(buildTimerRef.current);
            buildTimerRef.current = null;
          }
          finishBuildTimerRef.current = window.setTimeout(() => {
            setBuildStatus("generated");
            finishBuildTimerRef.current = null;
          }, 360);
        }

        return next;
      });
    }, 280);
  };

  return (
    <div className="page-shell animate-fade-in">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(`/knowledge-center/knowledge-bases/${knowledgeBaseId}`, {
                state: { name },
              })
            }
            aria-label="返回知识库详情"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-card text-slate-500 transition-colors hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-[18px] font-semibold text-foreground">知识图谱</h1>
            <p className="mt-1 truncate text-[12px] text-muted-foreground">{name}</p>
          </div>
        </div>
        <div className="flex w-fit flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBuildDialog(true)}
            disabled={buildStatus === "building"}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-80"
          >
            <Play className="h-3.5 w-3.5" />
            {buildStatus === "building" ? `图谱构建中（${buildProgress}%）` : "构建图谱"}
          </button>
          <div className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium", buildStatusMeta.className)}>
            <Sparkles className="h-3.5 w-3.5" />
            {buildStatusMeta.label}
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        {overviewItems.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-muted-foreground">{item.label}</span>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2 font-mono text-[22px] font-semibold tabular-nums text-foreground">
                {item.value}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-4 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-raised/40 px-3 py-2">
          <GraphTabButton
            active={activeTab === "graph"}
            icon={<Network className="h-3.5 w-3.5" />}
            label="图谱可视化"
            meta={`${Math.round(zoom * 100)}%`}
            onClick={() => setActiveTab("graph")}
          />
          <GraphTabButton
            active={activeTab === "entities"}
            icon={<Boxes className="h-3.5 w-3.5" />}
            label="实体列表"
            meta={String(entities.length)}
            onClick={() => setActiveTab("entities")}
          />
          <GraphTabButton
            active={activeTab === "relations"}
            icon={<Network className="h-3.5 w-3.5" />}
            label="关系列表"
            meta={String(initialGraphData.relations.length)}
            onClick={() => setActiveTab("relations")}
          />
        </div>

        {activeTab === "graph" && (
          <>
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-foreground">图谱可视化</h2>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  可拖拽节点、滚轮缩放，点击节点查看实体详情
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {Object.entries(ENTITY_STYLES).map(([type, style]) => (
                  <span key={type} className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full border"
                      style={{ backgroundColor: style.fill, borderColor: style.stroke }}
                    />
                    {style.label}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={resetView}
                  className="ml-1 inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[12px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  重置视图
                </button>
              </div>
            </div>

            <div className="relative min-h-[560px] overflow-hidden bg-grid-paper">
                <div className="absolute left-4 top-4 z-10 rounded-md border border-border bg-background/90 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground shadow-sm">
                  Zoom {Math.round(zoom * 100)}%
                </div>
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                  className={cn(
                    "h-full min-h-[460px] w-full touch-none",
                    dragState ? "cursor-grabbing" : "cursor-default",
                  )}
                  onPointerMove={handlePointerMove}
                  onPointerUp={() => setDragState(null)}
                  onPointerLeave={() => setDragState(null)}
                  onWheel={handleWheel}
                >
                  <defs>
                    <marker id="kb-graph-arrow" markerWidth="10" markerHeight="10" orient="auto" refX="9" refY="5">
                      <path d="M0,0 L10,5 L0,10 Z" fill="#64748b" />
                    </marker>
                    <marker
                      id="kb-graph-arrow-selected"
                      markerWidth="10"
                      markerHeight="10"
                      orient="auto"
                      refX="9"
                      refY="5"
                    >
                      <path d="M0,0 L10,5 L0,10 Z" fill="#2563eb" />
                    </marker>
                  </defs>
                  <g transform={graphTransform}>
                    {initialGraphData.relations.map((relation) => {
                      const source = entityMap.get(relation.sourceId);
                      const target = entityMap.get(relation.targetId);
                      if (!source || !target) return null;
                      const isSelected = relation.id === selectedRelationId;

                      const endpoints = getRelationEndpoints(source, target);

                      return (
                        <g key={relation.id}>
                          <line
                            x1={endpoints.x1}
                            y1={endpoints.y1}
                            x2={endpoints.x2}
                            y2={endpoints.y2}
                            stroke={isSelected ? "#2563eb" : "#cbd5e1"}
                            strokeWidth={isSelected ? "2.4" : "1.8"}
                            markerEnd={`url(#${isSelected ? "kb-graph-arrow-selected" : "kb-graph-arrow"})`}
                          />
                          <text
                            x={(source.x + target.x) / 2}
                            y={(source.y + target.y) / 2 - 8}
                            textAnchor="middle"
                            className={cn("text-[11px]", isSelected ? "fill-primary font-medium" : "fill-slate-500")}
                          >
                            {relation.type}
                          </text>
                        </g>
                      );
                    })}
                    {entities.map((entity) => (
                      <GraphEntityNode
                        key={entity.id}
                        entity={entity}
                        selected={entity.id === selectedEntity?.id}
                        dragging={dragState?.entityId === entity.id}
                        onPointerDown={handleNodePointerDown}
                      />
                    ))}
                  </g>
                </svg>

              <EntityDetailPanel
                entity={selectedEntity}
                relation={selectedRelation}
                relations={relatedRelations}
                entityMap={entityMap}
                knowledgeBaseId={knowledgeBaseId ?? "-"}
                base={matchedBase}
                offset={panelOffset}
                dragging={Boolean(panelDragState)}
                onPointerDown={handlePanelPointerDown}
                onPointerMove={handlePanelPointerMove}
                onPointerEnd={() => setPanelDragState(null)}
              />
            </div>
          </>
        )}

        {activeTab === "entities" && (
          <EntityTable
            entities={entities}
            relations={initialGraphData.relations}
            selectedEntityId={selectedEntity?.id ?? ""}
            onSelect={selectEntity}
          />
        )}

        {activeTab === "relations" && (
          <RelationTable
            relations={initialGraphData.relations}
            entityMap={entityMap}
            selectedRelationId={selectedRelationId}
            onSelect={(relation) => selectEntity(relation.sourceId, relation.id)}
          />
        )}
      </section>

      {showBuildDialog && (
        <BuildGraphDialog
          documents={buildDocuments}
          scope={buildScope}
          selectedIds={selectedBuildDocumentIds}
          onScopeChange={handleBuildScopeChange}
          onSelectedIdsChange={setSelectedBuildDocumentIds}
          onClose={() => setShowBuildDialog(false)}
          onSubmit={startBuildGraph}
        />
      )}
    </div>
  );
}

function EntityDetailPanel({
  entity,
  relation,
  relations,
  entityMap,
  knowledgeBaseId,
  base,
  offset,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: {
  entity: GraphEntity | null;
  relation: GraphRelation | null;
  relations: GraphRelation[];
  entityMap: Map<string, GraphEntity>;
  knowledgeBaseId: string;
  base: (typeof DEFAULT_BASES)[number] | undefined;
  offset: { x: number; y: number };
  dragging: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerEnd: () => void;
}) {
  if (!entity) {
    return (
      <div
        className="absolute right-4 top-4 z-20 grid h-28 w-[min(320px,calc(100%-2rem))] place-items-center rounded-lg border border-border bg-background/95 p-4 text-[12px] text-muted-foreground shadow-xl backdrop-blur"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        请选择一个实体
      </div>
    );
  }

  const style = ENTITY_STYLES[entity.type];

  return (
    <div
      className={cn(
        "absolute right-4 top-4 z-20 max-h-[calc(100%-2rem)] w-[min(320px,calc(100%-2rem))] overflow-y-auto rounded-lg border border-border bg-background/95 shadow-xl backdrop-blur",
        dragging && "shadow-2xl",
      )}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <div
        className={cn(
          "flex touch-none cursor-grab items-start gap-3 border-b border-border p-4",
          dragging && "cursor-grabbing",
        )}
        onPointerDown={onPointerDown}
      >
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[12px] font-semibold"
          style={{ backgroundColor: style.fill, borderColor: style.stroke, color: style.text }}
        >
          {style.label.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-semibold text-foreground">{entity.name}</h3>
          <p className="mt-1 text-[12px] text-muted-foreground">{style.label}</p>
        </div>
      </div>

      <div className="p-4">
        <p className="text-[12px] leading-5 text-muted-foreground">{entity.description}</p>

        <div className="mt-4 space-y-3">
          <GraphSummaryRow label="实体 ID" value={entity.id} />
          <GraphSummaryRow label="知识库 ID" value={knowledgeBaseId} />
          <GraphSummaryRow label="来源" value={entity.source} />
          <GraphSummaryRow label="置信度" value={`${Math.round(entity.confidence * 100)}%`} />
        </div>

        <div className="mt-5 rounded-lg border border-border bg-background p-3">
          <div className="mb-3 flex items-center gap-2 text-[12px] font-medium text-foreground">
            <Database className="h-3.5 w-3.5 text-primary" />
            属性
          </div>
          <div className="space-y-2">
            {Object.entries(entity.properties).map(([key, value]) => (
              <GraphSummaryRow key={key} label={key} value={String(value)} />
            ))}
          </div>
        </div>

        {relation && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="mb-2 text-[12px] font-medium text-primary">当前关系</div>
            <p className="text-[12px] leading-5 text-muted-foreground">{relation.description}</p>
          </div>
        )}

        <div className="mt-4 rounded-lg border border-border bg-background p-3">
          <div className="mb-3 flex items-center gap-2 text-[12px] font-medium text-foreground">
            <Network className="h-3.5 w-3.5 text-primary" />
            关联关系
          </div>
          <div className="space-y-2">
            {relations.map((item) => {
              const source = entityMap.get(item.sourceId);
              const target = entityMap.get(item.targetId);

              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-md border border-border bg-card px-2.5 py-2 text-[12px]",
                    relation?.id === item.id && "border-primary/40 bg-primary/5",
                  )}
                >
                  <div className="font-medium text-foreground">{item.type}</div>
                  <div className="mt-1 text-muted-foreground">
                    {source?.name ?? item.sourceId} {"->"} {target?.name ?? item.targetId}
                  </div>
                </div>
              );
            })}
            {relations.length === 0 && <div className="text-[12px] text-muted-foreground">暂无关联关系</div>}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-background p-3">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-foreground">
            <UserRound className="h-3.5 w-3.5 text-primary" />
            知识库上下文
          </div>
          <p className="text-[12px] leading-5 text-muted-foreground">
            {base?.creator ?? "系统"} 最近更新于 {base?.updatedAt ?? "-"}，默认解析器为 {base?.parser ?? "-"}。
          </p>
        </div>
      </div>
    </div>
  );
}

function EntityTable({
  entities,
  relations,
  selectedEntityId,
  onSelect,
}: {
  entities: GraphEntity[];
  relations: GraphRelation[];
  selectedEntityId: string;
  onSelect: (entityId: string, relationId?: string | null) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const relationCountByEntity = useMemo(() => {
    const counts = new Map<string, number>();

    relations.forEach((relation) => {
      counts.set(relation.sourceId, (counts.get(relation.sourceId) ?? 0) + 1);
      counts.set(relation.targetId, (counts.get(relation.targetId) ?? 0) + 1);
    });

    return counts;
  }, [relations]);
  const totalPages = Math.max(1, Math.ceil(entities.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageEntities = entities.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [entities.length, pageSize]);

  return (
    <section className="bg-card">
      <div className="flex min-h-12 items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-[14px] font-semibold text-foreground">实体列表</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">点击实体后同步选中图谱节点</p>
        </div>
        <span className="font-mono text-[12px] text-muted-foreground">{entities.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1420px] text-left text-[13px]">
          <thead className="border-b border-border bg-surface-raised/50 text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="w-36 px-4 py-2 font-medium">ID</th>
              <th className="w-44 px-4 py-2 font-medium">实体名称</th>
              <th className="w-28 px-4 py-2 font-medium">实体类型</th>
              <th className="w-56 px-4 py-2 font-medium">属性</th>
              <th className="w-28 px-4 py-2 font-medium">关联关系数</th>
              <th className="w-72 px-4 py-2 font-medium">实体描述</th>
              <th className="w-44 px-4 py-2 font-medium">所属知识库</th>
              <th className="w-40 px-4 py-2 font-medium">所属文档</th>
              <th className="w-36 px-4 py-2 font-medium">来源Chunk</th>
              <th className="w-40 px-4 py-2 font-medium">创建时间</th>
              <th className="w-40 px-4 py-2 font-medium">更新时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageEntities.map((entity) => {
              const style = ENTITY_STYLES[entity.type];

              return (
                <tr
                  key={entity.id}
                  onClick={() => onSelect(entity.id, null)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    selectedEntityId === entity.id && "bg-primary/5",
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-[12px] text-muted-foreground">{entity.id}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{entity.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: style.fill, borderColor: style.stroke, color: style.text }}
                    >
                      {style.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[220px] truncate font-mono text-[11px] text-muted-foreground">
                      {formatProperties(entity.properties)}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    {relationCountByEntity.get(entity.id) ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[280px] truncate text-muted-foreground">{entity.description}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{entity.knowledgeBase}</td>
                  <td className="px-4 py-3 text-muted-foreground">{entity.document}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{entity.sourceChunk}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{entity.createdAt}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{entity.updatedAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PaginationBar
        page={safePage}
        pageSize={pageSize}
        total={entities.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </section>
  );
}

function RelationTable({
  relations,
  entityMap,
  selectedRelationId,
  onSelect,
}: {
  relations: GraphRelation[];
  entityMap: Map<string, GraphEntity>;
  selectedRelationId: string | null;
  onSelect: (relation: GraphRelation) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(relations.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRelations = relations.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [relations.length, pageSize]);

  return (
    <section className="bg-card">
      <div className="flex min-h-12 items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-[14px] font-semibold text-foreground">关系列表</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">点击关系后展示源实体和关系详情</p>
        </div>
        <span className="font-mono text-[12px] text-muted-foreground">{relations.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1320px] text-left text-[13px]">
          <thead className="border-b border-border bg-surface-raised/50 text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="w-44 px-4 py-2 font-medium">ID</th>
              <th className="w-40 px-4 py-2 font-medium">头实体</th>
              <th className="w-40 px-4 py-2 font-medium">尾实体</th>
              <th className="w-28 px-4 py-2 font-medium">关系类型</th>
              <th className="w-72 px-4 py-2 font-medium">关系描述</th>
              <th className="w-44 px-4 py-2 font-medium">所属知识库</th>
              <th className="w-40 px-4 py-2 font-medium">所属文档</th>
              <th className="w-36 px-4 py-2 font-medium">来源Chunk</th>
              <th className="w-40 px-4 py-2 font-medium">创建时间</th>
              <th className="w-40 px-4 py-2 font-medium">更新时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageRelations.map((relation) => (
              <tr
                key={relation.id}
                onClick={() => onSelect(relation)}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50",
                  selectedRelationId === relation.id && "bg-primary/5",
                )}
              >
                <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{relation.id}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {entityMap.get(relation.sourceId)?.name ?? relation.sourceId}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {entityMap.get(relation.targetId)?.name ?? relation.targetId}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{relation.type}</td>
                <td className="px-4 py-3">
                  <div className="max-w-[280px] truncate text-muted-foreground">{relation.description}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{relation.knowledgeBase}</td>
                <td className="px-4 py-3 text-muted-foreground">{relation.document}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{relation.sourceChunk}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{relation.createdAt}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{relation.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar
        page={safePage}
        pageSize={pageSize}
        total={relations.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </section>
  );
}

function BuildGraphDialog({
  documents,
  scope,
  selectedIds,
  onScopeChange,
  onSelectedIdsChange,
  onClose,
  onSubmit,
}: {
  documents: BuildGraphDocument[];
  scope: BuildScope;
  selectedIds: string[];
  onScopeChange: (scope: BuildScope) => void;
  onSelectedIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const allSelected = documents.length > 0 && documents.every((document) => selectedIds.includes(document.id));
  const selectedCount = documents.filter((document) => selectedIds.includes(document.id)).length;
  const submitDisabled = scope === "partial" && selectedCount === 0;

  const toggleAll = () => {
    if (allSelected) {
      onSelectedIdsChange([]);
      return;
    }

    onSelectedIdsChange(documents.map((document) => document.id));
  };

  const toggleDocument = (id: string) => {
    onSelectedIdsChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="flex max-h-[88vh] w-full max-w-[760px] flex-col overflow-hidden rounded-xl bg-card shadow-xl animate-fade-in">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <div>
            <h2 className="text-[16px] font-semibold text-foreground">构建图谱</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">选择参与本次图谱构建的文档范围</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <BuildScopeOption
              active={scope === "all"}
              title="全部文档"
              description={`构建当前知识库内全部 ${documents.length} 个文档`}
              onClick={() => onScopeChange("all")}
            />
            <BuildScopeOption
              active={scope === "partial"}
              title="部分文档"
              description="从文档列表中批量选择参与构建的文档"
              onClick={() => onScopeChange("partial")}
            />
          </div>

          {scope === "partial" && (
            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border bg-surface-raised/50 px-4 py-2">
                <div className="text-[13px] font-medium text-foreground">文档列表</div>
                <div className="font-mono text-[12px] text-muted-foreground">
                  已选 {selectedCount} / {documents.length}
                </div>
              </div>
              <div className="max-h-[340px] overflow-auto">
                <table className="w-full min-w-[720px] text-left text-[13px]">
                  <thead className="sticky top-0 z-10 border-b border-border bg-card text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="w-12 px-4 py-2 text-center font-medium">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          aria-label="选择全部文档"
                          className="h-3.5 w-3.5 rounded border-slate-300 align-middle accent-primary"
                        />
                      </th>
                      <th className="w-[44%] px-4 py-2 font-medium">文档名称</th>
                      <th className="w-24 px-4 py-2 font-medium">大小</th>
                      <th className="w-28 px-4 py-2 font-medium">解析状态</th>
                      <th className="w-28 px-4 py-2 font-medium">知识图谱状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {documents.map((document) => (
                      <tr
                        key={document.id}
                        onClick={() => toggleDocument(document.id)}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(document.id)}
                            onChange={() => toggleDocument(document.id)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`选择 ${document.name}`}
                            className="h-3.5 w-3.5 rounded border-slate-300 align-middle accent-primary"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          <div className="max-w-[330px] truncate" title={document.name}>
                            {document.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{document.size}</td>
                        <td className="px-4 py-3">
                          <DocumentStatusBadge status={document.parseStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <GraphBuildStatusBadge status={document.graphStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-border px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-input bg-card px-4 text-[13px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            开始构建
          </button>
        </div>
      </section>
    </div>
  );
}

function BuildScopeOption({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[72px] items-start gap-3 rounded-lg border bg-background px-3 py-3 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
          active ? "border-primary" : "border-slate-300",
        )}
      >
        {active && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-[12px] leading-5 text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const meta = DOCUMENT_STATUS_META[status];

  return (
    <span className={cn("inline-flex h-6 items-center rounded-full border px-2.5 text-[12px] font-medium", meta.className)}>
      {meta.label}
    </span>
  );
}

function GraphBuildStatusBadge({ status }: { status: GraphBuildStatus }) {
  const meta = GRAPH_BUILD_STATUS_META[status];

  return (
    <span className={cn("inline-flex h-6 items-center rounded-full border px-2.5 text-[12px] font-medium", meta.className)}>
      {meta.label}
    </span>
  );
}

function GraphTabButton({
  active,
  icon,
  label,
  meta,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-[12px] font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          "rounded px-1.5 py-0.5 font-mono text-[10px]",
          active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {meta}
      </span>
    </button>
  );
}

function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="font-mono">
        {start}-{end} / {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>每页</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-7 rounded-md border border-border bg-background px-2 text-[12px] text-foreground outline-none transition-colors focus:border-primary"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span>条</span>
        <div className="ml-1 inline-flex overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label="上一页"
            className="grid h-7 w-8 place-items-center bg-background text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="grid h-7 min-w-14 place-items-center border-x border-border bg-background px-2 font-mono text-[11px] text-foreground">
            {page} / {totalPages}
          </div>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            aria-label="下一页"
            className="grid h-7 w-8 place-items-center bg-background text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatProperties(properties: GraphEntity["properties"]) {
  return Object.entries(properties)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}

function getRelationEndpoints(source: GraphEntity, target: GraphEntity) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy) || 1;
  const ux = dx / distance;
  const uy = dy / distance;
  const sourceRadius = getNodeRadius(source) + 4;
  const targetRadius = getNodeRadius(target) + 10;

  return {
    x1: source.x + ux * sourceRadius,
    y1: source.y + uy * sourceRadius,
    x2: target.x - ux * targetRadius,
    y2: target.y - uy * targetRadius,
  };
}

function getNodeRadius(entity: GraphEntity) {
  return entity.type === "knowledgeBase" ? 54 : 40;
}

function GraphEntityNode({
  entity,
  selected,
  dragging,
  onPointerDown,
}: {
  entity: GraphEntity;
  selected: boolean;
  dragging: boolean;
  onPointerDown: (event: ReactPointerEvent<SVGGElement>, entity: GraphEntity) => void;
}) {
  const style = ENTITY_STYLES[entity.type];
  const radius = getNodeRadius(entity);

  return (
    <g
      className={cn("cursor-grab", dragging && "cursor-grabbing")}
      onPointerDown={(event) => onPointerDown(event, entity)}
    >
      <circle
        cx={entity.x}
        cy={entity.y}
        r={radius}
        fill={style.fill}
        stroke={selected ? "#2563eb" : style.stroke}
        strokeWidth={selected ? "3.5" : "2"}
        filter={selected ? "drop-shadow(0 7px 14px rgb(37 99 235 / 0.24))" : undefined}
      />
      <text
        x={entity.x}
        y={entity.y + 4}
        textAnchor="middle"
        className={cn("select-none text-[12px] font-medium", entity.type === "knowledgeBase" && "text-[13px]")}
        fill={style.text}
      >
        {trimSvgLabel(entity.name)}
      </text>
      <text
        x={entity.x}
        y={entity.y + radius + 18}
        textAnchor="middle"
        className="select-none fill-slate-500 text-[10px]"
      >
        {style.label}
      </text>
    </g>
  );
}

function GraphSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-mono text-[12px] text-foreground">{value}</div>
    </div>
  );
}

function buildGraphDocuments(
  name: string,
  base: (typeof DEFAULT_BASES)[number] | undefined,
): BuildGraphDocument[] {
  const count = Math.min(Math.max(base?.documents ?? 2, 2), 12);
  const documentNames = [
    `${name}说明文档.pdf`,
    `${name}操作手册.docx`,
    `${name}常见问题.md`,
    `${name}流程规范.pdf`,
    `${name}接口资料.xlsx`,
    `${name}培训材料.pptx`,
    `${name}维护记录.docx`,
    `${name}数据字典.xlsx`,
    `${name}部署指南.pdf`,
    `${name}版本说明.md`,
    `${name}安全规范.pdf`,
    `${name}验收报告.docx`,
  ];
  const sizes = ["5.1 MB", "12.4 MB", "860 KB", "8.7 MB", "2.3 MB", "18.6 MB", "1.6 MB", "940 KB", "6.8 MB", "720 KB", "4.5 MB", "3.2 MB"];
  const parseStatuses: DocumentStatus[] = ["parsed", "parsed", "parsing", "parsed", "failed", "unparsed"];
  const graphStatuses: GraphBuildStatus[] = ["generated", "pending", "building", "generated", "failed", "pending"];

  return Array.from({ length: count }, (_, index) => ({
    id: `build-doc-${index + 1}`,
    name: documentNames[index] ?? `${name}文档 ${index + 1}.pdf`,
    size: sizes[index % sizes.length],
    parseStatus: parseStatuses[index % parseStatuses.length],
    graphStatus: graphStatuses[index % graphStatuses.length],
  }));
}

function buildGraphData(name: string, base: (typeof DEFAULT_BASES)[number] | undefined): GraphData {
  const documentCount = base?.documents ?? 0;
  const chunkCount = base?.chunks ?? 0;
  const entityCount = Math.max(8, documentCount * 4 + Math.ceil(chunkCount / 8));
  const relationCount = Math.max(10, documentCount * 5 + Math.ceil(chunkCount / 5));
  const docNodeCount = Math.min(Math.max(documentCount, 2), 6);
  const createdAt = base?.createdAt ?? "-";
  const updatedAt = base?.updatedAt ?? "-";
  const coreDocumentName = "核心文档";
  const auditFields = (document: string, sourceChunk: string) => ({
    knowledgeBase: name,
    document,
    sourceChunk,
    createdAt,
    updatedAt,
  });

  const entities: GraphEntity[] = [
    {
      id: "entity-base",
      name,
      type: "knowledgeBase",
      description: "当前知识库的中心实体，连接文档、切片、主题、解析策略和创建人。",
      source: "知识库配置",
      confidence: 0.99,
      properties: {
        documents: documentCount,
        chunks: chunkCount,
        capacity: base?.sizeCapacity ?? "-",
        access: base?.access === "public" ? "公开" : "私有",
      },
      ...auditFields("-", "-"),
      x: 450,
      y: 255,
    },
    {
      id: "entity-parser",
      name: base?.parser ?? "默认解析策略",
      type: "parser",
      description: "用于解析知识库文档并生成分片的默认策略。",
      source: "解析配置",
      confidence: 0.94,
      properties: {
        parser: base?.parser ?? "-",
        pdfParser: base?.pdfParser ?? "-",
        chunkSize: base?.chunkSize ?? "-",
      },
      ...auditFields("-", "-"),
      x: 450,
      y: 84,
    },
    {
      id: "entity-owner",
      name: base?.creator ?? "创建人",
      type: "owner",
      description: "负责创建或维护该知识库的用户。",
      source: "知识库元数据",
      confidence: 0.92,
      properties: {
        creator: base?.creator ?? "-",
        createdAt: base?.createdAt ?? "-",
        updatedAt: base?.updatedAt ?? "-",
      },
      ...auditFields("-", "-"),
      x: 450,
      y: 430,
    },
    {
      id: "entity-chunks",
      name: `${chunkCount} 个切片`,
      type: "chunk",
      description: "由知识库文档解析后形成的文本切片集合，是检索和图谱构建的基础。",
      source: "文档分片",
      confidence: 0.9,
      properties: {
        chunks: chunkCount,
        averageChunkSize: base?.chunkSize ?? 512,
        strategy: base?.parser ?? "-",
      },
      ...auditFields(coreDocumentName, "chunk-001~chunk-010"),
      x: 720,
      y: 255,
    },
    {
      id: "entity-topic",
      name: inferTopicName(name),
      type: "topic",
      description: "根据知识库名称和文档信息推断出的核心主题实体。",
      source: "前端 mock 推断",
      confidence: 0.86,
      properties: {
        keyword: inferTopicName(name),
        documents: documentCount,
        evidence: `${Math.max(documentCount, 1)} 个文档组`,
      },
      ...auditFields(coreDocumentName, "chunk-001"),
      x: 705,
      y: 105,
    },
  ];

  const documentEntities = Array.from({ length: docNodeCount }, (_, index): GraphEntity => ({
    id: `entity-doc-${index + 1}`,
    name: index === 0 ? coreDocumentName : `文档组 ${index + 1}`,
    type: "document",
    description:
      index === 0
        ? "该知识库中权重最高的核心文档集合。"
        : `按来源和语义聚合形成的第 ${index + 1} 个文档组。`,
    source: "知识库文档",
    confidence: Number((0.91 - index * 0.03).toFixed(2)),
    properties: {
      documentCount: index === 0 ? Math.max(1, documentCount - docNodeCount + 1) : 1,
      estimatedChunks: Math.max(1, Math.round(chunkCount / docNodeCount)),
      parser: base?.parser ?? "-",
    },
    ...auditFields(index === 0 ? coreDocumentName : `文档组 ${index + 1}`, `chunk-${String(index + 1).padStart(3, "0")}`),
    x: 168,
    y: 110 + index * 90,
  }));

  const chunkEntities = Array.from({ length: Math.min(4, Math.max(2, Math.ceil(chunkCount / 80))) }, (_, index): GraphEntity => ({
    id: `entity-chunk-${index + 1}`,
    name: `关键切片 ${index + 1}`,
    type: "chunk",
    description: `从知识库中抽样得到的第 ${index + 1} 个高权重切片实体。`,
    source: "文档分片",
    confidence: Number((0.87 - index * 0.03).toFixed(2)),
    properties: {
      chunkIndex: index + 1,
      tokens: Math.max(180, Math.round((base?.chunkSize ?? 512) * (0.72 + index * 0.06))),
      parser: base?.parser ?? "-",
    },
    ...auditFields(
      index < documentEntities.length ? documentEntities[index].document : coreDocumentName,
      `chunk-${String(index + 11).padStart(3, "0")}`,
    ),
    x: 640 + (index % 2) * 105,
    y: 330 + Math.floor(index / 2) * 76,
  }));

  entities.push(...documentEntities, ...chunkEntities);

  const relations: GraphRelation[] = [
    {
      id: "relation-parser-base",
      sourceId: "entity-parser",
      targetId: "entity-base",
      type: "解析",
      description: "解析策略作用于知识库，决定文档解析和切片方式。",
      confidence: 0.94,
      ...auditFields("-", "-"),
    },
    {
      id: "relation-base-owner",
      sourceId: "entity-base",
      targetId: "entity-owner",
      type: "创建",
      description: "知识库由该用户创建或维护。",
      confidence: 0.92,
      ...auditFields("-", "-"),
    },
    {
      id: "relation-base-chunks",
      sourceId: "entity-base",
      targetId: "entity-chunks",
      type: "切分",
      description: "知识库文档解析后生成切片集合。",
      confidence: 0.9,
      ...auditFields(coreDocumentName, "chunk-001~chunk-010"),
    },
    {
      id: "relation-topic-base",
      sourceId: "entity-topic",
      targetId: "entity-base",
      type: "归属主题",
      description: "主题实体由知识库名称和文档语义推断得到。",
      confidence: 0.86,
      ...auditFields(coreDocumentName, "chunk-001"),
    },
    {
      id: "relation-topic-chunks",
      sourceId: "entity-topic",
      targetId: "entity-chunks",
      type: "证据",
      description: "切片内容为主题实体提供语义证据。",
      confidence: 0.84,
      ...auditFields(coreDocumentName, "chunk-001"),
    },
    ...documentEntities.map((entity, index): GraphRelation => ({
      id: `relation-${entity.id}-base`,
      sourceId: entity.id,
      targetId: "entity-base",
      type: index === 0 ? "构建" : "补充",
      description:
        index === 0 ? "核心文档用于构建知识库主干实体。" : `${entity.name} 为知识库补充上下文信息。`,
      confidence: Number((0.91 - index * 0.04).toFixed(2)),
      ...auditFields(entity.document, entity.sourceChunk),
    })),
    ...documentEntities.slice(0, 2).map((entity, index): GraphRelation => ({
      id: `relation-${entity.id}-chunks`,
      sourceId: entity.id,
      targetId: "entity-chunks",
      type: "生成切片",
      description: `${entity.name} 解析后产生可检索切片。`,
      confidence: Number((0.88 - index * 0.03).toFixed(2)),
      ...auditFields(entity.document, entity.sourceChunk),
    })),
    ...chunkEntities.map((entity, index): GraphRelation => ({
      id: `relation-${entity.id}-topic`,
      sourceId: entity.id,
      targetId: "entity-topic",
      type: "支撑主题",
      description: `${entity.name} 为核心主题提供局部证据。`,
      confidence: Number((0.83 - index * 0.03).toFixed(2)),
      ...auditFields(entity.document, entity.sourceChunk),
    })),
  ];

  return { entities, relations, entityCount, relationCount };
}

function getGraphPoint(
  event: ReactPointerEvent<SVGSVGElement | SVGGElement>,
  svg: SVGSVGElement | null,
  zoom: number,
) {
  if (!svg) return { x: 0, y: 0 };
  const rect = svg.getBoundingClientRect();
  const rawX = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
  const rawY = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
  const translateX = CANVAS_WIDTH / 2 - (CANVAS_WIDTH / 2) * zoom;
  const translateY = CANVAS_HEIGHT / 2 - (CANVAS_HEIGHT / 2) * zoom;

  return {
    x: (rawX - translateX) / zoom,
    y: (rawY - translateY) / zoom,
  };
}

function inferTopicName(name: string) {
  const trimmed = name.replace(/[_-]+/g, " ").trim();
  if (!trimmed) return "核心主题";
  if (trimmed.length <= 12) return `${trimmed}主题`;
  return `${trimmed.slice(0, 10)}主题`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function trimSvgLabel(label: string) {
  return label.length > 10 ? `${label.slice(0, 9)}...` : label;
}
