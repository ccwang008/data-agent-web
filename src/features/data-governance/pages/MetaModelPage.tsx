// 元模型配置（T-40）。
// 四象限配置工作台：对象类型定义、属性集定义、关系类型定义、采集规则配置。
// 每象限是独立配置面板，不是 CRUD 列表。
import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, Boxes, Database, GitBranch, Layers3,
  Plus, RefreshCw, Target, ToggleLeft, ToggleRight, Workflow,
} from "lucide-react";

import {
  ActionButton, InlineNotice, PageTitle, Panel, Pill, ProgressBar, WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import { SCHEMA_VERSION, seedMetaModels } from "../fixtures";
import { formatNow, makeId, nextVersion, useGovernanceState } from "../state";
import type {
  AttributeGroup, GovernanceStatus, MetaModel,
  MetaModelAttribute, MetadataObjectType,
} from "../types";

// 对象类型元数据
const OBJECT_TYPES: { type: MetadataObjectType; label: string; icon: typeof Database }[] = [
  { type: "湖表", label: "湖表元数据", icon: Database },
  { type: "指标", label: "指标元数据", icon: Target },
  { type: "任务", label: "任务元数据", icon: Activity },
  { type: "数据服务", label: "数据服务元数据", icon: Layers3 },
  { type: "数据源", label: "数据源元数据", icon: Database },
  { type: "模型", label: "模型元数据", icon: Boxes },
  { type: "API", label: "API 元数据", icon: Layers3 },
  { type: "报告", label: "报告元数据", icon: Target },
];

// 属性分组颜色映射
const GROUP_TONE: Record<AttributeGroup, "blue" | "violet" | "amber"> = {
  技术属性: "blue",
  业务属性: "violet",
  管理属性: "amber",
};

type ModelState = {
  schemaVersion: number;
  models: MetaModel[];
};

const initialState: ModelState = {
  schemaVersion: SCHEMA_VERSION,
  models: seedMetaModels,
};

export function MetaModelPage() {
  const [state, update, meta] = useGovernanceState<ModelState>(
    "data-agent.data-governance.metadata-model",
    initialState,
  );

  // 当前选中的元模型 ID（用于属性/关系/采集规则的上下文）
  const [activeModelId, setActiveModelId] = useState<string>(state.models[0]?.id ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  // 新增属性抽屉
  const [attrEditorOpen, setAttrEditorOpen] = useState(false);
  const [newAttr, setNewAttr] = useState<{
    name: string;
    group: AttributeGroup;
    required: boolean;
    collected: boolean;
    valueConstraint: string;
  }>({ name: "", group: "业务属性", required: false, collected: false, valueConstraint: "" });

  const activeModel = state.models.find((m) => m.id === activeModelId) ?? state.models[0] ?? null;

  // 类型覆盖率：已配置元模型的对象类型 / 全部对象类型
  const typeCoverage = useMemo(() => {
    if (!state.models.length) return 0;
    const configured = new Set(state.models.map((m) => m.objectType));
    return Math.round((configured.size / OBJECT_TYPES.length) * 100);
  }, [state.models]);

  // 全部元模型的属性约束完整度（required + collected + valueConstraint 三者齐全）
  const constraintCompleteness = useMemo(() => {
    const all = state.models.flatMap((m) => m.attributes);
    if (!all.length) return 0;
    const complete = all.filter(
      (a) => a.required !== undefined && a.collected !== undefined,
    ).length;
    return Math.round((complete / all.length) * 100);
  }, [state.models]);

  // 关系类型合法性（源/目标类型 + 方向齐全）
  const relationValidity = useMemo(() => {
    const all = state.models.flatMap((m) => m.relations);
    if (!all.length) return 100;
    const valid = all.filter((r) => r.sourceType && r.targetType && r.direction).length;
    return Math.round((valid / all.length) * 100);
  }, [state.models]);

  // 采集任务运行状态统计
  const collectionStats = useMemo(() => {
    const all = state.models.flatMap((m) => m.collectionRules);
    return {
      total: all.length,
      success: all.filter((r) => r.taskStatus === "成功").length,
      running: all.filter((r) => r.taskStatus === "运行中").length,
      failed: all.filter((r) => r.taskStatus === "失败").length,
      paused: all.filter((r) => r.taskStatus === "暂停").length,
    };
  }, [state.models]);

  function publishModel(id: string) {
    update((cur) => ({
      ...cur,
      models: cur.models.map((m) =>
        m.id === id
          ? {
              ...m,
              status: "已发布" as GovernanceStatus,
              version: nextVersion(m.version),
              updatedAt: formatNow(),
            }
          : m,
      ),
    }));
    const m = state.models.find((mm) => mm.id === id);
    setNotice(`元模型「${m?.displayName}」已发布为 ${nextVersion(m?.version ?? "v0")}`);
  }

  function toggleAttributeRequired(modelId: string, attrId: string) {
    update((cur) => ({
      ...cur,
      models: cur.models.map((m) =>
        m.id === modelId
          ? {
              ...m,
              updatedAt: formatNow(),
              attributes: m.attributes.map((a) =>
                a.id === attrId ? { ...a, required: !a.required } : a,
              ),
            }
          : m,
      ),
    }));
  }

  function toggleAttributeCollected(modelId: string, attrId: string) {
    update((cur) => ({
      ...cur,
      models: cur.models.map((m) =>
        m.id === modelId
          ? {
              ...m,
              updatedAt: formatNow(),
              attributes: m.attributes.map((a) =>
                a.id === attrId ? { ...a, collected: !a.collected } : a,
              ),
            }
          : m,
      ),
    }));
  }

  function addAttribute() {
    if (!activeModel || !newAttr.name.trim()) {
      setNotice("属性名称不能为空");
      return;
    }
    const attr: MetaModelAttribute = {
      id: makeId("ATTR"),
      name: newAttr.name.trim(),
      group: newAttr.group,
      required: newAttr.required,
      collected: newAttr.collected,
      valueConstraint: newAttr.valueConstraint.trim() || undefined,
    };
    update((cur) => ({
      ...cur,
      models: cur.models.map((m) =>
        m.id === activeModel.id
          ? { ...m, attributes: [...m.attributes, attr], updatedAt: formatNow() }
          : m,
      ),
    }));
    setNewAttr({
      name: "",
      group: "业务属性",
      required: false,
      collected: false,
      valueConstraint: "",
    });
    setAttrEditorOpen(false);
    setNotice(`属性「${attr.name}」已添加到 ${activeModel.displayName}`);
  }

  function retryCollection(modelId: string, ruleId: string) {
    update((cur) => ({
      ...cur,
      models: cur.models.map((m) =>
        m.id === modelId
          ? {
              ...m,
              collectionRules: m.collectionRules.map((r) =>
                r.id === ruleId
                  ? { ...r, taskStatus: "运行中" as const, lastCollectedAt: formatNow() }
                  : r,
              ),
            }
          : m,
      ),
    }));
    window.setTimeout(() => {
      update((cur) => ({
        ...cur,
        models: cur.models.map((m) =>
          m.id === modelId
            ? {
                ...m,
                collectionRules: m.collectionRules.map((r) =>
                  r.id === ruleId
                    ? { ...r, taskStatus: "成功" as const, lastCollectedAt: formatNow() }
                    : r,
                ),
              }
            : m,
        ),
      }));
    }, 700);
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Governance / Metadata Model"
        title="元模型配置"
        description="四象限配置工作台：以对象类型、属性集、关系类型和采集规则四个独立象限组织元数据管理规范，每个象限是独立配置面板，不是 CRUD 列表。"
        actions={
          activeModel && (
            <ActionButton
              primary
              icon={RefreshCw}
              onClick={() => publishModel(activeModel.id)}
              disabled={activeModel.status === "已发布"}
            >
              发布元模型 {activeModel.version}
            </ActionButton>
          )
        }
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      {notice && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
          {notice}
        </div>
      )}

      {/* 顶部四象限配置摘要 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuadrantStat
          icon={Boxes}
          label="类型覆盖率"
          value={`${typeCoverage}%`}
          hint={`${state.models.length}/${OBJECT_TYPES.length} 个对象类型已配置`}
          tone={typeCoverage >= 80 ? "green" : "amber"}
        />
        <QuadrantStat
          icon={ToggleLeft}
          label="属性约束完整度"
          value={`${constraintCompleteness}%`}
          hint="required / collected 配置齐全"
          tone={constraintCompleteness >= 90 ? "green" : "amber"}
        />
        <QuadrantStat
          icon={GitBranch}
          label="关系类型合法性"
          value={`${relationValidity}%`}
          hint="源/目标/方向齐全"
          tone={relationValidity >= 95 ? "green" : "amber"}
        />
        <QuadrantStat
          icon={Workflow}
          label="采集任务状态"
          value={`${collectionStats.success}/${collectionStats.total}`}
          hint={`运行 ${collectionStats.running} · 失败 ${collectionStats.failed} · 暂停 ${collectionStats.paused}`}
          tone={collectionStats.failed > 0 ? "red" : "green"}
        />
      </div>

      {/* 四象限配置工作台 */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* 象限 1：对象类型定义 */}
        <Panel
          title="象限 1 · 对象类型定义"
          description="选择元模型对象类型，作为属性/关系/采集的上下文"
          actions={
            <Pill tone="blue" size="sm">
              {state.models.length} 个元模型
            </Pill>
          }
        >
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OBJECT_TYPES.map((ot) => {
                const model = state.models.find((m) => m.objectType === ot.type);
                const Icon = ot.icon;
                const isActive = activeModel?.objectType === ot.type;
                return (
                  <button
                    key={ot.type}
                    type="button"
                    onClick={() => model && setActiveModelId(model.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition",
                      isActive
                        ? "border-blue-300 bg-blue-50/70"
                        : model
                          ? "border-border bg-card hover:border-primary/40"
                          : "border-dashed border-border bg-muted/20 opacity-60",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-4 w-4 text-primary" />
                      {model ? (
                        <Pill tone={statusTone(model.status)} size="sm">
                          {model.status}
                        </Pill>
                      ) : (
                        <Pill tone="slate" size="sm">未配置</Pill>
                      )}
                    </div>
                    <div className="mt-2 text-[11px] font-semibold text-foreground">
                      {ot.type}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {model ? `${model.version} · ${model.attributes.length} 属性` : "待定义"}
                    </div>
                  </button>
                );
              })}
            </div>

            {activeModel && (
              <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-foreground">
                      当前元模型
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {activeModel.displayName} · {activeModel.id} · {activeModel.version}
                    </div>
                  </div>
                  <Pill tone={statusTone(activeModel.status)} size="sm">
                    {activeModel.status}
                  </Pill>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  更新时间：{activeModel.updatedAt}
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* 象限 2：属性集定义（按技术/业务/管理分组） */}
        <Panel
          title="象限 2 · 属性集定义"
          description="按技术/业务/管理分组，标注必填/采集/值域作为质量依据"
          actions={
            activeModel && (
              <ActionButton size="sm" icon={Plus} onClick={() => setAttrEditorOpen(true)}>
                新增属性
              </ActionButton>
            )
          }
        >
          <div className="max-h-[480px] overflow-y-auto p-4">
            {!activeModel && (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-[11px] text-muted-foreground">
                请先在象限 1 选择对象类型
              </div>
            )}
            {activeModel && (
              <div className="space-y-4">
                {(["技术属性", "业务属性", "管理属性"] as AttributeGroup[]).map((group) => {
                  const attrs = activeModel.attributes.filter((a) => a.group === group);
                  if (!attrs.length) return null;
                  return (
                    <div key={group}>
                      <div className="mb-2 flex items-center gap-2">
                        <Pill tone={GROUP_TONE[group]} size="sm">{group}</Pill>
                        <span className="text-[9px] text-muted-foreground">
                          {attrs.length} 项 · 必填 {attrs.filter((a) => a.required).length} ·
                          采集 {attrs.filter((a) => a.collected).length} ·
                          值域 {attrs.filter((a) => a.valueConstraint).length}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {attrs.map((attr) => (
                          <div
                            key={attr.id}
                            className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium text-foreground">
                                  {attr.name}
                                </span>
                                <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
                                  {attr.id}
                                </code>
                              </div>
                              {attr.valueConstraint && (
                                <div className="mt-0.5 text-[9px] text-muted-foreground">
                                  值域约束：{attr.valueConstraint}
                                </div>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleAttributeRequired(activeModel.id, attr.id)}
                                title="切换必填"
                              >
                                {attr.required ? (
                                  <ToggleRight className="h-4 w-4 text-red-500" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleAttributeCollected(activeModel.id, attr.id)}
                                title="切换采集"
                              >
                                {attr.collected ? (
                                  <ToggleRight className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        {/* 象限 3：关系类型定义（源/目标类型/方向/影响权重） */}
        <Panel
          title="象限 3 · 关系类型定义"
          description="源/目标类型 / 方向 / 影响权重，决定血缘渲染"
          actions={
            <Pill tone="violet" size="sm">
              {state.models.reduce((sum, m) => sum + m.relations.length, 0)} 个关系
            </Pill>
          }
        >
          <div className="max-h-[480px] overflow-y-auto p-4">
            {state.models.flatMap((m) => m.relations).length === 0 && (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-[11px] text-muted-foreground">
                暂未定义关系类型
              </div>
            )}
            <div className="space-y-2">
              {state.models.flatMap((m) =>
                m.relations.map((r) => ({ relation: r, model: m })),
              ).map(({ relation, model }) => (
                <div
                  key={relation.id}
                  className={cn(
                    "rounded-md border bg-card p-3",
                    activeModel?.id === model.id
                      ? "border-blue-200 bg-blue-50/40"
                      : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-foreground">
                          {relation.name}
                        </span>
                        <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
                          {relation.id}
                        </code>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>{relation.sourceType}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{relation.targetType}</span>
                        <span>·</span>
                        <span>{relation.direction}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {relation.inLineage && (
                        <Pill tone="blue" size="sm">入血缘</Pill>
                      )}
                      <Pill tone="violet" size="sm">
                        权重 {relation.impactWeight.toFixed(1)}
                      </Pill>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>所属元模型：{model.displayName}</span>
                    <span>{model.version}</span>
                  </div>
                  {/* 影响权重进度条 */}
                  <div className="mt-2">
                    <ProgressBar
                      value={relation.impactWeight * 100}
                      tone={relation.impactWeight >= 0.9 ? "red" : "blue"}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* 象限 4：采集规则配置（来源/方式/频率/字段映射 + 采集任务状态） */}
        <Panel
          title="象限 4 · 采集规则配置"
          description="来源/方式/频率/字段映射 + 采集任务状态"
          actions={
            <Pill tone="amber" size="sm">
              失败 {collectionStats.failed} · 暂停 {collectionStats.paused}
            </Pill>
          }
        >
          <div className="max-h-[480px] overflow-y-auto p-4">
            {state.models.flatMap((m) => m.collectionRules).length === 0 && (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-[11px] text-muted-foreground">
                暂未配置采集规则
              </div>
            )}
            <div className="space-y-2">
              {state.models.flatMap((m) =>
                m.collectionRules.map((r) => ({ rule: r, model: m })),
              ).map(({ rule, model }) => (
                <div
                  key={rule.id}
                  className={cn(
                    "rounded-md border bg-card p-3",
                    rule.taskStatus === "失败" || rule.taskStatus === "暂停"
                      ? "border-amber-200"
                      : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-foreground">
                        {rule.objectType}
                      </span>
                      <Pill tone={statusTone(rule.taskStatus)} size="sm">
                        {rule.taskStatus}
                      </Pill>
                      <Pill tone={rule.method === "自动" ? "blue" : "amber"} size="sm">
                        {rule.method}
                      </Pill>
                    </div>
                    <code className="font-mono text-[9px] text-muted-foreground">
                      {rule.id}
                    </code>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
                    <div>
                      <span className="text-muted-foreground">来源系统：</span>
                      <span className="font-medium text-foreground">{rule.sourceSystem}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">频率：</span>
                      <span className="font-medium text-foreground">{rule.frequency}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">字段映射：</span>
                      <code className="font-mono text-foreground">{rule.fieldMapping}</code>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">最近采集：</span>
                      <span className="text-foreground">{rule.lastCollectedAt}</span>
                    </div>
                  </div>
                  {(rule.taskStatus === "失败" || rule.taskStatus === "暂停") && (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[9px] text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        {rule.taskStatus === "失败"
                          ? "采集任务失败，需重试或检查字段映射"
                          : "采集任务已暂停，可手动恢复"}
                      </div>
                      <ActionButton
                        size="sm"
                        icon={RefreshCw}
                        onClick={() => retryCollection(model.id, rule.id)}
                      >
                        {rule.taskStatus === "失败" ? "重试" : "恢复"}
                      </ActionButton>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* 新增属性抽屉 */}
      {attrEditorOpen && activeModel && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/30"
          onClick={() => setAttrEditorOpen(false)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  New Attribute
                </div>
                <div className="text-[14px] font-semibold text-foreground">
                  新增属性 · {activeModel.displayName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttrEditorOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <Plus className="h-4 w-4 rotate-45" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-[10px] font-medium text-foreground">
                  属性名称
                </label>
                <input
                  value={newAttr.name}
                  onChange={(e) => setNewAttr({ ...newAttr, name: e.target.value })}
                  placeholder="如：业务定义"
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-[12px] outline-none focus:border-primary/60"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-foreground">
                  属性分组
                </label>
                <div className="flex gap-1.5">
                  {(["技术属性", "业务属性", "管理属性"] as AttributeGroup[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setNewAttr({ ...newAttr, group: g })}
                      className={cn(
                        "rounded-md px-2 py-1 text-[10px] transition",
                        newAttr.group === g
                          ? "bg-primary text-primary-foreground"
                          : "border border-input bg-card text-foreground hover:border-primary/40",
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <div className="text-[11px] font-medium text-foreground">必填</div>
                  <div className="text-[9px] text-muted-foreground">作为完整性评分依据</div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewAttr({ ...newAttr, required: !newAttr.required })}
                >
                  {newAttr.required ? (
                    <ToggleRight className="h-6 w-6 text-red-500" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <div className="text-[11px] font-medium text-foreground">采集</div>
                  <div className="text-[9px] text-muted-foreground">作为时效性评分依据</div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewAttr({ ...newAttr, collected: !newAttr.collected })}
                >
                  {newAttr.collected ? (
                    <ToggleRight className="h-6 w-6 text-blue-500" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-foreground">
                  值域约束（可选，作为准确性评分依据）
                </label>
                <input
                  value={newAttr.valueConstraint}
                  onChange={(e) => setNewAttr({ ...newAttr, valueConstraint: e.target.value })}
                  placeholder="如：符合数据类型字典"
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-[12px] outline-none focus:border-primary/60"
                />
              </div>
              <div className="flex justify-end gap-2">
                <ActionButton onClick={() => setAttrEditorOpen(false)}>取消</ActionButton>
                <ActionButton primary onClick={addAttribute}>
                  添加属性
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </WorkspacePage>
  );
}

// 象限配置摘要
function QuadrantStat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  hint?: string;
  tone: "green" | "amber" | "red" | "blue" | "violet";
}) {
  const toneMap: Record<string, string> = {
    green: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
    blue: "text-blue-600",
    violet: "text-violet-600",
  };
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", toneMap[tone])} />
      </div>
      <div className={cn("mt-1 text-[20px] font-semibold tabular-nums", toneMap[tone])}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
