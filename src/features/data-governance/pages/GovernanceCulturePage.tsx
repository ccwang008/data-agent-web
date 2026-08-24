// 数据文化推广与成效：顶部价值观 + 领导力承诺横幅；
// 中部宣贯/培训/标杆活动时间线；底部文化成效量化指标看板。
// 采用"价值观 + 时间线 + 成效看板"叙事结构，不是列表页。
// scope=data-agent.data-governance.center.culture。
import { useMemo, useState } from "react";
import {
  Award, BarChart3, BookOpen, Calendar, Crown, GraduationCap, Heart,
  Megaphone, Minus, Plus, Sparkles, TrendingUp, TrendingDown, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  ActionButton, InlineNotice, MiniStat, PageTitle, Panel, Pill, ProgressBar, WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { cn } from "@/lib/utils";

import {
  SCHEMA_VERSION, seedCultureActivities, seedCultureMetrics,
} from "../fixtures";
import { formatNow, makeId, useGovernanceState } from "../state";
import type { CultureActivity, CultureActivityType, CultureMetric } from "../types";

interface CultureState {
  schemaVersion: number;
  activities: CultureActivity[];
  metrics: CultureMetric[];
  // 已展开的活动详情 id
  expandedActivityIds: string[];
  // 标记为重点标杆的活动 id（用于本地高亮）
  starredActivityIds: string[];
}

// 文化活动类型与图标 / 色调映射
const ACTIVITY_META: Record<CultureActivityType, { icon: LucideIcon; tone: "violet" | "blue" | "amber" | "green"; label: string }> = {
  价值观: { icon: Heart, tone: "violet", label: "价值观发布" },
  承诺: { icon: Crown, tone: "violet", label: "领导力承诺" },
  宣贯: { icon: Megaphone, tone: "blue", label: "政策宣贯" },
  培训: { icon: GraduationCap, tone: "amber", label: "认证培训" },
  标杆: { icon: Award, tone: "green", label: "标杆案例" },
};

// 趋势与图标映射
const TREND_META: Record<CultureMetric["trend"], { icon: LucideIcon; tone: "green" | "red" | "slate" }> = {
  上升: { icon: TrendingUp, tone: "green" },
  下降: { icon: TrendingDown, tone: "red" },
  持平: { icon: Minus, tone: "slate" },
};

const initialCultureState: CultureState = {
  schemaVersion: SCHEMA_VERSION,
  activities: seedCultureActivities,
  metrics: seedCultureMetrics,
  expandedActivityIds: ["CA-005"],
  starredActivityIds: ["CA-005"],
};

export function GovernanceCulturePage() {
  const [state, setState, meta] = useGovernanceState<CultureState>(
    "data-agent.data-governance.center.culture",
    initialCultureState,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { activities, metrics, expandedActivityIds, starredActivityIds } = state;

  // 顶部：价值观与领导力承诺
  const valueActivities = activities.filter((a) => a.type === "价值观" || a.type === "承诺");
  // 中部：宣贯 / 培训 / 标杆时间线
  const timelineActivities = useMemo(() =>
    activities
      .filter((a) => a.type !== "价值观" && a.type !== "承诺")
      .sort((a, b) => a.date.localeCompare(b.date)), [activities]);

  // KPI 摘要数据
  const totalParticipants = activities.reduce((s, a) => s + a.participants, 0);
  const scored = activities.filter((a) => a.effectivenessScore !== undefined);
  const avgScore = scored.length ? Math.round(scored.reduce((s, a) => s + (a.effectivenessScore ?? 0), 0) / scored.length) : 0;
  const benchmarkCount = activities.filter((a) => a.type === "标杆").length;
  const coverageMetric = metrics.find((m) => m.name.includes("覆盖率")) ?? null;

  function toggleExpand(id: string) {
    setState((cur) => ({
      ...cur,
      expandedActivityIds: cur.expandedActivityIds.includes(id)
        ? cur.expandedActivityIds.filter((x) => x !== id)
        : [...cur.expandedActivityIds, id],
    }));
  }

  function toggleStar(id: string) {
    setState((cur) => ({
      ...cur,
      starredActivityIds: cur.starredActivityIds.includes(id)
        ? cur.starredActivityIds.filter((x) => x !== id)
        : [...cur.starredActivityIds, id],
    }));
  }

  // 创建新文化活动（mock：仅写入本地 state）
  function createActivity(type: CultureActivityType, title: string, department: string, participants: number) {
    const newAct: CultureActivity = {
      id: makeId("CA"),
      type,
      title: title || `新${type}活动`,
      date: formatNow().slice(0, 10),
      participants,
      department: department || "全公司",
      effectivenessScore: undefined,
      description: "待补充活动描述与成效评分。",
    };
    setState((cur) => ({ ...cur, activities: [newAct, ...cur.activities] }));
    setCreateOpen(false);
    setNotice(`已创建${type}活动「${newAct.title}」，待补充成效评分后纳入量化看板。`);
  }

  // 给活动补评分（mock）
  function scoreActivity(id: string, score: number) {
    setState((cur) => ({
      ...cur,
      activities: cur.activities.map((a) => a.id === id ? { ...a, effectivenessScore: score } : a),
    }));
    setNotice(`已为活动 ${id} 补充成效评分 ${score}，纳入量化看板。`);
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Governance / Culture"
        title="数据文化推广与成效"
        description="管理数据文化推广活动并量化成效；以价值观、时间线与成效看板叙事推进治理文化落地。"
        actions={
          <>
            <ActionButton icon={BarChart3} onClick={() => setNotice("成效快照（mock）：引用 /metrics/governance 域治理文化 KPI 已生成。")}>成效快照</ActionButton>
            <ActionButton icon={Plus} primary onClick={() => setCreateOpen(true)}>新建活动</ActionButton>
          </>
        }
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      {notice && <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">{notice}</div>}

      {/* 顶部：文化价值观 + 领导力承诺横幅 */}
      <section className="rounded-lg border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-blue-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <h2 className="text-[13px] font-semibold text-foreground">文化价值观与领导力承诺</h2>
          </div>
          <Pill tone="violet" size="sm">治理文化顶层设计</Pill>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {valueActivities.map((a) => {
            const am = ACTIVITY_META[a.type];
            return (
              <div key={a.id} className="rounded-md border border-border bg-card/80 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <am.icon className={cn("mt-0.5 h-4 w-4", toneTextClass(am.tone))} />
                    <div>
                      <div className="text-[12px] font-semibold text-foreground">{a.title}</div>
                      <div className="text-[10px] text-muted-foreground">{a.date} · {a.department} · {a.participants} 人参与</div>
                    </div>
                  </div>
                  {a.effectivenessScore !== undefined && (
                    <Pill tone="green" size="sm">成效 {a.effectivenessScore}</Pill>
                  )}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{a.description}</p>
              </div>
            );
          })}
          {valueActivities.length === 0 && (
            <div className="col-span-2 rounded-md border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
              尚未发布文化价值观与领导力承诺，待治理委员会发起。
            </div>
          )}
        </div>
      </section>

      {/* KPI 摘要条 */}
      <div className="grid gap-3 md:grid-cols-4">
        <MiniStat icon={Users} tone="blue" label="累计参与人数"
          value={totalParticipants} hint={`跨 ${activities.length} 个活动`}
        />
        <MiniStat icon={Award} tone={avgScore >= 80 ? "green" : "amber"}
          label="平均成效评分" value={avgScore || "—"} hint={`已评分 ${scored.length} / ${activities.length} 个活动`}
        />
        <MiniStat icon={BookOpen} tone="violet" label="标杆案例数"
          value={benchmarkCount} hint="L4 治理文化推广 KPI"
        />
        <MiniStat icon={BarChart3} tone={coverageMetric && coverageMetric.value >= coverageMetric.target ? "green" : "amber"}
          label="活动覆盖率"
          value={coverageMetric ? `${coverageMetric.value}%` : "—"}
          hint={coverageMetric ? `目标 ${coverageMetric.target}%` : "未配置"}
        />
      </div>

      {/* 中部：宣贯 / 培训 / 标杆时间线 */}
      <Panel
        title="推广活动时间线"
        description="按时间顺序呈现宣贯 / 培训 / 标杆案例；点击节点查看详情、标记为重点或补充评分"
        actions={<Pill tone="slate" size="sm">{timelineActivities.length} 个节点</Pill>}
      >
        {/* 时间线轨道 */}
        <div className="overflow-x-auto px-4 py-4">
          <div className="relative flex min-w-[640px] items-start gap-4">
            {/* 时间线主轴 */}
            <div className="absolute left-0 right-0 top-7 h-px bg-border" />
            {timelineActivities.map((a) => {
              const am = ACTIVITY_META[a.type];
              const expanded = expandedActivityIds.includes(a.id);
              const starred = starredActivityIds.includes(a.id);
              return (
                <div key={a.id} className="relative flex w-44 flex-col items-center text-center">
                  {/* 节点圆点 */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(a.id)}
                    className={cn(
                      "relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 bg-card transition hover:border-primary",
                      starred ? "border-amber-300 bg-amber-50"
                        : expanded ? "border-blue-300 bg-blue-50"
                          : "border-border",
                    )}
                    title={a.title}
                  >
                    <am.icon className={cn("h-5 w-5", toneTextClass(am.tone))} />
                    {starred && <Award className="absolute -right-1 -top-1 h-3.5 w-3.5 text-amber-500" />}
                  </button>
                  {/* 节点标签 */}
                  <div className="mt-2 flex w-full flex-col gap-0.5">
                    <Pill tone={am.tone} size="sm">{am.label}</Pill>
                    <div className="truncate text-[11px] font-medium text-foreground" title={a.title}>{a.title}</div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {a.date}
                    </div>
                    {a.effectivenessScore !== undefined ? (
                      <div className="mt-0.5 inline-flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-600">
                        <Award className="h-3 w-3" />
                        {a.effectivenessScore} 分
                      </div>
                    ) : (
                      <div className="mt-0.5 text-[10px] text-muted-foreground/70">未评分</div>
                    )}
                  </div>
                </div>
              );
            })}
            {timelineActivities.length === 0 && (
              <div className="flex w-full items-center justify-center py-6 text-[11px] text-muted-foreground">
                时间线为空，请创建宣贯 / 培训 / 标杆活动。
              </div>
            )}
          </div>
        </div>

        {/* 已展开的活动详情卡 */}
        {timelineActivities
          .filter((a) => expandedActivityIds.includes(a.id))
          .map((a) => {
            const am = ACTIVITY_META[a.type];
            const starred = starredActivityIds.includes(a.id);
            return (
              <div key={`detail-${a.id}`} className="border-t border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <am.icon className={cn("mt-0.5 h-4 w-4", toneTextClass(am.tone))} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-foreground">{a.title}</span>
                        <Pill tone={am.tone} size="sm">{am.label}</Pill>
                        {starred && <Pill tone="amber" size="sm">标杆</Pill>}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {a.date} · {a.department} · {a.participants} 人参与
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ActionButton size="sm" onClick={() => toggleStar(a.id)}>
                      {starred ? "取消标杆" : "标记标杆"}
                    </ActionButton>
                    <ActionButton size="sm" onClick={() => toggleExpand(a.id)}>收起</ActionButton>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{a.description}</p>
                <div className="mt-3 flex items-center gap-3 rounded-md border border-dashed border-border px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">成效评分</div>
                  {(() => {
                    const score = a.effectivenessScore;
                    if (score === undefined) {
                      return (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">未评分</span>
                          <ActionButton size="sm" primary onClick={() => scoreActivity(a.id, 80)}>初评 80</ActionButton>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <ProgressBar value={score} tone={score >= 85 ? "green" : score >= 70 ? "amber" : "red"} className="w-32" />
                        <span className="text-[11px] font-semibold text-foreground">{score}</span>
                        <ActionButton size="sm" onClick={() => scoreActivity(a.id, Math.min(100, score + 2))}>补评 +2</ActionButton>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
      </Panel>

      {/* 底部：文化成效量化指标看板 */}
      <Panel
        title="文化成效量化看板"
        description="L4 量化指标：活动覆盖率、素养通过率、决策占比、业务部门参与度；引用 /metrics/governance 域"
        actions={<Pill tone="slate" size="sm">{metrics.length} 项指标</Pill>}
      >
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m) => {
            const trend = TREND_META[m.trend];
            const ratio = Math.min(100, Math.round((m.value / m.target) * 100));
            return (
              <div key={m.id} className="rounded-md border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-foreground">{m.name}</span>
                  <trend.icon className={cn("h-3.5 w-3.5", toneTextClass(trend.tone))} />
                </div>
                <div className="mt-1 flex items-end gap-1.5">
                  <span className="text-[20px] font-semibold tabular-nums text-foreground">{m.value}</span>
                  <span className="pb-1 text-[10px] text-muted-foreground">{m.unit}</span>
                  <span className="pb-1 text-[10px] text-muted-foreground">/ 目标 {m.target}{m.unit}</span>
                </div>
                <ProgressBar className="mt-2" value={ratio} tone={ratio >= 100 ? "green" : ratio >= 80 ? "blue" : "amber"} />
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>达成率 {ratio}%</span>
                  <span className="flex items-center gap-1">
                    {trend.icon && <trend.icon className={cn("h-3 w-3", toneTextClass(trend.tone))} />}
                    {m.trend}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 全部活动列表（叙事结构补充） */}
      <Panel
        title="全部文化活动"
        description="按类型筛选并查看历史活动；可在时间线外补充评分与重点标记"
        actions={
          <div className="flex items-center gap-1.5">
            {(Object.keys(ACTIVITY_META) as CultureActivityType[]).map((t) => {
              const count = activities.filter((a) => a.type === t).length;
              return (
                <Pill key={t} tone={ACTIVITY_META[t].tone} size="sm">
                  {ACTIVITY_META[t].label} · {count}
                </Pill>
              );
            })}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-[11px]">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">类型</th>
                <th className="px-3 py-2 text-left">标题</th>
                <th className="px-3 py-2 text-left">部门</th>
                <th className="px-3 py-2 text-left">日期</th>
                <th className="px-3 py-2 text-right">人数</th>
                <th className="px-3 py-2 text-right">评分</th>
                <th className="px-3 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activities.map((a) => {
                const am = ACTIVITY_META[a.type];
                const starred = starredActivityIds.includes(a.id);
                return (
                  <tr key={a.id} className={cn("hover:bg-muted/30", starred && "bg-amber-50/40")}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <am.icon className={cn("h-3.5 w-3.5", toneTextClass(am.tone))} />
                        <span>{am.label}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground">{a.title}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.department}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.date}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{a.participants}</td>
                    <td className="px-3 py-2 text-right">
                      {a.effectivenessScore !== undefined
                        ? <Pill tone={a.effectivenessScore >= 85 ? "green" : a.effectivenessScore >= 70 ? "amber" : "red"} size="sm">{a.effectivenessScore}</Pill>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <ActionButton size="sm" onClick={() => toggleStar(a.id)}>{starred ? "取消标杆" : "标记标杆"}</ActionButton>
                        {a.effectivenessScore === undefined && (
                          <ActionButton size="sm" primary onClick={() => scoreActivity(a.id, 80)}>补评分</ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 新建活动浮层 */}
      {createOpen && (
        <CreateActivityDrawer
          onClose={() => setCreateOpen(false)}
          onCreate={createActivity}
        />
      )}
    </WorkspacePage>
  );
}

// 新建活动浮层
function CreateActivityDrawer({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (type: CultureActivityType, title: string, department: string, participants: number) => void;
}) {
  const [type, setType] = useState<CultureActivityType>("宣贯");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [participants, setParticipants] = useState(50);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">New Activity</div>
            <div className="text-[14px] font-semibold text-foreground">新建文化活动</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">×</button>
        </div>
        <div className="space-y-3 p-5">
          <div>
            <label className="text-[10px] text-muted-foreground">活动类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CultureActivityType)}
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-[11px] outline-none"
            >
              {(Object.keys(ACTIVITY_META) as CultureActivityType[]).map((t) => (
                <option key={t} value={t}>{ACTIVITY_META[t].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">活动标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：数据治理总政策宣贯会"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-[11px] outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">负责部门</label>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="如：数据中心"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-[11px] outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">预计参与人数</label>
            <input
              type="number"
              value={participants}
              onChange={(e) => setParticipants(Number(e.target.value) || 0)}
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-[11px] outline-none"
            />
          </div>
          <div className="rounded-md border border-dashed border-border p-3 text-[10px] leading-5 text-muted-foreground">
            新建活动默认无成效评分；活动结束后由治理负责人评分并纳入量化看板。日期取本地当前日期（mock）。
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <ActionButton onClick={onClose}>取消</ActionButton>
            <ActionButton primary onClick={() => onCreate(type, title, department, participants)}>创建</ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function toneTextClass(tone: "violet" | "blue" | "amber" | "green" | "red" | "slate"): string {
  const map = {
    violet: "text-violet-600", blue: "text-blue-600", amber: "text-amber-600",
    green: "text-emerald-600", red: "text-red-600", slate: "text-slate-600",
  };
  return map[tone];
}
