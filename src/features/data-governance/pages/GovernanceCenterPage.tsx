// 治理中心首页：治理大盘 + 个人工作台。
// 上半部跨域四象限概览（组织健康度 / 制度覆盖 / 文化成效 / 治理问题）
// + KPI 摘要条引用 metrics 域；下半部按治理角色等级聚焦日常治理待办。
// 数据操作通过 useGovernanceState 写入本地 SQLite，scope=data-agent.data-governance.center。
import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Brain, ClipboardCheck, FileText, Network,
  RefreshCw, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  ActionButton, InlineNotice, MiniStat, PageTitle, Panel, Pill, ProgressBar, WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import {
  SCHEMA_VERSION, seedAccountabilityOverviews, seedGovernanceOrgNodes,
  seedGovernanceOverview, seedGovernanceRegulations, seedGovernanceRoles,
  seedRegulationExecutionBatches,
} from "../fixtures";
import { useGovernanceState } from "../state";
import type { GovernanceOverview, GovernanceRoleLevel } from "../types";

// 个人工作台条目（本地状态对象，引用治理域种子数据构造，不复制种子实体）
interface ClaimTodo {
  id: string;
  target: string;
  department: string;
  owner: string;
  action: string;
  due: string;
  status: "待认领" | "进行中" | "已完成";
}
interface AiSuggestionItem {
  id: string;
  source: string;
  content: string;
  confidence: "高" | "中" | "低";
  status: "待确认" | "已采纳" | "已驳回";
}
interface PendingIssueItem {
  id: string;
  dimension: string;
  object: string;
  severity: "P0" | "P1" | "P2";
  status: string;
  due: string;
}
interface PendingReportItem {
  id: string;
  title: string;
  period: string;
  status: string;
  due: string;
}

interface CenterState {
  schemaVersion: number;
  overview: GovernanceOverview;
  selectedRoleLevel: GovernanceRoleLevel;
  workbench: {
    claimTodos: ClaimTodo[];
    aiSuggestions: AiSuggestionItem[];
    pendingIssues: PendingIssueItem[];
    pendingReports: PendingReportItem[];
  };
}

// 角色等级与工作台关注区域映射：决策层关注审阅与重大问题；管理层关注全部；执行层聚焦认领与处置
const ROLE_FOCUS: Record<GovernanceRoleLevel, Array<keyof CenterState["workbench"]>> = {
  决策: ["pendingIssues", "pendingReports"],
  管理: ["claimTodos", "aiSuggestions", "pendingIssues", "pendingReports"],
  执行: ["claimTodos", "aiSuggestions", "pendingIssues"],
};

const ROLE_TONE: Record<GovernanceRoleLevel, "violet" | "blue" | "green"> = {
  决策: "violet",
  管理: "blue",
  执行: "green",
};

// 初始工作台：基于治理域种子数据派生（不复制种子实体，仅作待办条目）
const initialCenterState: CenterState = {
  schemaVersion: SCHEMA_VERSION,
  overview: seedGovernanceOverview,
  selectedRoleLevel: "管理",
  workbench: {
    // 认领待办：覆盖率 < 80% 的业务部门待认领对象清单
    claimTodos: seedAccountabilityOverviews
      .filter((a) => a.coverage < 80)
      .map((a) => ({
        id: `GT-CLAIM-${a.id}`,
        target: `${a.department}未认责对象`,
        department: a.department,
        owner: "数据治理负责人",
        action: `分配 ${a.unassignedObjects} 个数据对象的认责人`,
        due: "2026-09-01",
        status: "待认领" as const,
      })),
    // 待确认 AI 建议：制度执行偏差/部分通过项由 AI 生成整改建议
    aiSuggestions: seedRegulationExecutionBatches
      .filter((b) => b.overallScore < 90)
      .flatMap((b) => b.results
        .filter((r) => r.result !== "通过")
        .map((r) => ({
          id: `GT-AI-${b.id}-${r.regulationId}`,
          source: `${b.regulationTitle} · ${r.result}`,
          content: r.remediation ?? r.deviation ?? "建议补充整改方案后重新执行",
          confidence: r.result === "偏差" ? "高" as const : "中" as const,
          status: "待确认" as const,
        }))),
    // 待复检问题：非已发布的制度与待整改的执行项
    pendingIssues: seedGovernanceRegulations
      .filter((r) => r.status !== "已发布")
      .map((r) => ({
        id: `GT-ISS-${r.id}`,
        dimension: "制度流程合规",
        object: `${r.title}（${r.tier}）`,
        severity: r.status === "草稿" ? "P2" as const : "P1" as const,
        status: r.status,
        due: "2026-08-30",
      })),
    // 待审阅报告：治理月报与制度审阅
    pendingReports: [
      { id: "GT-REP-REG-006", title: "质量问题闭环细则 v0.1 审阅", period: "2026-08", status: "待审核", due: "2026-08-20" },
      { id: "GT-REP-CULTURE", title: "2026 Q3 数据文化推广月报", period: "2026-Q3", status: "待审核", due: "2026-09-05" },
    ],
  },
};

