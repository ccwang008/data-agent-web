import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpenCheck,
  Database,
  FileText,
  Layers3,
  Loader2,
  Network,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import { mockClient } from "@/lib/mock-client";
import { cn } from "@/lib/utils";

import type {
  GrowthTrendPoint,
  HotChunk,
  HotDocument,
  KnowledgeCenterReportResponse,
  ReportMetric,
  ReportRange,
} from "../api/report-data";
import { DEFAULT_BASES } from "./knowledge-base-data";

type ReportTab = "overview" | "health" | "operations";
type RateSortKey = "hitRate" | "referenceRate";
type SortDirection = "asc" | "desc";
type RateSortState = { key: RateSortKey; direction: SortDirection };

const REPORT_TABS: Array<{ key: ReportTab; label: string; icon: ReactNode }> = [
  { key: "overview", label: "总览", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { key: "health", label: "健康度分析", icon: <BookOpenCheck className="h-3.5 w-3.5" /> },
  { key: "operations", label: "运营分析", icon: <TrendingUp className="h-3.5 w-3.5" /> },
];

const RANGE_OPTIONS: Array<{ key: ReportRange; label: string }> = [
  { key: "today", label: "今日" },
  { key: "7d", label: "近7天" },
  { key: "30d", label: "近30天" },
];

const TREND_SERIES: Array<{
  key: keyof Omit<GrowthTrendPoint, "label">;
  label: string;
  color: string;
  className: string;
}> = [
  { key: "documents", label: "新增文档", color: "#2563eb", className: "bg-blue-500" },
  { key: "chunks", label: "新增Chunk", color: "#10b981", className: "bg-emerald-500" },
  { key: "entities", label: "新增实体", color: "#f59e0b", className: "bg-amber-500" },
  { key: "relations", label: "新增关系", color: "#8b5cf6", className: "bg-violet-500" },
];

const HEALTH_ICONS: Record<keyof KnowledgeCenterReportResponse["health"], ReactNode> = {
  document: <FileText className="h-4 w-4" />,
  chunk: <Layers3 className="h-4 w-4" />,
  vector: <Database className="h-4 w-4" />,
  graph: <Network className="h-4 w-4" />,
};

export function AnalysisReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [knowledgeBaseId, setKnowledgeBaseId] = useState("all");
  const [range, setRange] = useState<ReportRange>("7d");
  const [report, setReport] = useState<KnowledgeCenterReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBaseLabel = useMemo(() => {
    if (knowledgeBaseId === "all") return "全部知识库";
    return DEFAULT_BASES.find((base) => base.id === knowledgeBaseId)?.name ?? "未知知识库";
  }, [knowledgeBaseId]);

  const loadReport = useCallback(() => {
    setLoading(true);
    setError(null);
    void mockClient
      .get<KnowledgeCenterReportResponse>(
        `/api/knowledge-center/reports?knowledgeBaseId=${knowledgeBaseId}&range=${range}`,
        { latencyMs: 260 },
      )
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "报表加载失败");
      })
      .finally(() => setLoading(false));
  }, [knowledgeBaseId, range]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  return (
    <div className="page-shell animate-fade-in">
      <section className="rounded-lg border border-border bg-card shadow-sm">
        <header className="flex min-h-16 flex-col gap-4 border-b border-border px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-semibold text-foreground">分析报表</h1>
              <span className="rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                Mock
              </span>
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {selectedBaseLabel} · {RANGE_OPTIONS.find((item) => item.key === range)?.label} · 生成时间{" "}
              {report?.updatedAt ?? "加载中"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={knowledgeBaseId}
              onChange={(event) => setKnowledgeBaseId(event.target.value)}
              className="h-8 min-w-[180px] rounded-lg border border-input bg-card px-3 text-[12px] text-foreground outline-none transition-colors hover:border-primary/30 focus:border-primary"
            >
              <option value="all">全部知识库</option>
              {DEFAULT_BASES.map((base) => (
                <option key={base.id} value={base.id}>
                  {base.name}
                </option>
              ))}
            </select>

            <div className="flex h-8 rounded-lg border border-input bg-surface-raised p-0.5">
              {RANGE_OPTIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setRange(item.key)}
                  className={cn(
                    "min-w-[58px] rounded-md px-2.5 text-[12px] font-medium transition-colors",
                    range === item.key
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadReport}
              disabled={loading}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-input bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              刷新
            </button>
          </div>
        </header>

        <div className="flex items-center gap-0 border-b border-border px-5">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "-mb-px inline-flex h-11 items-center gap-1.5 border-b-2 px-4 text-[13px] transition-colors",
                activeTab === tab.key
                  ? "border-primary font-medium text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-[560px] p-5">
          {error ? (
            <ErrorState message={error} onRetry={loadReport} />
          ) : loading && !report ? (
            <LoadingState />
          ) : report ? (
            <>
              {activeTab === "overview" && <OverviewTab report={report} />}
              {activeTab === "health" && <HealthTab report={report} />}
              {activeTab === "operations" && <OperationsTab report={report} />}
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </section>
    </div>
  );
}

function OverviewTab({ report }: { report: KnowledgeCenterReportResponse }) {
  return (
    <div className="space-y-5">
      <MetricGrid metrics={report.overview.coreKpis} columns="xl:grid-cols-4" />

      <Panel title="新增趋势" icon={<TrendingUp className="h-4 w-4" />}>
        <GrowthTrendChart points={report.overview.growthTrend} />
      </Panel>
    </div>
  );
}

function HealthTab({ report }: { report: KnowledgeCenterReportResponse }) {
  const groups = Object.entries(report.health) as Array<
    [keyof KnowledgeCenterReportResponse["health"], KnowledgeCenterReportResponse["health"][keyof KnowledgeCenterReportResponse["health"]]]
  >;

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {groups.map(([key, group]) => (
        <Panel key={key} title={group.title} icon={HEALTH_ICONS[key]}>
          <MetricGrid metrics={group.metrics} compact columns="sm:grid-cols-2" />
        </Panel>
      ))}
    </div>
  );
}

function OperationsTab({ report }: { report: KnowledgeCenterReportResponse }) {
  const [documentSort, setDocumentSort] = useState<RateSortState>({ key: "hitRate", direction: "desc" });
  const [chunkSort, setChunkSort] = useState<RateSortState>({ key: "hitRate", direction: "desc" });

  return (
    <div className="space-y-5">
      <Panel title="漏斗分析" icon={<TrendingUp className="h-4 w-4" />}>
        <FunnelAnalysisView funnel={report.operations.funnel} />
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="热门文档" icon={<FileText className="h-4 w-4" />}>
          <HotDocumentsTable documents={report.operations.hotDocuments} sort={documentSort} onSort={setDocumentSort} />
        </Panel>
        <Panel title="热门Chunk" icon={<Layers3 className="h-4 w-4" />}>
          <HotChunksTable chunks={report.operations.hotChunks} sort={chunkSort} onSort={setChunkSort} />
        </Panel>
      </div>
    </div>
  );
}

function MetricGrid({
  metrics,
  columns,
  compact = false,
}: {
  metrics: ReportMetric[];
  columns: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-3", columns)}>
      {metrics.map((metricItem) => (
        <MetricCard key={metricItem.id} metric={metricItem} compact={compact} />
      ))}
    </div>
  );
}

function MetricCard({ metric, compact }: { metric: ReportMetric; compact?: boolean }) {
  return (
    <div className={cn("rounded-md border border-border bg-surface-raised", compact ? "p-3" : "p-4")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] text-muted-foreground">{metric.label}</p>
        {metric.trend && (
          <span
            className={cn(
              "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium",
              metric.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : metric.tone === "danger"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
            )}
          >
            {metric.trend}
          </span>
        )}
      </div>
      <div className="mt-2 truncate font-mono text-[22px] font-semibold tabular-nums text-foreground">
        {metric.value}
      </div>
      {metric.detail && <p className="mt-1 truncate text-[11px] text-muted-foreground">{metric.detail}</p>}
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card shadow-sm">
      <div className="flex h-12 items-center gap-2 border-b border-border px-4">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-blue-50 text-primary">{icon}</span>
        <h2 className="text-[14px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function HotDocumentsTable({
  documents,
  sort,
  onSort,
}: {
  documents: HotDocument[];
  sort: RateSortState;
  onSort: (sort: RateSortState) => void;
}) {
  if (documents.length === 0) return <EmptyInline text="暂无热门文档" />;
  const sortedDocuments = sortByRate(documents, sort);

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left">
        <thead>
          <tr className="text-[11px] font-medium uppercase text-muted-foreground">
            <th className="border-b border-border px-3 py-2">文档</th>
            <th className="border-b border-border px-3 py-2">知识库</th>
            <SortableRateHeader label="命中率" sortKey="hitRate" sort={sort} onSort={onSort} />
            <SortableRateHeader label="引用率" sortKey="referenceRate" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {sortedDocuments.map((document) => (
            <tr key={document.id} className="text-[13px] text-foreground">
              <td className="border-b border-border/60 px-3 py-3 font-medium">{document.title}</td>
              <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">{document.knowledgeBaseName}</td>
              <RateCell value={document.hitRate} />
              <RateCell value={document.referenceRate} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HotChunksTable({
  chunks,
  sort,
  onSort,
}: {
  chunks: HotChunk[];
  sort: RateSortState;
  onSort: (sort: RateSortState) => void;
}) {
  if (chunks.length === 0) return <EmptyInline text="暂无热门Chunk" />;
  const sortedChunks = sortByRate(chunks, sort);

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
        <thead>
          <tr className="text-[11px] font-medium uppercase text-muted-foreground">
            <th className="border-b border-border px-3 py-2">Chunk</th>
            <th className="border-b border-border px-3 py-2">来源</th>
            <th className="border-b border-border px-3 py-2">知识库</th>
            <SortableRateHeader label="命中率" sortKey="hitRate" sort={sort} onSort={onSort} />
            <SortableRateHeader label="引用率" sortKey="referenceRate" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {sortedChunks.map((chunk) => (
            <tr key={chunk.id} className="text-[13px] text-foreground">
              <td className="max-w-[260px] border-b border-border/60 px-3 py-3">
                <p className="line-clamp-2 leading-5">{chunk.content}</p>
              </td>
              <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">{chunk.sourceTitle}</td>
              <td className="border-b border-border/60 px-3 py-3 text-muted-foreground">{chunk.knowledgeBaseName}</td>
              <RateCell value={chunk.hitRate} />
              <RateCell value={chunk.referenceRate} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortableRateHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: RateSortKey;
  sort: RateSortState;
  onSort: (sort: RateSortState) => void;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? null : sort.direction === "desc" ? ArrowDown : ArrowUp;

  return (
    <th className="border-b border-border px-3 py-2 text-right">
      <button
        type="button"
        onClick={() =>
          onSort({
            key: sortKey,
            direction: active && sort.direction === "desc" ? "asc" : "desc",
          })
        }
        className={cn(
          "ml-auto inline-flex items-center justify-end gap-1 text-[11px] font-medium transition-colors hover:text-primary",
          active && "text-primary",
        )}
      >
        {label}
        {Icon && <Icon className="h-3 w-3" />}
      </button>
    </th>
  );
}

function RateCell({ value }: { value: number }) {
  return (
    <td className="border-b border-border/60 px-3 py-3 text-right font-mono tabular-nums">
      {value.toFixed(1)}%
    </td>
  );
}

function sortByRate<T extends { hitRate: number; referenceRate: number }>(items: T[], sort: RateSortState) {
  return [...items].sort((a, b) => {
    const direction = sort.direction === "desc" ? -1 : 1;
    return (a[sort.key] - b[sort.key]) * direction;
  });
}

function GrowthTrendChart({ points }: { points: GrowthTrendPoint[] }) {
  const [selectedSeries, setSelectedSeries] = useState<(typeof TREND_SERIES)[number]["key"]>("documents");
  const activeSeries = TREND_SERIES.find((series) => series.key === selectedSeries) ?? TREND_SERIES[0];
  const maxValue = Math.max(...points.map((point) => Number(point[activeSeries.key])), 1);
  const width = 720;
  const height = 260;
  const padding = { top: 20, right: 26, bottom: 36, left: 44 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const getPoint = (point: GrowthTrendPoint, index: number, key: (typeof TREND_SERIES)[number]["key"]) => {
    const x = padding.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth);
    const y = padding.top + plotHeight - (Number(point[key]) / maxValue) * plotHeight;
    return { x, y };
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {TREND_SERIES.map((series) => {
          const active = selectedSeries === series.key;

          return (
            <button
              key={series.key}
              type="button"
              onClick={() => setSelectedSeries(series.key)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors",
                active
                  ? "border-primary/30 bg-blue-50 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", series.className, !active && "opacity-35")} />
              {series.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[720px] rounded-md border border-border bg-surface-raised px-3 py-3">
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="新增趋势折线图">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + plotHeight - plotHeight * ratio;

              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + plotWidth}
                    y2={y}
                    stroke="hsl(var(--border))"
                    strokeDasharray="4 4"
                  />
                  <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="hsl(var(--muted-foreground))">
                    {Math.round(maxValue * ratio)}
                  </text>
                </g>
              );
            })}

            {points.map((point, index) => {
              const x = padding.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth);

              return (
                <g key={point.label}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + plotHeight}
                    stroke="hsl(var(--border) / 0.45)"
                  />
                  <text x={x} y={height - 10} textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
                    {point.label}
                  </text>
                </g>
              );
            })}

            {(() => {
              const linePoints = points.map((point, index) => {
                const p = getPoint(point, index, activeSeries.key);
                return `${p.x},${p.y}`;
              }).join(" ");

              return (
                <g key={activeSeries.key}>
                  <polyline
                    points={linePoints}
                    fill="none"
                    stroke={activeSeries.color}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {points.map((point, index) => {
                    const p = getPoint(point, index, activeSeries.key);

                    return (
                      <circle
                        key={`${activeSeries.key}-${point.label}`}
                        cx={p.x}
                        cy={p.y}
                        r="3.5"
                        fill="hsl(var(--card))"
                        stroke={activeSeries.color}
                        strokeWidth="2"
                      />
                    );
                  })}
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
        <Legend color={activeSeries.className} label={activeSeries.label} />
      </div>
    </div>
  );
}

function FunnelAnalysisView({ funnel }: { funnel: KnowledgeCenterReportResponse["operations"]["funnel"] }) {
  const maxValue = Math.max(...funnel.steps.map((step) => step.value), 1);
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500"];

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="min-w-[720px] space-y-3 rounded-md border border-border bg-surface-raised p-4">
        {funnel.steps.map((step, index) => (
          <div key={step.id} className="grid grid-cols-[92px_minmax(0,1fr)_120px] items-center gap-3">
            <div>
              <p className="text-[13px] font-medium text-foreground">{index + 1}. {step.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {index === 0 ? "入口量" : "上一步转化率"}
              </p>
            </div>
            <div className="h-9 rounded-md bg-card">
              <div
                className={cn("flex h-9 items-center rounded-md px-3 text-[12px] font-medium text-white", colors[index])}
                style={{ width: `${Math.max(12, (step.value / maxValue) * 100)}%` }}
              >
                {step.rate.toFixed(1)}%
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[18px] font-semibold tabular-nums text-foreground">
                {formatNumber(step.value)}
              </p>
              <p className="text-[11px] text-muted-foreground">次</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-sm", color)} />
      {label}
    </span>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid min-h-[420px] place-items-center">
      <div className="max-w-md rounded-md border border-red-100 bg-red-50 px-5 py-4 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
        <h2 className="mt-3 text-[14px] font-semibold text-red-700">报表加载失败</h2>
        <p className="mt-1 text-[12px] text-red-600">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          重试
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-[420px] place-items-center text-[13px] text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在生成分析报表...
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-[420px] place-items-center text-[13px] text-muted-foreground">
      暂无报表数据
    </div>
  );
}

function EmptyInline({ text }: { text: string }) {
  return <div className="grid min-h-24 place-items-center text-[12px] text-muted-foreground">{text}</div>;
}
