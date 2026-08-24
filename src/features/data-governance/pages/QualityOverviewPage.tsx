// 质量概览：综合可信度 + 五维评分雷达 + 批次趋势 + 问题闭环漏斗。
// 概览页不直接做规则 CRUD（移至 /quality/rules），用可信度+维度+漏斗组合视图。
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, AlertTriangle, ChevronRight, Clock, RefreshCw, ShieldCheck,
  Sparkles, TrendingDown,
} from "lucide-react";

import {
  ActionButton, InlineNotice, PageTitle, Panel, Pill,
  WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import {
  SCHEMA_VERSION, seedDataTrustworthiness, seedQualityExecutionBatches,
  seedQualityIssues, seedQualityRules,
} from "../fixtures";
import { useGovernanceState } from "../state";
import type {
  DataTrustworthiness, QualityDimension, QualityExecutionBatch, QualityIssue,
  QualityIssueStatus, QualityRule,
} from "../types";

const DIMENSIONS: QualityDimension[] = ["完整性", "准确性", "及时性", "一致性", "唯一性"];
const ISSUE_STAGES: QualityIssueStatus[] = ["发现", "确认", "分发", "整改", "复检", "关闭"];

type OverviewState = {
  schemaVersion: number;
  trustworthiness: DataTrustworthiness[];
  rules: QualityRule[];
  batches: QualityExecutionBatch[];
  issues: QualityIssue[];
};

const initialState: OverviewState = {
  schemaVersion: SCHEMA_VERSION,
  trustworthiness: seedDataTrustworthiness,
  rules: seedQualityRules,
  batches: seedQualityExecutionBatches,
  issues: seedQualityIssues,
};

export function QualityOverviewPage() {
  const [state, setState, meta] = useGovernanceState<OverviewState>(
    "data-agent.data-governance.quality.overview",
    initialState,
  );
  const navigate = useNavigate();
  const { trustworthiness, rules, batches, issues } = state;

  // 综合可信度：所有对象可信度均值
  const overallTrust = useMemo(() => {
    if (!trustworthiness.length) return 0;
    return trustworthiness.reduce((sum, t) => sum + t.score, 0) / trustworthiness.length;
  }, [trustworthiness]);

  // 五维评分均值（来自对象可信度维度分数）
  const dimensionScores = useMemo(() => {
    return DIMENSIONS.map((d) => {
      const values = trustworthiness.map((t) => t.dimensions[d]);
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    });
  }, [trustworthiness]);

  // 最弱维度
  const weakest = useMemo(() => {
    let min = 100;
    let weakestDim: QualityDimension = "完整性";
    DIMENSIONS.forEach((d, i) => {
      if (dimensionScores[i] < min) {
        min = dimensionScores[i];
        weakestDim = d;
      }
    });
    return { dimension: weakestDim, score: min };
  }, [dimensionScores]);

  // 问题闭环漏斗：按状态统计数量
  const funnel = useMemo(() => {
    return ISSUE_STAGES.map((stage) => ({
      stage,
      count: issues.filter((i) => i.status === stage).length,
    }));
  }, [issues]);

  const openIssues = issues.filter((i) => i.status !== "关闭").length;
  const severeOpen = issues.filter((i) => i.status !== "关闭" && (i.severity === "P0" || i.severity === "P1")).length;
  const failedRules = rules.filter((r) => r.status === "失败").length;

  // 批次按时间倒序
  const sortedBatches = useMemo(() => {
    return [...batches].sort((a, b) => b.executedAt.localeCompare(a.executedAt));
  }, [batches]);

  function refreshOverview() {
    // 模拟刷新：将运行中批次置为已完成
    setState((current) => ({
      ...current,
      batches: current.batches.map((b) =>
        b.status === "运行中"
          ? { ...b, status: "已完成", passed: 6, failed: 2 }
          : b,
      ),
    }));
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Governance / Data Quality"
        title="数据质量概览"
        description="从综合可信度、五维评分、批次趋势和问题闭环漏斗四个角度全局把握数据质量，发现短板优先于浏览规则清单。"
        actions={
          <>
            <ActionButton icon={RefreshCw} onClick={refreshOverview}>刷新概览</ActionButton>
            <ActionButton primary icon={Activity} onClick={() => navigate("/data-governance/quality/issues")}>查看问题工作台</ActionButton>
          </>
        }
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />

      {/* 主视觉区：综合可信度环 + 五维评分雷达 */}
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title="综合可信度评分" description="基于对象可信度聚合">
          <div className="p-5">
            <div className="flex items-center gap-5">
              <div className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(rgb(16 185 129) ${overallTrust}%, rgb(226 232 240) 0)` }}>
                <div className="grid h-24 w-24 place-items-center rounded-full bg-card text-center">
                  <div>
                    <div className="text-[24px] font-semibold tabular-nums text-foreground">{overallTrust.toFixed(1)}</div>
                    <div className="text-[10px] text-muted-foreground">综合可信度</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {trustworthiness.map((t) => (
                  <div key={t.objectId} className="flex items-center justify-between text-[11px]">
                    <span className="truncate text-muted-foreground" title={t.objectName}>{t.objectName}</span>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-semibold text-foreground">{t.score.toFixed(1)}</span>
                      <Pill tone={t.level === "高" ? "green" : t.level === "中" ? "amber" : "red"} size="sm">{t.level}</Pill>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-md border border-border bg-muted/20 p-2 text-center">
                <div className="text-[9px] uppercase text-muted-foreground">未闭环</div>
                <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-amber-600">{openIssues}</div>
              </div>
              <div className="rounded-md border border-border bg-muted/20 p-2 text-center">
                <div className="text-[9px] uppercase text-muted-foreground">P0/P1 待处</div>
                <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-red-600">{severeOpen}</div>
              </div>
              <div className="rounded-md border border-border bg-muted/20 p-2 text-center">
                <div className="text-[9px] uppercase text-muted-foreground">失败规则</div>
                <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-foreground">{failedRules}</div>
              </div>
            </div>
            <div className="mt-4 rounded-md border border-blue-100 bg-blue-50/60 p-3 text-[10px] leading-5 text-blue-800">
              <Sparkles className="mr-1 inline h-3 w-3" />
              综合可信度按对象可信度均值聚合，可信度低的对象应优先纳入改进报告。
            </div>
          </div>
        </Panel>

        <Panel title="五维评分雷达" description="按维度聚合对象可信度评分">
          <div className="p-5">
            <QualityRadarChart dimensions={DIMENSIONS} scores={dimensionScores} />
            <div className="mt-4 grid grid-cols-5 gap-2 text-center">
              {DIMENSIONS.map((d, i) => (
                <div key={d}>
                  <div className="text-[10px] text-muted-foreground">{d}</div>
                  <div className={cn("text-[14px] font-semibold tabular-nums", dimensionScores[i] >= 95 ? "text-emerald-600" : dimensionScores[i] >= 85 ? "text-amber-600" : "text-red-600")}>{dimensionScores[i].toFixed(1)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-100 bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">
              <TrendingDown className="h-3.5 w-3.5 shrink-0" />
              <span>短板维度：<span className="font-semibold">{weakest.dimension}</span>（{weakest.score.toFixed(1)}），建议在改进报告中优先治理。</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* 趋势与漏斗 */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="质量检查批次趋势" description="按执行时间倒序，呈现通过/失败对比">
          <div className="p-5">
            <div className="space-y-3">
              {sortedBatches.map((b) => {
                const total = b.totalRules;
                const passed = b.passed;
                const failed = b.failed;
                const pending = total - passed - failed;
                const passRate = total ? (passed / total) * 100 : 0;
                return (
                  <div key={b.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono text-[11px] font-medium text-foreground">{b.id}</span>
                        <Pill tone={statusTone(b.status)} size="sm">{b.status}</Pill>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{b.executedAt}</span>
                    </div>
                    <div className="mt-2 text-[10px] text-muted-foreground">{b.scope}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-emerald-500" style={{ width: `${(passed / Math.max(total, 1)) * 100}%` }} />
                        <div className="h-full bg-red-500" style={{ width: `${(failed / Math.max(total, 1)) * 100}%` }} />
                        <div className="h-full bg-slate-300" style={{ width: `${(pending / Math.max(total, 1)) * 100}%` }} />
                      </div>
                      <div className="flex items-center gap-2 text-[10px] tabular-nums">
                        <span className="text-emerald-600">通过 {passed}</span>
                        <span className="text-red-600">失败 {failed}</span>
                        <span className="text-muted-foreground">共 {total}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">通过率 {passRate.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel
          title="问题闭环漏斗"
          description="按状态统计问题数量"
          actions={<ActionButton size="sm" icon={ChevronRight} onClick={() => navigate("/data-governance/quality/issues")}>工作台</ActionButton>}
        >
          <div className="p-5">
            <div className="space-y-2">
              {funnel.map((stage, idx) => {
                const maxCount = Math.max(...funnel.map((f) => f.count), 1);
                const width = (stage.count / maxCount) * 100;
                const isClosed = idx === funnel.length - 1;
                return (
                  <div key={stage.stage} className="flex items-center gap-3">
                    <div className="w-12 text-right text-[10px] font-medium text-foreground">{stage.stage}</div>
                    <div className="flex-1">
                      <div className="h-7 rounded-md bg-slate-50">
                        <div className={cn("flex h-7 items-center justify-end rounded-md px-2", isClosed ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")} style={{ width: `${Math.max(width, 12)}%` }}>
                          <span className="text-[11px] font-semibold tabular-nums">{stage.count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-md border border-amber-100 bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">
              <AlertTriangle className="mr-1 inline h-3 w-3" />
              当前 {openIssues} 个问题未闭环，其中 {severeOpen} 个 P0/P1 严重问题需在分发阶段优先处置。
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" />
              <span>问题独立于规则生命周期，闭环推进见问题工作台。</span>
            </div>
          </div>
        </Panel>
      </div>
    </WorkspacePage>
  );
}

// 五维评分雷达图（SVG 静态渲染）
function QualityRadarChart({ dimensions, scores }: { dimensions: QualityDimension[]; scores: number[] }) {
  const size = 240;
  const center = size / 2;
  const radius = 80;
  const levels = 5;
  const angleStep = (Math.PI * 2) / dimensions.length;

  // 计算多边形顶点
  function point(angle: number, r: number): [number, number] {
    return [center + Math.cos(angle - Math.PI / 2) * r, center + Math.sin(angle - Math.PI / 2) * r];
  }

  const dataPoints = scores.map((s, i) => point(i * angleStep, (Math.min(Math.max(s, 0), 100) / 100) * radius));
  const dataPath = dataPoints.map((p) => `${p[0]},${p[1]}`).join(" ");

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 背景网格 */}
        {Array.from({ length: levels }).map((_, level) => {
          const r = (radius * (level + 1)) / levels;
          const pts = dimensions.map((_, i) => point(i * angleStep, r).join(",")).join(" ");
          return <polygon key={level} points={pts} fill="none" stroke="rgb(226 232 240)" strokeWidth={1} />;
        })}
        {/* 轴线 */}
        {dimensions.map((_, i) => {
          const [x, y] = point(i * angleStep, radius);
          return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgb(226 232 240)" strokeWidth={1} />;
        })}
        {/* 数据多边形 */}
        <polygon points={dataPath} fill="rgba(59, 130, 246, 0.2)" stroke="rgb(59 130 246)" strokeWidth={2} />
        {dataPoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="rgb(59 130 246)" />
        ))}
        {/* 维度标签 */}
        {dimensions.map((d, i) => {
          const [x, y] = point(i * angleStep, radius + 18);
          return <text key={d} x={x} y={y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: "rgb(71 85 105)" }}>{d}</text>;
        })}
      </svg>
    </div>
  );
}
