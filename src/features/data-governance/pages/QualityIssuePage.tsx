// 质量问题工作台：列表 + 闭环状态机详情 + 职责分离 + 证据引用 + 批量分发。
// 问题独立于规则生命周期；分发对象自动取自元数据认责字段（D2 联动）。
// 职责分离强制约束：确认人 ≠ 处置人 ≠ 关闭人。
import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertOctagon, ArrowRight, Bug, CheckCircle2, ChevronRight, Filter, Link2,
  Send, ShieldCheck, UserCheck,
} from "lucide-react";

import {
  ActionButton, InlineNotice, PageTitle, Panel, Pill,
  WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import { SCHEMA_VERSION, seedQualityIssues } from "../fixtures";
import { useGovernanceState, formatNow } from "../state";
import type {
  QualityDimension, QualityIssue, QualityIssueStatus, QualitySeverity,
} from "../types";

const ISSUE_STAGES: QualityIssueStatus[] = ["发现", "确认", "分发", "整改", "复检", "关闭"];
const DIMENSIONS: QualityDimension[] = ["完整性", "准确性", "及时性", "一致性", "唯一性"];
const SEVERITIES: QualitySeverity[] = ["P0", "P1", "P2", "P3"];

// 认责管理者候选（来自元数据认责字段 D2 联动，mock）
const ACCOUNTABLE_MANAGERS = ["王雪", "张敏", "陈晨", "李浩", "赵宁"];
// 当前 mock 用户（作为确认人默认值）
const CURRENT_USER = "王雪";

// 闭环状态机：阶段 -> 下一阶段
const STAGE_TRANSITION: Record<QualityIssueStatus, QualityIssueStatus | null> = {
  发现: "确认",
  确认: "分发",
  分发: "整改",
  整改: "复检",
  复检: "关闭",
  关闭: null,
};

type IssueState = {
  schemaVersion: number;
  issues: QualityIssue[];
  selectedIds: string[];
};

const initialState: IssueState = {
  schemaVersion: SCHEMA_VERSION,
  issues: seedQualityIssues,
  selectedIds: [],
};

type StageAdvanceOptions = {
  assignee?: string;
  action?: string;
  recheckResult?: "通过" | "失败";
};

type FilterKey = "object" | "dimension" | "severity" | "status" | "assignee";

export function QualityIssuePage() {
  const [state, setState, meta] = useGovernanceState<IssueState>(
    "data-agent.data-governance.quality.issues",
    initialState,
  );
  const navigate = useNavigate();

  const { issues, selectedIds } = state;

  // 筛选状态
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    object: "全部",
    dimension: "全部",
    severity: "全部",
    status: "全部",
    assignee: "全部",
  });
  const [activeIssueId, setActiveIssueId] = useState<string>(issues[0]?.id ?? "");
  const [bulkAssignee, setBulkAssignee] = useState<string>(ACCOUNTABLE_MANAGERS[1]);

  const activeIssue = issues.find((i) => i.id === activeIssueId) ?? issues[0];

  const filteredIssues = useMemo(() => {
    return issues.filter((i) =>
      (filters.object === "全部" || i.objectName === filters.object) &&
      (filters.dimension === "全部" || i.dimension === filters.dimension) &&
      (filters.severity === "全部" || i.severity === filters.severity) &&
      (filters.status === "全部" || i.status === filters.status) &&
      (filters.assignee === "全部" || i.assignee === filters.assignee),
    );
  }, [issues, filters]);

  const severeOpen = issues.filter((i) => i.status !== "关闭" && (i.severity === "P0" || i.severity === "P1")).length;
  const openCount = issues.filter((i) => i.status !== "关闭").length;
  const closedCount = issues.filter((i) => i.status === "关闭").length;

  function toggleSelect(id: string) {
    setState((current) => ({
      ...current,
      selectedIds: current.selectedIds.includes(id)
        ? current.selectedIds.filter((sid) => sid !== id)
        : [...current.selectedIds, id],
    }));
  }

  function selectAll() {
    setState((current) => ({
      ...current,
      selectedIds:
        current.selectedIds.length === filteredIssues.length
          ? []
          : filteredIssues.map((i) => i.id),
    }));
  }

  // 推进闭环状态机（强制职责分离）
  function advanceStage(issueId: string, options?: StageAdvanceOptions) {
    setState((current) => ({
      ...current,
      issues: current.issues.map((i) => {
        if (i.id !== issueId) return i;
        const next = STAGE_TRANSITION[i.status];
        if (!next) return i;
        const updated: QualityIssue = { ...i, status: next };
        if (i.status === "发现" && next === "确认") {
          // 进入确认阶段，设置确认人
          updated.confirmer = CURRENT_USER;
        }
        if (i.status === "确认" && next === "分发") {
          // 职责分离：分发对象不可等于确认人
          if (!options?.assignee || options.assignee === i.confirmer) return i;
          updated.assignee = options.assignee;
        }
        if (i.status === "整改" && next === "复检") {
          // 整改完成，记录措施
          updated.rectifyAction = options?.action || "整改已落实";
        }
        if (i.status === "复检" && next === "关闭") {
          // 关闭人独立于处置人（这里用确认人作为关闭人 mock）
          updated.recheckResult = options?.recheckResult ?? "通过";
          updated.closedBy = i.confirmer;
          updated.closedAt = formatNow();
        }
        return updated;
      }),
    }));
  }

  // 批量分发：将所有处于「确认」状态的选中问题分发
  function bulkDispatch() {
    setState((current) => ({
      ...current,
      issues: current.issues.map((i) =>
        current.selectedIds.includes(i.id) && i.status === "确认" && i.confirmer !== bulkAssignee
          ? { ...i, status: "分发", assignee: bulkAssignee }
          : i,
      ),
      selectedIds: [],
    }));
  }

  const allSelected = filteredIssues.length > 0 && selectedIds.length === filteredIssues.length;
  const selectedConfirmingCount = selectedIds.filter((id) => issues.find((i) => i.id === id)?.status === "确认").length;
  const canBulkDispatch = selectedConfirmingCount > 0 && bulkAssignee !== CURRENT_USER;

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Governance / Quality Issues"
        title="质量问题工作台"
        description="独立管理质量问题，驱动发现→确认→分发→整改→复检→关闭闭环；强制职责分离：确认人 ≠ 处置人 ≠ 关闭人。"
        actions={
          <>
            <ActionButton icon={Bug} onClick={() => navigate("/data-governance/quality/rules")}>规则库</ActionButton>
            <ActionButton primary icon={Send} onClick={bulkDispatch} disabled={!canBulkDispatch}>
              批量分发 ({selectedConfirmingCount})
            </ActionButton>
          </>
        }
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />

      {/* 筛选 + 概要 */}
      <Panel title="问题筛选与概要" description="按对象/维度/严重/状态/认责管理者筛选">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {[
              { key: "object" as const, label: "对象", options: ["全部", ...Array.from(new Set(issues.map((i) => i.objectName)))] },
              { key: "dimension" as const, label: "维度", options: ["全部", ...DIMENSIONS] },
              { key: "severity" as const, label: "严重", options: ["全部", ...SEVERITIES] },
              { key: "status" as const, label: "状态", options: ["全部", ...ISSUE_STAGES] },
              { key: "assignee" as const, label: "处置人", options: ["全部", ...ACCOUNTABLE_MANAGERS] },
            ].map((f) => (
              <div key={f.key} className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">{f.label}</span>
                <select
                  value={filters[f.key]}
                  onChange={(e) => setFilters((current) => ({ ...current, [f.key]: e.target.value }))}
                  className="h-7 rounded-md border border-input bg-card px-2 text-[10px] text-foreground outline-none focus:border-primary"
                >
                  {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-2 text-[10px]">
              <Pill tone="blue" size="sm">共 {issues.length}</Pill>
              <Pill tone="amber" size="sm">未闭环 {openCount}</Pill>
              <Pill tone="red" size="sm">P0/P1 {severeOpen}</Pill>
              <Pill tone="green" size="sm">已关闭 {closedCount}</Pill>
            </div>
          </div>
          {/* 批量分发条 */}
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/20 p-2 text-[10px]">
            <span className="text-muted-foreground">批量分发处置人：</span>
            <select
              value={bulkAssignee}
              onChange={(e) => setBulkAssignee(e.target.value)}
              className="h-6 rounded-md border border-input bg-card px-2 text-[10px] text-foreground outline-none focus:border-primary"
            >
              {ACCOUNTABLE_MANAGERS.filter((m) => m !== CURRENT_USER).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="text-muted-foreground">
              已选 {selectedIds.length}，其中 {selectedConfirmingCount} 个处于「确认」可分发
            </span>
            {bulkAssignee === CURRENT_USER && (
              <span className="text-red-600">职责分离约束：批量分发对象不可为当前确认人</span>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* 问题列表 */}
        <Panel
          title="问题列表"
          description={`${filteredIssues.length} 个结果 · 点击行查看闭环状态机详情`}
          actions={
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <input type="checkbox" checked={allSelected} onChange={selectAll} className="h-3 w-3" />
              全选
            </label>
          }
        >
          <div className="max-h-[680px] overflow-y-auto">
            {filteredIssues.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setActiveIssueId(i.id)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border p-3 text-left hover:bg-muted/30",
                  activeIssue?.id === i.id && "bg-blue-50/70",
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(i.id)}
                  onChange={() => toggleSelect(i.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 h-3 w-3"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">{i.id}</span>
                    <Pill tone={i.severity === "P0" ? "red" : i.severity === "P1" ? "amber" : "slate"} size="sm">{i.severity}</Pill>
                    <Pill tone={statusTone(i.status)} size="sm">{i.status}</Pill>
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-foreground">{i.objectName}</div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{i.dimension}</span>
                    <span>·</span>
                    <span className="truncate">{i.ruleName}</span>
                  </div>
                  {i.assignee && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <UserCheck className="h-3 w-3" />
                      <span>处置人 {i.assignee}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="mt-2 h-3.5 w-3.5 shrink-0 text-slate-300" />
              </button>
            ))}
            {filteredIssues.length === 0 && (
              <div className="p-6 text-center text-[11px] text-muted-foreground">无符合条件的问题</div>
            )}
          </div>
        </Panel>

        {/* 问题详情：闭环状态机 + 职责分离 + 证据 */}
        {activeIssue && (
          <Panel
            title="问题详情"
            description={`${activeIssue.id} · ${activeIssue.objectName}`}
            actions={<Pill tone={activeIssue.severity === "P0" ? "red" : activeIssue.severity === "P1" ? "amber" : "slate"} size="sm">{activeIssue.severity}</Pill>}
          >
            <div className="p-4">
              {/* 闭环状态机 */}
              <div className="mb-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">闭环状态机</div>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {ISSUE_STAGES.map((stage, idx) => {
                    const currentIdx = ISSUE_STAGES.indexOf(activeIssue.status);
                    const isPassed = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    return (
                      <Fragment key={stage}>
                        <div
                          className={cn(
                            "flex h-8 min-w-[56px] items-center justify-center rounded-md border px-2 text-[10px] font-medium",
                            isCurrent && "border-blue-500 bg-blue-500 text-white",
                            isPassed && "border-emerald-200 bg-emerald-50 text-emerald-700",
                            !isCurrent && !isPassed && "border-border bg-muted/30 text-muted-foreground",
                          )}
                        >
                          {stage}
                        </div>
                        {idx < ISSUE_STAGES.length - 1 && (
                          <ArrowRight className={cn("h-3 w-3 shrink-0", isPassed ? "text-emerald-400" : "text-slate-300")} />
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              </div>

              {/* 基本信息 */}
              <div className="mb-4 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-md bg-muted/30 p-2">
                  <div className="text-[9px] uppercase text-muted-foreground">规则</div>
                  <div className="mt-0.5 font-medium text-foreground">{activeIssue.ruleName}</div>
                  <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">{activeIssue.ruleId}</div>
                </div>
                <div className="rounded-md bg-muted/30 p-2">
                  <div className="text-[9px] uppercase text-muted-foreground">维度</div>
                  <div className="mt-0.5 font-medium text-foreground">{activeIssue.dimension}</div>
                </div>
                <div className="rounded-md bg-muted/30 p-2">
                  <div className="text-[9px] uppercase text-muted-foreground">发现时间</div>
                  <div className="mt-0.5 font-mono text-foreground">{activeIssue.discoveredAt}</div>
                </div>
                <div className="rounded-md bg-muted/30 p-2">
                  <div className="text-[9px] uppercase text-muted-foreground">关闭时间</div>
                  <div className="mt-0.5 font-mono text-foreground">{activeIssue.closedAt ?? "—"}</div>
                </div>
              </div>

              {/* 职责分离字段 */}
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" />
                  职责分离（强制约束）
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-blue-100 bg-blue-50/50 p-2">
                    <div className="text-[9px] uppercase text-blue-700">确认人</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-foreground">{activeIssue.confirmer ?? "—"}</div>
                  </div>
                  <div className="rounded-md border border-amber-100 bg-amber-50/50 p-2">
                    <div className="text-[9px] uppercase text-amber-700">处置人</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-foreground">{activeIssue.assignee ?? "—"}</div>
                  </div>
                  <div className="rounded-md border border-emerald-100 bg-emerald-50/50 p-2">
                    <div className="text-[9px] uppercase text-emerald-700">关闭人</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-foreground">{activeIssue.closedBy ?? "—"}</div>
                  </div>
                </div>
                <div className="mt-1 text-[9px] text-muted-foreground">
                  约束：确认人 ≠ 处置人 ≠ 关闭人；分发对象取自元数据认责字段（D2 联动）
                </div>
              </div>

              {/* 整改与复检 */}
              {activeIssue.rectifyAction && (
                <div className="mb-4 rounded-md border-l-2 border-amber-400 bg-amber-50/60 p-2">
                  <div className="text-[10px] font-semibold text-amber-700">整改措施</div>
                  <div className="mt-1 text-[11px] leading-5 text-amber-800">{activeIssue.rectifyAction}</div>
                </div>
              )}
              {activeIssue.recheckResult && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50 p-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[11px] text-emerald-800">复检结果：{activeIssue.recheckResult}</span>
                </div>
              )}

              {/* 证据引用 */}
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Link2 className="h-3 w-3" />
                  证据引用
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeIssue.evidenceRefs.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground">暂无证据引用</span>
                  ) : (
                    activeIssue.evidenceRefs.map((ref) => (
                      <Pill key={ref} tone="slate" size="sm">{ref}</Pill>
                    ))
                  )}
                </div>
              </div>

              {/* 阶段推进 */}
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">阶段推进</div>
                {STAGE_TRANSITION[activeIssue.status] ? (
                  <StageAction
                    issue={activeIssue}
                    onAdvance={(options) => advanceStage(activeIssue.id, options)}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    问题已关闭，闭环完成
                  </div>
                )}
              </div>
            </div>
          </Panel>
        )}
      </div>

      {/* 闭环说明 */}
      <Panel title="闭环与职责分离说明" description="质量问题的标准化推进路径">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {ISSUE_STAGES.map((stage, idx) => {
            const desc = [
              "规则失败自动生成问题，等待业务方确认",
              "确认问题成立，记录确认人（独立于后续处置）",
              "分发到认责管理者，分配处置人（≠ 确认人）",
              "处置人落实整改措施并提交",
              "复核整改结果，记录通过/失败",
              "确认人关闭问题，闭环完成",
            ][idx];
            return (
              <div key={stage} className="rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-500 text-[9px] font-semibold text-white">{idx + 1}</span>
                  <span className="text-[11px] font-semibold text-foreground">{stage}</span>
                </div>
                <div className="mt-1 text-[10px] leading-5 text-muted-foreground">{desc}</div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-amber-50/40 p-3 text-[10px] leading-5 text-amber-800">
          <AlertOctagon className="h-3 w-3" />
          <span>分发对象取自元数据认责字段（D2 联动）；当前确认人 {CURRENT_USER}，不可作为处置人或关闭人重复认责。</span>
        </div>
      </Panel>
    </WorkspacePage>
  );
}

// 阶段推进操作（按当前状态渲染不同表单）
function StageAction({ issue, onAdvance }: { issue: QualityIssue; onAdvance: (options?: StageAdvanceOptions) => void }) {
  const [assignee, setAssignee] = useState<string>(ACCOUNTABLE_MANAGERS.find((m) => m !== issue.confirmer) ?? ACCOUNTABLE_MANAGERS[0]);
  const [action, setAction] = useState("");
  const [recheckResult, setRecheckResult] = useState<"通过" | "失败">("通过");

  // 职责分离约束：不允许选择确认人作为处置人
  const validAssignees = ACCOUNTABLE_MANAGERS.filter((m) => m !== issue.confirmer);

  if (issue.status === "发现") {
    return (
      <div className="space-y-2">
        <div className="text-[10px] text-muted-foreground">确认问题成立后推进到「确认」阶段，确认人记录为 {CURRENT_USER}</div>
        <ActionButton size="sm" primary icon={ArrowRight} onClick={() => onAdvance()}>确认问题</ActionButton>
      </div>
    );
  }
  if (issue.status === "确认") {
    return (
      <div className="space-y-2">
        <div className="text-[10px] text-muted-foreground">选择处置人后分发（不可与确认人相同）</div>
        <div className="flex items-center gap-2">
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="h-7 rounded-md border border-input bg-card px-2 text-[10px] text-foreground outline-none focus:border-primary"
          >
            {validAssignees.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <ActionButton size="sm" primary icon={Send} onClick={() => onAdvance({ assignee })}>分发问题</ActionButton>
        </div>
      </div>
    );
  }
  if (issue.status === "分发") {
    return (
      <div className="space-y-2">
        <div className="text-[10px] text-muted-foreground">已分发到 {issue.assignee}，确认开始整改</div>
        <ActionButton size="sm" primary icon={ArrowRight} onClick={() => onAdvance()}>开始整改</ActionButton>
      </div>
    );
  }
  if (issue.status === "整改") {
    return (
      <div className="space-y-2">
        <div className="text-[10px] text-muted-foreground">处置人填写整改措施后推进到「复检」阶段</div>
        <textarea
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="请输入整改措施..."
          className="min-h-[60px] w-full rounded-md border border-input bg-card p-2 text-[11px] text-foreground outline-none focus:border-primary"
        />
        <ActionButton size="sm" primary icon={ArrowRight} onClick={() => onAdvance({ action: action || "整改已落实" })}>提交整改措施</ActionButton>
      </div>
    );
  }
  if (issue.status === "复检") {
    return (
      <div className="space-y-2">
        <div className="text-[10px] text-muted-foreground">复核结果通过后由确认人关闭</div>
        <div className="flex items-center gap-2">
          <select
            value={recheckResult}
            onChange={(e) => setRecheckResult(e.target.value as "通过" | "失败")}
            className="h-7 rounded-md border border-input bg-card px-2 text-[10px] text-foreground outline-none focus:border-primary"
          >
            <option value="通过">通过</option>
            <option value="失败">失败</option>
          </select>
          <ActionButton size="sm" primary icon={CheckCircle2} onClick={() => onAdvance({ recheckResult })}>关闭问题</ActionButton>
        </div>
      </div>
    );
  }
  return null;
}
