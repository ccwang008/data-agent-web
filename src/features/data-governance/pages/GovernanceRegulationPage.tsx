// 制度库与执行监控：左侧三层制度文档树 + 起草/审核/发布流程；
// 右侧执行批次卡片 + 符合度评分 + 偏差明细 + 整改事项。
// scope=data-agent.data-governance.center.regulation。
import { useMemo, useState } from "react";
import {
  Activity, AlertOctagon, BookOpen, CheckCircle2, ClipboardList,
  FileCode2, FileText, Plus, ScrollText, Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  ActionButton, InlineNotice, MiniStat, PageTitle, Panel, Pill, ProgressBar, WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import {
  SCHEMA_VERSION, seedGovernanceRegulations, seedRegulationExecutionBatches,
} from "../fixtures";
import { formatNow, makeId, nextVersion, useGovernanceState } from "../state";
import type {
  GovernanceRegulation, GovernanceStatus, RegulationExecutionBatch,
  RegulationExecutionResult, RegulationTier,
} from "../types";

interface RegState {
  schemaVersion: number;
  regulations: GovernanceRegulation[];
  batches: RegulationExecutionBatch[];
  selectedRegulationId: string | null;
  selectedBatchId: string | null;
  // 本地整改事项：制度执行偏差派生
  remediations: Array<{ id: string; batchId: string; regulationId: string; action: string; owner: string; due: string; status: "待整改" | "整改中" | "已闭环" }>;
}

// 三层制度与图标、颜色映射
const TIER_META: Record<RegulationTier, { icon: LucideIcon; tone: "violet" | "blue" | "green"; label: string }> = {
  政策: { icon: ScrollText, tone: "violet", label: "政策层" },
  办法: { icon: FileText, tone: "blue", label: "办法层" },
  细则: { icon: FileCode2, tone: "green", label: "细则层" },
};

// 制度状态在生命周期中的顺序，用于流程可视化
const STATUS_FLOW: GovernanceStatus[] = ["草稿", "待审核", "已发布", "已废止"];

// 执行结果与展示色映射
const RESULT_TONE: Record<RegulationExecutionResult, "green" | "amber" | "red" | "slate"> = {
  通过: "green",
  部分通过: "amber",
  偏差: "red",
  未执行: "slate",
};

const initialRegState: RegState = {
  schemaVersion: SCHEMA_VERSION,
  regulations: seedGovernanceRegulations,
  batches: seedRegulationExecutionBatches,
  selectedRegulationId: "REG-002",
  selectedBatchId: "REB-003",
  // 整改事项由执行批次中偏差/部分通过结果派生
  remediations: seedRegulationExecutionBatches.flatMap((b) =>
    b.results
      .filter((r) => r.result !== "通过" && r.remediation && r.remediation !== "—")
      .map((r) => ({
        id: `REM-${b.id}-${r.regulationId}`,
        batchId: b.id,
        regulationId: r.regulationId,
        action: r.remediation as string,
        owner: "数据治理负责人",
        due: "2026-09-15",
        status: r.result === "偏差" ? "整改中" as const : "待整改" as const,
      })),
  ),
};

export function GovernanceRegulationPage() {
  const [state, setState, meta] = useGovernanceState<RegState>(
    "data-agent.data-governance.center.regulation",
    initialRegState,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const { regulations, batches, selectedRegulationId, selectedBatchId, remediations } = state;

  const selectedRegulation = regulations.find((r) => r.id === selectedRegulationId) ?? null;
  const selectedBatch = batches.find((b) => b.id === selectedBatchId) ?? null;

  // 按层级分组制度
  const tierGroups = useMemo(() => {
    const groups: Record<RegulationTier, GovernanceRegulation[]> = { 政策: [], 办法: [], 细则: [] };
    regulations.forEach((r) => groups[r.tier].push(r));
    return groups;
  }, [regulations]);

  // KPI 摘要
  const publishedCount = regulations.filter((r) => r.status === "已发布").length;
  const avgScore = batches.length ? Math.round(batches.reduce((s, b) => s + b.overallScore, 0) / batches.length) : 0;
  const deviationCount = batches.flatMap((b) => b.results).filter((r) => r.result === "偏差" || r.result === "部分通过").length;
  const openRemediations = remediations.filter((r) => r.status !== "已闭环").length;

  // 制度状态推进：草稿 → 待审核 → 已发布 → 已废止
  function advanceStatus(regId: string) {
    setState((cur) => ({
      ...cur,
      regulations: cur.regulations.map((r) => {
        if (r.id !== regId) return r;
        const idx = STATUS_FLOW.indexOf(r.status);
        const next = idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : r.status;
        if (next === "已发布") {
          return { ...r, status: next, publishedAt: formatNow().slice(0, 10), version: nextVersion(r.version) };
        }
        return { ...r, status: next };
      }),
    }));
    const reg = regulations.find((r) => r.id === regId);
    if (reg) setNotice(`制度「${reg.title}」状态已推进；正式变更走审批链。`);
  }

  // 起草新制度草稿
  function draftNewRegulation(tier: RegulationTier) {
    const newReg: GovernanceRegulation = {
      id: makeId("REG"),
      tier,
      title: `新${tier}草稿`,
      capabilityDomains: [],
      version: "v0.1",
      status: "草稿",
      publishedAt: "—",
      owner: "数据治理负责人",
    };
    setState((cur) => ({ ...cur, regulations: [newReg, ...cur.regulations], selectedRegulationId: newReg.id }));
    setNotice(`已创建${tier}层草稿，待补充标题、能力域与责任人后提交审核。`);
  }

  // 推进整改事项
  function advanceRemediation(id: string) {
    setState((cur) => ({
      ...cur,
      remediations: cur.remediations.map((r) => r.id === id ? {
        ...r,
        status: r.status === "待整改" ? "整改中" : "已闭环",
      } : r),
    }));
    setNotice(`整改事项 ${id} 已推进至下一状态。`);
  }

  // 重新触发执行批次（mock：仅刷新时间戳）
  function rerunBatch(batchId: string) {
    setState((cur) => ({
      ...cur,
      batches: cur.batches.map((b) => b.id === batchId ? { ...b, executedAt: formatNow(), status: "已完成" } : b),
    }));
    setNotice(`批次 ${batchId} 已重新执行（mock），最新结果保留为快照。`);
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Governance / Regulation"
        title="制度库与执行监控"
        description="管理三层制度文档（政策/办法/细则）的起草/审核/发布流程，并监控执行批次符合度与偏差整改。"
        actions={
          <>
            <ActionButton icon={Plus} onClick={() => draftNewRegulation("细则")}>新建细则</ActionButton>
            <ActionButton icon={BookOpen} primary onClick={() => setNotice("制度库同步（mock）：已与文档库对账，未发现版本漂移。")}>对账制度库</ActionButton>
          </>
        }
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      {notice && <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">{notice}</div>}

      {/* 顶部 KPI 摘要 */}
      <div className="grid gap-3 md:grid-cols-4">
        <MiniStat icon={BookOpen} tone="blue" label="制度总数"
          value={regulations.length} hint={`已发布 ${publishedCount} · 草稿 ${regulations.length - publishedCount}`}
        />
        <MiniStat icon={Activity} tone={avgScore >= 80 ? "green" : avgScore >= 70 ? "amber" : "red"}
          label="平均执行符合度" value={`${avgScore}`} hint={`近 ${batches.length} 个执行批次加权`}
        />
        <MiniStat icon={AlertOctagon} tone="red" label="偏差/部分通过" value={deviationCount}
          hint="需补充整改事项或修订制度"
        />
        <MiniStat icon={ClipboardList} tone={openRemediations > 0 ? "amber" : "green"}
          label="待闭环整改" value={openRemediations} hint={`共 ${remediations.length} 项整改事项`}
        />
      </div>

      {/* 主结构：制度库 + 执行监控 双区布局 */}
      <div className="grid gap-3 lg:grid-cols-[minmax(360px,1fr)_minmax(0,1.4fr)]">
        {/* 左：制度库三层文档树 */}
        <Panel
          title="制度库"
          description="按政策 / 办法 / 细则三层分类；点击制度查看版本、能力域与流程"
          actions={<Pill tone="slate" size="sm">{regulations.length} 个制度</Pill>}
        >
          <div className="max-h-[680px] overflow-y-auto p-2">
            {(Object.keys(TIER_META) as RegulationTier[]).map((tier) => {
              const meta = TIER_META[tier];
              const list = tierGroups[tier];
              return (
                <div key={tier} className="mb-2">
                  <div className="flex items-center gap-1.5 px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <meta.icon className={cn("h-3.5 w-3.5", toneTextClass(meta.tone))} />
                    <span>{meta.label}</span>
                    <span className="text-muted-foreground/60">· {list.length}</span>
                    <button
                      type="button"
                      onClick={() => draftNewRegulation(tier)}
                      className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-primary"
                      title={`新建${tier}`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {list.map((reg) => {
                      const selected = selectedRegulationId === reg.id;
                      return (
                        <button
                          key={reg.id}
                          type="button"
                          onClick={() => setState((cur) => ({ ...cur, selectedRegulationId: reg.id }))}
                          className={cn(
                            "flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-1.5 text-left transition hover:bg-muted/30",
                            selected && "border-blue-200 bg-blue-50/70",
                          )}
                        >
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[11px] font-medium text-foreground">{reg.title}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span>{reg.version}</span>
                              <span>·</span>
                              <span>{reg.owner}</span>
                            </div>
                          </div>
                          <Pill tone={statusTone(reg.status)} size="sm">{reg.status}</Pill>
                        </button>
                      );
                    })}
                    {list.length === 0 && (
                      <div className="px-2 py-2 text-[10px] text-muted-foreground">暂无{tier}层制度</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* 右：制度详情 + 执行监控 */}
        <div className="space-y-3">
          {/* 制度详情 + 流程推进 */}
          <Panel
            title={selectedRegulation ? `${selectedRegulation.title}` : "制度详情"}
            description={selectedRegulation
              ? `${selectedRegulation.tier}层 · 版本 ${selectedRegulation.version} · 责任人 ${selectedRegulation.owner}`
              : "请选择左侧制度查看详情"
            }
            actions={selectedRegulation ? (
              <>
                <Pill tone={statusTone(selectedRegulation.status)} size="sm">{selectedRegulation.status}</Pill>
                <ActionButton size="sm" primary disabled={selectedRegulation.status === "已废止"}
                  onClick={() => advanceStatus(selectedRegulation.id)}
                >
                  推进流程
                </ActionButton>
              </>
            ) : undefined}
          >
            {selectedRegulation ? (
              <div className="space-y-3 p-4">
                {/* 起草/审核/发布流程可视化 */}
                <div>
                  <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>生命周期流程</span>
                    <span>当前：{selectedRegulation.status}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {STATUS_FLOW.map((s, i) => {
                      const currentIdx = STATUS_FLOW.indexOf(selectedRegulation.status);
                      const reached = i <= currentIdx;
                      const isCurrent = i === currentIdx;
                      return (
                        <div key={s} className="flex flex-1 items-center gap-1.5">
                          <div className={cn(
                            "flex h-6 flex-1 items-center justify-center rounded-md border text-[10px] font-medium transition",
                            isCurrent ? "border-blue-300 bg-blue-50 text-blue-700"
                              : reached ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-border bg-muted/20 text-muted-foreground",
                          )}>
                            {reached && !isCurrent ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}
                            {s}
                          </div>
                          {i < STATUS_FLOW.length - 1 && <Workflow className="h-3 w-3 shrink-0 text-muted-foreground" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* 能力域覆盖 */}
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">覆盖能力域</div>
                  {selectedRegulation.capabilityDomains.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground">尚未关联 DCMM 能力域，待草稿完善时补充</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRegulation.capabilityDomains.map((d) => (
                        <Pill key={d} tone="blue" size="sm">DCMM {d}</Pill>
                      ))}
                    </div>
                  )}
                </div>
                {/* 元信息 */}
                <div className="grid gap-2 text-[10px] md:grid-cols-3">
                  <MetaField label="制度 ID" value={selectedRegulation.id} />
                  <MetaField label="发布时间" value={selectedRegulation.publishedAt} />
                  <MetaField label="版本号" value={selectedRegulation.version} />
                </div>
                <div className="rounded-md border border-dashed border-border px-3 py-2 text-[10px] leading-5 text-muted-foreground">
                  制度变更需走完整审批链；草稿→待审核需责任人提交，待审核→已发布需治理委员会主任审批；已发布后版本自增。
                </div>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-[11px] text-muted-foreground">选择左侧制度查看详情</div>
            )}
          </Panel>

          {/* 执行监控：批次卡片列表 */}
          <Panel
            title="执行监控批次"
            description="按批次查看执行范围、符合度评分与偏差明细；执行批次不可覆盖"
            actions={<Pill tone="slate" size="sm">{batches.length} 个批次</Pill>}
          >
            <div className="space-y-2 p-3">
              {batches.map((b) => {
                const selected = selectedBatchId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setState((cur) => ({ ...cur, selectedBatchId: b.id }))}
                    className={cn(
                      "block w-full rounded-md border border-border bg-card p-3 text-left transition hover:border-primary/40",
                      selected && "border-blue-300 bg-blue-50/30",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[12px] font-semibold text-foreground">{b.regulationTitle}</span>
                        <Pill tone={statusTone(b.status)} size="sm">{b.status}</Pill>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{b.executedAt}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>范围：{b.scope}</span>
                      <span>·</span>
                      <span>批次 {b.id}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">符合度</span>
                      <ProgressBar className="flex-1" value={b.overallScore}
                        tone={b.overallScore >= 80 ? "green" : b.overallScore >= 70 ? "amber" : "red"}
                      />
                      <span className={cn("text-[11px] font-semibold tabular-nums",
                        b.overallScore >= 80 ? "text-emerald-600" : b.overallScore >= 70 ? "text-amber-600" : "text-red-600")}>
                        {b.overallScore}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {b.results.map((r) => (
                        <Pill key={r.regulationId} tone={RESULT_TONE[r.result]} size="sm">
                          {r.regulationId} · {r.result}
                        </Pill>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* 选中批次的偏差明细 + 整改事项 */}
          {selectedBatch && (
            <Panel
              title={`${selectedBatch.regulationTitle} · 偏差明细与整改`}
              description={`批次 ${selectedBatch.id} · 执行于 ${selectedBatch.executedAt} · 范围 ${selectedBatch.scope}`}
              actions={<ActionButton size="sm" onClick={() => rerunBatch(selectedBatch.id)}>重新执行</ActionButton>}
            >
              <div className="space-y-3 p-3">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-[11px]">
                    <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">制度</th>
                        <th className="px-3 py-2 text-left">执行结果</th>
                        <th className="px-3 py-2 text-right">评分</th>
                        <th className="px-3 py-2 text-left">偏差描述</th>
                        <th className="px-3 py-2 text-left">整改事项</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedBatch.results.map((r) => {
                        const remediation = remediations.find((rm) => rm.batchId === selectedBatch.id && rm.regulationId === r.regulationId);
                        return (
                          <tr key={r.regulationId} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-medium text-foreground">{r.regulationId}</td>
                            <td className="px-3 py-2">
                              <Pill tone={RESULT_TONE[r.result]} size="sm">{r.result}</Pill>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{r.score}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.deviation ?? "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {remediation ? (
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{remediation.action}</span>
                                  <Pill tone={statusTone(remediation.status)} size="sm">{remediation.status}</Pill>
                                </div>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* 整改事项推进 */}
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">整改事项</div>
                  {remediations.filter((r) => r.batchId === selectedBatch.id).length === 0 ? (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-[10px] text-emerald-800">
                      <CheckCircle2 className="mr-1 inline h-3 w-3" />
                      本批次无未闭环整改事项。
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {remediations.filter((r) => r.batchId === selectedBatch.id).map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[11px] font-medium text-foreground">{r.action}</div>
                            <div className="text-[10px] text-muted-foreground">责任人 {r.owner} · 截止 {r.due}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Pill tone={statusTone(r.status)} size="sm">{r.status}</Pill>
                            <ActionButton size="sm" disabled={r.status === "已闭环"} onClick={() => advanceRemediation(r.id)}>
                              推进
                            </ActionButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </WorkspacePage>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[11px] font-medium text-foreground">{value}</div>
    </div>
  );
}

function toneTextClass(tone: "violet" | "blue" | "green"): string {
  const map = { violet: "text-violet-600", blue: "text-blue-600", green: "text-emerald-600" };
  return map[tone];
}
