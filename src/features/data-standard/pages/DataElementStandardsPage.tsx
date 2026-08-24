import { useState } from "react";
import {
  Boxes, CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, Play, Plus, ScanSearch, Sparkles, Wrench, X,
} from "lucide-react";

import {
  ActionButton, InlineNotice, PageTitle, Panel, Pill, WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import { AiDecisionCard, VersionTraceDrawer } from "../components";
import { createDefaultDataElementState, DATA_STANDARD_SCOPES } from "../fixtures";
import { formatNow, makeId, useDataStandardState } from "../state";
import type { AuditBatch, DataElementBinding, RemediationStatus } from "../types";

type DeState = ReturnType<typeof createDefaultDataElementState>;

export function DataElementStandardsPage() {
  const [state, update, meta] = useDataStandardState<DeState>(DATA_STANDARD_SCOPES.dataElement, createDefaultDataElementState());
  const [selectedStandardId, setSelectedStandardId] = useState<string | null>(state.standards[0]?.id ?? null);
  const [versionOpen, setVersionOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"全部" | "草稿" | "已发布">("全部");
  const [expandedStep, setExpandedStep] = useState<number | null>(0); // 默认展开第一步

  const standard = state.standards.find((s) => s.id === selectedStandardId) ?? state.standards[0] ?? null;
  const bindings = state.bindings.filter((b) => b.standardVersionId === standardIdToVersion(standard?.id));
  const runningBatch = state.auditBatches.find((b) => b.status === "运行中");
  const openIssues = state.issues.filter((i) => i.status !== "已关闭" && i.status !== "已批准例外");

  const managedElements = state.standards.filter((s) => s.status === "已发布");
  const catalogCoverage = state.standards.length ? Math.round((managedElements.length / state.standards.length) * 100) : 0;
  const conformancePassed = state.bindings.filter((b) => b.status === "已落标");
  const conformanceRate = state.bindings.length ? Math.round((conformancePassed.length / state.bindings.length) * 100) : 0;
  const aiBindings = state.bindings.filter((b) => b.bindingMethod === "AI 自动落标");
  const aiCoverage = state.bindings.length ? Math.round((aiBindings.length / state.bindings.length) * 100) : 0;

  function runAudit() {
    const batch: AuditBatch = {
      id: makeId("AUD"), trigger: "手动执行", scopeSnapshot: "数据元域 6 字段",
      standardVersions: state.standards.filter((s) => s.status === "已发布").map((s) => s.version).join(" / "),
      ruleVersions: "RULE-DE-v3", aiModelVersions: "DE-BIND-v2.1",
      status: "运行中", passed: 0, failed: 0, unknown: 0, notApplicable: 0, createdAt: formatNow(),
    };
    update((cur) => ({ ...cur, auditBatches: [batch, ...cur.auditBatches], updatedAt: new Date().toISOString() }));
    setNotice("稽核批次已触发，标准/对象/规则/AI 模型版本已冻结，批次不可覆盖。");
    window.setTimeout(() => {
      update((cur) => ({
        ...cur,
        auditBatches: cur.auditBatches.map((b) => b.id === batch.id ? { ...b, status: "成功", passed: 4, failed: 1, unknown: 1, notApplicable: 0 } : b),
        updatedAt: new Date().toISOString(),
      }));
    }, 700);
  }

  function autoBind(objectRef: string) {
    if (!standard) return;
    const binding: DataElementBinding = {
      id: makeId("DEB"), objectRef, standardVersionId: standardIdToVersion(standard.id),
      bindingMethod: "AI 自动落标", confidence: "低",
      constraintResults: [{ rule: "长度", result: "未知" }, { rule: "格式", result: "未知" }],
      evidenceIds: [makeId("EV")], status: "待复核",
    };
    update((cur) => ({
      ...cur,
      bindings: [binding, ...cur.bindings],
      aiDecisions: [{
        id: makeId("AI"), modelVersion: "DE-BIND-v2.1", strategyVersion: "DE-STRAT-v1.5",
        executedAt: formatNow(), inputRefs: [objectRef], confidence: "低",
        result: "自动落标暂停，进入待复核", rationaleSummary: "字段元数据不足，置信度低于策略阈值。",
        autoExecuted: false, reviewResult: "待复核",
      }, ...cur.aiDecisions],
      updatedAt: new Date().toISOString(),
    }));
    setNotice("AI 自动落标已生成候选；置信度低于阈值，进入待复核，不自动发布。");
  }

  function closeIssue(issueId: string, mode: "复检通过" | "批准例外") {
    update((cur) => ({
      ...cur,
      issues: cur.issues.map((i) => i.id === issueId ? { ...i, status: (mode === "复检通过" ? "已关闭" : "已批准例外") as RemediationStatus } : i),
      updatedAt: new Date().toISOString(),
    }));
    setNotice(`整改问题已${mode === "复检通过" ? "复检通过关闭" : "批准为例外"}，记录效果证据。`);
  }

  const filteredStandards = state.standards.filter((s) => filterStatus === "全部" || s.status === filterStatus);

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Data Standard / Data Element"
        title="数据元标准与自动落标工作台"
        description="将字段候选绑定到批准数据元并验证约束：以字段级推荐、约束对比和稽核为中心，低置信度进入待复核，稽核批次不可覆盖。"
        actions={<>
          <ActionButton icon={Play} onClick={runAudit}>触发稽核</ActionButton>
          <ActionButton onClick={() => setEvidenceOpen(true)}>标准参与证据</ActionButton>
          <ActionButton icon={Plus} primary onClick={() => setVersionOpen(true)}>版本追溯</ActionButton>
        </>}
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      {notice && <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">{notice}</div>}

      {/* 指标条（紧凑） */}
      <div className="mb-3 flex flex-wrap items-center gap-6 rounded-md border border-border bg-card px-4 py-2.5">
        <StepMetric icon={Boxes} label="目录覆盖率" value={`${catalogCoverage}%`} tone={catalogCoverage >= 95 ? "green" : "amber"} sub={`${managedElements.length}/${state.standards.length}`} />
        <StepMetric icon={ClipboardCheck} label="标准符合率" value={`${conformanceRate}%`} tone={conformanceRate >= 95 ? "green" : "amber"} sub={`${conformancePassed.length}/${state.bindings.length}`} />
        <StepMetric icon={Sparkles} label="AI自动落标覆盖" value={`${aiCoverage}%`} tone="violet" sub="目标≥80%" />
        <StepMetric icon={Wrench} label="未关闭整改" value={`${openIssues.length}`} tone={openIssues.length === 0 ? "green" : "amber"} sub="需复检/例外" />
      </div>

      {/* ===== 步骤式纵向流程：不是三栏！===== */}
      <div className="space-y-3">
        {/* Step 1: 标准目录筛选与选择 */}
        <StepSection
          index={1}
          title="选择数据元标准"
          subtitle={`${filteredStandards.length} 条标准 · 从目录选择查看并执行落标`}
          expanded={expandedStep === 0 || expandedStep === null}
          onToggle={() => setExpandedStep(expandedStep === 0 ? null : 0)}
        >
          <div className="p-4">
            {/* 筛选栏 */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {(["全部", "草稿", "已发布"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "h-7 rounded-md border px-2.5 text-[10px] transition",
                    filterStatus === s ? "bg-primary/10 border-primary/30 text-primary font-semibold" : "border-border text-muted-foreground hover:border-muted-foreground/30",
                  )}
                >
                  {s}
                </button>
              ))}
              <div className="ml-auto text-[10px] text-muted-foreground">
                稳定 ID · 约束类型：长度/格式/单位/值域/引用
              </div>
            </div>
            {/* 标准卡网格 */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredStandards.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setSelectedStandardId(s.id); setExpandedStep(1); }}
                  className={cn(
                    "rounded-lg border p-3 text-left transition",
                    standard?.id === s.id
                      ? "border-primary/40 bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/30 hover:bg-muted/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-semibold text-foreground">{s.name}</div>
                      <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{s.englishName}</div>
                    </div>
                    <Pill tone={statusTone(s.status)} size="sm">{s.version}</Pill>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Pill tone="slate" size="sm">{s.type}</Pill>
                    <Pill tone="slate" size="sm">长{s.length}</Pill>
                    {s.unit && <Pill tone="slate" size="sm">{s.unit}</Pill>}
                  </div>
                  <div className="mt-1.5 text-[9px] text-muted-foreground">关联术语 {s.termId ?? "—"} · {s.definition.slice(0, 22)}…</div>
                </button>
              ))}
            </div>
          </div>
        </StepSection>

        {/* Step 2: 标准定义展示 + 字段落标工作区（主工作区） */}
        <StepSection
          index={2}
          title="字段候选 · AI 落标 · 约束检查"
          subtitle={standard ? `标准「${standard.name} ${standard.version}」 · 字段候选推荐 → 绑定数据元 → 逐项约束验证` : "请先选择数据元标准"}
          expanded={expandedStep === 1}
          onToggle={() => setExpandedStep(expandedStep === 1 ? null : 1)}
        >
          {standard ? (
            <div className="space-y-4 p-4">
              {/* 标准定义网格 */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {[["中文", standard.name], ["英文", standard.englishName], ["类型", standard.type], ["长度", `${standard.length}`], ["格式", standard.format], ["单位", standard.unit], ["值域", standard.valueDomainId ?? "—"], ["责任人", standard.ownerId]].map(([k, v]) => (
                  <div key={k as string} className="rounded-md border border-border bg-muted/20 px-2.5 py-2">
                    <div className="text-[9px] text-muted-foreground">{k}</div>
                    <div className="mt-0.5 truncate text-[11px] font-medium text-foreground">{v}</div>
                  </div>
                ))}
              </div>

              {/* 字段候选与落标卡片流 */}
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-semibold text-foreground">字段候选与落标结果</div>
                <ActionButton icon={ScanSearch} size="sm" onClick={() => autoBind("dwd_customer_profile.email")}>AI 自动落标</ActionButton>
              </div>

              <div className="space-y-2">
                {state.candidates.length === 0 && bindings.length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-6 text-center text-[11px] text-muted-foreground">
                    暂无字段候选，点击右上角"AI 自动落标"生成候选
                  </div>
                )}
                {state.candidates.map((c) => (
                  <div key={c.id} className="rounded-md border border-violet-200 bg-violet-50/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-foreground">{c.projectId} · {c.sourceId}</span>
                      <Pill tone="slate" size="sm">{c.reviewStatus}</Pill>
                    </div>
                    <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{c.content}</p>
                    <div className="mt-1.5 rounded-md bg-violet-100/60 px-2 py-1 text-[10px] text-violet-800">
                      <Sparkles className="mr-1 inline h-3 w-3" />{c.aiSuggestion}
                    </div>
                  </div>
                ))}
                {bindings.map((b) => (
                  <div key={b.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-mono text-[11px] text-foreground">{b.objectRef}</span>
                      <div className="flex items-center gap-1.5">
                        <Pill tone={b.confidence === "高" ? "green" : b.confidence === "中" ? "blue" : "amber"} size="sm">{b.confidence}</Pill>
                        <Pill tone={b.status === "已落标" ? "green" : b.status === "待复核" ? "amber" : "red"} size="sm">{b.status}</Pill>
                        <Pill tone="slate" size="sm">{b.bindingMethod}</Pill>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                      {b.constraintResults.map((c) => (
                        <div key={c.rule} className={cn(
                          "rounded border px-2 py-1 text-center text-[10px]",
                          c.result === "通过" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : c.result === "失败" ? "border-red-200 bg-red-50 text-red-700"
                          : "border-amber-200 bg-amber-50 text-amber-700",
                        )}>
                          <div className="font-medium">{c.rule}</div><div className="opacity-80">{c.result}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1.5 text-[10px] text-muted-foreground">
                      绑定版本 {b.standardVersionId} · 证据 {b.evidenceIds.join(",")}
                    </div>
                  </div>
                ))}
              </div>

              {/* AI 决策审计条 */}
              {state.aiDecisions.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  <div className="flex items-start gap-2 text-[10px] leading-5 text-amber-800">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="flex-1">
                      当前 AI 自动落标准确率 98.9%，低于 99.5% 目标，自动发布已暂停；低置信度结果进入待复核，不伪装为成功。
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {state.aiDecisions.slice(0, 2).map((d) => <AiDecisionCard key={d.id} decision={d} />)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-[11px] text-muted-foreground">请先在 Step 1 选择一个数据元标准</div>
          )}
        </StepSection>

        {/* Step 3: 稽核批次（横向时间线卡片） */}
        <StepSection
          index={3}
          title="稽核批次"
          subtitle="不可覆盖批次 · 标准/对象/规则/AI模型版本冻结 · 通过/失败/未知/不适用"
          expanded={expandedStep === 2}
          onToggle={() => setExpandedStep(expandedStep === 2 ? null : 2)}
        >
          <div className="p-4">
            {runningBatch && <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] text-blue-700">批次 {runningBatch.id} 运行中，结果未冻结。</div>}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {state.auditBatches.map((b) => (
                <div key={b.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold font-mono text-foreground">{b.id}</span>
                    <Pill tone={statusTone(b.status)} size="sm">{b.status}</Pill>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{b.trigger} · {b.scopeSnapshot}</div>
                  <div className="mt-0.5 text-[9px] text-muted-foreground">标准 {b.standardVersions}</div>
                  <div className="mt-0.5 text-[9px] text-muted-foreground">规则 {b.ruleVersions} · 模型 {b.aiModelVersions}</div>
                  {(b.status === "成功" || b.status === "运行中") && (
                    <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px]">
                      <div className="rounded bg-emerald-50 py-1 text-emerald-700">通过 {b.passed}</div>
                      <div className="rounded bg-red-50 py-1 text-red-700">失败 {b.failed}</div>
                      <div className="rounded bg-amber-50 py-1 text-amber-700">未知 {b.unknown}</div>
                      <div className="rounded bg-slate-50 py-1 text-slate-600">不适用 {b.notApplicable}</div>
                    </div>
                  )}
                  <div className="mt-1.5 text-[9px] text-muted-foreground">{b.createdAt}</div>
                </div>
              ))}
            </div>
          </div>
        </StepSection>

        {/* Step 4: 整改与复检 */}
        <StepSection
          index={4}
          title={`整改与复检（${openIssues.length} 未关闭）`}
          subtitle="同一对象+标准版本+规则最多一个未关闭问题 · 复检通过或例外批准后方可关闭"
          expanded={expandedStep === 3}
          onToggle={() => setExpandedStep(expandedStep === 3 ? null : 3)}
        >
          <div className="p-4">
            {openIssues.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />当前无未关闭整改问题，所有稽核问题已闭环。
              </div>
            ) : (
              <div className="space-y-2">
                {openIssues.map((i) => (
                  <div key={i.id} className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-amber-900">{i.objectRef}</span>
                        <Pill tone={statusTone(i.status)} size="sm">{i.status}</Pill>
                      </div>
                      <div className="mt-1 text-[10px] text-amber-800">标准版本 {i.standardVersionId} · 规则 {i.ruleId} · 负责人 {i.ownerId} · 创建 {i.createdAt}</div>
                      <div className="mt-1 text-[10px] text-amber-800">证据：{i.evidenceIds.join("、")}</div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <ActionButton size="sm" primary onClick={() => closeIssue(i.id, "复检通过")}>复检通过</ActionButton>
                      <ActionButton size="sm" onClick={() => closeIssue(i.id, "批准例外")}>批准例外</ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 rounded-md border border-dashed border-border p-3 text-[10px] leading-5 text-muted-foreground">
              重复失败追加批次证据，不重复建单；只有复检通过或例外批准后才能关闭。
            </div>
          </div>
        </StepSection>
      </div>

      {standard && <VersionTraceDrawer open={versionOpen} onClose={() => setVersionOpen(false)} versions={deVersions(standard.id, standard.name)} title={standard.name} />}
      <EvidenceDrawer open={evidenceOpen} onClose={() => setEvidenceOpen(false)} onCreateEvidence={() => { setEvidenceOpen(false); setNotice("已创建改进事项：补齐数据元标准参与证据。"); }} />
    </WorkspacePage>
  );
}

function standardIdToVersion(standardId?: string | null): string {
  if (!standardId) return "—";
  return standardId === "DE-001" ? "VER-DE-001-1" : standardId === "DE-002" ? "VER-DE-002-1" : "VER-DE-001-1";
}

function deVersions(standardId: string, name: string) {
  return [
    { id: `${standardId}-v1`, standardId, version: "v1", content: `${name} v1：首次定义类型/长度/格式/单位/值域约束。`, changeReason: "首次发布", createdBy: "王雪", approvedBy: "数据标准负责人", createdAt: "2026-06-15 10:00", previousVersionId: null },
  ];
}

// ========== 步骤区通用组件 ==========
function StepSection({ index, title, subtitle, expanded, onToggle, children }: {
  index: number; title: string; subtitle?: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <Panel>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition hover:bg-muted/20"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
          {index}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-foreground">{title}</div>
          {subtitle && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && children}
    </Panel>
  );
}

function StepMetric({ icon: Icon, label, value, sub, tone }: {
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
                <p className="mt-1 text-[11px] leading-5 text-amber-800">当前未登记国家/行业标准参与项目。平台只登记事实，不生成认证结论。</p>
              </div>
            </div>
            <div className="mt-3"><ActionButton primary onClick={onCreateEvidence}>创建改进事项：补齐证据</ActionButton></div>
          </div>
        </div>
      </div>
    </div>
  );
}
