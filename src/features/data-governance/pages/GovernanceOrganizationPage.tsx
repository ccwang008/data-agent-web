// 治理组织与认责总览：左侧三级组织架构树 + 岗位职责详情；
// 右侧认责总览（覆盖率、未认责对象、异常清单、L4 业务部门量化考核）。
// 认责字段不在本页编辑，跳转元数据对象详情；scope=data-agent.data-governance.center.organization。
import { useMemo, useState } from "react";
import {
  AlertCircle, ChevronRight, GitBranch, Layers, Network, ShieldCheck,
  Target, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  ActionButton, InlineNotice, MiniStat, PageTitle, Panel, Pill, ProgressBar, WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import {
  SCHEMA_VERSION, seedAccountabilityOverviews, seedGovernanceOrgNodes, seedGovernanceRoles,
} from "../fixtures";
import { useGovernanceState } from "../state";
import type { AccountabilityOverview, GovernanceOrgNode, GovernanceRole, GovernanceRoleLevel } from "../types";

interface OrgState {
  schemaVersion: number;
  roles: GovernanceRole[];
  orgNodes: GovernanceOrgNode[];
  accountabilities: AccountabilityOverview[];
  // 已展开的节点 id 集合
  expandedNodeIds: string[];
  // 选中的组织节点 id（用于右侧岗位职责详情）
  selectedNodeId: string | null;
  // 业务部门筛选关键词
  departmentQuery: string;
  // 标记为关注的异常认责总览 id（用于本地高亮）
  flaggedAccountabilityIds: string[];
}

// 三级组织层级与图标、颜色映射
const LEVEL_META: Record<GovernanceRoleLevel, { icon: LucideIcon; tone: "violet" | "blue" | "green"; hint: string }> = {
  决策: { icon: ShieldCheck, tone: "violet", hint: "审批战略与重大资源" },
  管理: { icon: Target, tone: "blue", hint: "推动治理规划与认责落实" },
  执行: { icon: Users, tone: "green", hint: "认领数据对象并处置问题" },
};

const initialOrgState: OrgState = {
  schemaVersion: SCHEMA_VERSION,
  roles: seedGovernanceRoles,
  orgNodes: seedGovernanceOrgNodes,
  accountabilities: seedAccountabilityOverviews,
  expandedNodeIds: ["ON-001", "ON-002"],
  selectedNodeId: "ON-002",
  departmentQuery: "",
  flaggedAccountabilityIds: ["AO-003"],
};

export function GovernanceOrganizationPage() {
  const [state, setState, meta] = useGovernanceState<OrgState>(
    "data-agent.data-governance.center.organization",
    initialOrgState,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const { roles, orgNodes, accountabilities, expandedNodeIds, selectedNodeId, departmentQuery, flaggedAccountabilityIds } = state;

  // 根节点列表（parentId === null）
  const roots = useMemo(() => orgNodes.filter((n) => n.parentId === null), [orgNodes]);
  // 选中节点的角色详情
  const selectedNode = orgNodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedRoles = selectedNode ? selectedNode.roleIds.map((rid) => roles.find((r) => r.id === rid) ?? null).filter(Boolean) as GovernanceRole[] : [];

  // 业务部门过滤
  const filteredAccountabilities = useMemo(() => {
    const q = departmentQuery.trim().toLowerCase();
    return accountabilities.filter((a) => !q || a.department.toLowerCase().includes(q));
  }, [accountabilities, departmentQuery]);

  // KPI 摘要数据
  const tierCounts = useMemo(() => ({
    决策: orgNodes.filter((n) => n.level === "决策").length,
    管理: orgNodes.filter((n) => n.level === "管理").length,
    执行: orgNodes.filter((n) => n.level === "执行").length,
  }), [orgNodes]);
  const avgCoverage = accountabilities.length ? Math.round(accountabilities.reduce((s, a) => s + a.coverage, 0) / accountabilities.length) : 0;
  const avgScore = accountabilities.length ? Math.round(accountabilities.reduce((s, a) => s + a.assessmentScore, 0) / accountabilities.length) : 0;

  function toggleExpand(id: string) {
    setState((cur) => ({
      ...cur,
      expandedNodeIds: cur.expandedNodeIds.includes(id)
        ? cur.expandedNodeIds.filter((x) => x !== id)
        : [...cur.expandedNodeIds, id],
    }));
  }

  function selectNode(id: string) {
    setState((cur) => ({ ...cur, selectedNodeId: id }));
    setNotice(`已选中组织节点「${orgNodes.find((n) => n.id === id)?.name ?? id}」；右侧展示岗位职责详情。`);
  }

  function flagAccountability(id: string) {
    setState((cur) => ({
      ...cur,
      flaggedAccountabilityIds: cur.flaggedAccountabilityIds.includes(id)
        ? cur.flaggedAccountabilityIds.filter((x) => x !== id)
        : [...cur.flaggedAccountabilityIds, id],
    }));
  }

  function jumpToMetadata() {
    setNotice("认责字段编辑跳转至元数据对象详情（/data-governance/metadata），不在本页编辑。");
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Governance / Organization"
        title="治理组织与认责总览"
        description="管理三级治理组织、岗位职责，并监控认责覆盖与业务部门量化考核；认责字段编辑跳转元数据对象详情。"
        actions={
          <>
            <ActionButton icon={Network} onClick={() => setNotice("组织架构导出（mock）：将当前组织树与岗位职责生成为 PDF 快照。")}>导出架构</ActionButton>
            <ActionButton icon={ShieldCheck} primary onClick={jumpToMetadata}>认责字段</ActionButton>
          </>
        }
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      {notice && <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">{notice}</div>}

      {/* 顶部 KPI 摘要：组织层级完整性 + 认责覆盖 + 业务部门考核 */}
      <div className="grid gap-3 md:grid-cols-3">
        <MiniStat icon={Layers} tone="blue" label="组织层级完整性"
          value={`${tierCounts.决策} / ${tierCounts.管理} / ${tierCounts.执行}`}
          hint="决策 / 管理 / 执行 三级均有岗位就位"
        />
        <MiniStat icon={Target} tone="amber" label="平均认责覆盖率"
          value={`${avgCoverage}%`}
          hint={`跨 ${accountabilities.length} 个业务部门 · 目标 ≥ 80%`}
        />
        <MiniStat icon={ShieldCheck} tone={avgScore >= 80 ? "green" : "amber"} label="业务部门考核均分"
          value={`${avgScore}`}
          hint="L4 量化考核 · 引用 /metrics/governance"
        />
      </div>

      {/* 主结构：组织树 + 认责总览 双区主从布局 */}
      <div className="grid gap-3 lg:grid-cols-[minmax(320px,1fr)_minmax(0,1.4fr)]">
        {/* 左：组织树 */}
        <Panel
          title="治理组织架构树"
          description="三级治理组织：决策 / 管理 / 执行；点击节点查看岗位与职责"
          actions={<Pill tone="slate" size="sm">{orgNodes.length} 个节点</Pill>}
        >
          <div className="max-h-[640px] overflow-y-auto p-2">
            {roots.map((root) => (
              <OrgTreeNode
                key={root.id}
                node={root}
                nodes={orgNodes}
                roles={roles}
                expandedIds={expandedNodeIds}
                selectedId={selectedNodeId}
                onToggle={toggleExpand}
                onSelect={selectNode}
                depth={0}
              />
            ))}
          </div>
        </Panel>

        {/* 右：认责总览 + 选中节点详情 */}
        <div className="space-y-3">
          {/* 选中节点详情卡 */}
          <Panel
            title={selectedNode ? `${selectedNode.name} · 岗位职责` : "组织节点岗位职责"}
            description={selectedNode ? `层级：${selectedNode.level} · 认责覆盖率 ${selectedNode.accountabilityCoverage}%` : "请选择左侧组织节点"}
            actions={selectedNode ? <Pill tone={LEVEL_META[selectedNode.level].tone} size="sm">{selectedNode.level}层</Pill> : undefined}
          >
            {selectedNode && selectedRoles.length > 0 ? (
              <div className="space-y-3 p-4">
                {selectedRoles.map((role) => (
                  <div key={role.id} className="rounded-md border border-border bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[12px] font-semibold text-foreground">{role.name}</div>
                        <div className="text-[10px] text-muted-foreground">{role.department} · 编制 {role.headcount} 人</div>
                      </div>
                      <Pill tone={LEVEL_META[role.level].tone} size="sm">{role.level}</Pill>
                    </div>
                    <div className="mt-2 grid gap-1.5 text-[11px] text-foreground">
                      {role.responsibilities.map((r) => (
                        <div key={r} className="flex items-start gap-1.5">
                          <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 rounded-md border border-dashed border-border px-2 py-1.5 text-[10px] leading-5 text-muted-foreground">
                      任职要求：{role.requirements}
                    </div>
                  </div>
                ))}
                <div className="rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2 text-[10px] leading-5 text-blue-700">
                  <GitBranch className="mr-1 inline h-3 w-3" />
                  认责字段不在本页编辑；如需调整认责人，请通过元数据对象详情（/data-governance/metadata）回写 D2 字段。
                </div>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-[11px] text-muted-foreground">选择左侧组织节点查看岗位职责详情</div>
            )}
          </Panel>

          {/* 认责总览：业务部门考核表 */}
          <Panel
            title="认责总览与业务部门考核"
            description="按业务部门统计认责覆盖率、未认责对象、异常清单与 L4 量化考核得分"
            actions={
              <label className="flex h-7 items-center gap-1.5 rounded-md border border-input bg-card px-2 text-[10px]">
                <span className="text-muted-foreground">部门</span>
                <input
                  value={departmentQuery}
                  onChange={(e) => setState((cur) => ({ ...cur, departmentQuery: e.target.value }))}
                  placeholder="筛选业务部门"
                  className="min-w-[100px] flex-1 bg-transparent text-[10px] outline-none"
                />
              </label>
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">业务部门</th>
                    <th className="px-3 py-2 text-right">认责对象</th>
                    <th className="px-3 py-2 text-left">覆盖率</th>
                    <th className="px-3 py-2 text-right">未认责</th>
                    <th className="px-3 py-2 text-right">异常</th>
                    <th className="px-3 py-2 text-right">考核分</th>
                    <th className="px-3 py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAccountabilities.map((a) => {
                    const flagged = flaggedAccountabilityIds.includes(a.id);
                    return (
                      <tr key={a.id} className={cn("hover:bg-muted/30", flagged && "bg-amber-50/40")}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {flagged && <AlertCircle className="h-3 w-3 text-amber-600" />}
                            <span className="font-medium text-foreground">{a.department}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{a.assignedObjects}/{a.totalObjects}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <ProgressBar className="w-24" value={a.coverage} tone={a.coverage >= 80 ? "green" : a.coverage >= 60 ? "amber" : "red"} />
                            <span className={cn("text-[10px] tabular-nums", a.coverage >= 80 ? "text-emerald-600" : a.coverage >= 60 ? "text-amber-600" : "text-red-600")}>
                              {a.coverage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{a.unassignedObjects}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {a.exceptionCount > 0 ? <Pill tone="red" size="sm">{a.exceptionCount}</Pill> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Pill tone={a.assessmentScore >= 80 ? "green" : a.assessmentScore >= 60 ? "amber" : "red"} size="sm">{a.assessmentScore}</Pill>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <ActionButton size="sm" onClick={() => flagAccountability(a.id)}>
                            {flagged ? "取消关注" : "标记关注"}
                          </ActionButton>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAccountabilities.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">未匹配到业务部门</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
              标记关注的业务部门将纳入下周期治理委员会汇报；异常项需联系对应业务域管家在元数据对象详情补齐认责字段。
            </div>
          </Panel>

          {/* 未认责对象清单 + 异常清单：派生自认责总览 */}
          <Panel
            title="未认责对象与异常清单"
            description="由认责总览派生；详细对象跳转元数据检索页"
          >
            <div className="grid gap-3 p-3 md:grid-cols-2">
              <div className="rounded-md border border-amber-200 bg-amber-50/40 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-amber-800">
                  <AlertCircle className="h-3.5 w-3.5" />
                  未认责对象
                </div>
                <ul className="space-y-1.5 text-[10px] text-amber-900">
                  {accountabilities.filter((a) => a.unassignedObjects > 0).map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded bg-card/60 px-2 py-1">
                      <span>{a.department}</span>
                      <span className="tabular-nums">{a.unassignedObjects} 个待认领</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-red-200 bg-red-50/40 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-red-800">
                  <AlertCircle className="h-3.5 w-3.5" />
                  异常清单
                </div>
                <ul className="space-y-1.5 text-[10px] text-red-900">
                  {accountabilities.filter((a) => a.exceptionCount > 0).flatMap((a) =>
                    Array.from({ length: a.exceptionCount }, (_, i) => (
                      <li key={`${a.id}-EX${i}`} className="flex items-center justify-between rounded bg-card/60 px-2 py-1">
                        <span>{a.department} · 异常 EX-{i + 1}</span>
                        <Pill tone="red" size="sm">待处置</Pill>
                      </li>
                    )),
                  )}
                  {accountabilities.every((a) => a.exceptionCount === 0) && (
                    <li className="text-muted-foreground">暂无异常</li>
                  )}
                </ul>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </WorkspacePage>
  );
}

// 组织树节点组件：递归渲染三级架构
function OrgTreeNode({
  node, nodes, roles, expandedIds, selectedId, onToggle, onSelect, depth,
}: {
  node: GovernanceOrgNode;
  nodes: GovernanceOrgNode[];
  roles: GovernanceRole[];
  expandedIds: string[];
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const children = nodes.filter((n) => n.parentId === node.id);
  const expanded = expandedIds.includes(node.id);
  const selected = selectedId === node.id;
  const meta = LEVEL_META[node.level];
  const nodeRoles = node.roleIds.map((rid) => roles.find((r) => r.id === rid)).filter(Boolean) as GovernanceRole[];

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md py-1.5 pr-2 transition hover:bg-muted/30",
          selected && "bg-blue-50/70 ring-1 ring-blue-200",
        )}
        style={{ paddingLeft: depth * 14 + 6 }}
      >
        {children.length > 0 ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          >
            <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
          </button>
        ) : (
          <span className="inline-block h-3 w-3" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <meta.icon className={cn("h-3.5 w-3.5 shrink-0", toneText(meta.tone))} />
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">{node.name}</span>
          <Pill tone={statusTone(node.accountabilityCoverage >= 80 ? "正常" : node.accountabilityCoverage >= 60 ? "关注" : "异常")} size="sm">
            {node.accountabilityCoverage}%
          </Pill>
        </button>
      </div>
      {expanded && children.length > 0 && (
        <div className="space-y-0.5">
          {children.map((child) => (
            <OrgTreeNode
              key={child.id}
              node={child}
              nodes={nodes}
              roles={roles}
              expandedIds={expandedIds}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
      {expanded && nodeRoles.length > 0 && depth === 0 && (
        <div className="ml-6 mt-1 space-y-1 border-l border-dashed border-border pl-3">
          {nodeRoles.map((r) => (
            <div key={r.id} className="text-[10px] text-muted-foreground">
              <span className="font-medium text-foreground">{r.name}</span> · {r.department} · 编制 {r.headcount}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function toneText(tone: "violet" | "blue" | "green"): string {
  const map = { violet: "text-violet-600", blue: "text-blue-600", green: "text-emerald-600" };
  return map[tone];
}
