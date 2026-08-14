import { Braces, Database, FileWarning, MessageSquareText, RefreshCcw, ServerCog } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { Panel, Pill, ProgressBar } from "@/components/data-platform/WorkspacePrimitives";
import { cn } from "@/lib/utils";

import { CompactBar, DashboardTimeFilter, DomainHeading, DomainMetricsWorkspace } from "./components";
import { DOMAINS, getDomain } from "./catalog";
import { formatMetricValue, getDomainHealth, getMetricView, statusLabel } from "./logic";
import { useMetrics } from "./store";

function PageFrame({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function SmallStat({ label, value, hint, tone = "blue" }: { label: string; value: string; hint: string; tone?: "blue" | "green" | "amber" | "red" }) {
  const tones = {
    blue: "border-blue-100 bg-blue-50/60 text-blue-700",
    green: "border-emerald-100 bg-emerald-50/60 text-emerald-700",
    amber: "border-amber-100 bg-amber-50/60 text-amber-700",
    red: "border-red-100 bg-red-50/60 text-red-700",
  };
  return (
    <div className={cn("rounded-md border p-3", tones[tone])}>
      <div className="text-[9px] font-medium opacity-80">{label}</div>
      <div className="mt-1 text-[18px] font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[9px] opacity-70">{hint}</div>
    </div>
  );
}

function StatusDot({ tone }: { tone: "green" | "amber" | "red" | "slate" }) {
  return <span className={cn("h-1.5 w-1.5 rounded-full", { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", slate: "bg-slate-400" }[tone])} />;
}

const OVERVIEW_HEALTH = {
  healthy: { label: "健康", pill: "green" as const, bar: "green" as const },
  warning: { label: "关注", pill: "amber" as const, bar: "amber" as const },
  risk: { label: "风险", pill: "red" as const, bar: "red" as const },
  "data-issue": { label: "数据异常", pill: "slate" as const, bar: "blue" as const },
};

export function OverviewMetricsPage() {
  const { state, viewMode, selectedPeriod } = useMetrics();
  const domains = DOMAINS.map((domain) => {
    const metrics = state.metrics.filter((metric) => metric.domain === domain.key);
    const views = metrics.map((metric) => ({ metric, view: getMetricView(metric, viewMode, selectedPeriod) }));
    const evaluable = views.filter(({ metric, view }) => view.status !== "no-data" && view.status !== "not-applicable" && metric.freshness !== "expired");
    const met = evaluable.filter(({ view }) => view.status === "met").length;
    return {
      ...domain,
      health: getDomainHealth(state, domain.key, viewMode, selectedPeriod),
      rate: evaluable.length ? Math.round((met / evaluable.length) * 1000) / 10 : 0,
      met,
      warning: views.filter(({ view }) => view.status === "warning").length,
      unmet: views.filter(({ view }) => view.status === "unmet").length,
      dataIssues: views.filter(({ metric, view }) => view.status === "no-data" || metric.freshness === "expired").length,
      total: metrics.length,
    };
  });
  const risks = state.metrics
    .map((metric) => ({ metric, view: getMetricView(metric, viewMode, selectedPeriod) }))
    .filter(({ metric, view }) => view.status === "unmet" || view.status === "warning" || metric.freshness === "expired")
    .sort((left, right) => {
      const rank = (item: typeof left) => item.view.status === "unmet" ? 3 : item.metric.freshness === "expired" ? 2 : 1;
      return rank(right) - rank(left);
    });
  const openImprovements = state.improvements.filter((item) => item.status === "open");

  return (
    <PageFrame>
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-[17px] font-semibold text-foreground">综合看板</h2><p className="mt-1 text-[11px] text-muted-foreground">跨九域比较达标、风险、数据异常和改进优先级，再下钻到能力域看板解释原因。</p></div>
        <div className="flex gap-2"><Pill tone="blue">9 个能力域</Pill><Pill tone="slate">25 项核心 KPI</Pill><Pill tone="slate">33 个能力项</Pill></div>
      </div>
      <DashboardTimeFilter modes={["current", "day", "week", "month"]} label="综合统计周期" hint="综合看板按冻结周期比较九域" />

      <Panel title="九域量化态势" description="以同一周期比较九域 KPI 达标率；状态仍按域内最差结果透明上卷。">
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {domains.map((domain) => {
            const meta = OVERVIEW_HEALTH[domain.health];
            return (
              <NavLink key={domain.key} to={`/metrics/${domain.slug}`} className="rounded-md border border-border p-3 transition hover:border-primary/30 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3"><div><div className="text-[11px] font-semibold text-foreground">{domain.label}</div><div className="mt-1 text-[9px] text-muted-foreground">{domain.total} 项核心 KPI</div></div><Pill tone={meta.pill}>{meta.label}</Pill></div>
                <div className="mt-3 flex items-end justify-between"><div><div className="text-[9px] text-muted-foreground">域内达标率</div><div className="mt-0.5 text-[20px] font-semibold tabular-nums text-foreground">{domain.rate}%</div></div><div className="text-right text-[9px] leading-4 text-muted-foreground">达标 {domain.met} · 预警 {domain.warning}<br />未达标 {domain.unmet} · 异常 {domain.dataIssues}</div></div>
                <div className="mt-3"><ProgressBar value={domain.rate} tone={meta.bar} /></div>
              </NavLink>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel title="核心 KPI 风险清单" description="优先展示未达标、数据过期和预警指标，点击能力域继续分析。">
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[10px]"><thead className="bg-muted/30 text-muted-foreground"><tr>{["能力域", "核心 KPI", "当前值", "目标", "状态", "责任人"].map((label) => <th key={label} className="px-3 py-2.5 font-medium">{label}</th>)}</tr></thead><tbody>{risks.slice(0, 10).map(({ metric, view }) => { const expired = metric.freshness === "expired"; return <tr key={metric.id} className="border-t border-border"><td className="px-3 py-3"><NavLink to={`/metrics/${getDomain(metric.domain).slug}`} className="font-medium text-primary hover:underline">{getDomain(metric.domain).label}</NavLink></td><td className="px-3 py-3 font-medium text-foreground">{metric.name}</td><td className="px-3 py-3 tabular-nums text-foreground">{formatMetricValue(metric, view.value)}</td><td className="px-3 py-3 text-muted-foreground">{metric.target.label}</td><td className="px-3 py-3"><Pill tone={view.status === "unmet" ? "red" : expired ? "slate" : "amber"}>{expired ? "数据过期" : statusLabel(view.status)}</Pill></td><td className="px-3 py-3 text-muted-foreground">{metric.owner}</td></tr>; })}</tbody></table></div>
        </Panel>
        <Panel title="本期管理重点" description="集中查看跨域改进事项和冻结快照运行状态。">
          <div className="grid grid-cols-2 gap-2 p-4"><SmallStat label="进行中改进" value={`${openImprovements.length} 项`} hint="同 KPI 同周期仅一项" tone="amber" /><SmallStat label="已关闭改进" value={`${state.improvements.filter((item) => item.status === "closed").length} 项`} hint="均保留结果证据" tone="green" /><SmallStat label="冻结快照" value={`${state.snapshots.length} 个`} hint="日、周、月版本" tone="blue" /><SmallStat label="季度报告" value={`${state.reports.length} 份`} hint="支持版本追溯" tone="blue" /></div>
          <div className="border-t border-border p-4"><div className="mb-3 text-[10px] font-semibold text-foreground">优先改进事项</div><div className="space-y-3">{openImprovements.slice(0, 4).map((item) => { const metric = state.metrics.find((entry) => entry.id === item.metricId); const overdue = item.dueAt < "2026-08-13"; return <div key={item.id} className="rounded-md border border-border p-3"><div className="flex items-start justify-between gap-2"><div><div className="text-[10px] font-medium text-foreground">{metric?.name ?? item.metricId}</div><div className="mt-1 text-[9px] text-muted-foreground">{getDomain(item.domain).label} · {item.owner}</div></div><Pill tone={overdue ? "red" : "amber"}>{overdue ? "已逾期" : `截至 ${item.dueAt}`}</Pill></div><div className="mt-2 text-[9px] leading-4 text-muted-foreground">{item.measure}</div></div>; })}</div></div>
        </Panel>
      </div>
    </PageFrame>
  );
}

export function StrategyMetricsPage() {
  const objectives = [
    { name: "统一客户数据视图", owner: "数字化委员会", progress: 94, plan: 92, status: "按计划" },
    { name: "关键数据资产运营", owner: "数据管理部", progress: 87, plan: 90, status: "偏差 -3%" },
    { name: "可信数据服务体系", owner: "平台架构部", progress: 82, plan: 86, status: "偏差 -4%" },
  ];
  return (
    <PageFrame>
      <DomainHeading domain="strategy"><Pill tone="blue">3 项年度目标</Pill><Pill tone="amber">1 项需关注</Pill></DomainHeading>
      <DashboardTimeFilter modes={["current", "month"]} label="战略评估周期" hint="战略目标按月评估，年度累计" />
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel title="战略目标执行矩阵" description="逐项目比较计划进度与实际进度，定位实施偏差。">
          <div className="divide-y divide-border">
            {objectives.map((item) => (
              <div key={item.name} className="grid gap-3 p-4 md:grid-cols-[1fr_110px_1fr_90px] md:items-center">
                <div><div className="text-[11px] font-medium text-foreground">{item.name}</div><div className="mt-1 text-[9px] text-muted-foreground">{item.owner}</div></div>
                <div className="text-[10px] text-muted-foreground">计划 <b className="text-foreground">{item.plan}%</b></div>
                <div><ProgressBar value={item.progress} tone={item.progress >= item.plan ? "green" : "amber"} /><div className="mt-1 text-[9px] text-muted-foreground">实际 {item.progress}%</div></div>
                <Pill tone={item.progress >= item.plan ? "green" : "amber"}>{item.status}</Pill>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="战略里程碑" description="关注目标、路径、资源和收益的阶段一致性。">
          <div className="space-y-4 p-4">
            {[
              ["Q1", "战略分解与责任签署", "完成", "green"],
              ["Q2", "重点工程阶段验收", "完成", "green"],
              ["Q3", "价值复盘与偏差纠正", "进行中", "amber"],
              ["Q4", "年度成效评估", "未开始", "slate"],
            ].map(([quarter, title, status, tone]) => <div key={quarter} className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border text-[9px] font-semibold text-primary">{quarter}</span><div className="min-w-0 flex-1"><div className="text-[10px] font-medium text-foreground">{title}</div><div className="mt-1 flex items-center gap-1.5 text-[9px] text-muted-foreground"><StatusDot tone={tone as "green" | "amber" | "slate"} />{status}</div></div></div>)}
          </div>
        </Panel>
      </div>
      <DomainMetricsWorkspace domain="strategy" />
    </PageFrame>
  );
}

export function GovernanceMetricsPage() {
  const meetings = [
    ["数据管理委员会月会", "08-08", "12/13", "4 项决议"],
    ["数据标准专题会", "08-05", "8/8", "2 项决议"],
    ["质量问题协调会", "07-29", "10/11", "6 项决议"],
  ];
  return (
    <PageFrame>
      <DomainHeading domain="governance"><Pill tone="green">本月已召开 2 次</Pill><Pill tone="blue">数据管家 46 人</Pill></DomainHeading>
      <DashboardTimeFilter modes={["current", "week", "month"]} label="治理运行周期" hint="会议与闭环按周、月统计" />
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="治理会议运行" description="会议频次、到会率与决议留痕。" className="xl:col-span-1">
          <div className="divide-y divide-border">{meetings.map(([name, date, attendance, result]) => <div key={name} className="p-3"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-medium text-foreground">{name}</span><span className="text-[9px] text-muted-foreground">{date}</span></div><div className="mt-2 flex gap-2 text-[9px] text-muted-foreground"><span>到会 {attendance}</span><span>·</span><span>{result}</span></div></div>)}</div>
        </Panel>
        <Panel title="治理问题闭环漏斗" description="从登记、受理、处理到验证关闭。" className="xl:col-span-1">
          <div className="space-y-3 p-4">{[["本期登记", 128, 100, "blue"], ["已受理", 124, 97, "blue"], ["处理中", 38, 30, "amber"], ["验证关闭", 119, 93, "green"]].map(([label, count, width, tone]) => <div key={String(label)} className="flex items-center gap-3"><span className="w-14 text-[9px] text-muted-foreground">{label}</span><div className="h-6 flex-1 rounded bg-muted/40"><div className={cn("flex h-6 items-center justify-end rounded px-2 text-[9px] font-medium text-white", tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-blue-500")} style={{ width: `${width}%` }}>{count}</div></div></div>)}</div>
        </Panel>
        <Panel title="数据管家覆盖" description="按业务域识别无人负责的治理边界。" className="xl:col-span-1">
          <div className="space-y-3 p-4"><CompactBar label="客户域" value={100} target={90} tone="green" /><CompactBar label="产品域" value={96} target={90} tone="green" /><CompactBar label="交易域" value={92} target={90} tone="green" /><CompactBar label="供应链域" value={83} target={90} tone="amber" hint="待补充 2 名数据管家" /></div>
        </Panel>
      </div>
      <DomainMetricsWorkspace domain="governance" />
    </PageFrame>
  );
}

export function ArchitectureMetricsPage() {
  const systems = [["核心交易", 100, "实时采集"], ["客户中心", 98, "每日采集"], ["供应链平台", 91, "每日采集"], ["历史报表库", 78, "每周采集"]] as const;
  return (
    <PageFrame>
      <DomainHeading domain="architecture"><Pill tone="blue">已纳管 42 个系统</Pill><Pill tone="amber">2 个采集缺口</Pill></DomainHeading>
      <DashboardTimeFilter modes={["current", "day", "week", "month"]} label="架构监测周期" hint="采集任务日更，评审结果按周、月汇总" />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="元数据采集拓扑" description="按系统展示自动采集覆盖与同步节奏。">
          <div className="grid gap-3 p-4 sm:grid-cols-2">{systems.map(([name, value, cadence]) => <div key={name} className="rounded-md border border-border p-3"><div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-[10px] font-medium text-foreground"><ServerCog className="h-3.5 w-3.5 text-primary" />{name}</span><Pill tone={value >= 95 ? "green" : value >= 85 ? "amber" : "red"}>{value}%</Pill></div><div className="mt-3"><ProgressBar value={value} tone={value >= 95 ? "green" : "amber"} /></div><div className="mt-2 text-[9px] text-muted-foreground">{cadence}</div></div>)}</div>
        </Panel>
        <Panel title="模型规范评审" description="记录首审结论，避免多次复审美化通过率。">
          <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-[10px]"><thead className="bg-muted/30 text-muted-foreground"><tr>{["模型", "类型", "首审结论", "主要问题"].map((item) => <th key={item} className="px-3 py-2 font-medium">{item}</th>)}</tr></thead><tbody>{[["客户统一模型", "概念模型", "通过", "—"], ["订单主题模型", "逻辑模型", "有条件通过", "主键命名"], ["供应商画像", "逻辑模型", "退回", "粒度不一致"], ["营销事件明细", "物理模型", "通过", "—"]].map((row) => <tr key={row[0]} className="border-t border-border">{row.map((cell, index) => <td key={cell} className="px-3 py-3">{index === 2 ? <Pill tone={cell === "通过" ? "green" : cell === "退回" ? "red" : "amber"}>{cell}</Pill> : cell}</td>)}</tr>)}</tbody></table></div>
        </Panel>
      </div>
      <Panel title="架构集成健康度" description="观察数据分布、接口契约与技术组件的架构约束。">
        <div className="grid gap-3 p-4 md:grid-cols-4"><SmallStat label="接口契约一致" value="96.8%" hint="218 / 225" tone="green" /><SmallStat label="重复数据链路" value="7 条" hint="较上月减少 2 条" tone="amber" /><SmallStat label="技术组件合规" value="93.4%" hint="已评估 61 个组件" tone="green" /><SmallStat label="架构例外项" value="5 项" hint="其中 1 项即将到期" tone="amber" /></div>
      </Panel>
      <DomainMetricsWorkspace domain="architecture" />
    </PageFrame>
  );
}

export function AssetsMetricsPage() {
  return (
    <PageFrame>
      <DomainHeading domain="assets"><Pill tone="green">资产目录 12,486 项</Pill><Pill tone="blue">本月新增价值 328 万</Pill></DomainHeading>
      <DashboardTimeFilter modes={["current", "week", "month"]} label="资产运营周期" hint="使用热度按周，估值变化按月" />
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="资产分类运营矩阵" description="同时观察目录完整度、近 90 天使用和价值变化。">
          <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-[10px]"><thead className="bg-muted/30 text-muted-foreground"><tr>{["资产分类", "资产量", "目录完整率", "90 天使用率", "估值变化"].map((label) => <th key={label} className="px-3 py-2 font-medium">{label}</th>)}</tr></thead><tbody>{[["数据表", "7,892", "99.1%", "72.5%", "+12.8%"], ["指标", "1,476", "98.6%", "84.2%", "+16.1%"], ["标签", "2,318", "97.2%", "58.7%", "+8.4%"], ["数据服务", "800", "99.8%", "76.3%", "+14.5%"]].map((row) => <tr key={row[0]} className="border-t border-border">{row.map((item, index) => <td key={item} className={cn("px-3 py-3", index >= 2 && "font-medium tabular-nums text-foreground")}>{item}</td>)}</tr>)}</tbody></table></div>
        </Panel>
        <Panel title="价值运营结构" description="价值评估采用可比口径，不将浏览量直接等同资产价值。">
          <div className="p-4"><div className="mx-auto grid h-40 w-40 place-items-center rounded-full" style={{ background: "conic-gradient(#2563eb 0 42%, #10b981 42% 70%, #f59e0b 70% 88%, #94a3b8 88%)" }}><div className="grid h-24 w-24 place-items-center rounded-full bg-card text-center"><div><div className="text-[9px] text-muted-foreground">可比资产估值</div><div className="mt-1 text-[18px] font-semibold text-foreground">2.84 亿</div></div></div></div><div className="mt-4 grid grid-cols-2 gap-2 text-[9px] text-muted-foreground">{[["直接收益", "42%", "bg-blue-600"], ["降本收益", "28%", "bg-emerald-500"], ["风险规避", "18%", "bg-amber-500"], ["待验证", "12%", "bg-slate-400"]].map(([name, value, color]) => <div key={name} className="flex items-center justify-between"><span className="inline-flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-sm", color)} />{name}</span><b className="text-foreground">{value}</b></div>)}</div></div>
        </Panel>
      </div>
      <DomainMetricsWorkspace domain="assets" />
    </PageFrame>
  );
}

export function StandardsMetricsPage() {
  const conflicts = [["客户状态", "营销 / 客服", "口径值域不一致", "高"], ["有效订单数", "交易 / 财务", "过滤条件不一致", "高"], ["产品大类", "商品 / 供应链", "编码映射缺失", "中"]];
  return (
    <PageFrame>
      <DomainHeading domain="standards"><Pill tone="green">关键标准落标 96.4%</Pill><Pill tone="red">高风险冲突 2 项</Pill></DomainHeading>
      <DashboardTimeFilter modes={["current", "week", "month"]} label="标准检查周期" hint="落标检查按周，术语与口径按月汇总" />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="标准落标与术语覆盖" description="按业务域追踪标准绑定到字段、模型和指标的执行结果。">
          <div className="space-y-4 p-4">{[["客户域", 98, 96], ["产品域", 97, 93], ["交易域", 96, 91], ["供应链域", 91, 86]].map(([name, landing, terms]) => <div key={String(name)} className="rounded-md border border-border p-3"><div className="mb-3 text-[10px] font-medium text-foreground">{name}</div><div className="grid gap-3 sm:grid-cols-2"><CompactBar label="关键标准落标" value={Number(landing)} target={95} tone={Number(landing) >= 95 ? "green" : "amber"} /><CompactBar label="业务术语覆盖" value={Number(terms)} target={90} tone={Number(terms) >= 90 ? "green" : "amber"} /></div></div>)}</div>
        </Panel>
        <Panel title="口径冲突清单" description="六要素比对：名称、定义、公式、维度、周期、来源。">
          <div className="divide-y divide-border">{conflicts.map(([metric, domains, reason, severity]) => <div key={metric} className="flex items-start gap-3 p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-red-50 text-red-600"><FileWarning className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-medium text-foreground">{metric}</span><Pill tone={severity === "高" ? "red" : "amber"}>{severity}风险</Pill></div><div className="mt-1 text-[9px] text-muted-foreground">{domains} · {reason}</div></div></div>)}</div>
        </Panel>
      </div>
      <DomainMetricsWorkspace domain="standards" />
    </PageFrame>
  );
}

export function QualityMetricsPage() {
  return (
    <PageFrame>
      <DomainHeading domain="quality"><Pill tone="amber">待修复 46 项</Pill><Pill tone="green">规则覆盖 96.1%</Pill></DomainHeading>
      <DashboardTimeFilter modes={["current", "day", "week", "month"]} label="质量监测周期" hint="问题与规则每日更新，支持周月复盘" />
      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <Panel title="问题严重度与账龄" description="发现数先确认、去重，再按严重度和滞留时间拆解。">
          <div className="grid grid-cols-2 gap-3 p-4"><SmallStat label="严重 P1" value="3" hint="均已响应" tone="red" /><SmallStat label="高 P2" value="12" hint="2 项即将超时" tone="amber" /><SmallStat label="一般 P3" value="31" hint="本周新增 8 项" tone="blue" /><SmallStat label="> 7 天未关闭" value="6" hint="最长滞留 12 天" tone="amber" /></div>
        </Panel>
        <Panel title="修复时效分布" description="平均时长与 P90、账龄并列，避免均值掩盖长尾。">
          <div className="space-y-4 p-4">{[["≤ 8 小时", 38, "bg-emerald-500"], ["8–24 小时", 31, "bg-blue-500"], ["24–48 小时", 21, "bg-amber-500"], ["> 48 小时", 10, "bg-red-500"]].map(([label, value, color]) => <div key={String(label)} className="grid grid-cols-[76px_1fr_36px] items-center gap-3 text-[9px]"><span className="text-muted-foreground">{label}</span><div className="h-4 rounded bg-muted/40"><div className={cn("h-4 rounded", color)} style={{ width: `${value}%` }} /></div><span className="text-right font-medium tabular-nums text-foreground">{value}%</span></div>)}<div className="grid grid-cols-3 gap-2 border-t border-border pt-3"><div className="text-center"><div className="text-[16px] font-semibold text-foreground">31.6h</div><div className="text-[9px] text-muted-foreground">平均</div></div><div className="text-center"><div className="text-[16px] font-semibold text-amber-600">47.2h</div><div className="text-[9px] text-muted-foreground">P90</div></div><div className="text-center"><div className="text-[16px] font-semibold text-foreground">18h</div><div className="text-[9px] text-muted-foreground">中位数</div></div></div></div>
        </Panel>
      </div>
      <Panel title="质量规则执行覆盖" description="只有已启用且最近执行成功的规则才计入覆盖。">
        <div className="grid gap-3 p-4 md:grid-cols-4"><CompactBar label="完整性" value={98} target={95} tone="green" /><CompactBar label="准确性" value={96} target={95} tone="green" /><CompactBar label="一致性" value={94} target={95} tone="amber" /><CompactBar label="及时性" value={97} target={95} tone="green" /></div>
      </Panel>
      <DomainMetricsWorkspace domain="quality" />
    </PageFrame>
  );
}

export function SecurityMetricsPage() {
  const incidents = [["SEC-240812-01", "S2", "异常批量查询", "18 分钟", "已遏制"], ["SEC-240810-03", "S3", "越权访问尝试", "42 分钟", "已关闭"], ["SEC-240806-02", "S4", "弱口令告警", "3.2 小时", "已关闭"]];
  return (
    <PageFrame>
      <DomainHeading domain="security"><Pill tone="green">分类分级 97.3%</Pill><Pill tone="amber">1 个日志缺口</Pill></DomainHeading>
      <DashboardTimeFilter modes={["current", "day", "week", "month"]} label="安全监测周期" hint="日志与事件每日更新，支持周月分析" />
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="分类分级结构" description="按数据项有效分类分级记录统计覆盖。">
          <div className="space-y-4 p-4">{[["L4 核心数据", 8, "bg-red-500"], ["L3 敏感数据", 23, "bg-amber-500"], ["L2 内部数据", 44, "bg-blue-500"], ["L1 公开数据", 25, "bg-emerald-500"]].map(([label, value, color]) => <div key={String(label)}><div className="mb-1 flex justify-between text-[9px]"><span className="text-muted-foreground">{label}</span><b className="text-foreground">{value}%</b></div><div className="h-3 rounded bg-muted/40"><div className={cn("h-3 rounded", color)} style={{ width: `${value}%` }} /></div></div>)}</div>
        </Panel>
        <Panel title="安全事件响应 SLA" description="从事件确认到遏制，按 S1–S4 分级评价，不做跨级平均。">
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[10px]"><thead className="bg-muted/30 text-muted-foreground"><tr>{["事件", "等级", "类型", "确认至遏制", "状态"].map((label) => <th key={label} className="px-3 py-2 font-medium">{label}</th>)}</tr></thead><tbody>{incidents.map((row) => <tr key={row[0]} className="border-t border-border">{row.map((cell, index) => <td key={cell} className="px-3 py-3">{index === 1 ? <Pill tone={cell === "S2" ? "red" : cell === "S3" ? "amber" : "slate"}>{cell}</Pill> : index === 4 ? <Pill tone="green">{cell}</Pill> : cell}</td>)}</tr>)}</tbody></table></div>
        </Panel>
      </div>
      <Panel title="审计日志证据链" description="同时检查事件覆盖、字段完整、连续性和可验证证据。">
        <div className="grid gap-3 p-4 md:grid-cols-4"><SmallStat label="身份与权限" value="100%" hint="连续 30 天" tone="green" /><SmallStat label="数据访问" value="99.96%" hint="缺失 2 个时间窗" tone="amber" /><SmallStat label="管理操作" value="100%" hint="证据链完整" tone="green" /><SmallStat label="API 网关" value="99.99%" hint="字段完整" tone="green" /></div>
      </Panel>
      <DomainMetricsWorkspace domain="security" />
    </PageFrame>
  );
}

export function LifecycleMetricsPage() {
  return (
    <PageFrame>
      <DomainHeading domain="lifecycle"><Pill tone="red">归档率未达标</Pill><Pill tone="blue">本月待退役 18 项</Pill></DomainHeading>
      <DashboardTimeFilter modes={["current", "week", "month"]} label="生命周期周期" hint="归档批次按周，退役与 SLA 按月" />
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="归档与恢复验证批次" description="归档完成且通过完整性、可恢复性验证后才计入达标。">
          <div className="divide-y divide-border">{[["ARC-202608-03", "交易日志", "1.8 TB", "完整性通过", "恢复待验证", "amber"], ["ARC-202608-02", "营销事件", "640 GB", "完整性通过", "恢复通过", "green"], ["ARC-202608-01", "历史指标", "310 GB", "完整性通过", "恢复通过", "green"]].map(([id, type, size, integrity, restore, tone]) => <div key={id} className="grid gap-2 p-4 md:grid-cols-[120px_1fr_90px_120px_110px] md:items-center"><span className="font-mono text-[9px] text-primary">{id}</span><span className="text-[10px] font-medium text-foreground">{type}</span><span className="text-[9px] text-muted-foreground">{size}</span><span className="text-[9px] text-muted-foreground">{integrity}</span><Pill tone={tone as "green" | "amber"}>{restore}</Pill></div>)}</div>
        </Panel>
        <Panel title="生命周期阶段分布" description="从在线、温存、归档到退役销毁的当前结构。">
          <div className="p-4"><div className="flex h-9 overflow-hidden rounded-md text-[9px] font-medium text-white"><div className="grid place-items-center bg-blue-600" style={{ width: "52%" }}>在线 52%</div><div className="grid place-items-center bg-cyan-500" style={{ width: "23%" }}>温存 23%</div><div className="grid place-items-center bg-amber-500" style={{ width: "19%" }}>归档 19%</div><div className="grid place-items-center bg-slate-500" style={{ width: "6%" }}>退役 6%</div></div><div className="mt-5 grid grid-cols-2 gap-3"><SmallStat label="待归档" value="23 批" hint="7 批已超计划" tone="red" /><SmallStat label="待退役" value="18 项" hint="均已完成影响分析" tone="blue" /></div></div>
        </Panel>
      </div>
      <Panel title="数据服务 SLA 构成" description="及时性、可用性、质量三个条件同时满足才视为 SLA 达标。">
        <div className="grid gap-3 p-4 md:grid-cols-3"><CompactBar label="及时性" value={99.4} target={99} tone="green" /><CompactBar label="可用性" value={99.7} target={99} tone="green" /><CompactBar label="质量条件" value={98.8} target={99} tone="amber" hint="2 个数据集质量条件未满足" /></div>
      </Panel>
      <DomainMetricsWorkspace domain="lifecycle" />
    </PageFrame>
  );
}

export function ApplicationCirculationMetricsPage() {
  return (
    <PageFrame>
      <DomainHeading domain="application"><Pill tone="blue">API 日调用 18.64 万</Pill><Pill tone="red">满意度数据已过期</Pill></DomainHeading>
      <DashboardTimeFilter modes={["current", "day", "week", "month"]} label="应用流通周期" hint="调用量按日，满意度与外部数据按周月汇总" />
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="API 服务运行" description="只统计鉴权成功并进入业务处理的有效调用。" className="xl:col-span-1">
          <div className="p-4"><div className="text-[9px] text-muted-foreground">本日有效调用</div><div className="mt-1 text-[25px] font-semibold text-foreground">186,420</div><div className="mt-4 space-y-3"><CompactBar label="成功返回" value={98.7} tone="green" /><CompactBar label="业务拒绝" value={0.8} tone="amber" /><CompactBar label="技术失败" value={0.5} tone="red" /></div></div>
        </Panel>
        <Panel title="数据服务满意度" description="展示样本量和响应率，不让小样本平均值误导判断。" className="xl:col-span-1">
          <div className="grid grid-cols-2 gap-3 p-4"><SmallStat label="最近评分" value="82.6%" hint="目标 ≥ 85%" tone="red" /><SmallStat label="有效样本" value="146" hint="覆盖 38 个服务" tone="blue" /><SmallStat label="问卷响应率" value="31.2%" hint="较上期 +4.8%" tone="green" /><SmallStat label="数据新鲜度" value="已过期" hint="最近调查 07-31" tone="red" /></div>
        </Panel>
        <Panel title="外部数据接入计划" description="通过评估、合规和安全检查后正式接入。" className="xl:col-span-1">
          <div className="divide-y divide-border">{[["企业工商信息", "已接入", "green"], ["物流时效数据", "联调中", "blue"], ["区域经济数据", "安全评估", "amber"], ["公开舆情数据", "方案评审", "slate"]].map(([name, status, tone]) => <div key={name} className="flex items-center justify-between gap-3 p-3"><span className="inline-flex items-center gap-2 text-[10px] text-foreground"><Database className="h-3.5 w-3.5 text-primary" />{name}</span><Pill tone={tone as "green" | "blue" | "amber" | "slate"}>{status}</Pill></div>)}</div>
        </Panel>
      </div>
      <Panel title="数据流通价值链" description="从外部数据接入到 API 服务、业务消费和满意度反馈形成闭环。">
        <div className="grid gap-3 p-4 md:grid-cols-4">{[[Database, "外部数据", "12 个正式数据集", "green"], [RefreshCcw, "加工流通", "46 条服务链路", "blue"], [Braces, "API 服务", "318 个已发布接口", "blue"], [MessageSquareText, "消费反馈", "38 个服务有评价", "amber"]].map(([Icon, title, hint, tone], index) => { const FlowIcon = Icon as typeof Database; return <div key={String(title)} className="relative rounded-md border border-border p-3"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded bg-blue-50 text-primary"><FlowIcon className="h-3.5 w-3.5" /></span><span className="text-[10px] font-medium text-foreground">{title as string}</span></div><div className="mt-2 text-[9px] text-muted-foreground">{hint as string}</div><div className={cn("mt-3 h-1.5 rounded", tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-blue-500")} />{index < 3 && <span className="absolute -right-2 top-1/2 z-10 hidden text-muted-foreground md:block">→</span>}</div>; })}</div>
      </Panel>
      <DomainMetricsWorkspace domain="application" />
    </PageFrame>
  );
}
