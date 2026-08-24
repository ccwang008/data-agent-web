// 元数据质量评价（T-42/T-43）。
// 三层结构：顶部三维评分概览（完整性/准确性/时效性 + 趋势）+
// 中部评价批次列表（不可覆盖，引用元模型版本）+
// 底部质量问题闭环（绑定对象+属性+维度，联动认责管理者）+ L4 AI 辅助。
import { useMemo, useState } from "react";
import {
  AlertTriangle, CheckCircle2, ClipboardList, Clock, Gauge, Sparkles, Target,
  TrendingDown, TrendingUp, UserCog,
} from "lucide-react";

import {
  ActionButton, InlineNotice, PageTitle, Panel, Pill, ProgressBar, WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import {
  SCHEMA_VERSION, seedMetadataAiSuggestions, seedMetadataObjects,
  seedMetadataQualityBatches, seedMetaModels,
} from "../fixtures";
import { formatNow, useGovernanceState } from "../state";
import type {
  MetadataAiSuggestion, MetadataObject, MetadataQualityBatch,
  MetadataQualityGrade, MetadataQualityResult, MetaModel,
} from "../types";

// 质量等级颜色映射
function gradeTone(grade: MetadataQualityGrade) {
  if (grade === "优秀") return "green" as const;
  if (grade === "良好") return "blue" as const;
  if (grade === "待改进") return "amber" as const;
  return "red" as const;
}

// 三维评分维度配置
const DIMENSIONS = [
  { key: "completeness" as const, label: "完整性", icon: ClipboardList, desc: "必填属性填写率" },
  { key: "accuracy" as const, label: "准确性", icon: Target, desc: "符合值域约束比例" },
  { key: "timeliness" as const, label: "时效性", icon: Clock, desc: "采集属性新鲜度" },
];

// 从 missingItems 派生的质量问题
type QualityIssueItem = {
  id: string;
  objectId: string;
  objectName: string;
  attribute: string;
  dimension: "完整性" | "准确性" | "时效性";
  severity: "P0" | "P1" | "P2";
  managerId: string;
  status: "待整改" | "整改中" | "已闭环";
  batchId: string;
};

type QualityState = {
  schemaVersion: number;
  batches: MetadataQualityBatch[];
  objects: MetadataObject[];
  models: MetaModel[];
  aiSuggestions: MetadataAiSuggestion[];
  // 整改状态扩展（独立于批次，可写）
  issues: QualityIssueItem[];
};

const initialState: QualityState = {
  schemaVersion: SCHEMA_VERSION,
  batches: seedMetadataQualityBatches,
  objects: seedMetadataObjects,
  models: seedMetaModels,
  aiSuggestions: seedMetadataAiSuggestions,
  issues: [],
};

// 从批次结果中派生质量问题清单
// 派生项使用稳定 ID `${batchId}:${objectId}:${attribute}`，避免重渲染导致 ID 变化
function deriveIssues(state: QualityState): QualityIssueItem[] {
  const latestBatch = state.batches[0];
  if (!latestBatch) return state.issues;
  // 已存在的 issue（含已整改）按 objectId+attribute 去重，避免重复派生
  const existingKeys = new Set(state.issues.map((i) => `${i.objectId}:${i.attribute}`));
  const derived: QualityIssueItem[] = [];
  for (const result of latestBatch.results) {
    const object = state.objects.find((o) => o.id === result.objectId);
    if (!object) continue;
    for (const missing of result.missingItems) {
      const key = `${object.id}:${missing}`;
      if (existingKeys.has(key)) continue;
      // 推断严重度：未认责对象 P0；其他依据完整度
      const severity: QualityIssueItem["severity"] =
        object.accountabilityStatus === "未认责"
          ? "P0"
          : result.completeness < 50
            ? "P0"
            : result.completeness < 80
              ? "P1"
              : "P2";
      derived.push({
        id: `${latestBatch.id}:${object.id}:${missing}`,
        objectId: object.id,
        objectName: object.name,
        attribute: missing,
        dimension: "完整性",
        severity,
        managerId: object.managerId,
        status: "待整改",
        batchId: latestBatch.id,
      });
    }
  }
  return [...state.issues, ...derived];
}

export function MetadataQualityPage() {
  const [state, update, meta] = useGovernanceState<QualityState>(
    "data-agent.data-governance.metadata-quality",
    initialState,
  );
  const [activeBatchId, setActiveBatchId] = useState<string>(state.batches[0]?.id ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  // 整改抽屉
  const [rectifyTarget, setRectifyTarget] = useState<string | null>(null);
  const [rectifyAction, setRectifyAction] = useState("");

  // 派生质量问题清单（合并批次推导 + 已存在）
  const issues = useMemo(() => deriveIssues(state), [state]);
  const activeBatch = state.batches.find((b) => b.id === activeBatchId) ?? state.batches[0] ?? null;

  // 三维评分概览（基于最新批次）
  const scores = useMemo(() => {
    if (!activeBatch) return { completeness: 0, accuracy: 0, timeliness: 0, total: 0 };
    const r = activeBatch.results;
    if (!r.length) return { completeness: 0, accuracy: 0, timeliness: 0, total: 0 };
    const avg = (key: keyof MetadataQualityResult) =>
      r.reduce((sum, x) => sum + (x[key] as number), 0) / r.length;
    return {
      completeness: Math.round(avg("completeness")),
      accuracy: Math.round(avg("accuracy")),
      timeliness: Math.round(avg("timeliness")),
      total: Math.round(avg("totalScore")),
    };
  }, [activeBatch]);

  // 趋势：对比批次（首项 vs 第二项）
  const trend = useMemo(() => {
    if (state.batches.length < 2) return { completeness: 0, accuracy: 0, timeliness: 0, total: 0 };
    const latest = state.batches[0];
    const prev = state.batches[1];
    if (!latest.results.length || !prev.results.length) {
      return { completeness: 0, accuracy: 0, timeliness: 0, total: 0 };
    }
    const avg = (
      batch: MetadataQualityBatch,
      key: keyof MetadataQualityResult,
    ) => batch.results.reduce((sum, x) => sum + (x[key] as number), 0) / batch.results.length;
    return {
      completeness: Math.round(avg(latest, "completeness") - avg(prev, "completeness")),
      accuracy: Math.round(avg(latest, "accuracy") - avg(prev, "accuracy")),
      timeliness: Math.round(avg(latest, "timeliness") - avg(prev, "timeliness")),
      total: Math.round(avg(latest, "totalScore") - avg(prev, "totalScore")),
    };
  }, [state.batches]);

  // AI 建议：业务元数据补充 + 符合性异常检测
  const aiSuggestions = useMemo(
    () =>
      state.aiSuggestions.filter(
        (s) => s.type === "业务元数据补充" || s.type === "符合性异常检测",
      ),
    [state.aiSuggestions],
  );

  const pendingAiCount = aiSuggestions.filter((s) => s.status === "待确认").length;

  function startRectify(issueId: string) {
    setRectifyTarget(issueId);
    setRectifyAction("");
  }

  function saveRectify() {
    if (!rectifyTarget) return;
    if (!rectifyAction.trim()) {
      setNotice("请填写整改措施");
      return;
    }
    // 派生 issue 用稳定 ID；将其从派生态提升为已保存态，状态改为"整改中"
    const target = issues.find((i) => i.id === rectifyTarget);
    if (!target) return;
    update((cur) => ({
      ...cur,
      issues: [
        // 移除可能存在的同 ID 项，避免重复
        ...cur.issues.filter((i) => i.id !== target.id),
        { ...target, status: "整改中" },
      ],
    }));
    setNotice(`问题 ${target.id} 已开始整改：${rectifyAction}`);
    setRectifyTarget(null);
    setRectifyAction("");
  }

  function closeIssue(issueId: string) {
    update((cur) => ({
      ...cur,
      issues: cur.issues.map((i) =>
        i.id === issueId ? { ...i, status: "已闭环" } : i,
      ),
    }));
    setNotice(`问题 ${issueId} 已闭环`);
  }

  function confirmAi(id: string, action: "已采纳" | "已驳回") {
    update((cur) => ({
      ...cur,
      aiSuggestions: cur.aiSuggestions.map((s) =>
        s.id === id
          ? { ...s, status: action, confirmedBy: "当前用户", confirmedAt: formatNow() }
          : s,
      ),
    }));
    setNotice(`AI 建议 ${id} 已${action}`);
  }

  const targetIssue = rectifyTarget ? issues.find((i) => i.id === rectifyTarget) : null;

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Governance / Metadata Quality"
        title="元数据质量评价"
        description="三层结构：三维评分概览 + 不可覆盖评价批次 + 质量问题闭环。评价对象是元数据本身（不是业务数据），由元模型必填/采集/值域约束驱动。"
        actions={
          <Pill tone="violet" size="sm">
            AI 待确认 {pendingAiCount}
          </Pill>
        }
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      {notice && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
          {notice}
        </div>
      )}

      {/* 第一层：三维评分概览 + 趋势 */}
      <div className="grid gap-3 xl:grid-cols-4">
        {/* 三维评分卡片 */}
        {DIMENSIONS.map((dim) => {
          const value = scores[dim.key];
          const delta = trend[dim.key];
          const Icon = dim.icon;
          const tone = value >= 90 ? "green" : value >= 70 ? "blue" : "red";
          const toneMap: Record<string, string> = {
            green: "text-emerald-600",
            blue: "text-blue-600",
            red: "text-red-600",
          };
          return (
            <div
              key={dim.key}
              className="rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{dim.label}</span>
                <Icon className={cn("h-4 w-4", toneMap[tone])} />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={cn("text-[24px] font-semibold tabular-nums", toneMap[tone])}>
                  {value}
                </span>
                <span className="text-[10px] text-muted-foreground">/ 100</span>
                {delta !== 0 && (
                  <span
                    className={cn(
                      "ml-auto inline-flex items-center gap-0.5 text-[10px]",
                      delta > 0 ? "text-emerald-600" : "text-amber-600",
                    )}
                  >
                    {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {delta > 0 ? "+" : ""}{delta}
                  </span>
                )}
              </div>
              <ProgressBar value={value} tone={tone as "green" | "blue" | "red"} className="mt-2" />
              <div className="mt-1 text-[9px] text-muted-foreground">{dim.desc}</div>
            </div>
          );
        })}
        {/* 综合评分卡 */}
        <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-violet-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">综合元数据质量分</span>
            <Gauge className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold tabular-nums text-blue-700">
              {scores.total}
            </span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <Pill tone={scores.total >= 90 ? "green" : scores.total >= 70 ? "blue" : "amber"} size="sm">
              {scores.total >= 90 ? "优秀" : scores.total >= 80 ? "良好" : scores.total >= 60 ? "待改进" : "不合格"}
            </Pill>
            <span className="text-[9px] text-muted-foreground">
              基于 {activeBatch?.results.length ?? 0} 个对象 · 批次 {activeBatch?.id}
            </span>
          </div>
        </div>
      </div>

      {/* 第二层：评价批次列表（不可覆盖，引用元模型版本） */}
      <Panel
        title="评价批次列表"
        description="批次不可覆盖，引用元模型版本作为评分依据快照"
        actions={
          <Pill tone="blue" size="sm">
            {state.batches.length} 个批次
          </Pill>
        }
      >
        <div className="divide-y divide-border">
          {state.batches.map((batch) => {
            const isActive = activeBatch?.id === batch.id;
            const passed = batch.results.filter((r) => r.grade === "优秀" || r.grade === "良好").length;
            const failed = batch.results.filter((r) => r.grade === "不合格").length;
            const avg = batch.results.length
              ? Math.round(
                  batch.results.reduce((sum, r) => sum + r.totalScore, 0) / batch.results.length,
                )
              : 0;
            return (
              <button
                key={batch.id}
                type="button"
                onClick={() => setActiveBatchId(batch.id)}
                className={cn(
                  "flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-muted/30",
                  isActive && "bg-blue-50/70",
                )}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-foreground">
                      批次 {batch.id}
                    </span>
                    <Pill tone={statusTone(batch.status)} size="sm">{batch.status}</Pill>
                    {isActive && <Pill tone="blue" size="sm">当前查看</Pill>}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {batch.triggeredAt} · 元模型版本 {batch.modelVersionId} ·
                    范围：{batch.scope.objectTypes.join("、")} / {batch.scope.domains.join("、")}
                  </div>
                </div>
                <div className="grid shrink-0 grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-[16px] font-semibold tabular-nums text-foreground">
                      {batch.results.length}
                    </div>
                    <div className="text-[9px] text-muted-foreground">对象数</div>
                  </div>
                  <div>
                    <div className="text-[16px] font-semibold tabular-nums text-emerald-600">
                      {passed}
                    </div>
                    <div className="text-[9px] text-muted-foreground">合格</div>
                  </div>
                  <div>
                    <div className="text-[16px] font-semibold tabular-nums text-red-600">
                      {failed}
                    </div>
                    <div className="text-[9px] text-muted-foreground">不合格</div>
                  </div>
                  <div>
                    <div className="text-[16px] font-semibold tabular-nums text-blue-600">
                      {avg}
                    </div>
                    <div className="text-[9px] text-muted-foreground">平均分</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* 当前批次结果详情 */}
      {activeBatch && (
        <Panel
          title={`批次 ${activeBatch.id} 评价结果详情`}
          description={`元模型 ${activeBatch.modelVersionId} · ${activeBatch.results.length} 个对象`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/40 text-[10px] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">对象</th>
                  <th className="px-3 py-2 text-center font-medium">完整性</th>
                  <th className="px-3 py-2 text-center font-medium">准确性</th>
                  <th className="px-3 py-2 text-center font-medium">时效性</th>
                  <th className="px-3 py-2 text-center font-medium">总分</th>
                  <th className="px-3 py-2 text-center font-medium">等级</th>
                  <th className="px-3 py-2 text-left font-medium">缺失项</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeBatch.results.map((result) => {
                  const object = state.objects.find((o) => o.id === result.objectId);
                  return (
                    <tr key={result.objectId} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground">
                          {object?.name ?? result.objectId}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          {object?.objectType} · {object?.domain}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        <ScoreCell value={result.completeness} />
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        <ScoreCell value={result.accuracy} />
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        <ScoreCell value={result.timeliness} />
                      </td>
                      <td className="px-3 py-2 text-center font-semibold tabular-nums text-foreground">
                        {result.totalScore.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Pill tone={gradeTone(result.grade)} size="sm">
                          {result.grade}
                        </Pill>
                      </td>
                      <td className="px-3 py-2">
                        {result.missingItems.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />无缺失
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {result.missingItems.map((item) => (
                              <Pill key={item} tone="amber" size="sm">{item}</Pill>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* 第三层：质量问题闭环 + AI 辅助 */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        {/* 质量问题闭环 */}
        <Panel
          title="质量问题闭环"
          description="绑定对象+属性+维度，联动认责管理者（D2）"
          actions={
            <div className="flex items-center gap-1.5">
              <Pill tone="amber" size="sm">待整改 {issues.filter((i) => i.status === "待整改").length}</Pill>
              <Pill tone="blue" size="sm">整改中 {issues.filter((i) => i.status === "整改中").length}</Pill>
              <Pill tone="green" size="sm">已闭环 {issues.filter((i) => i.status === "已闭环").length}</Pill>
            </div>
          }
        >
          <div className="max-h-[500px] overflow-y-auto p-4">
            {issues.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-[11px] text-muted-foreground">
                当前批次无缺失项；新批次评价后缺失项自动生成质量问题。
              </div>
            )}
            <div className="space-y-2">
              {issues.map((issue) => {
                const object = state.objects.find((o) => o.id === issue.objectId);
                return (
                  <div
                    key={issue.id}
                    className={cn(
                      "rounded-md border bg-card p-3",
                      issue.status === "已闭环"
                        ? "border-emerald-200 bg-emerald-50/30"
                        : issue.severity === "P0"
                          ? "border-red-200"
                          : "border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-foreground">
                            {issue.objectName}
                          </span>
                          <Pill tone={issue.severity === "P0" ? "red" : issue.severity === "P1" ? "amber" : "slate"} size="sm">
                            {issue.severity}
                          </Pill>
                          <Pill tone="blue" size="sm">{issue.dimension}</Pill>
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          缺失属性：<span className="font-medium text-amber-700">{issue.attribute}</span>
                          {" · "}
                          <span className="inline-flex items-center gap-0.5">
                            <UserCog className="h-3 w-3" />
                            认责管理者：{issue.managerId || "— 未指定 —"}
                          </span>
                        </div>
                      </div>
                      <Pill
                        tone={
                          issue.status === "已闭环"
                            ? "green"
                            : issue.status === "整改中"
                              ? "blue"
                              : "amber"
                        }
                        size="sm"
                      >
                        {issue.status}
                      </Pill>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-[9px] text-muted-foreground">
                        来源批次 {issue.batchId} · ID {issue.id}
                        {object && (
                          <>
                            {" · "}
                            对象类型 {object.objectType} · 域 {object.domain}
                          </>
                        )}
                      </div>
                      {issue.status !== "已闭环" && (
                        <div className="flex gap-1.5">
                          {issue.status === "待整改" && (
                            <ActionButton
                              size="sm"
                              primary
                              onClick={() => startRectify(issue.id)}
                            >
                              开始整改
                            </ActionButton>
                          )}
                          {issue.status === "整改中" && (
                            <ActionButton
                              size="sm"
                              primary
                              onClick={() => closeIssue(issue.id)}
                            >
                              闭环
                            </ActionButton>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 rounded-md border border-dashed border-border p-2.5 text-[10px] leading-5 text-muted-foreground">
              质量问题由评价批次的缺失项派生；认责管理者自动取自元数据对象的 managerId；本页只评价元数据本身质量，不与数据质量页（/quality）混用。
            </div>
          </div>
        </Panel>

        {/* L4 AI 辅助：业务元数据补充 + 符合性异常检测 */}
        <Panel
          title="L4 AI 辅助"
          description="业务元数据补充 + 符合性异常检测 · 需人工确认"
          actions={
            <Pill tone="violet" size="sm">
              {aiSuggestions.length} 条
            </Pill>
          }
        >
          <div className="max-h-[500px] space-y-2 overflow-y-auto p-3">
            {aiSuggestions.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-[10px] text-muted-foreground">
                暂无 AI 建议
              </div>
            )}
            {aiSuggestions.map((sug) => {
              const object = state.objects.find((o) => o.id === sug.objectId);
              return (
                <div
                  key={sug.id}
                  className={cn(
                    "rounded-md border p-3",
                    sug.type === "符合性异常检测"
                      ? "border-amber-200 bg-amber-50/40"
                      : "border-violet-200 bg-violet-50/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {sug.type === "符合性异常检测" ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                      )}
                      <span
                        className={cn(
                          "text-[10px] font-semibold",
                          sug.type === "符合性异常检测" ? "text-amber-900" : "text-violet-900",
                        )}
                      >
                        {sug.type}
                      </span>
                    </div>
                    <Pill
                      tone={
                        sug.status === "已采纳"
                          ? "green"
                          : sug.status === "已驳回"
                            ? "red"
                            : "amber"
                      }
                      size="sm"
                    >
                      {sug.status}
                    </Pill>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-5 text-foreground">
                    {sug.content}
                  </p>
                  <div className="mt-1.5 text-[9px] text-muted-foreground">
                    对象：{object?.name ?? sug.objectId} · 置信度 {sug.confidence}
                  </div>
                  {sug.confirmedBy && (
                    <div className="mt-1 text-[9px] text-muted-foreground">
                      确认人 {sug.confirmedBy} · {sug.confirmedAt}
                    </div>
                  )}
                  {sug.status === "待确认" && (
                    <div className="mt-2 flex gap-1.5">
                      <ActionButton
                        size="sm"
                        primary
                        onClick={() => confirmAi(sug.id, "已采纳")}
                      >
                        采纳
                      </ActionButton>
                      <ActionButton
                        size="sm"
                        onClick={() => confirmAi(sug.id, "已驳回")}
                      >
                        驳回
                      </ActionButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* 整改抽屉 */}
      {rectifyTarget && targetIssue && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/30"
          onClick={() => setRectifyTarget(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border px-5 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Rectify
              </div>
              <div className="text-[14px] font-semibold text-foreground">质量问题整改</div>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-md border border-border bg-muted/20 p-3 text-[11px]">
                <div className="font-semibold text-foreground">{targetIssue.objectName}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  缺失属性：{targetIssue.attribute}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  认责管理者：{targetIssue.managerId || "— 未指定 —"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  严重度：{targetIssue.severity} · 维度：{targetIssue.dimension}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-foreground">
                  整改措施
                </label>
                <textarea
                  value={rectifyAction}
                  onChange={(e) => setRectifyAction(e.target.value)}
                  rows={4}
                  placeholder="说明整改动作、负责人、完成时间"
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-[12px] outline-none focus:border-primary/60"
                />
              </div>
              <div className="rounded-md border border-blue-200 bg-blue-50/60 p-3 text-[10px] leading-5 text-blue-800">
                整改完成后由复核人确认闭环；本页与数据质量页（/quality）不同，仅评价元数据本身。
              </div>
              <div className="flex justify-end gap-2">
                <ActionButton onClick={() => setRectifyTarget(null)}>取消</ActionButton>
                <ActionButton primary onClick={saveRectify}>保存认责</ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </WorkspacePage>
  );
}

// 三维评分单元格
function ScoreCell({ value }: { value: number }) {
  const tone = value >= 90 ? "green" : value >= 70 ? "blue" : "red";
  const toneMap: Record<string, string> = {
    green: "text-emerald-600",
    blue: "text-blue-600",
    red: "text-red-600",
  };
  return (
    <span className={cn("font-semibold", toneMap[tone])}>{value.toFixed(0)}</span>
  );
}
