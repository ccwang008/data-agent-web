import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, ChevronRight, GitCompareArrows, ListTree,
  PanelLeftClose, Plus, Route, Send, Sparkles, Tags, X,
} from "lucide-react";

import {
  ActionButton, InlineNotice, PageTitle, Panel, Pill, WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import { VersionTraceDrawer } from "../components";
import { createDefaultReferenceDataState, DATA_STANDARD_SCOPES } from "../fixtures";
import { formatNow, makeId, useDataStandardState } from "../state";
import type { ReferenceMapping, ReferenceVersionDiff } from "../types";

type RdState = ReturnType<typeof createDefaultReferenceDataState>;

const AI_ACCURACY_TARGET = 99; // spec: AI 映射抽样准确率目标 ≥99%

export function ReferenceDataPage() {
  const [state, update, meta] = useDataStandardState<RdState>(DATA_STANDARD_SCOPES.referenceData, createDefaultReferenceDataState());
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(state.datasets[0]?.id ?? null);
  const [versionOpen, setVersionOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const dataset = state.datasets.find((d) => d.id === selectedDatasetId) ?? state.datasets[0] ?? null;
  const mappings = state.mappings.filter((m) => m.datasetId === dataset?.id);
  const subscriptions = state.subscriptions.filter((s) => s.datasetId === dataset?.id);
  const distributions = state.distributions.filter((d) => d.datasetId === dataset?.id);
  const versionDiff = state.versionDiffs.find((d) => d.datasetId === dataset?.id) ?? null;
  const categories = Array.from(new Set(state.datasets.map((d) => d.category)));

  // 动态 KPI
  const catalogCoverage = state.datasets.length > 0
    ? Math.round((state.datasets.length / (state.datasets.length + 1)) * 100) // 假设应纳管 = 已纳管 + 1 个待纳管
    : 0;
  const totalMappings = state.mappings.length;
  const validMappings = state.mappings.filter((m) => m.status === "已批准" || m.status === "AI 推荐");
  const mappingCoverage = totalMappings ? Math.round((validMappings.length / totalMappings) * 100) : 0;
  const conflicts = state.mappings.filter((m) => m.status === "冲突");
  const pending = state.mappings.filter((m) => m.status === "待复核");
  // 跨系统一致率:已批准映射 ÷ 全部映射(代表已比对且一致)
  const consistencyRate = totalMappings
    ? Math.round((state.mappings.filter((m) => m.status === "已批准").length / totalMappings) * 100)
    : 0;
  // 变更及时率:SLA 内已完成的分发 ÷ 全部分发
  const totalDist = state.distributions.length;
  const slaOnTime = state.distributions.filter((d) => d.sla === "按时").length;
  const changeTimeliness = totalDist ? Math.round((slaOnTime / totalDist) * 100) : 0;
  // AI 准确率:抽样 correct ÷ sampled(动态)
  const aiAccuracy = state.aiStats.sampled > 0
    ? Math.round((state.aiStats.correct / state.aiStats.sampled) * 1000) / 10
    : 100;
  const aiPaused = state.aiStats.paused || aiAccuracy < AI_ACCURACY_TARGET;

  function approveMapping(id: string) {
    update((cur) => ({
      ...cur,
      mappings: cur.mappings.map((m) => m.id === id ? { ...m, status: "已批准" } : m),
      updatedAt: new Date().toISOString(),
    }));
    setNotice("映射已批准。AI 推荐不等于批准映射,逐条人工批准后生效。");
  }

  function suggestMappings() {
    if (!dataset) return;
    const newMappings: ReferenceMapping[] = [
      { id: makeId("RMAP"), datasetId: dataset.id, systemId: "新系统", sourceCode: "NEW-001", targetCode: dataset.values[0]?.code ?? "—", status: "AI 推荐", confidence: "高", evidenceIds: [makeId("EV")] },
      { id: makeId("RMAP"), datasetId: dataset.id, systemId: "新系统", sourceCode: "NEW-002", targetCode: "—", status: "待复核", confidence: "低", evidenceIds: [makeId("EV")] },
    ];
    // 模拟抽样:本次新增 2 条映射,抽样 4 条,其中 1 条错误
    const newSampled = state.aiStats.sampled + 4;
    const newCorrect = state.aiStats.correct + 3;
    const newAccuracy = newSampled > 0 ? (newCorrect / newSampled) * 100 : 100;
    const newPaused = newAccuracy < AI_ACCURACY_TARGET;
    update((cur) => ({
      ...cur,
      mappings: [...newMappings, ...cur.mappings],
      aiStats: {
        ...cur.aiStats,
        sampled: newSampled,
        correct: newCorrect,
        paused: newPaused,
        lastSampledAt: formatNow(),
      },
      updatedAt: new Date().toISOString(),
    }));
    setNotice(newPaused
      ? `AI 推荐已生成,但抽样准确率 ${newAccuracy.toFixed(1)}% 低于目标 ${AI_ACCURACY_TARGET}%,自动发布已暂停,所有 AI 推荐映射需逐条人工批准。`
      : "AI 已推荐映射;低置信度结果进入待复核,AI 推荐不自动发布。");
  }

  function publishDataset() {
    if (!dataset) return;
    if (aiPaused) {
      setNotice(`发布已阻止:AI 映射抽样准确率 ${aiAccuracy}% 低于目标 ${AI_ACCURACY_TARGET}%,自动发布已暂停。`);
      return;
    }
    if (pending.length > 0) {
      setNotice("发布已阻止:存在待复核映射,需先完成复核。");
      return;
    }
    if (conflicts.length > 0) {
      setNotice("发布已阻止:存在冲突映射,需先裁决。");
      return;
    }
    update((cur) => ({
      ...cur,
      datasets: cur.datasets.map((d) => d.id === dataset.id ? { ...d, status: "已发布", effectiveAt: formatNow().slice(0, 10) } : d),
      updatedAt: new Date().toISOString(),
    }));
    setNotice(`代码集「${dataset.codeSet}」已发布,保留版本与前后差异,变更将按订阅关系推送至下游系统。`);
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Data Standard / Reference Data"
        title="参考数据代码集与映射工作台"
        description="管理代码集版本、跨系统值映射与订阅分发:以树形代码集、映射矩阵和分发轨迹为中心,AI 准确率低于目标时暂停自动发布。"
        actions={<>
          <ActionButton onClick={() => setEvidenceOpen(true)}>标准参与证据</ActionButton>
          <ActionButton icon={GitCompareArrows} onClick={() => setDiffOpen(true)}>版本差异对比</ActionButton>
          <ActionButton icon={Plus} primary onClick={() => setVersionOpen(true)}>版本追溯</ActionButton>
        </>}
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      {notice && <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">{notice}</div>}

      {/* 紧凑指标条 + 发布门禁横幅 */}
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md border border-border bg-card px-4 py-2.5">
        <MetricChip icon={ListTree} label="目录覆盖率" value={`${catalogCoverage}%`} tone={catalogCoverage >= 95 ? "green" : "amber"} sub={`目标≥95%`} />
        <MetricChip icon={GitCompareArrows} label="映射覆盖率" value={`${mappingCoverage}%`} tone={mappingCoverage >= 98 ? "green" : "amber"} sub={`${validMappings.length}/${totalMappings}`} />
        <MetricChip icon={CheckCircle2} label="跨系统一致率" value={`${consistencyRate}%`} tone={consistencyRate >= 98 ? "green" : "amber"} sub={`目标≥98%`} />
        <MetricChip icon={Route} label="变更及时率" value={`${changeTimeliness}%`} tone={changeTimeliness >= 95 ? "green" : "amber"} sub={`${slaOnTime}/${totalDist}`} />
        <MetricChip icon={Sparkles} label="AI映射准确率" value={`${aiAccuracy}%`} tone={aiAccuracy >= AI_ACCURACY_TARGET ? "violet" : "red"} sub={`目标≥${AI_ACCURACY_TARGET}% · 抽样${state.aiStats.sampled}`} />

        <div className="ml-auto flex items-center gap-3">
          {(aiPaused || pending.length > 0 || conflicts.length > 0) && (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-[10px] text-amber-800">
                {aiPaused && `AI准确率${aiAccuracy}%低于目标`}
                {aiPaused && (pending.length > 0 || conflicts.length > 0) && " · "}
                {pending.length > 0 && `${pending.length} 待复核`}
                {pending.length > 0 && conflicts.length > 0 && " · "}
                {conflicts.length > 0 && `${conflicts.length} 冲突`}
                ,发布已阻止
              </span>
            </div>
          )}
          <ActionButton icon={CheckCircle2} primary onClick={publishDataset} disabled={aiPaused || pending.length > 0 || conflicts.length > 0}>
            发布代码集
          </ActionButton>
        </div>
      </div>

      {/* 主体:左分类树抽屉 + 右侧上下三大块(代码值表 + 映射矩阵 + 订阅分发) */}
      <div className="flex min-h-[780px] gap-3">
        {/* 左:分类树抽屉 */}
        <aside className={cn(
          "flex shrink-0 flex-col overflow-hidden rounded-md border border-border bg-card transition-all duration-200",
          leftOpen ? "w-[260px]" : "w-10",
        )}>
          <div className="flex h-10 items-center justify-between border-b border-border px-3">
            {leftOpen && <><span className="text-[11px] font-semibold text-foreground">分类 / 代码集</span><span className="text-[10px] text-muted-foreground">{state.datasets.length}</span></>}
            <button type="button" onClick={() => setLeftOpen((v) => !v)} className="rounded p-1 text-muted-foreground hover:bg-muted">
              {leftOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
          {leftOpen && (
            <div className="flex-1 overflow-y-auto p-2">
              {categories.map((cat) => (
                <div key={cat} className="mb-1">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-foreground">
                    <Tags className="h-3.5 w-3.5 text-primary" />{cat}
                  </div>
                  <div className="ml-3 border-l border-border pl-2">
                    {state.datasets.filter((d) => d.category === cat).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDatasetId(d.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted/30",
                          dataset?.id === d.id && "bg-blue-50/70",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-medium text-foreground">{d.codeSet}</span>
                          <span className="block truncate text-[9px] text-muted-foreground">{d.values.length} 个代码值 · {d.ownerId}</span>
                        </div>
                        <Pill tone={statusTone(d.status)} size="sm">{d.version}</Pill>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* 右:上下堆叠三块(代码值 + 映射矩阵 + 订阅分发) */}
        <main className="flex min-w-0 flex-1 flex-col gap-3">
          {dataset && (
            <>
              {/* 上:代码值版本面板 */}
              <Panel
                title={`代码值:${dataset.codeSet}`}
                description={`${dataset.version} · 生效 ${dataset.effectiveAt} · 责任人 ${dataset.ownerId}`}
                actions={
                  <div className="flex items-center gap-2">
                    {versionDiff && <Pill tone="blue" size="sm">{versionDiff.fromVersion}→{versionDiff.toVersion} · {versionDiff.changes.length} 项变更</Pill>}
                    <Pill tone={statusTone(dataset.status)} size="sm">{dataset.status}</Pill>
                  </div>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-muted/40 text-[10px] text-muted-foreground">
                      <tr className="text-left">
                        <th className="px-3 py-2 font-medium w-32">代码</th>
                        <th className="px-3 py-2 font-medium">名称</th>
                        <th className="px-3 py-2 font-medium w-28">层级</th>
                        <th className="px-3 py-2 font-medium w-28 text-center">有效性</th>
                        <th className="px-3 py-2 font-medium w-48">说明 / 备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dataset.values.map((v) => {
                        const change = versionDiff?.changes.find((c) => c.code === v.code);
                        return (
                          <tr key={v.code} className="hover:bg-muted/20">
                            <td className="px-3 py-2 font-mono text-foreground">
                              {v.code}
                              {change && <span className="ml-1.5 inline-block rounded bg-blue-50 px-1 text-[9px] text-blue-600">{change.type}</span>}
                            </td>
                            <td className="px-3 py-2 text-foreground font-medium">
                              {v.name}
                              {change?.type === "改名" && change.before && <span className="ml-1.5 text-[9px] text-muted-foreground line-through">{change.before}</span>}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {v.hierarchy}
                              {change?.type === "层级变更" && change.before && <span className="ml-1.5 text-[9px] text-muted-foreground line-through">{change.before}</span>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {v.valid ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />有效</span> : <span className="text-red-500">已失效</span>}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground text-[10px]">{change ? `v${versionDiff?.fromVersion}→v${versionDiff?.toVersion} ${change.type}` : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
                  参考数据变更保留版本、前后差异、影响引用和操作记录;点击右上角"版本差异对比"查看字段级 diff。
                </div>
              </Panel>

              {/* 中:跨系统映射矩阵 */}
              <Panel
                title="跨系统映射矩阵"
                description="组织级代码值与部门/系统代码值的映射、状态与置信度"
                actions={<ActionButton icon={Sparkles} size="sm" onClick={suggestMappings}>AI 推荐映射</ActionButton>}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-muted/40 text-[10px] text-muted-foreground sticky top-0 z-10 backdrop-blur">
                      <tr className="text-left">
                        <th className="px-3 py-2 font-medium w-32">系统</th>
                        <th className="px-3 py-2 font-medium w-40">源代码</th>
                        <th className="px-3 py-2 font-medium">源名称</th>
                        <th className="px-3 py-2 font-medium w-40">→ 目标代码</th>
                        <th className="px-3 py-2 font-medium">目标名称</th>
                        <th className="px-3 py-2 font-medium w-24 text-center">置信度</th>
                        <th className="px-3 py-2 font-medium w-28 text-center">状态</th>
                        <th className="px-3 py-2 font-medium w-28 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {mappings.length === 0 && (
                        <tr><td colSpan={8} className="px-3 py-10 text-center text-[11px] text-muted-foreground">暂无映射,点击"AI 推荐映射"生成候选</td></tr>
                      )}
                      {mappings.map((m) => {
                        const targetVal = dataset.values.find((v) => v.code === m.targetCode);
                        return (
                          <tr key={m.id} className={cn(
                            m.status === "冲突" && "bg-red-50/50",
                            m.status === "待复核" && "bg-amber-50/40",
                            "hover:bg-muted/20",
                          )}>
                            <td className="px-3 py-2 text-foreground font-medium">{m.systemId}</td>
                            <td className="px-3 py-2 font-mono text-foreground">{m.sourceCode}</td>
                            <td className="px-3 py-2 text-muted-foreground">—</td>
                            <td className="px-3 py-2 font-mono text-foreground">{m.targetCode}</td>
                            <td className="px-3 py-2 text-muted-foreground">{targetVal?.name ?? "未匹配"}</td>
                            <td className="px-3 py-2 text-center">
                              <Pill tone={m.confidence === "高" ? "green" : m.confidence === "中" ? "blue" : "amber"} size="sm">{m.confidence}</Pill>
                            </td>
                            <td className="px-3 py-2 text-center"><Pill tone={mappingTone(m.status)} size="sm">{m.status}</Pill></td>
                            <td className="px-3 py-2 text-center">
                              {(m.status === "AI 推荐" || m.status === "待复核") && <ActionButton size="sm" onClick={() => approveMapping(m.id)}>批准</ActionButton>}
                              {m.status === "冲突" && <ActionButton size="sm" onClick={() => approveMapping(m.id)}>裁决</ActionButton>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {aiPaused && (
                  <div className="border-t border-amber-200 bg-amber-50/60 px-4 py-2 text-[10px] text-amber-800">
                    AI 自动发布已暂停(准确率 {aiAccuracy}% &lt; 目标 {AI_ACCURACY_TARGET}%):所有 AI 推荐映射需逐条人工批准,不可批量自动发布。
                  </div>
                )}
                <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
                  AI 推荐映射不得直接发布,批准映射后变更通知推送订阅方。
                </div>
              </Panel>

              {/* 下:订阅与分发轨迹 */}
              <Panel
                title="订阅与分发轨迹"
                description="代码集版本发布向下游订阅系统的分发状态与 SLA"
                actions={<Pill tone="slate" size="sm">{subscriptions.length} 订阅 · {distributions.length} 分发</Pill>}
              >
                <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2">
                  {/* 订阅方列表 */}
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Send className="h-3 w-3" />订阅方
                    </div>
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full text-[11px]">
                        <thead className="bg-muted/40 text-[10px] text-muted-foreground">
                          <tr className="text-left">
                            <th className="px-2 py-1.5 font-medium">系统</th>
                            <th className="px-2 py-1.5 font-medium">责任人</th>
                            <th className="px-2 py-1.5 font-medium w-20">同步</th>
                            <th className="px-2 py-1.5 font-medium w-20 text-center">状态</th>
                            <th className="px-2 py-1.5 font-medium w-24 text-center">最近同步</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {subscriptions.length === 0 && (
                            <tr><td colSpan={5} className="px-2 py-6 text-center text-[10px] text-muted-foreground">暂无订阅方</td></tr>
                          )}
                          {subscriptions.map((s) => (
                            <tr key={s.id} className="hover:bg-muted/20">
                              <td className="px-2 py-1.5 text-foreground font-medium">{s.subscriberSystem}</td>
                              <td className="px-2 py-1.5 text-muted-foreground">{s.contactOwner}</td>
                              <td className="px-2 py-1.5 text-muted-foreground">{s.syncMode}</td>
                              <td className="px-2 py-1.5 text-center"><Pill tone={subscriptionTone(s.status)} size="sm">{s.status}</Pill></td>
                              <td className="px-2 py-1.5 text-center">
                                <span className={cn(
                                  "text-[10px]",
                                  s.lastSyncResult === "成功" && "text-emerald-600",
                                  s.lastSyncResult === "失败" && "text-red-500",
                                  s.lastSyncResult === "部分成功" && "text-amber-600",
                                  s.lastSyncResult === "未同步" && "text-muted-foreground",
                                )}>{s.lastSyncResult}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 分发事件列表 */}
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Route className="h-3 w-3" />分发事件
                    </div>
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full text-[11px]">
                        <thead className="bg-muted/40 text-[10px] text-muted-foreground">
                          <tr className="text-left">
                            <th className="px-2 py-1.5 font-medium w-12">版本</th>
                            <th className="px-2 py-1.5 font-medium">目标系统</th>
                            <th className="px-2 py-1.5 font-medium w-20 text-center">状态</th>
                            <th className="px-2 py-1.5 font-medium w-16 text-center">SLA</th>
                            <th className="px-2 py-1.5 font-medium w-32">时间</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {distributions.length === 0 && (
                            <tr><td colSpan={5} className="px-2 py-6 text-center text-[10px] text-muted-foreground">暂无分发事件</td></tr>
                          )}
                          {distributions.map((d) => (
                            <tr key={d.id} className={cn(
                              d.status === "失败" && "bg-red-50/40",
                              d.status === "分发中" && "bg-blue-50/30",
                              "hover:bg-muted/20",
                            )}>
                              <td className="px-2 py-1.5 font-mono text-foreground">{d.version}</td>
                              <td className="px-2 py-1.5 text-foreground font-medium">{d.targetSystem}</td>
                              <td className="px-2 py-1.5 text-center"><Pill tone={distributionTone(d.status)} size="sm">{d.status}</Pill></td>
                              <td className="px-2 py-1.5 text-center">
                                <span className={cn("text-[10px]", d.sla === "超时" ? "text-red-500" : d.sla === "按时" ? "text-emerald-600" : "text-muted-foreground")}>{d.sla}</span>
                              </td>
                              <td className="px-2 py-1.5 text-muted-foreground text-[10px]">{d.publishedAt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
                  代码集发布后按订阅关系向下游推送,SLA 超时或失败的订阅需重新激活;mock 分发不代表真实主数据平台下发。
                </div>
              </Panel>
            </>
          )}
        </main>
      </div>

      {dataset && <VersionTraceDrawer open={versionOpen} onClose={() => setVersionOpen(false)} versions={datasetVersions(dataset.id, state.datasets)} title={dataset.codeSet} />}
      {dataset && versionDiff && (
        <VersionDiffDrawer open={diffOpen} onClose={() => setDiffOpen(false)} diff={versionDiff} codeSetName={dataset.codeSet} />
      )}
      <EvidenceDrawer open={evidenceOpen} onClose={() => setEvidenceOpen(false)} onCreateEvidence={() => { setEvidenceOpen(false); setNotice("已创建改进事项:补齐参考数据标准参与证据。"); }} />
    </WorkspacePage>
  );
}

function mappingTone(status: ReferenceMapping["status"]) {
  if (status === "已批准") return "green" as const;
  if (status === "AI 推荐") return "blue" as const;
  if (status === "待复核") return "amber" as const;
  return "red" as const;
}

function subscriptionTone(status: string) {
  if (status === "已订阅") return "green" as const;
  if (status === "待确认") return "amber" as const;
  return "red" as const;
}

function distributionTone(status: string) {
  if (status === "成功") return "green" as const;
  if (status === "分发中") return "blue" as const;
  if (status === "排队") return "slate" as const;
  return "red" as const;
}

function datasetVersions(datasetId: string, datasets: ReturnType<typeof createDefaultReferenceDataState>["datasets"]) {
  const current = datasets.find((d) => d.id === datasetId);
  if (!current) return [];
  const baseVersion = current.version === "v2" ? "v1" : "v2";
  return [
    { id: `${current.id}-v1`, standardId: current.standardId, version: baseVersion, content: `${current.codeSet} ${baseVersion},${current.values.length - 1} 个代码值`, changeReason: baseVersion === "v1" ? "首次发布" : "历史版本", createdBy: current.ownerId, approvedBy: "数据标准负责人", createdAt: "2026-06-12 09:15", previousVersionId: null },
    { id: `${current.id}-v2`, standardId: current.standardId, version: current.version, content: `${current.codeSet} ${current.version},${current.values.length} 个代码值`, changeReason: "新增代码值", createdBy: current.ownerId, approvedBy: current.status === "已发布" ? "数据标准负责人" : "—", createdAt: `${current.effectiveAt} 00:00`, previousVersionId: `${current.id}-v1` },
  ];
}

function VersionDiffDrawer({ open, onClose, diff, codeSetName }: {
  open: boolean; onClose: () => void; diff: ReferenceVersionDiff; codeSetName: string;
}) {
  if (!open) return null;
  const typeTone: Record<string, string> = {
    "新增": "text-emerald-600 bg-emerald-50",
    "删除": "text-red-600 bg-red-50",
    "改名": "text-blue-600 bg-blue-50",
    "层级变更": "text-violet-600 bg-violet-50",
    "状态变更": "text-amber-600 bg-amber-50",
  };
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">Version Diff</div>
            <div className="text-[14px] font-semibold text-foreground">{codeSetName} · {diff.fromVersion} → {diff.toVersion}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{diff.changedAt} · {diff.changedBy} · {diff.changeReason}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">
          <div className="mb-3 text-[11px] text-muted-foreground">
            共 <span className="font-semibold text-foreground">{diff.changes.length}</span> 项字段级变更,变更保留版本与前后差异。
          </div>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/40 text-[10px] text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium w-20">类型</th>
                  <th className="px-3 py-2 font-medium w-32">代码</th>
                  <th className="px-3 py-2 font-medium">变更前</th>
                  <th className="px-3 py-2 font-medium">变更后</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {diff.changes.map((c, idx) => (
                  <tr key={`${c.code}-${idx}`} className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-medium", typeTone[c.type])}>{c.type}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-foreground">{c.code}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {c.before ? <span className="line-through">{c.before}</span> : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {c.after ? <span className="font-medium">{c.after}</span> : <span className="text-muted-foreground/50">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-md border border-border bg-muted/20 p-3 text-[10px] text-muted-foreground">
            影响引用:变更需同步推送至所有已订阅系统;层级变更影响下游分类聚合,改名影响下游报表口径,需在分发事件中跟踪 SLA。
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricChip({ icon: Icon, label, value, sub, tone }: {
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
                <p className="mt-1 text-[11px] leading-5 text-amber-800">当前未登记国家/行业标准参与项目。平台只登记事实,不生成认证结论。</p>
              </div>
            </div>
            <div className="mt-3"><ActionButton primary onClick={onCreateEvidence}>创建改进事项:补齐证据</ActionButton></div>
          </div>
        </div>
      </div>
    </div>
  );
}
