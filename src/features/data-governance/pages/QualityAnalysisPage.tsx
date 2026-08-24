// 质量分析：跨批次维度评分趋势 + 根因聚类 + 对比分析（无 CRUD）。
// 分析视图引用质量问题闭环数据，不重复计算。
import { useMemo } from "react";
import {
  AlertTriangle, GitBranch, Layers, Lightbulb, LineChart, TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  InlineNotice, PageTitle, Panel, Pill, ProgressBar, WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { cn } from "@/lib/utils";

import {
  SCHEMA_VERSION, seedDataTrustworthiness, seedQualityIssues,
  seedQualityRootCauses,
} from "../fixtures";
import { useGovernanceState } from "../state";
import type {
  DataTrustworthiness, QualityDimension, QualityIssue, QualityRootCause,
} from "../types";

const DIMENSIONS: QualityDimension[] = ["完整性", "准确性", "及时性", "一致性", "唯一性"];
const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// 跨批次维度评分趋势 mock 数据（基于历史批次，非真实执行结果）
const DIMENSION_TREND: Record<QualityDimension, number[]> = {
  完整性: [98, 99, 99.5, 99.8],
  准确性: [99, 98.5, 99, 98.7],
  及时性: [96, 96.5, 97, 97.2],
  一致性: [70, 75, 80, 80],
  唯一性: [100, 100, 100, 100],
};
const BATCH_LABELS = ["QEB-Prev3", "QEB-Prev2", "QEB-Prev1", "QEB-001"];

type AnalysisState = {
  schemaVersion: number;
  trustworthiness: DataTrustworthiness[];
  issues: QualityIssue[];
  rootCauses: QualityRootCause[];
};

const initialState: AnalysisState = {
  schemaVersion: SCHEMA_VERSION,
  trustworthiness: seedDataTrustworthiness,
  issues: seedQualityIssues,
  rootCauses: seedQualityRootCauses,
};

export function QualityAnalysisPage() {
  const [state, , meta] = useGovernanceState<AnalysisState>(
    "data-agent.data-governance.quality.analysis",
    initialState,
  );

  const { trustworthiness, issues, rootCauses } = state;

  // 当前维度平均分（用于对比）
  const dimensionAvg = useMemo(() => {
    return DIMENSIONS.map((d) => {
      const values = trustworthiness.map((t) => t.dimensions[d]);
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    });
  }, [trustworthiness]);

  // 趋势方向
  const trendDirection = useMemo(() => {
    return DIMENSIONS.map((d) => {
      const trend = DIMENSION_TREND[d];
      const last = trend[trend.length - 1];
      const prev = trend[trend.length - 2];
      if (last > prev) return "上升";
      if (last < prev) return "下降";
      return "持平";
    });
  }, []);

  // 高发对象（按问题数排序）
  const topObjects = useMemo(() => {
    const map = new Map<string, number>();
    issues.forEach((i) => {
      map.set(i.objectName, (map.get(i.objectName) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [issues]);

  // 高发维度
  const topDimensions = useMemo(() => {
    const map = new Map<QualityDimension, number>();
    issues.forEach((i) => {
      map.set(i.dimension, (map.get(i.dimension) ?? 0) + 1);
    });
    return DIMENSIONS.map((d) => ({ dimension: d, count: map.get(d) ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, [issues]);

  const risingCount = trendDirection.filter((t) => t === "上升").length;
  const fallingCount = trendDirection.filter((t) => t === "下降").length;
  const flatCount = trendDirection.filter((t) => t === "持平").length;
  const improvementPriority = fallingCount > 0 ? "高" : risingCount > 0 ? "中" : "低";

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Governance / Quality Analysis"
        title="质量分析"
        description="分析跨批次维度趋势、根因聚类与对象对比，识别改进优先级；分析视图无 CRUD，引用质量问题闭环数据。"
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />

      {/* 趋势概要 */}
      <Panel title="趋势概要" description="按维度趋势走向汇总">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">趋势上升</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-[20px] font-semibold tabular-nums text-emerald-600">{risingCount}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">个维度</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">趋势下降</span>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <div className="mt-2 text-[20px] font-semibold tabular-nums text-red-600">{fallingCount}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">个维度</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">趋势持平</span>
              <LineChart className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-[20px] font-semibold tabular-nums text-slate-500">{flatCount}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">个维度</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">改进优先级</span>
              <Lightbulb className="h-4 w-4 text-violet-500" />
            </div>
            <div className={cn(
              "mt-2 text-[20px] font-semibold tabular-nums",
              improvementPriority === "高" ? "text-red-600" : improvementPriority === "中" ? "text-amber-600" : "text-emerald-600",
            )}>{improvementPriority}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">依据趋势与根因</div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* 跨批次维度评分趋势图 */}
        <Panel title="跨批次维度评分趋势" description="按维度展示历史批次评分变化">
          <div className="p-5">
            <DimensionTrendChart
              dimensions={DIMENSIONS}
              trendData={DIMENSION_TREND}
              labels={BATCH_LABELS}
              colors={CHART_COLORS}
            />
            {/* 图例 */}
            <div className="mt-3 grid grid-cols-5 gap-2 text-center">
              {DIMENSIONS.map((d, i) => (
                <div key={d}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                    <span className="text-[10px] text-muted-foreground">{d}</span>
                  </div>
                  <div className={cn(
                    "mt-0.5 text-[13px] font-semibold tabular-nums",
                    trendDirection[i] === "上升" ? "text-emerald-600" : trendDirection[i] === "下降" ? "text-red-600" : "text-slate-500",
                  )}>{dimensionAvg[i].toFixed(1)}</div>
                  <div className="text-[9px] text-muted-foreground">{trendDirection[i]}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* 高发对象与维度 */}
        <Panel title="高发对象与维度" description="按问题数排序，定位改进重点">
          <div className="p-4">
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Layers className="h-3 w-3" />
                问题高发对象
              </div>
              <div className="space-y-2">
                {topObjects.map(([name, count], idx) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-5 text-right font-mono text-[10px] text-muted-foreground">{idx + 1}</span>
                    <span className="w-28 truncate text-[11px] text-foreground" title={name}>{name}</span>
                    <ProgressBar value={topObjects[0][1] ? (count / topObjects[0][1]) * 100 : 0} tone={count >= 2 ? "red" : "amber"} className="flex-1" />
                    <span className="w-6 text-[11px] font-semibold tabular-nums text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Layers className="h-3 w-3" />
                问题高发维度
              </div>
              <div className="space-y-2">
                {topDimensions.map(({ dimension, count }) => (
                  <div key={dimension} className="flex items-center gap-3">
                    <span className="w-20 text-[11px] text-foreground">{dimension}</span>
                    <ProgressBar value={topDimensions[0].count ? (count / topDimensions[0].count) * 100 : 0} tone={count >= 2 ? "red" : "blue"} className="flex-1" />
                    <span className="w-6 text-[11px] font-semibold tabular-nums text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 根因聚类分析 */}
      <Panel
        title="根因聚类分析"
        description="基于问题聚类识别根因与改进建议"
        actions={<Pill tone="violet"><GitBranch className="mr-1 inline h-3 w-3" />聚类</Pill>}
      >
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {rootCauses.map((rc) => (
            <div key={rc.id} className="rounded-lg border border-violet-200 bg-violet-50/40 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-violet-600" />
                  <span className="text-[12px] font-semibold text-foreground">{rc.clusterName}</span>
                </div>
                <Pill tone="violet" size="sm">{rc.id}</Pill>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {rc.issueIds.map((id) => (
                  <span key={id} className="rounded-md bg-white px-2 py-0.5 font-mono text-[9px] text-violet-700">{id}</span>
                ))}
              </div>
              <div className="mt-3 rounded-md bg-white p-2">
                <div className="text-[9px] uppercase text-muted-foreground">根因</div>
                <div className="mt-1 text-[11px] leading-5 text-foreground">{rc.rootCause}</div>
              </div>
              <div className="mt-2 rounded-md bg-white p-2">
                <div className="text-[9px] uppercase text-muted-foreground">建议措施</div>
                <div className="mt-1 text-[11px] leading-5 text-foreground">{rc.suggestedAction}</div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>影响对象 {rc.affectedObjects} 个</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 对象维度对比 */}
      <Panel title="对象维度对比" description="横向对比各对象在各维度的可信度评分">
        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[760px] border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 text-left">对象</th>
                {DIMENSIONS.map((d) => <th key={d} className="px-3 py-2 text-left">{d}</th>)}
                <th className="px-3 py-2 text-left">综合</th>
                <th className="px-3 py-2 text-left">等级</th>
              </tr>
            </thead>
            <tbody>
              {trustworthiness.map((t) => (
                <tr key={t.objectId} className="border-b border-border hover:bg-muted/20">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-foreground">{t.objectName}</div>
                    <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">{t.objectId}</div>
                  </td>
                  {DIMENSIONS.map((d) => {
                    const v = t.dimensions[d];
                    return (
                      <td key={d} className="px-3 py-3">
                        <div className={cn(
                          "text-[12px] font-semibold tabular-nums",
                          v >= 95 ? "text-emerald-600" : v >= 85 ? "text-amber-600" : "text-red-600",
                        )}>{v.toFixed(1)}</div>
                        <ProgressBar value={v} tone={v >= 95 ? "green" : v >= 85 ? "amber" : "red"} className="mt-1 w-20" />
                      </td>
                    );
                  })}
                  <td className="px-3 py-3">
                    <span className={cn(
                      "text-[14px] font-semibold tabular-nums",
                      t.score >= 90 ? "text-emerald-600" : t.score >= 80 ? "text-amber-600" : "text-red-600",
                    )}>{t.score.toFixed(1)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <Pill tone={t.level === "高" ? "green" : t.level === "中" ? "amber" : "red"} size="sm">{t.level}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </WorkspacePage>
  );
}

// 跨批次维度评分趋势图（多 series 折线图，SVG 静态渲染）
function DimensionTrendChart({
  dimensions,
  trendData,
  labels,
  colors,
}: {
  dimensions: QualityDimension[];
  trendData: Record<QualityDimension, number[]>;
  labels: string[];
  colors: string[];
}) {
  const width = 560;
  const height = 240;
  const padding = { top: 16, right: 16, bottom: 30, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const yMin = 65;
  const yMax = 100;

  function xFor(i: number) {
    return padding.left + (chartW / (labels.length - 1)) * i;
  }
  function yFor(v: number) {
    return padding.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  }

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Y 轴网格 */}
        {[70, 80, 90, 100].map((v) => (
          <g key={v}>
            <line x1={padding.left} y1={yFor(v)} x2={width - padding.right} y2={yFor(v)} stroke="rgb(226 232 240)" strokeWidth={1} />
            <text x={padding.left - 8} y={yFor(v) + 3} textAnchor="end" style={{ fontSize: 9, fill: "rgb(148 163 184)" }}>{v}</text>
          </g>
        ))}
        {/* X 轴标签 */}
        {labels.map((label, i) => (
          <text key={label} x={xFor(i)} y={height - padding.bottom + 14} textAnchor="middle" style={{ fontSize: 9, fill: "rgb(148 163 184)" }}>{label}</text>
        ))}
        {/* 各维度折线 */}
        {dimensions.map((d, dimIdx) => {
          const values = trendData[d];
          const points = values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");
          return (
            <g key={d}>
              <polyline points={points} fill="none" stroke={colors[dimIdx]} strokeWidth={2} />
              {values.map((v, i) => (
                <circle key={i} cx={xFor(i)} cy={yFor(v)} r={3} fill={colors[dimIdx]} />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
