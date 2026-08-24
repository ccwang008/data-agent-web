import { useState } from "react";
import {
  Boxes, ChevronLeft, GitMerge, Globe, PanelRightClose, Play, Plus, Route, ShieldCheck, Siren, Sparkles, X,
} from "lucide-react";

import {
  ActionButton, InlineNotice, PageTitle, Panel, Pill, ProgressBar, WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import { AiDecisionCard, VersionTraceDrawer } from "../components";
import { createDefaultMasterDataState, DATA_STANDARD_SCOPES } from "../fixtures";
import { formatNow, makeId, useDataStandardState } from "../state";
import type { GoldenRecordVersion, MasterEntity, MasterSourceRecord } from "../types";

type MdState = ReturnType<typeof createDefaultMasterDataState>;

export function MasterDataPage() {
  const [state, update, meta] = useDataStandardState<MdState>(DATA_STANDARD_SCOPES.masterData, createDefaultMasterDataState());
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(state.entities[0]?.id ?? null);
  const [versionOpen, setVersionOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [rightOpen, setRightOpen] = useState(true);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const entity = state.entities.find((e) => e.id === selectedEntityId) ?? state.entities[0] ?? null;
  const records = state.sourceRecords.filter((r) => r.entityId === entity?.id);
  const golden = state.goldenRecords.filter((g) => g.entityId === entity?.id);
  const latestGolden = golden[0] ?? null;
  const distributions = state.distributions.filter((d) => d.entityId === entity?.id);

  const allKeys = entity ? Array.from(new Set(records.flatMap((r) => Object.keys(r.values)))) : [];
  const hasKeyConflict = records.some((r) => r.conflictKeys.length > 0);
  const authoritySources = entity?.authoritySources ?? [];

  const entitiesWithGolden = state.entities.filter((e) => state.goldenRecords.some((g) => g.entityId === e.id));
  const goldenCoverage = state.entities.length ? Math.round((entitiesWithGolden.length / state.entities.length) * 100) : 0;
  const consistentRecords = state.sourceRecords.filter((r) => r.conflictKeys.length === 0);
  const consistencyRate = state.sourceRecords.length ? Math.round((consistentRecords.length / state.sourceRecords.length) * 100) : 0;
  const onTimeDist = state.distributions.filter((d) => d.sla === "按时");
  const slaRate = state.distributions.length ? Math.round((onTimeDist.length / state.distributions.length) * 100) : 0;

  function canAutoMerge() {
    return entity && records.length >= 2 && !records.some((r) => r.conflictKeys.includes(entity.keys[0] ?? ""));
  }

  function autoMerge() {
    if (!entity || records.length < 2) return;
    if (!canAutoMerge()) {
      setNotice("自动合并已阻止：存在关键身份属性冲突，需数据管家人工裁决。");
      return;
    }
    const newGolden: GoldenRecordVersion = {
      id: makeId("GR"), entityId: entity.id, sourceRecordIds: records.map((r) => r.id),
      values: pickRetainedValues(records, authoritySources),
      decisionId: makeId("AI"), decisionMode: "AI 自动合并", previousVersionId: latestGolden?.id ?? null, createdAt: formatNow(),
    };
    update((cur) => ({
      ...cur,
      goldenRecords: [newGolden, ...cur.goldenRecords],
      aiDecisions: [{
        id: newGolden.decisionId, modelVersion: "MD-MATCH-v2.3", strategyVersion: "MD-STRAT-v2.0",
        executedAt: formatNow(), inputRefs: records.map((r) => r.id), confidence: "中",
        result: "AI 自动合并完成，生成权威记录新版本", rationaleSummary: "关键属性无冲突，按权威源保留值。",
        autoExecuted: true, reviewResult: "通过",
      }, ...cur.aiDecisions],
      updatedAt: new Date().toISOString(),
    }));
    setNotice("AI 自动合并完成，已生成可追溯权威记录版本。");
  }

  function manualDecide(retained: Record<string, string>) {
    if (!entity) return;
    const newGolden: GoldenRecordVersion = {
      id: makeId("GR"), entityId: entity.id, sourceRecordIds: records.map((r) => r.id),
      values: retained, decisionId: makeId("DEC"), decisionMode: "人工裁决",
      previousVersionId: latestGolden?.id ?? null, createdAt: formatNow(),
    };
    update((cur) => ({ ...cur, goldenRecords: [newGolden, ...cur.goldenRecords], updatedAt: new Date().toISOString() }));
    setNotice("人工裁决完成，关键属性冲突已解决并生成新版本。");
  }

  function distribute(target: string) {
    if (!entity) return;
    update((cur) => ({
      ...cur,
      distributions: [{ id: makeId("DIST"), entityId: entity.id, targetSystem: target, status: "分发中", sla: "按时", updatedAt: formatNow() }, ...cur.distributions],
      updatedAt: new Date().toISOString(),
    }));
    setNotice(`已下发至 ${target}，分发任务排队中。`);
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Data Standard / Master Data"
        title="主数据匹配与权威记录工作台"
        description="从多源记录形成可信权威记录：以多记录对比和合并裁决为中心，关键属性冲突时禁止自动合并，纠错生成新版本不删除历史。"
        actions={<>
          <ActionButton onClick={() => setEvidenceOpen(true)}>标准参与证据</ActionButton>
          <ActionButton icon={Plus} primary onClick={() => setVersionOpen(true)}>权威记录版本追溯</ActionButton>
        </>}
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      {notice && <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">{notice}</div>}

      {/* 紧凑指标条 */}
      <div className="mb-3 flex flex-wrap items-center gap-4 rounded-md border border-border bg-card px-4 py-2.5">
        <MetricChip icon={ShieldCheck} label="权威覆盖率" value={`${goldenCoverage}%`} tone={goldenCoverage >= 98 ? "green" : "amber"} sub={`${entitiesWithGolden.length}/${state.entities.length}`} />
        <MetricChip icon={GitMerge} label="跨系统一致率" value={`${consistencyRate}%`} tone={consistencyRate >= 98 ? "green" : "amber"} sub={`${consistentRecords.length}/${state.sourceRecords.length}`} />
        <MetricChip icon={Route} label="分发SLA达标" value={`${slaRate}%`} tone={slaRate >= 99 ? "green" : "amber"} sub={`${onTimeDist.length}/${state.distributions.length}`} />
        <MetricChip icon={Sparkles} label="AI查重自动化" value="80%" tone="violet" sub="目标≥80%" />
      </div>

      {/* 实体 Tab 切换（顶部，不是左侧栏） */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-t-lg border border-b-0 border-border bg-card px-2 py-1.5">
        {state.entities.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setSelectedEntityId(e.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-left text-[11px] transition",
              entity?.id === e.id ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/30" : "hover:bg-muted/50 text-muted-foreground",
            )}
          >
            <Boxes className="h-3.5 w-3.5" />
            <span>{e.name}</span>
            <Pill tone={statusTone(e.status)} size="sm">{e.status}</Pill>
          </button>
        ))}
        {entity && (
          <div className="ml-auto shrink-0 text-[10px] text-muted-foreground pr-2">
            主键：{entity.keys.join("、")} · 权威源：{entity.authoritySources.join("、")} · {entity.matchRules}
          </div>
        )}
      </div>

      {/* 核心：左侧全宽工作流区 + 右侧分发抽屉 */}
      <div className="flex min-h-[780px] gap-3">
        {/* 主工作区：纵向流程（不是三栏） */}
        <main className="flex min-w-0 flex-1 flex-col gap-3">
          {entity && (
            <>
              {/* 来源匹配队列：紧凑横向卡片条 */}
              <Panel
                title="来源匹配队列"
                description="匹配置信度与关键属性冲突标记"
                actions={
                  <div className="flex items-center gap-2">
                    {hasKeyConflict && <Pill tone="red" size="sm"><Siren className="mr-1 inline h-3 w-3" />关键属性冲突</Pill>}
                    <ActionButton icon={Sparkles} primary onClick={autoMerge} disabled={!canAutoMerge() && records.length >= 2}>
                      {canAutoMerge() ? "AI 自动合并" : "需人工裁决"}
                    </ActionButton>
                  </div>
                }
              >
                <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {records.map((r) => {
                    const isAuthority = authoritySources.includes(r.system);
                    return (
                      <div key={r.id} className="rounded-md border border-border bg-muted/10 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-foreground">{r.system}</span>
                            {isAuthority && <Pill tone="blue" size="sm">权威源</Pill>}
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-semibold tabular-nums text-foreground">{r.matchConfidence}%</div>
                            <div className="text-[9px] text-muted-foreground">置信度</div>
                          </div>
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-muted-foreground">{r.id}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.conflictKeys.length === 0
                            ? <Pill tone="green" size="sm">无冲突</Pill>
                            : r.conflictKeys.map((k) => <Pill key={k} tone="red" size="sm">{k} 冲突</Pill>)}
                        </div>
                      </div>
                    );
                  })}
                  {records.length === 0 && <div className="col-span-full py-6 text-center text-[11px] text-muted-foreground">暂无来源记录</div>}
                </div>
              </Panel>

              {/* 记录对比 —— 核心工作区，占满全宽（不是被左右栏挤压的窄表） */}
              <Panel
                title="记录对比 · 人工裁决台"
                description="逐属性比对多源记录，冲突属性（红色高亮）需人工裁决保留值；保留值确认后生成权威记录新版本"
                actions={latestGolden ? <Pill tone={latestGolden.decisionMode === "AI 自动合并" ? "violet" : "blue"} size="sm">{latestGolden.decisionMode}</Pill> : null}
              >
                <div className="overflow-x-auto p-2">
                  <table className="w-full min-w-[900px] border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-muted/40 text-left text-[10px] text-muted-foreground">
                        <th className="sticky left-0 z-10 min-w-[140px] bg-muted/40 px-3 py-2 font-medium backdrop-blur">属性</th>
                        {records.map((r) => (
                          <th key={r.id} className="min-w-[160px] border-l border-border px-3 py-2 font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{r.system}</span>
                              {authoritySources.includes(r.system) && <Pill tone="blue" size="sm">权威</Pill>}
                              <span className="ml-auto text-[9px] text-muted-foreground">{r.matchConfidence}%</span>
                            </div>
                          </th>
                        ))}
                        <th className="sticky right-0 z-10 min-w-[180px] border-l border-border bg-muted/40 px-3 py-2 font-medium backdrop-blur">
                          ⭐ 保留值
                          <span className="ml-1 text-[9px] font-normal">（裁决后生成新版本）</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allKeys.map((key) => {
                        const values = records.map((r) => r.values[key] ?? "—");
                        const isConflict = entity.keys.includes(key) && new Set(values.filter((v) => v !== "—")).size > 1;
                        return (
                          <tr key={key} className={cn(isConflict && "bg-red-50/40")}>
                            <td className="sticky left-0 z-10 bg-card px-3 py-2.5 font-medium text-foreground">
                              {key}
                              {entity.keys.includes(key) && <span className="ml-1 text-[9px] text-primary">[主键]</span>}
                              {isConflict && <Siren className="ml-1 inline h-3 w-3 text-red-500" />}
                            </td>
                            {values.map((v, i) => (
                              <td key={i} className={cn("border-l border-border px-3 py-2.5", isConflict && "text-red-700 font-medium")}>{v}</td>
                            ))}
                            <td className="sticky right-0 z-10 border-l border-border bg-card px-3 py-2.5">
                              <RetainSelector
                                options={values.filter((v) => v !== "—")}
                                value={latestGolden?.values[key] ?? ""}
                                conflict={isConflict}
                                onChange={(v) => retainValue(key, v)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <span className="text-[10px] text-muted-foreground">
                    {hasKeyConflict
                      ? "⚠️ 存在关键身份属性冲突，AI 自动合并已阻止，需人工裁决后生成新版本"
                      : "关键属性无冲突，可 AI 自动合并或人工裁决保留值"}
                  </span>
                  <ActionButton icon={ShieldCheck} primary onClick={() => manualDecide(latestGolden?.values ?? {})}>确认裁决 · 生成新版</ActionButton>
                </div>
              </Panel>

              {/* 下方两栏：权威记录 + AI 审计 */}
              <div className="grid gap-3 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  {latestGolden ? (
                    <Panel title="当前权威记录" description={`${latestGolden.decisionMode} · ${latestGolden.createdAt} · 来源 ${latestGolden.sourceRecordIds.length} 条记录`}>
                      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 md:grid-cols-4">
                        {Object.entries(latestGolden.values).map(([k, v]) => (
                          <div key={k} className="rounded-md border border-border bg-muted/20 px-3 py-2">
                            <div className="text-[10px] text-muted-foreground">{k}</div>
                            <div className="mt-0.5 truncate text-[11px] font-medium text-foreground">{v}</div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
                        来源记录：{latestGolden.sourceRecordIds.join("、")} · 前一版本：{latestGolden.previousVersionId ?? "无"}
                      </div>
                    </Panel>
                  ) : (
                    <Panel><div className="p-8 text-center text-[11px] text-muted-foreground">尚未生成权威记录，点击上方"AI 自动合并"或"确认裁决"生成。</div></Panel>
                  )}
                </div>
                <div className="lg:col-span-2">
                  <Panel title="AI 自动合并审计" description="模型/策略版本、置信度、依据">
                    <div className="space-y-2 p-3">
                      {state.aiDecisions.length === 0 && <div className="text-[11px] text-muted-foreground py-4 text-center">暂无 AI 决策记录</div>}
                      {state.aiDecisions.slice(0, 2).map((d) => <AiDecisionCard key={d.id} decision={d} />)}
                    </div>
                  </Panel>
                </div>
              </div>
            </>
          )}
        </main>

        {/* 右：订阅分发轨迹（可折叠抽屉） */}
        <aside className={cn(
          "flex shrink-0 flex-col overflow-hidden rounded-md border border-border bg-card transition-all duration-200",
          rightOpen ? "w-[300px]" : "w-10",
        )}>
          <div className="flex h-10 items-center justify-between border-b border-border px-3">
            {rightOpen && <><span className="text-[11px] font-semibold text-foreground">订阅分发</span><span className="text-[10px] text-muted-foreground">SLA {slaRate}%</span></>}
            <button type="button" onClick={() => setRightOpen((v) => !v)} className="rounded p-1 text-muted-foreground hover:bg-muted">
              {rightOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          </div>
          {rightOpen && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div>
                <div className="mb-1.5 text-[10px] text-muted-foreground">SLA 达标率</div>
                <ProgressBar value={slaRate} tone={slaRate >= 99 ? "green" : "amber"} />
              </div>
              <div className="space-y-2">
                {distributions.map((d) => (
                  <div key={d.id} className="rounded-md border border-border bg-muted/20 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground"><Globe className="h-3 w-3 text-blue-500" />{d.targetSystem}</span>
                      <Pill tone={statusTone(d.status)} size="sm">{d.status}</Pill>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>SLA：{d.sla}</span><span>{d.updatedAt}</span>
                    </div>
                  </div>
                ))}
                {distributions.length === 0 && <div className="text-[11px] text-muted-foreground py-2 text-center">暂无分发任务</div>}
              </div>
              <ActionButton icon={Play} size="sm" onClick={() => distribute("风控系统")}>下发至风控系统</ActionButton>
              <div className="rounded-md border border-dashed border-border p-2.5 text-[10px] leading-5 text-muted-foreground">
                权威记录纠错生成新版本，不删除历史版本。
              </div>
            </div>
          )}
        </aside>
      </div>

      {entity && <VersionTraceDrawer open={versionOpen} onClose={() => setVersionOpen(false)} versions={goldenToVersions(golden, entity)} title={`${entity.name} 权威记录`} />}
      <EvidenceDrawer open={evidenceOpen} onClose={() => setEvidenceOpen(false)} onCreateEvidence={() => { setEvidenceOpen(false); setNotice("已创建改进事项：补齐主数据标准参与证据。"); }} />
    </WorkspacePage>
  );

  function retainValue(key: string, value: string) {
    update((cur) => {
      if (!entity) return cur;
      const cur2 = cur.goldenRecords.find((g) => g.entityId === entity.id);
      const baseValues = cur2?.values ?? pickRetainedValues(records, authoritySources);
      const draft: GoldenRecordVersion = {
        id: cur2?.id ?? makeId("GR-DRAFT"), entityId: entity.id, sourceRecordIds: records.map((r) => r.id),
        values: { ...baseValues, [key]: value }, decisionId: cur2?.decisionId ?? "DRAFT",
        decisionMode: "人工裁决", previousVersionId: cur2?.previousVersionId ?? null, createdAt: cur2?.createdAt ?? formatNow(),
      };
      const others = cur.goldenRecords.filter((g) => g.entityId !== entity.id);
      return { ...cur, goldenRecords: [draft, ...others], updatedAt: new Date().toISOString() };
    });
  }
}

function pickRetainedValues(records: MasterSourceRecord[], authoritySources: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const keys = Array.from(new Set(records.flatMap((r) => Object.keys(r.values))));
  for (const key of keys) {
    const authority = records.find((r) => authoritySources.includes(r.system) && r.values[key] && r.values[key] !== "—");
    const fallback = records.find((r) => r.values[key] && r.values[key] !== "—");
    result[key] = authority?.values[key] ?? fallback?.values[key] ?? "—";
  }
  return result;
}

function RetainSelector({ options, value, conflict, onChange }: { options: string[]; value: string; conflict: boolean; onChange: (v: string) => void }) {
  if (conflict && options.length > 1) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-full rounded-md border border-amber-300 bg-card px-1 text-[10px] outline-none">
        <option value="">待裁决…</option>
        {Array.from(new Set(options)).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return <span className="text-foreground font-medium">{value || options[0] || "—"}</span>;
}

function goldenToVersions(golden: GoldenRecordVersion[], entity: MasterEntity) {
  return golden.map((g, idx) => ({
    id: g.id, standardId: entity.id, version: `GR v${golden.length - idx}`,
    content: Object.entries(g.values).map(([k, v]) => `${k}=${v}`).join("；"),
    changeReason: g.decisionMode, createdBy: g.decisionMode === "AI 自动合并" ? "MD-MATCH-v2.3" : "数据管家",
    approvedBy: g.decisionMode === "AI 自动合并" ? "AI 策略" : "数据标准负责人",
    createdAt: g.createdAt, previousVersionId: g.previousVersionId,
  }));
}

function MetricChip({ icon: Icon, label, value, sub, tone }: {
  icon: any; label: string; value: string; sub?: string;
  tone: "green" | "amber" | "violet" | "blue" | "slate";
}) {
  const toneMap: Record<string, string> = {
    green: "text-emerald-600", amber: "text-amber-600", violet: "text-violet-600", blue: "text-blue-600", slate: "text-slate-600",
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
                <p className="mt-1 text-[11px] leading-5 text-amber-800">当前未登记国家/行业标准参与项目。权威记录纠错生成新版本，不删除历史；mock 分发不代表真实主数据平台下发。</p>
              </div>
            </div>
            <div className="mt-3"><ActionButton primary onClick={onCreateEvidence}>创建改进事项：补齐证据</ActionButton></div>
          </div>
        </div>
      </div>
    </div>
  );
}
