// 质量改进报告：版本化报告列表 + 详情（趋势/根因/措施/效果复评/L4 生存周期闭环优化）。
// 版本化报告视图，引用 /metrics/quality KPI 不重复计算。
import { useMemo, useState } from "react";
import {
  ArrowUpRight, CheckCircle2, ChevronRight, FileText, GitBranch,
  Lightbulb, Plus, Sparkles, Target, TrendingUp,
} from "lucide-react";

import {
  ActionButton, InlineNotice, PageTitle, Panel, Pill, ProgressBar,
  WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import { SCHEMA_VERSION, seedQualityImprovementReports } from "../fixtures";
import { useGovernanceState, formatNow } from "../state";
import type { QualityImprovementReport } from "../types";

type ReportState = {
  schemaVersion: number;
  reports: QualityImprovementReport[];
};

const initialState: ReportState = {
  schemaVersion: SCHEMA_VERSION,
  reports: seedQualityImprovementReports,
};

export function QualityImprovementPage() {
  const [state, setState, meta] = useGovernanceState<ReportState>(
    "data-agent.data-governance.quality.improvement",
    initialState,
  );

  const { reports } = state;
  const [activeReportId, setActiveReportId] = useState<string>(reports[0]?.id ?? "");
  const activeReport = reports.find((r) => r.id === activeReportId) ?? reports[0];

  // 从 effectRecheck 文本中提取措施执行率
  const executionRate = useMemo(() => {
    if (!activeReport) return 0;
    const match = /(\d+)%/.exec(activeReport.effectRecheck);
    return match ? Number(match[1]) : 0;
  }, [activeReport]);

  function createReport() {
    // 新建版本化报告（mock）
    const newReport: QualityImprovementReport = {
      id: `QIR-${formatNow().slice(0, 7).replace(/-/g, "")}-${reports.length + 1}`,
      period: formatNow().slice(0, 7),
      trends: "新报告，待补充趋势分析",
      rootCauses: "待补充根因分析",
      measures: "待补充改进措施",
      effectRecheck: "措施执行率 0%，待复检",
      lifecycleOptimization: "待补充 L4 生存周期闭环优化建议",
      status: "草稿",
      createdAt: formatNow(),
    };
    setState((current) => ({ ...current, reports: [newReport, ...current.reports] }));
    setActiveReportId(newReport.id);
  }

  function publishReport(id: string) {
    setState((current) => ({
      ...current,
      reports: current.reports.map((r) =>
        r.id === id ? { ...r, status: "已发布" } : r,
      ),
    }));
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Governance / Quality Improvement"
        title="质量改进报告"
        description="基于闭环数据形成版本化改进报告，跟踪措施执行率与效果复评，引用 /metrics/quality KPI 不重复计算。"
        actions={<ActionButton primary icon={Plus} onClick={createReport}>新建报告</ActionButton>}
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* 版本化报告列表 */}
        <Panel
          title="版本化报告"
          description={`${reports.length} 个版本 · 按时间倒序`}
        >
          <div className="max-h-[680px] overflow-y-auto">
            {reports.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveReportId(r.id)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border p-3 text-left hover:bg-muted/30",
                  activeReport?.id === r.id && "bg-blue-50/70",
                )}
              >
                <FileText className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[10px] text-muted-foreground">{r.id}</span>
                    <Pill tone={statusTone(r.status)} size="sm">{r.status}</Pill>
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-foreground">{r.period} 期报告</div>
                  <div className="mt-1 font-mono text-[9px] text-muted-foreground">{r.createdAt}</div>
                </div>
                <ChevronRight className="mt-2 h-3.5 w-3.5 shrink-0 text-slate-300" />
              </button>
            ))}
            {reports.length === 0 && (
              <div className="p-6 text-center text-[11px] text-muted-foreground">暂无报告，请新建</div>
            )}
          </div>
        </Panel>

        {/* 报告详情 */}
        {activeReport && (
          <div className="space-y-4">
            <Panel
              title={`${activeReport.period} 期质量改进报告`}
              description={`报告 ID ${activeReport.id} · 创建于 ${activeReport.createdAt}`}
              actions={
                <>
                  <Pill tone={statusTone(activeReport.status)} size="sm">{activeReport.status}</Pill>
                  {activeReport.status === "草稿" && (
                    <ActionButton size="sm" primary icon={CheckCircle2} onClick={() => publishReport(activeReport.id)}>发布</ActionButton>
                  )}
                </>
              }
            >
              <div className="p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-border bg-muted/20 p-3">
                    <div className="text-[9px] uppercase text-muted-foreground">措施执行率</div>
                    <div className="mt-1 text-[18px] font-semibold tabular-nums text-foreground">{executionRate}%</div>
                    <ProgressBar value={executionRate} tone={executionRate >= 75 ? "green" : "amber"} className="mt-2" />
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 p-3">
                    <div className="text-[9px] uppercase text-muted-foreground">报告状态</div>
                    <div className="mt-1 text-[12px] font-semibold text-foreground">{activeReport.status}</div>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 p-3">
                    <div className="text-[9px] uppercase text-muted-foreground">引用 KPI</div>
                    <div className="mt-1 font-mono text-[11px] font-semibold text-foreground">/metrics/quality</div>
                    <div className="text-[9px] text-muted-foreground">不重复计算</div>
                  </div>
                </div>
              </div>
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* 趋势 */}
              <Panel title="趋势" description="综合可信度与各维度趋势">
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-[11px] leading-5 text-foreground">{activeReport.trends}</p>
                  </div>
                </div>
              </Panel>

              {/* 根因 */}
              <Panel title="根因" description="基于问题聚类分析">
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                    <p className="text-[11px] leading-5 text-foreground">{activeReport.rootCauses}</p>
                  </div>
                </div>
              </Panel>

              {/* 措施 */}
              <Panel title="改进措施" description="本期落实的改进措施">
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    <Target className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <p className="text-[11px] leading-5 text-foreground">{activeReport.measures}</p>
                  </div>
                </div>
              </Panel>

              {/* 效果复评 */}
              <Panel title="效果复评" description="措施落实与效果复检">
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-[11px] leading-5 text-foreground">{activeReport.effectRecheck}</p>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>执行率</span>
                      <span className="tabular-nums font-semibold text-foreground">{executionRate}%</span>
                    </div>
                    <ProgressBar value={executionRate} tone={executionRate >= 75 ? "green" : "amber"} />
                  </div>
                </div>
              </Panel>
            </div>

            {/* L4 生存周期闭环优化 */}
            <Panel
              title="L4 生存周期闭环优化"
              description="将本期根因反馈到需求矩阵和生存周期闭环"
              actions={<Pill tone="violet"><Sparkles className="mr-1 inline h-3 w-3" />L4</Pill>}
            >
              <div className="p-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  <p className="text-[11px] leading-5 text-foreground">{activeReport.lifecycleOptimization}</p>
                </div>
                <div className="mt-3 rounded-md border border-violet-100 bg-violet-50/60 p-3 text-[10px] leading-5 text-violet-800">
                  <ArrowUpRight className="mr-1 inline h-3 w-3" />
                  建议将本期根因反馈到 /data-governance/quality/requirements 形成新的质量需求，纳入生存周期闭环。
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </WorkspacePage>
  );
}