type WorkbenchCategory = keyof CenterState["workbench"];

// 工作台条目联合类型，用于按类别统一渲染
type WorkbenchItem = ClaimTodo | AiSuggestionItem | PendingIssueItem | PendingReportItem;

const WORKBENCH_META: Record<WorkbenchCategory, { title: string; icon: LucideIcon; actionLabel: string }> = {
  claimTodos: { title: "认领待办", icon: ClipboardCheck, actionLabel: "推进" },
  aiSuggestions: { title: "待确认 AI 建议", icon: Brain, actionLabel: "确认" },
  pendingIssues: { title: "待复检问题", icon: AlertTriangle, actionLabel: "复检" },
  pendingReports: { title: "待审阅报告", icon: FileText, actionLabel: "审阅" },
};

// 工作台条目可推进的状态集合；其它状态按钮置灰
const ACTIVE_STATUSES = new Set(["待认领", "待确认", "待审核", "草稿", "整改", "发现", "确认", "分发"]);

export function GovernanceCenterPage() {
  const [state, setState, meta] = useGovernanceState<CenterState>(
    "data-agent.data-governance.center",
    initialCenterState,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const { overview, selectedRoleLevel, workbench } = state;
  const focus = ROLE_FOCUS[selectedRoleLevel];

  // 治理大盘四象限
  const quadrants = useMemo(() => ([
    {
      key: "organization",
      label: "组织健康度",
      value: overview.organizationHealth,
      icon: Network,
      tone: "blue" as const,
      hint: `${seedGovernanceRoles.length} 个治理岗位 · ${seedGovernanceOrgNodes.length} 个组织节点`,
      navTo: "/data-governance/center/organization",
    },
    {
      key: "regulation",
      label: "制度覆盖率",
      value: overview.regulationCoverage,
      icon: FileText,
      tone: "violet" as const,
      hint: `${seedGovernanceRegulations.length} 个制度 · 三层结构（政策/办法/细则）`,
      navTo: "/data-governance/center/regulation",
    },
    {
      key: "culture",
      label: "文化成效",
      value: overview.cultureEffectiveness,
      icon: Sparkles,
      tone: "green" as const,
      hint: "活动覆盖率、参与度与素养测评",
      navTo: "/data-governance/center/culture",
    },
    {
      key: "issues",
      label: "治理问题",
      value: overview.governanceIssues,
      icon: AlertTriangle,
      tone: "amber" as const,
      hint: `未闭环 ${overview.openIssues} · 逾期 ${overview.overdueRectifications}`,
      navTo: "/data-governance/quality",
    },
  ]), [overview]);

  // 推进工作台条目：按类别更新对应条目状态
  function advanceItem(category: WorkbenchCategory, id: string, next: string) {
    setState((cur) => {
      const list = cur.workbench[category];
      const updated = list.map((item) => item.id === id ? { ...item, status: next } : item);
      return { ...cur, workbench: { ...cur.workbench, [category]: updated } };
    });
    setNotice(`已推进「${WORKBENCH_META[category].title}」中条目 ${id} 至 ${next}。`);
  }

  function refreshWorkbench() {
    setNotice("已重新加载个人工作台；待办按当前治理域种子状态聚合。");
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Governance / Center"
        title="治理大盘与个人工作台"
        description="跨组织/制度/文化概览治理健康度，按角色等级聚焦日常治理待办；KPI 摘要引用 metrics 域，不重复计算。"
        actions={
          <>
            <ActionButton icon={RefreshCw} onClick={refreshWorkbench}>刷新待办</ActionButton>
            <ActionButton icon={Activity} primary onClick={() => setNotice("已生成治理简报快照（mock），引用 /metrics/governance 域 KPI。")}>生成治理简报</ActionButton>
          </>
        }
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      {notice && <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">{notice}</div>}

      {/* 上半部：治理大盘四象限概览 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-semibold text-foreground">治理大盘</h2>
            <p className="text-[11px] text-muted-foreground">组织 / 制度 / 文化 / 问题四象限就绪度概览，引用 metrics 域 KPI 不重复计算</p>
          </div>
          <Pill tone="slate" size="sm">DCMM L4 量化管理</Pill>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quadrants.map((q) => (
            <button
              key={q.key}
              type="button"
              onClick={() => setNotice(`跳转至 ${q.label} 详情工作台（${q.navTo}）。`)}
              className="group rounded-lg border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{q.label}</span>
                <q.icon className={cn("h-4 w-4", toneTextClass(q.tone))} />
              </div>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-[24px] font-semibold tabular-nums text-foreground">{q.value}</span>
                <span className="pb-1 text-[10px] text-muted-foreground">{q.key === "issues" ? "件" : "%"}</span>
              </div>
              <ProgressBar className="mt-2" value={q.key === "issues" ? Math.min(100, q.value * 25) : q.value} tone={q.tone === "violet" ? "violet" : q.tone === "amber" ? "amber" : q.tone === "green" ? "green" : "blue"} />
              <div className="mt-2 text-[10px] text-muted-foreground">{q.hint}</div>
              <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary opacity-0 group-hover:opacity-100">查看工作台 →</div>
            </button>
          ))}
        </div>
      </section>

      {/* KPI 摘要条 */}
      <div className="grid gap-3 md:grid-cols-3">
        <MiniStat icon={AlertTriangle} tone="amber" label="未闭环问题" value={overview.openIssues} hint="引用 /metrics/governance · 待分发或整改" />
        <MiniStat icon={Activity} tone="red" label="逾期整改" value={overview.overdueRectifications} hint="超过承诺整改期限" />
        <MiniStat icon={Brain} tone="violet" label="待确认 AI 建议" value={overview.pendingAiSuggestions} hint="跨治理域 AI 辅助 · 待人工确认回写" />
      </div>

      {/* 下半部：个人工作台 —— 唯一双区结构，按角色等级聚焦 */}
      <Panel
        title="个人工作台"
        description="按治理角色等级过滤日常待办；推进状态回写本地 state，不依赖外部审批服务"
        actions={
          <div className="flex items-center gap-1.5">
            {(Object.keys(ROLE_FOCUS) as GovernanceRoleLevel[]).map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => {
                  setState((cur) => ({ ...cur, selectedRoleLevel: lv }));
                  setNotice(`已切换为「${lv}」视角，工作台聚焦于该等级关注的事项。`);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[10px] font-medium transition",
                  selectedRoleLevel === lv
                    ? ROLE_TONE[lv] === "violet" ? "bg-violet-100 text-violet-700"
                      : ROLE_TONE[lv] === "green" ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700"
                    : "border border-input bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {lv}层
              </button>
            ))}
          </div>
        }
      >
        <div className="border-b border-border bg-muted/20 px-4 py-2 text-[10px] text-muted-foreground">
          当前视角：<span className="font-semibold text-foreground">{selectedRoleLevel}层</span> · 关注 {focus.map((k) => WORKBENCH_META[k].title).join(" / ")}
        </div>
        <div className="grid gap-3 p-3 lg:grid-cols-2 xl:grid-cols-4">
          {focus.map((category) => (
            <WorkbenchColumn
              key={category}
              category={category}
              items={workbench[category]}
              onAdvance={advanceItem}
            />
          ))}
          {focus.length === 0 && <div className="col-span-full py-8 text-center text-[11px] text-muted-foreground">该角色暂无待办。</div>}
        </div>
      </Panel>
    </WorkspacePage>
  );
}

// 工作台列：渲染单类别条目列表 + 推进按钮
function WorkbenchColumn({
  category, items, onAdvance,
}: {
  category: WorkbenchCategory;
  items: WorkbenchItem[];
  onAdvance: (category: WorkbenchCategory, id: string, next: string) => void;
}) {
  const meta = WORKBENCH_META[category];
  const Icon = meta.icon;
  return (
    <div className="flex flex-col rounded-md border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">{meta.title}</span>
        </div>
        <Pill tone="slate" size="sm">{items.length}</Pill>
      </div>
      <div className="flex-1 divide-y divide-border overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-[10px] text-muted-foreground">暂无条目</div>
        ) : (
          items.map((item) => {
            // 通过 in 操作符进行类型收窄
            const title = "target" in item ? item.target
              : "title" in item ? item.title
                : "object" in item ? item.object
                  : item.source;
            const detail = "action" in item ? item.action
              : "content" in item ? item.content
                : "dimension" in item ? `维度：${item.dimension} · 严重度 ${item.severity}`
                  : `周期：${item.period}`;
            const meta2 = "confidence" in item ? `置信度 ${item.confidence}`
              : "due" in item ? `截止 ${item.due}` : "";
            return (
              <div key={item.id} className="space-y-1.5 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-medium text-foreground">{title}</span>
                  <Pill tone={statusTone(item.status)} size="sm">{item.status}</Pill>
                </div>
                <div className="text-[10px] leading-5 text-muted-foreground">{detail}</div>
                <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground">
                  <span>{meta2}</span>
                  <ActionButton
                    size="sm"
                    primary
                    disabled={!ACTIVE_STATUSES.has(item.status)}
                    onClick={() => {
                      const next = category === "claimTodos" ? "进行中"
                        : category === "aiSuggestions" ? "已采纳"
                          : category === "pendingIssues" ? "关闭"
                            : "已发布";
                      onAdvance(category, item.id, next);
                    }}
                  >
                    {meta.actionLabel}
                  </ActionButton>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function toneTextClass(tone: "blue" | "violet" | "green" | "amber"): string {
  const map = {
    blue: "text-blue-600", violet: "text-violet-600", green: "text-emerald-600", amber: "text-amber-600",
  };
  return map[tone];
}
