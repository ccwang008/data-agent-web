// 元数据管理报告（T-44，L4）。
// 版本化报告视图：左侧版本化报告列表 + 右侧报告详情
// （量化指标：采集覆盖率 / 质量分 / 血缘完整率 + 趋势 + 差距 + 改进）
// 引用 /metrics/architecture KPI，不在本页重复计算。
import { useMemo, useState } from "react";
import {
  Activity, BarChart3, CheckCircle2, ChevronRight, Download, FileText,
  GitBranch, ListChecks, Plus, Sparkles, TrendingDown, TrendingUp,
} from "lucide-react";

import {
  ActionButton, InlineNotice, PageTitle, Panel, Pill, ProgressBar,
  WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import {
  SCHEMA_VERSION, seedMetadataReports,
} from "../fixtures";
import { formatNow, useGovernanceState } from "../state";
import type { GovernanceStatus, MetadataReport } from "../types";

// 量化指标配置
const METRICS = [
  {
    key: "collectionCoverage" as const,
    label: "采集覆盖率",
    icon: Activity,
    unit: "%",
    target: 95,
    desc: "已采集元数据对象 / 应采集对象",
    kpiRef: "/metrics/architecture · 元数据采集覆盖率",
  },
  {
    key: "qualityScore" as const,
    label: "质量分",
    icon: BarChart3,
    unit: "分",
    target: 85,
    desc: "三维评分（完整/准确/时效）综合",
    kpiRef: "/metrics/architecture · 元数据质量分",
  },
  {
    key: "lineageCompleteness" as const,
    label: "血缘完整率",
    icon: GitBranch,
    unit: "%",
    target: 90,
    desc: "已建立血缘的对象 / 应建立血缘对象",
    kpiRef: "/metrics/architecture · 血缘完整率",
  },
];

type ReportState = {
  schemaVersion: number;
  reports: MetadataReport[];
};

const initialState: ReportState = {
  schemaVersion: SCHEMA_VERSION,
  reports: seedMetadataReports,
};

export function MetadataReportPage() {
  const [state, update, meta] = useGovernanceState<ReportState>(
    "data-agent.data-governance.metadata-reports",
    initialState,
  );
  const [activeReportId, setActiveReportId] = useState<string>(
    state.reports[0]?.id ?? "",
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const activeReport =
    state.reports.find((r) => r.id === activeReportId) ?? state.reports[0] ?? null;

  // 趋势对比：与上一期对比
  const trendData = useMemo(() => {
    if (!activeReport) return null;
    const idx = state.reports.findIndex((r) => r.id === activeReport.id);
    const prev = state.reports[idx + 1];
    if (!prev) return null;
    return {
      collectionCoverage: activeReport.collectionCoverage - prev.collectionCoverage,
      qualityScore: activeReport.qualityScore - prev.qualityScore,
      lineageCompleteness: activeReport.lineageCompleteness - prev.lineageCompleteness,
    };
  }, [activeReport, state.reports]);

  function publishReport(id: string) {
    update((cur) => ({
      ...cur,
      reports: cur.reports.map((r) =>
        r.id === id
          ? { ...r, status: "已发布" as GovernanceStatus, createdAt: formatNow() }
          : r,
      ),
    }));
    setNotice(`报告 ${id} 已发布`);
  }

  function createDraft() {
    const period = `2026-${String(state.reports.length + 7).padStart(2, "0")}`;
    const draft: MetadataReport = {
      id: `MREP-${period}`,
      period,
      collectionCoverage: 0,
      qualityScore: 0,
      lineageCompleteness: 0,
      trends: "待填写",
      gaps: "待填写",
      improvements: "待填写",
      status: "草稿",
      createdAt: formatNow(),
    };
    update((cur) => ({
      ...cur,
      reports: [draft, ...cur.reports],
    }));
    setActiveReportId(draft.id);
    setCreating(true);
    setNotice(`已创建草稿报告 ${draft.id}，请填写量化指标和工作内容`);
  }

  function updateDraft(field: keyof MetadataReport, value: string | number) {
    if (!activeReport) return;
    update((cur) => ({
      ...cur,
      reports: cur.reports.map((r) =>
        r.id === activeReport.id ? { ...r, [field]: value } : r,
      ),
    }));
  }

  function saveDraft() {
    setCreating(false);
    setNotice(`草稿 ${activeReport?.id} 已保存`);
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Governance / Metadata Reports"
        title="元数据管理报告"
        description="版本化报告：定期冻结元数据管理量化指标和工作报告，引用 /metrics/architecture KPI 不重复计算。"
        actions={
          <ActionButton primary icon={Plus} onClick={createDraft}>
            新建草稿报告
          </ActionButton>
        }
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      {notice && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
          {notice}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* 左：版本化报告列表 */}
        <Panel
          title="版本化报告列表"
          description="按期归档，最新在上"
          actions={
            <Pill tone="blue" size="sm">
              {state.reports.length} 期
            </Pill>
          }
        >
          <div className="max-h-[680px] divide-y divide-border overflow-y-auto">
            {state.reports.map((report) => {
              const isActive = activeReport?.id === report.id;
              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => {
                    setActiveReportId(report.id);
                    setCreating(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 p-3 text-left transition hover:bg-muted/30",
                    isActive && "bg-blue-50/70",
                  )}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-semibold text-foreground">
                        {report.period}
                      </span>
                      <Pill tone={statusTone(report.status)} size="sm">
                        {report.status}
                      </Pill>
                    </div>
                    <div className="mt-1 font-mono text-[9px] text-muted-foreground">
                      {report.id}
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-1 text-[9px] text-muted-foreground">
                      <span>采集 {report.collectionCoverage}%</span>
                      <span>质量 {report.qualityScore}</span>
                      <span>血缘 {report.lineageCompleteness}%</span>
                    </div>
                    <div className="mt-1 text-[9px] text-muted-foreground">
                      创建于 {report.createdAt}
                    </div>
                  </span>
                  <ChevronRight
                    className={cn(
                      "mt-2 h-3.5 w-3.5 text-slate-300 transition",
                      isActive && "text-blue-500",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </Panel>

        {/* 右：报告详情 */}
        {activeReport ? (
          <div className="space-y-4">
            {/* 报告头部 */}
            <Panel
              title={`报告 · ${activeReport.period}`}
              description={`${activeReport.id} · 创建于 ${activeReport.createdAt}`}
              actions={
                <div className="flex items-center gap-2">
                  <Pill tone={statusTone(activeReport.status)} size="sm">
                    {activeReport.status}
                  </Pill>
                  {activeReport.status !== "已发布" && (
                    <ActionButton
                      primary
                      size="sm"
                      icon={CheckCircle2}
                      onClick={() => publishReport(activeReport.id)}
                    >
                      发布报告
                    </ActionButton>
                  )}
                  <ActionButton size="sm" icon={Download}>
                    导出
                  </ActionButton>
                </div>
              }
            >
              <div className="p-4">
                <div className="rounded-md border border-blue-200 bg-blue-50/40 p-3 text-[10px] leading-5 text-blue-800">
                  <Sparkles className="mr-1 inline h-3.5 w-3.5" />
                  本报告冻结元数据管理量化指标；详细 KPI 引用
                  <code className="mx-1 rounded bg-white/60 px-1 py-0.5 font-mono text-[10px]">
                    /metrics/architecture
                  </code>
                  不在本文重复计算。
                </div>
              </div>
            </Panel>

            {/* 量化指标卡 */}
            <div className="grid gap-3 sm:grid-cols-3">
              {METRICS.map((m) => {
                const value = activeReport[m.key];
                const target = m.target;
                const reached = value >= target;
                const delta = trendData ? trendData[m.key] : 0;
                const Icon = m.icon;
                return (
                  <div
                    key={m.key}
                    className="rounded-lg border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {m.label}
                      </span>
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span
                        className={cn(
                          "text-[24px] font-semibold tabular-nums",
                          reached ? "text-emerald-600" : "text-amber-600",
                        )}
                      >
                        {value}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{m.unit}</span>
                      {delta !== 0 && (
                        <span
                          className={cn(
                            "ml-auto inline-flex items-center gap-0.5 text-[10px]",
                            delta > 0 ? "text-emerald-600" : "text-amber-600",
                          )}
                        >
                          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <ProgressBar
                      value={value}
                      tone={reached ? "green" : "amber"}
                      className="mt-2"
                    />
                    <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
                      <span>目标 ≥ {target}{m.unit}</span>
                      <Pill tone={reached ? "green" : "amber"} size="sm">
                        {reached ? "达标" : "未达标"}
                      </Pill>
                    </div>
                    <div className="mt-1 text-[9px] text-muted-foreground">
                      {m.desc}
                    </div>
                    <div className="mt-1.5 text-[9px] text-muted-foreground">
                      引用：<code className="font-mono">{m.kpiRef}</code>
                    </div>
                    {/* 草稿态可编辑 */}
                    {creating && activeReport.status === "草稿" && (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          updateDraft(m.key, Number(e.target.value) || 0)
                        }
                        className="mt-2 h-7 w-full rounded-md border border-input bg-card px-2 text-[11px] outline-none focus:border-primary/60"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* 趋势 */}
            <Panel
              title="趋势"
              description="本期与上期对比 + 文字描述"
              actions={
                trendData && (
                  <Pill
                    tone={
                      trendData.collectionCoverage + trendData.qualityScore + trendData.lineageCompleteness > 0
                        ? "green"
                        : "amber"
                    }
                    size="sm"
                  >
                    综合趋势 {trendData.collectionCoverage + trendData.qualityScore + trendData.lineageCompleteness > 0 ? "上升" : "下降"}
                  </Pill>
                )
              }
            >
              <div className="p-4">
                {trendData && (
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    <TrendBar
                      label="采集覆盖率"
                      delta={trendData.collectionCoverage}
                      unit="%"
                    />
                    <TrendBar
                      label="质量分"
                      delta={trendData.qualityScore}
                      unit="分"
                    />
                    <TrendBar
                      label="血缘完整率"
                      delta={trendData.lineageCompleteness}
                      unit="%"
                    />
                  </div>
                )}
                {creating && activeReport.status === "草稿" ? (
                  <textarea
                    value={activeReport.trends}
                    onChange={(e) => updateDraft("trends", e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 text-[11px] outline-none focus:border-primary/60"
                    placeholder="描述本期相比上期的变化趋势"
                  />
                ) : (
                  <p className="rounded-md border border-border bg-muted/20 p-3 text-[11px] leading-6 text-foreground">
                    {activeReport.trends}
                  </p>
                )}
              </div>
            </Panel>

            {/* 差距与改进（两列） */}
            <div className="grid gap-4 md:grid-cols-2">
              <Panel
                title="差距"
                description="本期未达标项与原因"
                actions={<Pill tone="amber" size="sm">差距分析</Pill>}
              >
                <div className="p-4">
                  {creating && activeReport.status === "草稿" ? (
                    <textarea
                      value={activeReport.gaps}
                      onChange={(e) => updateDraft("gaps", e.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-input bg-card px-3 py-2 text-[11px] outline-none focus:border-primary/60"
                      placeholder="列出未达标指标和差距原因"
                    />
                  ) : (
                    <div className="rounded-md border border-amber-200 bg-amber-50/40 p-3 text-[11px] leading-6 text-amber-900">
                      <ListChecks className="mr-1 inline h-3.5 w-3.5" />
                      {activeReport.gaps}
                    </div>
                  )}
                </div>
              </Panel>
              <Panel
                title="改进措施"
                description="下期改进方向和动作"
                actions={<Pill tone="green" size="sm">改进</Pill>}
              >
                <div className="p-4">
                  {creating && activeReport.status === "草稿" ? (
                    <textarea
                      value={activeReport.improvements}
                      onChange={(e) => updateDraft("improvements", e.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-input bg-card px-3 py-2 text-[11px] outline-none focus:border-primary/60"
                      placeholder="列出下期改进措施和负责人"
                    />
                  ) : (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50/40 p-3 text-[11px] leading-6 text-emerald-900">
                      <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                      {activeReport.improvements}
                    </div>
                  )}
                </div>
              </Panel>
            </div>

            {/* 草稿编辑操作条 */}
            {creating && activeReport.status === "草稿" && (
              <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50/60 p-3">
                <div className="text-[11px] text-blue-800">
                  草稿编辑中：可编辑量化指标、趋势、差距、改进；保存后可发布为正式报告。
                </div>
                <ActionButton primary onClick={saveDraft}>
                  保存草稿
                </ActionButton>
              </div>
            )}
          </div>
        ) : (
          <Panel>
            <div className="p-16 text-center text-[12px] text-muted-foreground">
              从左侧选择一期报告查看详情
            </div>
          </Panel>
        )}
      </div>
    </WorkspacePage>
  );
}

// 趋势条
function TrendBar({
  label,
  delta,
  unit,
}: {
  label: string;
  delta: number;
  unit: string;
}) {
  const positive = delta > 0;
  const zero = delta === 0;
  return (
    <div
      className={cn(
        "rounded-md border p-2.5",
        zero
          ? "border-slate-200 bg-slate-50"
          : positive
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-amber-200 bg-amber-50/60",
      )}
    >
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-1">
        {zero ? null : positive ? (
          <TrendingUp className="h-3 w-3 text-emerald-600" />
        ) : (
          <TrendingDown className="h-3 w-3 text-amber-600" />
        )}
        <span
          className={cn(
            "text-[12px] font-semibold tabular-nums",
            zero
              ? "text-slate-600"
              : positive
                ? "text-emerald-700"
                : "text-amber-700",
          )}
        >
          {zero ? "持平" : `${positive ? "+" : ""}${delta.toFixed(1)}${unit}`}
        </span>
      </div>
    </div>
  );
}
