// 元数据检索、对象详情与血缘（升级 T-41）。
// 三栏数据地图：左检索结果列表（按元模型对象类型筛选）+
// 中对象说明（按元模型属性集分组渲染 + 认责字段编辑回写 D2）+
// 右血缘影响（按关系类型渲染 + 影响分析 + L4 AI 血缘追踪建议）。
import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, CheckCircle2, ChevronRight, Database,
  Edit3, Layers3, Network, RefreshCw, Search, Sparkles, Target, UserCog, X,
} from "lucide-react";

import {
  ActionButton, InlineNotice, PageTitle, Panel, Pill, ProgressBar,
  WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import {
  SCHEMA_VERSION, seedMetadataAiSuggestions, seedMetadataObjects, seedMetaModels,
} from "../fixtures";
import { formatNow, useGovernanceState } from "../state";
import type {
  AccountabilityStatus, AttributeGroup, MetadataAiSuggestion, MetadataObject,
  MetaModel, MetadataObjectType,
} from "../types";

// 对象类型图标映射
const objectIcons: Record<MetadataObjectType, typeof Database> = {
  湖表: Database,
  指标: Target,
  任务: Activity,
  数据服务: Layers3,
  数据源: Database,
  模型: Database,
  API: Layers3,
  报告: Target,
};

// 认责状态对应颜色
function accountabilityTone(status: AccountabilityStatus) {
  if (status === "已认责") return "green" as const;
  if (status === "待确认") return "amber" as const;
  return "red" as const;
}

// 属性分组顺序与显示名
const GROUP_ORDER: AttributeGroup[] = ["技术属性", "业务属性", "管理属性"];

type MapState = {
  schemaVersion: number;
  objects: MetadataObject[];
  models: MetaModel[];
  suggestions: MetadataAiSuggestion[];
};

const initialState: MapState = {
  schemaVersion: SCHEMA_VERSION,
  objects: seedMetadataObjects,
  models: seedMetaModels,
  suggestions: seedMetadataAiSuggestions,
};

export function MetadataMapPage() {
  const [state, update, meta] = useGovernanceState<MapState>(
    "data-agent.data-governance.metadata",
    initialState,
  );

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("全部");
  const [selectedId, setSelectedId] = useState<string>(state.objects[0]?.id ?? "");
  // 认责字段编辑抽屉
  const [editingAccountability, setEditingAccountability] = useState(false);
  // 编辑表单值
  const [ownerDraft, setOwnerDraft] = useState("");
  const [managerDraft, setManagerDraft] = useState("");
  // AI 建议抽屉
  const [suggestionOpenId, setSuggestionOpenId] = useState<string | null>(null);

  // 类型筛选选项（基于已有对象类型，去重）
  const typeOptions = useMemo(
    () => ["全部", ...Array.from(new Set(state.objects.map((o) => o.objectType)))],
    [state.objects],
  );

  // 检索结果过滤
  const filtered = useMemo(
    () =>
      state.objects.filter((item) => {
        if (typeFilter !== "全部" && item.objectType !== typeFilter) return false;
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          item.domain.toLowerCase().includes(q) ||
          item.system.toLowerCase().includes(q) ||
          Object.values(item.attributes).some((v) => v.toLowerCase().includes(q))
        );
      }),
    [state.objects, typeFilter, query],
  );

  const selected = state.objects.find((o) => o.id === selectedId) ?? filtered[0] ?? null;
  const selectedModel = selected ? state.models.find((m) => m.id === selected.modelId) : null;

  // 选中对象关联的 AI 建议
  const selectedSuggestions = selected
    ? state.suggestions.filter((s) => s.objectId === selected.id)
    : [];

  // 属性完整度：依据元模型必填属性
  const completeness = useMemo(() => {
    if (!selected || !selectedModel) return 0;
    const required = selectedModel.attributes.filter((a) => a.required);
    if (!required.length) return 100;
    const filled = required.filter((a) => {
      const v = selected.attributes[a.name];
      return v && v.trim().length > 0;
    }).length;
    return Math.round((filled / required.length) * 100);
  }, [selected, selectedModel]);

  // 影响范围：根据血缘描述解析影响数（mock 解析）
  const impactCount = useMemo(() => {
    if (!selected) return { upstream: 0, downstream: 0 };
    const upMatch = /(\d+)\s*上游/.exec(selected.lineage);
    const downMatch = /(\d+)\s*下游/.exec(selected.lineage);
    return {
      upstream: upMatch ? Number(upMatch[1]) : 0,
      downstream: downMatch ? Number(downMatch[1]) : 0,
    };
  }, [selected]);

  function openEditAccountability() {
    if (!selected) return;
    setOwnerDraft(selected.ownerId);
    setManagerDraft(selected.managerId);
    setEditingAccountability(true);
  }

  function saveAccountability() {
    if (!selected) return;
    const nextStatus: AccountabilityStatus = ownerDraft.trim()
      ? managerDraft.trim()
        ? "已认责"
        : "待确认"
      : "未认责";
    update((cur) => ({
      ...cur,
      objects: cur.objects.map((o) =>
        o.id === selected.id
          ? {
              ...o,
              ownerId: ownerDraft.trim(),
              managerId: managerDraft.trim(),
              accountabilityStatus: nextStatus,
              updatedAt: formatNow(),
            }
          : o,
      ),
    }));
    setEditingAccountability(false);
  }

  function confirmSuggestion(id: string, action: "已采纳" | "已驳回") {
    update((cur) => ({
      ...cur,
      suggestions: cur.suggestions.map((s) =>
        s.id === id
          ? { ...s, status: action, confirmedBy: "当前用户", confirmedAt: formatNow() }
          : s,
      ),
    }));
    setSuggestionOpenId(null);
  }

  function refreshSelected() {
    if (!selected) return;
    update((cur) => ({
      ...cur,
      objects: cur.objects.map((o) =>
        o.id === selected.id ? { ...o, status: "同步中", updatedAt: formatNow() } : o,
      ),
    }));
    window.setTimeout(() => {
      update((cur) => ({
        ...cur,
        objects: cur.objects.map((o) =>
          o.id === selected.id ? { ...o, status: "已同步", updatedAt: formatNow() } : o,
        ),
      }));
    }, 700);
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Governance / Metadata Map"
        title="元数据与数据地图"
        description="三栏数据地图：先按对象类型检索，再从元模型属性集和认责字段理解它，最后从血缘关系看影响范围与 AI 追踪建议。"
        actions={
          <ActionButton icon={RefreshCw} onClick={refreshSelected} disabled={!selected}>
            刷新当前对象
          </ActionButton>
        }
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />

      {/* 顶部检索条 + 类型筛选 */}
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-slate-50 p-5">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-blue-700">
            <Search className="h-3.5 w-3.5" />
            数据地图统一检索
          </div>
          <label className="flex h-11 items-center gap-3 rounded-lg border border-blue-200 bg-white px-4 shadow-sm">
            <Search className="h-4 w-4 text-blue-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索对象名称、业务域、来源系统或属性值"
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-400"
            />
            <span className="text-[10px] text-slate-400">{filtered.length} 个结果</span>
          </label>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {typeOptions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "rounded-full px-3 py-1 text-[10px] transition",
                  typeFilter === t
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-500 hover:text-blue-700",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 三栏数据地图 */}
      <div className="grid min-h-[640px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        {/* 左：检索结果列表 */}
        <Panel
          title="检索结果"
          description={`按对象类型筛选 · ${filtered.length} 项`}
        >
          <div className="max-h-[720px] divide-y divide-border overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-6 text-center text-[11px] text-muted-foreground">
                没有匹配的对象
              </div>
            )}
            {filtered.map((item) => {
              const Icon = objectIcons[item.objectType] ?? Database;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "flex w-full items-start gap-3 p-3 text-left transition hover:bg-muted/30",
                    selected?.id === item.id && "bg-blue-50/70",
                  )}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-foreground">
                      {item.name}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>{item.objectType}</span>
                      <span>·</span>
                      <span className="truncate">{item.domain}</span>
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1">
                      <Pill tone={accountabilityTone(item.accountabilityStatus)} size="sm">
                        {item.accountabilityStatus}
                      </Pill>
                      <Pill tone={statusTone(item.status)} size="sm">
                        {item.status}
                      </Pill>
                    </span>
                  </span>
                  <ChevronRight className="mt-2 h-3.5 w-3.5 text-slate-300" />
                </button>
              );
            })}
          </div>
        </Panel>

        {/* 中：对象说明（按元模型属性集分组渲染 + 认责字段编辑） */}
        {selected ? (
          <Panel
            title="对象说明"
            description={`${selected.objectType} · ${selected.domain} · 元模型 ${selectedModel?.displayName ?? "—"}`}
            actions={
              <div className="flex items-center gap-1.5">
                <Pill tone={statusTone(selected.status)} size="sm">
                  {selected.status}
                </Pill>
                <Pill tone="blue" size="sm">完整度 {completeness}%</Pill>
              </div>
            }
          >
            <div className="p-5">
              {/* 对象身份 */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[17px] font-semibold text-foreground">
                      {selected.name}
                    </h2>
                    <Pill tone={accountabilityTone(selected.accountabilityStatus)} size="sm">
                      认责：{selected.accountabilityStatus}
                    </Pill>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    URN: data-agent:{selected.objectType}:{selected.id} · 模型 {selected.modelId}
                  </div>
                </div>
              </div>

              {/* 完整度进度 */}
              <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">属性完整度（按元模型必填属性）</span>
                  <span className="font-semibold text-foreground">{completeness}%</span>
                </div>
                <ProgressBar value={completeness} tone={completeness >= 90 ? "green" : "amber"} />
              </div>

              {/* 按元模型属性集分组渲染 */}
              {selectedModel && (
                <div className="mt-5 space-y-4">
                  {GROUP_ORDER.map((group) => {
                    const attrs = selectedModel.attributes.filter((a) => a.group === group);
                    if (!attrs.length) return null;
                    return (
                      <div key={group}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-foreground">{group}</span>
                          <span className="text-[9px] text-muted-foreground">
                            {attrs.length} 项 · 必填 {attrs.filter((a) => a.required).length} ·
                            采集 {attrs.filter((a) => a.collected).length}
                          </span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {attrs.map((attr) => {
                            const value = selected.attributes[attr.name];
                            const missing = attr.required && (!value || !value.trim());
                            return (
                              <div
                                key={attr.id}
                                className={cn(
                                  "rounded-md border p-2.5",
                                  missing
                                    ? "border-amber-200 bg-amber-50/60"
                                    : "border-border bg-muted/20",
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-muted-foreground">
                                    {attr.name}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    {attr.required && (
                                      <Pill tone="red" size="sm">必填</Pill>
                                    )}
                                    {attr.collected && (
                                      <Pill tone="blue" size="sm">采集</Pill>
                                    )}
                                    {attr.valueConstraint && (
                                      <Pill tone="violet" size="sm">值域</Pill>
                                    )}
                                  </span>
                                </div>
                                <div
                                  className={cn(
                                    "mt-1 break-words text-[11px] font-medium",
                                    missing ? "text-amber-700" : "text-foreground",
                                  )}
                                >
                                  {missing ? "— 缺失 —" : value}
                                </div>
                                {attr.valueConstraint && (
                                  <div className="mt-1 text-[9px] text-muted-foreground">
                                    约束：{attr.valueConstraint}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 认责字段（可编辑回写） */}
              <div className="mt-5 rounded-md border border-blue-200 bg-blue-50/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                    <UserCog className="h-3.5 w-3.5 text-blue-600" />
                    认责字段（D2 联动）
                  </span>
                  <ActionButton
                    size="sm"
                    icon={Edit3}
                    onClick={openEditAccountability}
                  >
                    编辑认责
                  </ActionButton>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-md border border-border bg-card p-2">
                    <div className="text-[9px] text-muted-foreground">数据所有者</div>
                    <div className="mt-0.5 font-medium text-foreground">
                      {selected.ownerId || "— 未指定 —"}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-card p-2">
                    <div className="text-[9px] text-muted-foreground">数据管理者</div>
                    <div className="mt-0.5 font-medium text-foreground">
                      {selected.managerId || "— 未指定 —"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  认责事实由本对象维护；治理组织面通过对象 ID 聚合认责总览，不重复维护。
                </div>
              </div>

              {/* 治理关联引用 */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ["数据标准", selected.standardId ?? "—"],
                  ["标准版本", selected.standardVersionId ?? "—"],
                  ["本体概念", selected.ontologyConceptId ?? "—"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border border-border bg-muted/10 p-2.5 text-center"
                  >
                    <div className="text-[9px] text-muted-foreground">{label}</div>
                    <div className="mt-0.5 font-mono text-[10px] font-medium text-foreground">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {selected.auditSummary && (
                <div className="mt-3 rounded-md border-l-2 border-emerald-400 bg-emerald-50/60 px-3 py-2 text-[10px] leading-5 text-emerald-800">
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                  稽核摘要：{selected.auditSummary}
                </div>
              )}
            </div>
          </Panel>
        ) : (
          <Panel>
            <div className="p-16 text-center text-[12px] text-muted-foreground">
              从左侧选择一个对象查看详情
            </div>
          </Panel>
        )}

        {/* 右：血缘影响 + AI 建议 */}
        {selected ? (
          <div className="space-y-4">
            <Panel
              title="血缘影响"
              description={selected.lineage}
              actions={
                <ActionButton size="sm" icon={Network}>
                  打开完整血缘图
                </ActionButton>
              }
            >
              <div className="p-4">
                {/* 上下游影响数 */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      上游依赖
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-[20px] font-semibold tabular-nums text-foreground">
                        {impactCount.upstream}
                      </span>
                      <span className="text-[9px] text-muted-foreground">个对象</span>
                    </div>
                  </div>
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      下游影响
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-[20px] font-semibold tabular-nums text-foreground">
                        {impactCount.downstream}
                      </span>
                      <span className="text-[9px] text-muted-foreground">个对象</span>
                    </div>
                  </div>
                </div>

                {/* 血缘节点链 */}
                <div className="mt-4 space-y-2">
                  <LineageNode
                    label="上游来源"
                    value={selected.system.split("→")[0]?.trim() ?? selected.system}
                    tone="slate"
                  />
                  <div className="ml-4 h-5 border-l border-dashed border-blue-300" />
                  <LineageNode label="当前对象" value={selected.name} tone="blue" />
                  <div className="ml-4 h-5 border-l border-dashed border-blue-300" />
                  <LineageNode
                    label="下游消费"
                    value={
                      selected.objectType === "数据服务"
                        ? "外部应用 / 分析报表"
                        : "指标与数据服务"
                    }
                    tone="green"
                  />
                </div>

                {/* 关系类型列表（按元模型渲染） */}
                {selectedModel && selectedModel.relations.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 text-[10px] font-semibold text-foreground">
                      关系类型（来自元模型）
                    </div>
                    <div className="space-y-1.5">
                      {selectedModel.relations.map((rel) => (
                        <div
                          key={rel.id}
                          className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-2.5 py-1.5"
                        >
                          <div>
                            <div className="text-[10px] font-medium text-foreground">
                              {rel.name}
                            </div>
                            <div className="text-[9px] text-muted-foreground">
                              {rel.sourceType} → {rel.targetType} · {rel.direction}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {rel.inLineage && (
                              <Pill tone="blue" size="sm">血缘</Pill>
                            )}
                            <Pill tone="violet" size="sm">权重 {rel.impactWeight.toFixed(1)}</Pill>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 影响预警 */}
                <div className="mt-4 rounded-md bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">
                  <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                  结构变更预计影响 {impactCount.downstream} 个下游对象，其中{" "}
                  {Math.max(1, Math.floor(impactCount.downstream / 4))} 个为已发布数据服务。
                </div>
              </div>
            </Panel>

            {/* L4 AI 血缘追踪建议 */}
            <Panel
              title="AI 辅助建议"
              description="血缘自动追踪与符合性建议 · 需人工确认"
              actions={
                <Pill tone="violet" size="sm">
                  {selectedSuggestions.length} 条
                </Pill>
              }
            >
              <div className="max-h-[300px] space-y-2 overflow-y-auto p-3">
                {selectedSuggestions.length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-4 text-center text-[10px] text-muted-foreground">
                    当前对象暂无 AI 建议
                  </div>
                )}
                {selectedSuggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className="rounded-md border border-violet-200 bg-violet-50/40 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                        <span className="text-[10px] font-semibold text-violet-900">
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
                    <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted-foreground">
                      <span>
                        置信度 {sug.confidence} · {sug.modelVersion}
                      </span>
                      {sug.confirmedBy && (
                        <span>
                          确认人 {sug.confirmedBy} · {sug.confirmedAt}
                        </span>
                      )}
                    </div>
                    {sug.status === "待确认" && (
                      <div className="mt-2 flex gap-1.5">
                        <ActionButton
                          size="sm"
                          primary
                          onClick={() => confirmSuggestion(sug.id, "已采纳")}
                        >
                          采纳
                        </ActionButton>
                        <ActionButton
                          size="sm"
                          onClick={() => confirmSuggestion(sug.id, "已驳回")}
                        >
                          驳回
                        </ActionButton>
                        <ActionButton
                          size="sm"
                          onClick={() => setSuggestionOpenId(sug.id)}
                        >
                          详情
                        </ActionButton>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        ) : (
          <Panel>
            <div className="p-8 text-center text-[12px] text-muted-foreground">
              选择对象后查看血缘与 AI 建议
            </div>
          </Panel>
        )}
      </div>

      {/* 认责字段编辑抽屉 */}
      {editingAccountability && selected && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/30"
          onClick={() => setEditingAccountability(false)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Accountability
                </div>
                <div className="text-[14px] font-semibold text-foreground">编辑认责字段</div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccountability(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-md border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
                对象：<span className="font-semibold text-foreground">{selected.name}</span>
                <br />
                类型：{selected.objectType} · 域：{selected.domain}
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-foreground">
                  数据所有者（ownerId）
                </label>
                <input
                  value={ownerDraft}
                  onChange={(e) => setOwnerDraft(e.target.value)}
                  placeholder="如：陈晨"
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-[12px] outline-none focus:border-primary/60"
                />
                <p className="mt-1 text-[9px] text-muted-foreground">
                  填写后将根据所有者/管理者是否齐全自动判定认责状态。
                </p>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-foreground">
                  数据管理者（managerId）
                </label>
                <input
                  value={managerDraft}
                  onChange={(e) => setManagerDraft(e.target.value)}
                  placeholder="如：王雪"
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-[12px] outline-none focus:border-primary/60"
                />
              </div>
              <div className="rounded-md border border-blue-200 bg-blue-50/60 p-3 text-[10px] leading-5 text-blue-800">
                认责状态自动判定规则：所有者 + 管理者都齐全 = 已认责；仅所有者 = 待确认；都缺失 = 未认责。
              </div>
              <div className="flex justify-end gap-2">
                <ActionButton onClick={() => setEditingAccountability(false)}>取消</ActionButton>
                <ActionButton primary onClick={saveAccountability}>
                  保存认责
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI 建议详情抽屉 */}
      {suggestionOpenId && (
        <AiSuggestionDetailDrawer
          suggestion={state.suggestions.find((s) => s.id === suggestionOpenId)}
          objectName={selected?.name ?? ""}
          onClose={() => setSuggestionOpenId(null)}
        />
      )}
    </WorkspacePage>
  );
}

// 血缘节点
function LineageNode({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "slate" | "blue" | "green";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        tone === "blue"
          ? "border-blue-200 bg-blue-50"
          : tone === "green"
            ? "border-emerald-200 bg-emerald-50"
            : "border-slate-200 bg-slate-50",
      )}
    >
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-[11px] font-semibold text-foreground">{value}</div>
    </div>
  );
}

// AI 建议详情抽屉
function AiSuggestionDetailDrawer({
  suggestion,
  objectName,
  onClose,
}: {
  suggestion: MetadataAiSuggestion | undefined;
  objectName: string;
  onClose: () => void;
}) {
  if (!suggestion) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">
              AI Suggestion
            </div>
            <div className="text-[14px] font-semibold text-foreground">{suggestion.type}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <div className="rounded-md border border-border bg-muted/20 p-3 text-[11px]">
            对象：<span className="font-semibold text-foreground">{objectName}</span>
            <br />
            建议ID：<code className="font-mono">{suggestion.id}</code>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-medium text-muted-foreground">建议内容</div>
            <p className="rounded-md border border-violet-200 bg-violet-50/50 p-3 text-[11px] leading-6 text-foreground">
              {suggestion.content}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded-md border border-border bg-muted/10 p-2">
              <div className="text-muted-foreground">置信度</div>
              <div className="mt-0.5 font-semibold text-foreground">{suggestion.confidence}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/10 p-2">
              <div className="text-muted-foreground">模型版本</div>
              <div className="mt-0.5 font-mono text-foreground">{suggestion.modelVersion}</div>
            </div>
          </div>
          {suggestion.confirmedBy && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-[10px] text-emerald-800">
              已由 {suggestion.confirmedBy} 于 {suggestion.confirmedAt} 确认为「{suggestion.status}」
            </div>
          )}
          <div className="rounded-md border border-dashed border-border p-3 text-[10px] leading-5 text-muted-foreground">
            AI 建议为 mock 输出，需人工确认后回写；不替代血缘采集器和正式审计结论。
          </div>
        </div>
      </div>
    </div>
  );
}
