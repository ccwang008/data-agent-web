import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode, WheelEvent as ReactWheelEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Activity,
  ArrowLeft,
  Boxes,
  Database,
  Eye,
  FileText,
  GitBranch,
  Layers3,
  Loader2,
  RefreshCw,
  RotateCw,
  Search,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import { mockClient } from "@/lib/mock-client";
import { cn } from "@/lib/utils";

import type {
  VectorOperationResult,
  VectorRecord,
  VectorRecordStatus,
  VectorRecordType,
} from "../api/mock";

type VectorPageLocationState = { knowledgeBaseId?: string; name?: string } | null;
type VectorTabKey = VectorRecordType | "visualization";
type VectorProjectionPoint = { record: VectorRecord; x: number; y: number };
type VisualizationAlgorithm = "pca" | "tsne" | "umap";
type VisualizationColorMode = "type" | "query";
type VisualizationSidePanel = "detail" | "health";
type VectorHealthMetrics = {
  duplicateVectors: number;
  isolatedPoints: number;
  vectorDensity: string;
  clusterCount: number;
  abnormalVectors: number;
  blankContent: number;
  shortText: number;
};

const TYPE_TABS: Array<{ key: VectorTabKey; label: string; icon: ReactNode }> = [
  { key: "chunk", label: "Chunk", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "entity", label: "实体", icon: <Boxes className="h-3.5 w-3.5" /> },
  { key: "relation", label: "关系", icon: <GitBranch className="h-3.5 w-3.5" /> },
  { key: "visualization", label: "可视化", icon: <Layers3 className="h-3.5 w-3.5" /> },
];

const STATUS_LABELS: Record<VectorRecordStatus, string> = {
  ready: "就绪",
  vectorizing: "向量化中",
  failed: "失败",
  deleted: "已删除",
};

const STATUS_CLASSES: Record<VectorRecordStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  vectorizing: "border-blue-200 bg-blue-50 text-blue-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  deleted: "border-slate-200 bg-slate-50 text-slate-600",
};

const VISUALIZATION_WIDTH = 920;
const VISUALIZATION_HEIGHT = 560;
const VISUALIZATION_ZOOM_MIN = 0.6;
const VISUALIZATION_ZOOM_MAX = 2.2;
const VISUALIZATION_SIMILAR_LIMIT = 8;
const VISUALIZATION_ALGORITHM_OPTIONS: Array<{ value: VisualizationAlgorithm; label: string; axisX: string; axisY: string }> = [
  { value: "pca", label: "PCA", axisX: "PCA1", axisY: "PCA2" },
  { value: "tsne", label: "t-SNE", axisX: "TSNE1", axisY: "TSNE2" },
  { value: "umap", label: "UMAP", axisX: "UMAP1", axisY: "UMAP2" },
];
const VISUALIZATION_COLOR_MODE_OPTIONS: Array<{ value: VisualizationColorMode; label: string }> = [
  { value: "type", label: "按类型着色" },
  { value: "query", label: "按查询着色" },
];
const VISUALIZATION_TYPE_META: Record<VectorRecordType, { label: string; color: string; radius: number }> = {
  chunk: { label: "Chunk", color: "#2563eb", radius: 7 },
  entity: { label: "实体", color: "#7c3aed", radius: 8 },
  relation: { label: "关系", color: "#f97316", radius: 8 },
};
const VISUALIZATION_QUERY_META = {
  other: { label: "Other knowledge", color: "#1d4ed8", radius: 6 },
  similar: { label: "Similar knowledge", color: "#ef4444", radius: 7 },
  query: { label: "Query", color: "#15803d", radius: 9 },
};

