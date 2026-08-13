import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, Download, FileText, Minus, Target, TrendingUp } from "lucide-react";

import { useDataAssetState } from "../store";
import {
  type IndicatorResult,
  type IndicatorTrend,
  type ManagementReport,
} from "../api/types";
import {
  Badge,
  EmptyState,
  KpiCard,
  Modal,
  PageHeader,
  SecondaryButton,
  SectionCard,
  useToast,
  WarnNote,
  type BadgeTone,
} from "../components/common";

const TREND_META: Record<IndicatorTrend, { icon: typeof ArrowUpRight; className: string }> = {
  up: { icon: ArrowUpRight, className: "text-emerald-600" },
  down: { icon: ArrowDownRight, className: "text-red-500" },
  flat: { icon: Minus, className: "text-slate-400" },
};

const REPORT_TONE: Record<ManagementReport["status"], BadgeTone> = {
  达标: "green",
  部分达标: "amber",
  未达标: "red",
};

export default function ReportsPage() {
  const { state, meta } = useDataAssetState();
  const showToast = useToast();
  const [detail, setDetail] = useState<ManagementReport | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const indicators = state.reports.indicators;
  const reports = useMemo(() => [...state.reports.reports].sort((a, b) => (a.period < b.period ? 1 : -1)), [state.reports.reports]);

  const metCount = indicators.filter((item) => (item.direction === "≥" ? item.actual >= item.target : item.actual === item.target)).length;
  const inProgress = indicators.filter((item) => item.improvementStatus === "进行中").length;
  const offlineCount = reports.filter((report) => report.status === "未达标").length + reports.filter((report) => report.status === "部分达标").length;

  const simulateExport = (report: ManagementReport) => {
    setExporting(report.id);
    window.setTimeout(() => {
      setExporting(null);
      showToast("info", `已模拟导出《${report.kind}报告 · ${report.period} v${report.version}》（原型仅查看与模拟导出，不声称可输出认证材料）`);
    }, 700);
  };

  return (
    <div className="page-shell animate-fade-in">
      <div className="space-y-4">
        <PageHeader
          title="量化管理报告"
          description="DCMM 4 级量化管理：八项指标目标值与实际值、趋势、异常原因和改进措施，指标结果可回溯到扫描批次、资产、权属版本、评估记录、访问审计或整改记录"
        />

        {meta.error && <WarnNote text={`SQLite 状态读写异常：${meta.error.message}`} />}
        <WarnNote text="以下目标值为本产品为落实 DCMM 4 量化管理设置的首期默认目标，可由管理员调整，并非 GB/T 36073—2025 规定的固定认证阈值。" />

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="达标指标" value={`${metCount} / ${indicators.length}`} icon={Target} color="text-emerald-600" bg="bg-emerald-50" />
          <KpiCard label="未达标指标" value={indicators.length - metCount} icon={BarChart3} color="text-red-600" bg="bg-red-50" />
          <KpiCard label="改进措施进行中" value={inProgress} icon={TrendingUp} color="text-blue-600" bg="bg-blue-50" />
          <KpiCard label="专项 / 综合报告" value={reports.length} hint={`含 ${offlineCount} 份未达标或部分达标`} icon={FileText} color="text-primary" bg="bg-primary/10" />
        </section>

        <SectionCard
          title="八项量化指标（统计周期 2026-07）"
          description="每项指标支持目标值、实际值、统计周期、趋势、异常原因和改进措施，并能追溯计算所使用的业务记录"
        >
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {indicators.map((indicator) => {
              const TrendIcon = TREND_META[indicator.trend].icon;
              const met = indicator.direction === "≥" ? indicator.actual >= indicator.target : indicator.actual === indicator.target;
              return (
                <div key={indicator.id} className="rounded-md border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-foreground">{indicator.name}</span>
                        <Badge tone={met ? "green" : "red"}>{met ? "达标" : "未达标"}</Badge>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{indicator.definition}</div>
                    </div>
                    <TrendIcon className={`h-4 w-4 shrink-0 ${TREND_META[indicator.trend].className}`} />
                  </div>
                  <div className="mt-3 flex items-end gap-3">
                    <div className="text-[26px] font-semibold tabular-nums text-foreground">{indicator.actual}<span className="text-[13px] text-muted-foreground">%</span></div>
                    <div className="mb-1 text-[12px] text-muted-foreground">
                      目标 {indicator.direction} {indicator.target}% · 周期 {indicator.period} · 数据时间 {indicator.dataTime.slice(0, 10)}
                    </div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${met ? "bg-emerald-500" : "bg-red-400"}`} style={{ width: `${Math.min(indicator.actual, 100)}%` }} />
                  </div>
                  <div className="mt-2 font-mono text-[10px] text-muted-foreground">口径：{indicator.calcFormula}</div>
                  {indicator.abnormalReason && (
                    <div className="mt-2 rounded-md border border-red-100 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">异常原因：{indicator.abnormalReason}</div>
                  )}
                  {indicator.improvement && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-800">
                      <span>改进措施：{indicator.improvement}</span>
                      <Badge tone={indicator.improvementStatus === "已完成" ? "green" : indicator.improvementStatus === "进行中" ? "blue" : "slate"}>{indicator.improvementStatus}</Badge>
                      {indicator.improvementDueAt && <span className="text-blue-600/80">截止 {indicator.improvementDueAt}</span>}
                    </div>
                  )}
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    追溯：{indicator.traceableTo.join(" · ")}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="管理报告"
          description="每月生成目录质量、权属管理、价值评估、资产运营和使用审计五类专项报告，每季度生成数据资产综合管理报告；报告生成后版本冻结，源数据修正时生成新版本不覆盖历史报告"
        >
          <div className="overflow-x-auto px-5 py-3">
            <table className="w-full min-w-[1000px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-[12px] font-medium text-slate-600">
                  {["报告", "统计周期", "状态", "版本", "生成时间", "责任人", "操作"].map((label) => <th key={label} className="border-b border-border py-3 pr-4">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="text-[13px] text-foreground">
                    <td className="border-b border-border py-3.5 pr-4">
                      <div className="font-medium">{report.kind}报告</div>
                      {report.reviseReason && <div className="mt-0.5 text-[11px] text-amber-700">修订：{report.reviseReason}</div>}
                    </td>
                    <td className="border-b border-border py-3.5 pr-4 text-[12px] text-muted-foreground">{report.period}</td>
                    <td className="border-b border-border py-3.5 pr-4"><Badge tone={REPORT_TONE[report.status]}>{report.status}</Badge></td>
                    <td className="border-b border-border py-3.5 pr-4">
                      <span className="rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] text-blue-700">v{report.version}</span>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">{report.frozen ? "已冻结" : "未冻结"}</div>
                    </td>
                    <td className="border-b border-border py-3.5 pr-4 text-[11px] tabular-nums text-muted-foreground">{report.generatedAt}<div className="mt-0.5">{report.generatedBy}</div></td>
                    <td className="border-b border-border py-3.5 pr-4 text-[12px] text-muted-foreground">{report.responsible}</td>
                    <td className="border-b border-border py-3.5">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setDetail(report)} className="inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary"><FileText className="h-3 w-3" />查看</button>
                        <button type="button" onClick={() => simulateExport(report)} disabled={exporting === report.id} className="inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary disabled:opacity-50"><Download className="h-3 w-3" />{exporting === report.id ? "导出中" : "模拟导出"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reports.length === 0 && <EmptyState title="暂无报告" />}
          </div>
        </SectionCard>

        <SectionCard
          title="量化改进场景"
          description="月度目录质量报告显示扫描更新及时率为 92%，低于 95% 目标；负责人登记改进措施与完成期限，下月报告继续展示整改状态以及指标变化"
        >
          <div className="p-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-md border border-border p-4">
                <div className="flex items-center gap-2">
                  <Badge tone="red">2026-07 未达标</Badge>
                  <span className="text-[13px] font-medium text-foreground">扫描更新及时率 92% &lt; 目标 95%</span>
                </div>
                <div className="mt-2 text-[12px] text-muted-foreground">
                  异常原因：BI 报表平台扫描周期过长，8 项报表变更中 2 项超出 24 小时同步时限。
                </div>
                <div className="mt-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
                  改进措施：缩短报告系统扫描周期为每日两次，并配置同步超时告警 · 责任人：资产管理员 · 截止 2026-08-20 · 状态：进行中
                </div>
              </div>
              <div className="rounded-md border border-border p-4">
                <div className="flex items-center gap-2">
                  <Badge tone="amber">下月跟踪</Badge>
                  <span className="text-[13px] font-medium text-foreground">2026-08 报告将展示整改状态与指标变化</span>
                </div>
                <div className="mt-2 text-[12px] text-muted-foreground">
                  下月报告继续展示整改状态以及指标变化；指标结果可回溯到扫描批次 scan-20260805-bi 与 scan-20260812-night，作为改进措施的效果证据。
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />已接入扫描批次事实数据，支持按月对比
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {detail && <ReportDetailModal report={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function ReportDetailModal({ report, onClose }: { report: ManagementReport; onClose: () => void }) {
  return (
    <Modal
      title={`${report.kind}报告 · ${report.period} v${report.version}`}
      description={`版本已冻结${report.reviseReason ? `；修订说明：${report.reviseReason}` : ""} · 生成 ${report.generatedAt} by ${report.generatedBy}`}
      onClose={onClose}
      width="max-w-3xl"
      footer={<SecondaryButton onClick={onClose}>关闭</SecondaryButton>}
    >
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-surface-raised p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={REPORT_TONE[report.status]}>{report.status}</Badge>
            <span className="text-[12px] text-foreground">{report.summary}</span>
          </div>
        </div>

        <div>
          <div className="mb-2 text-[13px] font-semibold text-foreground">指标快照</div>
          <div className="space-y-2">
            {report.indicators.map((indicator) => (
              <IndicatorRow key={indicator.id} indicator={indicator} />
            ))}
          </div>
        </div>

        {report.gapReasons.length > 0 && (
          <div>
            <div className="mb-2 text-[13px] font-semibold text-foreground">差距原因</div>
            <div className="space-y-1.5">
              {report.gapReasons.map((gap) => (
                <div key={gap.indicator} className="rounded-md border border-border px-3 py-2 text-[12px] text-muted-foreground">
                  <span className="font-medium text-foreground">{gap.indicator}</span>：{gap.reason}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border p-3">
            <div className="text-[11px] text-muted-foreground">责任人 / 截止时间</div>
            <div className="mt-1 text-[12px] text-foreground">{report.responsible} · 截止 {report.dueAt}</div>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="text-[11px] text-muted-foreground">改进措施</div>
            <div className="mt-1 text-[12px] text-foreground">{report.measures.length > 0 ? report.measures.join("；") : "—"}</div>
          </div>
        </div>

        {report.reviewResult && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-800">
            复核结果：{report.reviewResult}{report.reviewedBy ? ` · ${report.reviewedBy} · ${report.reviewedAt}` : ""}
          </div>
        )}

        <div className="rounded-md border border-border bg-surface-raised p-3 text-[11px] text-muted-foreground">
          当前原型只提供查看与模拟导出，不声称输出可直接用于认证的正式材料；报告生成后版本冻结，底层数据修正时重新生成新版本并说明修订原因，不覆盖历史报告。
        </div>
      </div>
    </Modal>
  );
}

function IndicatorRow({ indicator }: { indicator: IndicatorResult }) {
  const TrendIcon = TREND_META[indicator.trend].icon;
  const met = indicator.direction === "≥" ? indicator.actual >= indicator.target : indicator.actual === indicator.target;
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-medium text-foreground">{indicator.name}</span>
        <TrendIcon className={`h-3.5 w-3.5 ${TREND_META[indicator.trend].className}`} />
        <Badge tone={met ? "green" : "red"}>{met ? "达标" : "未达标"}</Badge>
      </div>
      <div className="text-[12px] tabular-nums text-muted-foreground">
        实际 {indicator.actual}% <span className="mx-1">/</span> 目标 {indicator.direction} {indicator.target}%
      </div>
    </div>
  );
}
