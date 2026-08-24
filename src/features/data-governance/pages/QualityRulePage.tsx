// 质量规则库与剖析：规则库 CRUD + 启停 + 剖析快照 + 检查执行批次。
// 由原 /quality 规则 CRUD 升级，规则失败生成质量问题跳转 /quality/issues。
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Calendar, ChevronRight, FileSearch, Play, Plus,
  Power, Sparkles,
} from "lucide-react";

import {
  ActionButton, InlineNotice, PageTitle, Panel, Pill, ProgressBar,
  WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import {
  SCHEMA_VERSION, seedQualityExecutionBatches, seedQualityProfilings,
  seedQualityRules,
} from "../fixtures";
import { useGovernanceState, formatNow, makeId } from "../state";
import type {
  QualityDimension, QualityExecutionBatch, QualityProfiling, QualityRule,
} from "../types";

const DIMENSIONS: QualityDimension[] = ["完整性", "准确性", "及时性", "一致性", "唯一性"];
const RULE_STATUSES = ["启用", "停用", "执行中", "通过", "失败"] as const;

type RuleState = {
  schemaVersion: number;
  rules: QualityRule[];
  profilings: QualityProfiling[];
  batches: QualityExecutionBatch[];
};

const initialState: RuleState = {
  schemaVersion: SCHEMA_VERSION,
  rules: seedQualityRules,
  profilings: seedQualityProfilings,
  batches: seedQualityExecutionBatches,
};

export function QualityRulePage() {
  const [state, setState, meta] = useGovernanceState<RuleState>(
    "data-agent.data-governance.quality.rules",
    initialState,
  );
  const navigate = useNavigate();
  const [filterDimension, setFilterDimension] = useState<string>("全部");
  const [filterStatus, setFilterStatus] = useState<string>("全部");

  const { rules, profilings, batches } = state;

  const filteredRules = useMemo(() => {
    return rules.filter(
      (r) =>
        (filterDimension === "全部" || r.dimension === filterDimension) &&
        (filterStatus === "全部" || r.status === filterStatus),
    );
  }, [rules, filterDimension, filterStatus]);

  const enabledRules = rules.filter((r) => r.status !== "停用").length;
  const failedRules = rules.filter((r) => r.status === "失败").length;
  const profiledObjects = new Set(profilings.map((p) => p.objectId)).size;

  function toggleRule(id: string) {
    // 启停规则
    setState((current) => ({
      ...current,
      rules: current.rules.map((r) =>
        r.id === id
          ? { ...r, status: r.status === "停用" ? "启用" : "停用", updatedAt: formatNow() }
          : r,
      ),
    }));
  }

  function runRule(id: string) {
    // 模拟单规则执行
    setState((current) => ({
      ...current,
      rules: current.rules.map((r) =>
        r.id === id ? { ...r, status: "执行中", updatedAt: "刚刚" } : r,
      ),
    }));
    window.setTimeout(() => {
      setState((current) => ({
        ...current,
        rules: current.rules.map((r) =>
          r.id === id ? { ...r, status: "通过", score: "99.5", updatedAt: "刚刚" } : r,
        ),
      }));
    }, 800);
  }

  function addRule() {
    // 新建规则（mock，初始停用状态）
    const newRule: QualityRule = {
      id: makeId("quality"),
      name: `新质量规则 ${rules.length + 1}`,
      dimension: "完整性",
      target: "待选择数据对象",
      threshold: "≥ 99%",
      score: "—",
      owner: "待指定",
      status: "停用",
      updatedAt: formatNow(),
    };
    setState((current) => ({ ...current, rules: [newRule, ...current.rules] }));
  }

  function runBatch() {
    // 触发批次执行：新建运行中批次，模拟 1s 后完成
    setState((current) => ({
      ...current,
      batches: [
        {
          id: `QEB-${Date.now()}`,
          scope: "全量规则",
          executedAt: formatNow(),
          totalRules: rules.length,
          passed: 0,
          failed: 0,
          status: "运行中",
        },
        ...current.batches,
      ],
    }));
    window.setTimeout(() => {
      setState((current) => ({
        ...current,
        batches: current.batches.map((b, i) =>
          i === 0
            ? {
                ...b,
                status: "已完成",
                passed: Math.floor(rules.length * 0.7),
                failed: Math.ceil(rules.length * 0.2),
              }
            : b,
        ),
      }));
    }, 1000);
  }

  function goToIssues() {
    // 规则失败已生成质量问题，跳转问题工作台
    navigate("/data-governance/quality/issues");
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Governance / Quality Rules"
        title="质量规则库与剖析"
        description="管理质量规则库、剖析数据分布并执行质量检查批次；规则失败自动生成质量问题跳转问题工作台。"
        actions={
          <>
            <ActionButton icon={Play} onClick={runBatch}>触发批次执行</ActionButton>
            <ActionButton primary icon={Plus} onClick={addRule}>新建规则</ActionButton>
          </>
        }
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* 规则库列表 */}
        <Panel
          title="质量规则库"
          description={`共 ${rules.length} 条（${enabledRules} 启用 / ${failedRules} 失败 / ${rules.length - enabledRules} 停用）`}
          actions={
            <div className="flex items-center gap-2">
              <select
                value={filterDimension}
                onChange={(e) => setFilterDimension(e.target.value)}
                className="h-7 rounded-md border border-input bg-card px-2 text-[10px] text-foreground outline-none focus:border-primary"
              >
                <option value="全部">全部维度</option>
                {DIMENSIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-7 rounded-md border border-input bg-card px-2 text-[10px] text-foreground outline-none focus:border-primary"
              >
                <option value="全部">全部状态</option>
                {RULE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 text-left">规则</th>
                  <th className="px-3 py-2 text-left">维度 / 目标</th>
                  <th className="px-3 py-2 text-left">阈值</th>
                  <th className="px-3 py-2 text-left">评分</th>
                  <th className="px-3 py-2 text-left">负责人</th>
                  <th className="px-3 py-2 text-left">状态</th>
                  <th className="px-3 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((r) => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-foreground">{r.name}</div>
                      <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">{r.id}</div>
                      {r.requirementId && (
                        <div className="mt-0.5 text-[9px] text-blue-600">↳ 需求 {r.requirementId}</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone="blue" size="sm">{r.dimension}</Pill>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">{r.target}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[10px] text-foreground">{r.threshold}</td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        "text-[15px] font-semibold tabular-nums",
                        Number(r.score) >= 99 ? "text-emerald-600" : Number(r.score) >= 95 ? "text-amber-600" : "text-red-600",
                      )}>{r.score}</span>
                    </td>
                    <td className="px-3 py-3 text-[10px] text-foreground">{r.owner}</td>
                    <td className="px-3 py-3">
                      <Pill tone={statusTone(r.status)} size="sm">{r.status}</Pill>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton
                          size="sm"
                          icon={Power}
                          onClick={() => toggleRule(r.id)}
                          disabled={r.status === "执行中"}
                        >
                          {r.status === "停用" ? "启用" : "停用"}
                        </ActionButton>
                        <ActionButton
                          size="sm"
                          icon={Play}
                          onClick={() => runRule(r.id)}
                          disabled={r.status === "执行中" || r.status === "停用"}
                        >
                          执行
                        </ActionButton>
                        {r.status === "失败" && (
                          <ActionButton size="sm" primary icon={ChevronRight} onClick={goToIssues}>
                            问题
                          </ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRules.length === 0 && (
              <div className="p-6 text-center text-[11px] text-muted-foreground">无符合筛选条件的规则</div>
            )}
          </div>
        </Panel>

        {/* 质量剖析快照 */}
        <Panel
          title="质量剖析快照"
          description={`已剖析 ${profiledObjects} 个对象`}
          actions={<Pill tone="violet"><Sparkles className="mr-1 inline h-3 w-3" />剖析</Pill>}
        >
          <div className="space-y-3 p-4">
            {profilings.map((p) => {
              const nullRate = (p.nullCount / p.totalRecords) * 100;
              const distinctRate = (p.distinctCount / p.totalRecords) * 100;
              return (
                <div key={p.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-[10px] text-muted-foreground">{p.id}</div>
                    <Pill tone="blue" size="sm">{p.dimension}</Pill>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-muted/30 p-2">
                      <div className="text-[9px] uppercase text-muted-foreground">总记录</div>
                      <div className="text-[13px] font-semibold tabular-nums text-foreground">{(p.totalRecords / 10000).toFixed(1)}万</div>
                    </div>
                    <div className="rounded-md bg-muted/30 p-2">
                      <div className="text-[9px] uppercase text-muted-foreground">空值率</div>
                      <div className={cn("text-[13px] font-semibold tabular-nums", nullRate > 1 ? "text-red-600" : "text-emerald-600")}>{nullRate.toFixed(2)}%</div>
                    </div>
                    <div className="rounded-md bg-muted/30 p-2">
                      <div className="text-[9px] uppercase text-muted-foreground">去重率</div>
                      <div className="text-[13px] font-semibold tabular-nums text-foreground">{distinctRate.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] leading-5 text-muted-foreground">{p.distribution}</div>
                  <div className="mt-1 flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>快照 {p.snapshotAt}</span>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-3 text-[10px] leading-5 text-muted-foreground">
              <FileSearch className="h-3 w-3" />
              <span>剖析快照由调度任务生成，覆盖字段分布、空值率与去重统计。</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* 检查执行批次 */}
      <Panel
        title="检查执行批次"
        description="按时间倒序展示批次执行结果"
        actions={<ActionButton size="sm" icon={Play} onClick={runBatch}>新建批次</ActionButton>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 text-left">批次 ID</th>
                <th className="px-3 py-2 text-left">范围</th>
                <th className="px-3 py-2 text-left">执行时间</th>
                <th className="px-3 py-2 text-left">规则数</th>
                <th className="px-3 py-2 text-left">通过/失败</th>
                <th className="px-3 py-2 text-left">通过率</th>
                <th className="px-3 py-2 text-left">状态</th>
              </tr>
            </thead>
            <tbody>
              {[...batches]
                .sort((a, b) => b.executedAt.localeCompare(a.executedAt))
                .map((b) => {
                  const total = b.totalRules;
                  const passRate = total ? (b.passed / total) * 100 : 0;
                  return (
                    <tr key={b.id} className="border-b border-border hover:bg-muted/20">
                      <td className="px-3 py-3 font-mono text-[10px] text-foreground">{b.id}</td>
                      <td className="px-3 py-3 text-[10px] text-foreground">{b.scope}</td>
                      <td className="px-3 py-3 font-mono text-[10px] text-muted-foreground">{b.executedAt}</td>
                      <td className="px-3 py-3 text-center tabular-nums text-foreground">{total}</td>
                      <td className="px-3 py-3">
                        <span className="text-emerald-600 tabular-nums">{b.passed}</span>
                        <span className="mx-1 text-muted-foreground">/</span>
                        <span className="text-red-600 tabular-nums">{b.failed}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={passRate} tone={passRate >= 90 ? "green" : passRate >= 70 ? "amber" : "red"} className="w-24" />
                          <span className="text-[10px] tabular-nums text-muted-foreground">{passRate.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3"><Pill tone={statusTone(b.status)} size="sm">{b.status}</Pill></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {failedRules > 0 && (
          <div className="flex items-center gap-2 border-t border-border bg-amber-50/40 p-3 text-[10px] leading-5 text-amber-800">
            <AlertTriangle className="h-3 w-3" />
            <span>{failedRules} 条规则最近执行失败，已自动生成质量问题，可在问题工作台继续闭环。</span>
          </div>
        )}
      </Panel>
    </WorkspacePage>
  );
}
