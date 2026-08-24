import { useState } from "react";
import {
  AlertTriangle, Calculator, ChevronLeft, ChevronRight, GitBranch, GitCompareArrows, Layers, PanelLeftClose, PanelRightClose, Plus, Sparkles, X,
} from "lucide-react";

import {
  ActionButton, InlineNotice, PageTitle, Panel, Pill, ProgressBar, WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import { ApprovalActions, VersionTraceDrawer } from "../components";
import { createDefaultMetricState, DATA_STANDARD_SCOPES } from "../fixtures";
import { makeId, useDataStandardState } from "../state";
import type { ComparisonResult, MetricDefinition, MetricImplementation, ReviewStatus } from "../types";

type MtState = ReturnType<typeof createDefaultMetricState>;

const METRIC_TYPES: MetricDefinition["metricType"][] = ["原子指标", "派生指标", "复合指标"];

export function MetricDictionaryPage() {
  const [state, update, meta] = useDataStandardState<MtState>(DATA_STANDARD_SCOPES.metric, createDefaultMetricState());
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(state.definitions[0]?.id ?? null);
  const [versionOpen, setVersionOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const metric = state.definitions.find((m) => m.id === selectedMetricId) ?? state.definitions[0] ?? null;
  const implementations = state.implementations.filter((i) => i.metricId === metric?.id);
  const semanticModel = state.semanticModels.find((s) => s.metricVersionId === versionIdOf(metric?.id));

  const publishedMetrics = state.definitions.filter((m) => m.status === "已发布");
  const coverage = state.definitions.length ? Math.round((publishedMetrics.length / state.definitions.length) * 100) : 0;
  const autoComputeMetrics = state.definitions.filter((m) => m.autoComputeEnabled);
  const boundSemantic = autoComputeMetrics.filter((m) => state.semanticModels.some((s) => s.metricVersionId === versionIdOf(m.id) && s.executionStatus === "可执行"));
  const semanticBindRate = autoComputeMetrics.length ? Math.round((boundSemantic.length / autoComputeMetrics.length) * 100) : 0;
  const consistentGroups = state.comparisons.filter((c) => c.result === "一致" || c.result === "受控变体");
  const consistencyRate = state.comparisons.length ? Math.round((consistentGroups.length / state.comparisons.length) * 100) : 0;

  function publishMetric(m: MetricDefinition, next: ReviewStatus) {
    if (next === "已发布") {
      if (!m.formula || !m.sourceRefs.length || !m.ownerId) {
        setNotice("发布校验失败：缺少计算逻辑、数据来源或责任人。");
        return;
      }
      if (m.autoComputeEnabled && !(semanticModel && semanticModel.executionStatus === "可执行")) {
        setNotice("发布校验失败：启用自动计算但未绑定可执行语义层模型。");
        return;
      }
    }
    update((cur) => ({
      ...cur,
      definitions: cur.definitions.map((d) => d.id === m.id ? { ...d, status: next } : d),
      updatedAt: new Date().toISOString(),
    }));
    setNotice(`指标「${m.name}」已推进至${next}。`);
  }

  function compareCalibers() {
    if (!metric || implementations.length < 2) {
      setNotice("跨部门口径对比至少需要两个部门实现。");
      return;
    }
    const formulas = implementations.map((i) => i.formula);
    const allSame = new Set(formulas).size === 1;
    const result: ComparisonResult = allSame ? "一致" : "冲突";
    update((cur) => ({
      ...cur,
      comparisons: [{
        id: makeId("MC"), groupId: `GRP-${metric.id}`, implementationIds: implementations.map((i) => i.id),
        result, differences: allSame ? [] : ["公式不一致", "过滤条件不一致"],
        evidenceIds: [makeId("EV")], reviewStatus: "待批准",
      }, ...cur.comparisons],
      updatedAt: new Date().toISOString(),
    }));
    setNotice(`AI 口径比对完成：结果为${result}，责任人不同不构成冲突。`);
  }

  function addImplementation() {
    if (!metric) return;
    const impl: MetricImplementation = {
      id: makeId("MI"), metricId: metric.id, departmentId: "新部门",
      implementationVersion: "v1", formula: metric.formula, grain: metric.grain, semanticRefs: [],
    };
    update((cur) => ({ ...cur, implementations: [impl, ...cur.implementations], updatedAt: new Date().toISOString() }));
    setNotice("部门实现已登记，需关联企业指标 ID；历史未关联指标由 AI 自动分组。");
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Data Standard / Metric Dictionary"
        title="指标字典与语义层工作台"
        description="统一指标口径并连接可执行语义模型：以公式、血缘和多实现对比为中心，发布校验定义/计算/来源/责任人，AI 比对输出一致/受控变体/冲突/未知。"
        actions={<>
          <ActionButton onClick={() => setEvidenceOpen(true)}>标准参与证据</ActionButton>
          <ActionButton icon={Plus} primary onClick={() => setVersionOpen(true)}>口径版本追溯</ActionButton>
        </>}
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      {notice && <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">{notice}</div>}

      {/* 紧凑指标条 */}
      <div className="mb-3 flex flex-wrap items-center gap-6 rounded-md border border-border bg-card px-4 py-2.5">
        <EditorMetric icon={Calculator} label="字典覆盖率" value={`${coverage}%`} tone={coverage >= 95 ? "green" : "amber"} sub={`${publishedMetrics.length}/${state.definitions.length}`} />
        <EditorMetric icon={GitBranch} label="语义层绑定率" value={`${semanticBindRate}%`} tone={semanticBindRate >= 90 ? "green" : "amber"} sub={`${boundSemantic.length}/${autoComputeMetrics.length}`} />
        <EditorMetric icon={GitCompareArrows} label="口径一致率" value={`${consistencyRate}%`} tone={consistencyRate >= 98 ? "green" : "amber"} sub={`${consistentGroups.length}/${state.comparisons.length}`} />
        <EditorMetric icon={Sparkles} label="AI分组准确率" value="99.2%" tone="violet" sub="目标≥99%" />
      </div>

      {/* ===== 编辑器三栏布局：左指标树 + 中心编辑器 + 右语义配置 ===== */}
      <div className="flex min-h-[680px] gap-3">
        {/* 左：指标体系树抽屉（编辑器导航） */}
        <aside className={cn(
          "flex shrink-0 flex-col overflow-hidden rounded-md border border-border bg-card transition-all duration-200",
          leftOpen ? "w-[240px]" : "w-10",
        )}>
          <div className="flex h-10 items-center justify-between border-b border-border px-3">
            {leftOpen && <><span className="text-[11px] font-semibold text-foreground">指标体系</span><span className="text-[10px] text-muted-foreground">{state.definitions.length}</span></>}
            <button type="button" onClick={() => setLeftOpen((v) => !v)} className="rounded p-1 text-muted-foreground hover:bg-muted">
              {leftOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
          {leftOpen && (
            <div className="flex-1 overflow-y-auto p-2">
              {METRIC_TYPES.map((type) => {
                const items = state.definitions.filter((m) => m.metricType === type);
                return (
                  <div key={type} className="mb-2">
                    <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-foreground">
                      <Layers className="h-3.5 w-3.5 text-primary" />{type}
                      <span className="text-[10px] text-muted-foreground">({items.length})</span>
                    </div>
                    <div className="ml-3 border-l border-border pl-2">
                      {items.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMetricId(m.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted/30",
                            metric?.id === m.id && "bg-blue-50/70",
                          )}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="block truncate text-[11px] font-medium text-foreground">{m.name}</span>
                            <span className="block truncate text-[9px] text-muted-foreground">{m.period} · {m.unit}</span>
                          </div>
                          <Pill tone={statusTone(m.status)} size="sm">{m.version}</Pill>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* 中心：编辑器（主角，不是三栏中间的一小块） */}
        <main className="flex min-w-0 flex-1 flex-col gap-3">
          {metric ? (
            <>
              {/* 编辑器头部：指标身份 + 审批操作条 */}
              <div className="rounded-lg border border-border bg-card">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-[18px] font-semibold tracking-tight text-foreground">{metric.name}</h1>
                      <Pill tone={metric.metricType === "原子指标" ? "blue" : metric.metricType === "派生指标" ? "violet" : "amber"} size="sm">{metric.metricType}</Pill>
                      <Pill tone={statusTone(metric.status)} size="sm">{metric.status}</Pill>
                    </div>
                    <p className="mt-1.5 max-w-4xl text-[12px] leading-5 text-muted-foreground">{metric.businessDefinition}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                      <span>企业指标 ID：<code className="rounded bg-muted/30 px-1.5 py-0.5 font-mono text-[10px]">{metric.standardId}</code></span>
                      <span>版本：{metric.version}</span>
                      <span>责任人：{metric.ownerId}</span>
                      <span>数据来源：{metric.sourceRefs.join("、")}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Pill tone={metric.autoComputeEnabled ? "blue" : "slate"} size="sm">自动计算 {metric.autoComputeEnabled ? "已启用" : "未启用"}</Pill>
                    <ApprovalActions status={metric.status} onAdvance={(n) => publishMetric(metric, n as ReviewStatus)} />
                  </div>
                </div>

                {/* 发布校验提示条 */}
                {metric.status !== "已发布" && (
                  <div className="border-b border-border px-5 py-2">
                    {(!metric.formula || !metric.sourceRefs.length || !metric.ownerId || (metric.autoComputeEnabled && !(semanticModel?.executionStatus === "可执行"))) ? (
                      <div className="flex items-start gap-2 text-[10px] text-amber-700">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <div>
                          <div className="font-semibold">发布校验未通过：</div>
                          <ul className="mt-0.5 list-disc pl-4 space-y-0.5">
                            {!metric.formula && <li>缺少计算逻辑（公式）</li>}
                            {!metric.sourceRefs.length && <li>缺少数据来源</li>}
                            {!metric.ownerId && <li>缺少责任人</li>}
                            {metric.autoComputeEnabled && !(semanticModel?.executionStatus === "可执行") && <li>启用自动计算但未绑定可执行语义层模型（在右侧面板配置）</li>}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[10px] text-emerald-700">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />发布校验全部通过，可推进至已发布。修改已发布口径必须创建待审批草稿，不直接改写正式事实。
                      </div>
                    )}
                  </div>
                )}

                {/* 核心：公式编辑器（大代码块） */}
                <div className="px-5 py-4">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">计算公式</div>
                  <div className="overflow-x-auto rounded-md border border-border bg-slate-900 px-4 py-3 text-[12.5px] leading-6 text-slate-100 shadow-inner">
                    <div className="flex items-start gap-3">
                      <div className="select-none pt-0.5 text-right text-[10px] text-slate-500 font-mono min-w-[24px]">1</div>
                      <code className="font-mono whitespace-pre">{metric.formula}</code>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    公式中引用的基础指标需已发布；口径变更走审批链，合并/拆分 ID 须责任人批准。
                  </div>
                </div>

                {/* 口径属性网格 */}
                <div className="grid grid-cols-2 gap-2 border-t border-border px-5 py-4 sm:grid-cols-3 lg:grid-cols-4">
                  {[["用途", metric.purpose], ["适用范围", metric.scope], ["过滤条件", metric.filters], ["统计粒度", metric.grain], ["统计周期", metric.period], ["计量单位", metric.unit], ["数值精度", metric.precision], ["责任人", metric.ownerId]].map(([k, v]) => (
                    <div key={k} className="rounded-md border border-border bg-muted/20 px-2.5 py-2">
                      <div className="text-[9px] text-muted-foreground">{k}</div>
                      <div className="mt-0.5 truncate text-[11px] font-medium text-foreground">{v}</div>
                    </div>
                  ))}
                </div>

                {/* 维度标签条 */}
                {metric.dimensions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-5 py-3">
                    <span className="text-[10px] text-muted-foreground">统计维度：</span>
                    {metric.dimensions.map((d) => <Pill key={d} tone="slate" size="sm">维度：{d}</Pill>)}
                  </div>
                )}
              </div>

              {/* 底部：跨部门口径对比（大宽区，因为要并排显示多部门实现卡） */}
              <Panel
                title="跨部门口径对比"
                description={`同一企业指标「${metric.name}」的部门实现与 AI 比对结果 · 责任人不同不构成冲突`}
                actions={
                  <div className="flex items-center gap-2">
                    <ActionButton icon={GitCompareArrows} size="sm" onClick={compareCalibers}>AI 比对</ActionButton>
                    <ActionButton icon={Plus} size="sm" onClick={addImplementation}>登记部门实现</ActionButton>
                  </div>
                }
              >
                <div className="p-4">
                  {implementations.length === 0 && (
                    <div className="rounded-md border border-dashed border-border p-6 text-center text-[11px] text-muted-foreground">
                      暂无部门实现，点击"登记部门实现"创建或等待 AI 自动分组历史指标。
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {implementations.map((impl) => {
                      const comparison = state.comparisons.find((c) => c.implementationIds.includes(impl.id));
                      return (
                        <div key={impl.id} className="rounded-lg border border-border bg-card p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-semibold text-foreground">{impl.departmentId}</span>
                            <Pill tone="slate" size="sm">{impl.implementationVersion}</Pill>
                          </div>
                          <div className="mt-2 overflow-x-auto rounded-md border border-slate-800/10 bg-slate-50 px-2.5 py-2">
                            <code className="block whitespace-nowrap font-mono text-[10px] text-slate-700">{impl.formula}</code>
                          </div>
                          <div className="mt-2 text-[10px] text-muted-foreground">粒度 {impl.grain} · 语义引用 {impl.semanticRefs.join("、") || "—"}</div>
                          {comparison && (
                            <div className="mt-2 rounded-md border border-border bg-muted/10 px-2 py-1.5">
                              <Pill tone={comparisonTone(comparison.result)} size="sm">{comparison.result}</Pill>
                              {comparison.differences.length > 0 && (
                                <ul className="mt-1 space-y-0.5 text-[10px] text-amber-800">
                                  {comparison.differences.map((d) => <li key={d} className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{d}</li>)}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 rounded-md border border-dashed border-border p-2.5 text-[10px] leading-5 text-muted-foreground">
                    AI 比对结果分四类：<b>一致</b> / <b>受控变体</b>（维度/粒度扩展） / <b>冲突</b>（口径本质差异） / <b>未知</b>（证据不足）。责任人不同不构成冲突，物理来源不同但语义等价且血缘可证也不构成冲突。
                  </div>
                </div>
              </Panel>
            </>
          ) : (
            <Panel><div className="p-16 text-center text-[12px] text-muted-foreground">从左侧指标体系树选择一个指标开始编辑</div></Panel>
          )}
        </main>

        {/* 右：语义层模型配置（抽屉） */}
        <aside className={cn(
          "flex shrink-0 flex-col overflow-hidden rounded-md border border-border bg-card transition-all duration-200",
          rightOpen ? "w-[320px]" : "w-10",
        )}>
          <div className="flex h-10 items-center justify-between border-b border-border px-3">
            {rightOpen && <><span className="text-[11px] font-semibold text-foreground">语义层模型</span>{semanticModel && <Pill tone={semanticModel.executionStatus === "可执行" ? "green" : semanticModel.executionStatus === "待绑定" ? "amber" : "red"} size="sm">{semanticModel.executionStatus}</Pill>}</>}
            <button type="button" onClick={() => setRightOpen((v) => !v)} className="rounded p-1 text-muted-foreground hover:bg-muted">
              {rightOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          </div>
          {rightOpen && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {semanticModel ? (
                <>
                  <div>
                    <div className="mb-1.5 text-[10px] text-muted-foreground">执行状态</div>
                    <ProgressBar
                      value={semanticModel.executionStatus === "可执行" ? 100 : 40}
                      tone={semanticModel.executionStatus === "可执行" ? "green" : "amber"}
                    />
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {semanticModel.executionStatus === "可执行" ? "血缘完整，可直接运行" : "血缘缺失 60%，需补全物理表映射"}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">可执行表达</div>
                    <div className="rounded-md border border-border bg-slate-900 px-3 py-2 text-[11px] text-slate-100">
                      <code className="block whitespace-pre-wrap font-mono">{semanticModel.expression}</code>
                    </div>
                  </div>

                  <div className="rounded-md border border-border bg-muted/20 p-3">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <GitBranch className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <div>
                        <div className="font-medium text-foreground">物理血缘</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground break-all">{semanticModel.physicalLineage}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-5 text-amber-800">
                    启用自动计算前必须绑定可执行语义层模型并确保血缘完整。当前模型：{semanticModel.executionStatus}
                  </div>
                </>
              ) : (
                <div className="pt-10 text-center">
                  <div className="text-[11px] text-muted-foreground mb-3">该指标未绑定语义层模型</div>
                  <Pill tone="amber" size="sm">待绑定</Pill>
                  <div className="mt-4 rounded-md border border-dashed border-border p-3 text-[10px] leading-5 text-muted-foreground">
                    启用自动计算前必须绑定可执行模型。语义层指标模型由数据标准域权威维护，冲突按期闭环率目标 ≥95%。
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {metric && <VersionTraceDrawer open={versionOpen} onClose={() => setVersionOpen(false)} versions={metricVersions(metric, state.versions)} title={metric.name} />}
      <EvidenceDrawer open={evidenceOpen} onClose={() => setEvidenceOpen(false)} onCreateEvidence={() => { setEvidenceOpen(false); setNotice("已创建改进事项：补齐指标标准参与证据。"); }} />
    </WorkspacePage>
  );
}

function versionIdOf(metricId?: string | null): string {
  if (!metricId) return "—";
  return metricId === "MT-001" ? "VER-MT-001-2" : metricId === "MT-002" ? "VER-MT-002-1" : "VER-MT-001-2";
}

function comparisonTone(result: ComparisonResult) {
  if (result === "一致") return "green" as const;
  if (result === "受控变体") return "blue" as const;
  if (result === "冲突") return "red" as const;
  return "amber" as const;
}

function metricVersions(metric: MetricDefinition, versions: MtState["versions"]) {
  const related = versions.filter((v) => v.standardId === metric.standardId);
  if (related.length) return related;
  return [{ id: `${metric.id}-v1`, standardId: metric.standardId, version: metric.version, content: `${metric.name} ${metric.version}：${metric.formula}`, changeReason: metric.status === "已发布" ? "首次发布" : "新建草稿", createdBy: metric.ownerId, approvedBy: metric.status === "已发布" ? "数据标准负责人" : "—", createdAt: "2026-06-22 15:00", previousVersionId: null }];
}

function EditorMetric({ icon: Icon, label, value, sub, tone }: {
  icon: any; label: string; value: string; sub?: string;
  tone: "green" | "amber" | "violet" | "blue" | "slate" | "red";
}) {
  const toneMap: Record<string, string> = {
    green: "text-emerald-600", amber: "text-amber-600", violet: "text-violet-600", blue: "text-blue-600", slate: "text-slate-600", red: "text-red-600",
  };
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn("rounded-md bg-muted/40 p-1.5", toneMap[tone])}><Icon className="h-4 w-4" /></div>
      <div>
        <div className="text-[10px] text-muted-foreground">{label}{sub && <span className="ml-1 text-muted-foreground/70">({sub})</span>}</div>
        <div className={cn("text-[14px] font-semibold tabular-nums", toneMap[tone])}>{value}</div>
      </div>
    </div>
  );
}

function EvidenceDrawer({ open, onClose, onCreateEvidence }: { open: boolean; onClose: () => void; onCreateEvidence: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">Evidence</div>
            <div className="text-[14px] font-semibold text-foreground">标准参与证据</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 text-amber-600" />
              <div>
                <div className="text-[12px] font-semibold text-amber-900">证据缺口</div>
                <p className="mt-1 text-[11px] leading-5 text-amber-800">当前未登记国家/行业标准参与项目。语义层指标模型由数据标准域权威维护；指标冲突按期闭环率目标 ≥95%。</p>
              </div>
            </div>
            <div className="mt-3"><ActionButton primary onClick={onCreateEvidence}>创建改进事项：补齐证据</ActionButton></div>
          </div>
        </div>
      </div>
    </div>
  );
}
