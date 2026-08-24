// 质量需求矩阵：对象×维度×指标+优先级+信息环境上下文 + L4 AI 自动识别建议。
// 矩阵视图（非列表），需求与规则分离（需求驱动规则设计）。
import { Fragment, useMemo, useState } from "react";
import {
  ChevronDown, ChevronRight, FileText, Plus, Sparkles, Target, Wand2,
} from "lucide-react";

import {
  ActionButton, InlineNotice, PageTitle, Panel, Pill,
  WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";

import { SCHEMA_VERSION, seedQualityRequirements } from "../fixtures";
import { useGovernanceState, formatNow, makeId } from "../state";
import type {
  QualityDimension, QualityRequirement, QualitySeverity,
} from "../types";

const DIMENSIONS: QualityDimension[] = ["完整性", "准确性", "及时性", "一致性", "唯一性"];

// L4 AI 自动识别的潜在需求建议（基于对象×维度覆盖缺口）
// 注：mock 推理结果，非真实 AI 输出
type AISuggestion = {
  id: string;
  objectId: string;
  objectName: string;
  dimension: QualityDimension;
  indicator: string;
  target: string;
  priority: QualitySeverity;
  context: string;
  confidence: "高" | "中" | "低";
};

const AI_SUGGESTIONS: AISuggestion[] = [
  {
    id: "AI-QR-SUG-1",
    objectId: "meta-001",
    objectName: "客户主数据表",
    dimension: "及时性",
    indicator: "客户主数据同步延迟",
    target: "≤ 10 min",
    priority: "P2",
    context: "客户主数据每 30 分钟同步一次，可能影响实时营销决策",
    confidence: "高",
  },
  {
    id: "AI-QR-SUG-2",
    objectId: "meta-002",
    objectName: "月度交易额指标",
    dimension: "一致性",
    indicator: "指标与汇总表口径一致",
    target: "= 100%",
    priority: "P1",
    context: "月度交易额指标与 dws_trade_summary 存在 1.3% 偏差，疑似口径不一致",
    confidence: "中",
  },
  {
    id: "AI-QR-SUG-3",
    objectId: "meta-004",
    objectName: "订单实时同步任务",
    dimension: "完整性",
    indicator: "事件字段补全率",
    target: "≥ 99%",
    priority: "P2",
    context: "订单事件流中 user_id 字段缺失率 2.1%，影响下游用户行为分析",
    confidence: "中",
  },
];

type RequirementState = {
  schemaVersion: number;
  requirements: QualityRequirement[];
  dismissedSuggestions: string[];
};

const initialState: RequirementState = {
  schemaVersion: SCHEMA_VERSION,
  requirements: seedQualityRequirements,
  dismissedSuggestions: [],
};

export function QualityRequirementPage() {
  const [state, setState, meta] = useGovernanceState<RequirementState>(
    "data-agent.data-governance.quality.requirements",
    initialState,
  );
  const [expandedObject, setExpandedObject] = useState<string | null>(null);

  const { requirements, dismissedSuggestions } = state;

  // 按对象分组
  const groupedByObject = useMemo(() => {
    const map = new Map<string, { objectId: string; objectName: string; reqs: QualityRequirement[] }>();
    requirements.forEach((r) => {
      if (!map.has(r.objectId)) {
        map.set(r.objectId, { objectId: r.objectId, objectName: r.objectName, reqs: [] });
      }
      map.get(r.objectId)!.reqs.push(r);
    });
    return Array.from(map.values());
  }, [requirements]);

  // 矩阵视图：对象 × 维度
  const matrix = useMemo(() => {
    return groupedByObject.map((g) => {
      const cells: Record<QualityDimension, QualityRequirement[]> = {
        完整性: [], 准确性: [], 及时性: [], 一致性: [], 唯一性: [],
      };
      g.reqs.forEach((r) => cells[r.dimension].push(r));
      return { ...g, cells };
    });
  }, [groupedByObject]);

  const totalReqs = requirements.length;
  const publishedReqs = requirements.filter((r) => r.status === "已发布").length;
  const draftReqs = requirements.filter((r) => r.status === "草稿").length;
  const p0Reqs = requirements.filter((r) => r.priority === "P0").length;
  const activeSuggestions = AI_SUGGESTIONS.filter((s) => !dismissedSuggestions.includes(s.id));

  function toggleObject(objectId: string) {
    setExpandedObject((current) => (current === objectId ? null : objectId));
  }

  function adoptSuggestion(suggestion: AISuggestion) {
    const newReq: QualityRequirement = {
      id: makeId("QR"),
      objectId: suggestion.objectId,
      objectName: suggestion.objectName,
      dimension: suggestion.dimension,
      indicator: suggestion.indicator,
      target: suggestion.target,
      priority: suggestion.priority,
      context: suggestion.context,
      status: "草稿",
      updatedAt: formatNow(),
    };
    setState((current) => ({
      ...current,
      requirements: [...current.requirements, newReq],
      dismissedSuggestions: [...current.dismissedSuggestions, suggestion.id],
    }));
  }

  function dismissSuggestion(id: string) {
    setState((current) => ({
      ...current,
      dismissedSuggestions: [...current.dismissedSuggestions, id],
    }));
  }

  function publishRequirement(id: string) {
    setState((current) => ({
      ...current,
      requirements: current.requirements.map((r) =>
        r.id === id ? { ...r, status: "已发布", updatedAt: formatNow() } : r,
      ),
    }));
  }

  function addRequirement() {
    const newReq: QualityRequirement = {
      id: makeId("QR"),
      objectId: "meta-001",
      objectName: "客户主数据表",
      dimension: "完整性",
      indicator: "新质量指标",
      target: "≥ 99%",
      priority: "P2",
      context: "请补充信息环境上下文",
      status: "草稿",
      updatedAt: formatNow(),
    };
    setState((current) => ({ ...current, requirements: [newReq, ...current.requirements] }));
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Governance / Quality Requirements"
        title="质量需求矩阵"
        description="基于业务和监管需求明确质量管理目标和范围，按对象×维度形成矩阵视图，AI 自动识别覆盖缺口。"
        actions={<ActionButton primary icon={Plus} onClick={addRequirement}>新增质量需求</ActionButton>}
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />

      {/* 矩阵视图 */}
      <Panel
        title="质量需求矩阵"
        description={`行=数据对象，列=质量维度；共 ${totalReqs} 条需求（${publishedReqs} 已发布 / ${draftReqs} 草稿 / ${p0Reqs} P0 高优）`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-[240px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">数据对象</th>
                {DIMENSIONS.map((d) => (
                  <th key={d} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d}</th>
                ))}
                <th className="w-[80px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">合计</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => {
                const isOpen = expandedObject === row.objectId;
                return (
                  <Fragment key={row.objectId}>
                    <tr className="border-b border-border hover:bg-muted/20">
                      <td className="px-3 py-3">
                        <button type="button" onClick={() => toggleObject(row.objectId)} className="flex items-center gap-1.5 text-left">
                          {isOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                          <div>
                            <div className="font-semibold text-foreground">{row.objectName}</div>
                            <div className="font-mono text-[9px] text-muted-foreground">{row.objectId}</div>
                          </div>
                        </button>
                      </td>
                      {DIMENSIONS.map((d) => {
                        const cellReqs = row.cells[d];
                        return (
                          <td key={d} className="px-3 py-3 align-top">
                            {cellReqs.length === 0 ? (
                              <span className="text-[10px] text-slate-300">—</span>
                            ) : (
                              <div className="space-y-1">
                                {cellReqs.map((r) => (
                                  <div key={r.id} className="rounded-md border border-border bg-card p-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="truncate font-medium text-foreground" title={r.indicator}>{r.indicator}</span>
                                      <Pill tone={r.priority === "P0" ? "red" : r.priority === "P1" ? "amber" : "slate"} size="sm">{r.priority}</Pill>
                                    </div>
                                    <div className="mt-1 font-mono text-[9px] text-muted-foreground">目标 {r.target}</div>
                                    <div className="mt-1"><Pill tone={statusTone(r.status)} size="sm">{r.status}</Pill></div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-center">
                        <span className="text-[15px] font-semibold tabular-nums text-foreground">{row.reqs.length}</span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-border bg-muted/10">
                        <td colSpan={DIMENSIONS.length + 2} className="px-6 py-3">
                          <div className="space-y-2">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">需求详情与信息环境上下文</div>
                            {row.reqs.map((r) => (
                              <div key={r.id} className="rounded-md border border-border bg-card p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[10px] text-muted-foreground">{r.id}</span>
                                  <span className="font-semibold text-foreground">{r.indicator}</span>
                                  <Pill tone="blue" size="sm">{r.dimension}</Pill>
                                  <Pill tone={r.priority === "P0" ? "red" : r.priority === "P1" ? "amber" : "slate"} size="sm">{r.priority}</Pill>
                                  <Pill tone={statusTone(r.status)} size="sm">{r.status}</Pill>
                                  <span className="ml-auto text-[10px] text-muted-foreground">更新于 {r.updatedAt}</span>
                                </div>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                  <div className="rounded-md bg-muted/30 p-2">
                                    <div className="text-[9px] uppercase text-muted-foreground">目标</div>
                                    <div className="font-mono text-[11px] text-foreground">{r.target}</div>
                                  </div>
                                  <div className="rounded-md bg-muted/30 p-2">
                                    <div className="text-[9px] uppercase text-muted-foreground">信息环境上下文</div>
                                    <div className="text-[11px] leading-5 text-foreground">{r.context}</div>
                                  </div>
                                </div>
                                {r.status === "草稿" && (
                                  <div className="mt-2 flex justify-end">
                                    <ActionButton size="sm" primary icon={FileText} onClick={() => publishRequirement(r.id)}>发布需求</ActionButton>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* L4 AI 自动识别建议 */}
      <Panel
        title="L4 AI 需求矩阵自动识别建议"
        description="基于对象×维度覆盖缺口、剖析偏差和血缘影响自动识别潜在需求"
        actions={<Pill tone="violet"><Sparkles className="mr-1 inline h-3 w-3" />AI 辅助</Pill>}
      >
        <div className="p-4">
          {activeSuggestions.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-[11px] text-muted-foreground">
              当前无 AI 识别建议，已识别的覆盖缺口均已采纳或驳回。
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {activeSuggestions.map((s) => (
                <div key={s.id} className="flex flex-col rounded-lg border border-violet-200 bg-violet-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Wand2 className="h-3.5 w-3.5 text-violet-600" />
                      <span className="text-[10px] font-semibold uppercase text-violet-700">AI 建议</span>
                    </div>
                    <Pill tone={s.confidence === "高" ? "green" : "amber"} size="sm">置信度 {s.confidence}</Pill>
                  </div>
                  <div className="mt-3 text-[12px] font-semibold text-foreground">{s.indicator}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{s.objectName} · {s.dimension} · 优先级 {s.priority}</div>
                  <div className="mt-3 rounded-md bg-white p-2 text-[10px] leading-5 text-slate-600">{s.context}</div>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="font-mono text-muted-foreground">目标 {s.target}</span>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <ActionButton size="sm" onClick={() => dismissSuggestion(s.id)}>驳回</ActionButton>
                    <ActionButton size="sm" primary onClick={() => adoptSuggestion(s)}>采纳为草稿</ActionButton>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 rounded-md border border-dashed border-border p-3 text-[10px] leading-5 text-muted-foreground">
            AI 建议来自本地 mock 推理，不替代业务确认；采纳后自动进入「草稿」状态，仍需业务方审核发布。
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
            <Target className="h-3 w-3" />
            <span>需求驱动规则设计，规则库见 /data-governance/quality/rules。</span>
          </div>
        </div>
      </Panel>
    </WorkspacePage>
  );
}