export function KnowledgeVectorsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as VectorPageLocationState;
  const sourceKnowledgeBaseId = locationState?.knowledgeBaseId;
  const sourceKnowledgeBaseName = locationState?.name;
  const [records, setRecords] = useState<VectorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<VectorTabKey>("chunk");
  const [knowledgeBaseId, setKnowledgeBaseId] = useState(sourceKnowledgeBaseId ?? "all");
  const [keyword, setKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedVisualizationId, setSelectedVisualizationId] = useState<string | null>(null);
  const [visualizationZoom, setVisualizationZoom] = useState(1);
  const [visualizationPan, setVisualizationPan] = useState({ x: 0, y: 0 });
  const [detailRecord, setDetailRecord] = useState<VectorRecord | null>(null);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[] | null>(null);
  const [, setRevectorizingIds] = useState<string[]>([]);
  const visualizationPanStartRef = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null);

  const loadRecords = () => {
    setLoading(true);
    void mockClient
      .get<VectorRecord[]>("/api/knowledge-center/vector-records", { latencyMs: 180 })
      .then(setRecords)
      .finally(() => setLoading(false));
  };

  useEffect(loadRecords, []);

  const knowledgeBases = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((record) => map.set(record.knowledgeBaseId, record.knowledgeBaseName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [records]);

  useEffect(() => {
    if (knowledgeBaseId === "all" && knowledgeBases[0]) {
      setKnowledgeBaseId(knowledgeBases[0].id);
    }
  }, [knowledgeBaseId, knowledgeBases]);

  const scopedByKnowledgeBase = useMemo(
    () =>
      records.filter((record) =>
        knowledgeBaseId === "all" ? true : record.knowledgeBaseId === knowledgeBaseId,
      ),
    [knowledgeBaseId, records],
  );

  const filteredRecords = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    return scopedByKnowledgeBase
      .filter((record) => activeType === "visualization" || record.type === activeType)
      .filter((record) => {
        if (!normalized || activeType === "visualization") return true;
        return `${record.id} ${record.sourceTitle} ${record.content} ${JSON.stringify(record.metadata)}`
          .toLowerCase()
          .includes(normalized);
      });
  }, [activeType, keyword, scopedByKnowledgeBase]);

  useEffect(() => {
    if (activeType !== "visualization") return;

    if (!filteredRecords.length) {
      setSelectedVisualizationId(null);
      return;
    }

    if (!selectedVisualizationId || !filteredRecords.some((record) => record.id === selectedVisualizationId)) {
      setSelectedVisualizationId(filteredRecords[0].id);
    }
  }, [activeType, filteredRecords, selectedVisualizationId]);

  const selectedInView = selectedIds.filter((id) => filteredRecords.some((record) => record.id === id));
  const allSelected =
    filteredRecords.length > 0 && filteredRecords.every((record) => selectedIds.includes(record.id));

  const stats = useMemo(() => {
    const scoped = scopedByKnowledgeBase.filter((record) => record.status !== "deleted");
    const projectionPoints = buildVectorProjection(scoped, "tsne");

    return {
      total: scoped.length,
      chunks: scoped.filter((record) => record.type === "chunk").length,
      entities: scoped.filter((record) => record.type === "entity").length,
      relations: scoped.filter((record) => record.type === "relation").length,
      duplicateVectors: getDuplicateVectorCount(scoped),
      vectorVariance: getVectorVariance(scoped),
      clusterCount: getAdaptiveProjectionClusterCount(projectionPoints),
    };
  }, [scopedByKnowledgeBase]);
  const duplicateRate = stats.total ? `${stats.duplicateVectors}/${stats.total}` : "0/0";

  const resetSelection = () => setSelectedIds([]);

  const handleTypeChange = (type: VectorTabKey) => {
    setActiveType(type);
    resetSelection();
  };

  const resetVisualizationView = () => {
    setVisualizationZoom(1);
    setVisualizationPan({ x: 0, y: 0 });
  };

  const handleVisualizationWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.12 : 0.12;
    setVisualizationZoom((current) =>
      Math.min(VISUALIZATION_ZOOM_MAX, Math.max(VISUALIZATION_ZOOM_MIN, Number((current + delta).toFixed(2)))),
    );
  };

  const handleVisualizationMouseDown = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    visualizationPanStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: visualizationPan.x,
      y: visualizationPan.y,
    };
  };

  const handleVisualizationMouseMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    const start = visualizationPanStartRef.current;
    if (!start) return;
    setVisualizationPan({
      x: start.x + event.clientX - start.clientX,
      y: start.y + event.clientY - start.clientY,
    });
  };

  const stopVisualizationPan = () => {
    visualizationPanStartRef.current = null;
  };

  const toggleAll = () => {
    setSelectedIds((current) => {
      const visibleIds = filteredRecords.map((record) => record.id);
      if (visibleIds.every((id) => current.includes(id))) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const toggleRecord = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const confirmDelete = async () => {
    if (!deleteTargetIds?.length) return;
    const ids = deleteTargetIds;

    await mockClient.post<VectorOperationResult>(
      "/api/knowledge-center/vector-records/delete",
      { ids },
      { latencyMs: 160 },
    );
    setRecords((current) => current.filter((record) => !ids.includes(record.id)));
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
    if (detailRecord && ids.includes(detailRecord.id)) setDetailRecord(null);
    setDeleteTargetIds(null);
  };

  const revectorize = async (ids: string[]) => {
    if (!ids.length) return;
    setRevectorizingIds(ids);
    setRecords((current) =>
      current.map((record) => (ids.includes(record.id) ? { ...record, status: "vectorizing" } : record)),
    );

    await mockClient.post<VectorOperationResult>(
      "/api/knowledge-center/vector-records/revectorize",
      { ids },
      { latencyMs: 360 },
    );

    window.setTimeout(() => {
      setRecords((current) =>
        current.map((record) =>
          ids.includes(record.id)
            ? { ...record, status: "ready", updatedAt: formatDateTime(new Date()) }
            : record,
        ),
      );
      setRevectorizingIds([]);
    }, 620);
  };

  const goBack = () => {
    if (sourceKnowledgeBaseId) {
      navigate(`/knowledge-center/knowledge-bases/${sourceKnowledgeBaseId}`, {
        state: sourceKnowledgeBaseName ? { name: sourceKnowledgeBaseName } : undefined,
      });
      return;
    }

    navigate("/knowledge-center/knowledge-bases");
  };
  const currentKnowledgeBaseName =
    sourceKnowledgeBaseName ?? knowledgeBases.find((base) => base.id === knowledgeBaseId)?.name ?? "知识库";

  return (
    <div className="page-shell animate-fade-in">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="返回知识库详情"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-card text-slate-500 transition-colors hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-[18px] font-semibold text-foreground">知识向量</h1>
            <p className="mt-1 truncate text-[12px] text-muted-foreground">{currentKnowledgeBaseName}</p>
          </div>
        </div>
        <div className="flex w-fit flex-wrap items-center gap-2">
          <label className="flex h-8 w-[260px] min-w-0 items-center gap-2 rounded-lg border border-input bg-card px-3 text-[12px] text-muted-foreground">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
              placeholder="搜索 ID / 名称 / 内容"
            />
          </label>
          <button
            type="button"
            onClick={loadRecords}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-input bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            刷新
          </button>
        </div>
      </header>

      <section className="mb-4 grid gap-3 md:grid-cols-4">
        <Metric
          description="展示当前知识库内向量总数以及 Chunk、实体、关系三类向量的数量分布。"
          icon={<Database className="h-4 w-4" />}
          label="向量分布"
          value={
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px]">
              <span>
                <span className="text-muted-foreground">总数</span>{" "}
                <span className="text-[18px] font-semibold text-foreground">{stats.total}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Chunk</span>{" "}
                <span className="text-[18px] font-semibold text-foreground">{stats.chunks}</span>
              </span>
              <span>
                <span className="text-muted-foreground">实体</span>{" "}
                <span className="text-[18px] font-semibold text-foreground">{stats.entities}</span>
              </span>
              <span>
                <span className="text-muted-foreground">关系</span>{" "}
                <span className="text-[18px] font-semibold text-foreground">{stats.relations}</span>
              </span>
            </span>
          }
        />
        <Metric
          description="重复向量按余弦相似度 > 99.5% 统计，展示格式为重复向量数 / 全部向量数。"
          icon={<AlertCircle className="h-4 w-4" />}
          label="向量重复率"
          value={duplicateRate}
        />
        <Metric
          description="向量方差表示向量在语义空间中的分散程度，基于向量到均值向量的平均平方距离计算；数值越大，语义覆盖越分散。"
          icon={<Zap className="h-4 w-4" />}
          label="向量方差"
          value={stats.vectorVariance.toFixed(4)}
        />
        <Metric
          description="聚类数量表示知识库中自动归纳出的主题数量，当前基于 mock 二维投影的近邻连通关系估算。"
          icon={<Layers3 className="h-4 w-4" />}
          label="聚类数量"
          value={stats.clusterCount}
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-border">
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTypeChange(tab.key)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 px-4 text-[12px] transition-colors",
                    activeType === tab.key
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            {activeType !== "visualization" && (
              <span className="text-[12px] text-muted-foreground">已选 {selectedInView.length} 条</span>
            )}
          </div>

          <div className="text-[12px] text-muted-foreground">
            {activeType === "visualization" ? "右上角搜索可定位散点" : `共 ${filteredRecords.length} 条`}
          </div>
        </div>

        <div className="flex flex-col gap-0">
          <div className="min-w-0 flex-1">
            <div className="overflow-x-auto px-4">
              {activeType === "visualization" && (
                <VectorVisualizationPanel
                  allRecords={records}
                  loading={loading}
                  pan={visualizationPan}
                  records={filteredRecords}
                  searchKeyword={keyword}
                  selectedId={selectedVisualizationId}
                  zoom={visualizationZoom}
                  onMouseDown={handleVisualizationMouseDown}
                  onMouseLeave={stopVisualizationPan}
                  onMouseMove={handleVisualizationMouseMove}
                  onMouseUp={stopVisualizationPan}
                  onPanChange={setVisualizationPan}
                  onResetView={resetVisualizationView}
                  onSelect={setSelectedVisualizationId}
                  onWheel={handleVisualizationWheel}
                />
              )}

              {activeType === "chunk" && (
                <table className="w-full min-w-[1620px] border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="text-[12px] font-medium text-slate-600">
                      <SelectionHeaderCell checked={allSelected} onChange={toggleAll} />
                      <HeaderCell className="w-[190px]">ID</HeaderCell>
                      <HeaderCell className="w-[360px]">内容</HeaderCell>
                      <HeaderCell className="w-[110px]">Chunk大小</HeaderCell>
                      <HeaderCell className="w-[170px]">所属知识库</HeaderCell>
                      <HeaderCell className="w-[220px]">所属文档</HeaderCell>
                      <HeaderCell className="w-[170px]">向量模型</HeaderCell>
                      <HeaderCell className="w-[100px]">向量维度</HeaderCell>
                      <HeaderCell className="w-[150px]">创建时间</HeaderCell>
                      <HeaderCell className="w-[150px]">更新时间</HeaderCell>
                      <HeaderCell className="w-[96px] text-center">操作</HeaderCell>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="text-[13px] text-foreground">
                        <SelectionDataCell
                          checked={selectedIds.includes(record.id)}
                          label={`选择 ${record.sourceTitle}`}
                          onChange={() => toggleRecord(record.id)}
                        />
                        <DataCell className="font-mono text-[12px] text-muted-foreground">{record.id}</DataCell>
                        <DataCell>
                          <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-600">{record.content}</p>
                        </DataCell>
                        <DataCell className="tabular-nums">{getChunkSize(record)}</DataCell>
                        <DataCell>{record.knowledgeBaseName}</DataCell>
                        <DataCell>
                          <MutedText>{getDocumentName(record)}</MutedText>
                        </DataCell>
                        <DataCell>{record.embeddingModel}</DataCell>
                        <DataCell className="tabular-nums">{record.dimension}</DataCell>
                        <DataCell className="tabular-nums">{getCreatedAt(record)}</DataCell>
                        <DataCell className="tabular-nums">{record.updatedAt}</DataCell>
                        <OperationCell
                          record={record}
                          onDetail={() => setDetailRecord(record)}
                          onRevectorize={() => void revectorize([record.id])}
                          onDelete={() => setDeleteTargetIds([record.id])}
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeType === "entity" && (
                <table className="w-full min-w-[2300px] border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="text-[12px] font-medium text-slate-600">
                      <SelectionHeaderCell checked={allSelected} onChange={toggleAll} />
                      <HeaderCell className="w-[180px]">ID</HeaderCell>
                      <HeaderCell className="w-[180px]">实体名称</HeaderCell>
                      <HeaderCell className="w-[130px]">实体类型</HeaderCell>
                      <HeaderCell className="w-[240px]">属性</HeaderCell>
                      <HeaderCell className="w-[120px]">关联关系数</HeaderCell>
                      <HeaderCell className="w-[320px]">实体描述</HeaderCell>
                      <HeaderCell className="w-[170px]">所属知识库</HeaderCell>
                      <HeaderCell className="w-[220px]">所属文档</HeaderCell>
                      <HeaderCell className="w-[150px]">来源Chunk</HeaderCell>
                      <HeaderCell className="w-[170px]">向量模型</HeaderCell>
                      <HeaderCell className="w-[100px]">向量维度</HeaderCell>
                      <HeaderCell className="w-[150px]">创建时间</HeaderCell>
                      <HeaderCell className="w-[150px]">更新时间</HeaderCell>
                      <HeaderCell className="w-[96px] text-center">操作</HeaderCell>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="text-[13px] text-foreground">
                        <SelectionDataCell
                          checked={selectedIds.includes(record.id)}
                          label={`选择 ${record.sourceTitle}`}
                          onChange={() => toggleRecord(record.id)}
                        />
                        <DataCell className="font-mono text-[12px] text-muted-foreground">{getEntityId(record)}</DataCell>
                        <DataCell className="font-medium">{getEntityName(record)}</DataCell>
                        <DataCell>{getEntityType(record)}</DataCell>
                        <DataCell>
                          <MetadataPreview value={getEntityProperties(record)} />
                        </DataCell>
                        <DataCell className="tabular-nums">{getRelationCount(record, records)}</DataCell>
                        <DataCell>
                          <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-600">{record.content}</p>
                        </DataCell>
                        <DataCell>{record.knowledgeBaseName}</DataCell>
                        <DataCell>
                          <MutedText>{getDocumentName(record, records)}</MutedText>
                        </DataCell>
                        <DataCell className="font-mono text-[12px] text-muted-foreground">
                          {getSourceChunk(record, records)}
                        </DataCell>
                        <DataCell>{record.embeddingModel}</DataCell>
                        <DataCell className="tabular-nums">{record.dimension}</DataCell>
                        <DataCell className="tabular-nums">{getCreatedAt(record)}</DataCell>
                        <DataCell className="tabular-nums">{record.updatedAt}</DataCell>
                        <OperationCell
                          record={record}
                          onDetail={() => setDetailRecord(record)}
                          onRevectorize={() => void revectorize([record.id])}
                          onDelete={() => setDeleteTargetIds([record.id])}
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeType === "relation" && (
                <table className="w-full min-w-[2160px] border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="text-[12px] font-medium text-slate-600">
                      <SelectionHeaderCell checked={allSelected} onChange={toggleAll} />
                      <HeaderCell className="w-[180px]">ID</HeaderCell>
                      <HeaderCell className="w-[170px]">头实体</HeaderCell>
                      <HeaderCell className="w-[170px]">尾实体</HeaderCell>
                      <HeaderCell className="w-[140px]">关系类型</HeaderCell>
                      <HeaderCell className="w-[340px]">关系描述</HeaderCell>
                      <HeaderCell className="w-[170px]">所属知识库</HeaderCell>
                      <HeaderCell className="w-[220px]">所属文档</HeaderCell>
                      <HeaderCell className="w-[150px]">来源Chunk</HeaderCell>
                      <HeaderCell className="w-[170px]">向量模型</HeaderCell>
                      <HeaderCell className="w-[100px]">向量维度</HeaderCell>
                      <HeaderCell className="w-[150px]">创建时间</HeaderCell>
                      <HeaderCell className="w-[150px]">更新时间</HeaderCell>
                      <HeaderCell className="w-[96px] text-center">操作</HeaderCell>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="text-[13px] text-foreground">
                        <SelectionDataCell
                          checked={selectedIds.includes(record.id)}
                          label={`选择 ${record.sourceTitle}`}
                          onChange={() => toggleRecord(record.id)}
                        />
                        <DataCell className="font-mono text-[12px] text-muted-foreground">{getRelationId(record)}</DataCell>
                        <DataCell className="font-medium">{getHeadEntity(record)}</DataCell>
                        <DataCell className="font-medium">{getTailEntity(record)}</DataCell>
                        <DataCell>{getRelationType(record)}</DataCell>
                        <DataCell>
                          <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-600">{record.content}</p>
                        </DataCell>
                        <DataCell>{record.knowledgeBaseName}</DataCell>
                        <DataCell>
                          <MutedText>{getDocumentName(record, records)}</MutedText>
                        </DataCell>
                        <DataCell className="font-mono text-[12px] text-muted-foreground">
                          {getSourceChunk(record, records)}
                        </DataCell>
                        <DataCell>{record.embeddingModel}</DataCell>
                        <DataCell className="tabular-nums">{record.dimension}</DataCell>
                        <DataCell className="tabular-nums">{getCreatedAt(record)}</DataCell>
                        <DataCell className="tabular-nums">{record.updatedAt}</DataCell>
                        <OperationCell
                          record={record}
                          onDetail={() => setDetailRecord(record)}
                          onRevectorize={() => void revectorize([record.id])}
                          onDelete={() => setDeleteTargetIds([record.id])}
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeType !== "visualization" && !loading && filteredRecords.length === 0 && (
                <div className="grid h-48 place-items-center border-t border-border text-[13px] text-muted-foreground">
                  暂无匹配向量
                </div>
              )}
              {activeType !== "visualization" && loading && (
                <div className="grid h-48 place-items-center border-t border-border text-[13px] text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    加载向量数据
                  </span>
                </div>
              )}
            </div>

            {activeType !== "visualization" && (
              <div className="flex min-h-[48px] flex-col gap-3 border-t border-border px-4 py-3 text-[13px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  显示 {filteredRecords.length ? 1 : 0}-{filteredRecords.length} 条，共 {filteredRecords.length} 条
                </span>
                <div className="flex items-center justify-end gap-3">
                  <button type="button" className="text-slate-400" disabled>
                    上一页
                  </button>
                  <span className="font-medium text-foreground">1 / 1</span>
                  <button type="button" className="text-slate-400" disabled>
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {detailRecord && <VectorDetailDrawer record={detailRecord} onClose={() => setDetailRecord(null)} />}

      {deleteTargetIds && (
        <ConfirmDialog
          count={deleteTargetIds.length}
          onClose={() => setDeleteTargetIds(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}

function VectorVisualizationPanel({
  allRecords,
  loading,
  pan,
  records,
  searchKeyword,
  selectedId,
  zoom,
  onMouseDown,
  onMouseLeave,
  onMouseMove,
  onMouseUp,
  onPanChange,
  onResetView,
  onSelect,
  onWheel,
}: {
  allRecords: VectorRecord[];
  loading: boolean;
  pan: { x: number; y: number };
  records: VectorRecord[];
  searchKeyword: string;
  selectedId: string | null;
  zoom: number;
  onMouseDown: (event: ReactMouseEvent<SVGSVGElement>) => void;
  onMouseLeave: () => void;
  onMouseMove: (event: ReactMouseEvent<SVGSVGElement>) => void;
  onMouseUp: () => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onResetView: () => void;
  onSelect: (id: string) => void;
  onWheel: (event: ReactWheelEvent<SVGSVGElement>) => void;
}) {
  const [algorithm, setAlgorithm] = useState<VisualizationAlgorithm>("tsne");
  const [colorMode, setColorMode] = useState<VisualizationColorMode>("type");
  const [sidePanel, setSidePanel] = useState<VisualizationSidePanel>("detail");
  const [locateMissed, setLocateMissed] = useState(false);
  const points = useMemo(() => buildVectorProjection(records, algorithm), [algorithm, records]);
  const healthMetrics = useMemo(() => getVectorHealthMetrics(records, points), [points, records]);
  const algorithmMeta = VISUALIZATION_ALGORITHM_OPTIONS.find((item) => item.value === algorithm) ?? VISUALIZATION_ALGORITHM_OPTIONS[1];
  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0] ?? null;
  const similarRecordIds = useMemo(() => getSimilarRecordIds(selectedRecord, records), [records, selectedRecord]);
  const transform = `translate(${VISUALIZATION_WIDTH / 2 + pan.x} ${VISUALIZATION_HEIGHT / 2 + pan.y}) scale(${zoom}) translate(${
    -VISUALIZATION_WIDTH / 2
  } ${-VISUALIZATION_HEIGHT / 2})`;
  const typeCounts = useMemo(
    () =>
      records.reduce(
        (acc, record) => ({ ...acc, [record.type]: acc[record.type] + 1 }),
        { chunk: 0, entity: 0, relation: 0 } as Record<VectorRecordType, number>,
      ),
    [records],
  );
  const queryLegendItems =
    selectedRecord && colorMode === "query"
      ? [
          { key: "other", ...VISUALIZATION_QUERY_META.other, count: Math.max(records.length - similarRecordIds.size - 1, 0) },
          { key: "similar", ...VISUALIZATION_QUERY_META.similar, count: similarRecordIds.size },
          { key: "query", ...VISUALIZATION_QUERY_META.query, count: 1 },
        ]
      : [];

  useEffect(() => {
    const normalized = searchKeyword.trim().toLowerCase();
    if (!normalized) {
      setLocateMissed(false);
      return;
    }

    const matchedRecord = findVisualizationSearchMatch(records, normalized);
    if (!matchedRecord) {
      setLocateMissed(true);
      return;
    }

    const matchedPoint = points.find((point) => point.record.id === matchedRecord.id);
    setLocateMissed(false);
    setColorMode("query");
    setSidePanel("detail");
    onSelect(matchedRecord.id);
    if (matchedPoint) {
      onPanChange({
        x: (VISUALIZATION_WIDTH / 2 - matchedPoint.x) * zoom,
        y: (VISUALIZATION_HEIGHT / 2 - matchedPoint.y) * zoom,
      });
    }
  }, [onPanChange, onSelect, points, records, searchKeyword, zoom]);

  return (
    <div className="grid gap-4 py-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface-raised">
        <div className="flex min-h-[52px] flex-col gap-2 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-foreground">
              Scatter plot of knowledge using {algorithmMeta.label}
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              基于 mock 向量预览值生成二维投影，支持搜索定位、点选、滚轮缩放和拖拽平移。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
            <span className="rounded-md border border-border bg-card px-2 py-1">点数 {records.length}</span>
            <span className="rounded-md border border-border bg-card px-2 py-1">缩放 {Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setSidePanel((current) => (current === "health" ? "detail" : "health"))}
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium transition-colors",
                sidePanel === "health"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-input bg-card text-foreground hover:border-primary/30 hover:text-primary",
              )}
            >
              <Activity className="h-3.5 w-3.5" />
              健康度分析
            </button>
            <button
              type="button"
              onClick={onResetView}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-input bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              重置视图
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="text-[12px] text-muted-foreground">
            {locateMissed ? <span className="text-red-500">未找到匹配向量</span> : "使用右上角搜索定位向量散点"}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex h-8 items-center gap-2 rounded-lg border border-input bg-card px-2 text-[12px] text-muted-foreground">
              降维算法
              <select
                value={algorithm}
                onChange={(event) => setAlgorithm(event.target.value as VisualizationAlgorithm)}
                className="h-6 bg-transparent text-[12px] font-medium text-foreground outline-none"
              >
                {VISUALIZATION_ALGORITHM_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex h-8 items-center gap-2 rounded-lg border border-input bg-card px-2 text-[12px] text-muted-foreground">
              着色方式
              <select
                value={colorMode}
                onChange={(event) => setColorMode(event.target.value as VisualizationColorMode)}
                className="h-6 bg-transparent text-[12px] font-medium text-foreground outline-none"
              >
                {VISUALIZATION_COLOR_MODE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {colorMode === "type" &&
                Object.entries(VISUALIZATION_TYPE_META).map(([type, meta]) => (
                  <LegendItem key={type} color={meta.color} count={typeCounts[type as VectorRecordType]} label={meta.label} />
                ))}
              {colorMode === "query" &&
                queryLegendItems.map((item) => (
                  <LegendItem key={item.key} color={item.color} count={item.count} label={item.label} />
                ))}
            </div>
          </div>
        </div>

        <div className="relative bg-[#e8e8f1]">
          {loading && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-card/80 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载向量投影
              </span>
            </div>
          )}

          {!loading && records.length === 0 && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-card text-[13px] text-muted-foreground">
              暂无匹配向量
            </div>
          )}

          <svg
            role="img"
            aria-label="向量二维投影散点图"
            viewBox={`0 0 ${VISUALIZATION_WIDTH} ${VISUALIZATION_HEIGHT}`}
            className="h-[560px] w-full cursor-grab select-none touch-none"
            onMouseDown={onMouseDown}
            onMouseLeave={onMouseLeave}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onWheel={onWheel}
          >
            <defs>
              <pattern id="vector-grid" width="78" height="78" patternUnits="userSpaceOnUse">
                <path d="M 78 0 L 0 0 0 78" fill="none" stroke="#9ca3af" strokeDasharray="2 2" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={VISUALIZATION_WIDTH} height={VISUALIZATION_HEIGHT} fill="#e8e8f1" />
            <g transform={transform}>
              <rect width={VISUALIZATION_WIDTH} height={VISUALIZATION_HEIGHT} fill="url(#vector-grid)" />
              <g className="text-[13px] text-slate-700">
                {[-6, -4, -2, 0, 2, 4, 6, 8].map((tick) => (
                  <text key={`x-${tick}`} x={mockTsneXToSvg(tick)} y={VISUALIZATION_HEIGHT - 26} textAnchor="middle" fill="#334155">
                    {tick}
                  </text>
                ))}
                {[-6, -4, -2, 0, 2, 4].map((tick) => (
                  <text key={`y-${tick}`} x={32} y={mockTsneYToSvg(tick) + 4} textAnchor="middle" fill="#334155">
                    {tick}
                  </text>
                ))}
                <text x={VISUALIZATION_WIDTH / 2} y={VISUALIZATION_HEIGHT - 6} textAnchor="middle" fill="#0f172a">
                  {algorithmMeta.axisX}
                </text>
                <text
                  x={18}
                  y={VISUALIZATION_HEIGHT / 2}
                  textAnchor="middle"
                  fill="#0f172a"
                  transform={`rotate(-90 18 ${VISUALIZATION_HEIGHT / 2})`}
                >
                  {algorithmMeta.axisY}
                </text>
              </g>
              <line
                x1={40}
                x2={VISUALIZATION_WIDTH - 40}
                y1={VISUALIZATION_HEIGHT / 2}
                y2={VISUALIZATION_HEIGHT / 2}
                stroke="#cbd5e1"
                strokeDasharray="6 8"
              />
              <line
                x1={VISUALIZATION_WIDTH / 2}
                x2={VISUALIZATION_WIDTH / 2}
                y1={40}
                y2={VISUALIZATION_HEIGHT - 40}
                stroke="#cbd5e1"
                strokeDasharray="6 8"
              />
              {points.map((point) => {
                const selected = point.record.id === selectedRecord?.id;
                const similar = similarRecordIds.has(point.record.id);
                const meta =
                  colorMode === "query" && selectedRecord
                    ? selected
                      ? VISUALIZATION_QUERY_META.query
                      : similar
                        ? VISUALIZATION_QUERY_META.similar
                        : VISUALIZATION_QUERY_META.other
                    : VISUALIZATION_TYPE_META[point.record.type];

                return (
                  <circle
                    key={point.record.id}
                    cx={point.x}
                    cy={point.y}
                    r={selected ? meta.radius + 2 : meta.radius}
                    fill={meta.color}
                    opacity={selected ? 1 : 0.82}
                    stroke={selected ? "#0f172a" : "#ffffff"}
                    strokeWidth={selected ? 3 : 1.5}
                    className="transition-[r,opacity,stroke-width] hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      setColorMode("query");
                      setSidePanel("detail");
                      onSelect(point.record.id);
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <title>{`${point.record.sourceTitle} · ${point.record.id}`}</title>
                  </circle>
                );
              })}
            </g>
          </svg>
        </div>
      </section>

      {sidePanel === "health" ? (
        <VectorHealthAnalysis metrics={healthMetrics} records={records} />
      ) : (
        <VectorVisualizationDetail record={selectedRecord} records={allRecords} />
      )}
    </div>
  );
}

function VectorVisualizationDetail({ record, records }: { record: VectorRecord | null; records: VectorRecord[] }) {
  if (!record) {
    return (
      <aside className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-[15px] font-semibold text-foreground">向量详情</h2>
        <div className="mt-4 grid h-44 place-items-center rounded-lg border border-dashed border-border text-[13px] text-muted-foreground">
          选择散点查看详情
        </div>
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-border bg-card p-4">
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-semibold text-foreground">{record.sourceTitle}</h2>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{record.id}</p>
      </div>

      <div className="mt-4 grid gap-3">
        <InfoItem label="类型" value={VISUALIZATION_TYPE_META[record.type].label} />
        <InfoItem label="所属知识库" value={record.knowledgeBaseName} />
        <InfoItem label="所属文档" value={getDocumentName(record, records)} />
        <InfoItem label="来源 Chunk" value={getSourceChunk(record, records)} />
        <InfoItem label="向量模型" value={record.embeddingModel} />
        <InfoItem label="向量维度" value={record.dimension} />
        <InfoItem label="更新时间" value={record.updatedAt} />
      </div>

      <section className="mt-4">
        <h3 className="eyebrow mb-2">内容摘要</h3>
        <p className="rounded-lg border border-border bg-surface-raised px-3 py-3 text-[13px] leading-relaxed text-foreground">
          {record.content}
        </p>
      </section>

      <section className="mt-4">
        <h3 className="eyebrow mb-2">Metadata</h3>
        <pre className="max-h-[220px] overflow-auto rounded-lg border border-border bg-slate-950 p-3 text-[12px] leading-relaxed text-slate-100 scrollbar-thin">
          {JSON.stringify(record.metadata, null, 2)}
        </pre>
      </section>
    </aside>
  );
}

function VectorHealthAnalysis({ metrics, records }: { metrics: VectorHealthMetrics; records: VectorRecord[] }) {
  const items: Array<{ label: string; value: ReactNode; description: string }> = [
    { label: "重复向量", value: metrics.duplicateVectors, description: "向量预览值高度一致的记录数量" },
    { label: "孤立点", value: metrics.isolatedPoints, description: "与其他散点距离明显偏远的记录数量" },
    { label: "向量密度", value: metrics.vectorDensity, description: "当前画布单位面积内的向量分布密度" },
    { label: "聚类数量", value: metrics.clusterCount, description: "按二维投影近邻关系估算的语义簇数量" },
    { label: "异常向量", value: metrics.abnormalVectors, description: "失败、零向量或距离异常的记录数量" },
    { label: "空白内容", value: metrics.blankContent, description: "内容为空或仅包含空白字符的记录数量" },
    { label: "超短文本", value: metrics.shortText, description: "非空但内容少于 20 个字符的记录数量" },
  ];

  return (
    <aside className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-foreground">健康度分析</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">基于当前可视化结果的前端 mock 质量诊断</p>
        </div>
        <span className="rounded-md border border-border bg-surface-raised px-2 py-1 text-[11px] text-muted-foreground">
          {records.length} 条
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-surface-raised px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-foreground">{item.label}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
              <div className="shrink-0 font-mono text-[18px] font-semibold tabular-nums text-primary">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-[12px] leading-relaxed text-amber-800">
        健康度分析当前不请求后端，重复、聚类、异常等指标由 mock 向量预览值和二维投影位置估算。
      </section>
    </aside>
  );
}

function LegendItem({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
      <span className="font-mono text-[11px]">{count}</span>
    </span>
  );
}

function Metric({
  description,
  label,
  value,
  icon,
}: {
  description: string;
  label: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  const [showDescription, setShowDescription] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[12px] text-muted-foreground">{label}</span>
          <button
            type="button"
            onClick={() => setShowDescription((current) => !current)}
            aria-label={`${label}指标解释`}
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-amber-500 transition-colors hover:bg-amber-50 hover:text-amber-600"
          >
            <AlertCircle className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="shrink-0 text-primary">{icon}</span>
      </div>
      <div className="mt-2 text-[20px] font-semibold text-foreground">{value}</div>
      {showDescription && (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] leading-relaxed text-amber-800">
          {description}
        </p>
      )}
    </div>
  );
}

function HeaderCell({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border px-3 py-4", className)}>{children}</th>;
}

function DataCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("border-b border-border px-3 py-3.5 align-middle", className)}>{children}</td>;
}

function SelectionHeaderCell({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <HeaderCell className="w-[52px] text-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label="选择全部向量"
        className="h-3.5 w-3.5 rounded border-slate-300 align-middle accent-primary"
      />
    </HeaderCell>
  );
}

function SelectionDataCell({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <DataCell className="text-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="h-3.5 w-3.5 rounded border-slate-300 align-middle accent-primary"
      />
    </DataCell>
  );
}

function OperationCell({
  onDelete,
  onDetail,
  onRevectorize,
}: {
  record: VectorRecord;
  onDelete: () => void;
  onDetail: () => void;
  onRevectorize: () => void;
}) {
  return (
    <DataCell>
      <div className="flex items-center justify-center gap-1">
        <IconButton label="查看详情" onClick={onDetail}>
          <Eye className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="重新向量化" onClick={onRevectorize}>
          <RotateCw className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton danger label="删除" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </DataCell>
  );
}

function MetadataPreview({ value }: { value: Record<string, unknown> }) {
  const text = JSON.stringify(value);

  return (
    <span className="line-clamp-2 font-mono text-[12px] leading-relaxed text-muted-foreground" title={text}>
      {text}
    </span>
  );
}

function MutedText({ children }: { children: ReactNode }) {
  return <span className="text-[12px] text-muted-foreground">{children}</span>;
}

function StatusBadge({ status }: { status: VectorRecordStatus }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium", STATUS_CLASSES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function IconButton({
  children,
  danger,
  label,
  onClick,
}: {
  children: ReactNode;
  danger?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-md transition-colors",
        danger
          ? "bg-red-100 text-red-500 hover:bg-red-200"
          : "text-slate-500 hover:bg-slate-100 hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

function VectorDetailDrawer({ record, onClose }: { record: VectorRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
      <section className="h-full w-full max-w-[520px] overflow-y-auto bg-card shadow-xl animate-fade-in">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-semibold text-foreground">{record.sourceTitle}</h2>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{record.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭详情"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <section>
            <h3 className="eyebrow mb-2">向量内容</h3>
            <p className="rounded-lg border border-border bg-surface-raised px-3 py-3 text-[13px] leading-relaxed text-foreground">
              {record.content}
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <InfoItem label="类型" value={record.type} />
            <InfoItem label="状态" value={<StatusBadge status={record.status} />} />
            <InfoItem label="知识库" value={record.knowledgeBaseName} />
            <InfoItem label="集合" value={record.collection} />
            <InfoItem label="模型" value={record.embeddingModel} />
            <InfoItem label="维度" value={record.dimension} />
            <InfoItem label="更新时间" value={record.updatedAt} />
          </section>

          <section>
            <h3 className="eyebrow mb-2">向量预览</h3>
            <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface-raised p-3">
              {record.vectorPreview.map((value, index) => (
                <span
                  key={`${record.id}-${index}`}
                  className="rounded border border-border bg-card px-2 py-1 font-mono text-[11px] text-slate-600"
                >
                  {value.toFixed(4)}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="eyebrow mb-2">Metadata</h3>
            <pre className="max-h-[260px] overflow-auto rounded-lg border border-border bg-slate-950 p-3 text-[12px] leading-relaxed text-slate-100 scrollbar-thin">
              {JSON.stringify(record.metadata, null, 2)}
            </pre>
          </section>
        </div>
      </section>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-[13px] font-medium text-foreground">{value}</div>
    </div>
  );
}

function ConfirmDialog({
  count,
  onClose,
  onConfirm,
}: {
  count: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-[360px] overflow-hidden rounded-xl bg-card shadow-xl animate-fade-in">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-red-100 text-red-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-foreground">删除向量</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                确认删除选中的 {count} 条向量？此操作不可撤销。
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-input bg-card px-4 text-[13px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 rounded-lg bg-red-500 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-red-600"
          >
            删除
          </button>
        </div>
      </section>
    </div>
  );
}

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}

function buildVectorProjection(records: VectorRecord[], algorithm: VisualizationAlgorithm): VectorProjectionPoint[] {
  if (!records.length) return [];

  const rawPoints = records.map((record, index) => {
    const values = record.vectorPreview;
    const hash = stableHash(record.id);
    const jitterX = (((hash % 101) - 50) / 1000) * 0.9;
    const jitterY = ((((hash >> 3) % 101) - 50) / 1000) * 0.9;
    const v0 = values[0] ?? 0;
    const v1 = values[1] ?? 0;
    const v2 = values[2] ?? 0;
    const v3 = values[3] ?? 0;
    const v4 = values[4] ?? 0;
    const v5 = values[5] ?? 0;
    let rawX = v0 * 0.62 + v2 * 0.38 - v4 * 0.24;
    let rawY = v1 * 0.56 - v3 * 0.36 + v5 * 0.28;

    if (algorithm === "pca") {
      rawX = v0 * 0.72 + v1 * 0.28 - v4 * 0.18;
      rawY = v2 * 0.64 + v3 * 0.34 - v5 * 0.22;
    }

    if (algorithm === "umap") {
      rawX = Math.sin(v0 * 2.4 + v2 * 1.6) * 0.58 + v4 * 0.35 - v1 * 0.18;
      rawY = Math.cos(v1 * 2.2 - v3 * 1.4) * 0.52 + v5 * 0.36 + v2 * 0.16;
    }

    return {
      record,
      rawX: rawX + jitterX + index * 0.0008,
      rawY: rawY + jitterY - index * 0.0006,
    };
  });

  const xs = rawPoints.map((point) => point.rawX);
  const ys = rawPoints.map((point) => point.rawY);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const margin = 58;

  return rawPoints.map((point) => ({
    record: point.record,
    x: margin + ((point.rawX - minX) / rangeX) * (VISUALIZATION_WIDTH - margin * 2),
    y: margin + (1 - (point.rawY - minY) / rangeY) * (VISUALIZATION_HEIGHT - margin * 2),
  }));
}

function getSimilarRecordIds(query: VectorRecord | null, records: VectorRecord[]) {
  if (!query) return new Set<string>();

  return new Set(
    records
      .filter((record) => record.id !== query.id)
      .map((record) => ({ id: record.id, distance: getVectorDistance(query.vectorPreview, record.vectorPreview) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, VISUALIZATION_SIMILAR_LIMIT)
      .map((item) => item.id),
  );
}

function getDuplicateVectorCount(records: VectorRecord[]) {
  const duplicateIds = new Set<string>();

  for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
      if (getCosineSimilarity(records[leftIndex].vectorPreview, records[rightIndex].vectorPreview) > 0.995) {
        duplicateIds.add(records[rightIndex].id);
      }
    }
  }

  return duplicateIds.size;
}

function getVectorVariance(records: VectorRecord[]) {
  if (!records.length) return 0;

  const dimension = Math.max(...records.map((record) => record.vectorPreview.length), 0);
  if (!dimension) return 0;

  const centroid = Array.from({ length: dimension }, (_item, index) =>
    records.reduce((total, record) => total + (record.vectorPreview[index] ?? 0), 0) / records.length,
  );
  const totalSquaredDistance = records.reduce(
    (total, record) =>
      total +
      centroid.reduce((sum, center, index) => {
        const diff = (record.vectorPreview[index] ?? 0) - center;
        return sum + diff * diff;
      }, 0),
    0,
  );

  return totalSquaredDistance / records.length;
}

function getCosineSimilarity(left: number[], right: number[]) {
  const length = Math.max(left.length, right.length);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (!leftNorm || !rightNorm) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function getAdaptiveProjectionClusterCount(points: VectorProjectionPoint[]) {
  if (!points.length) return 0;

  const nearestDistances = points.map((point) => {
    const distances = points
      .filter((candidate) => candidate.record.id !== point.record.id)
      .map((candidate) => getPointDistance(point, candidate));
    return distances.length ? Math.min(...distances) : 0;
  });
  const sortedNearest = [...nearestDistances].sort((a, b) => a - b);
  const medianNearest = sortedNearest[Math.floor(sortedNearest.length / 2)] || 1;

  return getProjectionClusterCount(points, Math.max(72, medianNearest * 1.55));
}

function getVectorHealthMetrics(records: VectorRecord[], points: VectorProjectionPoint[]): VectorHealthMetrics {
  if (!records.length) {
    return {
      duplicateVectors: 0,
      isolatedPoints: 0,
      vectorDensity: "0.00 / 万px²",
      clusterCount: 0,
      abnormalVectors: 0,
      blankContent: 0,
      shortText: 0,
    };
  }

  const duplicateVectors = getDuplicateVectorCount(records);

  const nearestDistances = points.map((point) => {
    const distances = points
      .filter((candidate) => candidate.record.id !== point.record.id)
      .map((candidate) => getPointDistance(point, candidate));
    return distances.length ? Math.min(...distances) : 0;
  });
  const averageNearest =
    nearestDistances.reduce((total, distance) => total + distance, 0) / (nearestDistances.length || 1);
  const isolatedThreshold = Math.max(90, averageNearest * 1.8);
  const isolatedPointIds = new Set(
    points
      .filter((_point, index) => nearestDistances[index] > isolatedThreshold)
      .map((point) => point.record.id),
  );

  const zeroVectorIds = new Set(
    records
      .filter((record) => record.vectorPreview.every((value) => Math.abs(value) < 0.0001))
      .map((record) => record.id),
  );
  const failedIds = new Set(records.filter((record) => record.status === "failed").map((record) => record.id));
  const abnormalIds = new Set([...isolatedPointIds, ...zeroVectorIds, ...failedIds]);
  const density = records.length / ((VISUALIZATION_WIDTH * VISUALIZATION_HEIGHT) / 10000);

  return {
    duplicateVectors,
    isolatedPoints: isolatedPointIds.size,
    vectorDensity: `${density.toFixed(2)} / 万px²`,
    clusterCount: getAdaptiveProjectionClusterCount(points),
    abnormalVectors: abnormalIds.size,
    blankContent: records.filter((record) => record.content.trim().length === 0).length,
    shortText: records.filter((record) => {
      const length = record.content.trim().length;
      return length > 0 && length < 20;
    }).length,
  };
}

function getProjectionClusterCount(points: VectorProjectionPoint[], threshold: number) {
  if (!points.length) return 0;

  const visited = new Set<string>();
  let count = 0;

  points.forEach((point) => {
    if (visited.has(point.record.id)) return;
    count += 1;
    const stack = [point];
    visited.add(point.record.id);

    while (stack.length) {
      const current = stack.pop();
      if (!current) continue;

      points.forEach((candidate) => {
        if (visited.has(candidate.record.id)) return;
        if (getPointDistance(current, candidate) > threshold) return;
        visited.add(candidate.record.id);
        stack.push(candidate);
      });
    }
  });

  return count;
}

function getPointDistance(left: VectorProjectionPoint, right: VectorProjectionPoint) {
  const diffX = left.x - right.x;
  const diffY = left.y - right.y;
  return Math.sqrt(diffX * diffX + diffY * diffY);
}

function getVectorDistance(left: number[], right: number[]) {
  const length = Math.max(left.length, right.length);
  let sum = 0;

  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

function findVisualizationSearchMatch(records: VectorRecord[], normalizedKeyword: string) {
  const candidates = records.map((record) => ({
    record,
    id: record.id.toLowerCase(),
    displayName: getVisualizationDisplayName(record).toLowerCase(),
    content: record.content.toLowerCase(),
    sourceTitle: record.sourceTitle.toLowerCase(),
    metadata: JSON.stringify(record.metadata).toLowerCase(),
  }));

  return (
    candidates.find((item) => item.id === normalizedKeyword)?.record ??
    candidates.find((item) => item.id.includes(normalizedKeyword))?.record ??
    candidates.find((item) => item.displayName.includes(normalizedKeyword))?.record ??
    candidates.find((item) => item.content.includes(normalizedKeyword))?.record ??
    candidates.find((item) => item.sourceTitle.includes(normalizedKeyword))?.record ??
    candidates.find((item) => item.metadata.includes(normalizedKeyword))?.record
  );
}

function getVisualizationDisplayName(record: VectorRecord) {
  if (record.type === "entity") return getEntityName(record);
  if (record.type === "relation") return `${getHeadEntity(record)} - ${getRelationType(record)} - ${getTailEntity(record)}`;
  return getDocumentName(record) || record.sourceTitle;
}

function mockTsneXToSvg(value: number) {
  const min = -7;
  const max = 8;
  const margin = 58;
  return margin + ((value - min) / (max - min)) * (VISUALIZATION_WIDTH - margin * 2);
}

function mockTsneYToSvg(value: number) {
  const min = -7;
  const max = 5;
  const margin = 58;
  return margin + (1 - (value - min) / (max - min)) * (VISUALIZATION_HEIGHT - margin * 2);
}

function stableHash(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getMetadataString(record: VectorRecord, key: string) {
  const value = record.metadata[key];
  return typeof value === "string" ? value : undefined;
}

function getMetadataNumber(record: VectorRecord, key: string) {
  const value = record.metadata[key];
  return typeof value === "number" ? value : undefined;
}

function getChunkSize(record: VectorRecord) {
  const tokenCount = getMetadataNumber(record, "tokenCount");
  if (tokenCount) return `${tokenCount} tokens`;

  return `${record.content.length} chars`;
}

function getCreatedAt(record: VectorRecord) {
  const createdAt = getMetadataString(record, "createdAt");
  if (createdAt) return createdAt;

  const updatedAt = new Date(record.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return record.updatedAt;

  updatedAt.setMinutes(updatedAt.getMinutes() - (record.id.length % 7) - 2);
  return formatDateTime(updatedAt);
}

function getDocumentName(record: VectorRecord, records: VectorRecord[] = []) {
  const documentName = getMetadataString(record, "documentName");
  if (documentName) return documentName;

  const ownDocumentName = extractDocumentName(record.sourceTitle);
  if (record.type === "chunk" && ownDocumentName) return ownDocumentName;

  const sourceChunk = findSourceChunkRecord(record, records);
  return sourceChunk ? extractDocumentName(sourceChunk.sourceTitle) : `${record.knowledgeBaseName} 文档`;
}

function getSourceChunk(record: VectorRecord, records: VectorRecord[]) {
  if (record.type === "chunk") return record.id;

  const sourceChunk = findSourceChunkRecord(record, records);
  return sourceChunk?.id ?? "-";
}

function getEntityId(record: VectorRecord) {
  return getMetadataString(record, "entityId") ?? record.id;
}

function getEntityName(record: VectorRecord) {
  if (record.sourceTitle.includes("·")) return record.sourceTitle.split("·").at(-1)?.trim() || record.sourceTitle;

  return record.sourceTitle;
}

function getEntityType(record: VectorRecord) {
  return getMetadataString(record, "label") ?? "-";
}

function getEntityProperties(record: VectorRecord) {
  const { entityId: _entityId, label: _label, ...properties } = record.metadata;
  return properties;
}

function getRelationCount(entity: VectorRecord, records: VectorRecord[]) {
  const entityName = getEntityName(entity);

  return records.filter((record) => {
    if (record.type !== "relation" || record.knowledgeBaseId !== entity.knowledgeBaseId) return false;
    return getHeadEntity(record) === entityName || getTailEntity(record) === entityName || record.content.includes(entityName);
  }).length;
}

function getRelationId(record: VectorRecord) {
  return getMetadataString(record, "relationId") ?? record.id;
}

function getHeadEntity(record: VectorRecord) {
  return getMetadataString(record, "sourceEntity") ?? "-";
}

function getTailEntity(record: VectorRecord) {
  return getMetadataString(record, "targetEntity") ?? "-";
}

function getRelationType(record: VectorRecord) {
  return getMetadataString(record, "label") ?? "-";
}

function findSourceChunkRecord(record: VectorRecord, records: VectorRecord[]) {
  const sameKnowledgeBaseChunks = records.filter(
    (item) => item.type === "chunk" && item.knowledgeBaseId === record.knowledgeBaseId,
  );

  if (!sameKnowledgeBaseChunks.length) return undefined;
  if (record.type === "entity") {
    const entityName = getEntityName(record);
    return sameKnowledgeBaseChunks.find((item) => item.content.includes(entityName)) ?? sameKnowledgeBaseChunks[0];
  }

  if (record.type === "relation") {
    const headEntity = getHeadEntity(record);
    const tailEntity = getTailEntity(record);
    return (
      sameKnowledgeBaseChunks.find((item) => item.content.includes(headEntity) || item.content.includes(tailEntity)) ??
      sameKnowledgeBaseChunks[0]
    );
  }

  return sameKnowledgeBaseChunks[0];
}

function extractDocumentName(sourceTitle: string) {
  return sourceTitle.split("·")[0]?.trim() || sourceTitle;
}
